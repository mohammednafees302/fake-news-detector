import express from 'express';
import { authMiddleware as auth } from '../middleware/auth.js';
import {
    analyzeMedia,
    getMediaAnalysis,
    findMediaByHash,
    subscribeToAlerts,
    unsubscribeFromAlerts,
    getUserSubscriptions,
    createNotification,
    getPendingNotifications,
    markNotificationSent,
    logAnalyticsEvent,
    getTrendingByCategory,
    getEducationalContent,
    addEducationalContent,
    createPublisherProfile,
    getUserPublisherProfile,
    getPublisherProfile,
    updatePublisherAccuracy,
    flagContent,
    getPendingFlags,
    resolveFlag,
    generateApiKey,
    getUserApiKeys,
    validateApiKey,
    revokeApiKey,
    registerWebhook,
    getUserWebhooks,
    deleteWebhook
} from '../services/featureService.js';

const router = express.Router();

// Feature 12: Media Analysis
router.post('/media/analyze', auth, async (req, res) => {
    try {
        const { mediaType, fileData, analysisResult, verdict } = req.body;
        
        if (!mediaType || !fileData || !analysisResult || !verdict) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if already analyzed
        const existing = await findMediaByHash(fileData);
        if (existing) {
            return res.json(existing);
        }
        
        const result = await analyzeMedia(mediaType, fileData, analysisResult, verdict);
        
        // Track analytics
        await logAnalyticsEvent(req.user.id, 'media_analyzed', { mediaType, verdict });
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/media/:mediaId', async (req, res) => {
    try {
        const { mediaId } = req.params;
        const media = await getMediaAnalysis(mediaId);
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 9: Email Alerts & Subscriptions
router.post('/subscribe', auth, async (req, res) => {
    try {
        const { subscriptionType } = req.body;
        const subscriptions = await subscribeToAlerts(req.user.id, subscriptionType);
        res.json(subscriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/unsubscribe', auth, async (req, res) => {
    try {
        const { subscriptionType } = req.body;
        await unsubscribeFromAlerts(req.user.id, subscriptionType);
        const subscriptions = await getUserSubscriptions(req.user.id);
        res.json(subscriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/subscriptions', auth, async (req, res) => {
    try {
        const subscriptions = await getUserSubscriptions(req.user.id);
        res.json(subscriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/notifications', auth, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const notifications = await getPendingNotifications(req.user.id, parseInt(limit));
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 16: Analytics & Trending
router.post('/analytics/event', auth, async (req, res) => {
    try {
        const { eventType, eventData } = req.body;
        await logAnalyticsEvent(req.user.id, eventType, eventData);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/trending/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const { days = 7, limit = 10 } = req.query;
        const trending = await getTrendingByCategory(category, parseInt(days), parseInt(limit));
        res.json(trending);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 14: Educational Content
router.get('/educational-content', async (req, res) => {
    try {
        const { category, difficulty } = req.query;
        const content = await getEducationalContent(category, difficulty);
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/educational-content', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin only' });
        }
        
        const { title, content, category, difficultyLevel } = req.body;
        const id = await addEducationalContent(title, content, category, difficultyLevel);
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 15: Publisher Dashboard
router.post('/publisher-profile', auth, async (req, res) => {
    try {
        const { publisherName, domain } = req.body;
        const profile = await createPublisherProfile(req.user.id, publisherName, domain);
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/publisher-profile', auth, async (req, res) => {
    try {
        const profile = await getUserPublisherProfile(req.user.id);
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 17: Admin Moderation
router.post('/flag-content', auth, async (req, res) => {
    try {
        const { contentType, contentId, reason } = req.body;
        const flagId = await flagContent(contentType, contentId, req.user.id, reason);
        res.json({ flagId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/moderation-flags', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin only' });
        }
        
        const { limit = 50, offset = 0 } = req.query;
        const flags = await getPendingFlags(parseInt(limit), parseInt(offset));
        res.json(flags);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/moderation-flags/:flagId/resolve', auth, async (req, res) => {
    try {
        if (!req.user.is_admin) {
            return res.status(403).json({ error: 'Admin only' });
        }
        
        const { flagId } = req.params;
        const { resolution } = req.body;
        await resolveFlag(flagId, req.user.id, resolution);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 18: Public API Keys
router.post('/api-keys', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const keyData = await generateApiKey(req.user.id, name);
        res.json(keyData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/api-keys', auth, async (req, res) => {
    try {
        const keys = await getUserApiKeys(req.user.id);
        res.json(keys);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/api-keys/:keyId', auth, async (req, res) => {
    try {
        const { keyId } = req.params;
        await revokeApiKey(req.user.id, keyId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Feature 21: Webhooks
router.post('/webhooks', auth, async (req, res) => {
    try {
        const { url, eventTypes } = req.body;
        
        if (!url || !eventTypes || !Array.isArray(eventTypes)) {
            return res.status(400).json({ error: 'Invalid webhook data' });
        }
        
        const webhook = await registerWebhook(req.user.id, url, eventTypes);
        res.json(webhook);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/webhooks', auth, async (req, res) => {
    try {
        const webhooks = await getUserWebhooks(req.user.id);
        res.json(webhooks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/webhooks/:webhookId', auth, async (req, res) => {
    try {
        const { webhookId } = req.params;
        await deleteWebhook(req.user.id, webhookId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
