import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runStmt } from '../database/init.js';
import { adminMiddleware, authMiddleware, optionalAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/security.js';
import { logger } from '../utils/logger.js';
import { clampPageSize, isValidHttpUrl } from '../utils/validation.js';

const router = Router();
const reportRateLimit = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 25,
    message: 'Too many report actions. Please wait a bit before trying again.',
});

router.post('/', authMiddleware, reportRateLimit, async (req, res) => {
    try {
        const title = String(req.body.title || '').trim();
        const url = String(req.body.url || '').trim();
        const description = String(req.body.description || '').trim();
        const category = String(req.body.category || '').trim();

        if (!title || !description || !category) {
            return res.status(400).json({ error: 'Title, description, and category are required.' });
        }

        const validCategories = ['misinformation', 'disinformation', 'satire', 'clickbait', 'propaganda', 'scam', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category.' });
        }

        if (url && !isValidHttpUrl(url)) {
            return res.status(400).json({ error: 'Please enter a valid URL starting with http:// or https://.' });
        }

        const id = uuidv4();

        await runStmt(
            'INSERT INTO reports (id, user_id, title, url, description, category) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.user.id, title, url || null, description, category]
        );

        res.status(201).json({
            id,
            title,
            url,
            description,
            category,
            status: 'pending',
            upvotes: 0,
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        logger.error('report_submit_error', { error: err.message });
        res.status(500).json({ error: 'Failed to submit report.' });
    }
});

router.get('/', optionalAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = clampPageSize(req.query.limit, 20, 100);
        const offset = (page - 1) * limit;

        const reports = await queryAll(
            `SELECT r.*, u.username, u.avatar_color
             FROM reports r LEFT JOIN users u ON r.user_id = u.id
             ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const totalRow = await queryOne('SELECT COUNT(*) as c FROM reports');
        res.json({
            reports,
            total: totalRow?.c || 0,
            page,
            totalPages: Math.ceil((totalRow?.c || 0) / limit),
        });
    } catch (err) {
        logger.error('report_fetch_error', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
});

router.post('/:id/upvote', authMiddleware, reportRateLimit, async (req, res) => {
    try {
        const report = await queryOne('SELECT id, upvotes FROM reports WHERE id = ?', [req.params.id]);

        if (!report) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        const existingVote = await queryOne('SELECT report_id FROM report_votes WHERE report_id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (existingVote) {
            return res.status(409).json({ error: 'You have already upvoted this report.' });
        }

        await runStmt('INSERT INTO report_votes (report_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
        await runStmt('UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?', [req.params.id]);

        res.json({ message: 'Upvoted successfully.', upvotes: Number(report.upvotes || 0) + 1 });
    } catch (err) {
        logger.error('report_upvote_error', { error: err.message, reportId: req.params.id });
        res.status(500).json({ error: 'Failed to upvote.' });
    }
});

router.patch('/:id/status', adminMiddleware, async (req, res) => {
    try {
        const status = String(req.body.status || '').trim();
        const allowedStatuses = ['pending', 'reviewed', 'resolved'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid report status.' });
        }

        const report = await queryOne('SELECT id FROM reports WHERE id = ?', [req.params.id]);
        if (!report) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        await runStmt('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Report status updated.', status });
    } catch (err) {
        logger.error('report_status_update_error', { error: err.message, reportId: req.params.id });
        res.status(500).json({ error: 'Failed to update report status.' });
    }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
    try {
        const report = await queryOne('SELECT id FROM reports WHERE id = ?', [req.params.id]);
        if (!report) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        await runStmt('DELETE FROM reports WHERE id = ?', [req.params.id]);
        res.json({ message: 'Report deleted successfully.' });
    } catch (err) {
        logger.error('report_delete_error', { error: err.message, reportId: req.params.id });
        res.status(500).json({ error: 'Failed to delete report.' });
    }
});

export default router;
