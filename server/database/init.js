import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { config, ensureDirectoryExists } from '../config.js';

let sqlJsDatabase = null;
let SQL = null;
let pgPool = null;
let initialized = false;
let initPromise = null;

function isPostgres() {
    return config.databaseProvider === 'postgres';
}

function translateParams(sql) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
}

function coerceRow(row) {
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => {
            if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
                const numeric = Number(value);
                if (!Number.isNaN(numeric)) {
                    return [key, numeric];
                }
            }
            return [key, value];
        })
    );
}

export async function getDB() {
    if (isPostgres()) {
        if (!pgPool) {
            pgPool = new Pool({
                connectionString: config.databaseUrl,
                ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
            });
        }

        if (!initialized) {
            if (!initPromise) {
                initPromise = initializeDatabase();
            }
            await initPromise;
        }

        return pgPool;
    }

    if (!sqlJsDatabase) {
        SQL = await initSqlJs();
        ensureDirectoryExists(path.dirname(config.dbPath));

        if (fs.existsSync(config.dbPath)) {
            const buffer = fs.readFileSync(config.dbPath);
            sqlJsDatabase = new SQL.Database(buffer);
        } else {
            sqlJsDatabase = new SQL.Database();
        }

        sqlJsDatabase.run('PRAGMA journal_mode = WAL');
        sqlJsDatabase.run('PRAGMA foreign_keys = ON');
    }

    if (!initialized) {
        if (!initPromise) {
            initPromise = initializeDatabase();
        }
        await initPromise;
    }

    return sqlJsDatabase;
}

async function initializeDatabase() {
    try {
        initialized = true;
        await initTables();
        await seedSources();
        await seedAdminUser();
        await seedEducationalContent();
        if (config.seedDemoData) {
            await seedMockData();
        }
        saveDB();
    } catch (error) {
        initialized = false;
        throw error;
    } finally {
        initPromise = null;
    }
}

