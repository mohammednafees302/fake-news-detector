import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, saveDB } from '../database/init.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';

const router = Router();

function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
}

function queryOne(db, sql, params = []) {
    const rows = queryAll(db, sql, params);
    return rows[0] || null;
}

function runStmt(db, sql, params = []) {
    db.run(sql, params);
    saveDB();
}

// Submit a report
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { title, url, description, category } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({ error: 'Title, description, and category are required.' });
        }

        const validCategories = ['misinformation', 'disinformation', 'satire', 'clickbait', 'propaganda', 'scam', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category.' });
        }

        const db = await getDB();
        const id = uuidv4();

        runStmt(db,
            'INSERT INTO reports (id, user_id, title, url, description, category) VALUES (?, ?, ?, ?, ?, ?)',
            [id, req.user.id, title, url || null, description, category]
        );

        res.status(201).json({
            id, title, url, description, category,
            status: 'pending', upvotes: 0,
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Report error:', err);
        res.status(500).json({ error: 'Failed to submit report.' });
    }
});

// Get recent reports
router.get('/', optionalAuth, async (req, res) => {
    try {
        const db = await getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const reports = queryAll(db,
            `SELECT r.*, u.username, u.avatar_color
       FROM reports r LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const totalRow = queryOne(db, 'SELECT COUNT(*) as c FROM reports');

        res.json({
            reports,
            total: totalRow?.c || 0,
            page,
            totalPages: Math.ceil((totalRow?.c || 0) / limit),
        });
    } catch (err) {
        console.error('Get reports error:', err);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
});

// Upvote a report
router.post('/:id/upvote', authMiddleware, async (req, res) => {
    try {
        const db = await getDB();
        const existing = queryOne(db, 'SELECT id FROM reports WHERE id = ?', [req.params.id]);

        if (!existing) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        runStmt(db, 'UPDATE reports SET upvotes = upvotes + 1 WHERE id = ?', [req.params.id]);
        res.json({ message: 'Upvoted successfully.' });
    } catch (err) {
        console.error('Upvote error:', err);
        res.status(500).json({ error: 'Failed to upvote.' });
    }
});

export default router;
