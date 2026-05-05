import fs from 'fs';
import path from 'path';
import { config, ensureDirectoryExists } from '../config.js';
import { queryAll } from '../database/init.js';
import { logger } from '../utils/logger.js';

export function createBackupFilename(date = new Date()) {
    const safeStamp = date.toISOString().replace(/[:.]/g, '-');
    return path.join(config.backupDir, `verifynews-${safeStamp}.json`);
}

export async function backupDatabaseFile() {
    ensureDirectoryExists(config.backupDir);

    const snapshot = {
        provider: config.databaseProvider,
        createdAt: new Date().toISOString(),
        users: await queryAll('SELECT id, username, email, avatar_color, created_at FROM users'),
        analyses: await queryAll('SELECT * FROM analyses'),
        reports: await queryAll('SELECT * FROM reports'),
        reportVotes: await queryAll('SELECT * FROM report_votes'),
        sources: await queryAll('SELECT * FROM sources'),
        bookmarks: await queryAll('SELECT * FROM bookmarks'),
        passwordResetOtps: await queryAll('SELECT id, email, expires_at, used, created_at FROM password_reset_otps'),
    };

    const target = createBackupFilename();
    fs.writeFileSync(target, JSON.stringify(snapshot, null, 2));
    logger.info('database_backup_created', { target, provider: config.databaseProvider });
    return target;
}
