import express from 'express';
import crypto from 'crypto';
import { validateApiKey } from '../services/featureService.js';
import { queryOne } from '../database/init.js';

const router = express.Router();

// Middleware to validate API key
async function apiKeyAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing API key' });
    }
    
    const key = authHeader.slice(7);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    const validKey = await validateApiKey(keyHash);
    if (!validKey) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    
    req.apiUser = validKey;
    next();
}

// Feature 18: Public API Endpoints

// Get analysis
router.get('/analyses/:analysisId', apiKeyAuth, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const analysis = await queryOne('SELECT * FROM analyses WHERE id = ?', [analysisId]);
        
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        
        res.json({
            id: analysis.id,
            title: analysis.title,
            verdict: analysis.verdict,
            score: analysis.overall_score,
            factors: JSON.parse(analysis.factors),
            explanations: JSON.parse(analysis.explanations),
            createdAt: analysis.created_at
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List user analyses
router.get('/user/analyses', apiKeyAuth, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const analyses = await queryOne(
            `SELECT * FROM analyses WHERE user_id = ? 
             ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [req.apiUser.user_id, parseInt(limit), parseInt(offset)]
        );
        
        res.json(analyses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get sources
router.get('/sources', apiKeyAuth, async (req, res) => {
    try {
        const { domain } = req.query;
        let sql = 'SELECT domain, name, credibility_score, category, bias FROM sources';
        const params = [];
        
        if (domain) {
            sql += ' WHERE domain = ?';
            params.push(domain);
        }
        
        const sources = await queryOne(sql, params);
        res.json(sources);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get trending claims
router.get('/trending-claims', apiKeyAuth, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const claims = await queryOne(
            `SELECT claim_text, occurrences, last_updated FROM claim_history 
             ORDER BY occurrences DESC LIMIT ?`,
            [parseInt(limit)]
        );
        
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get educational content
router.get('/educational-content', apiKeyAuth, async (req, res) => {
    try {
        const { category, difficulty } = req.query;
        let sql = 'SELECT id, title, category, difficulty_level FROM educational_content WHERE 1=1';
        const params = [];
        
        if (category) {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (difficulty) {
            sql += ' AND difficulty_level = ?';
            params.push(difficulty);
        }
        
        sql += ' ORDER BY created_at DESC';
        
        const content = await queryOne(sql, params);
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get publisher stats
router.get('/publishers/:publisherId', apiKeyAuth, async (req, res) => {
    try {
        const { publisherId } = req.params;
        const profile = await queryOne(
            'SELECT publisher_name, domain, accuracy_score FROM publisher_profiles WHERE id = ?',
            [publisherId]
        );
        
        if (!profile) {
            return res.status(404).json({ error: 'Publisher not found' });
        }
        
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API Documentation
router.get('/docs', (req, res) => {
    res.json({
        version: '1.0.0',
        endpoints: [
            {
                method: 'GET',
                path: '/api/v1/analyses/:analysisId',
                description: 'Get analysis by ID',
                authentication: 'required'
            },
            {
                method: 'GET',
                path: '/api/v1/user/analyses',
                description: 'Get user analyses',
                authentication: 'required',
                queryParams: ['limit', 'offset']
            },
            {
                method: 'GET',
                path: '/api/v1/sources',
                description: 'Get source information',
                authentication: 'required',
                queryParams: ['domain']
            },
            {
                method: 'GET',
                path: '/api/v1/trending-claims',
                description: 'Get trending claims',
                authentication: 'required',
                queryParams: ['limit']
            },
            {
                method: 'GET',
                path: '/api/v1/educational-content',
                description: 'Get educational materials',
                authentication: 'required',
                queryParams: ['category', 'difficulty']
            },
            {
                method: 'GET',
                path: '/api/v1/publishers/:publisherId',
                description: 'Get publisher statistics',
                authentication: 'required'
            }
        ]
    });
});

export default router;
