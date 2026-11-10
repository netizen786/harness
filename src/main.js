import { FEATURES } from './core/flags.js';
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

async function bootstrap() {
  try {
    showApp();
    await initStore();
    initRegistry();
    try {
      await initPyodideRunner();
    } catch (err) {
      console.error('Pyodide failed to initialize:', err);
    }

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('./sw.js');
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
    }

    bus.emit('harness:ready');
  } catch (err) {
    console.error('Bootstrap error:', err);
    const skeleton = document.getElementById('app-skeleton');
    if (skeleton) {
      skeleton.innerHTML = `<div style="padding:20px;color:red;font-family:monospace">Failed to initialize:<br>${err.message || err.toString()}<br><br>Check console.</div>`;
    }
  }
}

bootstrap();
