import { FEATURES } from './flags.js';
import { bus } from './bus.js';
import { initStore } from './store.js';
import { initRegistry } from './registry.js';
import { initPyodideRunner } from './pyodide-runner.js';
import './ui/app-shell.js';

async function bootstrap() {
  try {
    await initStore();
    initRegistry();
    await initPyodideRunner();

    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            document.getElementById('sw-update-toast').classList.remove('hidden');
          }
        });
      });

      document.getElementById('sw-reload-btn').addEventListener('click', () => {
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      });
    }

    const app = document.getElementById('app-root');
    app.hidden = false;
    document.getElementById('app-skeleton').hidden = true;

    bus.emit('harness:ready');
  } catch (err) {
    console.error('Bootstrap error:', err);
    document.getElementById('app-skeleton').innerHTML = `<div style="padding:20px;color:red;font-family:monospace">Failed to initialize:<br>${err.message || err.toString()}<br><br>Check console.</div>`;
  }
}

bootstrap();
