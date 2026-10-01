const V = 'skat-3.7';
const APP = 'skat-app-' + V, LIB = 'skat-lib', TILES = 'skat-tiles';
const SHELL = ['./', './index.html'];
const LIBS = ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
'https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js',
'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'];
const TILE_HOSTS = ['maps.yandex.net', 'opentopomap.org', 'arcgisonline.com', 'tile.openstreetmap.org', 'elevation-tiles-prod'];
const MAX_TILES = 80000;
self.addEventListener('install', e => {
e.waitUntil((async () => {
const a = await caches.open(APP); await Promise.all(SHELL.map(u => a.add(u).catch(() => {})));
const l = await caches.open(LIB); await Promise.all(LIBS.map(u => l.match(u).then(m => m || l.add(u)).catch(() => {})));
self.skipWaiting();
})());
});
self.addEventListener('activate', e => {
e.waitUntil((async () => {
const old = (await caches.keys()).filter(k => k.startsWith('skat-app-') && k !== APP);
if (old.length){ const n = await caches.open(APP); if (!(await n.match('./index.html'))) for (const k of old){ const m = await (await caches.open(k)).match('./index.html'); if (m){ await n.put('./index.html', m); break; } } }
for (const k of old) await caches.delete(k);
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
if (hit && !(req.mode === 'cors' && hit.type === 'opaque')) return hit;
try {
const res = await fetch(req);
if (res && (res.ok || res.type === 'opaque')){ c.put(req, res.clone()).catch(() => {}); if (name === TILES && ++puts % 500 === 0) trim(); }
return res;
} catch(err){ return hit || Response.error(); }
}
async function appFirst(req, e){
const c = await caches.open(APP);
const hit = (await c.match('./index.html')) || (await c.match('./'));
const upd = fetch(req, {cache:'no-cache'}).then(res => { if (res && res.ok) return c.put('./index.html', res.clone()).then(() => res); return res; });
if (hit){ e.waitUntil(upd.catch(() => {})); return hit; }
try { return await upd; } catch(err){ return Response.error(); }
}
self.addEventListener('fetch', e => {
const req = e.request;
if (req.method !== 'GET') return;
const u = new URL(req.url);
if (req.mode === 'navigate') { e.respondWith(appFirst(req, e)); return; }
if (TILE_HOSTS.some(h => u.hostname.includes(h) || u.pathname.includes(h))) { e.respondWith(cacheFirst(req, TILES)); return; }
if (u.hostname === 'cdnjs.cloudflare.com' || u.hostname === 'cdn.jsdelivr.net' || u.hostname.includes('fonts.g')) { e.respondWith(cacheFirst(req, LIB)); return; }
});
