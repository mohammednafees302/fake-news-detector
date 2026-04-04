import { Router } from 'express';
import { getDB } from '../database/init.js';
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

// Global platform stats
router.get('/', optionalAuth, async (req, res) => {
  try {
    const db = await getDB();

    const totalAnalyses = queryOne(db, 'SELECT COUNT(*) as c FROM analyses')?.c || 0;
    const totalUsers = queryOne(db, 'SELECT COUNT(*) as c FROM users')?.c || 0;
    const totalReports = queryOne(db, 'SELECT COUNT(*) as c FROM reports')?.c || 0;

    const verdictBreakdown = queryAll(db,
      'SELECT verdict, COUNT(*) as count FROM analyses GROUP BY verdict'
    );

    const recentAnalyses = queryAll(db,
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM analyses
       WHERE created_at >= DATE('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    const avgRow = queryOne(db, 'SELECT AVG(overall_score) as avg FROM analyses');
    const avgScore = avgRow?.avg || 0;

    const topSources = queryAll(db,
      `SELECT name, domain, credibility_score, category, bias
       FROM sources ORDER BY credibility_score DESC LIMIT 10`
    );

    res.json({
      totalAnalyses,
      totalUsers,
      totalReports,
      avgScore: Math.round(avgScore),
      verdictBreakdown,
      recentAnalyses,
      topSources,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// User-specific stats
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.user.id;

    const totalAnalyses = queryOne(db, 'SELECT COUNT(*) as c FROM analyses WHERE user_id = ?', [userId])?.c || 0;
    const totalReports = queryOne(db, 'SELECT COUNT(*) as c FROM reports WHERE user_id = ?', [userId])?.c || 0;

    const verdictBreakdown = queryAll(db,
      'SELECT verdict, COUNT(*) as count FROM analyses WHERE user_id = ? GROUP BY verdict',
      [userId]
    );

    const avgRow = queryOne(db, 'SELECT AVG(overall_score) as avg FROM analyses WHERE user_id = ?', [userId]);
    const avgScore = avgRow?.avg || 0;

    const recentAnalyses = queryAll(db,
      `SELECT id, title, overall_score, verdict, created_at
       FROM analyses WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    const scoreDistribution = queryAll(db,
      `SELECT 
        CASE 
          WHEN overall_score >= 75 THEN 'credible'
          WHEN overall_score >= 50 THEN 'needs_verification'
          WHEN overall_score >= 30 THEN 'suspicious'
          ELSE 'likely_fake'
        END as category,
        COUNT(*) as count
      FROM analyses WHERE user_id = ?
      GROUP BY category`,
      [userId]
    );

    res.json({
      totalAnalyses,
      totalReports,
      avgScore: Math.round(avgScore),
      verdictBreakdown,
      recentAnalyses,
      scoreDistribution,
    });
  } catch (err) {
    console.error('User stats error:', err);
    res.status(500).json({ error: 'Failed to fetch user stats.' });
  }
});

export default router;
