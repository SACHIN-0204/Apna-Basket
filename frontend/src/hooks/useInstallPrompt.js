import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// "Install the app" logic.
//  - Chrome, Edge, Samsung Internet (Android and desktop) fire `beforeinstallprompt`.
//    We keep that event and call it when the customer taps Install.
//  - iPhone / iPad Safari has no such event, so we show "Share > Add to Home Screen" steps.
// The listener is added when this file loads, because the browser can fire the event
// before React has mounted.
// ---------------------------------------------------------------------------

export const DISMISS_KEY = 'ab_install_dismissed_at';
export const INSTALLED_KEY = 'ab_installed';
export const VISITS_KEY = 'ab_visits';
const COUNTED_KEY = 'ab_visit_counted';
export const DISMISS_DAYS = 30;

const store = {
  get(area, key) { try { return window[area].getItem(key); } catch { return null; } },
  set(area, key, value) { try { window[area].setItem(key, value); } catch { /* private mode: fine */ } },
};

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return Boolean(mq || window.navigator.standalone === true);
};

// Safari on iPhone / iPad. Other iOS browsers cannot add to the home screen the same way.
export const isIosSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPhoneOrPad = /iPhone|iPad|iPod/.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPads that pretend to be Macs
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|FBAN|FBAV|Instagram/.test(ua);
  return (iPhoneOrPad || iPadOs) && safari;
};

const markInstalled = () => store.set('localStorage', INSTALLED_KEY, '1');

export const isDismissedRecently = (now = Date.now()) => {
  const at = Number(store.get('localStorage', DISMISS_KEY));
  return Number.isFinite(at) && at > 0 && now - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
};

// Counts this browser session once; returns how many visits the customer has made
export const countVisit = () => {
  const current = Number(store.get('localStorage', VISITS_KEY)) || 0;
  if (store.get('sessionStorage', COUNTED_KEY)) return current;
  store.set('sessionStorage', COUNTED_KEY, '1');
  store.set('localStorage', VISITS_KEY, String(current + 1));
  return current + 1;
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // we show our own button instead of the browser's mini-bar
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    markInstalled();
    notify();
  });
}

// Test helper: forget everything captured so far
export const __resetInstallPromptForTests = () => {
  deferredPrompt = null;
  listeners.clear();
};

export const useInstallPrompt = () => {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  const installed = isStandalone() || store.get('localStorage', INSTALLED_KEY) === '1';
  const hasNativePrompt = Boolean(deferredPrompt);
  const iosSteps = !hasNativePrompt && isIosSafari();

  const dismiss = useCallback(() => {
    store.set('localStorage', DISMISS_KEY, String(Date.now()));
    notify();
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    const promptEvent = deferredPrompt;
    deferredPrompt = null; // a prompt event can only be used once
    promptEvent.prompt();
    let outcome = 'dismissed';
    try {
      outcome = (await promptEvent.userChoice).outcome;
    } catch {
      /* treated as dismissed */
    }
    if (outcome === 'accepted') markInstalled();
    else store.set('localStorage', DISMISS_KEY, String(Date.now()));
    notify();
    return outcome;
  }, []);

  return {
    canInstall: !installed && (hasNativePrompt || iosSteps),
    iosSteps,
    dismissedRecently: isDismissedRecently(),
    install,
    dismiss,
  };
};
