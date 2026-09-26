import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

// The browser's own idea of whether there is a network connection. It can say "online" while the
// connection is really dead (so requests still have to handle failing), but when it says "offline"
// it is reliable enough to tell the person why nothing is loading.
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
