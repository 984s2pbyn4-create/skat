const V = 'skat-2.1';
const APP = 'skat-app-' + V, LIB = 'skat-lib', TILES = 'skat-tiles';
const SHELL = ['./', './index.html'];
const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
const TILE_HOSTS = ['maps.yandex.net', 'opentopomap.org', 'arcgisonline.com', 'tile.openstreetmap.org', 'elevation-tiles-prod'];
const MAX_TILES = 20000;
self.addEventListener('install', e => {
e.waitUntil((async () => {
const a = await caches.open(APP); await Promise.all(SHELL.map(u => a.add(u).catch(() => {})));
const l = await caches.open(LIB); await Promise.all(LIBS.map(u => l.match(u).then(m => m || l.add(u)).catch(() => {})));
self.skipWaiting();
})());
});
self.addEventListener('activate', e => {
e.waitUntil((async () => {
for (const k of await caches.keys()) if (k.startsWith('skat-app-') && k !== APP) await caches.delete(k);
await self.clients.claim();
})());
});
let puts = 0;
async function trim(){
const c = await caches.open(TILES), keys = await c.keys();
if (keys.length > MAX_TILES) for (const k of keys.slice(0, keys.length - MAX_TILES + 1000)) await c.delete(k);
}
async function cacheFirst(req, name){
const c = await caches.open(name), hit = await c.match(req);
if (hit) return hit;
try {
const res = await fetch(req);
if (res && (res.ok || res.type === 'opaque')){ c.put(req, res.clone()).catch(() => {}); if (name === TILES && ++puts % 500 === 0) trim(); }
return res;
} catch(err){ return hit || Response.error(); }
}
async function networkFirst(req){
const c = await caches.open(APP);
try {
const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(0), 4000))]);
if (res && res.ok) c.put('./index.html', res.clone()).catch(() => {});
return res;
} catch(err){ return (await c.match('./index.html')) || (await c.match('./')) || Response.error(); }
}
self.addEventListener('fetch', e => {
const req = e.request;
if (req.method !== 'GET') return;
const u = new URL(req.url);
if (req.mode === 'navigate') { e.respondWith(networkFirst(req)); return; }
if (TILE_HOSTS.some(h => u.hostname.includes(h) || u.pathname.includes(h))) { e.respondWith(cacheFirst(req, TILES)); return; }
if (u.hostname === 'cdnjs.cloudflare.com' || u.hostname.includes('fonts.g')) { e.respondWith(cacheFirst(req, LIB)); return; }
});
