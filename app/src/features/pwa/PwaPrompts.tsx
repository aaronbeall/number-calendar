import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** How often an open tab checks for a new deploy. */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const UPDATE_TOAST_ID = 'pwa-update';

/**
 * Registers the service worker and handles its lifecycle:
 * - tells the user once when the app has been cached for offline use
 * - shows a persistent "update available" toast when a new version is waiting, with a Reload action
 * - checks for updates hourly and whenever the tab becomes visible again
 * - asks the browser to keep local data (IndexedDB) from being evicted under storage pressure
 */
export function PwaPrompts() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      const check = async () => {
        if (registration.installing || !navigator.onLine) return;
        try {
          // Skip when the server can't be reached, so offline tabs don't log errors.
          const resp = await fetch(swUrl, { cache: 'no-store', headers: { cache: 'no-store' } });
          if (resp.status === 200) await registration.update();
        } catch {
          // offline or network error: try again next time
        }
      };
      setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    setOfflineReady(false);
    toast('Ready to work offline', {
      description: 'Numbers Go Up is saved on this device and works without a connection.',
      duration: 5000,
    });
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) {
      toast.dismiss(UPDATE_TOAST_ID);
      return;
    }
    toast('A new version is available', {
      id: UPDATE_TOAST_ID,
      description: 'Reload to get the latest features and fixes. Your data is kept.',
      duration: Infinity,
      action: {
        label: 'Reload',
        onClick: () => updateServiceWorker(true),
      },
      cancel: {
        label: 'Later',
        onClick: () => setNeedRefresh(false),
      },
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  useEffect(() => {
    requestPersistentStorage();
  }, []);

  return null;
}

/**
 * All data lives in IndexedDB, which browsers may clear when disk is low unless storage is marked
 * persistent. Chrome and Edge grant this silently for installed or frequently used sites; Firefox
 * asks the user, so only ask there once the user has actually saved something.
 */
async function requestPersistentStorage() {
  if (!navigator.storage?.persist || !navigator.storage.persisted) return;
  try {
    if (await navigator.storage.persisted()) return;
    const isFirefox = /firefox/i.test(navigator.userAgent);
    if (isFirefox && !(await hasLocalData())) return;
    await navigator.storage.persist();
  } catch {
    // not supported or denied: data still works, it just isn't protected from eviction
  }
}

async function hasLocalData() {
  if (!indexedDB.databases) return true;
  const dbs = await indexedDB.databases();
  return dbs.length > 0;
}
