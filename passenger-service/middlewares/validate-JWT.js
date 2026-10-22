import jwt from 'jsonwebtoken';

export const validateJWT = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: 'Token requerido'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE
        });

        // Un refresh token (dura días) no debe servir como access token
        if (decoded.type === 'refresh') {
            return res.status(401).json({
                message: 'Token inválido'
            });
        }

        const rawRole =
            decoded.role ||
            decoded.roles ||
            decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
        const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;

        req.user = {
            id: decoded.sub,
            role: role || 'USER_ROLE'
        };

        next();

    } catch (error) {

        return res.status(401).json({
            message: 'Token inválido'
        });

    }
};