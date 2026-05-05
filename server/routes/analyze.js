import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runStmt } from '../database/init.js';
import { authMiddleware, optionalAuth } from '../middleware/auth.js';
import { analyzeNews, checkSourceCredibility } from '../services/analysisEngine.js';
import { scrapeUrl } from '../services/urlScraper.js';
import fetch from 'node-fetch';
import { config } from '../config.js';
import { createRateLimiter } from '../middleware/security.js';
import { logger } from '../utils/logger.js';
import { clampPageSize, isValidHttpUrl } from '../utils/validation.js';

const router = Router();
const analyzeRateLimit = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 30,
    message: 'Too many analysis requests. Please wait a few minutes before trying again.',
});

router.post('/', optionalAuth, analyzeRateLimit, async (req, res) => {
    try {
        const text = typeof req.body.text === 'string' ? req.body.text : '';
        const url = typeof req.body.url === 'string' ? req.body.url.trim() : '';

        if (!text && !url) {
            return res.status(400).json({ error: 'Please provide either text or a URL to analyze.' });
        }

        let inputText = text;
        let inputType = 'text';
        let sourceUrl = url || null;
        let articleTitle = null;

        if (url) {
            if (!isValidHttpUrl(url)) {
                return res.status(400).json({ error: 'Please enter a valid article URL starting with http:// or https://.' });
            }

            const cached = await queryOne(
                'SELECT * FROM analyses WHERE source_url = ? AND source_url IS NOT NULL ORDER BY created_at DESC LIMIT 1',
                [url]
            );

            if (cached) {
                const cacheTime = new Date(cached.created_at).getTime();
                if (Date.now() - cacheTime < 24 * 60 * 60 * 1000) {
                    return res.json({
                        ...cached,
                        factors: JSON.parse(cached.factors),
                        explanations: JSON.parse(cached.explanations),
                        cachedResult: true,
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
            sourceInfo = await checkSourceCredibility(sourceUrl);
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
        await runStmt(
            `INSERT INTO analyses (id, user_id, input_type, input_text, source_url, title, overall_score, verdict, factors, explanations)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                analysisId,
                req.user?.id || null,
                inputType,
                inputText.substring(0, 5000),
                sourceUrl,
                result.title || articleTitle,
                result.overallScore,
                result.verdict,
                JSON.stringify(result.factors),
                JSON.stringify(result.explanations),
            ]
        );

        let factChecks = [];
        const googleKey = config.googleApiKey;
        if (googleKey && googleKey !== 'your_google_api_key_here') {
            try {
                const searchQuery = encodeURIComponent((result.title || inputText).substring(0, 150));
                const fcUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${searchQuery}&key=${googleKey}&pageSize=3`;
                const fcResp = await fetch(fcUrl);
                if (fcResp.ok) {
                    const fcData = await fcResp.json();
                    factChecks = (fcData.claims || []).map((claim) => ({
                        text: claim.text,
                        claimant: claim.claimant,
                        claimDate: claim.claimDate,
                        reviews: (claim.claimReview || []).map((review) => ({
                            publisher: review.publisher?.name,
                            url: review.url,
                            title: review.title,
                            rating: review.textualRating,
                            date: review.reviewDate,
                        })),
                    }));
                }
            } catch (err) {
                logger.warn('google_fact_check_error', { error: err.message });
            }
        }

        res.json({
            id: analysisId,
            ...result,
            sourceInfo,
            inputType,
            sourceUrl,
            factChecks,
            mlPrediction: result.mlPrediction || null,
        });
    } catch (err) {
        logger.error('analysis_error', { error: err.message });
        res.status(500).json({ error: 'An error occurred during analysis.' });
    }
});

router.get('/history', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = clampPageSize(req.query.limit, 20, 100);
        const offset = (page - 1) * limit;

        const analyses = await queryAll(
            `SELECT id, input_type, title, source_url, overall_score, verdict, created_at
             FROM analyses WHERE user_id = ?
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [req.user.id, limit, offset]
        );

        const totalRow = await queryOne('SELECT COUNT(*) as c FROM analyses WHERE user_id = ?', [req.user.id]);

        res.json({
            analyses,
            total: totalRow?.c || 0,
            page,
            totalPages: Math.ceil((totalRow?.c || 0) / limit),
        });
    } catch (err) {
        logger.error('analysis_history_error', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const analysis = await queryOne('SELECT * FROM analyses WHERE id = ?', [req.params.id]);

        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found.' });
        }

        res.json({
            ...analysis,
            factors: JSON.parse(analysis.factors),
            explanations: JSON.parse(analysis.explanations),
        });
    } catch (err) {
        logger.error('analysis_fetch_error', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch analysis.' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const existing = await queryOne('SELECT id FROM analyses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);

        if (!existing) {
            return res.status(404).json({ error: 'Analysis not found or unauthorized.' });
        }

        await runStmt('DELETE FROM analyses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Analysis deleted successfully.' });
    } catch (err) {
        logger.error('analysis_delete_error', { error: err.message });
        res.status(500).json({ error: 'Failed to delete analysis.' });
    }
});

export default router;
