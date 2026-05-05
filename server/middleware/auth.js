import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const JWT_SECRET = config.jwtSecret;

export function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

export function checkAdminRole(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Admin role required.' });
    }
    next();
}

export function adminMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (!req.user?.is_admin && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }
        next();
    });
}

export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch {
            // Continue as an anonymous request.
        }
    }
    next();
}

export { JWT_SECRET };
