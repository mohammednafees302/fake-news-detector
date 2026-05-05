function write(level, message, meta = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
    };

    const serialized = JSON.stringify(payload);
    if (level === 'error') {
        console.error(serialized);
        return;
    }

    console.log(serialized);
}

export const logger = {
    info(message, meta) {
        write('info', message, meta);
    },
    warn(message, meta) {
        write('warn', message, meta);
    },
    error(message, meta) {
        write('error', message, meta);
    },
};

export function requestLogger(req, res, next) {
    const startedAt = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
        logger.info('request_completed', {
            method,
            path: originalUrl,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            ip: req.ip,
        });
    });

    next();
}
