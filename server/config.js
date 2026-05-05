import fs from 'fs';
import path from 'path';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const cwd = process.cwd();
const resolvedDbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(cwd, 'data', 'verifynews.db');
const backupDir = process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.join(cwd, 'backups');
const databaseProvider = process.env.DATABASE_PROVIDER
    || (process.env.DATABASE_URL ? 'postgres' : 'sqljs');

function validateConfig() {
    const issues = [];

    if (isProduction) {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
            issues.push('JWT_SECRET must be set to a strong value with at least 32 characters in production.');
        }

        if (databaseProvider === 'postgres' && !process.env.DATABASE_URL) {
            issues.push('DATABASE_URL must be configured when DATABASE_PROVIDER=postgres.');
        }

        if (!process.env.EMAIL_PROVIDER) {
            issues.push('EMAIL_PROVIDER must be configured in production for OTP delivery.');
        }

        if (process.env.EMAIL_PROVIDER === 'resend') {
            if (!process.env.RESEND_API_KEY) {
                issues.push('RESEND_API_KEY is required when EMAIL_PROVIDER=resend.');
            }
            if (!process.env.EMAIL_FROM) {
                issues.push('EMAIL_FROM is required when EMAIL_PROVIDER=resend.');
            }
        }
    }

    if (issues.length > 0) {
        throw new Error(`Configuration error:\n- ${issues.join('\n- ')}`);
    }
}

export function ensureDirectoryExists(targetPath) {
    fs.mkdirSync(targetPath, { recursive: true });
}

export const config = {
    nodeEnv: NODE_ENV,
    isProduction,
    port: Number.parseInt(process.env.PORT || '5000', 10),
    jwtSecret: process.env.JWT_SECRET || 'verifynews_local_development_secret_do_not_use_in_production',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:5173',
    databaseProvider,
    databaseUrl: process.env.DATABASE_URL || '',
    databaseSsl: (process.env.DATABASE_SSL || 'true') === 'true',
    dbPath: resolvedDbPath,
    backupDir,
    emailProvider: process.env.EMAIL_PROVIDER || 'console',
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || '',
    gmailUser: process.env.GMAIL_USER || '',
    gmailPass: process.env.GMAIL_PASS || '',
    adminEmail: process.env.ADMIN_EMAIL || '',
    adminPassword: process.env.ADMIN_PASSWORD || '',
    adminUsername: process.env.ADMIN_USERNAME || 'admin',
    logLevel: process.env.LOG_LEVEL || 'info',
    seedDemoData: (process.env.SEED_DEMO_DATA || (!isProduction ? 'true' : 'false')) === 'true',
};

validateConfig();
