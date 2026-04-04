import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDB, saveDB } from '../database/init.js';
import { JWT_SECRET, authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper: run a query and get all rows
function queryAll(db, sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

// Helper: run a query and get one row
function queryOne(db, sql, params = []) {
    const rows = queryAll(db, sql, params);
    return rows[0] || null;
}

// Helper: run a statement (INSERT, UPDATE, DELETE)
function runStmt(db, sql, params = []) {
    db.run(sql, params);
    saveDB();
}

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const db = await getDB();
        const existing = queryOne(db, 'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing) {
            return res.status(409).json({ error: 'User with this email or username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const id = uuidv4();
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4', '#3b82f6', '#f97316'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];

        runStmt(db,
            'INSERT INTO users (id, username, email, password, avatar_color) VALUES (?, ?, ?, ?, ?)',
            [id, username, email, hashedPassword, avatarColor]
        );

        const token = jwt.sign({ id, username, email }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            token,
            user: { id, username, email, avatar_color: avatarColor },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const db = await getDB();
        const user = queryOne(db, 'SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar_color: user.avatar_color,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const db = await getDB();
        const user = queryOne(db, 'SELECT id, username, email, avatar_color, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Forgot Password - Request OTP
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const db = await getDB();
        const user = queryOne(db, 'SELECT id, email FROM users WHERE email = ?', [email]);
        if (!user) {
            // Return success even if email not found (security best practice)
            return res.json({ message: 'If this email is registered, an OTP has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const id = uuidv4();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Invalidate any previous OTPs for this email
        runStmt(db, 'UPDATE password_reset_otps SET used = 1 WHERE email = ? AND used = 0', [email]);

        // Store OTP
        runStmt(db,
            'INSERT INTO password_reset_otps (id, email, otp, expires_at) VALUES (?, ?, ?, ?)',
            [id, email, otp, expiresAt]
        );

        // Log OTP to console (replace with email service in production)
        console.log(`\n🔑 PASSWORD RESET OTP for ${email}: ${otp}\n`);

        res.json({
            message: 'If this email is registered, an OTP has been sent.',
            // DEV ONLY: return OTP in response for testing
            otp_dev: otp,
        });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const db = await getDB();
        const record = queryOne(db,
            'SELECT * FROM password_reset_otps WHERE email = ? AND otp = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (!record) {
            return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }

        // Check expiration
        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
        }

        // Generate a short-lived reset token
        const resetToken = jwt.sign(
            { email, otpId: record.id, purpose: 'password-reset' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ valid: true, resetToken });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.status(400).json({ error: 'Reset token and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Verify reset token
        let payload;
        try {
            payload = jwt.verify(resetToken, JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid or expired reset token. Please start over.' });
        }

        if (payload.purpose !== 'password-reset') {
            return res.status(400).json({ error: 'Invalid token.' });
        }

        const db = await getDB();

        // Mark OTP as used
        runStmt(db, 'UPDATE password_reset_otps SET used = 1 WHERE id = ?', [payload.otpId]);

        // Hash and update password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        runStmt(db, 'UPDATE users SET password = ? WHERE email = ?', [hashedPassword, payload.email]);

        res.json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

export default router;

