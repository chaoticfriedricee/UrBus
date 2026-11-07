export const RETRY_DELAYS_MS = [2000, 5000, 15000, 30000, 60000];

export function createSocketRecovery({
  socket, refreshToken, doc, win, onSessionExpired = () => {},
  setTimer = setTimeout, clearTimer = clearTimeout,
}) {
  let attempt = 0;
  let timer = null;
  let refreshed = false;

  const cancelRetry = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const connectNow = () => {
    cancelRetry();
    if (socket.connected || socket.active) return;
    socket.connect();
  };

  const scheduleRetry = () => {
    if (timer !== null || doc.visibilityState !== 'visible') return;
    const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
    attempt += 1;
    timer = setTimer(() => { timer = null; connectNow(); }, delay);
  };

  const onConnect = () => {
    attempt = 0;
    refreshed = false;
    cancelRetry();
  };

  const onConnectError = async (error) => {
    if (socket.active) return;
    if (error?.message === 'UNAUTHORIZED') {
      if (refreshed) {
        onSessionExpired();
        return;
      }
      refreshed = true;
      try {
        await refreshToken();
      } catch {
        onSessionExpired();
        return;
      }
      connectNow();
      return;
    }
    scheduleRetry();
  };

  const onVisible = () => {
    if (doc.visibilityState !== 'visible') return;
    attempt = 0;
    connectNow();
  };

  const onOnline = () => {
    attempt = 0;
    connectNow();
  };

  socket.on('connect', onConnect);
  socket.on('connect_error', onConnectError);
  doc.addEventListener('visibilitychange', onVisible);
  win.addEventListener('online', onOnline);

  return {
    dispose() {
      cancelRetry();
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      doc.removeEventListener('visibilitychange', onVisible);
      win.removeEventListener('online', onOnline);
    },
  };
}
