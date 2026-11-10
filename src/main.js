import { bus } from './core/bus.js';
import { initStore } from './core/store.js';
import { initRegistry } from './core/registry.js';
import { initPyodideRunner } from './core/pyodide-runner.js';
import './ui/app-shell.js';

function showApp() {
  document.getElementById('app-root').hidden = false;
  document.getElementById('app-skeleton').hidden = true;
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

function bootstrap() {
  // Render the interface immediately; Pyodide can take time to download and initialize.
  showApp();
  initRegistry();

  initStore().catch(err => {
    console.error('Settings store initialization failed:', err);
  });

  initPyodideRunner().catch(err => {
    // The app remains usable; Python tools report the initialization failure.
    console.error('Pyodide initialization failed:', err);
  });

  registerServiceWorker();
  bus.emit('harness:ready');
}

bootstrap();
