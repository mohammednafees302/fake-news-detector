import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'verifynews.db');

let db = null;
let SQL = null;

export async function getDB() {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  initTables();
  seedSources();
  seedMockData();
  saveDB();

  return db;
}

export function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar_color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

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
}

function seedSources() {
  const result = db.exec('SELECT COUNT(*) as c FROM sources');
  if (result.length > 0 && result[0].values[0][0] > 0) return;

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

  const stmt = db.prepare('INSERT OR IGNORE INTO sources (domain, name, credibility_score, category, bias) VALUES (?, ?, ?, ?, ?)');
  for (const s of sources) {
    stmt.run([s.domain, s.name, s.score, s.category, s.bias]);
  }
  stmt.free();
}

function seedMockData() {
  const userResult = db.exec('SELECT COUNT(*) as c FROM users');
  if (userResult.length > 0 && userResult[0].values[0][0] > 0) return;

  const demoUserId = uuidv4();
  const hashedPassword = bcrypt.hashSync('demo123', 10);
  
  // Seed Demo User
  db.run('INSERT INTO users (id, username, email, password, avatar_color) VALUES (?, ?, ?, ?, ?)',
    [demoUserId, 'demo_investigator', 'investigator@verifynews.com', hashedPassword, '#f59e0b']
  );

  // Seed Mock Analyses
  const analyses = [
    {
      id: uuidv4(),
      title: "Scientists discover mysterious blue light in deep ocean",
      inputType: 'url',
      sourceUrl: "https://ocean-explorer.example/blue-light",
      score: 88,
      verdict: "Likely Credible",
      factors: { sentiment: 92, clickbait: 85, language: 90, emotional: 95, sourceAttribution: 80, bias: 85 },
      explanations: { sentiment: "Tone is scientific and neutral.", clickbait: "Headline is descriptive, not sensational.", sourceAttribution: "Cites specific research institutes." }
    },
    {
      id: uuidv4(),
      title: "BREAKING: You won't believe what they found under the pyramid!",
      inputType: 'text',
      sourceUrl: "https://truth-revealed.fake/pyramid-secret",
      score: 22,
      verdict: "Likely Fake",
      factors: { sentiment: 30, clickbait: 10, language: 45, emotional: 20, sourceAttribution: 15, bias: 25 },
      explanations: { sentiment: "Highly sensational and emotional tone.", clickbait: "Extreme clickbait headline detected.", sourceAttribution: "Uses vague 'insider' references." }
    },
    {
      id: uuidv4(),
      title: "Local election results confirmed by city officials",
      inputType: 'url',
      sourceUrl: "https://city-gazette.example/election-results",
      score: 95,
      verdict: "Likely Credible",
      factors: { sentiment: 98, clickbait: 95, language: 92, emotional: 96, sourceAttribution: 94, bias: 90 },
      explanations: { sentiment: "Strictly factual reporting tone.", clickbait: "Informative headline.", sourceAttribution: "Direct quotes from election commission." }
    },
    {
       id: uuidv4(),
       title: "New study claims eating chocolate every day cures everything",
       inputType: 'url',
       sourceUrl: "https://health-world.example/chocolate-miracle",
       score: 42,
       verdict: "Needs Verification",
       factors: { sentiment: 60, clickbait: 40, language: 70, emotional: 50, sourceAttribution: 35, bias: 45 },
       explanations: { clickbait: "Hyperbolic health claim detected.", sourceAttribution: "Missing link to the actual peer-reviewed study." }
    }
  ];

  const anaStmt = db.prepare('INSERT INTO analyses (id, user_id, input_type, input_text, source_url, title, overall_score, verdict, factors, explanations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  analyses.forEach((a, index) => {
    const createdAt = new Date(Date.now() - index * 3600000).toISOString();
    anaStmt.run([
      a.id, demoUserId, a.inputType, a.title, a.sourceUrl, a.title,
      a.score, a.verdict, JSON.stringify(a.factors), JSON.stringify(a.explanations), createdAt
    ]);
  });
  anaStmt.free();

  // Seed Mock Reports
  const reports = [
    { id: uuidv4(), title: "False COVID-19 Cure Link", url: "http://miracle-water.scam/covid", desc: "Site is selling tap water as a vaccine alternative.", cat: "Misinformation", upvotes: 42 },
    { id: uuidv4(), title: "Fabricated Quote from Senator", url: "https://daily-truth.fake/senator-scandal", desc: "Claims a person said something that was never recorded in transcript.", cat: "Fact Error", upvotes: 28 },
    { id: uuidv4(), title: "Old 2012 Photos Used as Current News", url: "https://viral-news.fake/fire-images", desc: "Using historical images to claim a recent disaster in another country.", cat: "Manipulated Media", upvotes: 56 },
    { id: uuidv4(), title: "Pseudoscience Cancer Cure", url: "https://nature-healing.fake/cancer", desc: "Dangerous claims about avoiding medical treatment.", cat: "Medical Fake", upvotes: 91 }
  ];

  const repStmt = db.prepare('INSERT INTO reports (id, user_id, title, url, description, category, upvotes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  reports.forEach((r, index) => {
    const createdAt = new Date(Date.now() - (index + 2) * 86400000).toISOString();
    repStmt.run([r.id, demoUserId, r.title, r.url, r.desc, r.cat, r.upvotes, createdAt]);
  });
  repStmt.free();
}

export default getDB;
