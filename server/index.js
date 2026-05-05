import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { getDB } from './database/init.js';
import authRoutes from './routes/auth.js';
import analyzeRoutes from './routes/analyze.js';
import reportRoutes from './routes/reports.js';
import statsRoutes from './routes/stats.js';
import communityRoutes from './routes/community.js';
import featuresRoutes from './routes/features.js';
import publicApiRoutes from './routes/publicApi.js';
import { config } from './config.js';
import { applySecurityHeaders } from './middleware/security.js';
import { logger, requestLogger } from './utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(applySecurityHeaders);
app.use(requestLogger);
app.use(express.json({ limit: '5mb' }));

getDB().then(() => {
    logger.info('database_initialized', { dbPath: config.dbPath });
}).catch((err) => {
    logger.error('database_init_failed', { error: err.message });
    process.exit(1);
});

app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/v1', publicApiRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
    });
});

app.get('/api/ready', async (req, res) => {
    try {
        await getDB();
        res.json({
            status: 'ready',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'degraded',
            database: 'unavailable',
            error: error.message,
        });
    }
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

export function startServer(port = config.port) {
    return app.listen(port, () => {
        logger.info('server_started', { port, appBaseUrl: config.appBaseUrl });
    });
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
    startServer();
}

export default app;
