import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'verifynews-tests-'));
const dbPath = path.join(tempRoot, 'test.db');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_value_that_is_long_enough_123456';
process.env.EMAIL_PROVIDER = 'console';
process.env.SEED_DEMO_DATA = 'false';
process.env.DB_PATH = dbPath;
process.env.BACKUP_DIR = path.join(tempRoot, 'backups');
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'AdminPassword123!';

const { startServer } = await import('../server/index.js');
const { getDB } = await import('../server/database/init.js');
const { backupDatabaseFile } = await import('../server/services/backupService.js');

let server;
let baseUrl;

test.before(async () => {
    server = startServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('health and readiness endpoints respond', async () => {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);
    const health = await healthResponse.json();
    assert.equal(health.status, 'ok');

    const readyResponse = await fetch(`${baseUrl}/api/ready`);
    assert.equal(readyResponse.status, 200);
    const ready = await readyResponse.json();
    assert.equal(ready.status, 'ready');
});

test('admin account is bootstrapped from environment credentials', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@example.com',
            password: 'AdminPassword123!',
        }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.email, 'admin@example.com');
    assert.equal(body.user.is_admin, true);
});

test('admin overview is restricted to admins', async () => {
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@example.com',
            password: 'AdminPassword123!',
        }),
    });
    const adminBody = await adminLogin.json();

    const adminResponse = await fetch(`${baseUrl}/api/stats/admin`, {
        headers: { Authorization: `Bearer ${adminBody.token}` },
    });
    assert.equal(adminResponse.status, 200);

    const normalRegister = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'plainuser',
            email: 'plain@example.com',
            password: 'password123',
        }),
    });
    const normalBody = await normalRegister.json();

    const forbiddenResponse = await fetch(`${baseUrl}/api/stats/admin`, {
        headers: { Authorization: `Bearer ${normalBody.token}` },
    });
    assert.equal(forbiddenResponse.status, 403);
});

test('admin can update user roles and delete reports', async () => {
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@example.com',
            password: 'AdminPassword123!',
        }),
    });
    const adminBody = await adminLogin.json();

    const userRegister = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'roleuser',
            email: 'roleuser@example.com',
            password: 'password123',
        }),
    });
    const roleUserBody = await userRegister.json();

    const promoteResponse = await fetch(`${baseUrl}/api/auth/users/${roleUserBody.user.id}/role`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminBody.token}`,
        },
        body: JSON.stringify({ is_admin: true }),
    });
    assert.equal(promoteResponse.status, 200);

    const promotedLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'roleuser@example.com',
            password: 'password123',
        }),
    });
    const promotedBody = await promotedLogin.json();
    assert.equal(promotedBody.user.is_admin, true);

    const reportResponse = await fetch(`${baseUrl}/api/reports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${promotedBody.token}`,
        },
        body: JSON.stringify({
            title: 'Delete me',
            url: 'https://example.com/delete-me',
            description: 'Temporary report',
            category: 'misinformation',
        }),
    });
    const reportBody = await reportResponse.json();

    const deleteResponse = await fetch(`${baseUrl}/api/reports/${reportBody.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminBody.token}` },
    });
    assert.equal(deleteResponse.status, 200);
});

test('password reset request does not leak OTP in the response', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'otpuser',
            email: 'otp@example.com',
            password: 'password123',
        }),
    });

    const response = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'otp@example.com' }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.message, 'If this email is registered, an OTP has been sent.');
    assert.equal(Object.hasOwn(body, 'otp_dev'), false);
});

test('report upvotes are limited to one per user', async () => {
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'reporter',
            email: 'reporter@example.com',
            password: 'password123',
        }),
    });
    const registerBody = await registerResponse.json();
    const token = registerBody.token;

    const reportResponse = await fetch(`${baseUrl}/api/reports`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            title: 'Test report',
            url: 'https://example.com/story',
            description: 'Suspicious article body',
            category: 'misinformation',
        }),
    });
    assert.equal(reportResponse.status, 201);
    const reportBody = await reportResponse.json();

    const firstVote = await fetch(`${baseUrl}/api/reports/${reportBody.id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(firstVote.status, 200);

    const secondVote = await fetch(`${baseUrl}/api/reports/${reportBody.id}/upvote`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(secondVote.status, 409);
});

test('login blocks after repeated failures', async () => {
    await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'lockuser',
            email: 'lock@example.com',
            password: 'password123',
        }),
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'lock@example.com', password: 'wrong-password' }),
        });
        assert.equal(response.status, 401);
    }

    const blockedResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'lock@example.com', password: 'wrong-password' }),
    });
    assert.equal(blockedResponse.status, 429);
});

test('database backup script writes a backup file', async () => {
    await getDB();
    const backupPath = await backupDatabaseFile();
    assert.equal(fs.existsSync(backupPath), true);
});
