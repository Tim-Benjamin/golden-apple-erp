// Captures the browser's `beforeinstallprompt` event as early as possible (before React
// even mounts), since the event can fire at any time after page load and is only usable
// once. Components subscribe to this store instead of attaching their own listener, so
// no matter when a component mounts, it can still access a prompt that fired earlier.

let deferredPrompt = null;
let installed = false;
const listeners = new Set();

function notify() {
  listeners.forEach((cb) => cb());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installed = true;
  notify();
});

export function getInstallPromptState() {
  return { canInstall: !!deferredPrompt, installed };
}

export function subscribeToInstallPrompt(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function triggerInstallPrompt() {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return result;
}