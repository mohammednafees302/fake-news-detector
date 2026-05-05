const rateLimitBuckets = new Map();

function getClientKey(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function applySecurityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    next();
}

export function createRateLimiter({ windowMs, maxRequests, message }) {
    return function rateLimit(req, res, next) {
        const key = `${req.method}:${req.path}:${getClientKey(req)}`;
        const now = Date.now();
        const entry = rateLimitBuckets.get(key);

        if (!entry || now > entry.resetAt) {
            rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        if (entry.count >= maxRequests) {
            const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
            res.setHeader('Retry-After', retryAfterSeconds);
            return res.status(429).json({ error: message });
        }

        entry.count += 1;
        next();
    };
}
