import { refreshAccessToken } from '../../../shared/api/api.js';

const LOCATION_SERVICE_URL = import.meta.env.VITE_LOCATION_SERVICE_URL
  || 'http://localhost:3033/urbus/v1';

async function request(path, token, options = {}, canRefresh = true) {
  const response = await fetch(`${LOCATION_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (response.status === 401 && canRefresh) {
    const refreshedToken = await refreshAccessToken();
    return request(path, refreshedToken, options, false);
  }
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `El servicio de ubicación respondió con estado ${response.status}.`);
  }
  return payload.data;
}

export const getItineraryAccess = (token) => request('/itineraries/access', token);

export const getItinerary = (groupId, token) =>
  request(`/itineraries/${encodeURIComponent(groupId)}`, token);

export const updateGroupDestination = (groupId, token, destination) =>
  request(`/itineraries/${encodeURIComponent(groupId)}`, token, {
    method: 'PUT',
    body: JSON.stringify({ destination }),
  });

export const startGroupTrip = (groupId, token, origin) =>
  request(`/itineraries/${encodeURIComponent(groupId)}/trips`, token, {
    method: 'POST',
    body: JSON.stringify({ origin }),
  });

export const interruptGroupTrip = (groupId, token) =>
  request(`/itineraries/${encodeURIComponent(groupId)}/trips/interrupt`, token, {
    method: 'POST',
  });
