import { bus } from './core/bus.js';
import { initStore } from './core/store.js';
import { initRegistry } from './core/registry.js';
import { initPyodideRunner } from './core/pyodide-runner.js';
import './ui/app-shell.js';

function showApp() {
  const app = document.getElementById('app-root');
  const skeleton = document.getElementById('app-skeleton');
  if (app) app.hidden = false;
  if (skeleton) skeleton.hidden = true;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          document.getElementById('sw-update-toast')?.classList.remove('hidden');
        }
      });
    });

    document.getElementById('sw-reload-btn')?.addEventListener('click', () => {
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    });
  }).catch(err => console.error('Service worker registration failed:', err));
}

// Reveal the interface before starting network- or storage-dependent setup.
showApp();
initRegistry();
initStore().catch(err => console.error('Settings store initialization failed:', err));
initPyodideRunner().catch(err => console.error('Pyodide failed to initialize:', err));
registerServiceWorker();
bus.emit('harness:ready');
