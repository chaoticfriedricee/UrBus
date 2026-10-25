'use strict';

// Los grupos viven en passenger-service. Para saber a qué grupos tiene acceso el
// usuario se le consulta GET /groups/access reenviando su propio token, así que
// passenger-service sigue siendo la única fuente de verdad sobre las membresías.
const passengerServiceUrl = () =>
    process.env.PASSENGER_SERVICE_URL || 'http://localhost:3011/urbus/v1';

const NO_ACCESS = { ownedGroupIds: [], memberGroupId: null };

export const fetchGroupAccess = async (authorization) => {
    const response = await fetch(`${passengerServiceUrl()}/groups/access`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
        throw new Error(`passenger-service respondió ${response.status}`);
    }

    const body = await response.json();
    return body.data;
};

/**
 * Adjunta req.groupAccess. El admin no necesita la consulta (ve todo). Si
 * passenger-service no responde se asume que el usuario no tiene grupos: solo
 * verá los avisos generales y no podrá publicar en un grupo (falla cerrado).
 */
export const loadGroupAccess = async (req, res, next) => {
    if (req.user.role === 'ADMIN_ROLE') {
        req.groupAccess = NO_ACCESS;
        return next();
    }

    try {
        req.groupAccess = await fetchGroupAccess(req.headers.authorization);
        req.groupAccessAvailable = true;
    } catch (err) {
        console.error(`No se pudo consultar el acceso a grupos: ${err.message}`);
        req.groupAccess = NO_ACCESS;
        req.groupAccessAvailable = false;
    }

    next();
};

// Grupos cuyos avisos puede leer el usuario: los suyos como conductor o el suyo como pasajero
export const readableGroupIds = (access) =>
    [...(access.ownedGroupIds ?? []), access.memberGroupId].filter(Boolean);
