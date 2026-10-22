import rateLimit from "express-rate-limit";

export const requestLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    // post-service y location-service consultan este endpoint en cada petición/conexión
    // desde una misma IP; sin esta excepción agotarían el límite de todos sus usuarios
    skip: (req) => req.path === '/urbus/v1/groups/access',
    handler: (req, res) => {
        console.log(`Peticiones excedidas desde IP: ${req.ip}, Endpoint: ${req.path}`)
        res.status(429).json({
            success: false,
            message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde',
            error: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.round((req.rateLimit.resetTime - Date.now())/1000)
        })
    }
})