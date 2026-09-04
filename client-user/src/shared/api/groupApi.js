// src/shared/api/groupApi.js
import passengerClient from './passengerClient';

// POST /groups/join — requiere PASSENGER_ROLE o USER_ROLE
export const joinGroup = (code) => passengerClient.post('/groups/join', { code });
