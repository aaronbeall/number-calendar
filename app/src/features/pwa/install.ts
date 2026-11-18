import { useSyncExternalStore } from 'react';

/** Chrome/Edge/Samsung fire this when the app meets the install criteria. Not in lib.dom yet. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari home screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad Safari has no install prompt API; users add to the home screen from the Share sheet. */
export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as Mac, but has touch
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * Starts listening for install events. Called once from main.tsx before React renders, because
 * `beforeinstallprompt` can fire before any component has mounted.
 */
export function initInstallPrompt() {
  if (typeof window === 'undefined') return;
  installed = isStandalone();
  window.addEventListener('beforeinstallprompt', e => {
    // Keep the browser's mini-infobar from showing; we offer install from our own UI instead.
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type InstallState = 'installed' | 'prompt' | 'ios' | 'unavailable';

function getState(): InstallState {
  if (installed) return 'installed';
  if (deferredPrompt) return 'prompt';
  if (isIOS()) return 'ios';
  return 'unavailable';
}

/** Shows the browser's install dialog. Resolves to true if the user accepted. */
export async function promptInstall() {
  const prompt = deferredPrompt;
  if (!prompt) return false;
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  // A prompt can only be used once.
  deferredPrompt = null;
  emit();
  return outcome === 'accepted';
}

/**
 * Whether the app can be installed from here:
 * - `prompt`: the browser's install dialog is available (Chrome, Edge, Android)
 * - `ios`: show Add to Home Screen instructions
 * - `installed`: already running as an installed app
 * - `unavailable`: browser doesn't support installing, or criteria not met yet
 */
export function useInstallState() {
  return useSyncExternalStore(subscribe, getState, () => 'unavailable' as InstallState);
}
