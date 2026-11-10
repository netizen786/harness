import { bus } from './bus.js';

let worker;
let isReady = false;

export async function initPyodideRunner() {
  worker = new Worker(new URL('../workers/pyodide.worker.js', import.meta.url), { type: 'module' });
  
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.type === 'READY') {
        isReady = true;
        bus.emit('pyodide:ready');
        resolve();
      } else if (e.data.type === 'ERROR') {
        reject(new Error(e.data.error));
      }
    };
    worker.onerror = (err) => reject(err);
    worker.postMessage({ type: 'INIT' });
  });
}

export async function runPython(code) {
  if (!isReady) throw new Error('Pyodide is not initialized yet.');
  
  return new Promise((resolve) => {
    const msgId = crypto.randomUUID();
    const handler = (e) => {
      if (e.data.msgId === msgId) {
        worker.removeEventListener('message', handler);
        resolve(e.data.result);
      }
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ type: 'RUN', msgId, code });
  });
}

export function getPyodideStatus() {
  return isReady ? 'ready' : 'loading';
}
