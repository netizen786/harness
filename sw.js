const CACHE_VERSION = 'harness-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './src/main.js', './src/styles/tokens.css', './src/styles/app.css', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => { 
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CORE))); 
  self.skipWaiting(); 
});

self.addEventListener('activate', e => { 
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE_VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())); 
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Network-first for external CDNs (like Pyodide or OpenAI)
  if (u.hostname !== 'localhost' && u.hostname !== self.location.hostname && u.hostname !== '127.0.0.1') {
    e.respondWith(fetch(e.request).then(r => { 
      const c = r.clone(); 
      caches.open(CACHE_VERSION).then(x => x.put(e.request, c)); 
      return r; 
    }).catch(() => caches.match(e.request)));
    return;
  }
  // Cache-first for local app files
  e.respondWith(caches.match(e.request).then(c => c || fetch(e.request).then(r => { 
    if (!r || r.status !== 200) return r; 
    const cl = r.clone(); 
    caches.open(CACHE_VERSION).then(x => x.put(e.request, cl)); 
    return r; 
  })));
});