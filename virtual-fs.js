const vfs = new Map();

export async function fsRead({ path }) {
  if (!vfs.has(path)) throw new Error(`File not found: ${path}`);
  return { ok: true, content: vfs.get(path) };
}

export async function fsWrite({ path, content }) {
  vfs.set(path, content);
  return { ok: true, message: `Written to ${path}` };
}

export async function fsList({ path }) {
  const entries = [];
  for (const key of vfs.keys()) {
    if (key.startsWith(path)) entries.push(key);
  }
  return { ok: true, entries };
}