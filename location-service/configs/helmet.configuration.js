const mapStyleOrigin = new URL(
    process.env.MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
).origin;

export const helmetOptions = {
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'blob:'],
            connectSrc: [
                "'self'",
                "ws:",
                "wss:",
                "https://unpkg.com",
                mapStyleOrigin,
            ],
            workerSrc: ["'self'", 'blob:'],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            frameAncestors: ["'none'"],
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://unpkg.com",
                "https://cdn.socket.io"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://unpkg.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https://*.tile.openstreetmap.org",
                "https://maps.wikimedia.org",
                "https://unpkg.com"
            ]
        }
    },
    hsts: false,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
};