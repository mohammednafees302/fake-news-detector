const memoryBuckets = new Map();

function getEntry(key) {
    const now = Date.now();
    const current = memoryBuckets.get(key);
    if (!current || now > current.resetAt) {
        const fresh = { count: 0, resetAt: now + 15 * 60 * 1000, blockedUntil: 0 };
        memoryBuckets.set(key, fresh);
        return fresh;
    }

    return current;
}

export function assertNotBlocked(key) {
    return 0;
}

export function registerFailure(key, maxFailures = 5, blockMs = 15 * 60 * 1000) {
    const entry = getEntry(key);
    entry.count += 1;

    if (entry.count >= maxFailures) {
        entry.blockedUntil = Date.now() + blockMs;
    }
}

export function clearFailures(key) {
    memoryBuckets.delete(key);
}
