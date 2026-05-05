const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email = '') {
    return email.trim().toLowerCase();
}

export function normalizeUsername(username = '') {
    return username.trim();
}

export function isValidEmail(email = '') {
    return EMAIL_REGEX.test(email);
}

export function isStrongPassword(password = '') {
    return password.length >= 8;
}

export function isValidHttpUrl(value = '') {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

export function clampPageSize(value, fallback = 20, max = 50) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
}
