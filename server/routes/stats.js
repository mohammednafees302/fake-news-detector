import { Router } from 'express';
import { queryAll, queryOne } from '../database/init.js';
import { adminMiddleware, authMiddleware } from '../middleware/auth.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Global platform stats
router.get('/', async (req, res) => {
  try {
    const totalAnalyses = (await queryOne('SELECT COUNT(*) as c FROM analyses'))?.c || 0;
    const totalUsers = (await queryOne('SELECT COUNT(*) as c FROM users'))?.c || 0;
    const totalReports = (await queryOne('SELECT COUNT(*) as c FROM reports'))?.c || 0;

    const verdictBreakdown = await queryAll(
      'SELECT verdict, COUNT(*) as count FROM analyses GROUP BY verdict'
    );

    const recentAnalysesQuery = config.databaseProvider === 'postgres'
      ? `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM analyses
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date`
      : `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM analyses
       WHERE created_at >= DATE('now', '-30 days')
       GROUP BY DATE(created_at)
       ORDER BY date`;
    const recentAnalyses = await queryAll(recentAnalysesQuery);

    const avgRow = await queryOne('SELECT AVG(overall_score) as avg FROM analyses');
    const avgScore = avgRow?.avg || 0;

    const topSources = await queryAll(
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
    logger.error('stats_error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// User-specific stats
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalAnalyses = (await queryOne('SELECT COUNT(*) as c FROM analyses WHERE user_id = ?', [userId]))?.c || 0;
    const totalReports = (await queryOne('SELECT COUNT(*) as c FROM reports WHERE user_id = ?', [userId]))?.c || 0;

    const verdictBreakdown = await queryAll(
      'SELECT verdict, COUNT(*) as count FROM analyses WHERE user_id = ? GROUP BY verdict',
      [userId]
    );

    const avgRow = await queryOne('SELECT AVG(overall_score) as avg FROM analyses WHERE user_id = ?', [userId]);
    const avgScore = avgRow?.avg || 0;

    const recentAnalyses = await queryAll(
      `SELECT id, title, overall_score, verdict, created_at
       FROM analyses WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    const scoreDistribution = await queryAll(
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
    logger.error('user_stats_error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch user stats.' });
  }
});

router.get('/admin', adminMiddleware, async (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const reportStatus = String(req.query.reportStatus || '').trim().toLowerCase();
    const userRole = String(req.query.userRole || '').trim().toLowerCase();
    const totalUsers = (await queryOne('SELECT COUNT(*) as c FROM users'))?.c || 0;
    const totalAdmins = (await queryOne('SELECT COUNT(*) as c FROM users WHERE is_admin = 1'))?.c || 0;
    const totalAnalyses = (await queryOne('SELECT COUNT(*) as c FROM analyses'))?.c || 0;
    const pendingReports = (await queryOne('SELECT COUNT(*) as c FROM reports WHERE status = ?', ['pending']))?.c || 0;
    const resolvedReports = (await queryOne('SELECT COUNT(*) as c FROM reports WHERE status = ?', ['resolved']))?.c || 0;
    const reviewedReports = (await queryOne('SELECT COUNT(*) as c FROM reports WHERE status = ?', ['reviewed']))?.c || 0;

    const recentUsersBase = `
      SELECT id, username, email, is_admin, created_at
      FROM users
    `;
    const userConditions = [];
    const userParams = [];

    if (search) {
      userConditions.push('(LOWER(username) LIKE ? OR LOWER(email) LIKE ?)');
      userParams.push(`%${search}%`, `%${search}%`);
    }
    if (userRole === 'admin') {
      userConditions.push('is_admin = 1');
    } else if (userRole === 'user') {
      userConditions.push('is_admin = 0');
    }

    const recentUsers = await queryAll(
      `${recentUsersBase}
       ${userConditions.length ? `WHERE ${userConditions.join(' AND ')}` : ''}
       ORDER BY created_at DESC LIMIT 12`,
      userParams
    );

    const analysisConditions = [];
    const analysisParams = [];
    if (search) {
      analysisConditions.push('(LOWER(COALESCE(a.title, \'\')) LIKE ? OR LOWER(COALESCE(u.email, \'guest\')) LIKE ?)');
      analysisParams.push(`%${search}%`, `%${search}%`);
    }

    const recentAnalyses = await queryAll(
      `SELECT a.id, a.title, a.overall_score, a.verdict, a.created_at, u.email
       FROM analyses a
       LEFT JOIN users u ON a.user_id = u.id
       ${analysisConditions.length ? `WHERE ${analysisConditions.join(' AND ')}` : ''}
       ORDER BY a.created_at DESC LIMIT 12`,
      analysisParams
    );

    const reportConditions = [];
    const reportParams = [];
    if (search) {
      reportConditions.push('(LOWER(r.title) LIKE ? OR LOWER(COALESCE(u.username, \'unknown\')) LIKE ?)');
      reportParams.push(`%${search}%`, `%${search}%`);
    }
    if (reportStatus && reportStatus !== 'all') {
      reportConditions.push('LOWER(r.status) = ?');
      reportParams.push(reportStatus);
    }

    const recentReports = await queryAll(
      `SELECT r.id, r.title, r.category, r.status, r.created_at, u.username, r.upvotes
       FROM reports r
       LEFT JOIN users u ON r.user_id = u.id
       ${reportConditions.length ? `WHERE ${reportConditions.join(' AND ')}` : ''}
       ORDER BY r.created_at DESC LIMIT 20`,
      reportParams
    );

    const verdictBreakdown = await queryAll(
      `SELECT verdict, COUNT(*) as count
       FROM analyses
       GROUP BY verdict
       ORDER BY count DESC`
    );

    res.json({
      summary: {
        totalUsers,
        totalAdmins,
        totalAnalyses,
        pendingReports,
        reviewedReports,
        resolvedReports,
      },
      filters: {
        search,
        reportStatus: reportStatus || 'all',
        userRole: userRole || 'all',
      },
      verdictBreakdown,
      recentUsers: recentUsers.map((user) => ({ ...user, is_admin: Number(user.is_admin) === 1 })),
      recentAnalyses,
      recentReports,
    });
  } catch (err) {
    logger.error('admin_stats_error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch admin overview.' });
  }
});

export default router;
