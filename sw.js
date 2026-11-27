const CACHE = 'canhdong-ea1cfdfa3a60';
const CORE = ['./game.html', './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('canhdong-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const NPC_LLM = 'https://ai-gateway.kilo.ai/api/v1/chat/completions';

self.addEventListener('fetch', event => {
  // NPC cognition relay: page -> same-origin SW -> Kilo (SW không bị CORS page).
  const relay = new URL(event.request.url);
  if (relay.pathname === './npc-llm' || relay.pathname === '/npc-llm' || relay.pathname.endsWith('/npc-llm')) {
    event.respondWith(
      fetch(NPC_LLM, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: event.request.clone().text(),
        cache: 'no-store'
      }).then(r => new Response(r.body, {
        status: r.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      })).catch(e => new Response(JSON.stringify({ error: String(e && e.message || e) }), {
        status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }))
    );
    return;
  }
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('./game.html')));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
