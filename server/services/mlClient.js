/**
 * mlClient.js
 * Node.js client for the Python ML microservice (Flask).
 * Implements in-memory caching and graceful fallbacks.
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';
const ML_TIMEOUT_MS = 5000; // Max 5 seconds timeout

// In-memory cache to store predictions for identical text
const predictionCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour cache duration
const MAX_CACHE_SIZE = 1000;

function getCacheKey(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Call the Python ML API /predict endpoint.
 * @param {string} text - Article text to analyse.
 * @returns {Promise<MLPrediction|null>} Prediction object or null on failure.
 */
export async function mlPredict(text) {
    try {
        const cacheKey = getCacheKey(text);
        const cached = predictionCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

        const response = await fetch(`${ML_API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
            const errBody = await response.text();
            logger.warn('ml_api_error', { status: response.status, body: errBody });
            return null;
        }

        const data = await response.json();

        // Store in cache
        predictionCache.set(cacheKey, {
            timestamp: Date.now(),
            data: data
        });

        // Enforce cache size limit
        if (predictionCache.size > MAX_CACHE_SIZE) {
            const oldestKey = predictionCache.keys().next().value;
            predictionCache.delete(oldestKey);
        }

        return data;
    } catch (err) {
        if (err.name === 'AbortError') {
            logger.warn('ml_api_timeout', { url: ML_API_URL, ms: ML_TIMEOUT_MS });
        } else {
            logger.warn('ml_api_unavailable', { error: err.message });
        }
        return null;
    }
}

/**
 * Health-check the ML API.
 * @returns {Promise<boolean>}
 */
export async function mlHealthCheck() {
    try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`${ML_API_URL}/health`, { signal: controller.signal });
        return response.ok;
    } catch {
        return false;
    }
}