export async function queryAll(sql, params = []) {
    const db = await getDB();

    if (isPostgres()) {
        const result = await db.query(translateParams(sql), params);
        return result.rows.map(coerceRow);
    }

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

export async function queryOne(sql, params = []) {
    const rows = await queryAll(sql, params);
    return rows[0] || null;
}

export async function runStmt(sql, params = []) {
    const db = await getDB();

    if (isPostgres()) {
        await db.query(translateParams(sql), params);
        return;
    }

    db.run(sql, params);
    saveDB();
}

export function saveDB() {
    if (!sqlJsDatabase || isPostgres()) return;

    ensureDirectoryExists(path.dirname(config.dbPath));
    const data = sqlJsDatabase.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(config.dbPath, buffer);
}

async function initTables() {
    if (isPostgres()) {
        await runStmt(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                role TEXT DEFAULT 'user',
                avatar_color TEXT DEFAULT '#6366f1',
                otp TEXT,
                otp_expiry TIMESTAMPTZ,
                otp_attempts INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await runStmt('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0');
        await runStmt('ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'user\'');
        await runStmt('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp TEXT');
        await runStmt('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ');
        await runStmt('ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0');

        await runStmt(`
            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                input_type TEXT NOT NULL,
                input_text TEXT NOT NULL,
                source_url TEXT,
                title TEXT,
                overall_score REAL NOT NULL,
                verdict TEXT NOT NULL,
                factors TEXT NOT NULL,
                explanations TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                url TEXT,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                upvotes INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS report_votes (
                report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (report_id, user_id)
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS sources (
                id SERIAL PRIMARY KEY,
                domain TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                credibility_score REAL NOT NULL,
                category TEXT NOT NULL,
                bias TEXT DEFAULT 'center'
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS password_reset_otps (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                otp TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 6, 7: Community Voting & Comments
        await runStmt(`
            CREATE TABLE IF NOT EXISTS analysis_votes (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (analysis_id, user_id)
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 9: Email Alerts
        await runStmt(`
            CREATE TABLE IF NOT EXISTS email_subscriptions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subscription_type TEXT NOT NULL,
                enabled BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await runStmt(`
            CREATE TABLE IF NOT EXISTS email_notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                notification_type TEXT NOT NULL,
                content TEXT NOT NULL,
                sent BOOLEAN DEFAULT false,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 5: Historical Claim Tracking
        await runStmt(`
            CREATE TABLE IF NOT EXISTS claim_history (
                id TEXT PRIMARY KEY,
                claim_text TEXT NOT NULL,
                analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
                first_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                occurrences INTEGER DEFAULT 1
            )
        `);

        // Feature 18: Public API
        await runStmt(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                key_hash TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                last_used TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 21: Webhook Support
        await runStmt(`
            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                event_types TEXT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 12: Image/Video Analysis
        await runStmt(`
            CREATE TABLE IF NOT EXISTS media_analysis (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                media_type TEXT NOT NULL,
                file_hash TEXT UNIQUE NOT NULL,
                analysis_result TEXT NOT NULL,
                verdict TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 13: Trending Claims & Feature 16: Analytics
        await runStmt(`
            CREATE TABLE IF NOT EXISTS analytics_events (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
                event_type TEXT NOT NULL,
                event_data TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 15: Publisher Dashboard
        await runStmt(`
            CREATE TABLE IF NOT EXISTS publisher_profiles (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                publisher_name TEXT NOT NULL,
                domain TEXT UNIQUE,
                description TEXT,
                accuracy_score REAL DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 17: Admin Moderation
        await runStmt(`
            CREATE TABLE IF NOT EXISTS moderation_flags (
                id TEXT PRIMARY KEY,
                content_type TEXT NOT NULL,
                content_id TEXT NOT NULL,
                flagged_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
                reason TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Feature 14: Educational Content
        await runStmt(`
            CREATE TABLE IF NOT EXISTS educational_content (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL,
                difficulty_level TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await runStmt('CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id)');
        await runStmt('CREATE INDEX IF NOT EXISTS idx_analyses_source_url ON analyses(source_url)');
        await runStmt('CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)');
        await runStmt('CREATE INDEX IF NOT EXISTS idx_comments_analysis_id ON comments(analysis_id)');
        await runStmt('CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)');
        return;
    }

    const db = sqlJsDatabase;
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            role TEXT DEFAULT 'user',
            avatar_color TEXT DEFAULT '#6366f1',
            otp TEXT,
            otp_expiry DATETIME,
            otp_attempts INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    try {
        db.run('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
    } catch {}
    try {
        db.run('ALTER TABLE users ADD COLUMN role TEXT DEFAULT \'user\'');
    } catch {}
    try {
        db.run('ALTER TABLE users ADD COLUMN otp TEXT');
    } catch {}
    try {
        db.run('ALTER TABLE users ADD COLUMN otp_expiry DATETIME');
    } catch {}
    try {
        db.run('ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0');
    } catch {}
    db.run(`
        CREATE TABLE IF NOT EXISTS analyses (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            input_type TEXT NOT NULL,
            input_text TEXT NOT NULL,
            source_url TEXT,
            title TEXT,
            overall_score REAL NOT NULL,
            verdict TEXT NOT NULL,
            factors TEXT NOT NULL,
            explanations TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            url TEXT,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            upvotes INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS report_votes (
            report_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (report_id, user_id),
            FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            domain TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            credibility_score REAL NOT NULL,
            category TEXT NOT NULL,
            bias TEXT DEFAULT 'center'
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            analysis_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS password_reset_otps (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Feature 6, 7: Community Voting & Comments
    db.run(`
        CREATE TABLE IF NOT EXISTS analysis_votes (
            id TEXT PRIMARY KEY,
            analysis_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            vote_type TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (analysis_id, user_id),
            FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            analysis_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Feature 9: Email Alerts
    db.run(`
        CREATE TABLE IF NOT EXISTS email_subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            subscription_type TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS email_notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            notification_type TEXT NOT NULL,
            content TEXT NOT NULL,
            sent INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Feature 5: Historical Claim Tracking
    db.run(`
        CREATE TABLE IF NOT EXISTS claim_history (
            id TEXT PRIMARY KEY,
            claim_text TEXT NOT NULL,
            analysis_id TEXT NOT NULL,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            occurrences INTEGER DEFAULT 1,
            FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
        )
    `);

    // Feature 18: Public API
    db.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key_hash TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            last_used DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Feature 21: Webhook Support
    db.run(`
        CREATE TABLE IF NOT EXISTS webhooks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            url TEXT NOT NULL,
            event_types TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Feature 12: Image/Video Analysis
    db.run(`
        CREATE TABLE IF NOT EXISTS media_analysis (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            media_type TEXT NOT NULL,
            file_hash TEXT NOT NULL UNIQUE,
            analysis_result TEXT NOT NULL,
            verdict TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Feature 13: Trending Claims & Feature 16: Analytics
    db.run(`
        CREATE TABLE IF NOT EXISTS analytics_events (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            event_type TEXT NOT NULL,
            event_data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Feature 15: Publisher Dashboard
    db.run(`
        CREATE TABLE IF NOT EXISTS publisher_profiles (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            publisher_name TEXT NOT NULL,
            domain TEXT UNIQUE,
            description TEXT,
            accuracy_score REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Feature 17: Admin Moderation
    db.run(`
        CREATE TABLE IF NOT EXISTS moderation_flags (
            id TEXT PRIMARY KEY,
            content_type TEXT NOT NULL,
            content_id TEXT NOT NULL,
            flagged_by TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            resolved_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (flagged_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Feature 14: Educational Content
    db.run(`
        CREATE TABLE IF NOT EXISTS educational_content (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            difficulty_level TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run('CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_analyses_source_url ON analyses(source_url)');
    db.run('CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_comments_analysis_id ON comments(analysis_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at)');
}

async function seedSources() {
    const existingCount = await queryOne('SELECT COUNT(*) as c FROM sources');
    if ((existingCount?.c || 0) > 0) return;

    const sources = [
        { domain: 'reuters.com', name: 'Reuters', score: 95, category: 'wire_service', bias: 'center' },
        { domain: 'apnews.com', name: 'Associated Press', score: 95, category: 'wire_service', bias: 'center' },
        { domain: 'bbc.com', name: 'BBC News', score: 90, category: 'mainstream', bias: 'center-left' },
        { domain: 'bbc.co.uk', name: 'BBC News', score: 90, category: 'mainstream', bias: 'center-left' },
        { domain: 'nytimes.com', name: 'New York Times', score: 85, category: 'mainstream', bias: 'center-left' },
        { domain: 'wsj.com', name: 'Wall Street Journal', score: 85, category: 'mainstream', bias: 'center-right' },
        { domain: 'economist.com', name: 'The Economist', score: 88, category: 'mainstream', bias: 'center' },
        { domain: 'nature.com', name: 'Nature', score: 97, category: 'scientific', bias: 'center' },
        { domain: 'science.org', name: 'Science', score: 97, category: 'scientific', bias: 'center' },
        { domain: 'theguardian.com', name: 'The Guardian', score: 82, category: 'mainstream', bias: 'left' },
        { domain: 'washingtonpost.com', name: 'Washington Post', score: 84, category: 'mainstream', bias: 'center-left' },
        { domain: 'npr.org', name: 'NPR', score: 87, category: 'public', bias: 'center-left' },
        { domain: 'pbs.org', name: 'PBS', score: 88, category: 'public', bias: 'center' },
        { domain: 'cnn.com', name: 'CNN', score: 72, category: 'mainstream', bias: 'left' },
        { domain: 'foxnews.com', name: 'Fox News', score: 62, category: 'mainstream', bias: 'right' },
        { domain: 'msnbc.com', name: 'MSNBC', score: 65, category: 'mainstream', bias: 'left' },
        { domain: 'huffpost.com', name: 'HuffPost', score: 60, category: 'online', bias: 'left' },
        { domain: 'dailymail.co.uk', name: 'Daily Mail', score: 45, category: 'tabloid', bias: 'right' },
        { domain: 'buzzfeednews.com', name: 'BuzzFeed News', score: 58, category: 'online', bias: 'center-left' },
        { domain: 'infowars.com', name: 'InfoWars', score: 10, category: 'conspiracy', bias: 'far-right' },
        { domain: 'naturalnews.com', name: 'Natural News', score: 8, category: 'conspiracy', bias: 'far-right' },
        { domain: 'theonion.com', name: 'The Onion', score: 5, category: 'satire', bias: 'center' },
        { domain: 'babylonbee.com', name: 'Babylon Bee', score: 5, category: 'satire', bias: 'right' },
        { domain: 'worldnewsdailyreport.com', name: 'World News Daily Report', score: 3, category: 'fake', bias: 'none' },
    ];

    for (const source of sources) {
        await runStmt(
            'INSERT INTO sources (domain, name, credibility_score, category, bias) VALUES (?, ?, ?, ?, ?)',
            [source.domain, source.name, source.score, source.category, source.bias]
        );
    }
}

async function seedMockData() {
    const existingUsers = await queryOne('SELECT COUNT(*) as c FROM users');
    if ((existingUsers?.c || 0) > 0) return;

    const demoUserId = uuidv4();
    const hashedPassword = bcrypt.hashSync('demo12345', 10);
    await runStmt(
        'INSERT INTO users (id, username, email, password, is_admin, avatar_color) VALUES (?, ?, ?, ?, ?, ?)',
        [demoUserId, 'demo_investigator', 'investigator@verifynews.com', hashedPassword, 0, '#f59e0b']
    );

    const analyses = [
        {
            id: uuidv4(),
            title: 'Scientists discover mysterious blue light in deep ocean',
            inputType: 'url',
            sourceUrl: 'https://ocean-explorer.example/blue-light',
            score: 88,
            verdict: 'Likely Credible',
            factors: { sentiment: 92, clickbait: 85, language: 90, emotional: 95, sourceAttribution: 80, bias: 85 },
            explanations: { sentiment: 'Tone is scientific and neutral.', clickbait: 'Headline is descriptive, not sensational.', sourceAttribution: 'Cites specific research institutes.' },
        },
        {
            id: uuidv4(),
            title: "BREAKING: You won't believe what they found under the pyramid!",
            inputType: 'text',
            sourceUrl: 'https://truth-revealed.fake/pyramid-secret',
            score: 22,
            verdict: 'Likely Fake',
            factors: { sentiment: 30, clickbait: 10, language: 45, emotional: 20, sourceAttribution: 15, bias: 25 },
            explanations: { sentiment: 'Highly sensational and emotional tone.', clickbait: 'Extreme clickbait headline detected.', sourceAttribution: "Uses vague 'insider' references." },
        },
    ];

    for (let index = 0; index < analyses.length; index += 1) {
        const analysis = analyses[index];
        const createdAt = new Date(Date.now() - index * 3600000).toISOString();
        await runStmt(
            'INSERT INTO analyses (id, user_id, input_type, input_text, source_url, title, overall_score, verdict, factors, explanations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [analysis.id, demoUserId, analysis.inputType, analysis.title, analysis.sourceUrl, analysis.title, analysis.score, analysis.verdict, JSON.stringify(analysis.factors), JSON.stringify(analysis.explanations), createdAt]
        );
    }

    const reports = [
        { id: uuidv4(), title: 'False COVID-19 Cure Link', url: 'http://miracle-water.scam/covid', desc: 'Site is selling tap water as a vaccine alternative.', cat: 'misinformation', upvotes: 42 },
        { id: uuidv4(), title: 'Fabricated Quote from Senator', url: 'https://daily-truth.fake/senator-scandal', desc: 'Claims a person said something that was never recorded in transcript.', cat: 'other', upvotes: 28 },
    ];

    for (let index = 0; index < reports.length; index += 1) {
        const report = reports[index];
        const createdAt = new Date(Date.now() - (index + 2) * 86400000).toISOString();
        await runStmt(
            'INSERT INTO reports (id, user_id, title, url, description, category, upvotes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [report.id, demoUserId, report.title, report.url, report.desc, report.cat, report.upvotes, createdAt]
        );
    }
}

async function seedAdminUser() {
    if (!config.adminEmail || !config.adminPassword) return;

    const email = config.adminEmail.trim().toLowerCase();
    const username = config.adminUsername.trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
    const hashedPassword = await bcrypt.hash(config.adminPassword, 12);

    if (existing) {
        await runStmt(
            'UPDATE users SET username = ?, password = ?, is_admin = 1, role = \'admin\' WHERE email = ?',
            [username, hashedPassword, email]
        );
        return;
    }

    await runStmt(
        'INSERT INTO users (id, username, email, password, is_admin, role, avatar_color) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), username, email, hashedPassword, 1, 'admin', '#dc2626']
    );
}

async function seedEducationalContent() {
    const existing = await queryOne('SELECT COUNT(*) as c FROM educational_content');
    if ((existing?.c || 0) > 0) return;

    const articles = [
        {
            id: uuidv4(),
            title: 'How to Spot Misinformation Online',
            content: 'Misinformation spreads rapidly on social media. Learn to identify key warning signs: sensational headlines, lack of credible sources, emotional manipulation, and missing bylines. Always verify information across multiple reputable outlets before sharing. Check publication dates—old stories often recirculate as "new" news. Look for author credentials and whether the site publishes corrections.',
            category: 'Misinformation',
            difficulty_level: 'Beginner',
        },
        {
            id: uuidv4(),
            title: 'Understanding Confirmation Bias in News Consumption',
            content: 'Confirmation bias is the tendency to search for, interpret, and recall information that confirms pre-existing beliefs. It affects how we read news and evaluate sources. To combat it: actively seek out viewpoints that challenge your assumptions, read primary sources instead of summaries, and use tools like AllSides or Ad Fontes Media to understand a source\'s political lean before reading.',
            category: 'Bias Detection',
            difficulty_level: 'Intermediate',
        },
        {
            id: uuidv4(),
            title: 'Evaluating Source Credibility: A Step-by-Step Guide',
            content: 'Not all sources are equal. Credible journalism follows the SIFT method: Stop before sharing, Investigate the source, Find better coverage, Trace claims to their origin. Check if the outlet has a clear editorial policy, a correction policy, and transparent ownership. Peer-reviewed academic journals have the highest credibility, followed by established wire services like Reuters and AP.',
            category: 'Source Verification',
            difficulty_level: 'Beginner',
        },
        {
            id: uuidv4(),
            title: 'Advanced Fact-Checking Techniques Used by Professionals',
            content: 'Professional fact-checkers use reverse image search, archive tools like Wayback Machine, and geolocation to verify visual content. They cross-reference claims with official databases (CDC, WHO, government statistics) and reach out directly to primary sources. Understanding metadata in images and videos can reveal manipulation. Tools: Google Fact Check Explorer, InVID, TinEye, and Snopes.',
            category: 'Fact-Checking',
            difficulty_level: 'Advanced',
        },
        {
            id: uuidv4(),
            title: 'The Psychology of Why We Share Fake News',
            content: 'Research shows people share misinformation not because they lack intelligence but because of inattention—we often share on autopilot. Emotional content (outrage, fear, awe) is shared more frequently. The illusory truth effect means repeated exposure makes false claims feel true. Slowing down before sharing and asking "Do I know this is accurate?" significantly reduces misinformation spread.',
            category: 'Misinformation',
            difficulty_level: 'Intermediate',
        },
        {
            id: uuidv4(),
            title: 'Detecting Political Bias in News Coverage',
            content: 'All news outlets have some degree of bias. Recognizing it helps you consume information critically. Watch for: story selection (what gets covered vs. ignored), framing (which angle is emphasized), language choices ("protesters" vs. "rioters"), and source selection (who gets quoted). Use media bias charts as a starting point, and read across the spectrum for major stories.',
            category: 'Bias Detection',
            difficulty_level: 'Advanced',
        },
        {
            id: uuidv4(),
            title: 'How to Verify Images and Videos Online',
            content: 'Visual misinformation is powerful because "seeing is believing." Use reverse image search (Google Images, TinEye) to find the original context of photos. For videos, InVID/WeVerify browser extension breaks videos into frames for reverse searching. Check EXIF metadata for location and timestamp data. Be skeptical of blurry or low-resolution images—high quality originals are harder to fake.',
            category: 'Fact-Checking',
            difficulty_level: 'Intermediate',
        },
        {
            id: uuidv4(),
            title: 'Understanding Satire vs. Real News',
            content: 'Satire publications like The Onion or Babylon Bee publish fictional stories for humor and social commentary. Problems arise when satire is shared as real news. Always check: Is there a disclaimer on the site? Does the URL look unusual? Search the site name plus "satire" or "parody". The Poe\'s Law phenomenon—extreme satire becoming indistinguishable from sincere positions—makes this increasingly difficult.',
            category: 'Source Verification',
            difficulty_level: 'Beginner',
        },
    ];

    for (const article of articles) {
        await runStmt(
            'INSERT INTO educational_content (id, title, content, category, difficulty_level, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [article.id, article.title, article.content, article.category, article.difficulty_level, new Date().toISOString()]
        );
    }
}

export default getDB;
