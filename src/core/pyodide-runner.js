import { bus } from './bus.js';

let worker;
let isReady = false;
let status = 'not-started';
let initializationPromise;
const INIT_TIMEOUT_MS = 90000;

export function initPyodideRunner() {
  if (isReady) return Promise.resolve();
  if (initializationPromise) return initializationPromise;

  status = 'loading';
  try {
    worker = new Worker(new URL('../workers/pyodide.worker.js', import.meta.url), { type: 'module' });
  } catch (err) {
    status = 'error';
    bus.emit('pyodide:error', err.message || String(err));
    return Promise.reject(err);
  }

  const activeWorker = worker;
  initializationPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      fail(new Error(`Pyodide initialization timed out after ${INIT_TIMEOUT_MS / 1000} seconds.`));
    }, INIT_TIMEOUT_MS);

    function fail(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      isReady = false;
      status = 'error';
      activeWorker.terminate();
      if (worker === activeWorker) worker = undefined;
      initializationPromise = undefined;
      bus.emit('pyodide:error', err.message || String(err));
      reject(err);
    }

    activeWorker.onmessage = (event) => {
      if (event.data.type === 'READY') {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        isReady = true;
        status = 'ready';
        bus.emit('pyodide:ready');
        resolve();
      } else if (event.data.type === 'ERROR') {
        fail(new Error(event.data.error || 'Pyodide failed to initialize.'));
      }
    };

    activeWorker.onerror = (event) => {
      fail(new Error(event.message || 'Pyodide worker failed to load.'));
    };

    activeWorker.postMessage({ type: 'INIT' });
  });

  return initializationPromise;
}

export async function runPython(code) {
  if (!isReady || !worker) throw new Error(`Pyodide is ${status}; Python execution is unavailable.`);

  return new Promise((resolve, reject) => {
    const msgId = crypto.randomUUID();
    const handler = (event) => {
      if (event.data.msgId === msgId) {
        worker.removeEventListener('message', handler);
        resolve(event.data.result);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'RUN', msgId, code });
  });
}

export function getPyodideStatus() {
  return status;
}
