import crypto from 'node:crypto';

const encode = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8');

const createToken = ({ sub, role, issuer, audience, expiresInSeconds = 3600 }) => {
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encode(JSON.stringify({
    sub, role, iss: issuer, aud: audience, iat: now, exp: now + expiresInSeconds,
  }));
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'test-secret')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

export const verifyToken = (token) => {
  if (typeof token !== 'string') throw new Error('Token requerido.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token inválido.');
  const [headerPart, payloadPart, signature] = parts;
  const header = JSON.parse(decode(headerPart));
  if (header.alg !== 'HS256') throw new Error('Algoritmo JWT no permitido.');

  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'test-secret')
    .update(`${headerPart}.${payloadPart}`)
    .digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    throw new Error('Token inválido.');
  }

  const payload = JSON.parse(decode(payloadPart));
  if (!payload.sub || (payload.exp && Math.floor(Date.now() / 1000) >= payload.exp)) {
    throw new Error('Token vencido o inválido.');
  }
  if (process.env.JWT_ISSUER && payload.iss !== process.env.JWT_ISSUER) throw new Error('Emisor JWT inválido.');
  if (process.env.JWT_AUDIENCE && payload.aud !== process.env.JWT_AUDIENCE) throw new Error('Audiencia JWT inválida.');
  return payload;
};

export const signToken = (sub, role) => createToken({
  sub,
  role,
  issuer: process.env.JWT_ISSUER || 'UrBus',
  audience: process.env.JWT_AUDIENCE || 'UrBus',
});

const resolveToken = (req) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  return scheme === 'Bearer' && token ? token : null;
};

export const fetchGroupAccess = async (token) => {
  const passengerServiceUrl = process.env.PASSENGER_SERVICE_URL || 'http://localhost:3011/urbus/v1';
  const response = await fetch(`${passengerServiceUrl}/groups/access`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`passenger-service respondió ${response.status}`);
  const payload = await response.json();
  return payload?.data ?? null;
};

export const ensureAuthenticated = (req, res, next) => {
  const token = resolveToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'Token requerido.' });

  const getAccess = req.app.locals.getGroupAccess ?? fetchGroupAccess;
  Promise.resolve(getAccess(token)).then((access) => {
    if (!access?.userId || !access?.role) {
      return res.status(401).json({ success: false, message: 'Token inválido o sin acceso.' });
    }
    req.groupAccess = access;
    req.user = { id: access.userId, role: access.role };
    return next();
  }).catch((error) => res.status(502).json({
    success: false,
    message: 'No se pudo verificar el acceso con passenger-service.',
    error: error.message,
  }));
};

export const authorizeGroupItinerary = (req, res, next) => {
  const groupId = String(req.params.groupId || '').trim();
  if (!groupId) return res.status(400).json({ success: false, message: 'groupId requerido.' });

  const access = req.groupAccess;
  const ownsGroup = req.user.role === 'DRIVER_ROLE'
    && Array.isArray(access?.ownedGroupIds)
    && access.ownedGroupIds.includes(groupId);
  const isMember = ['USER_ROLE', 'PASSENGER_ROLE'].includes(req.user.role)
    && access?.memberGroupId === groupId;

  if (req.method !== 'GET' && !ownsGroup) {
    return res.status(403).json({ success: false, message: 'Solo el conductor asignado puede modificar el recorrido.' });
  }
  if (ownsGroup || (req.method === 'GET' && isMember)) return next();
  return res.status(403).json({ success: false, message: 'No tienes acceso al recorrido de este grupo.' });
};
