import { ENDPOINTS } from '../../../shared/constants/endpoints';
import useAuthStore from '../../../shared/store/authStore';
import { refreshAccessToken } from '../../../shared/api/authClient';

const LOCATION_API = ENDPOINTS.LOCATION.replace(/\/+$/, '').endsWith('/urbus/v1')
  ? ENDPOINTS.LOCATION.replace(/\/+$/, '')
  : `${ENDPOINTS.LOCATION.replace(/\/+$/, '')}/urbus/v1`;

async function request(path, options = {}, canRefresh = true) {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${LOCATION_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (response.status === 401 && canRefresh) {
    await refreshAccessToken();
    return request(path, options, false);
  }
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || `El servicio de ubicación respondió con estado ${response.status}.`);
  }
  return payload.data;
}

export const getItineraryAccess = () => request('/itineraries/access');

export const getItinerary = (groupId) =>
  request(`/itineraries/${encodeURIComponent(groupId)}`);

export const startGroupTrip = (groupId, origin) =>
  request(`/itineraries/${encodeURIComponent(groupId)}/trips`, {
    method: 'POST',
    body: JSON.stringify({ origin }),
  });

export const updateGroupDestination = (groupId, destination) =>
  request(`/itineraries/${encodeURIComponent(groupId)}`, {
    method: 'PUT',
    body: JSON.stringify({ destination }),
  });

export const interruptGroupTrip = (groupId) =>
  request(`/itineraries/${encodeURIComponent(groupId)}/trips/interrupt`, { method: 'POST' });
