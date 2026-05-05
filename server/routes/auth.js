import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, runStmt } from '../database/init.js';
import { adminMiddleware, JWT_SECRET, authMiddleware } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/security.js';
import { clearFailures, assertNotBlocked, registerFailure } from '../services/authProtection.js';
import { sendPasswordResetOtp } from '../services/emailService.js';
import { logger } from '../utils/logger.js';
import { isStrongPassword, isValidEmail, normalizeEmail, normalizeUsername } from '../utils/validation.js';

const router = Router();
const authRateLimit = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many authentication attempts. Please try again in a few minutes.',
});

function loginAttemptKey(email, ip) {
    return `login:${email}:${ip || 'unknown'}`;
}

function otpAttemptKey(email, ip) {
    return `otp:${email}:${ip || 'unknown'}`;
}

/**
 * Generates a 6-digit numeric OTP.
 */
function generateOTP() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Generates and stores an OTP for a user in the database.
 * Expires in 5 minutes.
 */
async function generateAndStoreUserOTP(email) {
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    await runStmt(
        'UPDATE users SET otp = ?, otp_expiry = ?, otp_attempts = 0 WHERE email = ?',
        [otp, expiresAt, email]
    );
    
    return otp;
}

router.post('/register', authRateLimit, async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters.' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        const existing = await queryOne('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing) {
            return res.status(409).json({ error: 'User with this email or username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const id = uuidv4();
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4', '#3b82f6', '#f97316'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];

        await runStmt('INSERT INTO users (id, username, email, password, is_admin, avatar_color) VALUES (?, ?, ?, ?, ?, ?)', [
            id,
            username,
            email,
            hashedPassword,
            0,
            avatarColor,
        ]);

        const token = jwt.sign({ id, username, email, is_admin: false, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id, username, email, is_admin: false, role: 'user', avatar_color: avatarColor },
        });
    } catch (err) {
        logger.error('register_error', { error: err.message });
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

router.post('/login', authRateLimit, async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;
        const attemptKey = loginAttemptKey(email, req.ip);
        const retryAfter = assertNotBlocked(attemptKey);

        if (retryAfter > 0) {
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({ error: 'Too many failed login attempts. Please try again later.' });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            registerFailure(attemptKey);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            registerFailure(attemptKey);
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        clearFailures(attemptKey);

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                is_admin: Number(user.is_admin) === 1,
                role: user.role || 'user'
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                is_admin: Number(user.is_admin) === 1,
                role: user.role || 'user',
                avatar_color: user.avatar_color,
            },
        });
    } catch (err) {
        logger.error('login_error', { error: err.message });
        res.status(500).json({ error: 'Server error during login.' });
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await queryOne('SELECT id, username, email, is_admin, role, avatar_color, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user: { ...user, is_admin: Number(user.is_admin) === 1, role: user.role || 'user' } });
    } catch (err) {
        logger.error('get_user_error', { error: err.message });
        res.status(500).json({ error: 'Server error.' });
    }
});

router.post('/forgot-password', authRateLimit, async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        const user = await queryOne('SELECT id, email FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.json({ message: 'If this email is registered, an OTP has been sent.' });
        }

        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const id = uuidv4();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await runStmt('UPDATE password_reset_otps SET used = 1 WHERE email = ? AND used = 0', [email]);
        await runStmt('INSERT INTO password_reset_otps (id, email, otp, expires_at) VALUES (?, ?, ?, ?)', [id, email, otp, expiresAt]);
        await sendPasswordResetOtp({ email, otp });

        res.json({ message: 'If this email is registered, an OTP has been sent.' });
    } catch (err) {
        logger.error('forgot_password_error', { error: err.message });
        res.status(500).json({ error: 'Unable to deliver the reset code right now.' });
    }
});

router.post('/verify-otp', authRateLimit, async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || '').trim();
        const attemptKey = otpAttemptKey(email, req.ip);
        const retryAfter = assertNotBlocked(attemptKey);

        if (retryAfter > 0) {
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({ error: 'Too many invalid OTP attempts. Please request a new code later.' });
        }

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const record = await queryOne(
            'SELECT * FROM password_reset_otps WHERE email = ? AND otp = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (!record) {
            registerFailure(attemptKey, 5, 10 * 60 * 1000);
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        clearFailures(attemptKey);
        const resetToken = jwt.sign({ email, otpId: record.id, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '15m' });
        res.json({ valid: true, resetToken });
    } catch (err) {
        logger.error('verify_otp_error', { error: err.message });
        res.status(500).json({ error: 'Server error.' });
    }
});

