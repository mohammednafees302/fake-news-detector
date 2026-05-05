import 'dotenv/config';
import { backupDatabaseFile } from '../server/services/backupService.js';

try {
    const target = await backupDatabaseFile();
    console.log(`Backup created: ${target}`);
} catch (error) {
    console.error(`Backup failed: ${error.message}`);
    process.exit(1);
}
