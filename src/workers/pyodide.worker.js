import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.mjs';

let pyodide = null;

self.onmessage = async (event) => {
  const { type, msgId, code } = event.data;

  if (type === 'INIT') {
    try {
      pyodide = await loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.0/full/'
      });
      self.postMessage({ type: 'READY' });
    } catch (err) {
      self.postMessage({ type: 'ERROR', error: err.message || String(err) });
    }
  }

  if (type === 'RUN') {
    if (!pyodide) {
      self.postMessage({ type: 'RESULT', msgId, result: { ok: false, error: 'Pyodide not initialized' } });
      return;
    }

    try {
      const wrappedCode = `
import asyncio
import sys

_original_import = __builtins__.__import__
def _safe_import(name, *args, **kwargs):
    if name in ['os', 'subprocess', 'socket', 'threading']:
        raise ImportError(f"Module '{name}' is blocked in this sandbox. Use asyncio or virtual FS.")
    return _original_import(name, *args, **kwargs)
__builtins__.__import__ = _safe_import

async def _run():
    try:
        exec_globals = {"__name__": "__main__"}
        exec(compile(${JSON.stringify(code)}, '<string>', 'exec'), exec_globals)
    except Exception as e:
        return {"ok": False, "error": str(e), "traceback": str(sys.exc_info())}
    return {"ok": True, "result": "Execution completed successfully"}

result = asyncio.run(_run())
result
`;
      const result = pyodide.runPython(wrappedCode);
      const jsResult = result.toJs ? result.toJs() : result;
      self.postMessage({ type: 'RESULT', msgId, result: jsResult });
    } catch (err) {
      if (String(err.message || err).includes('ModuleNotFoundError')) {
        self.postMessage({
          type: 'RESULT',
          msgId,
          result: { ok: false, error: `ModuleNotFoundError: ${err.message || err}. Install it first or use standard library.` }
        });
      } else {
        self.postMessage({ type: 'RESULT', msgId, result: { ok: false, error: err.message || String(err) } });
      }
    }
  }
};
