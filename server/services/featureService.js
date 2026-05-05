import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runStmt } from '../database/init.js';
import crypto from 'crypto';

// Feature 12: Image & Video Analysis
export async function analyzeMedia(mediaType, fileData, analysisResult, verdict) {
    const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');
    const id = uuidv4();
    
    await runStmt(
        'INSERT INTO media_analysis (id, media_type, file_hash, analysis_result, verdict, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, mediaType, fileHash, JSON.stringify(analysisResult), verdict, new Date().toISOString()]
    );
    
    return getMediaAnalysis(id);
}

export async function getMediaAnalysis(mediaId) {
    return queryOne('SELECT * FROM media_analysis WHERE id = ?', [mediaId]);
}

export async function findMediaByHash(fileHash) {
    return queryOne('SELECT * FROM media_analysis WHERE file_hash = ?', [fileHash]);
}

// Feature 9: Email Alerts
export async function subscribeToAlerts(userId, subscriptionType) {
    const id = uuidv4();
    
    try {
        await runStmt(
            'INSERT INTO email_subscriptions (id, user_id, subscription_type, enabled, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, userId, subscriptionType, 1, new Date().toISOString()]
        );
    } catch (err) {
        // Already subscribed
        await runStmt(
            'UPDATE email_subscriptions SET enabled = 1 WHERE user_id = ? AND subscription_type = ?',
            [userId, subscriptionType]
        );
    }
    
    return getUserSubscriptions(userId);
}

export async function unsubscribeFromAlerts(userId, subscriptionType) {
    await runStmt(
        'UPDATE email_subscriptions SET enabled = 0 WHERE user_id = ? AND subscription_type = ?',
        [userId, subscriptionType]
    );
}

export async function getUserSubscriptions(userId) {
    return queryAll(
        'SELECT subscription_type, enabled FROM email_subscriptions WHERE user_id = ?',
        [userId]
    );
}

export async function createNotification(userId, notificationType, content) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO email_notifications (id, user_id, notification_type, content, sent, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, notificationType, content, 0, new Date().toISOString()]
    );
    return id;
}

export async function getPendingNotifications(userId, limit = 20) {
    return queryAll(
        'SELECT * FROM email_notifications WHERE user_id = ? AND sent = 0 ORDER BY created_at DESC LIMIT ?',
        [userId, limit]
    );
}

export async function markNotificationSent(notificationId) {
    await runStmt(
        'UPDATE email_notifications SET sent = 1 WHERE id = ?',
        [notificationId]
    );
}

// Feature 13: Trending Claims & Analytics
export async function logAnalyticsEvent(userId, eventType, eventData) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?, ?)',
        [id, userId, eventType, JSON.stringify(eventData), new Date().toISOString()]
    );
}

export async function getTrendingByCategory(category, days = 7, limit = 10) {
    const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return queryAll(
        `SELECT event_type, COUNT(*) as count FROM analytics_events 
         WHERE event_data LIKE ? AND created_at > ? 
         GROUP BY event_type ORDER BY count DESC LIMIT ?`,
        [`%"${category}"%`, date.toISOString(), limit]
    );
}

// Feature 18: Public API Keys
export async function generateApiKey(userId, name) {
    const id = uuidv4();
    const key = `verifynews_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    await runStmt(
        'INSERT INTO api_keys (id, user_id, key_hash, name, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, keyHash, name, 1, new Date().toISOString()]
    );
    
    return { id, key, name }; // Return plain key only on creation
}

export async function getUserApiKeys(userId) {
    return queryAll(
        'SELECT id, name, is_active, last_used, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    );
}

export async function validateApiKey(keyHash) {
    const key = await queryOne(
        'SELECT id, user_id, is_active FROM api_keys WHERE key_hash = ?',
        [keyHash]
    );
    
    if (key && key.is_active) {
        await runStmt(
            'UPDATE api_keys SET last_used = ? WHERE id = ?',
            [new Date().toISOString(), key.id]
        );
        return key;
    }
    
    return null;
}

export async function revokeApiKey(userId, keyId) {
    await runStmt(
        'UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?',
        [keyId, userId]
    );
}

// Feature 21: Webhook Support
export async function registerWebhook(userId, url, eventTypes) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO webhooks (id, user_id, url, event_types, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, url, JSON.stringify(eventTypes), 1, new Date().toISOString()]
    );
    return { id, url, eventTypes };
}

export async function getUserWebhooks(userId) {
    return queryAll(
        'SELECT id, url, event_types, is_active, created_at FROM webhooks WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
    );
}

export async function getActiveWebhooks(eventType) {
    return queryAll(
        'SELECT id, url, event_types FROM webhooks WHERE is_active = 1 AND event_types LIKE ?',
        [`%"${eventType}"%`]
    );
}

export async function deleteWebhook(userId, webhookId) {
    await runStmt(
        'DELETE FROM webhooks WHERE id = ? AND user_id = ?',
        [webhookId, userId]
    );
}

// Feature 15: Publisher Dashboard
export async function createPublisherProfile(userId, publisherName, domain) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO publisher_profiles (id, user_id, publisher_name, domain, accuracy_score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, publisherName, domain, 0, new Date().toISOString()]
    );
    return getPublisherProfile(id);
}

export async function getPublisherProfile(publisherId) {
    return queryOne('SELECT * FROM publisher_profiles WHERE id = ?', [publisherId]);
}

export async function getUserPublisherProfile(userId) {
    return queryOne('SELECT * FROM publisher_profiles WHERE user_id = ?', [userId]);
}

export async function updatePublisherAccuracy(publisherId, accuracyScore) {
    await runStmt(
        'UPDATE publisher_profiles SET accuracy_score = ? WHERE id = ?',
        [accuracyScore, publisherId]
    );
}

// Feature 17: Admin Moderation
export async function flagContent(contentType, contentId, flaggedBy, reason) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO moderation_flags (id, content_type, content_id, flagged_by, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, contentType, contentId, flaggedBy, reason, 'pending', new Date().toISOString()]
    );
    return id;
}

export async function getPendingFlags(limit = 50, offset = 0) {
    return queryAll(
        `SELECT * FROM moderation_flags WHERE status = 'pending' ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
    );
}

export async function resolveFlag(flagId, resolvedBy, resolution) {
    await runStmt(
        'UPDATE moderation_flags SET status = ?, resolved_by = ? WHERE id = ?',
        [resolution, resolvedBy, flagId]
    );
}

// Feature 14: Educational Content
export async function getEducationalContent(category = null, difficulty = null) {
    let sql = 'SELECT * FROM educational_content WHERE 1=1';
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
    return queryAll(sql, params);
}

export async function addEducationalContent(title, content, category, difficultyLevel) {
    const id = uuidv4();
    await runStmt(
        'INSERT INTO educational_content (id, title, content, category, difficulty_level, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, title, content, category, difficultyLevel, new Date().toISOString()]
    );
    return id;
}
