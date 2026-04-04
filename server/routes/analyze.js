import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB, saveDB } from '../database/init.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { analyzeNews, checkSourceCredibility } from '../services/analysisEngine.js';
import { scrapeUrl } from '../services/urlScraper.js';
import fetch from 'node-fetch';

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

// Analyze text or URL
router.post('/', optionalAuth, async (req, res) => {
    try {
        const { text, url } = req.body;

        if (!text && !url) {
            return res.status(400).json({ error: 'Please provide either text or a URL to analyze.' });
        }

        let inputText = text || '';
        let inputType = 'text';
        let sourceUrl = url || null;
        let articleTitle = null;

        const db = await getDB();

        if (url) {
            // Check UX Cache First
            const cached = queryOne(db, 'SELECT * FROM analyses WHERE source_url = ? AND source_url IS NOT NULL ORDER BY created_at DESC LIMIT 1', [url]);
            if (cached) {
                const cacheTime = new Date(cached.created_at).getTime();
                if (Date.now() - cacheTime < 24 * 60 * 60 * 1000) { // 24 hours
                    return res.json({
                        ...cached,
                        factors: JSON.parse(cached.factors),
                        explanations: JSON.parse(cached.explanations),
                        cachedResult: true
                    });
                }
            }

            try {
                const scraped = await scrapeUrl(url);
                inputText = scraped.fullText;
                articleTitle = scraped.title;
                sourceUrl = url;
                inputType = 'url';
            } catch (err) {
                return res.status(400).json({ error: err.message });
            }
        }

        if (inputText.trim().length < 20) {
            return res.status(400).json({ error: 'Text is too short for meaningful analysis. Please provide at least 20 characters.' });
        }

        const result = await analyzeNews(inputText, sourceUrl);
        let sourceInfo = null;
        if (sourceUrl) {
            sourceInfo = checkSourceCredibility(db, sourceUrl);
            if (sourceInfo) {
                const sourceWeight = 0.15;
                result.overallScore = Math.round(
                    result.overallScore * (1 - sourceWeight) + sourceInfo.credibility_score * sourceWeight
                );
                result.factors.sourceTrust = sourceInfo.credibility_score;
                result.explanations.sourceTrust = `Source "${sourceInfo.name}" has a credibility rating of ${sourceInfo.credibility_score}/100 (${sourceInfo.category}, bias: ${sourceInfo.bias}).`;

                if (result.overallScore >= 75) result.verdict = 'Likely Credible';
                else if (result.overallScore >= 50) result.verdict = 'Needs Verification';
                else if (result.overallScore >= 30) result.verdict = 'Suspicious';
                else result.verdict = 'Likely Fake';
            }
        }

        const analysisId = uuidv4();
        if (req.user) {
            runStmt(db,
                `INSERT INTO analyses (id, user_id, input_type, input_text, source_url, title, overall_score, verdict, factors, explanations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    analysisId, req.user.id, inputType, inputText.substring(0, 5000),
                    sourceUrl, result.title || articleTitle, result.overallScore, result.verdict,
                    JSON.stringify(result.factors), JSON.stringify(result.explanations),
                ]
            );
        }

        // Google Fact Check API
        let factChecks = [];
        const googleKey = process.env.GOOGLE_API_KEY;
        if (googleKey && googleKey !== 'your_google_api_key_here') {
            try {
                const searchQuery = encodeURIComponent((result.title || inputText).substring(0, 150));
                const fcUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${searchQuery}&key=${googleKey}&pageSize=3`;
                const fcResp = await fetch(fcUrl);
                if (fcResp.ok) {
                    const fcData = await fcResp.json();
                    factChecks = (fcData.claims || []).map(claim => ({
                        text: claim.text,
                        claimant: claim.claimant,
                        claimDate: claim.claimDate,
                        reviews: (claim.claimReview || []).map(r => ({
                            publisher: r.publisher?.name,
                            url: r.url,
                            title: r.title,
                            rating: r.textualRating,
                            date: r.reviewDate,
                        }))
                    }));
                }
            } catch (err) {
                console.error('Google Fact Check error:', err);
            }
        }

        res.json({ id: analysisId, ...result, sourceInfo, inputType, sourceUrl, factChecks });
    } catch (err) {
        console.error('Analysis error:', err);
        res.status(500).json({ error: 'An error occurred during analysis.' });
    }
});

// Get history
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const db = await getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const analyses = queryAll(db,
            `SELECT id, input_type, title, source_url, overall_score, verdict, created_at
       FROM analyses WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [req.user.id, limit, offset]
        );

        const totalRow = queryOne(db, 'SELECT COUNT(*) as c FROM analyses WHERE user_id = ?', [req.user.id]);

        res.json({
            analyses,
            total: totalRow?.c || 0,
            page,
            totalPages: Math.ceil((totalRow?.c || 0) / limit),
        });
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

// Get single analysis
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const db = await getDB();
        const analysis = queryOne(db, 'SELECT * FROM analyses WHERE id = ?', [req.params.id]);

        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found.' });
        }

        res.json({
            ...analysis,
            factors: JSON.parse(analysis.factors),
            explanations: JSON.parse(analysis.explanations),
        });
    } catch (err) {
        console.error('Get analysis error:', err);
        res.status(500).json({ error: 'Failed to fetch analysis.' });
    }
});

// Delete analysis
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const db = await getDB();
        const existing = queryOne(db, 'SELECT id FROM analyses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        if (!existing) {
            return res.status(404).json({ error: 'Analysis not found or unauthorized.' });
        }

        runStmt(db, 'DELETE FROM analyses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Analysis deleted successfully.' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete analysis.' });
    }
});

export default router;