/**
 * Verify user-specific OTP (MFA/Verification)
 */
router.post('/verify-user-otp', authRateLimit, async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || '').trim();

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const user = await queryOne('SELECT id, otp, otp_expiry, otp_attempts FROM users WHERE email = ?', [email]);

        if (!user || !user.otp) {
            return res.status(400).json({ error: 'No active verification code found.' });
        }

        if (Number(user.otp_attempts) >= 3) {
            return res.status(400).json({ error: 'Maximum attempts exceeded. Please request a new code.' });
        }

        // Increment attempts
        await runStmt('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = ?', [user.id]);

        if (new Date(user.otp_expiry) < new Date()) {
            return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ 
                error: 'Invalid code.', 
                attemptsRemaining: 3 - (Number(user.otp_attempts) + 1) 
            });
        }

        // Return a reset token for the next step (valid for 10 mins)
        const resetToken = jwt.sign(
            { email, purpose: 'user-password-reset' }, 
            JWT_SECRET, 
            { expiresIn: '10m' }
        );

        res.json({ success: true, message: 'Code verified successfully.', resetToken });
    } catch (err) {
        logger.error('verify_user_otp_error', { error: err.message });
        res.status(500).json({ error: 'Server error during verification.' });
    }
});

/**
 * Reset password using the verified OTP token
 */
router.post('/reset-user-password', authRateLimit, async (req, res) => {
    try {
        const { email, newPassword, resetToken } = req.body;

        if (!email || !newPassword || !resetToken) {
            return res.status(400).json({ error: 'Email, new password, and reset token are required.' });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        // Verify the token
        let payload;
        try {
            payload = jwt.verify(resetToken, JWT_SECRET);
        } catch {
            return res.status(400).json({ error: 'Invalid or expired reset token. Please verify your OTP again.' });
        }

        if (payload.purpose !== 'user-password-reset' || payload.email !== normalizeEmail(email)) {
            return res.status(400).json({ error: 'Invalid reset token.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update user password and CLEAR OTP fields
        await runStmt(
            'UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL, otp_attempts = 0 WHERE email = ?',
            [hashedPassword, normalizeEmail(email)]
        );

        res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (err) {
        logger.error('reset_user_password_error', { error: err.message });
        res.status(500).json({ error: 'Server error during password reset.' });
    }
});

router.post('/reset-password', authRateLimit, async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required.' });
        }
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }

        let payload;
        try {
            payload = jwt.verify(resetToken, JWT_SECRET);
        } catch {
            return res.status(400).json({ error: 'Invalid or expired reset token. Please start over.' });
        }

        if (payload.purpose !== 'password-reset') {
            return res.status(400).json({ error: 'Invalid token.' });
        }

        const otpRecord = await queryOne('SELECT id, used, expires_at FROM password_reset_otps WHERE id = ?', [payload.otpId]);
        if (!otpRecord || Number(otpRecord.used) === 1 || new Date(otpRecord.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Reset token is no longer valid. Please start over.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await runStmt('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, payload.email]);
        await runStmt('UPDATE password_reset_otps SET used = 1 WHERE id = ?', [payload.otpId]);

        res.json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        logger.error('reset_password_error', { error: err.message });
        res.status(500).json({ error: 'Server error.' });
    }
});

router.patch('/users/:id/role', adminMiddleware, async (req, res) => {
    try {
        const isAdmin = Boolean(req.body.is_admin);
        const targetUser = await queryOne('SELECT id, email, is_admin FROM users WHERE id = ?', [req.params.id]);

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (req.user.id === req.params.id && !isAdmin) {
            return res.status(400).json({ error: 'You cannot remove your own admin access.' });
        }

        await runStmt('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, req.params.id]);
        res.json({ message: 'User role updated.', is_admin: isAdmin });
    } catch (err) {
        logger.error('user_role_update_error', { error: err.message, userId: req.params.id });
        res.status(500).json({ error: 'Failed to update user role.' });
    }
});

router.delete('/users/:id', adminMiddleware, async (req, res) => {
    try {
        const targetUser = await queryOne('SELECT id, is_admin FROM users WHERE id = ?', [req.params.id]);

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        if (req.user.id === req.params.id) {
            return res.status(400).json({ error: 'You cannot delete your own admin account.' });
        }

        await runStmt('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        logger.error('user_delete_error', { error: err.message, userId: req.params.id });
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

export default router;
