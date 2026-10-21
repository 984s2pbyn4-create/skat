// СКАТ — модуль «Макет» (3D, объекты, анимация по маршруту, модели Three.js). Грузится лениво из index.html (modLoad). Версия 6.62
// ======== 3D-ПРОСМОТР ========
const ML = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/';
let MLp = null, v3 = null, v3proto = false;
const ML5 = 'https://cdn.jsdelivr.net/npm/maplibre-gl@5.19.0/dist/';
function loadML(){ if (MLp) return MLp;
const one = base => new Promise((res, rej) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'maplibre-gl.css'; document.head.appendChild(l);
const sc = document.createElement('script'); sc.src = base + 'maplibre-gl.js'; sc.onload = () => window.maplibregl ? res(window.maplibregl) : rej(new Error('ml')); sc.onerror = () => { sc.remove(); l.remove(); rej(new Error('ml')); }; document.head.appendChild(sc); });
MLp = (lsGet('skat_ml4', 0) ? one(ML) : one(ML5).catch(() => one(ML))).then(m => { window.MLV = +String(m.version || m.getVersion && m.getVersion() || '4').split('.')[0]; return m; });
MLp.catch(() => { MLp = null; }); return MLp; }
function v3bases(){ const o = {esri:'Спутник Esri', topo:'Топокарта', osm:'OpenStreetMap'}; mbMaps.filter(m => m.crs !== '3395').forEach(m => { o['mb_' + m.id] = 'Файл: ' + m.name; }); return o; }
function keyUrl(layer, z, x, y){ if (layer === 'dem') return `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
return LAYERS[layer].urls[0].replace('{s}', 'abc'[(x+y)%3]).replace('{x}', x).replace('{y}', y).replace('{z}', z); }
async function tileBytes(u){
if (savedKeys.has(u)){ const b = await tileGetFast(u); if (b) return await b.arrayBuffer(); }
if (u.startsWith('mb:') || navigator.onLine === false) throw new Error('нет тайла');
try { const b = await netBlob(u); if (savedKeys.size < 150000) queuePut(u, b); return await b.arrayBuffer(); }
catch(e){ const r = await fetch(u); if (!r.ok) throw new Error(String(r.status)); return await r.arrayBuffer(); }
}
function v3data(){
const F = [];
state.arrays.forEach(a => { if (a.hidden) return;
if (a.shapes && a.shapes.length){ (a.shapes || []).forEach(sh => { const col = sh.color || a.style.color, op = (sh.op ?? 35) / 100, pts = sh.pts.map(p => [p[1] ?? p.lng, p[0] ?? p.lat]);
if (sh.type === 'line') F.push({type:'Feature', properties:{color:col}, geometry:{type:'LineString', coordinates:pts}});
else { const ring = sh.type === 'circle' ? circlePoly(LL(sh.pts[0]), sh.r) : pts.concat([pts[0]]); F.push({type:'Feature', properties:{color:col, op}, geometry:{type:'Polygon', coordinates:[ring]}}); } }); if (a.kind === 'shapes') return; }
if (a.kind === 'route' && a.points.length > 1) F.push({type:'Feature', properties:{color:a.style.color}, geometry:{type:'LineString', coordinates:a.points.map(p => [p.lng, p.lat])}});

});
return {type:'FeatureCollection', features:F};
}
function v3baseSrc(k){ return {type:'raster', tiles:[`skat://${k}/{z}/{x}/{y}`], tileSize:256, maxzoom:Math.min(k === 'esri' ? 17 : 18, (LAYERS[k] && LAYERS[k].max) || 18), minzoom:(LAYERS[k] && LAYERS[k].min) || 0}; }
async function open3D(){
if (session) return;
if (tool.on) closeTools();
const el = $('v3d'); el.classList.add('on'); $('v3msg').textContent = 'Загружаю 3D‑модуль…';
let ml;
try { ml = await loadML(); } catch(e){ el.classList.remove('on'); toast('3D‑модуль не загрузился — откройте один раз с интернетом'); return; }
if (!v3proto){ ml.addProtocol('skat', async (params, ac) => { const sig = ac && ac.signal; const m = params.url.match(/^skat:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)/); const z = +m[2], x = +m[3], y = +m[4]; if (m[1] === 'mat') return {data: await matTile(z, x, y)}; if (m[1] !== 'dem'){ const b = LAYERS[m[1]] ? await tileFb(LAYERS[m[1]].urls[0], z, x, y, false, sig) : null; if (!b) throw new Error('нет тайла'); return {data: await b.arrayBuffer()}; } let buf; if (DEMP === 'mt'){ buf = await tileBytes(mtUrl(z, x, y)); return {data: await cleanDem(buf)}; } try { buf = await tileBytes(keyUrl('dem', z, x, y)); } catch(e){ const b = await parentTile(keyUrl('dem', '{z}', '{x}', '{y}'), z, x, y, true); if (!b) throw e; buf = await b.arrayBuffer(); } return {data: await cleanDem(buf)}; }); v3proto = true; }
const B = v3bases(), cur = B[state.layer] ? state.layer : state.layer === 'ya_map' ? 'topo' : 'esri';
$('v3base').innerHTML = Object.entries(B).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
const ex = +$('v3ex').value, c = map.getCenter();
v3center = c;
if (v3){ try { v3.remove(); } catch(e){} v3 = null; }
try {
v3 = new ml.Map({container:'v3map', fadeDuration:0, preserveDrawingBuffer:true, canvasContextAttributes:{preserveDrawingBuffer:true, antialias:mkQ() >= 2}, anisotropicFilterPitch:20, pixelRatio:mkDpr(), center:[c.lng, c.lat], zoom:Math.max(1, map.getZoom() - 1), pitch:60, maxPitch:85, attributionControl:false,
style:{version:8, sources:{base:v3baseSrc(cur),
dem:demSrcDef(),
dem2:demSrcDef(),
obj:{type:'geojson', data:buildObjs([].concat(...objCells.values()), v3cfg.den)}, plc:{type:'geojson', data:v3places(c)}, aux3:{type:'geojson', data:v3aux()}, tac:{type:'geojson', data:v3tac(c)}, mdl:{type:'geojson', data:v3mdl(c)},
pts:{type:'geojson', data:v3data()}},
layers:[{id:'bkg', type:'background', paint:{'background-color':'#5d6650'}}, {id:'base', type:'raster', source:'base', paint:{'raster-fade-duration':0}},
{id:'hs', type:'hillshade', source:'dem2', paint:{'hillshade-exaggeration':0.35}},
{id:'fill', type:'fill', source:'pts', filter:['==', '$type', 'Polygon'], paint:{'fill-color':['get', 'color'], 'fill-opacity':['get', 'op']}},
{id:'outl', type:'line', source:'pts', filter:['==', '$type', 'Polygon'], paint:{'line-color':['get', 'color'], 'line-width':2}},
{id:'line', type:'line', source:'pts', filter:['==', '$type', 'LineString'], paint:{'line-color':['get', 'color'], 'line-width':3}},
{id:'trees', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'tr'], layout:{visibility:v3cfg.forest ? 'visible' : 'none'}, paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'bw', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'bw'], layout:{visibility:v3cfg.bld ? 'visible' : 'none'}, paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'bwi', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'bwi'], layout:{visibility:v3cfg.bld ? 'visible' : 'none'}, paint:{'fill-extrusion-pattern':'tex-win', 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'bg', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'bg'], layout:{visibility:v3cfg.brg ? 'visible' : 'none'}, paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'br', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'br'], layout:{visibility:v3cfg.bld ? 'visible' : 'none'}, paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'mt', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'mt'], layout:{visibility:v3cfg.bld ? 'visible' : 'none'}, paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'tl', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'tl'], layout:{visibility:v3cfg.towers ? 'visible' : 'none'}, paint:{'fill-extrusion-pattern':'tex-lattice', 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'ts', type:'fill-extrusion', source:'obj', minzoom:12, filter:['==', ['get', 'k'], 'ts'], layout:{visibility:v3cfg.towers ? 'visible' : 'none'}, paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'mdl', type:'fill-extrusion', source:'mdl', paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h']}},
{id:'aux3', type:'symbol', source:'aux3', layout:Object.assign({visibility:v3cfg.aux ? 'visible' : 'none'}, V3SYM)},
{id:'plc', type:'symbol', source:'plc', layout:Object.assign({visibility:v3cfg.places ? 'visible' : 'none', 'symbol-sort-key':['get', 'rk']}, V3SYM)},
{id:'tac', type:'symbol', source:'tac', layout:Object.assign({visibility:v3cfg.tac ? 'visible' : 'none'}, V3SYM)}],
terrain:{source:'dem', exaggeration:ex}}});
v3.addControl(new ml.NavigationControl({visualizePitch:true}), 'bottom-right');
v3.on('styleimagemissing', e => { try { if (!v3.hasImage(e.id)){ const im = v3img(e.id); if (im) v3.addImage(e.id, im, {pixelRatio:2}); } } catch(_){} });
['fill', 'outl', 'line'].forEach(id => { try { v3.setLayoutProperty(id, 'visibility', v3cfg.shapes ? 'visible' : 'none'); } catch(_){} });
v3.on('load', ensureObjs); v3.on('load', envInit); v3.on('moveend', ensureObjs); v3.on('click', v3tap);
v3.on('load', () => { $('v3msg').textContent = (DEMP === 'mt' ? 'Высоты: Mapterhorn (Copernicus GLO-30). ' : '') + 'Наклон — двумя пальцами вверх/вниз, поворот — двумя пальцами по кругу. Компас справа — север вверх.'; });
v3.on('error', () => {});
} catch(e){ el.classList.remove('on'); toast('Устройство не поддерживает 3D (WebGL)'); }
}
// ---- 3D: подписи и знаки как картинки (работают без интернета)
const v3cfg = Object.assign({places:true, aux:true, shapes:true, tac:false, tacLbl:false, bld:false, towers:false, forest:false, brg:true, den:0.6, mdl:true, ms:4, alt:60, paths:true, traj:true}, lsGet('skat_v3', {}));
let v3center = null;
const V3SYM = {'icon-image':['get', 'img'], 'icon-anchor':'bottom', 'icon-pitch-alignment':'viewport', 'icon-rotation-alignment':'viewport', 'icon-allow-overlap':false, 'icon-padding':1};
const clean = t => String(t || '').replace(/\|/g, '/');
function v3places(c){
const out = [], seen = new Set();
pdb.forEach(r => regItems(r).forEach(p => { if (Math.abs(p.lat - c.lat) > 0.6 || Math.abs(p.lng - c.lng) > 0.9) return; const k = p.name + Math.round(p.lat * 500); if (seen.has(k)) return; seen.add(k); out.push(p); }));
out.sort((a, b) => (PLC_RANK[a.type] ?? 3) - (PLC_RANK[b.type] ?? 3));
return {type:'FeatureCollection', features:out.slice(0, 900).map(p => { const rk = PLC_RANK[p.type] ?? 3; return {type:'Feature', properties:{img:`pl|${clean(p.name)}|${rk}`, rk}, geometry:{type:'Point', coordinates:[p.lng, p.lat]}}; })};
}
function v3aux(){ const F = []; state.arrays.forEach(a => { if (a.kind !== 'aux' || a.hidden) return; a.points.forEach(p => F.push({type:'Feature', properties:{img:`ax|${clean(p.name)}|${a.style.color}`}, geometry:{type:'Point', coordinates:[p.lng, p.lat]}})); }); return {type:'FeatureCollection', features:F}; }
function v3tac(c){
const F = [];
state.arrays.forEach(a => { if (a.hidden || a.kind === 'aux' || a.kind === 'shapes') return;
a.points.forEach((p, i) => { if (p.hid || !tagOk(a, p)) return; const sid = p.sym || a.sym, col = sid ? symCol(sid, sideOf(a, p), styleOf(a, p).color) : styleOf(a, p).color, fcol = p.fc || a.fc || '', lb = v3cfg.tacLbl ? clean(labelOf(a, i)) : '';
if (v3cfg.mdl && sid && MDL_OF[sid]) return; F.push({d:Math.abs(p.lat - c.lat) + Math.abs(p.lng - c.lng), f:{type:'Feature', properties:{ai:state.arrays.indexOf(a), pi:i, img:sid && SYM_BY[sid] ? `ts|${sid}|${col}|${lb}|${fcol}` : `td|${col}|${lb}`}, geometry:{type:'Point', coordinates:[p.lng, p.lat]}}}); }); });
F.sort((x, y) => x.d - y.d);
return {type:'FeatureCollection', features:F.slice(0, 500).map(x => x.f)};
}
// ---- 3D: модели тактических знаков (составлены из объёмных блоков)
const M3 = {dk:'#262826', tr:'#1d1f1d', earth:'#6e5b3c', ditch:'#2f2a22', log:'#7a6440', cnv:'#5f6b45', skin:'#c9a27e'};
function mmix(a, b, t){ const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); if (!/^#[0-9a-f]{6}$/i.test(a)) return b; const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v * (1 - t) + B[i] * t).toString(16).padStart(2, '0')).join(''); }
// части: [тип, x, y, a, b, низ, верх, цвет]; box: центр x,y, длина a (вдоль), ширина b; cyl: центр, радиус a, грани b; нос модели — на запад (-x)
const MB = (x, y, a, b, z0, z1, c) => ['b', x, y, a, b, z0, z1, c], MC = (x, y, r, n, z0, z1, c) => ['c', x, y, r, n, z0, z1, c];
const tracks = (L, W) => [MB(0, W / 2 - .35, L, .7, 0, 1, 'tr'), MB(0, -W / 2 + .35, L, .7, 0, 1, 'tr')];
const wheels = (xs, W, r) => xs.flatMap(x => [MC(x, W / 2, r, 8, 0, r * 2, 'tr'), MC(x, -W / 2, r, 8, 0, r * 2, 'tr')]);
const man = x => [MB(x, 0, .3, .35, 0, .9, 'dk'), MB(x, 0, .3, .5, .9, 1.5, 'body'), MC(x, 0, .14, 6, 1.5, 1.8, 'skin')];
const MDLS = {
tank:[...tracks(7, 3.4), MB(0, 0, 6.8, 2.6, .5, 1.7, 'body'), MC(.6, 0, 1.45, 8, 1.7, 2.45, 'body2'), MB(-3.2, 0, 4.8, .26, 2, 2.26, 'dk')],
bmp:[...tracks(6.7, 3.1), MB(.3, 0, 6.1, 2.4, .5, 1.95, 'body'), MB(-3.1, 0, .9, 2.4, .5, 1.45, 'body'), MC(0, 0, .85, 6, 1.95, 2.45, 'body2'), MB(-1.8, 0, 2.6, .16, 2.15, 2.31, 'dk')],
btr:[...wheels([-2.6, -.9, .9, 2.6], 2.6, .6), MB(0, 0, 7.4, 2.8, .7, 2.1, 'body'), MB(-3.6, 0, .6, 2.4, .7, 1.7, 'body'), MC(-.6, 0, .7, 6, 2.1, 2.6, 'body2'), MB(-1.9, 0, 2, .14, 2.3, 2.44, 'dk')],
truck:[...wheels([-2.4, .8, 2.2], 2.3, .55), MB(-2.4, 0, 1.8, 2.4, .8, 2.9, 'body'), MB(-3.35, 0, .3, 2.2, .8, 1.6, 'body'), MB(1, 0, 4.4, 2.5, 1.1, 2.8, 'cnv')],
gun:[MB(1.8, .7, 3.6, .25, .2, .5, 'dk'), MB(1.8, -.7, 3.6, .25, .2, .5, 'dk'), MC(0, 1.2, .6, 8, 0, 1.2, 'tr'), MC(0, -1.2, .6, 8, 0, 1.2, 'tr'), MB(0, 0, .25, 2.4, .5, 1.9, 'body'), MB(-.2, 0, 1.6, .7, .9, 1.5, 'body2'), MB(-3, 0, 5.4, .24, 1.15, 1.39, 'dk')],
sau:[...tracks(7.2, 3.3), MB(0, 0, 7, 2.6, .5, 1.7, 'body'), MB(1, 0, 3.8, 3, 1.7, 2.95, 'body2'), MB(-3.6, 0, 6.2, .3, 2.2, 2.5, 'dk')],
rszo:[...wheels([-2.6, .4, 1.9, 3.4], 2.4, .6), MB(-2.7, 0, 1.9, 2.5, .8, 3, 'body'), MB(1.4, 0, 4.6, 2.5, 1.1, 1.6, 'dk'), MB(1.5, 0, 4.2, 2.3, 1.9, 3.3, 'body2'), MB(-.65, 0, .1, 2.1, 2, 3.2, 'dk')],
mortar:[MC(0, 0, .55, 8, 0, .12, 'dk'), MB(-.35, 0, .3, .3, 0, 1.45, 'dk'), MB(-.7, .35, .12, .12, 0, .9, 'dk'), MB(-.7, -.35, .12, .12, 0, .9, 'dk'), ...man(1.2)],
dugout:[MB(0, 0, 7, 4.6, 0, .9, 'earth'), MB(0, 0, 5.4, 3.4, .9, 1.25, 'log'), MB(4.1, 0, 2.2, 1.1, 0, .06, 'ditch')],
uavpu:[MB(0, 0, 7, 4.6, 0, .9, 'earth'), MB(0, 0, 5.4, 3.4, .9, 1.25, 'log'), MB(4.1, 0, 2.2, 1.1, 0, .06, 'ditch'), MC(0, 0, .12, 6, 1.25, 6.2, 'dk'), MB(-.9, 0, 2.4, .12, 5.9, 6.05, 'dk'), MB(-1.9, 0, .1, 1.2, 5.5, 6.45, 'dk'), MB(-1.2, 0, .1, .9, 5.6, 6.35, 'dk'), MB(-.5, 0, .1, .7, 5.65, 6.3, 'dk'), MB(.15, 0, .1, .5, 5.7, 6.25, 'dk')],
inf:[...man(-1.6).map(p => (p[2] += .9, p)), ...man(0), ...man(1.6).map(p => (p[2] -= .9, p)), ...man(.8).map(p => (p[2] -= 2, p))],
flagR:[MC(0, 0, .13, 6, 0, 8, 'dk'), MB(-1.65, 0, 3.2, .1, 5.6, 7.9, 'side')],
flagT:[MC(0, 0, .13, 6, 0, 8, 'dk'), MB(-.55, 0, 1.1, .1, 5.4, 7.9, 'side'), MB(-1.55, 0, .9, .1, 5.95, 7.35, 'side'), MB(-2.4, 0, .8, .1, 6.4, 6.9, 'side')],
flagT2:[MC(0, 0, .13, 6, 0, 8.5, 'dk'), MB(0, 0, .9, .1, 7.6, 7.8, 'dk'), MB(0, 0, .9, .1, 8.05, 8.25, 'dk'), MB(-.55, 0, 1.1, .1, 5.2, 7.4, 'side'), MB(-1.55, 0, .9, .1, 5.65, 6.95, 'side'), MB(-2.4, 0, .8, .1, 6.05, 6.55, 'side')],
uavp:[MB(0, 0, 3.2, .42, 0, .4, 'body'), MB(.1, 0, .75, 4.6, .1, .26, 'body2'), MB(1.4, 0, .4, 1.6, .1, .22, 'body2'), MB(1.5, 0, .45, .09, .3, .95, 'body2'), MC(1.65, 0, .18, 6, .12, .3, 'dk')],
ferry:[MB(0, 1.5, 10, 1.3, 0, .8, 'dk'), MB(0, -1.5, 10, 1.3, 0, .8, 'dk'), MB(0, 0, 9, 4.4, .8, 1, 'body'), MB(-5.3, 0, 1.6, 3.4, .7, .9, 'body2'), MB(5.3, 0, 1.6, 3.4, .7, .9, 'body2'), MB(2.6, 1.6, 1.6, 1, 1, 2.4, 'body2'), MB(-1, 0, 4.2, 2.2, 1, 2, 'cnv')],
uavk:[MB(0, 0, .6, .6, 0, .3, 'body'), ['r', 0, 0, 2.2, .12, .05, .2, 'dk', Math.PI / 4], ['r', 0, 0, 2.2, .12, .05, .2, 'dk', -Math.PI / 4], ...[[.78, .78], [.78, -.78], [-.78, .78], [-.78, -.78]].map(([x, y]) => MC(x, y, .42, 8, .22, .27, 'body2'))]};
const MDL_AIR = {uavp:1, uavk:1};
function mdlPoly(cx, cy, kx, ky, ang, pts){ const ca = Math.cos(ang), sa = Math.sin(ang); const r = pts.map(([x, y]) => [cx + (x * ca - y * sa) / kx, cy + (x * sa + y * ca) / ky]); r.push(r[0]); return r; }
function mdlParts(F, lng, lat, key, col, S, ang, lift, pure){ const [kx, ky] = mk(lat), C = pure ? {body:col, body2:mmix(col, '#000000', .25), side:col} : {body:mmix(col, '#3f4a24', .45), body2:mmix(col, '#2f3a1a', .55), side:col};
(MDLS[key] || []).forEach(p => { const [t, x, y, a, b, z0, z1, c] = p; let loc;
if (t === 'c'){ loc = []; for (let i = 0; i < b; i++){ const q = i / b * 2 * Math.PI; loc.push([x + Math.cos(q) * a, y + Math.sin(q) * a]); } }
else { const ra = t === 'r' ? p[8] : 0, cr = Math.cos(ra), sr = Math.sin(ra); loc = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]].map(([u, v]) => [x + u * cr - v * sr, y + u * sr + v * cr]); }
F.push({type:'Feature', properties:{c:C[c] || M3[c] || c, b:lift + z0 * S, h:lift + z1 * S}, geometry:{type:'Polygon', coordinates:[mdlPoly(lng, lat, kx, ky, ang, loc.map(([u, v]) => [u * S, v * S]))]}}); }); }
function mdlTrench(F, line, S, closed){ // траншея: ров и бруствер вдоль линии
const lat0 = line[0][1], [kx, ky] = mk(lat0), P = line.map(([x, y]) => [x * kx, y * ky]), w = 0.9 * Math.max(1, S / 2), out = [];
const band = (o1, o2, b, h, c) => { for (let i = 1; i < P.length; i++){ const [x1, y1] = P[i-1], [x2, y2] = P[i], L0 = Math.hypot(x2 - x1, y2 - y1); if (!L0) continue; const nx = -(y2 - y1) / L0, ny = (x2 - x1) / L0;
const q = [[x1 + nx * o1, y1 + ny * o1], [x2 + nx * o1, y2 + ny * o1], [x2 + nx * o2, y2 + ny * o2], [x1 + nx * o2, y1 + ny * o2]].map(([x, y]) => [x / kx, y / ky]); q.push(q[0]);
F.push({type:'Feature', properties:{c, b, h}, geometry:{type:'Polygon', coordinates:[q]}}); } };
band(-w, w, 0, .05, M3.ditch); band(w, w * 2.2, 0, .55 * Math.max(1, S / 3), M3.earth); band(-w * 2.2, -w, 0, .35 * Math.max(1, S / 3), M3.earth); }
function v3mdl(c){ const F = []; if (!v3cfg.mdl) return {type:'FeatureCollection', features:F}; const S = v3cfg.ms || 4; let n = 0;
state.arrays.forEach(a => { if (a.hidden || a.kind === 'aux') return;
if (a.shapes && a.shapes.length){ (a.shapes || []).forEach(sh => { const sy = sh.sym && SYM_BY[sh.sym]; if (!sy || !sh.pts || sh.pts.length < 2) return;
if (/trench|rub_obor|a_obor|teeth/.test(sy.style)){ let L = sh.pts.map(p => [p[1] ?? p.lng, p[0] ?? p.lat]); if (sy.type !== 'area') L = wavyLL(L, 2.2 * (S / 4 + .5), 26); if (sy.type === 'area') L.push(L[0]); mdlTrench(F, L, S); } }); if (a.kind === 'shapes') return; }
a.points.forEach((p, pi) => { if (p.hid || !tagOk(a, p)) return; const ov = ANIM.get(a.id + ':' + pi); if (ov) p = Object.assign({}, p, ov); const sid = p.sym || a.sym, key = sid && MDL_OF[sid]; if (!key || n > 400) return; const f0 = F.length, ai = state.arrays.indexOf(a); if (Math.abs(p.lat - c.lat) > 0.3 || Math.abs(p.lng - c.lng) > 0.45) return; n++;
const col = sid === 'lozh' ? SCOL.g : symCol(sid, sideOf(a, p), styleOf(a, p).color), ang = -((p.rot ?? a.rot) ?? (sideOf(a, p) === 'b' ? 180 : 0)) * Math.PI / 180;
if (key === 'op' || key === 'trSeg'){ const [kx, ky] = mk(p.lat), R = key === 'op' ? 9 * S : 4 * S, L = []; const n2 = key === 'op' ? 24 : 6;
for (let i = 0; i <= n2; i++){ const q = key === 'op' ? i / n2 * 2 * Math.PI : Math.PI * (0.65 + i / n2 * 0.7); L.push([p.lng + Math.cos(q + ang) * R / kx, p.lat + Math.sin(q + ang) * R / ky]); }
mdlTrench(F, L, S); if (key === 'op') [[-.4, .3], [.35, -.2], [0, .45]].forEach(([u, v]) => mdlParts(F, p.lng + u * R / kx, p.lat + v * R / ky, 'inf', col, S * .7, 0, 0)); return; }
if (TJ.on && TJK[key]){ if (!MDL_AIR[key]){ const [kx, ky] = mk(p.lat), [Lm, Wm] = TJK[key], s2 = S * (p.msc || 1) / 2; F.push({type:'Feature', properties:{c:'#0d0e0d', b:0, h:.05, ai, pi}, geometry:{type:'Polygon', coordinates:[mdlPoly(p.lng, p.lat, kx, ky, ang, [[-Lm * s2, -Wm * s2], [Lm * s2, -Wm * s2], [Lm * s2, Wm * s2], [-Lm * s2, Wm * s2]])]}}); } return; }
mdlParts(F, p.lng, p.lat, key, col, (MDL_AIR[key] ? Math.max(2, S * .8) : S) * (p.msc || 1), ang, MDL_AIR[key] ? (p.alt ?? (v3cfg.alt || 60)) : 0, true); for (let k = f0; k < F.length; k++){ F[k].properties.ai = ai; F[k].properties.pi = pi; } }); });
return {type:'FeatureCollection', features:F}; }
function txtCanvas(w, h){ const c = document.createElement('canvas'); c.width = Math.ceil(w * 2); c.height = Math.ceil(h * 2); const g = c.getContext('2d'); g.scale(2, 2); return [c, g]; }
function haloText(g, t, x, y, fs, col, bold){ g.font = `${bold ? 700 : 600} ${fs}px "IBM Plex Sans Condensed", sans-serif`; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(t, x, y); g.fillStyle = col; g.fillText(t, x, y); }
function v3img(id){
const [kind, a1, a2, a3, a4] = id.split('|');
const meas = (t, fs) => { const g = document.createElement('canvas').getContext('2d'); g.font = `700 ${fs}px "IBM Plex Sans Condensed", sans-serif`; return g.measureText(t).width; };
let c, g;
if (kind === 'pl'){ const fs = [18, 15.5, 13.5, 12][+a2] || 12, t = +a2 === 0 ? a1.toUpperCase() : a1, w = meas(t, fs) + 10; [c, g] = txtCanvas(w, fs + 10); haloText(g, t, 5, fs + 3, fs, '#fff', true); }
else if (kind === 'ax'){ const fs = 11.5, w = meas(a1, fs) + 30; [c, g] = txtCanvas(w, 26);
g.save(); g.translate(10, 25); g.scale(0.85, 0.85); g.beginPath(); TREE_PTS.forEach(([dx, dy], k) => k ? g.lineTo(dx, dy) : g.moveTo(dx, dy)); g.closePath(); g.fillStyle = a2; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke(); g.restore();
haloText(g, a1, 21, 19, fs, '#fff', false); }
else if (kind === 'ts' || kind === 'td'){ const lb = kind === 'ts' ? a3 : a2, col = kind === 'ts' ? a2 : a1, fs = 12, lw = lb ? meas(lb, fs) + 10 : 0, w = Math.max(44, lw), h = 40 + 16 + (lb ? 17 : 0);
[c, g] = txtCanvas(w, h); const x0 = w / 2, top = lb ? 17 : 0;
if (lb) haloText(g, lb, (w - lw) / 2 + 5, 13, fs, '#fff', true);
g.strokeStyle = 'rgba(30,30,30,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, top + 38); g.lineTo(x0, h); g.stroke();
g.fillStyle = 'rgba(255,255,255,.93)'; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.roundRect ? g.roundRect(x0 - 20, top, 40, 38, 6) : g.rect(x0 - 20, top, 40, 38); g.fill(); g.stroke();
if (kind === 'ts') drawSym(g, a1, x0, top + 19, col, a4 || null); else { g.fillStyle = col; g.beginPath(); g.arc(x0, top + 19, 8, 0, 7); g.fill(); } }
else if (kind === 'tex-win'){ [c, g] = txtCanvas(16, 16); g.fillStyle = '#ddd3bf'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#f2ede2'; g.fillRect(3, 0, 10, 16); g.fillStyle = '#41566a'; g.fillRect(4, 0, 8, 16); g.fillStyle = '#f2ede2'; g.fillRect(7.5, 0, 1, 16); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(4, 0, 3, 16); }
else if (kind === 'boom'){ [c, g] = txtCanvas(64, 64); const gr = g.createRadialGradient(32, 40, 2, 32, 40, 30); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(.35, '#ffd400'); gr.addColorStop(.7, '#ff6a00'); gr.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gr;
g.beginPath(); for (let i = 0; i < 18; i++){ const q = i / 18 * 2 * Math.PI, r = i % 2 ? 14 : 30; g.lineTo(32 + Math.cos(q) * r, 40 + Math.sin(q) * r * .9 - (Math.sin(q) < 0 ? 6 : 0)); } g.closePath(); g.fill(); }
else if (kind === 'smoke'){ [c, g] = txtCanvas(64, 64); [[32, 40, 18], [22, 30, 13], [42, 30, 13], [32, 20, 12]].forEach(([x, y, r]) => { const gr = g.createRadialGradient(x, y, 1, x, y, r); gr.addColorStop(0, 'rgba(110,105,98,.85)'); gr.addColorStop(1, 'rgba(110,105,98,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); }
else if (kind === 'tex-wall'){ [c, g] = txtCanvas(32, 32); g.fillStyle = '#e2d9c6'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#cfc4ad'; g.fillRect(0, 30, 32, 2);
[[5, 8], [19, 8]].forEach(([x, y]) => { g.fillStyle = '#f4efe4'; g.fillRect(x - 1, y - 1, 10, 13); g.fillStyle = '#4f6273'; g.fillRect(x, y, 8, 11); g.fillStyle = '#f4efe4'; g.fillRect(x + 3.5, y, 1, 11); g.fillRect(x, y + 4, 8, 1); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, y, 3, 4); }); }
else if (kind === 'tex-lattice'){ [c, g] = txtCanvas(16, 16); g.fillStyle = '#c4c8cc'; g.fillRect(0, 0, 16, 16); g.strokeStyle = '#626870'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 16); g.moveTo(16, 0); g.lineTo(0, 16); g.moveTo(0, .7); g.lineTo(16, .7); g.moveTo(.7, 0); g.lineTo(.7, 16); g.stroke(); }
else return null;
return g.getImageData(0, 0, c.width, c.height);
}
async function cleanDem(buf){
try {
const bmp = await createImageBitmap(new Blob([buf])), W = bmp.width, H = bmp.height;
const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), {width:W, height:H});
const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0); const im = g.getImageData(0, 0, W, H), d = im.data, n = W * H, h = new Float32Array(n);
for (let i = 0; i < n; i++){ const o = i * 4; h[i] = d[o] * 256 + d[o+1] + d[o+2] / 256 - 32768; }
const srt = Float32Array.from(h).sort(), p2 = srt[Math.floor(n * .02)], p98 = srt[Math.floor(n * .98)], med = srt[n >> 1], lo = p2 - 60, hi = p98 + 60;
const bad = new Uint8Array(n); let nb = 0; for (let i = 0; i < n; i++) if (h[i] < lo || h[i] > hi || h[i] < -300 || h[i] > 5000){ bad[i] = 1; nb++; }
if (!nb) return buf;
for (let pass = 0; pass < 6 && nb; pass++){ const fix = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){ const i = y * W + x; if (!bad[i]) continue; let s = 0, k = 0;
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){ const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (!bad[j]){ s += h[j]; k++; } }
if (k) fix.push([i, s / k]); }
fix.forEach(([i, v]) => { h[i] = v; bad[i] = 0; nb--; }); }
for (let i = 0; i < n; i++){ if (bad[i]) h[i] = med; const v = Math.max(0, h[i] + 32768), o = i * 4; d[o] = Math.floor(v / 256); d[o+1] = Math.floor(v) % 256; d[o+2] = Math.floor((v - Math.floor(v)) * 256); d[o+3] = 255; }
g.putImageData(im, 0, 0);
const blob = cv.convertToBlob ? await cv.convertToBlob({type:'image/png'}) : await new Promise(r => cv.toBlob(r, 'image/png'));
return await blob.arrayBuffer();
} catch(e){ return buf; }
}
function v3apply(){
if (!v3) return; lsSet('skat_v3', v3cfg);
const vis = (id, on) => { try { v3.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none'); } catch(_){} };
vis('plc', v3cfg.places); vis('apath', v3cfg.paths !== false); vis('bg', v3cfg.brg); ['bw', 'bwi', 'br', 'mt'].forEach(id => vis(id, v3cfg.bld)); ['tl', 'ts'].forEach(id => vis(id, v3cfg.towers)); vis('trees', v3cfg.forest); ensureObjs(); vis('aux3', v3cfg.aux); vis('tac', v3cfg.tac); ['fill', 'outl', 'line'].forEach(id => vis(id, v3cfg.shapes));
try { if (v3cfg.tac) v3.getSource('tac').setData(v3tac(v3.getCenter())); } catch(_){}
try { v3.getSource('mdl').setData(v3mdl(v3.getCenter())); } catch(_){}
}
$('v3lay').onclick = () => { $('v3panel').classList.toggle('on'); $('v3den').value = v3cfg.den; $('v3mden').value = v3cfg.mden ?? .3; $('v3mdenv').textContent = '×' + (v3cfg.mden ?? .3); $('v3denv').textContent = '×' + v3cfg.den; $('v3ms').value = v3cfg.ms; $('v3msv').textContent = '×' + v3cfg.ms; $('v3alt').value = v3cfg.alt; $('v3altv').textContent = v3cfg.alt; $('v3panel').querySelectorAll('input[data-k]').forEach(i => { i.checked = !!v3cfg[i.dataset.k]; }); };
$('v3mden').oninput = e => { $('v3mdenv').textContent = '×' + e.target.value; };
$('v3mden').onchange = e => { v3cfg.mden = +e.target.value; lsSet('skat_v3', v3cfg); envRefresh(); };
$('v3den').oninput = e => { $('v3denv').textContent = '×' + e.target.value; };
$('v3ms').oninput = e => { $('v3msv').textContent = '×' + e.target.value; }; $('v3ms').onchange = e => { v3cfg.ms = +e.target.value; v3apply(); };
$('v3alt').oninput = e => { $('v3altv').textContent = e.target.value; }; $('v3alt').onchange = e => { v3cfg.alt = +e.target.value; v3apply(); };
$('v3den').onchange = e => { v3cfg.den = +e.target.value; lsSet('skat_v3', v3cfg); refreshObjs(); };
$('v3panel').querySelectorAll('input[data-k]').forEach(i => i.onchange = () => { v3cfg[i.dataset.k] = i.checked; if (i.dataset.k === 'tacLbl' && i.checked) v3cfg.tac = true; $('v3panel').querySelectorAll('input[data-k]').forEach(q => { q.checked = !!v3cfg[q.dataset.k]; }); v3apply(); });
// ---- 3D: здания, вышки, леса из OpenStreetMap
async function opQuery(q, to){ let last;
for (const url of OVERPASS){ const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), (to + 20) * 1000);
try { const r = await fetch(url, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:'data=' + encodeURIComponent(q), signal:ctl.signal}); if (!r.ok) throw new Error(r.status); const j = await r.json(); clearTimeout(tm); return j; }
catch(e){ clearTimeout(tm); last = e; } }
throw last; }
function sqPoly(lat, lng, half, k, h){ const dla = half / 111320, dlo = half / (111320 * Math.cos(lat * Math.PI / 180));
return {type:'Feature', properties:{k, h}, geometry:{type:'Polygon', coordinates:[[[lng - dlo, lat - dla], [lng + dlo, lat - dla], [lng + dlo, lat + dla], [lng - dlo, lat + dla], [lng - dlo, lat - dla]]]}}; }
function treeRow(line){ const F = [];
for (let i = 1; i < line.length; i++){ const [x1, y1] = line[i-1], [x2, y2] = line[i], kx = 111320 * Math.cos(y1 * Math.PI / 180), ky = 111320;
const dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L0 = Math.hypot(dx, dy); if (!L0) continue;
const nx = -dy / L0 * 5 / kx, ny = dx / L0 * 5 / ky;
F.push({type:'Feature', properties:{k:'r', h:12}, geometry:{type:'Polygon', coordinates:[[[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny]]]}}); }
return F; }
// ---- 3D: здания, цистерны, вышки, деревья (генерация из сохранённых данных OSM)
const ROOFS = ['#7d3528', '#5f6366', '#6b4b39', '#8a8f90', '#6e2f27'];
const hsh = (a, b) => { let x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
function ngon(c, r, n, rot){ const [kx, ky] = mk(c[1]), out = []; rot = rot || 0;
for (let i = 0; i <= n; i++){ const a = rot + i / n * 2 * Math.PI; out.push([c[0] + Math.cos(a) * r / kx, c[1] + Math.sin(a) * r / ky]); } return out; }
const sq = (c, half) => ngon(c, half * Math.SQRT2, 4, Math.PI / 4);
function rectR(c, hx, hy){ const [kx, ky] = mk(c[1]), dx = hx / kx, dy = hy / ky; return [[c[0]-dx, c[1]-dy], [c[0]+dx, c[1]-dy], [c[0]+dx, c[1]+dy], [c[0]-dx, c[1]+dy], [c[0]-dx, c[1]-dy]]; }
function cen(ring){ let x = 0, y = 0; const n = ring.length - 1; for (let i = 0; i < n; i++){ x += ring[i][0]; y += ring[i][1]; } return [x / n, y / n]; }
function scaleRing(ring, s){ const c = cen(ring); return ring.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s]); }
function areaM(ring){ const [kx, ky] = mk(ring[0][1]); let s = 0; for (let i = 1; i < ring.length; i++){ s += (ring[i-1][0] * kx) * (ring[i][1] * ky) - (ring[i][0] * kx) * (ring[i-1][1] * ky); } return Math.abs(s) / 2; }
function joinRings(segs){
const out = [], eq = (a, b) => a[0] === b[0] && a[1] === b[1];
segs = segs.filter(x => x.length > 1);
while (segs.length){ let cur = segs.shift().slice(), grew = true;
while (!eq(cur[0], cur[cur.length-1]) && grew){ grew = false;
for (let i = 0; i < segs.length; i++){ const sg = segs[i], e = cur[cur.length-1];
if (eq(sg[0], e)){ cur = cur.concat(sg.slice(1)); } else if (eq(sg[sg.length-1], e)){ cur = cur.concat(sg.slice(0, -1).reverse()); } else continue;
segs.splice(i, 1); grew = true; break; } }
if (cur.length >= 4){ if (!eq(cur[0], cur[cur.length-1])) cur.push(cur[0]); out.push(cur); } }
return out;
}
function perM(ring){ const [kx, ky] = mk(ring[0][1]); let p = 0; for (let i = 1; i < ring.length; i++) p += Math.hypot((ring[i][0] - ring[i-1][0]) * kx, (ring[i][1] - ring[i-1][1]) * ky); return p; }
function osmRaw(j){
const R = [], TW = /^(tower|mast|water_tower|chimney)$/, TK = /^(storage_tank|silo)$/;
for (const el of (j.elements || [])){
const t = el.tags || {}, mm = t.man_made || '', hT = parseFloat(String(t.height || '').replace(',', '.'));
if (el.type === 'relation'){ if ((t.landuse === 'forest' || t.natural === 'wood') && el.members){ const lf = t.leaf_type === 'needleleaved' ? 'n' : t.leaf_type === 'broadleaved' ? 'b' : 'm';
joinRings(el.members.filter(m => m.type === 'way' && m.role !== 'inner' && m.geometry).map(m => m.geometry.map(q => [+q.lon.toFixed(6), +q.lat.toFixed(6)]))).forEach(ring => R.push({t:'f', ring, lf})); } continue; }
const pt = c => { if (t.power === 'tower') R.push({t:'pw', c, h:hT || 28}); else if (TK.test(mm)) R.push({t:'tank', c, r:(parseFloat(t.diameter) || (mm === 'silo' ? 6 : 10)) / 2, h:hT || (mm === 'silo' ? 18 : 9)});
else if (mm === 'water_tower') R.push({t:'wt', c, h:hT || 24}); else if (mm === 'chimney') R.push({t:'ch', c, h:hT || 30}); else if (mm) R.push({t:'mast', c, h:hT || (mm === 'mast' ? 45 : 35)}); };
if (el.type === 'node'){ if (t.ford && t.ford !== 'no'){ R.push({t:'fordp', c:[+el.lon.toFixed(6), +el.lat.toFixed(6)]}); continue; } if (t.power === 'tower' || TK.test(mm) || TW.test(mm)) pt([+el.lon.toFixed(6), +el.lat.toFixed(6)]); continue; }
if (el.type !== 'way' || !el.geometry) continue;
const ring = el.geometry.map(q => [+q.lon.toFixed(6), +q.lat.toFixed(6)]);
if (t.natural === 'tree_row'){ R.push({t:'row', line:ring}); continue; }
if (t.route === 'ferry'){ R.push({t:'fer', line:ring}); continue; }
if (t.ford && t.ford !== 'no'){ R.push({t:'ford', line:ring}); continue; }
if (t.bridge && t.bridge !== 'no' && (t.highway || t.railway)){ const HW = {motorway:14, trunk:12, primary:11, secondary:9, tertiary:8, residential:6, unclassified:6, service:4, track:4, footway:2.5, path:2.5, cycleway:2.5, pedestrian:4};
R.push({t:'brg', line:ring, w:parseFloat(t.width) || (t.railway ? 5 : HW[t.highway] || 6), rw:!!t.railway, lv:Math.max(0, parseInt(t.layer) || 1)}); continue; }
if (ring.length < 3) continue;
if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) ring.push(ring[0]);
if (ring.length < 4) continue;
if (TK.test(mm)){ const c = cen(ring); R.push({t:'tank', c, r:Math.max(2, Math.sqrt(areaM(ring) / Math.PI)), h:hT || (mm === 'silo' ? 18 : 9)}); continue; }
if (TW.test(mm)){ pt(cen(ring)); continue; }
if (t.building){ const lv = parseFloat(t['building:levels']), HB = {apartments:14, industrial:9, warehouse:8, church:16, commercial:8, garage:3, garages:3, shed:3, hut:3};
R.push({t:'b', ring, h:Math.min(150, hT || (lv ? lv * 3 + 1 : HB[t.building] || 6)), lv:lv || 0, id:el.id % 1000}); continue; }
if (t.landuse === 'forest' || t.natural === 'wood') R.push({t:'f', ring, lf:t.leaf_type === 'needleleaved' ? 'n' : t.leaf_type === 'broadleaved' ? 'b' : 'm'});
}
return R;
}
function addTree(F, x, y, kind, s, lite){
const add = (ring, b, h, c) => F.push({type:'Feature', properties:{k:'tr', b, h, c}, geometry:{type:'Polygon', coordinates:[ring]}});
const c = [x, y], j = hsh(x * 1e4, y * 1e4), sc = (0.8 + j * 0.45) * s;
if (lite){ if (kind === 'n'){ const h = 12 * sc; add(ngon(c, 2.4 * sc, 6, j), 0.5, h * .55, ['#1f4b2a', '#21502d', '#1c4426'][Math.floor(j * 3)]); add(ngon(c, 1.3 * sc, 6, j + .5), h * .55, h, '#2a6538'); }
else { const h = 11 * sc; add(ngon(c, 0.3, 4, 0), 0, h * .4, '#e7e2d6'); add(ngon(c, 2.4 * sc, 7, j), h * .4, h, ['#4f8738', '#5a9340', '#467c32'][Math.floor(j * 3)]); } return; }
if (kind === 'n'){ const h = 12 * sc; add(ngon(c, 2.5 * sc, 6, j), 0.6, h * .42, '#1f4b2a'); add(ngon(c, 1.8 * sc, 6, j + .5), h * .42, h * .72, '#235631'); add(ngon(c, 1 * sc, 6, j), h * .72, h, '#2a6538'); }
else { const h = 11 * sc; add(ngon(c, 0.3, 4, 0), 0, h * .42, '#e7e2d6'); add(ngon(c, 2.4 * sc, 7, j), h * .42, h, ['#5a9340', '#4f8738', '#6aa34a'][Math.floor(j * 3)]); }
}
const WALLS = ['#ddd3bf', '#d6cdbd', '#e4dccb', '#cdbfa5', '#c9c4bb', '#b98a6a'];
function strip(add, line, W, b, h, c, gap){ // полоса шириной W вдоль линии; gap>0 — пунктир (шаг, м)
for (let i = 1; i < line.length; i++){ const [x1, y1] = line[i-1], [x2, y2] = line[i], [kx, ky] = mk(y1), dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L0 = Math.hypot(dx, dy); if (!L0) continue;
const nx = -dy / L0 * W / 2, ny = dx / L0 * W / 2, seg = gap ? gap : L0;
for (let t = 0; t < L0; t += gap ? gap * 2 : L0){ const t2 = Math.min(L0, t + seg), ax = x1 + dx * t / L0 / kx, ay = y1 + dy * t / L0 / ky, bx = x1 + dx * t2 / L0 / kx, by = y1 + dy * t2 / L0 / ky;
add([[ax + nx / kx, ay + ny / ky], [bx + nx / kx, by + ny / ky], [bx - nx / kx, by - ny / ky], [ax - nx / kx, ay - ny / ky], [ax + nx / kx, ay + ny / ky]], 'bg', b, h, c); } } }
function midLine(line){ let tot = 0; for (let i = 1; i < line.length; i++){ const [kx, ky] = mk(line[i][1]); tot += Math.hypot((line[i][0] - line[i-1][0]) * kx, (line[i][1] - line[i-1][1]) * ky); }
let acc = 0; for (let i = 1; i < line.length; i++){ const [kx, ky] = mk(line[i][1]), dx = (line[i][0] - line[i-1][0]) * kx, dy = (line[i][1] - line[i-1][1]) * ky, L0 = Math.hypot(dx, dy);
if (acc + L0 >= tot / 2 && L0){ const f = (tot / 2 - acc) / L0; return {c:[line[i-1][0] + (line[i][0] - line[i-1][0]) * f, line[i-1][1] + (line[i][1] - line[i-1][1]) * f], ang:Math.atan2(dy, dx) + Math.PI}; } acc += L0; } return null; }
function brgParts(add, o){ const D = 3 + o.lv * 2.5, W = o.w, dc = o.rw ? '#6f6a63' : '#8e8b84';
strip(add, o.line, W, D, D + .8, dc, 0); // настил
strip(add, offLine(o.line, W / 2 - .2), .3, D + .8, D + 1.9, '#55595c', 0); strip(add, offLine(o.line, -W / 2 + .2), .3, D + .8, D + 1.9, '#55595c', 0); // ограждение
if (o.rw) [W / 2 - .3, -W / 2 + .3].forEach(q => strip(add, offLine(o.line, q), .35, D + .8, D + 4.5, '#4c5154', 6)); // фермы
let acc = 18; for (let i = 1; i < o.line.length; i++){ const [x1, y1] = o.line[i-1], [x2, y2] = o.line[i], [kx, ky] = mk(y1), L0 = Math.hypot((x2 - x1) * kx, (y2 - y1) * ky); // опоры через ~18 м
for (; acc < L0; acc += 18){ const f = acc / L0; add(rectR([x1 + (x2 - x1) * f, y1 + (y2 - y1) * f], Math.min(W / 2, 3), 1), 'bg', 0, D, '#9a958a'); } acc -= L0; } }
function offLine(line, off){ return line.map((p, i) => { const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)], [kx, ky] = mk(p[1]), dx = (b[0] - a[0]) * kx, dy = (b[1] - a[1]) * ky, L0 = Math.hypot(dx, dy) || 1; return [p[0] - dy / L0 * off / kx, p[1] + dx / L0 * off / ky]; }); }
function buildObjs(R, d){
const F = [], add = (ring, k, b, h, c) => F.push({type:'Feature', properties:{k, b, h, c}, geometry:{type:'Polygon', coordinates:[ring]}});
const rows = R.filter(o => o.t === 'row'), allF = R.filter(o => o.t === 'f');
allF.forEach(o => { if (o.w == null){ const A = areaM(o.ring), P = perM(o.ring); o.w = P ? 2 * A / P : 999; } });
const strips = allF.filter(o => o.w < 45), fors = allF.filter(o => o.w >= 45);
const rowW = d >= 0.8 ? 10 : 7, kindOf = (lf, x, y) => lf === 'n' || lf === 'b' ? lf : (hsh(x * 1e5, y * 1e5) < .5 ? 'n' : 'b');
const rowLen = rows.reduce((a0, o) => { let L1 = 0; for (let i = 1; i < o.line.length; i++){ const [kx, ky] = mk(o.line[i][1]); L1 += Math.hypot((o.line[i][0] - o.line[i-1][0]) * kx, (o.line[i][1] - o.line[i-1][1]) * ky); } return a0 + L1; }, 0);
const areaT = allF.reduce((a0, o) => a0 + areaM(o.ring), 0) + rowLen * rowW;
let budget = Math.round(15000 * d * Math.max(1, objCells.size));
const S = Math.max(6 / Math.sqrt(d), Math.sqrt(areaT / Math.max(1, budget))), offs = rowW === 10 ? [-3.5, 0, 3.5] : [-2.2, 2.2], rs = S * offs.length * 2.2 / rowW;
rows.forEach(o => { for (let i = 1; i < o.line.length && budget > 0; i++){ const [x1, y1] = o.line[i-1], [x2, y2] = o.line[i], [kx, ky] = mk(y1), dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L0 = Math.hypot(dx, dy); if (!L0) continue;
const nx = -dy / L0, ny = dx / L0, st = Math.max(S * S / (rowW * 1), 3.2);
for (let t = 0; t < L0 && budget > 0; t += st) offs.forEach((o2, q) => { if (budget <= 0) return; const tt = t + (q % 2 ? st / 2 : 0); if (tt > L0) return;
const px = x1 + (dx * tt / L0 + nx * o2) / kx, py = y1 + (dy * tt / L0 + ny * o2) / ky; if (hsh(px * 3e4, py * 3e4) > Math.min(1, (st * rowW) / (S * S * offs.length))) return;
addTree(F, px, py, kindOf(o.lf || 'm', px, py), .95, true); budget--; }); } });
allF.forEach(o => { if (budget <= 0) return; let x0 = 180, x1 = -180, y0 = 90, y1 = -90; o.ring.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
const g = o.w < 45 ? Math.max(3, Math.min(S, o.w / 1.6)) : S, keep = (g / S) * (g / S), [kx, ky] = mk(y0), sx = g / kx, sy = g / ky;
for (let y = y0 + sy / 2; y < y1 && budget > 0; y += sy) for (let x = x0 + sx / 2; x < x1 && budget > 0; x += sx){
const jx = x + (hsh(x * 1e4, y * 1e4) - .5) * sx * .8, jy = y + (hsh(y * 1e4, x * 1e4) - .5) * sy * .8;
if (keep < 1 && hsh(jx * 3e4, jy * 3e4) > keep) continue;
if (!inRing(jx, jy, o.ring)) continue; addTree(F, jx, jy, kindOf(o.lf, jx, jy), 1, true); budget--; } });
R.forEach(o => { switch (o.t){
case 'b': { const wc = WALLS[o.id % WALLS.length], ar = areaM(o.ring), fl = Math.min(30, o.lv || Math.max(1, Math.round((o.h - 1) / 3)));
if (ar < 25 || o.h < 2.6) add(o.ring, 'bw', 0, o.h, wc); else { const fh = (o.h - (o.h > fl * 3 ? 1 : 0)) / fl, wr = scaleRing(o.ring, ar < 150 ? .97 : .99); let z = 0;
for (let i = 0; i < fl; i++){ const w0 = i * fh + fh * .32, w1 = i * fh + fh * .8; add(o.ring, 'bw', z, w0, wc); add(wr, 'bwi', w0, w1, ''); z = w1; } add(o.ring, 'bw', z, o.h, wc); }
const rc = ROOFS[o.id % ROOFS.length];
if (areaM(o.ring) < 500){ add(scaleRing(o.ring, 0.97), 'br', o.h, o.h + 1.1, rc); add(scaleRing(o.ring, 0.62), 'br', o.h + 1.1, o.h + 2.2, rc); add(scaleRing(o.ring, 0.28), 'br', o.h + 2.2, o.h + 3, rc); }
else add(o.ring, 'br', o.h, o.h + 0.6, '#7b7f82'); break; }
case 'brg': brgParts(add, o); break;
case 'ford': strip(add, o.line, 4, 0, .35, '#a39780', 0); break;
case 'fordp': { add(ngon(o.c, 5, 10), 'bg', 0, .35, '#a39780'); [[-6, 0], [6, 0]].forEach(([u]) => add(ngon([o.c[0] + u / mk(o.c[1])[0], o.c[1]], .25, 4), 'bg', 0, 1.6, '#e8e4dc')); } break;
case 'fer': { strip(add, o.line, .8, 0, .25, '#efe7cf', 8); const m = midLine(o.line); if (m){ const f0 = F.length; mdlParts(F, m.c[0], m.c[1], 'ferry', '#7d8a6a', 1, m.ang, 0, true); for (let k = f0; k < F.length; k++) F[k].properties.k = 'bg'; } } break;
case 'tank': add(ngon(o.c, o.r, 18), 'mt', 0, o.h, '#9ba1a6'); add(ngon(o.c, o.r * .7, 18), 'mt', o.h, o.h + Math.max(.6, o.r * .25), '#b3b9bd'); break;
case 'wt': add(ngon(o.c, 1.5, 10), 'ts', 0, o.h - 7, '#a8a39a'); add(ngon(o.c, 4.2, 18), 'ts', o.h - 7, o.h - 1, '#8e959b'); add(ngon(o.c, 2.6, 18), 'ts', o.h - 1, o.h, '#7c8287'); break;
case 'ch': add(ngon(o.c, 1.4, 12), 'ts', 0, o.h, '#8a5a44'); break;
case 'pw': { const h = o.h; [[0, h * .25, 3], [h * .25, h * .5, 2.2], [h * .5, h * .75, 1.5], [h * .75, h, .9]].forEach(([b, t, w]) => add(sq(o.c, w), 'tl', b, t, ''));
add(rectR(o.c, 6, .4), 'ts', h * .66, h * .66 + .8, '#8d9196'); add(rectR(o.c, 4.5, .4), 'ts', h * .86, h * .86 + .8, '#8d9196'); add(ngon(o.c, .35, 4), 'ts', h, h + 3, '#8d9196'); break; }
case 'mast': { const h = o.h, top = h * .92; for (let i = 0; i < 5; i++){ const b = top * i / 5, t = top * (i + 1) / 5; add(sq(o.c, 1.9 - i * .28), 'tl', b, t, ''); }
add(sq(o.c, 2.4), 'ts', h * .55, h * .55 + .8, '#9a9ea3'); add(sq(o.c, 2.1), 'ts', h * .85, h * .85 + .8, '#9a9ea3'); add(ngon(o.c, .18, 4), 'ts', top, h + 5, '#b5b9bd'); break; }
} });
return {type:'FeatureCollection', features:F};
}
function refreshObjs(){ try { if (v3 && v3.getSource('obj')) v3.getSource('obj').setData(buildObjs([].concat(...objCells.values()), v3cfg.den)); } catch(_){} }
async function ensureObjs(){
if (!v3 || !(v3cfg.bld || v3cfg.towers || v3cfg.forest || v3cfg.brg) || objBusy) return;
if (v3.getZoom() < 12){ $('v3msg').textContent = 'Приблизьте карту, чтобы показать здания, вышки и леса'; return; }
const c = v3.getCenter(), cy = Math.floor(c.lat / 0.03), cx = Math.floor(c.lng / 0.045), key = `obj4:${cy}:${cx}`, key2 = savedKeys.has(`obj3:${cy}:${cx}`) ? `obj3:${cy}:${cx}` : `obj2:${cy}:${cx}`;
if (objCells.has(key)) return;
objBusy = true;
try {
let txt = null;
if (savedKeys.has(key) && !cacheOff.has('obj')){ const b = await tileGetFast(key); if (b) txt = typeof b === 'string' ? b : await b.text(); }
if (!txt && navigator.onLine === false && savedKeys.has(key2)){ const b = await tileGetFast(key2); if (b) txt = typeof b === 'string' ? b : await b.text(); }
if (!txt){
if (navigator.onLine === false) throw new Error('offline');
$('v3msg').textContent = 'Загружаю здания, вышки, леса и мосты этого участка…';
const S0 = cy * 0.03, W0 = cx * 0.045, bb = `${S0.toFixed(4)},${W0.toFixed(4)},${(S0 + 0.03).toFixed(4)},${(W0 + 0.045).toFixed(4)}`;
const j = await opQuery(`[out:json][timeout:90];(way["building"](${bb});way["man_made"~"^(tower|mast|water_tower|chimney|storage_tank|silo)$"](${bb});node["man_made"~"^(tower|mast|water_tower|chimney|storage_tank|silo)$"](${bb});node["power"="tower"](${bb});way["bridge"]["highway"](${bb});way["bridge"]["railway"](${bb});way["ford"="yes"](${bb});node["ford"="yes"](${bb});way["route"="ferry"](${bb});relation["landuse"="forest"](${bb});relation["natural"="wood"](${bb});way["landuse"="forest"](${bb});way["natural"~"^(wood|tree_row)$"](${bb}););out geom;`, 90);
txt = JSON.stringify(osmRaw(j)); queuePut(key, new Blob([txt], {type:'application/json'}));
}
objCells.set(key, JSON.parse(txt));
while (objCells.size > 4) objCells.delete(objCells.keys().next().value);
refreshObjs();
$('v3msg').textContent = '';
} catch(e){ $('v3msg').textContent = navigator.onLine === false || String(e.message) === 'offline' ? 'Объекты этого участка не сохранены — откройте его один раз с интернетом' : 'Не удалось загрузить объекты, попробуйте позже'; }
objBusy = false;
}
// ---- 3D: выбор и правка объектов
let v3sel = null, v3move = false;
function v3upd(){ envRefresh(); persist(); renderMarkers(); renderSheet(); try { v3.getSource('pts').setData(v3data()); } catch(_){} v3apply(); try { if (!v3cfg.tac) v3.getSource('tac').setData(v3tac(v3.getCenter())); } catch(_){} }
function v3bar(){ if (!v3draw){ const el = $('v3act'); el.classList.remove('on'); el.innerHTML = ''; } }
function v3tap(e){
if (v3draw){ v3draw.pts.push([+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]); envRefresh(); drawBar(); return; }
if (v3route){ v3route.pts.push([+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]); envRefresh(); v3bar(); return; }
if (v3move && v3sel){ const a = state.arrays[v3sel.ai], p = a && v3item(a); if (p){ const dla = e.lngLat.lat - p.lat, dlo = e.lngLat.lng - p.lng; ['line', 'ring', 'path'].forEach(k => { if (p[k]) p[k] = p[k].map(q => [+(q[0] + dlo).toFixed(7), +(q[1] + dla).toFixed(7)]); }); p.lat = +e.lngLat.lat.toFixed(7); p.lng = +e.lngLat.lng.toFixed(7); if (!p.hManual) fillHeight(p); if (!p.placeManual) delete p.place; v3upd(); } v3move = false; v3bar(); return; }
v3sel = null; }
// после правки в карточке — обновить 3D
['ptSave', 'ptDel'].forEach(id => $(id).addEventListener('click', () => setTimeout(() => { if (!v3) return; if (id === 'ptDel'){ v3sel = null; v3bar(); } v3upd(); }, 0)));
function close3D(){
v3sel = null; v3move = false; v3bar();
$('v3panel').classList.remove('on');
if (v3){ try { const c = v3.getCenter(); map.setView([c.lat, c.lng], Math.min(20, v3.getZoom() + 1)); v3.remove(); } catch(e){} v3 = null; }
$('v3d').classList.remove('on');
}
$('v3Btn').onclick = open3D;
$('v3close').onclick = close3D;
$('v3base').onchange = e => { if (!v3) return; const k = e.target.value; try { v3.removeLayer('base'); v3.removeSource('base'); v3.addSource('base', v3baseSrc(k)); v3.addLayer({id:'base', type:'raster', source:'base', paint:{'raster-fade-duration':0}}, 'hs'); } catch(_){} };
$('v3ex').oninput = e => { $('v3exv').textContent = +e.target.value === 1 ? 'Реальный' : '×' + e.target.value; if (v3) try { v3.setTerrain({source:'dem', exaggeration:+e.target.value}); } catch(_){} };
// ======== МАКЕТ: ОБЪЕКТЫ, КРУГОВОЕ МЕНЮ 3D, АНИМАЦИЯ ========
const ENV_D = {house:{w:9, l:11, h:6}, flat:{w:14, l:40, h:15}, wh:{w:18, l:40, h:8}, hangar:{w:22, l:30, h:9}, pw:{h:28}, mast:{h:45}, wt:{h:24}, tank:{r:6, h:9}};
const ANIM = new Map(); let animRaf = 0, animList = [], animT0 = 0, animLast = 0, v3route = null, v3lp = null;
function envLayer(){ let a = state.arrays.find(x => x.name === 'Макет: объекты'); if (!a){ a = normArr({id:Date.now(), kind:'shapes', name:'Макет: объекты', ident:'Макет', style:{color:'#6b6b6b', name:'Серый', glyph:''}, points:[], shapes:[], env:[]}); state.arrays.push(a); } if (!a.env) a.env = []; return a; }
function rotFeats(F, c, deg){ if (!deg) return; const r = -deg * Math.PI / 180, cr = Math.cos(r), sr = Math.sin(r), [kx, ky] = mk(c[1]);
F.forEach(f => { f.geometry.coordinates = f.geometry.coordinates.map(ring => ring.map(([x, y]) => { const u = (x - c[0]) * kx, v = (y - c[1]) * ky; return [c[0] + (u * cr - v * sr) / kx, c[1] + (u * sr + v * cr) / ky]; })); }); }
function envFeatures(){
const out = [];
state.arrays.forEach((a, ai) => { if (a.hidden || !a.env) return; a.env.forEach((o0, ei) => { if (o0.hid || !tagOk(a, o0)) return; const ov = ANIM.get('e' + a.id + ':' + ei), o = ov ? Object.assign({}, o0, ov) : o0, c = [o.lng, o.lat], d = Object.assign({}, ENV_D[o.k] || {}, o), F = [];
if (treeGen(o, F)){}
else if (o.k === 'trow' && o.line) buildObjs([{t:'row', line:o.line, lf:o.lf}], v3cfg.mden ?? .3).features.forEach(f => F.push(f));
else if (o.k === 'tpoly' && o.ring) buildObjs([{t:'f', ring:o.ring, lf:o.lf || 'm'}], v3cfg.mden ?? .3).features.forEach(f => F.push(f));
else if (o.k === 'tree_n' || o.k === 'tree_b') addTree(F, o.lng, o.lat, o.k === 'tree_n' ? 'n' : 'b', 1.1, false);
else if (o.k === 'grove'){ const [kx, ky] = mk(o.lat); for (let i = 0; i < Math.max(3, Math.round(14 * (v3cfg.mden ?? .3) / .6)); i++){ const r = 4 + hsh(i, 3) * 14, q = hsh(i, 7) * 6.28; addTree(F, o.lng + Math.cos(q) * r / kx, o.lat + Math.sin(q) * r / ky, hsh(i, 5) < .5 ? 'n' : 'b', 1, false); } }
else { let raw;
if (['house', 'flat', 'wh', 'hangar'].includes(o.k)) raw = {t:'b', ring:rectR(c, d.l / 2, d.w / 2), h:d.h, id:ei + 3, lv:o.k === 'flat' ? 5 : 0};
else if (o.k === 'tank') raw = {t:'tank', c, r:d.r, h:d.h}; else raw = {t:o.k, c, h:d.h};
buildObjs([raw], 1).features.forEach(f => F.push(f)); }
rotFeats(F, c, o.rot || 0); scaleFeats(F, c, o.msc || 1); F.forEach(f => { f.properties.ai = ai; f.properties.ei = ei; out.push(f); }); }); });
return {type:'FeatureCollection', features:out};
}
function v3item(a){ return v3sel.ei != null ? (a.env || [])[v3sel.ei] : a.points[v3sel.pi]; }
function envRefresh(){ try { v3.getSource('env').setData(envFeatures()); } catch(_){} try { v3.getSource('apath').setData(pathData()); } catch(_){} }
function pathData(){ const F = []; if (v3draw && v3draw.pts.length > 1) F.push({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:v3draw.k === 'tpoly' ? v3draw.pts.concat([v3draw.pts[0]]) : v3draw.pts}}); state.arrays.forEach(a => { if (a.hidden) return; a.points.concat(a.env || []).forEach(it => { if (it.path && it.path.length > 1) F.push({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:it.path}}); }); });
if (v3route && v3route.pts.length > 1) F.push({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:v3route.pts}}); return {type:'FeatureCollection', features:F}; }
function envInit(){
try {
if (!v3.getSource('env')) v3.addSource('env', {type:'geojson', data:envFeatures()});
if (!v3.getSource('apath')) v3.addSource('apath', {type:'geojson', data:pathData()});
v3.getStyle().layers.filter(l => l.source === 'obj').forEach(l => { const id = 'e_' + l.id; if (v3.getLayer(id)) return; const L1 = JSON.parse(JSON.stringify(l)); L1.id = id; L1.source = 'env'; delete L1.minzoom; L1.layout = Object.assign({}, L1.layout || {}, {visibility:'visible'}); v3.addLayer(L1); });
if (!v3.getLayer('apath')) v3.addLayer({id:'apath', type:'line', source:'apath', paint:{'line-color':'#ff8a2a', 'line-width':3, 'line-dasharray':[2, 1.5]}});
} catch(e){}
}
function placeEnv(k, ll){ const a = envLayer(); a.env.push({k, lat:+ll.lat.toFixed(7), lng:+ll.lng.toFixed(7), rot:0}); persist(); envRefresh(); toast(ENV_N[k] + ' поставлен(а). Коснитесь объекта, чтобы править'); }
function placeTech(side, sid, ll){ const S = SIDES[side], sy = SYM_BY[sid]; let a = state.arrays.find(x => x.name === `Макет: ${S.name}`);
if (!a){ a = normArr({id:Date.now(), kind:'pts', name:`Макет: ${S.name}`, ident:S.name, style:{color:S.color, name:S.name, glyph:''}, symSide:side, points:[]}); state.arrays.push(a); }
const cnt = a.points.filter(p => p.sym === sid).length; const p = {lat:+ll.lat.toFixed(7), lng:+ll.lng.toFixed(7), h:null, place:'', name:`${sy.n} ${cnt + 1}`, sym:sid, side}; a.points.push(p); fillHeight(p);
if (!v3cfg.mdl){ v3cfg.mdl = true; lsSet('skat_v3', v3cfg); } v3upd(); toast(`${p.name} поставлен`); }
function openRadial3D(x, y, ll){
try { navigator.vibrate && navigator.vibrate(25); } catch(e){}
radPos = {x, y, ll}; radStack = []; $('radial').classList.add('on');
const tech = side => radPush(SIDES[side].name, SYMS.filter(s => s.type === 'pt' && MDL_OF[s.id] && isFav(s)).slice(0, 21).map(sy => ({t:sy.n, ic:symSvg(sy.id), color:symCol(sy.id, side, SIDES[side].color), go:() => { closeRadial(); placeTech(side, sy.id, ll); }}))
.concat([{t:'Вся техника', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>', go:() => { closeRadial(); openSymPick(['pt'], id => { if (id) placeTech(side, id, ll); }, SIDES[side].color, false, s => !!MDL_OF[s.id]); }}]));
const env = list => list.map(k => ({t:ENV_N[k], ic:'', go:() => { closeRadial(); placeEnv(k, ll); }}));
radPush('Макет', [
{t:'Техника и знаки', ic:IC.obj, go:() => radPush('Сторона', [{t:'Красные', ic:IC.side(SIDES.r.color), go:() => tech('r')}, {t:'Синие', ic:IC.side(SIDES.b.color), go:() => tech('b')}])},
{t:'Здания', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V10l8-6 8 6v11z"/><path d="M10 21v-6h4v6"/></svg>', go:() => radPush('Здания', env(['house', 'flat', 'wh', 'hangar']))},
{t:'Деревья', ic:TREE_BTN, go:() => radPush('Деревья', [
{t:'Ель', ic:'▲', go:() => radPush('Ель', [{t:'Точкой', ic:IC.pt, go:() => { closeRadial(); placeEnv('tree_n', ll); }}, {t:'Маршрутом', ic:IC.route, go:() => startDraw('trow', 'n')}])},
{t:'Берёза', ic:'●', go:() => radPush('Берёза', [{t:'Точкой', ic:IC.pt, go:() => { closeRadial(); placeEnv('tree_b', ll); }}, {t:'Маршрутом', ic:IC.route, go:() => startDraw('trow', 'b')}])},
{t:'Смешанный ряд', ic:IC.route, go:() => startDraw('trow', 'm')},
{t:'Роща (контур)', ic:IC.poly, go:() => startDraw('tpoly', 'm')},
{t:'Роща (точкой)', ic:'♣', go:() => { closeRadial(); placeEnv('grove', ll); }}])},
{t:'Вышки, ЛЭП', ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 22L12 2l4 20M9 16h6M10 10h4M5 7h14"/></svg>', go:() => radPush('Вышки и сооружения', env(['pw', 'mast', 'wt', 'tank']))}]);
}
// ---- анимация по маршруту
function pathPos(path, dist){ let acc = 0;
for (let i = 1; i < path.length; i++){ const [x1, y1] = path[i-1], [x2, y2] = path[i], [kx, ky] = mk(y1), dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L0 = Math.hypot(dx, dy);
if (acc + L0 >= dist){ const f = L0 ? (dist - acc) / L0 : 0; return {lng:x1 + (x2 - x1) * f, lat:y1 + (y2 - y1) * f, rot:Math.round(180 - Math.atan2(dy, dx) * 180 / Math.PI), end:false}; } acc += L0; }
const n = path.length, [x1, y1] = path[n-2], [x2, y2] = path[n-1], [kx, ky] = mk(y1); return {lng:x2, lat:y2, rot:Math.round(180 - Math.atan2((y2 - y1) * ky, (x2 - x1) * kx) * 180 / Math.PI), end:true}; }
function playAnim(items){
stopAnim(); animList = items.filter(x => x.it.path && x.it.path.length > 1); if (!animList.length){ toast('Нет объектов с маршрутом: выберите объект → «Маршрут»'); return; }
animT0 = performance.now();
const step = now => { const t = (now - animT0) / 1000; let alive = false;
animList.forEach(x => { const q = pathPos(x.it.path, t * (x.it.spd || 20) / 3.6); if (!q.end) alive = true; ANIM.set(x.key, q); });
if (now - animLast > 60){ animLast = now; try { v3.getSource('mdl').setData(v3mdl(v3.getCenter())); } catch(_){} envRefresh(); }
animRaf = alive ? requestAnimationFrame(step) : 0; if (!alive) toast('Анимация завершена'); };
animRaf = requestAnimationFrame(step);
}
function stopAnim(){ if (animRaf) cancelAnimationFrame(animRaf); animRaf = 0; ANIM.clear(); try { v3.getSource('mdl').setData(v3mdl(v3.getCenter())); } catch(_){} envRefresh(); }
{ const box = $('v3map');
const clr = () => { if (v3lp){ clearTimeout(v3lp.tm); v3lp = null; } };
box.addEventListener('touchstart', e => { clr(); if (e.touches.length !== 1 || !v3 || secMode !== 'mk') return; const t = e.touches[0]; v3lp = {x:t.clientX, y:t.clientY};
v3lp.tm = setTimeout(() => { if (!v3lp) return; const r = box.getBoundingClientRect(), ll = v3.unproject([v3lp.x - r.left, v3lp.y - r.top]), x = v3lp.x, y = v3lp.y; v3lp = null; openRadial3D(x, y, ll); }, 600); }, {passive:true});
box.addEventListener('touchmove', e => { if (!v3lp) return; const t = e.touches[0]; if (e.touches.length > 1 || Math.hypot(t.clientX - v3lp.x, t.clientY - v3lp.y) > 10) clr(); }, {passive:true});
box.addEventListener('touchend', clr); box.addEventListener('touchcancel', clr); }

// ======== МАКЕТ: РИСОВАНИЕ РЯДОВ И РОЩ, «МОИ СЛОИ», ЗНАЧКИ В 2D ========
let v3draw = null;
function drawBar(){ const el = $('v3act'); if (!v3draw){ el.classList.remove('on'); el.innerHTML = ''; return; }
el.innerHTML = `<b>${v3draw.k === 'trow' ? 'Ряд деревьев' : 'Роща'}: точек ${v3draw.pts.length} — касайтесь карты</b><button data-d="ok" class="on">Готово</button><button data-d="un">Убрать точку</button><button data-d="x">Отмена</button>`; el.classList.add('on'); }
function startDraw(k, lf){ closeRadial(); v3sel = null; v3route = null; v3draw = {k, lf, pts:[]}; drawBar(); toast(k === 'trow' ? 'Касайтесь 3D-карты вдоль линии ряда деревьев' : 'Касайтесь 3D-карты по контуру рощи'); }
$('v3act').addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (!b || !v3draw) return; e.stopPropagation(); const d = b.dataset.d;
if (d === 'un'){ v3draw.pts.pop(); envRefresh(); drawBar(); return; }
if (d === 'ok'){ const P = v3draw.pts, need = v3draw.k === 'trow' ? 2 : 3; if (P.length < need){ toast(`Нужно не меньше ${need} точек`); return; }
const a = envLayer(), o = {k:v3draw.k, lf:v3draw.lf, lat:P[0][1], lng:P[0][0], rot:0}; if (v3draw.k === 'trow') o.line = P.slice(); else o.ring = P.concat([P[0]]);
a.env.push(o); persist(); toast(ENV_N[o.k] + ' добавлен(а)'); }
v3draw = null; drawBar(); envRefresh(); }, true);
function renderMy(){
const el = $('myList'), L1 = [];
L1.push('<div class="sub-h" style="margin-top:0">Слои</div>');
state.arrays.forEach((a, ai) => L1.push(`<div class="arr${a.hidden ? ' off' : ''}"><div class="nm"><div>${escapeHtml(a.name)}</div><div>${escapeHtml(rangeText(a))}</div></div><button class="eye${a.hidden ? ' off' : ''}" data-ai="${ai}" data-a="eye">${a.hidden ? EYE_OFF : EYE_ON}</button></div>`));
const items = []; state.arrays.forEach((a, ai) => { if (!isMk(a)) return; a.points.forEach((p, pi) => items.push({ai, pi, n:labelOf(a, pi), lat:p.lat, lng:p.lng})); (a.env || []).forEach((o, ei) => items.push({ai, ei, n:ENV_N[o.k] || 'Объект', lat:o.lat, lng:o.lng})); });
L1.push(`<div class="sub-h">Объекты макета (${items.length})</div>`);
L1.push(items.length ? items.slice(0, 150).map((it, k) => `<div class="arr"><div class="nm"><div>${escapeHtml(it.n)}</div><div>${escapeHtml(state.arrays[it.ai].name)}</div></div><button data-k="${k}" data-a="go">Показать</button><button class="eye" data-k="${k}" data-a="del">🗑</button></div>`).join('') : '<div class="empty">Объектов макета пока нет — удержите палец на 3D-карте.</div>');
el.innerHTML = L1.join('');
el.querySelectorAll('button').forEach(b => b.onclick = () => {
if (b.dataset.a === 'eye'){ const a = state.arrays[+b.dataset.ai]; a.hidden = !a.hidden; v3upd(); renderMy(); return; }
const it = items[+b.dataset.k], a = state.arrays[it.ai];
if (b.dataset.a === 'go'){ $('v3my').classList.remove('on'); try { v3.flyTo({center:[it.lng, it.lat], zoom:Math.max(v3.getZoom(), 16.5)}); } catch(_){} return; }
if (it.ei != null) a.env.splice(it.ei, 1); else a.points.splice(it.pi, 1); v3sel = null; v3bar(); v3upd(); renderMy(); });
}
$('v3myBtn').onclick = () => { $('v3panel').classList.remove('on'); renderMy(); $('v3my').classList.toggle('on'); };

MDLS.ls3 = [...man(-1.1).map(p => (p[2] += .7, p)), ...man(0), ...man(1.1).map(p => (p[2] -= .7, p))];
MDLS.mortar = [MB(.35, 0, .55, .55, 0, .08, 'dk'), ...Array.from({length:8}, (_, i) => MB(.3 - i * .15, 0, .22, .14, .1 + i * .15, .32 + i * .15, 'dk')),
...[1, -1].flatMap(sg => Array.from({length:5}, (_, i) => { const t = i / 4; return MB(-.95 + t * .4, sg * (.38 - t * .3), .09, .09, t * .8, t * .8 + .22, 'dk'); })), ...man(1.1).map(p => (p[2] += .6, p))];
// ======== МАКЕТ: НАСТРОЙКИ ОБЪЕКТОВ ========
// ---- размер моделей, параметры деревьев, высота БПЛА
function treeGen(o, F){ const st = o.step || 7, sp = o.sp ?? .3, kind = (x, y) => o.lf === 'n' || o.lf === 'b' ? o.lf : (hsh(x * 1e5, y * 1e5) < .5 ? 'n' : 'b');
if (o.k === 'trow' && o.line){ const W2 = o.w || 8, nr = Math.max(1, Math.round(W2 / 4)), offs = Array.from({length:nr}, (_, i) => nr === 1 ? 0 : -W2 / 2 + W2 * i / (nr - 1));
for (let i = 1; i < o.line.length; i++){ const [x1, y1] = o.line[i-1], [x2, y2] = o.line[i], [kx, ky] = mk(y1), dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L0 = Math.hypot(dx, dy); if (!L0) continue; const nx = -dy / L0, ny = dx / L0;
for (let t = 0; t < L0; t += st) offs.forEach((of, q) => { const tt = t + (q % 2 ? st / 2 : 0) + (hsh(t, q) - .5) * st * sp, oo = of + (hsh(q, t) - .5) * st * sp; if (tt > L0) return; const px = x1 + (dx * tt / L0 + nx * oo) / kx, py = y1 + (dy * tt / L0 + ny * oo) / ky; addTree(F, px, py, kind(px, py), o.ts || 1, true); }); } return true; }
if (o.k === 'tpoly' && o.ring){ let x0 = 180, x1 = -180, y0 = 90, y1 = -90; o.ring.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }); const [kx, ky] = mk(y0), sx = st / kx, sy = st / ky; let n = 0;
for (let y = y0 + sy / 2; y < y1 && n < 4000; y += sy) for (let x = x0 + sx / 2; x < x1 && n < 4000; x += sx){ const jx = x + (hsh(x * 1e4, y * 1e4) - .5) * sx * sp * 2, jy = y + (hsh(y * 1e4, x * 1e4) - .5) * sy * sp * 2; if (!inRing(jx, jy, o.ring)) continue; addTree(F, jx, jy, kind(jx, jy), o.ts || 1, true); n++; } return true; }
if (o.k === 'grove' && (o.n || o.r)){ const [kx, ky] = mk(o.lat), N = o.n || 14, R = o.r || 18; for (let i = 0; i < N; i++){ const r = R * Math.sqrt(hsh(i, 3)), q = hsh(i, 7) * 6.28; addTree(F, o.lng + Math.cos(q) * r / kx, o.lat + Math.sin(q) * r / ky, kind(i, q), o.ts || 1, false); } return true; }
return false; }
function scaleFeats(F, c, s){ if (!s || s === 1) return; const [kx, ky] = mk(c[1]); F.forEach(f => { f.geometry.coordinates = f.geometry.coordinates.map(r => r.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s])); f.properties.h *= s; f.properties.b *= s; }); }
// ======== 6.36: ОБЪЁМНЫЕ МОДЕЛИ НА THREE.JS (слой tj3 внутри 3D-карты) + АНИМАЦИИ ДЕЙСТВИЙ ========
// Модели собираются в коде (без внешних файлов): вперёд — −Z, вверх — +Y, размеры в метрах, масштаб — v3cfg.ms. Старые блочные модели остаются запасным вариантом.
const TJK = {tank:[7, 3.4], bmp:[6.7, 3.1], btr:[7.6, 2.9], truck:[7, 2.5], gun:[6.5, 2.6], sau:[7.3, 3.3], rszo:[7.6, 2.6], mortar:[2.6, 2.4], inf:[4, 3.4], uavp:[3, 4.6], uavk:[1.8, 1.8]};
const TJ = {on:false, ready:false, objs:new Map(), G:{}, M:{}, origin:null, layer:null};
function loadThree(){ if (window.THREE) return Promise.resolve(); if (TJ.ld) return TJ.ld; return TJ.ld = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'; s.onload = res; s.onerror = () => { TJ.ld = null; rej(new Error('Three.js не загрузился')); }; document.head.appendChild(s); }); }
const tjM = (c, o) => { const k = c + (o ? '|' + JSON.stringify(o) : ''); return TJ.M[k] || (TJ.M[k] = new THREE.MeshLambertMaterial(Object.assign({color:c}, o || {}))); };
const tjB = c => TJ.M['B' + c] || (TJ.M['B' + c] = new THREE.MeshBasicMaterial({color:c, transparent:true, opacity:.9, depthWrite:false}));
function tjG(k, f){ return TJ.G[k] || (TJ.G[k] = f()); }
function tjBuild(key, col){ const T = THREE, G = new T.Group(), ud = G.userData = {key, col, wh:[], legs:[], rot:[], paint:[], tur:null, gun:null};
const body = tjM(mmix(col, '#4b5a2e', .58)), body2 = tjM(mmix(col, '#3a4622', .66)), side = tjM(col), dk = tjM('#2a2c2b'), tr = tjM('#1a1b1a'), cnv = tjM('#5f6b45'), gl = tjM('#22323c'), skin = tjM('#c9a27e'), met = tjM('#4a4d4f');
const box = (w, h, d, m, x, y, z, par = G) => { const o = new T.Mesh(tjG(`b${w},${h},${d}`, () => new T.BoxGeometry(w, h, d)), m); o.position.set(x, y, z); par.add(o); if (m === body || m === body2) ud.paint.push(o); return o; };
const cyl = (r1, r2, h, n, m, x, y, z, rx = 0, rz = 0, par = G) => { const o = new T.Mesh(tjG(`c${r1},${r2},${h},${n}`, () => new T.CylinderGeometry(r1, r2, h, n)), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); par.add(o); if (m === body || m === body2) ud.paint.push(o); return o; };
const hull = (id, prof, w, m, par = G) => { const o = new T.Mesh(tjG('h' + id, () => { const g = new T.ExtrudeGeometry(new T.Shape(prof.map(([z, y]) => new T.Vector2(z, y))), {depth:w, bevelEnabled:false}); g.translate(0, 0, -w / 2); g.rotateY(-Math.PI / 2); return g; }), m); par.add(o); if (m === body || m === body2) ud.paint.push(o); return o; };
const wheel = (r, w, x, y, z, m = dk) => { const o = cyl(r, r, w, 12, m, x, y, z, 0, Math.PI / 2); ud.wh.push(o); return o; };
const tracksW = (L, n, x, r = .36) => [-1, 1].forEach(s => { box(.62, .95, L, tr, s * x, .5, 0); for (let i = 0; i < n; i++) wheel(r, .2, s * (x + .33), .42, -L / 2 + .5 + i * (L - 1) / (n - 1)); box(.72, .08, L + .2, body2, s * x, 1.03, 0); });
const flash = (par, z) => { const f = new T.Mesh(tjG('fl', () => new T.ConeGeometry(.45, 1.6, 8)), tjB('#ffd36a')); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, z - .8); f.visible = false; par.add(f); ud.flash = f; };
const turret = (y, z) => { const t = new T.Group(); t.position.set(0, y, z); G.add(t); ud.tur = t; return t; }, gunG = (par, y, z) => { const g = new T.Group(); g.position.set(0, y, z); par.add(g); ud.gun = g; return g; };
const soldier = (x, z, par = G) => { const s = new T.Group(); s.position.set(x, 0, z); par.add(s); [-1, 1].forEach(k => { const l = new T.Group(); l.position.set(k * .11, .82, 0); s.add(l); box(.16, .82, .2, tjM('#3d4630'), 0, -.41, 0, l); ud.legs.push(l); });
box(.44, .6, .28, tjM(mmix(col, '#4b5a2e', .7)), 0, 1.13, 0, s); cyl(.13, .13, .24, 8, skin, 0, 1.58, 0, 0, 0, s); cyl(.15, .17, .12, 8, tjM('#4b5a2e'), 0, 1.72, 0, 0, 0, s); box(.06, .07, .95, dk, .2, 1.15, -.25, s); box(.3, .05, .3, side, 0, 1.79, 0, s); return s; };
if (key === 'tank'){ tracksW(6.6, 6, 1.38); hull('tank', [[-3.5, .55], [-3.3, .7], [-2.6, 1.42], [3.25, 1.42], [3.45, .9], [3.3, .55]], 2.5, body); const t = turret(1.42, .45);
const d = cyl(.95, 1.3, .62, 10, body2, 0, .31, 0, 0, 0, t); d.scale.z = 1.18; box(.6, .45, .5, body2, 0, .3, -1.35, t); box(.55, .06, .55, side, .35, .65, .35, t); cyl(.28, .28, .25, 8, body2, -.45, .74, .25, 0, 0, t);
const g = gunG(t, .32, -1.5); cyl(.085, .1, 4.8, 8, dk, 0, 0, -2.4, Math.PI / 2, 0, g); cyl(.14, .14, .4, 8, dk, 0, 0, -4.7, Math.PI / 2, 0, g); flash(g, -4.9); box(1.5, .5, .25, tr, 0, 1.1, 3.3); }
else if (key === 'bmp'){ tracksW(6.2, 6, 1.35, .34); hull('bmp', [[-3.35, .5], [-3.05, .7], [-1.9, 1.55], [2.3, 1.72], [3.25, 1.72], [3.4, .6], [3.2, .5]], 2.6, body); const t = turret(1.62, -.2);
cyl(.62, .78, .45, 8, body2, 0, .22, 0, 0, 0, t); box(.5, .06, .5, side, 0, .47, .1, t); box(.2, .22, 1.15, dk, .68, .45, -.1, t); const g = gunG(t, .25, -.6); cyl(.045, .05, 2.6, 6, dk, 0, 0, -1.3, Math.PI / 2, 0, g); flash(g, -2.6); }
else if (key === 'btr'){ [-2.55, -1.45, .85, 1.95].forEach(z => [-1, 1].forEach(s => wheel(.55, .38, s * 1.32, .55, z))); hull('btr', [[-3.75, .95], [-3.3, 1.5], [-1.6, 2.05], [3.4, 2.05], [3.75, 1.2], [3.2, .72], [-3.0, .7]], 2.6, body);
const t = turret(2.05, -1.1); cyl(.5, .58, .45, 8, body2, 0, .22, 0, 0, 0, t); box(.45, .06, .45, side, 0, .46, .05, t); const g = gunG(t, .22, -.5); cyl(.05, .055, 2, 6, dk, 0, 0, -1, Math.PI / 2, 0, g); flash(g, -2); }
else if (key === 'truck' || key === 'rszo'){ const zs = key === 'rszo' ? [-2.6, -1.4, 1.3, 2.5] : [-2.6, 1.0, 2.2]; zs.forEach(z => [-1, 1].forEach(s => wheel(.5, .34, s * 1.08, .5, z))); box(2, .3, 6.6, dk, 0, .9, .2);
box(2.3, 1.55, 1.8, body, 0, 1.75, -2.65); box(2.1, .6, .06, gl, 0, 2.05, -3.56); box(2.3, .55, .9, body2, 0, 1.25, -3.75);
if (key === 'truck'){ box(2.4, 1.5, 4.2, cnv, 0, 1.95, .95); const r = cyl(1.2, 1.2, 4.2, 12, cnv, 0, 2.7, .95, Math.PI / 2); r.scale.set(1, 1, .3); }
else { const p = new T.Group(); p.position.set(0, 1.35, 2.6); G.add(p); ud.gun = p; p.rotation.x = .3; box(2.3, 1.1, 3.8, body2, 0, .55, -1.9, p); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) cyl(.13, .13, .05, 8, tr, -.8 + i * .53, .3 + j * .5, -3.82, Math.PI / 2, 0, p); flash(p, -3.9); box(.5, .06, .5, side, 0, 1.13, -1.2, p); } }
else if (key === 'gun'){ [-1, 1].forEach(s => wheel(.55, .3, s * 1.15, .55, .3)); box(2.2, 1.1, .08, body, 0, 1.2, -.35); [-1, 1].forEach(s => { const l = box(.18, .16, 3.4, body2, s * .5, .3, 2); l.rotation.y = s * -.22; });
const g = gunG(G, 1.3, 0); g.rotation.x = .18; box(.5, .45, 1.6, body2, 0, 0, .2, g); cyl(.09, .11, 5.2, 8, dk, 0, .05, -2.6, Math.PI / 2, 0, g); cyl(.15, .15, .35, 8, dk, 0, .05, -5.1, Math.PI / 2, 0, g); flash(g, -5.3); box(.4, .05, .4, side, 0, 1.78, -.35); }
else if (key === 'sau'){ tracksW(6.8, 7, 1.38); hull('sau', [[-3.6, .55], [-3.35, .7], [-2.7, 1.4], [3.4, 1.4], [3.55, .85], [3.3, .55]], 2.5, body); const t = turret(1.4, .9);
box(2.9, 1.25, 3.4, body2, 0, .62, 0, t); box(.6, .06, .6, side, .7, 1.27, .5, t); const g = gunG(t, .65, -1.7); cyl(.1, .12, 6.4, 8, dk, 0, 0, -3.2, Math.PI / 2, 0, g); cyl(.17, .17, .45, 8, dk, 0, 0, -6.3, Math.PI / 2, 0, g); flash(g, -6.5); g.rotation.x = .12; }
else if (key === 'mortar'){ cyl(.45, .45, .08, 10, met, 0, .04, 0); const g = gunG(G, .1, 0); g.rotation.x = Math.PI / 2 - 1.05; cyl(.065, .065, 1.4, 8, dk, 0, 0, -.7, Math.PI / 2, 0, g); flash(g, -1.4); [-1, 1].forEach(s => { const b = box(.04, .9, .04, dk, s * .25, .45, -.55); b.rotation.z = s * .25; }); soldier(.9, .6); soldier(-.8, .9); }
else if (key === 'inf'){ [[0, -1.2], [-1.1, 0], [1.1, 0], [0, 1.2]].forEach(([x, z]) => soldier(x, z)); }
else if (key === 'uavp'){ cyl(.2, .14, 3, 10, body, 0, 0, 0, Math.PI / 2); box(4.6, .05, .55, body2, 0, .05, -.1); box(1.4, .05, .35, body2, 0, .05, 1.35); box(.05, .55, .35, body2, 0, .3, 1.4); box(.4, .05, .4, side, 0, .1, -.1);
const pr = new T.Group(); pr.position.set(0, 0, 1.58); G.add(pr); ud.rot.push({o:pr, ax:'z', v:1.6}); box(.06, .9, .03, dk, 0, 0, 0, pr); }
else if (key === 'uavk'){ box(.5, .18, .5, body, 0, 0, 0); box(.3, .03, .3, side, 0, .1, 0); [[.75, .75], [.75, -.75], [-.75, .75], [-.75, -.75]].forEach(([x, z]) => { const a = box(.06, .05, 1.05, body2, x / 2, 0, z / 2); a.rotation.y = Math.atan2(x, z); const r = new T.Group(); r.position.set(x, .1, z); G.add(r); ud.rot.push({o:r, ax:'y', v:2.2}); box(.75, .015, .06, dk, 0, 0, 0, r); box(.06, .015, .75, dk, 0, 0, 0, r); }); }
ud.ph = Math.random(); return G; }
// ---- кадр: синхронизация с обстановкой (модели статичные: положение, курс, масштаб)
function tjFrame(){ if (!v3 || !TJ.ready) return false; const c = v3.getCenter(); let o0 = TJ.origin;
if (!o0 || Math.abs(c.lat - o0.lat) > .15 || Math.abs(c.lng - o0.lng) > .2){ const mc = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0); o0 = TJ.origin = {lat:c.lat, lng:c.lng, x:mc.x, y:mc.y, z:mc.z, s:mc.meterInMercatorCoordinateUnits(), k:mk(c.lat)}; }
const want = new Set(), S0 = v3cfg.ms || 4; let n = 0;
state.arrays.forEach(a => { if (a.hidden || a.kind === 'aux' || a.kind === 'shapes') return; a.points.forEach((p0, pi) => { if (p0.hid || !tagOk(a, p0) || n > 160) return; const sid = p0.sym || a.sym, key = sid && MDL_OF[sid]; if (!TJK[key]) return;
const id = a.id + ':' + pi, ov = ANIM.get(id), p = ov ? Object.assign({}, p0, ov) : p0; if (Math.abs(p.lat - c.lat) > .3 || Math.abs(p.lng - c.lng) > .45) return; n++; want.add(id);
const sd = sideOf(a, p0), col = sid === 'lozh' ? SCOL.g : symCol(sid, sd, styleOf(a, p0).color); let o = TJ.objs.get(id); if (!o || o.userData.key !== key || o.userData.col !== col){ if (o) TJ.scene.remove(o); o = tjBuild(key, col); TJ.scene.add(o); TJ.objs.set(id, o); }
const rot = (p.rot ?? a.rot) ?? (sd === 'b' ? 180 : 0), brg = ((rot + 270) % 360 + 360) % 360, air = MDL_AIR[key], el = (v3.queryTerrainElevation && v3.queryTerrainElevation([p.lng, p.lat])) || 0;
const x = (p.lng - o0.lng) * o0.k[0], y = (p.lat - o0.lat) * o0.k[1], sc = (air ? Math.max(2, S0 * .8) : S0) * (p.msc || 1);
o.position.set(x, el + (air ? (p.alt ?? (v3cfg.alt || 60)) : 0), -y); o.rotation.set(0, -brg * Math.PI / 180, 0); o.scale.setScalar(sc); }); });
TJ.objs.forEach((o, id) => { if (!want.has(id)){ TJ.scene.remove(o); TJ.objs.delete(id); } }); return false; }
function tjLayer(){ return {id:'tj3', type:'custom', renderingMode:'3d',
onAdd(map, gl){ const T = THREE; this.cam = new T.Camera(); TJ.scene = new T.Scene(); TJ.scene.add(new T.HemisphereLight(0xffffff, 0x445544, .85)); const d = new T.DirectionalLight(0xffffff, .65); d.position.set(.4, 1, .3); TJ.scene.add(d);
this.r = new T.WebGLRenderer({canvas:map.getCanvas(), context:gl, antialias:true}); this.r.autoClear = false; TJ.objs.clear(); },
render(gl, matrix){ matrix = mtx(matrix); const T = THREE, anim = tjFrame(), o = TJ.origin; if (!o) return; const m = new T.Matrix4().fromArray(matrix), l = new T.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new T.Vector3(o.s, -o.s, o.s)).multiply(new T.Matrix4().makeRotationX(Math.PI / 2));
this.cam.projectionMatrix = m.multiply(l); this.r.resetState(); this.r.render(TJ.scene, this.cam); if (anim) v3.triggerRepaint(); },
onRemove(){ TJ.objs.clear(); TJ.scene = null; } }; }
function tjAdd(){ if (!v3 || !window.THREE) return; try { if (!v3.getLayer('tj3')) v3.addLayer(tjLayer()); TJ.ready = true; TJ.on = true; v3.getSource('mdl') && v3.getSource('mdl').setData(v3mdl(v3.getCenter())); v3.triggerRepaint(); } catch(e){ console.error('tj3', e); TJ.on = false; } }
{ const o3 = open3D; window.open3D = async function(){ const r = await o3.apply(this, arguments); try { if (v3 && !v3._dk){ v3._dk = 1; v3.on('dragstart', () => window.dockPan && dockPan(true)); v3.on('zoomstart', e => { if (e.originalEvent && window.dockPan) dockPan(true); }); v3.on('rotatestart', () => window.dockPan && dockPan(true)); v3.on('pitchstart', () => window.dockPan && dockPan(true)); v3.on('moveend', () => window.dockPan && dockPan(false)); } } catch(e){} if (v3cfg.tj === false) return r; loadThree().then(() => { if (!v3) return; if (v3.loaded()) tjAdd(); else v3.once('load', tjAdd); if (!TJ.sd){ TJ.sd = 1; } v3.on('styledata', () => { if (TJ.on && !v3.getLayer('tj3')) setTimeout(tjAdd, 50); }); }).catch(() => toast('Объёмные модели недоступны без сети — показаны упрощённые')); return r; }; }
{ const c3 = close3D; window.close3D = function(){ TJ.on = false; TJ.ready = false; TJ.origin = null; TJ.objs.clear(); return c3.apply(this, arguments); }; }
window.__mod_mk = 1;

// ======== 6.61: свет, небо и атмосфера в «Макете» — солнце по дате и времени, дымка, материалы склонов, облака, кинорежим ========
const ATM = Object.assign({on:1, now:1, min:720, date:'', sky:1, haze:.45, mat:0, snow:2500, cl:0, ch:1800, cd:.45, cine:0}, v3cfg.atm || {});
const atmSave = () => { const o = {}; ['on', 'now', 'min', 'date', 'sky', 'haze', 'mat', 'snow', 'cl', 'ch', 'cd', 'cine', 'stars', 'lbl'].forEach(k => { o[k] = ATM[k]; }); v3cfg.atm = o; lsSet('skat_v3', v3cfg); };
const RAD = Math.PI / 180;
function sunPos(t, lat, lng){ const d = t / 864e5 - .5 + 2440588 - 2451545, lw = -lng * RAD, phi = lat * RAD, M = RAD * (357.5291 + .98560028 * d), C = RAD * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)), Lg = M + C + RAD * 102.9372 + Math.PI, e = RAD * 23.4397;
const dec = Math.asin(Math.sin(e) * Math.sin(Lg)), ra = Math.atan2(Math.sin(Lg) * Math.cos(e), Math.cos(Lg)), H = RAD * (280.16 + 360.9856235 * d) - lw - ra;
const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)), alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)); return {az:(az / RAD + 180 + 360) % 360, alt:alt / RAD}; }
// палитра неба и света по высоте солнца (°)
const PAL = [[-90, {sky:'#02040b', hor:'#0a1122', fog:'#080e1c', lc:'#5d74b8', li:.12, sh:'#000510', hl:'#1a2340', ac:'#05070f', ex:.2, br:.28, sat:-.55, gc:'#1a2546', go:.55, gm:'multiply', cc:'#2a3150', hz:.25}],
[-12, {sky:'#060b1c', hor:'#1c2547', fog:'#141c36', lc:'#6b80c0', li:.16, sh:'#020818', hl:'#2a3560', ac:'#0b0f22', ex:.25, br:.38, sat:-.45, gc:'#26335e', go:.5, gm:'multiply', cc:'#3a4266', hz:.3}],
[-5, {sky:'#16264e', hor:'#8a5a6e', fog:'#5a4a62', lc:'#d08a7a', li:.25, sh:'#141838', hl:'#c07a68', ac:'#1d1c35', ex:.45, br:.6, sat:-.2, gc:'#5a4a7a', go:.35, gm:'multiply', cc:'#b9849a', hz:.45}],
[0, {sky:'#2a4a80', hor:'#ff8e4e', fog:'#e59a6e', lc:'#ff9e5e', li:.42, sh:'#1d2346', hl:'#ffb27a', ac:'#2a2440', ex:.65, br:.85, sat:.05, gc:'#ff8a3c', go:.32, gm:'soft-light', cc:'#ffb98a', hz:.55}],
[6, {sky:'#3c6cae', hor:'#ffc58e', fog:'#f0caa4', lc:'#ffd2a0', li:.4, sh:'#26304e', hl:'#ffe0b6', ac:'#2e3046', ex:.55, br:.95, sat:.08, gc:'#ffb065', go:.2, gm:'soft-light', cc:'#ffe2c4', hz:.5}],
[18, {sky:'#3f86d8', hor:'#cfe4f7', fog:'#dbe8f4', lc:'#ffffff', li:.38, sh:'#2f3a4a', hl:'#ffffff', ac:'#3a4250', ex:.4, br:1, sat:0, gc:'#ffffff', go:0, gm:'normal', cc:'#ffffff', hz:.45}],
[90, {sky:'#3a82d6', hor:'#d6e8f8', fog:'#e0ecf6', lc:'#ffffff', li:.35, sh:'#36404e', hl:'#ffffff', ac:'#3e4652', ex:.35, br:1, sat:0, gc:'#ffffff', go:0, gm:'normal', cc:'#ffffff', hz:.4}]];
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), hxs = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function palAt(alt){ let i = 0; while (i < PAL.length - 2 && alt > PAL[i + 1][0]) i++; const [a0, p0] = PAL[i], [a1, p1] = PAL[i + 1], f = Math.max(0, Math.min(1, (alt - a0) / (a1 - a0))), o = {};
Object.keys(p0).forEach(k => { const v0 = p0[k], v1 = p1[k]; o[k] = typeof v0 === 'number' ? v0 + (v1 - v0) * f : v0[0] === '#' ? hxs(hx(v0).map((c, j) => c + (hx(v1)[j] - c) * f)) : (f < .5 ? v0 : v1); }); return o; }
function atmTime(){ if (ATM.now) return Date.now(); const d = ATM.date ? new Date(ATM.date + 'T00:00') : new Date(); d.setHours(0, 0, 0, 0); return +d + ATM.min * 60000; }
function atmApply(){ if (!v3) return; const c = v3.getCenter(), t = atmTime(), sp = sunPos(t, c.lat, c.lng), on = ATM.on, P = on ? palAt(sp.alt) : palAt(30);
const pp = (l, k, v) => { try { v3.setPaintProperty(l, k, v); } catch(e){} };
pp('hs', 'hillshade-illumination-anchor', 'map'); pp('hs', 'hillshade-illumination-direction', on ? Math.round(sp.az) % 360 : 335); pp('hs', 'hillshade-exaggeration', on ? P.ex : .35);
pp('hs', 'hillshade-shadow-color', on ? P.sh : '#000000'); pp('hs', 'hillshade-highlight-color', on ? P.hl : '#ffffff'); pp('hs', 'hillshade-accent-color', on ? P.ac : '#000000');
pp('base', 'raster-brightness-max', on ? P.br : 1); pp('base', 'raster-saturation', on ? P.sat : 0);
try { v3.setLight({anchor:'map', position:[1.3, on ? sp.az : 210, on ? Math.max(5, Math.min(85, 90 - sp.alt)) : 40], color:on ? P.lc : '#ffffff', intensity:on ? P.li : .4}); } catch(e){}
const hz = ATM.haze; if (on && ATM.sky){ let ok = false; try { if (typeof v3.setSky === 'function'){ v3.setSky({'sky-color':P.sky, 'horizon-color':P.hor, 'fog-color':P.fog, 'sky-horizon-blend':.6 + .3 * hz, 'horizon-fog-blend':.3 + .6 * hz, 'fog-ground-blend':Math.max(.05, .95 - .85 * hz), 'atmosphere-blend':.8}); ok = true; } } catch(e){}
pp('bkg', 'background-color', ok ? '#5d6650' : P.hor); } else { try { if (typeof v3.setSky === 'function') v3.setSky({'sky-color':'#88b7e6', 'horizon-color':'#ffffff', 'fog-color':'#ffffff', 'fog-ground-blend':1, 'horizon-fog-blend':0, 'sky-horizon-blend':.5, 'atmosphere-blend':0}); } catch(e){} pp('bkg', 'background-color', '#5d6650'); }
const g = atmGrade(); g.style.background = on ? P.gc : 'transparent'; g.style.mixBlendMode = P.gm; g.style.opacity = on ? P.go : 0;
ATM.sun = sp; ATM.pal = P; matApply(); cloudTint(); const lb = $('atmT'); if (lb){ const d = new Date(t); lb.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · солнце ${sp.alt >= 0 ? sp.alt.toFixed(0) + '° над горизонтом' : (-sp.alt).toFixed(0) + '° под горизонтом'}, азимут ${sp.az.toFixed(0)}°`; } }
function atmGrade(){ let g = $('v3grade'); if (!g){ g = document.createElement('div'); g.id = 'v3grade'; $('v3d').insertBefore(g, $('v3map').nextSibling); } return g; }
// ---- материалы склонов: скалы по крутизне, снег по высоте (тайлы считаются из рельефа)
const mCache = new Map(); let mGen = 1;
async function demPx(z, x, y){ let buf; try { buf = await tileBytes(keyUrl('dem', z, x, y)); } catch(e){ const b = await parentTile(keyUrl('dem', '{z}', '{x}', '{y}'), z, x, y, true); if (!b) throw e; buf = await b.arrayBuffer(); } buf = await cleanDem(buf);
const bm = await createImageBitmap(new Blob([buf])), cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height; const g = cv.getContext('2d', {willReadFrequently:true}); g.drawImage(bm, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, h = new Float32Array(n);
for (let i = 0; i < n; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768; return {h, w:cv.width}; }
function matPaint(h, w, z, x, y, mode, snow){ const n = w * w, out = new Uint8ClampedArray(n * 4), lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + .5) / Math.pow(2, z)))), mpp = 40075016.7 * Math.cos(lat) / (w * Math.pow(2, z));
const at = (i, j) => h[Math.max(0, Math.min(w - 1, j)) * w + Math.max(0, Math.min(w - 1, i))];
for (let j = 0; j < w; j++) for (let i = 0; i < w; i++){ const e = at(i, j), dx = (at(i + 1, j) - at(i - 1, j)) / (2 * mpp), dy = (at(i, j + 1) - at(i, j - 1)) / (2 * mpp), sl = Math.atan(Math.hypot(dx, dy)) / RAD;
const gx = x * w + i, gy = y * w + j, nz = (Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453) % 1, ns = Math.abs(nz); let r = 0, g = 0, b = 0, a = 0;
if (sl > 26 && mode >= 1){ const k = Math.min(1, (sl - 26) / 22); r = 112 + 18 * ns; g = 104 + 14 * ns; b = 96 + 10 * ns; a = .62 * k; }
let sn = 0; if (mode === 2){ const line = snow + (ns - .5) * 160; if (e > line) sn = Math.min(1, (e - line) / 140); } else if (mode === 3) sn = .8;
if (sn > 0){ const st = sl < 38 ? 1 : sl < 55 ? 1 - (sl - 38) / 17 : 0; sn *= st * (.85 + .15 * ns); if (sn > 0){ const sr = 238 + 12 * ns, sg = 242 + 10 * ns, sb = 250; const A = sn + a * (1 - sn); if (A > 0){ r = (sr * sn + r * a * (1 - sn)) / A; g = (sg * sn + g * a * (1 - sn)) / A; b = (sb * sn + b * a * (1 - sn)) / A; } a = A; } }
const o = (j * w + i) * 4; out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = Math.round(a * 255); } return out; }
async function matTile(z, x, y){ const k = `${mGen}/${z}/${x}/${y}`; if (mCache.has(k)) return mCache.get(k); const {h, w} = await demPx(z, x, y), px = matPaint(h, w, z, x, y, ATM.mat, ATM.snow);
const cv = document.createElement('canvas'); cv.width = cv.height = w; cv.getContext('2d').putImageData(new ImageData(px, w, w), 0, 0); const bl = await new Promise(r => cv.toBlob(r, 'image/png')), ab = await bl.arrayBuffer();
mCache.set(k, ab); if (mCache.size > 300) mCache.delete(mCache.keys().next().value); return ab; }
function matApply(){ if (!v3) return; const want = ATM.mat > 0; try { if (want && !v3.getSource('mat')){ v3.addSource('mat', {type:'raster', tiles:[`skat://mat/{z}/{x}/{y}?g=${mGen}`], tileSize:256, maxzoom:14}); v3.addLayer({id:'mat', type:'raster', source:'mat', paint:{'raster-opacity':.92, 'raster-fade-duration':0, 'raster-resampling':'linear'}}, 'hs'); }
if (!want && v3.getSource('mat')){ v3.removeLayer('mat'); v3.removeSource('mat'); } if (want && ATM.pal) v3.setPaintProperty('mat', 'raster-brightness-max', ATM.on ? Math.min(1, ATM.pal.br + .05) : 1); } catch(e){ console.warn('mat', e); } }
function matReload(){ mGen++; if (!v3) return; try { if (v3.getSource('mat')){ v3.removeLayer('mat'); v3.removeSource('mat'); } } catch(e){} matApply(); }
// ---- облака: два-три полупрозрачных слоя на заданной высоте (лёгкий вариант без объёмного просчёта)
let CLD = null;
function cloudTex(){ const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const g = cv.getContext('2d'), im = g.createImageData(N, N);
const lat = (s0, gx, gy) => { const m = s0 * 4096 + ((gx % s0 + s0) % s0) * 64 + ((gy % s0 + s0) % s0); const v = Math.sin(m * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const vn = (x, y, s0) => { const fx = x * s0 / N, fy = y * s0 / N, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
const a = lat(s0, ix, iy), b = lat(s0, ix + 1, iy), c = lat(s0, ix, iy + 1), d = lat(s0, ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++){ let v = 0, amp = .5; for (const s0 of [4, 8, 16, 32, 64]){ v += vn(x, y, s0) * amp; amp *= .5; } const o = (y * N + x) * 4, c = Math.round(Math.min(1, v / .97) * 255); im.data[o] = im.data[o + 1] = im.data[o + 2] = c; im.data[o + 3] = 255; }
g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function cloudLayer(){ return {id:'cld3', type:'custom', renderingMode:'3d',
onAdd(map, gl){ const T = THREE; this.cam = new T.Camera(); this.scene = new T.Scene(); const tex = cloudTex(); this.mats = [];
const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const fs = 'uniform sampler2D t; uniform vec2 off; uniform float rep, cov, op; uniform vec3 col, sh; varying vec2 vUv; void main(){ float n = texture2D(t, vUv * rep + off).r; float n2 = texture2D(t, vUv * rep * 2.7 - off * 1.6).r; float v = n * .72 + n2 * .28; float d = smoothstep(cov, cov + .22, v); float e = 1.0 - smoothstep(.3, .5, length(vUv - .5)); vec3 c = mix(sh, col, smoothstep(cov, cov + .45, v)); gl_FragColor = vec4(c, d * e * op); }';
[0, 1, 2].forEach(k => { const m = new T.ShaderMaterial({vertexShader:vs, fragmentShader:fs, transparent:true, depthWrite:false, side:T.DoubleSide, uniforms:{t:{value:tex}, off:{value:new T.Vector2(k * .37, k * .21)}, rep:{value:5 + k * 1.5}, cov:{value:.5}, op:{value:.9 - k * .2}, col:{value:new T.Color('#ffffff')}, sh:{value:new T.Color('#9aa4b4')}}});
const pl = new T.Mesh(new T.PlaneGeometry(1, 1), m); pl.userData.k = k; this.scene.add(pl); this.mats.push(m); });
this.r = new T.WebGLRenderer({canvas:map.getCanvas(), context:gl, antialias:true}); this.r.autoClear = false; CLD = this; cloudTint(); },
render(gl, matrix){ matrix = mtx(matrix); const T = THREE; if (!v3 || !ATM.cl) return; const c = this.c0 || (this.c0 = v3.getCenter()); if (v3.getCenter().distanceTo(c) > 15000) this.c0 = v3.getCenter(); const ex = +$('v3ex').value || 1, R = 60000;
const now = performance.now() / 1000; this.mats.forEach((m, k) => { m.uniforms.off.value.set(k * .37 + now * .0016 * (1 + k * .3), k * .21 + now * .0009); m.uniforms.cov.value = .78 - ATM.cd * .5 + k * .04; });
this.scene.children.forEach(pl => { const k = pl.userData.k, alt = (ATM.ch + k * 90) * ex, o = maplibregl.MercatorCoordinate.fromLngLat([this.c0.lng, this.c0.lat], alt), s = o.meterInMercatorCoordinateUnits() * R * 2; pl.matrixAutoUpdate = false; pl.matrix.makeTranslation(o.x, o.y, o.z).scale(new T.Vector3(s, s, 1)); });
this.cam.projectionMatrix = new T.Matrix4().fromArray(matrix); this.r.resetState(); this.r.render(this.scene, this.cam); v3.triggerRepaint(); },
onRemove(){ CLD = null; } }; }
function cloudTint(){ if (!CLD || !ATM.pal) return; const P = ATM.pal; CLD.mats.forEach(m => { m.uniforms.col.value.set(ATM.on ? P.cc : '#ffffff'); m.uniforms.sh.value.set(ATM.on ? hxs(hx(P.cc).map(v => v * .55)) : '#9aa4b4'); }); }
async function cloudApply(){ if (!v3) return; if (ATM.cl){ try { await loadThree(); } catch(e){ toast('Облакам нужна библиотека Three.js — откройте один раз с интернетом'); ATM.cl = 0; atmSave(); return; } if (!v3.getLayer('cld3')) try { v3.addLayer(cloudLayer()); } catch(e){ console.warn('cld', e); } } else if (v3.getLayer('cld3')) try { v3.removeLayer('cld3'); } catch(e){} v3.triggerRepaint(); }
// ---- кинорежим, облёт, пролёт по маршруту, снимок
let CAM = null;
function cineApply(){ const d = $('v3d'); d.classList.toggle('cine', !!ATM.cine); let gr = $('v3grain'); if (ATM.cine && !gr){ gr = document.createElement('div'); gr.id = 'v3grain'; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), im = g.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4){ const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 26; } g.putImageData(im, 0, 0); gr.style.backgroundImage = `url(${cv.toDataURL()})`; d.insertBefore(gr, $('v3grade').nextSibling); } }
function camStop(){ if (CAM){ cancelAnimationFrame(CAM.raf); CAM = null; } const b = $('v3camBar'); if (b) b.remove(); }
function camBar(t){ let b = $('v3camBar'); if (!b){ b = document.createElement('div'); b.id = 'v3camBar'; b.className = 'glass'; $('v3d').appendChild(b); } b.innerHTML = `<span>${t}</span><button class="ghost" id="v3camX">Стоп</button>`; $('v3camX').onclick = camStop; }
function orbit(){ camStop(); if (!v3) return; CAM = {}; let last = performance.now(); try { v3.easeTo({pitch:Math.max(v3.getPitch(), 62), duration:800}); } catch(e){} const step = t => { if (!CAM) return; const dt = Math.min(64, t - last); last = t; try { v3.setBearing(v3.getBearing() + dt * .006); } catch(e){} CAM.raf = requestAnimationFrame(step); }; CAM.raf = requestAnimationFrame(step); camBar('Облёт вокруг центра'); }
function flyPaths(){ const o = []; state.arrays.forEach(a => { if (a.hidden || /^Макет:/.test(a.name)) return; if (a.kind === 'route' && a.points.length > 1) o.push({n:'Маршрут «' + a.name + '»', P:a.points.map(p => [p.lng, p.lat])}); (a.shapes || []).forEach(s => { if (s.type === 'line' && (s.pts || []).length > 1) o.push({n:'Линия «' + (s.name || a.name) + '»', P:s.pts.map(q => [q[1] ?? q.lng, q[0] ?? q.lat])}); }); }); return o; }
function flyRun(F){ camStop(); if (!v3) return; const P = F.P, seg = [0]; for (let i = 1; i < P.length; i++) seg.push(seg[i - 1] + distM({lat:P[i - 1][1], lng:P[i - 1][0]}, {lat:P[i][1], lng:P[i][0]})); const L0 = seg[seg.length - 1]; if (L0 < 50){ toast('Маршрут слишком короткий'); return; }
const at = d => { d = Math.max(0, Math.min(L0, d)); let i = 1; while (i < seg.length - 1 && seg[i] < d) i++; const f = (d - seg[i - 1]) / ((seg[i] - seg[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f]; };
const dur = Math.max(15, Math.min(90, L0 / 400)) * 1000, ahead = Math.min(1500, L0 * .1); let t0 = null, br = v3.getBearing(); CAM = {};
const step = t => { if (!CAM) return; if (t0 == null) t0 = t; const k = (t - t0) / dur; if (k >= 1){ camStop(); toast('Пролёт окончен'); return; } const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, d = e * L0, p = at(d + ahead), q = at(d + ahead + 200);
const tb = (Math.atan2((q[0] - p[0]) * Math.cos(p[1] * RAD), q[1] - p[1]) / RAD + 360) % 360; let db = ((tb - br + 540) % 360) - 180; br += db * .04; try { v3.jumpTo({center:p, bearing:br, pitch:74, zoom:14.2}); } catch(e){} CAM.raf = requestAnimationFrame(step); };
CAM.raf = requestAnimationFrame(step); camBar('Пролёт: ' + escapeHtml(F.n)); }
async function shot(){ if (!v3) return; await new Promise(r => { v3.once('render', r); v3.triggerRepaint(); }); const src = v3.getCanvas(), W = src.width, H = src.height, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.drawImage(src, 0, 0);
const gd = $('v3grade'), P = ATM.pal; if (ATM.on && P && P.go > 0){ g.globalAlpha = P.go; g.globalCompositeOperation = P.gm === 'multiply' ? 'multiply' : P.gm === 'soft-light' ? 'soft-light' : 'source-over'; g.fillStyle = P.gc; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
if (ATM.cine){ const r = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = r; g.fillRect(0, 0, W, H); const im = g.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4){ const n = (Math.random() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); const bh = Math.round(H * .07); g.fillStyle = '#000'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh); }
cv.toBlob(b => deliverFile(b, `СКАТ_макет_${stamp()}.jpg`, `Кадр готов: ${W}×${H}`), 'image/jpeg', .92); }
// ---- панель «Свет и небо»
function atmPanel(){ let p = $('v3atm'); if (!p){ p = document.createElement('div'); p.id = 'v3atm'; p.className = 'glass'; $('v3d').appendChild(p); } const dd = ATM.date || new Date().toISOString().slice(0, 10), m = ATM.now ? (() => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); })() : ATM.min;
p.innerHTML = `<div class="atmH"><b>☀ Свет и небо</b><button class="ghost sm" id="atmX">✕</button></div>
<label class="atmC"><input type="checkbox" id="atmOn" ${ATM.on ? 'checked' : ''}> Солнце по дате и времени</label>
<div class="atmR"><input type="date" id="atmD" value="${dd}"><button class="ghost sm${ATM.now ? ' on' : ''}" id="atmNow">Сейчас</button><button class="ghost sm" id="atmDay">▶ Сутки</button></div>
<input type="range" id="atmM" min="0" max="1439" step="5" value="${m}"><small id="atmT"></small>
<label class="atmC"><input type="checkbox" id="atmSky" ${ATM.sky ? 'checked' : ''}> Небо и дымка</label><label class="atmS">Дымка <input type="range" id="atmHz" min="0" max="1" step=".05" value="${ATM.haze}"></label>
<label class="atmS">Склоны <select id="atmMat"><option value="0">как на карте</option><option value="1">скалы на крутых склонах</option><option value="2">скалы и снег выше отметки</option><option value="3">зима (снег везде)</option></select></label>
<label class="atmS" id="atmSnL">Снег выше, м <input type="number" id="atmSn" value="${ATM.snow}" step="100" style="width:90px"></label>
<label class="atmC"><input type="checkbox" id="atmCl" ${ATM.cl ? 'checked' : ''}> Облака</label><label class="atmS">Высота, м <input type="range" id="atmCh" min="300" max="6000" step="100" value="${ATM.ch}"><span id="atmChV">${ATM.ch}</span></label><label class="atmS">Плотность <input type="range" id="atmCd" min="0" max="1" step=".05" value="${ATM.cd}"></label>
<label class="atmC"><input type="checkbox" id="atmCi" ${ATM.cine ? 'checked' : ''}> Кинорежим (виньетка, зерно, полосы)</label>
<div class="atmR"><button class="ghost sm" id="atmOr">⟳ Облёт</button><button class="ghost sm" id="atmFl">✈ Пролёт по маршруту</button><button class="primary sm" id="atmSh">📷 Кадр</button></div>`;
$('atmMat').value = ATM.mat; $('atmSnL').style.display = ATM.mat === 2 ? '' : 'none';
const ch = (id, f) => { $(id).onchange = e => { f(e.target); atmSave(); }; };
$('atmX').onclick = () => p.classList.remove('on'); ch('atmOn', t => { ATM.on = t.checked ? 1 : 0; atmApply(); }); ch('atmD', t => { ATM.date = t.value; ATM.now = 0; $('atmNow').classList.remove('on'); atmApply(); });
$('atmM').oninput = e => { ATM.min = +e.target.value; ATM.now = 0; $('atmNow').classList.remove('on'); atmApply(); }; $('atmM').onchange = atmSave;
$('atmNow').onclick = () => { ATM.now = 1; ATM.date = ''; atmSave(); atmPanel(); atmApply(); };
$('atmDay').onclick = () => { if (ATM.anim){ clearInterval(ATM.anim); ATM.anim = 0; $('atmDay').textContent = '▶ Сутки'; return; } ATM.now = 0; $('atmNow').classList.remove('on'); $('atmDay').textContent = '⏸'; ATM.anim = setInterval(() => { ATM.min = (ATM.min + 6) % 1440; const r = $('atmM'); if (r) r.value = ATM.min; atmApply(); if (!$('v3d').classList.contains('on')){ clearInterval(ATM.anim); ATM.anim = 0; } }, 60); };
ch('atmSky', t => { ATM.sky = t.checked ? 1 : 0; atmApply(); }); $('atmHz').oninput = e => { ATM.haze = +e.target.value; atmApply(); }; $('atmHz').onchange = atmSave;
ch('atmMat', t => { ATM.mat = +t.value; $('atmSnL').style.display = ATM.mat === 2 ? '' : 'none'; matReload(); atmApply(); }); ch('atmSn', t => { ATM.snow = +t.value || 2500; matReload(); });
ch('atmCl', t => { ATM.cl = t.checked ? 1 : 0; cloudApply(); }); $('atmCh').oninput = e => { ATM.ch = +e.target.value; $('atmChV').textContent = ATM.ch; v3 && v3.triggerRepaint(); }; $('atmCh').onchange = atmSave; $('atmCd').oninput = e => { ATM.cd = +e.target.value; v3 && v3.triggerRepaint(); }; $('atmCd').onchange = atmSave;
ch('atmCi', t => { ATM.cine = t.checked ? 1 : 0; cineApply(); }); $('atmOr').onclick = orbit; $('atmSh').onclick = shot;
$('atmFl').onclick = () => { const L1 = flyPaths(); if (!L1.length){ toast('Нет видимых маршрутов или линий. Нарисуйте маршрут в 2D.'); return; } if (L1.length === 1){ flyRun(L1[0]); return; } const s0 = prompt('Номер маршрута:\n' + L1.map((x, i) => `${i + 1}. ${x.n}`).join('\n'), '1'); const F = L1[(+s0 || 0) - 1]; if (F) flyRun(F); };
p.classList.add('on'); atmApply(); }
function atmInit(){ if (!v3) return; let b = $('v3atmB'); if (!b){ b = document.createElement('button'); b.id = 'v3atmB'; b.className = 'glass'; b.textContent = '☀ Свет'; b.onclick = () => { const p = $('v3atm'); if (p && p.classList.contains('on')) p.classList.remove('on'); else atmPanel(); }; $('v3top').appendChild(b); }
atmGrade(); cineApply(); const go = () => { mCache.clear(); atmApply(); cloudApply(); }; if (v3.loaded()) go(); else v3.once('load', go); clearInterval(ATM.tick); ATM.tick = setInterval(() => { if (ATM.now && v3 && $('v3d').classList.contains('on')) atmApply(); }, 60000);
v3.on('moveend', () => { if (ATM.on) atmApply(); }); }
{ const oA = window.open3D; window.open3D = async function(){ const r = await oA.apply(this, arguments); try { atmInit(); } catch(e){ console.warn('atm', e); } return r; }; }
{ const cA = window.close3D; window.close3D = function(){ camStop(); if (ATM.anim){ clearInterval(ATM.anim); ATM.anim = 0; } const p = $('v3atm'); if (p) p.classList.remove('on'); return cA.apply(this, arguments); }; }
{ const st = document.createElement('style'); st.textContent = `#v3grade{position:absolute;inset:0;pointer-events:none;z-index:1;transition:opacity .4s,background .4s}#v3grain{position:absolute;inset:0;pointer-events:none;z-index:2;animation:v3gr .5s steps(4) infinite;opacity:.9}@keyframes v3gr{0%{background-position:0 0}25%{background-position:-37px 21px}50%{background-position:53px -17px}75%{background-position:-11px -43px}}
#v3d.cine #v3map::after{content:''}#v3d.cine::before,#v3d.cine::after{content:'';position:absolute;left:0;right:0;height:7%;background:#000;z-index:3;pointer-events:none}#v3d.cine::before{top:0}#v3d.cine::after{bottom:0}#v3d.cine #v3grade{box-shadow:inset 0 0 22vmin 6vmin rgba(0,0,0,.55)}
#v3atm{position:absolute;right:10px;top:calc(var(--safe-t, 0px) + 64px);z-index:6;width:min(340px,calc(100vw - 20px));max-height:calc(100% - 140px);overflow:auto;padding:10px 12px;border-radius:14px;display:none;flex-direction:column;gap:6px}#v3atm.on{display:flex}#v3atm .atmH{display:flex;align-items:center;justify-content:space-between}
#v3atm .atmC{display:flex;align-items:center;gap:8px;font-size:14px}#v3atm .atmC input{width:20px;min-height:20px;margin:0}#v3atm .atmS{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mute)}#v3atm .atmS input[type=range]{flex:1}#v3atm .atmR{display:flex;gap:6px;flex-wrap:wrap}#v3atm input[type=range]{width:100%}#v3atm small{color:var(--mute)}
#v3camBar{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%);z-index:7;display:flex;gap:10px;align-items:center;padding:6px 10px;border-radius:12px}`; document.head.appendChild(st); }

// ======== 6.62: MapLibre 5 (с откатом на 4.7.1), источник высот Mapterhorn, звёздное небо в 3D, «Макет участка» ========
const mtx = m => m && m.modelViewProjectionMatrix ? m.modelViewProjectionMatrix : m && m.defaultProjectionData ? m.defaultProjectionData.mainMatrix : m;
const mkQ = () => (window.SKAT_DEV && window.SKAT_DEV.q != null) ? window.SKAT_DEV.q : 2;
const mkDpr = () => Math.min(devicePixelRatio || 1, [1, 1, 1.5, 2][mkQ()] || 1.5);
// источник высот: Mapterhorn (Copernicus GLO-30, 512 px) или AWS Terrarium; проверка доступности при первом открытии
let DEMP = 'aws', DEMPROBED = false; const mtUrl = (z, x, y) => `https://tiles.mapterhorn.com/${z}/${x}/${y}.webp`;
function demSrcDef(){ return DEMP === 'mt' ? {type:'raster-dem', tiles:['skat://dem/{z}/{x}/{y}'], tileSize:512, encoding:'terrarium', maxzoom:12} : {type:'raster-dem', tiles:['skat://dem/{z}/{x}/{y}'], tileSize:256, encoding:'terrarium', maxzoom:14}; }
async function demProbe(){ if (DEMPROBED) return; DEMPROBED = true; if ((v3cfg.dem || 'mt') === 'aws'){ DEMP = 'aws'; return; } const c = map.getCenter(), z = 8, n = 1 << z, x = Math.floor((c.lng + 180) / 360 * n), y = Math.floor((1 - Math.log(Math.tan(Math.PI / 4 + c.lat * Math.PI / 360)) / Math.PI) / 2 * n);
try { const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 6000); const r = await fetch(mtUrl(z, x, y), {signal:ac.signal}); clearTimeout(tm); if (!r.ok) throw 0; DEMP = 'mt'; } catch(e){ DEMP = 'aws'; if (navigator.onLine !== false) toast('Высоты Mapterhorn недоступны — использую AWS Terrarium'); } }
{ const oP = window.open3D; window.open3D = async function(){ await demProbe(); return oP.apply(this, arguments); }; }
// ---- общие помощники WebGL
function glProg(gl, vs, fs){ const mk = (t, s0) => { const o = gl.createShader(t); gl.shaderSource(o, s0); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
const A = {}, U = {}; for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++){ const a = gl.getActiveAttrib(p, i); A[a.name] = gl.getAttribLocation(p, a.name); } for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++){ const u = gl.getActiveUniform(p, i); U[u.name.replace('[0]', '')] = gl.getUniformLocation(p, u.name); } return {p, A, U}; }
function glAttr(gl, P, buf, specs, stride){ gl.bindBuffer(gl.ARRAY_BUFFER, buf); let off = 0; specs.forEach(([n, k]) => { const l = P.A[n]; if (l != null && l >= 0){ gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, stride * 4, off * 4); } off += k; }); }
function glOff(gl, P){ Object.values(P.A).forEach(l => { if (l >= 0) gl.disableVertexAttribArray(l); }); }
const SKY_VS = 'uniform mat4 uM; uniform float uDpr; attribute vec3 aD; attribute float aS; attribute vec4 aC; varying vec4 vC; void main(){ vec4 p = uM * vec4(aD, 0.0); p.z = p.w * 0.99999; gl_Position = p; gl_PointSize = aS * uDpr; vC = aC; }';
const SKY_FS = 'precision mediump float; varying vec4 vC; uniform float uPt; void main(){ if (uPt > 0.5){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float a = smoothstep(0.5, 0.05, d); gl_FragColor = vec4(vC.rgb * (1.0 + 0.6 * smoothstep(0.25, 0.0, d)), vC.a * a); } else gl_FragColor = vC; }';
// ---- звёздное небо: точки, линии созвездий, подписи; ENU (восток, север, верх) → оси сцены задаёт map3
const RED = {bet:1, ant:1, ald:1, arc:1, plx:.6, mrk:.3}, BLU = {rig:1, spi:1, veg:1, reg:1, alh:.6, sir:.7, den:.5, cst:.5};
function skyData(t, lat, lng, map3, sel){ if (!window.SKY) return null; const A = SKY.all(t, lat, lng), sun = A.find(o => o.k === 'sun'), nf = SKY.nightF(sun.alt), lim = SKY.limMag(sun.alt), P = [], Ln = [], lab = [], dirOf = {};
const enu = o => [Math.sin(o.az * RAD) * Math.cos(o.alt * RAD), Math.cos(o.az * RAD) * Math.cos(o.alt * RAD), Math.sin(o.alt * RAD)], hz = alt => Math.max(0, Math.min(1, (alt + 1) / 7));
A.forEach(o => { const d = map3(enu(o)); dirOf[o.k] = {d, o}; let a, sz, col = [1, .97, .9];
if (o.k === 'sun'){ if (o.alt < -2) return; a = 1; sz = 30; col = [1, .86, .55]; } else if (o.k === 'moon'){ a = Math.max(.25, 1 - nf * 0) * Math.min(1, o.ill * 3 + .15); sz = 18 + 6 * o.ill; col = [.95, .95, .88]; }
else { a = o.m <= lim ? Math.min(1, (lim - o.m + .6) / 1.6) : 0; if (o.t === 'p') a = Math.min(1, a + .2); sz = Math.max(1.8, Math.min(8.5, 6.2 - o.m * 1.05)) + (o.t === 'p' ? 1.5 : 0); if (RED[o.k]) col = [1, .62 + .2 * (1 - RED[o.k]), .45]; else if (BLU[o.k]) col = [.72, .82, 1]; if (o.k === 'mar') col = [1, .6, .42]; if (o.k === 'jup' || o.k === 'sat') col = [1, .94, .8]; }
a *= hz(o.alt); if (a <= .01) return; P.push(...d, sz, ...col, a); if (o.alt > 3 && (o.t === 'p' || o.k === 'pol' || o.m < 1.6)) lab.push({k:o.k, n:o.k === 'moon' ? `Луна ${Math.round(o.ill * 100)}%` : o.n, d, a, pri:o.k === 'pol' ? 3 : o.t === 'p' ? 2 : 1}); });
if (SKY.bg && nf > .05) SKY.bg.forEach(([ra100, de100, m10]) => { const m = m10 / 10; if (m > lim) return; const [ra, de] = SKY.prec(ra100 / 100, de100 / 100, t), h = SKY.hor(ra, de, t, lat, lng); if (h.alt < 0) return; const a = Math.min(.85, (lim - m + .4) / 2.2) * nf * hz(h.alt); if (a < .03) return; P.push(...map3(enu(h)), Math.max(1.2, 3.6 - m * .45), .9, .92, 1, a); });
const la = nf * .38; Object.entries(SKY.CON).forEach(([cn, segs]) => { const hi = sel && sel === cn, al = hi ? .95 : la; if (al < .02) return; segs.forEach(([p0, p1]) => { const A0 = dirOf[p0], A1 = dirOf[p1]; if (!A0 || !A1 || (A0.o.alt < -2 && A1.o.alt < -2)) return; const c = hi ? [1, .85, .35, al] : [.55, .72, 1, al]; Ln.push(...A0.d, 0, ...c, ...A1.d, 0, ...c); }); });
const dP = dirOf.pol, dD = dirOf.dub, dM = dirOf.mer; if (nf > .2 && dP && dD && dM && dP.o.alt > 0){ const c = [1, .9, .4, .55 * nf]; Ln.push(...dM.d, 0, ...c, ...dP.d, 0, ...c); }
Object.entries(SKY.CON).forEach(([cn, segs]) => { if (nf < .35) return; const ks = [...new Set(segs.flat())].map(k => dirOf[k]).filter(Boolean); if (!ks.length || ks.every(x => x.o.alt < 8)) return; const m = [0, 0, 0]; ks.forEach(x => { m[0] += x.d[0]; m[1] += x.d[1]; m[2] += x.d[2]; }); const l = Math.hypot(...m); lab.push({k:'c:' + cn, n:cn, d:m.map(v => v / l), a:nf * .7, pri:0, con:1}); });
return {P:new Float32Array(P), L:new Float32Array(Ln), lab, sun, dirOf, nf}; }
function skyProject(M, d, W, H){ const cx = M[0] * d[0] + M[4] * d[1] + M[8] * d[2], cy = M[1] * d[0] + M[5] * d[1] + M[9] * d[2], cw = M[3] * d[0] + M[7] * d[1] + M[11] * d[2]; if (cw <= 1e-9) return null; const x = (cx / cw * .5 + .5) * W, y = (1 - (cy / cw * .5 + .5)) * H; return x < -40 || y < -40 || x > W + 40 || y > H + 40 ? null : [x, y]; }
function skyLabels(host, D, M, W, H){ if (!host) return; if (!D){ host.innerHTML = ''; return; } let h = ''; const used = []; D.lab.slice().sort((p, q) => q.pri - p.pri).forEach(l => { const s0 = skyProject(M, l.d, W, H); if (!s0) return; if (used.some(u => Math.abs(u[0] - s0[0]) < 60 && Math.abs(u[1] - s0[1]) < 16)) return; used.push(s0);
h += `<span class="${l.con ? 'skL con' : 'skL'}" style="left:${s0[0].toFixed(0)}px;top:${s0[1].toFixed(0)}px;opacity:${Math.min(1, l.a + .25).toFixed(2)}">${escapeHtml(l.n)}</span>`; }); host.innerHTML = h; }
function skyPick(D, M, W, H, px, py){ if (!D) return null; let best = null, bd = 30; Object.entries(D.dirOf).forEach(([k, x]) => { if (x.o.alt < 0 || (x.o.t === 's' && x.o.m > SKY.limMag(D.sun.alt) + .5 && D.nf < .9)) return; const s0 = skyProject(M, x.d, W, H); if (!s0) return; const d = Math.hypot(s0[0] - px, s0[1] - py); if (d < bd){ bd = d; best = x.o; } }); return best; }
function skyCardShow(host, o, t, lat, lng){ if (!host) return; if (!o){ host.classList.remove('on'); return; } host.innerHTML = `<button class="ghost sm skX">✕</button>` + (window.skyCardHtml ? skyCardHtml(o.k, t, lat, lng) : escapeHtml(o.n)); host.classList.add('on'); host.querySelector('.skX').onclick = () => host.classList.remove('on'); }
// ---- звёзды в 3D-просмотре (слой MapLibre)
let SKYV = null;
function skyLayer3(){ return {id:'sky3', type:'custom', renderingMode:'3d',
onAdd(map, gl){ this.gl = gl; try { this.P = glProg(gl, SKY_VS, SKY_FS); } catch(e){ console.warn('sky3', e); return; } this.bp = gl.createBuffer(); this.bl = gl.createBuffer(); SKYV = this; skyUpd3(true); },
render(gl, m){ if (!this.P || !ATM.stars || !this.D) return; const M = mtx(m); this.M = M; const P = this.P; gl.useProgram(P.p); gl.uniformMatrix4fv(P.U.uM, false, M); gl.uniform1f(P.U.uDpr, mkDpr());
gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(false);
if (this.nl){ gl.uniform1f(P.U.uPt, 0); glAttr(gl, P, this.bl, [['aD', 3], ['aS', 1], ['aC', 4]], 8); gl.drawArrays(gl.LINES, 0, this.nl); }
if (this.np){ gl.uniform1f(P.U.uPt, 1); glAttr(gl, P, this.bp, [['aD', 3], ['aS', 1], ['aC', 4]], 8); gl.drawArrays(gl.POINTS, 0, this.np); } glOff(gl, P); gl.depthMask(true);
if (!this.lq){ this.lq = 1; requestAnimationFrame(() => { this.lq = 0; skyLab3(); }); } },
onRemove(){ SKYV = null; const h = $('v3skyL'); if (h) h.innerHTML = ''; } }; }
function skyUpd3(force){ const L0 = SKYV; if (!L0 || !v3 || !window.SKY) return; const c = v3.getCenter(), t = atmTime(); if (!force && L0.t && Math.abs(t - L0.t) < 20000 && L0.c && Math.abs(L0.c.lat - c.lat) + Math.abs(L0.c.lng - c.lng) < .3) return;
const D = skyData(t, c.lat, c.lng, e => [e[0], -e[1], e[2]], L0.sel); if (!D) return; L0.D = D; L0.t = t; L0.c = c; const gl = L0.gl; if (!gl) return;
gl.bindBuffer(gl.ARRAY_BUFFER, L0.bp); gl.bufferData(gl.ARRAY_BUFFER, D.P, gl.DYNAMIC_DRAW); L0.np = D.P.length / 8; gl.bindBuffer(gl.ARRAY_BUFFER, L0.bl); gl.bufferData(gl.ARRAY_BUFFER, D.L, gl.DYNAMIC_DRAW); L0.nl = D.L.length / 8; v3.triggerRepaint(); }
function skyLab3(){ let h = $('v3skyL'); if (!h){ h = document.createElement('div'); h.id = 'v3skyL'; $('v3d').appendChild(h); } const L0 = SKYV; if (!L0 || !ATM.stars || !ATM.lbl || !L0.M || v3.getPitch() < 40){ h.innerHTML = ''; return; } const cv = v3.getCanvas(); skyLabels(h, L0.D, L0.M, cv.clientWidth, cv.clientHeight); }
async function skyApply3(){ if (!v3) return; if (ATM.stars){ if (window.skyBg) skyBg().then(() => skyUpd3(true)); if (!v3.getLayer('sky3')) try { v3.addLayer(skyLayer3()); } catch(e){ console.warn('sky3', e); } else skyUpd3(true); } else { if (v3.getLayer('sky3')) try { v3.removeLayer('sky3'); } catch(e){} const h = $('v3skyL'); if (h) h.innerHTML = ''; } }
function skyTap3(e){ const L0 = SKYV; if (!L0 || !ATM.stars || !L0.M) return; const cv = v3.getCanvas(), o = skyPick(L0.D, L0.M, cv.clientWidth, cv.clientHeight, e.point.x, e.point.y); let c = $('v3skyC'); if (!c){ c = document.createElement('div'); c.id = 'v3skyC'; c.className = 'glass'; $('v3d').appendChild(c); }
if (!o) return; const cc = v3.getCenter(); skyCardShow(c, o, atmTime(), cc.lat, cc.lng); L0.sel = o.c || null; skyUpd3(true); }
ATM.stars = ATM.stars ?? 1; ATM.lbl = ATM.lbl ?? 1;
{ const aA = atmApply; atmApply = function(){ aA.apply(this, arguments); try { skyUpd3(); } catch(e){} }; }
{ const aI = atmInit; atmInit = function(){ aI.apply(this, arguments); if (!v3) return; const go1 = () => skyApply3(); if (v3.loaded()) go1(); else v3.once('load', go1); v3.on('click', skyTap3); v3.on('move', () => { if (SKYV && !SKYV.lq){ SKYV.lq = 1; requestAnimationFrame(() => { SKYV && (SKYV.lq = 0); skyLab3(); }); } });
try { v3.setPaintProperty('hs', 'hillshade-method', 'igor'); } catch(e){} }; }
{ const aP = atmPanel; atmPanel = function(){ aP.apply(this, arguments); const p = $('v3atm'); if (!p || $('atmSt')) return; const r = p.querySelector('#atmCi').closest('label');
r.insertAdjacentHTML('beforebegin', `<label class="atmC"><input type="checkbox" id="atmSt" ${ATM.stars ? 'checked' : ''}> Звёзды, планеты, созвездия</label><label class="atmC"><input type="checkbox" id="atmLb" ${ATM.lbl ? 'checked' : ''}> Подписи светил (касание — азимут и д.у.)</label><label class="atmC"><input type="checkbox" id="atmMl4" ${lsGet('skat_ml4', 0) ? 'checked' : ''}> Старый движок 3D (MapLibre 4.7) — если с новым что-то не так</label><label class="atmS">Высоты <select id="atmDem"><option value="mt">Mapterhorn (Copernicus 30 м)</option><option value="aws">AWS Terrarium (SRTM)</option></select></label>`);
$('atmDem').value = v3cfg.dem || 'mt'; $('atmMl4').onchange = e => { lsSet('skat_ml4', e.target.checked ? 1 : 0); toast('Применится после перезапуска приложения'); }; $('atmSt').onchange = e => { ATM.stars = e.target.checked ? 1 : 0; atmSave2(); skyApply3(); }; $('atmLb').onchange = e => { ATM.lbl = e.target.checked ? 1 : 0; atmSave2(); skyLab3(); };
$('atmDem').onchange = e => { v3cfg.dem = e.target.value; lsSet('skat_v3', v3cfg); DEMPROBED = false; toast('Источник высот сменится при следующем открытии 3D'); };
const bx = p.querySelector('#atmSh'); bx.insertAdjacentHTML('afterend', '<button class="primary sm" id="atmSb">🧱 Макет участка</button>'); $('atmSb').onclick = () => sbStart(); }; }
const atmSave2 = () => atmSave();
// ---- «Макет участка»: отдельная сцена WebGL — детальный рельеф «на подставке», снимок, свет по солнцу, тени, сетка СК-42, горизонтали, знаки, зона видимости, небо
const SBQ = q => [null, {N:256, tex:2048, S:256}, {N:512, tex:2048, S:384}, {N:768, tex:4096, S:512}][Math.max(1, Math.min(3, q))];
let SB = null;
const mX = lng => (lng + 180) / 360, mY = lat => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2, iX = x => x * 360 - 180, iY = y => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;
// матрицы 4×4 (по столбцам)
const m4 = {persp(f, a, n, fr){ const t = 1 / Math.tan(f / 2), r = new Float32Array(16); r[0] = t / a; r[5] = t; r[10] = (fr + n) / (n - fr); r[11] = -1; r[14] = 2 * fr * n / (n - fr); return r; },
look(e, c, u){ let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; const zl = Math.hypot(...z); z = z.map(v => v / zl); let x = [u[1] * z[2] - u[2] * z[1], u[2] * z[0] - u[0] * z[2], u[0] * z[1] - u[1] * z[0]]; const xl = Math.hypot(...x); x = x.map(v => v / xl); const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]), -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]), -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]), 1]); },
mul(a, b){ const r = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++){ let s0 = 0; for (let k = 0; k < 4; k++) s0 += a[k * 4 + j] * b[i * 4 + k]; r[i * 4 + j] = s0; } return r; },
inv(m){ const r = new Float32Array(16), [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return r; d = 1 / d;
r[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; r[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; r[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; r[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d; r[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; r[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; r[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; r[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
r[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; r[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; r[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; r[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d; r[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; r[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; r[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; r[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d; return r; },
xf(m, v){ const x = v[0], y = v[1], z = v[2], w = v[3] ?? 1; return [m[0] * x + m[4] * y + m[8] * z + m[12] * w, m[1] * x + m[5] * y + m[9] * z + m[13] * w, m[2] * x + m[6] * y + m[10] * z + m[14] * w, m[3] * x + m[7] * y + m[11] * z + m[15] * w]; }};
// ---- данные: рельеф и снимок
async function decodeDem(buf){ buf = await cleanDem(buf); const bm = await createImageBitmap(new Blob([buf])), cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height; const g = cv.getContext('2d', {willReadFrequently:true}); g.drawImage(bm, 0, 0);
const d = g.getImageData(0, 0, cv.width, cv.height).data, n = cv.width * cv.height, h = new Float32Array(n); for (let i = 0; i < n; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768; return {h, w:cv.width}; }
async function sbDemTile(z, x, y){ if (DEMP === 'mt') return decodeDem(await tileBytes(mtUrl(z, x, y))); return demPx(z, x, y); }
function sbPickZ(x0, x1, y0, y1, step, mpu, tw, zmax, maxT){ let z = 6; for (; z < zmax; z++) if (mpu / (tw * Math.pow(2, z)) <= step) break; for (; z > 3; z--){ const n = Math.pow(2, z), c = (Math.floor(x1 * n) - Math.floor(x0 * n) + 1) * (Math.floor(y1 * n) - Math.floor(y0 * n) + 1); if (c <= maxT) break; } return z; }
// выборка сетки высот Nx×Ny из мозаики тайлов (билинейно), заполнение пропусков и подавление выбросов
function sbGrid(T, z, tw, tx0, ty0, x0, x1, y0, y1, Nx, Ny){ const n = Math.pow(2, z), H = new Float32Array(Nx * Ny);
const at = (gx, gy) => { const tx = Math.floor(gx / tw), ty = Math.floor(gy / tw), t = T[(ty - ty0) + '/' + (tx - tx0)]; if (!t) return NaN; return t.h[(gy - ty * tw) * t.w + (gx - tx * tw)]; };
for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++){ const px = (x0 + (x1 - x0) * i / (Nx - 1)) * n * tw - .5, py = (y0 + (y1 - y0) * j / (Ny - 1)) * n * tw - .5, ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1); let v = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy; if (!isFinite(v)) v = [a, b, c, d].find(isFinite) ?? NaN; H[j * Nx + i] = v; }
let sum = 0, cnt = 0; for (const v of H) if (isFinite(v) && v > -500 && v < 9000){ sum += v; cnt++; } if (!cnt) return null; const mean = sum / cnt; for (let k = 0; k < H.length; k++) if (!isFinite(H[k]) || H[k] < -500 || H[k] > 9000) H[k] = mean;
const O = H.slice(), w9 = new Float32Array(9); for (let j = 1; j < Ny - 1; j++) for (let i = 1; i < Nx - 1; i++){ let q = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) w9[q++] = O[(j + b) * Nx + i + a]; w9.sort(); if (Math.abs(O[j * Nx + i] - w9[4]) > 60) H[j * Nx + i] = w9[4]; } return H; }
async function sbDem(B, prog){ await demProbe(); const tw = DEMP === 'mt' ? 512 : 256, zmax = DEMP === 'mt' ? 12 : 14, z = sbPickZ(B.x0, B.x1, B.y0, B.y1, B.step, B.mpu, tw, zmax, 64), n = Math.pow(2, z);
const tx0 = Math.floor(B.x0 * n), tx1 = Math.floor(B.x1 * n), ty0 = Math.floor(B.y0 * n), ty1 = Math.floor(B.y1 * n), jobs = [], T = {}; for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) jobs.push([x, y]); let done = 0;
for (let q = 0; q < jobs.length; q += 6){ await Promise.all(jobs.slice(q, q + 6).map(async ([x, y]) => { try { T[(y - ty0) + '/' + (x - tx0)] = await sbDemTile(z, x, y); } catch(e){ if (DEMP === 'mt'){ try { T[(y - ty0) + '/' + (x - tx0)] = null; } catch(_){} } } done++; prog(Math.round(done / jobs.length * 100)); })); }
const t0 = Object.values(T).find(Boolean); if (!t0) return null; const tws = t0.w; return {H:sbGrid(T, z, tws, tx0, ty0, B.x0, B.x1, B.y0, B.y1, B.Nx, B.Ny), z, src:DEMP === 'mt' ? 'Mapterhorn (Copernicus GLO-30)' : 'AWS Terrarium (SRTM)'}; }
async function sbImg(B, size, prog){ const k = LAYERS[state.layer] && LAYERS[state.layer].crs !== '3395' ? state.layer : 'esri', L0 = LAYERS[k], cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'); g.fillStyle = '#7d8471'; g.fillRect(0, 0, size, size);
let z = 6; const zmax = Math.min(L0.max || 18, 18); for (; z < zmax; z++) if ((B.x1 - B.x0) * 256 * Math.pow(2, z) >= size * .85) break; let n, tx0, tx1, ty0, ty1; for (; z > 3; z--){ n = Math.pow(2, z); tx0 = Math.floor(B.x0 * n); tx1 = Math.floor(B.x1 * n); ty0 = Math.floor(B.y0 * n); ty1 = Math.floor(B.y1 * n); if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= 400) break; }
const jobs = []; for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) jobs.push([x, y]); let done = 0, miss = 0; const sx = size / ((B.x1 - B.x0) * n), sy = size / ((B.y1 - B.y0) * n);
for (let q = 0; q < jobs.length; q += 8){ await Promise.all(jobs.slice(q, q + 8).map(async ([x, y]) => { try { const b = await tileFb(L0.urls[0], z, x, y); if (!b) throw 0; const bm = await createImageBitmap(b); g.drawImage(bm, (x - B.x0 * n) * sx, (y - B.y0 * n) * sy, sx + .6, sy + .6); try { bm.close(); } catch(_){} } catch(e){ miss++; } done++; prog(Math.round(done / jobs.length * 100)); })); }
return {cv, k, z, miss}; }
// ---- геометрия: рельеф, борта «подставки», дно
function sbMesh(S0){ const {Nx, Ny, H, W, D, hb, ex} = S0, sx = W / (Nx - 1), sz = D / (Ny - 1), V = new Float32Array(Nx * Ny * 9), Y = new Float32Array(Nx * Ny);
for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++){ const k = j * Nx + i, h = H[k], y = (h - hb) * ex; Y[k] = y; const o = k * 9; V[o] = -W / 2 + i * sx; V[o + 1] = y; V[o + 2] = -D / 2 + j * sz; V[o + 6] = i / (Nx - 1); V[o + 7] = 1 - j / (Ny - 1); V[o + 8] = h; }
for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++){ const k = j * Nx + i, l = Y[j * Nx + Math.max(0, i - 1)], r = Y[j * Nx + Math.min(Nx - 1, i + 1)], u = Y[Math.max(0, j - 1) * Nx + i], d = Y[Math.min(Ny - 1, j + 1) * Nx + i];
const nx = -(r - l) / (sx * ((i > 0 && i < Nx - 1) ? 2 : 1)), nz = -(d - u) / (sz * ((j > 0 && j < Ny - 1) ? 2 : 1)), ln = Math.hypot(nx, 1, nz), o = k * 9; V[o + 3] = nx / ln; V[o + 4] = 1 / ln; V[o + 5] = nz / ln; }
const big = Nx * Ny > 65535, I = big ? new Uint32Array((Nx - 1) * (Ny - 1) * 6) : new Uint16Array((Nx - 1) * (Ny - 1) * 6); let q = 0;
for (let j = 0; j < Ny - 1; j++) for (let i = 0; i < Nx - 1; i++){ const a = j * Nx + i, b = a + 1, c = a + Nx, d = c + 1; I[q++] = a; I[q++] = c; I[q++] = b; I[q++] = b; I[q++] = c; I[q++] = d; }
let ym = 1; for (const v of Y) if (v > ym) ym = v; const base = -Math.max(ym * .18, Math.max(W, D) * .035), C = [], strat = [[.30, .22, .15], [.45, .35, .22], [.58, .48, .32], [.40, .33, .25], [.27, .22, .18]], fr = [0, .12, .35, .62, 1];
const wall = (pts, shade) => { for (let p = 0; p < pts.length - 1; p++){ const [x0, z0, y0] = pts[p], [x1, z1, y1] = pts[p + 1]; for (let s0 = 0; s0 < 4; s0++){ const ya0 = y0 + (base - y0) * fr[s0], yb0 = y0 + (base - y0) * fr[s0 + 1], ya1 = y1 + (base - y1) * fr[s0], yb1 = y1 + (base - y1) * fr[s0 + 1], ca = strat[s0].map(v => v * shade), cb = strat[s0 + 1].map(v => v * shade);
C.push(x0, ya0, z0, ...ca, 1, x1, ya1, z1, ...ca, 1, x0, yb0, z0, ...cb, 1, x1, ya1, z1, ...ca, 1, x1, yb1, z1, ...cb, 1, x0, yb0, z0, ...cb, 1); } } };
const row = j => Array.from({length:Nx}, (_, i) => [-W / 2 + i * sx, -D / 2 + j * sz, Y[j * Nx + i]]), col = i => Array.from({length:Ny}, (_, j) => [-W / 2 + i * sx, -D / 2 + j * sz, Y[j * Nx + i]]);
wall(row(0), .8); wall(row(Ny - 1), 1.05); wall(col(0), .9); wall(col(Nx - 1), .95);
const bc = [.2, .17, .14, 1]; C.push(-W / 2, base, -D / 2, ...bc, W / 2, base, -D / 2, ...bc, -W / 2, base, D / 2, ...bc, W / 2, base, -D / 2, ...bc, W / 2, base, D / 2, ...bc, -W / 2, base, D / 2, ...bc);
return {V, I, Y, big, walls:new Float32Array(C), base}; }
// высота сцены в точке (x, z) — билинейно по Y
function sbHy(S0, x, z){ const {Nx, Ny, W, D, Y} = S0, fx = (x + W / 2) / W * (Nx - 1), fz = (z + D / 2) / D * (Ny - 1); if (fx < 0 || fz < 0 || fx > Nx - 1 || fz > Ny - 1) return null; const i = Math.min(Nx - 2, Math.floor(fx)), j = Math.min(Ny - 2, Math.floor(fz)), a = fx - i, b = fz - j, k = j * Nx + i;
return Y[k] * (1 - a) * (1 - b) + Y[k + 1] * a * (1 - b) + Y[k + Nx] * (1 - a) * b + Y[k + Nx + 1] * a * b; }
const sbHm = (S0, x, z) => { const y = sbHy(S0, x, z); return y == null ? null : y / S0.ex + S0.hb; };
// тени по солнцу (марш по сетке) и затенение впадин (AO): RGBA S×S, строка 0 — юг (v = 0)
function sbAO(S0, S){ const A = new Float32Array(S * S), Hh = new Float32Array(S * S), rng = Math.max(10, S0.hmax - S0.hmin); for (let v = 0; v < S; v++) for (let u = 0; u < S; u++){ const x = -S0.W / 2 + (u + .5) / S * S0.W, z = S0.D / 2 - (v + .5) / S * S0.D; Hh[v * S + u] = sbHm(S0, x, z) ?? S0.hmin; }
const r = Math.max(2, Math.round(S / 32)), tmp = new Float32Array(S * S); for (let v = 0; v < S; v++){ let s0 = 0; for (let u = -r; u <= r; u++) s0 += Hh[v * S + Math.max(0, Math.min(S - 1, u))]; for (let u = 0; u < S; u++){ tmp[v * S + u] = s0 / (2 * r + 1); s0 += Hh[v * S + Math.min(S - 1, u + r + 1)] - Hh[v * S + Math.max(0, u - r)]; } }
for (let u = 0; u < S; u++){ let s0 = 0; for (let v = -r; v <= r; v++) s0 += tmp[Math.max(0, Math.min(S - 1, v)) * S + u]; for (let v = 0; v < S; v++){ const avg = s0 / (2 * r + 1); A[v * S + u] = Math.max(.55, Math.min(1, 1 - (avg - Hh[v * S + u]) / (rng * .12) * .5 + Math.min(0, 0))); s0 += tmp[Math.min(S - 1, v + r + 1) * S + u] - tmp[Math.max(0, v - r) * S + u]; } } return A; }
function sbShadowRows(S0, S, sun, out, v0, v1){ const {W, D} = S0, ymax = S0.Ymax; if (sun[1] <= .02){ for (let v = v0; v < v1; v++) for (let u = 0; u < S; u++) out[v * S + u] = 0; return; } const hl = Math.hypot(sun[0], sun[2]), dx = sun[0] / hl, dz = sun[2] / hl, rise = sun[1] / hl, st = Math.min(W, D) / S, soft = Math.max(W, D) * .0025;
for (let v = v0; v < v1; v++) for (let u = 0; u < S; u++){ const x = -W / 2 + (u + .5) / S * W, z = D / 2 - (v + .5) / S * D, y0 = sbHy(S0, x, z); if (y0 == null){ out[v * S + u] = 1; continue; } let m = 1e9;
for (let k = 1; k < S * 2; k++){ const t = k * st, ly = y0 + t * rise + st * .5; if (ly > ymax) break; const h = sbHy(S0, x + dx * t, z + dz * t); if (h == null) break; const g = ly - h; if (g < m){ m = g; if (m < -soft) break; } } out[v * S + u] = Math.max(0, Math.min(1, (m + soft) / (2 * soft))); } }
// горизонтали (марширующие квадраты) и сетка СК-42 — отрезки в координатах сцены
function sbNice(r){ for (const v of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500]) if (r / v <= 16) return v; return 1000; }
function sbContours(S0, M){ const {W, D, hmin, hmax} = S0, I = sbNice(hmax - hmin), G = new Float32Array(M * M), out = [], off = Math.max(W, D) * .0007;
for (let v = 0; v < M; v++) for (let u = 0; u < M; u++) G[v * M + u] = sbHm(S0, -W / 2 + u / (M - 1) * W, -D / 2 + v / (M - 1) * D) ?? hmin;
for (let L = Math.ceil(hmin / I) * I; L <= hmax; L += I){ const idx = Math.round(L / I) % 5 === 0, c = idx ? [.36, .2, .05, .95] : [.5, .32, .12, .6], y = (L - S0.hb) * S0.ex + off, P = (u, v) => [-W / 2 + u / (M - 1) * W, y, -D / 2 + v / (M - 1) * D];
for (let v = 0; v < M - 1; v++) for (let u = 0; u < M - 1; u++){ const a = G[v * M + u], b = G[v * M + u + 1], cc = G[(v + 1) * M + u + 1], d = G[(v + 1) * M + u], pts = [];
const e = (h0, h1, p0, p1) => { if ((h0 < L) !== (h1 < L)){ const f = (L - h0) / (h1 - h0); pts.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]); } };
e(a, b, [u, v], [u + 1, v]); e(b, cc, [u + 1, v], [u + 1, v + 1]); e(cc, d, [u + 1, v + 1], [u, v + 1]); e(d, a, [u, v + 1], [u, v]);
for (let k = 0; k + 1 < pts.length; k += 2) out.push(...P(pts[k][0], pts[k][1]), ...c, ...P(pts[k + 1][0], pts[k + 1][1]), ...c); } } return {L:new Float32Array(out), I}; }
function sbLL2S(S0, lat, lng){ return [(mX(lng) - S0.x0) / (S0.x1 - S0.x0) * S0.W - S0.W / 2, (mY(lat) - S0.y0) / (S0.y1 - S0.y0) * S0.D - S0.D / 2]; }
function sbS2LL(S0, x, z){ return [iY(S0.y0 + (z + S0.D / 2) / S0.D * (S0.y1 - S0.y0)), iX(S0.x0 + (x + S0.W / 2) / S0.W * (S0.x1 - S0.x0))]; }
function sbDrape(S0, P, col, out, stepM){ const off = Math.max(S0.W, S0.D) * .0012; for (let k = 0; k + 1 < P.length; k++){ const [ax, az] = P[k], [bx, bz] = P[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / stepM)); let prev = null;
for (let s0 = 0; s0 <= n; s0++){ const x = ax + (bx - ax) * s0 / n, z = az + (bz - az) * s0 / n, y = sbHy(S0, x, z); const p = y == null ? null : [x, y + off, z]; if (p && prev) out.push(...prev, ...col, ...p, ...col); prev = p; } } }
function sbGridSK(S0){ const out = [], lab = [], c = S0.c, zone = GEO.toSK(c[0], c[1]).zone, cor = [[S0.n, S0.w], [S0.n, S0.e], [S0.s, S0.w], [S0.s, S0.e]].map(([la, lo]) => GEO.toSK(la, lo, zone)), X0 = Math.min(...cor.map(p => p.x)), X1 = Math.max(...cor.map(p => p.x)), Y0 = Math.min(...cor.map(p => p.y)), Y1 = Math.max(...cor.map(p => p.y)), span = Math.max(X1 - X0, Y1 - Y0), G = span > 6000 ? 1000 : span > 2500 ? 500 : 100, col = [.08, .08, .1, .75], stp = S0.W / 160;
const toS = (X, Y) => { const [la, lo] = GEO.fromSK(X, Y, zone); return sbLL2S(S0, la, lo); };
for (let X = Math.ceil(X0 / G) * G; X <= X1; X += G){ const P = []; for (let k = 0; k <= 40; k++) P.push(toS(X, Y0 + (Y1 - Y0) * k / 40)); sbDrape(S0, P, col, out, stp); const e = toS(X, Y0); lab.push({t:String(Math.floor(X / 1000) % 100).padStart(2, '0') + (G < 1000 ? '.' + String(X % 1000 / 100) : ''), p:[S0.W / 2 * -1, 0, e[1]], side:'w'}); }
for (let Y = Math.ceil(Y0 / G) * G; Y <= Y1; Y += G){ const P = []; for (let k = 0; k <= 40; k++) P.push(toS(X0 + (X1 - X0) * k / 40, Y)); sbDrape(S0, P, col, out, stp); const e = toS(X1, Y); lab.push({t:String(Math.floor(Y / 1000) % 100).padStart(2, '0') + (G < 1000 ? '.' + String(Y % 1000 / 100) : ''), p:[e[0], 0, -S0.D / 2], side:'n'}); }
lab.forEach(l => { l.p[1] = (sbHy(S0, Math.max(-S0.W / 2, Math.min(S0.W / 2, l.p[0])), Math.max(-S0.D / 2, Math.min(S0.D / 2, l.p[2]))) || 0) + S0.W * .01; }); return {L:new Float32Array(out), lab:lab.filter(l => Math.abs(l.p[0]) <= S0.W / 2 + 1 && Math.abs(l.p[2]) <= S0.D / 2 + 1), G}; }
// зона видимости из точки (в реальных метрах, с кривизной Земли и рефракцией)
function sbViewshed(S0, ox, oz, obsH, S){ const out = new Uint8Array(S * S * 4), h0 = (sbHm(S0, ox, oz) ?? 0) + obsH, st = Math.min(S0.W, S0.D) / S;
for (let v = 0; v < S; v++) for (let u = 0; u < S; u++){ const x = -S0.W / 2 + (u + .5) / S * S0.W, z = S0.D / 2 - (v + .5) / S * S0.D, dist = Math.hypot(x - ox, z - oz), ht = (sbHm(S0, x, z) ?? 0) + 1.5, n = Math.max(1, Math.floor(dist / st)), cur = dist * dist * .87 / 12742000; let vis = true;
for (let k = 1; k < n && vis; k++){ const f = k / n, d = dist * f, hs = sbHm(S0, ox + (x - ox) * f, oz + (z - oz) * f); if (hs == null) continue; const line = h0 + (ht - cur - h0) * f, drop = d * d * .87 / 12742000; if (hs - drop > line) vis = false; }
const o = (v * S + u) * 4; if (vis){ out[o] = 40; out[o + 1] = 220; out[o + 2] = 90; out[o + 3] = 100; } else { out[o] = 225; out[o + 1] = 55; out[o + 2] = 45; out[o + 3] = 58; } } return out; }
// ---- шейдеры сцены
const TER_VS = 'attribute vec3 aP; attribute vec3 aN; attribute vec2 aU; attribute float aH; uniform mat4 uM; varying vec3 vN; varying vec2 vU; varying float vH; varying vec3 vW; void main(){ vN = aN; vU = aU; vH = aH; vW = aP; gl_Position = uM * vec4(aP, 1.0); }';
const TER_FS = `precision highp float; varying vec3 vN; varying vec2 vU; varying float vH; varying vec3 vW;
uniform sampler2D uTex, uSh, uVis; uniform vec3 uSun, uSunC, uAmb, uFog, uCam; uniform float uMode, uSnow, uFogD, uVisOn, uShOn, uDet;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ns(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){ vec3 n = normalize(vN); float sl = 1.0 - n.y; vec2 q = vW.xz * uDet; float d1 = ns(q), d2 = ns(q * 2.7 + 3.1), d3 = ns(q * 7.3 - 1.7), dn = d1 * 0.55 + d2 * 0.3 + d3 * 0.15;
float amp = 0.12 + 0.45 * smoothstep(0.12, 0.6, sl); n = normalize(n + vec3(ns(q * 1.9 + 7.0) - 0.5, 0.0, ns(q * 1.9 - 5.0) - 0.5) * amp * 0.6);
vec3 al = texture2D(uTex, vU).rgb;
if (uMode > 0.5){ float rk = smoothstep(0.32, 0.62, sl); al = mix(al, vec3(0.46, 0.43, 0.40) * (0.8 + 0.4 * dn), rk * 0.65); }
if (uMode > 1.5){ float sn = uMode > 2.5 ? 0.82 : smoothstep(uSnow - 50.0 + dn * 140.0, uSnow + 90.0, vH); sn *= 1.0 - smoothstep(0.42, 0.72, sl); al = mix(al, vec3(0.94, 0.96, 1.0) * (0.92 + 0.08 * d2), sn); }
vec4 sh = texture2D(uSh, vU); float s = uShOn > 0.5 ? sh.r : 1.0; float ao = sh.g;
float dif = max(dot(n, uSun), 0.0) * s; vec3 c = al * (uAmb * (0.45 + 0.55 * n.y) * ao + uSunC * dif);
if (uVisOn > 0.5){ vec4 v = texture2D(uVis, vU); c = mix(c, v.rgb, v.a); }
float f = 1.0 - exp(-length(vW - uCam) * uFogD); c = mix(c, uFog, clamp(f, 0.0, 0.85)); gl_FragColor = vec4(c, 1.0); }`;
const COL_VS = 'attribute vec3 aP; attribute vec4 aC; uniform mat4 uM; uniform float uPs; varying vec4 vC; void main(){ vC = aC; gl_Position = uM * vec4(aP, 1.0); gl_PointSize = uPs; }';
const COL_FS = 'precision mediump float; varying vec4 vC; uniform float uPt, uK; void main(){ if (uPt > 0.5){ vec2 q = gl_PointCoord - 0.5; if (length(q) > 0.5) discard; } gl_FragColor = vec4(vC.rgb * uK, vC.a); }';
const SKG_VS = 'attribute vec2 aQ; varying vec2 vQ; void main(){ vQ = aQ; gl_Position = vec4(aQ, 0.0, 1.0); }';
const SKG_FS = `precision highp float; varying vec2 vQ; uniform mat4 uInv; uniform vec3 uZen, uHor, uGnd, uSun, uSunC;
void main(){ vec4 p = uInv * vec4(vQ, 1.0, 1.0); vec3 d = normalize(p.xyz / p.w); float e = d.y; vec3 c = e > 0.0 ? mix(uHor, uZen, pow(smoothstep(0.0, 0.7, e), 0.8)) : mix(uHor, uGnd, smoothstep(0.0, 0.25, -e));
float s = max(dot(d, uSun), 0.0); c += uSunC * (pow(s, 900.0) * 4.0 + pow(s, 40.0) * 0.22 + pow(s, 5.0) * 0.07); gl_FragColor = vec4(c, 1.0); }`;
// ---- запуск: выбор участка, загрузка, сцена
function sbStart(){ if (mkQ() === 0){ toast('«Макет» выключен для этого устройства (Штаб → Устройство и качество)'); return; } try { if ($('v3d').classList.contains('on')) close3D(); } catch(e){} try { closeModals(); } catch(e){}
pickRect('Выделите участок для макета: от 0,3 до 20 км', R => sbBuild(R).catch(e => { console.error(e); sbMsg(''); toast('Макет не построен: ' + (e.message || e)); })); }
window.sbStart = sbStart;
function sbBox(){ let b = $('sbox'); if (b) return b; b = document.createElement('div'); b.id = 'sbox';
b.innerHTML = `<canvas id="sbCv"></canvas><div id="sbLab"></div><div id="sbTop"><button class="glass" id="sbX">✕ Карта</button><label class="glass sbT">☀ <input type="range" id="sbTm" min="0" max="1439" step="5"><span id="sbTmV"></span><button class="ghost sm" id="sbNow">Сейчас</button></label>
<select class="glass" id="sbEx"><option value="1">Рельеф ×1</option><option value="1.5">×1,5</option><option value="2">×2</option><option value="3">×3</option><option value="4">×4</option></select>
<button class="glass sbB" data-k="grid">⌗ Сетка</button><button class="glass sbB" data-k="cont">〰 Горизонтали</button><button class="glass sbB" data-k="obj">⚑ Знаки</button><button class="glass sbB" data-k="sh">◐ Тени</button><button class="glass sbB" data-k="sky">✶ Небо</button>
<select class="glass" id="sbMat"><option value="0">Склоны: как на снимке</option><option value="1">скалы</option><option value="2">скалы и снег</option><option value="3">зима</option></select>
<button class="glass" id="sbUp">⤒ В небо</button><button class="glass" id="sbVs">👁 Видимость</button><button class="glass" id="sbOr">⟳ Облёт</button><button class="glass" id="sbShot">📷 Кадр</button></div>
<div id="sbMsg" class="glass"></div><div id="sbInfo" class="glass"></div><div id="sbSkyC" class="glass"></div>`; document.body.appendChild(b); return b; }
const sbMsg = t => { const m = $('sbMsg'); if (m){ m.textContent = t || ''; m.style.display = t ? '' : 'none'; } };
async function sbBuild(R){ const Q = SBQ(mkQ()), latc = (R.s + R.n) / 2, x0 = mX(R.w), x1 = mX(R.e), y0 = mY(R.n), y1 = mY(R.s), mpu = 40075016.686 * Math.cos(latc * RAD), W = (x1 - x0) * mpu, D = (y1 - y0) * mpu;
if (Math.max(W, D) > 20500){ toast('Участок больше 20 км — выделите меньше'); return; } if (Math.min(W, D) < 250){ toast('Участок слишком мал'); return; }
const Nx = W >= D ? Q.N : Math.max(48, Math.round(Q.N * W / D)), Ny = D >= W ? Q.N : Math.max(48, Math.round(Q.N * D / W)); sbBox().classList.add('on'); sbMsg('Загружаю рельеф…');
const B = {x0, x1, y0, y1, Nx, Ny, step:W / (Nx - 1), mpu}, dm = await sbDem(B, p => sbMsg(`Загружаю рельеф: ${p}%`)); if (!dm || !dm.H){ sbClose(); toast('Нет данных рельефа для участка (нужен интернет один раз)'); return; }
sbMsg('Загружаю снимок…'); const im = await sbImg(B, Q.tex, p => sbMsg(`Загружаю снимок: ${p}%`)); sbOpen({R, B, Q, W, D, H:dm.H, img:im.cv, src:dm.src + (im.miss ? ` · снимок: нет ${im.miss} фрагм.` : '')}); }
function sbOpen(o){ const box = sbBox(); box.classList.add('on'); const {R, B, Q, W, D, H} = o; let hmin = 1e9, hmax = -1e9; for (const v of H){ if (v < hmin) hmin = v; if (v > hmax) hmax = v; }
SB = {R, Q, W, D, H, Nx:B.Nx, Ny:B.Ny, x0:B.x0, x1:B.x1, y0:B.y0, y1:B.y1, n:R.n, s:R.s, w:R.w, e:R.e, c:[(R.n + R.s) / 2, (R.w + R.e) / 2], hmin, hmax, hb:hmin - Math.max(5, (hmax - hmin) * .02), ex:hmax - hmin < 60 ? 2 : 1, src:o.src, on:Object.assign({grid:1, cont:0, obj:1, sh:1, sky:1}, lsGet('skat_sbon', {})), mat:ATM.mat || 0, vs:null, vsMode:0, cam:{t:[0, 0, 0], d:Math.max(W, D) * 1.05, yaw:.35, el:.62, lt:0}, dirty:1};
const cv = $('sbCv'); cv.width = 1; const gl = cv.getContext('webgl2', {antialias:Q.N >= 512, preserveDrawingBuffer:true}) || cv.getContext('webgl', {antialias:Q.N >= 512, preserveDrawingBuffer:true}); if (!gl){ sbClose(); toast('Нет WebGL'); return; }
SB.gl = gl; SB.gl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext; if (!SB.gl2 && !gl.getExtension('OES_element_index_uint') && B.Nx * B.Ny > 65535){ sbClose(); toast('Устройство не тянет такую детализацию — понизьте качество'); return; }
try { SB.PT = glProg(gl, TER_VS, TER_FS); SB.PC = glProg(gl, COL_VS, COL_FS); SB.PG = glProg(gl, SKG_VS, SKG_FS); SB.PS = glProg(gl, SKY_VS, SKY_FS); } catch(e){ sbClose(); toast('Шейдеры не собрались: ' + e.message); return; }
const tx = (src, opts) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts && opts.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); if (opts && opts.mip) gl.generateMipmap(gl.TEXTURE_2D); return t; };
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); SB.tTex = tx(o.img, {mip:1}); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); const an = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic'); if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
SB.tex = tx; SB.tSh = sbDataTex(new Uint8Array([255, 255, 255, 255]), 1); SB.tVis = sbDataTex(new Uint8Array([0, 0, 0, 0]), 1); SB.bT = gl.createBuffer(); SB.bI = gl.createBuffer(); SB.bW = gl.createBuffer(); SB.bL = gl.createBuffer(); SB.bP = gl.createBuffer(); SB.bS = gl.createBuffer(); SB.bSL = gl.createBuffer(); SB.bQ = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, SB.bQ); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
sbGeom(); sbUI(); sbResize(); addEventListener('resize', sbResize); if (window.skyBg) skyBg().then(() => { sbSky(); sbDraw(); }); sbLight(true); sbMsg(''); $('sbInfo').textContent = `Участок ${km2(W)} × ${km2(D)} · высоты ${Math.round(hmin)}–${Math.round(hmax)} м · ${SB.src}. Вращение — один палец, масштаб и сдвиг — два, двойное касание — центр; провести пальцем вверх у земли — взгляд в небо.`; }
const km2 = m => m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' км' : Math.round(m) + ' м';
function sbDataTex(u8, S){ const gl = SB.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, u8); [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE)); [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR)); return t; }
function sbGeom(){ const gl = SB.gl, M = sbMesh(SB); SB.Y = M.Y; SB.Ymax = 0; for (const v of M.Y) if (v > SB.Ymax) SB.Ymax = v; SB.nI = M.I.length; SB.idx32 = M.big; SB.base = M.base;
gl.bindBuffer(gl.ARRAY_BUFFER, SB.bT); gl.bufferData(gl.ARRAY_BUFFER, M.V, gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, SB.bI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, M.I, gl.STATIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, SB.bW); gl.bufferData(gl.ARRAY_BUFFER, M.walls, gl.STATIC_DRAW); SB.nW = M.walls.length / 7;
const c = SB.cam; c.t[1] = sbHy(SB, c.t[0], c.t[2]) ?? 0; sbLines(); if (!SB.ao) SB.ao = sbAO(SB, SB.Q.S); if (SB.sun) sbBake(); if (SB.vs) sbVsCalc(SB.vs[0], SB.vs[1]); sbDraw(); }
function sbLines(){ const gl = SB.gl, L = [], CH = []; SB.lab = []; if (SB.on.grid){ const g = sbGridSK(SB); CH.push(g.L); SB.lab.push(...g.lab.map(l => ({t:l.t, p:l.p, cls:'g'}))); SB.gstep = g.G; } if (SB.on.cont){ const c = sbContours(SB, Math.min(256, SB.Nx)); CH.push(c.L); SB.cint = c.I; }
const P = []; if (SB.on.obj){ const stp = SB.W / 200, ph = Math.max(SB.W, SB.D) * .03; state.arrays.forEach(a => { if (a.hidden || /^Макет:/.test(a.name)) return; const col = (h => [...h.map(v => v / 255), 1])(hx(a.style && a.style.color || '#ff7a1a'));
(a.points || []).forEach((p, i) => { if (p.hid || p.lat > SB.n || p.lat < SB.s || p.lng < SB.w || p.lng > SB.e) return; const [x, z] = sbLL2S(SB, p.lat, p.lng), y = sbHy(SB, x, z); if (y == null) return; L.push(x, y, z, ...col, x, y + ph, z, ...col); P.push(x, y + ph, z, ...col); SB.lab.push({t:labelOf(a, i), p:[x, y + ph, z], cls:'o', c:a.style && a.style.color}); });
if (a.kind === 'route' && a.points.length > 1) sbDrape(SB, a.points.map(p => sbLL2S(SB, p.lat, p.lng)), col, L, stp); (a.shapes || []).forEach(s0 => { if (s0.hid || !(s0.pts || []).length || s0.type === 'circle') return; const pts = s0.pts.map(q => sbLL2S(SB, q[0] ?? q.lat, q[1] ?? q.lng)); if (s0.type !== 'line') pts.push(pts[0]); sbDrape(SB, pts, (h => [...h.map(v => v / 255), 1])(hx(s0.color || a.style.color || '#ff7a1a')), L, stp); }); }); }
if (SB.vs){ const [x, z] = SB.vs, y = sbHy(SB, x, z) ?? 0, c = [1, .9, .2, 1], hh = Math.max(SB.W, SB.D) * .04; L.push(x, y, z, ...c, x, y + hh, z, ...c); P.push(x, y + hh, z, ...c); }
CH.push(new Float32Array(L)); const tot = CH.reduce((a, b) => a + b.length, 0), LA = new Float32Array(tot); let o = 0; CH.forEach(c => { LA.set(c, o); o += c.length; }); gl.bindBuffer(gl.ARRAY_BUFFER, SB.bL); gl.bufferData(gl.ARRAY_BUFFER, LA, gl.STATIC_DRAW); SB.nL = tot / 7; gl.bindBuffer(gl.ARRAY_BUFFER, SB.bP); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW); SB.nP = P.length / 7; }
// ---- свет, тени, небо
function sbLight(force){ if (!SB) return; const t = atmTime(), [la, lo] = SB.c, sp = sunPos(t, la, lo), P = palAt(sp.alt), c3 = h => hx(h).map(v => v / 255), m3 = e => [e[0], e[2], -e[1]], enu = (az, al) => [Math.sin(az * RAD) * Math.cos(al * RAD), Math.cos(az * RAD) * Math.cos(al * RAD), Math.sin(al * RAD)];
let L = m3(enu(sp.az, Math.max(sp.alt, -2))), k = Math.max(0, Math.min(1, (sp.alt + 2) / 8)), col = c3(P.lc).map(v => v * (.85 + P.li * 1.6) * k), amb = c3(P.sky).map((v, i) => (v * .5 + c3(P.hor)[i] * .5) * (sp.alt > 0 ? .78 : .55));
if (sp.alt < -4 && window.SKY){ const mo = SKY.one('moon', t, la, lo); if (mo.alt > 0){ L = m3(enu(mo.az, mo.alt)); col = [.42, .48, .62].map(v => v * (.25 + .75 * mo.ill) * Math.min(1, mo.alt / 8)); } } if (sp.alt < -4) amb = amb.map((v, i) => Math.max(v, [.10, .12, .17][i]));
SB.sun = L; SB.sunC = col; SB.amb = amb; SB.pal = P; SB.sp = sp; SB.zen = c3(P.sky); SB.hor = c3(P.hor); SB.fog = c3(P.fog); const ang = SB.bakeSun ? Math.acos(Math.min(1, L[0] * SB.bakeSun[0] + L[1] * SB.bakeSun[1] + L[2] * SB.bakeSun[2])) / RAD : 99;
if (force || ang > .6){ clearTimeout(SB.bt); SB.bt = setTimeout(sbBake, force ? 0 : 220); } const v = $('sbTmV'); if (v){ const d = new Date(t); v.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; } sbSky(); sbDraw(); }
function sbBake(){ if (!SB) return; const S = SB.Q.S, out = new Float32Array(S * S), sun = SB.sun.slice(), gen = (SB.bg = (SB.bg || 0) + 1); let v = 0;
const step = () => { if (!SB || SB.bg !== gen) return; const t0 = performance.now(); while (v < S && performance.now() - t0 < 14){ sbShadowRows(SB, S, sun, out, v, v + 1); v++; }
if (v < S){ setTimeout(step, 0); return; } const u8 = new Uint8Array(S * S * 4); for (let i = 0; i < S * S; i++){ u8[i * 4] = Math.round(out[i] * 255); u8[i * 4 + 1] = Math.round(SB.ao[i] * 255); u8[i * 4 + 3] = 255; } const gl = SB.gl; gl.deleteTexture(SB.tSh); SB.tSh = sbDataTex(u8, S); SB.bakeSun = sun; sbDraw(); };
step(); }
function sbSky(){ if (!SB || !SB.gl) return; const gl = SB.gl; if (!SB.on.sky || !window.SKY){ SB.SD = null; return; } const D = skyData(atmTime(), SB.c[0], SB.c[1], e => [e[0], e[2], -e[1]], SB.sel); if (!D) return; SB.SD = D;
gl.bindBuffer(gl.ARRAY_BUFFER, SB.bS); gl.bufferData(gl.ARRAY_BUFFER, D.P, gl.DYNAMIC_DRAW); SB.nS = D.P.length / 8; gl.bindBuffer(gl.ARRAY_BUFFER, SB.bSL); gl.bufferData(gl.ARRAY_BUFFER, D.L, gl.DYNAMIC_DRAW); SB.nSL = D.L.length / 8; }
// ---- камера и отрисовка
function sbCam(){ const c = SB.cam, cv = $('sbCv'), a = cv.width / Math.max(1, cv.height), e = [c.t[0] - Math.sin(c.yaw) * Math.cos(c.el) * c.d, c.t[1] + Math.sin(c.el) * c.d, c.t[2] + Math.cos(c.yaw) * Math.cos(c.el) * c.d], sz = Math.max(SB.W, SB.D);
let tg = c.t; if (c.lt > 0){ const f = [c.t[0] - e[0], c.t[1] - e[1], c.t[2] - e[2]], fl = Math.hypot(...f), fh = Math.hypot(f[0], f[2]) || 1, pit = Math.asin(f[1] / fl) + c.lt; tg = [e[0] + f[0] / fh * Math.cos(pit) * fl, e[1] + Math.sin(pit) * fl, e[2] + f[2] / fh * Math.cos(pit) * fl]; }
const pr = m4.persp(45 * RAD, a, Math.max(.5, c.d * .004), c.d * 6 + sz * 6), vw = m4.look(e, tg, [0, 1, 0]); SB.eye = e; SB.VP = m4.mul(pr, vw); SB.IVP = m4.inv(SB.VP); SB.ISK = m4.inv(m4.mul(pr, m4.look([0, 0, 0], [tg[0] - e[0], tg[1] - e[1], tg[2] - e[2]], [0, 1, 0]))); }
function sbDraw(){ if (!SB || SB.req) return; SB.req = 1; requestAnimationFrame(() => { if (!SB) return; SB.req = 0; if (SB.orbit){ SB.cam.yaw += .0025; sbDraw(); } sbRender(); }); }
function sbRender(){ const gl = SB.gl, cv = $('sbCv'); if (!SB.sun || !SB.nI) return; sbCam(); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(...SB.hor, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
let P = SB.PG; gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.useProgram(P.p); gl.uniformMatrix4fv(P.U.uInv, false, SB.ISK); gl.uniform3fv(P.U.uZen, SB.zen); gl.uniform3fv(P.U.uHor, SB.hor); gl.uniform3fv(P.U.uGnd, SB.hor.map(v => v * .45)); gl.uniform3fv(P.U.uSun, SB.sun); gl.uniform3fv(P.U.uSunC, SB.sp.alt > -2 ? SB.sunC : [0, 0, 0]);
glAttr(gl, P, SB.bQ, [['aQ', 2]], 2); gl.drawArrays(gl.TRIANGLES, 0, 3); glOff(gl, P);
gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); P = SB.PT; gl.useProgram(P.p); gl.uniformMatrix4fv(P.U.uM, false, SB.VP);
[['uTex', SB.tTex, 0], ['uSh', SB.tSh, 1], ['uVis', SB.tVis, 2]].forEach(([n, t, i]) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(P.U[n], i); });
gl.uniform3fv(P.U.uSun, SB.sun); gl.uniform3fv(P.U.uSunC, SB.sunC); gl.uniform3fv(P.U.uAmb, SB.amb); gl.uniform3fv(P.U.uFog, SB.fog); gl.uniform3fv(P.U.uCam, SB.eye); gl.uniform1f(P.U.uMode, SB.mat); gl.uniform1f(P.U.uSnow, ATM.snow || 2500);
gl.uniform1f(P.U.uFogD, (.12 + .5 * (ATM.haze ?? .45)) / (SB.cam.d + Math.max(SB.W, SB.D))); gl.uniform1f(P.U.uVisOn, SB.vs ? 1 : 0); gl.uniform1f(P.U.uShOn, SB.on.sh ? 1 : 0); gl.uniform1f(P.U.uDet, 1 / 30);
glAttr(gl, P, SB.bT, [['aP', 3], ['aN', 3], ['aU', 2], ['aH', 1]], 9); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, SB.bI); gl.drawElements(gl.TRIANGLES, SB.nI, SB.idx32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0); glOff(gl, P);
P = SB.PC; gl.useProgram(P.p); gl.uniformMatrix4fv(P.U.uM, false, SB.VP); const lu = v => .3 * v[0] + .55 * v[1] + .15 * v[2]; gl.uniform1f(P.U.uK, Math.max(.16, Math.min(1, lu(SB.amb) * 1.1 + lu(SB.sunC) * .55))); gl.uniform1f(P.U.uPt, 0); gl.uniform1f(P.U.uPs, 1); glAttr(gl, P, SB.bW, [['aP', 3], ['aC', 4]], 7); gl.drawArrays(gl.TRIANGLES, 0, SB.nW); gl.uniform1f(P.U.uK, SB.sp.alt > -4 ? 1 : 1.25);
if (SB.nL){ glAttr(gl, P, SB.bL, [['aP', 3], ['aC', 4]], 7); gl.drawArrays(gl.LINES, 0, SB.nL); } if (SB.nP){ gl.uniform1f(P.U.uPt, 1); gl.uniform1f(P.U.uPs, 9 * mkDpr()); glAttr(gl, P, SB.bP, [['aP', 3], ['aC', 4]], 7); gl.drawArrays(gl.POINTS, 0, SB.nP); } glOff(gl, P);
if (SB.SD && (SB.nS || SB.nSL)){ P = SB.PS; gl.useProgram(P.p); gl.uniformMatrix4fv(P.U.uM, false, SB.VP); gl.uniform1f(P.U.uDpr, mkDpr()); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
if (SB.nSL){ gl.uniform1f(P.U.uPt, 0); glAttr(gl, P, SB.bSL, [['aD', 3], ['aS', 1], ['aC', 4]], 8); gl.drawArrays(gl.LINES, 0, SB.nSL); } if (SB.nS){ gl.uniform1f(P.U.uPt, 1); glAttr(gl, P, SB.bS, [['aD', 3], ['aS', 1], ['aC', 4]], 8); gl.drawArrays(gl.POINTS, 0, SB.nS); } glOff(gl, P); gl.depthMask(true); gl.disable(gl.BLEND); }
sbLabels(); }
function sbProj(p){ const v = m4.xf(SB.VP, [p[0], p[1], p[2], 1]), cv = $('sbCv'); if (v[3] <= 0) return null; const W = cv.clientWidth, H = cv.clientHeight, x = (v[0] / v[3] * .5 + .5) * W, y = (1 - (v[1] / v[3] * .5 + .5)) * H; return x < -20 || y < -20 || x > W + 20 || y > H + 20 ? null : [x, y]; }
function sbLabels(){ const h = $('sbLab'); if (!h) return; let s0 = ''; (SB.lab || []).forEach(l => { const p = sbProj(l.p); if (!p) return; s0 += `<span class="sbL ${l.cls}" style="left:${p[0].toFixed(0)}px;top:${p[1].toFixed(0)}px${l.c ? ';--c:' + l.c : ''}">${escapeHtml(l.t)}</span>`; });
const cv = $('sbCv'); if (SB.SD && ATM.lbl !== 0){ const tmp = document.createElement('div'); skyLabels(tmp, SB.SD, SB.VP, cv.clientWidth, cv.clientHeight); s0 += tmp.innerHTML; } h.innerHTML = s0; }
// ---- луч из точки экрана в рельеф
function sbRay(px, py){ const cv = $('sbCv'), x = px / cv.clientWidth * 2 - 1, y = 1 - py / cv.clientHeight * 2, a = m4.xf(SB.IVP, [x, y, -1, 1]), b = m4.xf(SB.IVP, [x, y, 1, 1]), p0 = a.slice(0, 3).map(v => v / a[3]), p1 = b.slice(0, 3).map(v => v / b[3]), d = p1.map((v, i) => v - p0[i]), L = Math.hypot(...d), u = d.map(v => v / L), st = Math.min(SB.W, SB.D) / 500;
let prev = 0, inside = false; for (let t = 0; t < L; t += st){ const q = [p0[0] + u[0] * t, p0[1] + u[1] * t, p0[2] + u[2] * t], h = sbHy(SB, q[0], q[2]); if (h == null){ if (inside) break; continue; } inside = true; if (q[1] <= h){ let lo = prev, hi = t; for (let k = 0; k < 12; k++){ const m = (lo + hi) / 2, r = [p0[0] + u[0] * m, p0[1] + u[1] * m, p0[2] + u[2] * m], hm = sbHy(SB, r[0], r[2]); if (hm != null && r[1] <= hm) hi = m; else lo = m; } return [p0[0] + u[0] * hi, p0[1] + u[1] * hi, p0[2] + u[2] * hi]; } prev = t; } return null; }
function sbVsCalc(x, z){ const h = +(lsGet('skat_vsh', 2)) || 2, u8 = sbViewshed(SB, x, z, h, 256); SB.gl.deleteTexture(SB.tVis); SB.tVis = sbDataTex(u8, 256); SB.vs = [x, z]; let vis = 0; for (let i = 0; i < 256 * 256; i++) if (u8[i * 4 + 1] > 200) vis++; sbLines(); sbDraw();
const [la, lo] = sbS2LL(SB, x, z), s0 = GEO.toSK(la, lo); $('sbInfo').textContent = `Зона видимости из X ${Math.round(s0.x)} Y ${Math.round(s0.y)} (глаз ${h} м над землёй): видно ${Math.round(vis / 655.36)}% участка. Зелёное — видно, красное — скрыто.`; }
// ---- управление: один палец — вращение, два — масштаб и сдвиг, двойное касание — центр; мышь: колесо, правая кнопка или Shift — сдвиг
function sbUI(){ const cv = $('sbCv'); if (cv.__ui) { sbBtns(); return; } cv.__ui = 1; const P = new Map(); let down = null, moved = 0, lastTap = 0; const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const pan = (dx, dy) => { const c = SB.cam, k = c.d * .0016, r = [Math.cos(c.yaw), Math.sin(c.yaw)], f = [Math.sin(c.yaw), -Math.cos(c.yaw)]; c.t[0] = cl(c.t[0] - r[0] * dx * k + f[0] * dy * k, -SB.W / 2, SB.W / 2); c.t[2] = cl(c.t[2] - r[1] * dx * k + f[1] * dy * k, -SB.D / 2, SB.D / 2); c.t[1] = sbHy(SB, c.t[0], c.t[2]) ?? c.t[1]; };
const zoom = f => { const c = SB.cam, sz = Math.max(SB.W, SB.D); c.d = cl(c.d * f, sz * .02, sz * 3); };
cv.addEventListener('pointerdown', e => { if (!SB) return; try { cv.setPointerCapture(e.pointerId); } catch(_){} P.set(e.pointerId, [e.clientX, e.clientY]); if (P.size === 1){ down = {x:e.clientX, y:e.clientY, t:Date.now(), pan:e.button === 2 || e.shiftKey || e.ctrlKey}; moved = 0; } SB.orbit = 0; });
cv.addEventListener('pointermove', e => { if (!SB || !P.has(e.pointerId)) return; const pv = P.get(e.pointerId); P.set(e.pointerId, [e.clientX, e.clientY]); const dx = e.clientX - pv[0], dy = e.clientY - pv[1]; moved += Math.abs(dx) + Math.abs(dy);
if (P.size === 1){ if (down && down.pan) pan(dx, dy); else { const c = SB.cam; c.yaw -= dx * .006; if (c.lt > 0 || (c.el <= .041 && dy < 0)){ c.lt = cl((c.lt || 0) - dy * .005, 0, 1.45); if (c.lt === 0 && dy > 0) c.el = cl(c.el + dy * .005, .04, 1.53); } else c.el = cl(c.el + dy * .005, .04, 1.53); } }
else if (P.size === 2){ const ot = [...P.entries()].find(([id]) => id !== e.pointerId)[1], d0 = Math.hypot(pv[0] - ot[0], pv[1] - ot[1]), d1 = Math.hypot(e.clientX - ot[0], e.clientY - ot[1]); if (d1 > 4) zoom(d0 / d1); pan(dx / 2, dy / 2); } sbDraw(); });
const up = e => { if (!SB) return; P.delete(e.pointerId); if (down && moved < 9 && Date.now() - down.t < 400 && !P.size){ const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, tt = Date.now(); if (tt - lastTap < 330){ const h = sbRay(px, py); if (h){ SB.cam.t = h; sbDraw(); } } else sbTap(px, py); lastTap = tt; } if (!P.size) down = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('wheel', e => { e.preventDefault(); if (!SB) return; zoom(Math.exp(e.deltaY * .0012)); sbDraw(); }, {passive:false}); cv.addEventListener('contextmenu', e => e.preventDefault()); sbBtns(); }
function sbTap(px, py){ if (SB.vsMode){ const h = sbRay(px, py); if (!h){ toast('Коснитесь рельефа'); return; } SB.vsMode = 0; $('sbVs').classList.remove('on'); sbVsCalc(h[0], h[2]); return; }
const cv = $('sbCv'); if (SB.SD){ const o = skyPick(SB.SD, SB.VP, cv.clientWidth, cv.clientHeight, px, py); if (o){ skyCardShow($('sbSkyC'), o, atmTime(), SB.c[0], SB.c[1]); SB.sel = o.c || null; sbSky(); sbDraw(); return; } }
const h = sbRay(px, py); if (!h) return; const [la, lo] = sbS2LL(SB, h[0], h[2]), s0 = GEO.toSK(la, lo), hm = sbHm(SB, h[0], h[2]); $('sbInfo').textContent = `X ${Math.round(s0.x)}  Y ${Math.round(s0.y)}  (кв. ${sqOf(s0)})  · высота ${Math.round(hm)} м`; }
function sbBtns(){ const sync = () => { document.querySelectorAll('#sbTop .sbB').forEach(b => b.classList.toggle('on', !!SB.on[b.dataset.k])); $('sbEx').value = String(SB.ex); $('sbMat').value = String(SB.mat); const d = new Date(atmTime()); $('sbTm').value = d.getHours() * 60 + d.getMinutes(); }; sync();
$('sbX').onclick = sbClose; $('sbTm').oninput = e => { ATM.now = 0; ATM.min = +e.target.value; sbLight(); }; $('sbTm').onchange = () => atmSave(); $('sbNow').onclick = () => { ATM.now = 1; atmSave(); sync(); sbLight(true); };
$('sbEx').onchange = e => { SB.ex = +e.target.value; SB.ao = null; SB.ao = sbAO(SB, SB.Q.S); sbGeom(); }; $('sbMat').onchange = e => { SB.mat = +e.target.value; sbDraw(); };
document.querySelectorAll('#sbTop .sbB').forEach(b => b.onclick = () => { const k = b.dataset.k; SB.on[k] = SB.on[k] ? 0 : 1; lsSet('skat_sbon', SB.on); sync(); if (k === 'grid' || k === 'cont' || k === 'obj') sbLines(); if (k === 'sky') sbSky(); sbDraw(); });
$('sbVs').onclick = () => { if (SB.vs && !SB.vsMode){ SB.vs = null; $('sbVs').classList.remove('on'); sbLines(); sbDraw(); $('sbInfo').textContent = 'Зона видимости снята'; return; } const v = prompt('Высота глаза (прибора) над землёй, м', String(lsGet('skat_vsh', 2))); if (v === null) return; lsSet('skat_vsh', +String(v).replace(',', '.') || 2); SB.vsMode = 1; $('sbVs').classList.add('on'); toast('Коснитесь точки наблюдения на рельефе'); };
$('sbUp').onclick = () => { const c = SB.cam; if (c.lt > 0){ c.lt = 0; c.el = .62; c.d = Math.max(SB.W, SB.D) * 1.05; } else { c.el = .041; c.d = Math.max(SB.W, SB.D) * .22; c.lt = .42; if (!SB.on.sky){ SB.on.sky = 1; sbSky(); sbBtns(); } } $('sbUp').classList.toggle('on', c.lt > 0); sbDraw(); };
$('sbOr').onclick = () => { SB.orbit = SB.orbit ? 0 : 1; $('sbOr').classList.toggle('on', !!SB.orbit); sbDraw(); }; $('sbShot').onclick = sbShot; }
function sbResize(){ if (!SB) return; const cv = $('sbCv'), r = mkDpr(); cv.width = Math.round(innerWidth * r); cv.height = Math.round(innerHeight * r); sbDraw(); }
function sbShot(){ sbRender(); const src = $('sbCv'), W = src.width, H = src.height, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'), k = W / src.clientWidth; g.drawImage(src, 0, 0);
g.font = `600 ${Math.round(12 * k)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; $('sbLab').querySelectorAll('span').forEach(s0 => { const x = parseFloat(s0.style.left) * k, y = parseFloat(s0.style.top) * k; g.lineWidth = 3 * k; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(s0.textContent, x, y - 4 * k); g.fillStyle = '#fff'; g.fillText(s0.textContent, x, y - 4 * k); });
const ft = `СКАТ · макет участка ${km2(SB.W)} × ${km2(SB.D)} · ${new Date(atmTime()).toLocaleString('ru-RU')}${SB.on.grid && SB.gstep ? ' · сетка СК-42 ' + SB.gstep + ' м' : ''}${SB.on.cont && SB.cint ? ' · горизонтали ' + SB.cint + ' м' : ''}`; g.textAlign = 'left'; g.font = `500 ${Math.round(13 * k)}px sans-serif`; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, H - 26 * k, W, 26 * k); g.fillStyle = '#fff'; g.fillText(ft, 10 * k, H - 7 * k);
cv.toBlob(b => deliverFile(b, `СКАТ_макет_участка_${stamp()}.jpg`, 'Кадр макета готов'), 'image/jpeg', .92); }
function sbClose(){ removeEventListener('resize', sbResize); if (SB && SB.gl){ const lx = SB.gl.getExtension('WEBGL_lose_context'); try { lx && lx.loseContext(); } catch(e){} } SB = null; const b = $('sbox'); if (b){ b.remove(); } }
// демонстрация без сети (синтетический рельеф) — для проверки графики на устройстве
window.sbDemo = (q) => { const R = {n:55.80, s:55.72, w:37.50, e:37.64}, Q = SBQ(q || mkQ() || 2), latc = 55.76, x0 = mX(R.w), x1 = mX(R.e), y0 = mY(R.n), y1 = mY(R.s), mpu = 40075016.686 * Math.cos(latc * RAD), W = (x1 - x0) * mpu, D = (y1 - y0) * mpu, Nx = Q.N, Ny = Math.max(48, Math.round(Q.N * D / W)), H = new Float32Array(Nx * Ny);
for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++){ const u = i / Nx, v = j / Ny; H[j * Nx + i] = 180 + 900 * Math.exp(-((u - .55) ** 2 + (v - .45) ** 2) * 18) + 300 * Math.exp(-((u - .25) ** 2 + (v - .7) ** 2) * 40) + 40 * Math.sin(u * 40) * Math.cos(v * 33) + 25 * Math.sin(u * 90 + v * 70); }
const cv = document.createElement('canvas'); cv.width = cv.height = 1024; const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 0, 1024, 1024); gr.addColorStop(0, '#5f7a45'); gr.addColorStop(.5, '#7d8a55'); gr.addColorStop(1, '#4e6a3d'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024); for (let k = 0; k < 900; k++){ g.fillStyle = `rgba(${40 + Math.random() * 60},${70 + Math.random() * 60},${30 + Math.random() * 40},.5)`; g.beginPath(); g.arc(Math.random() * 1024, Math.random() * 1024, 4 + Math.random() * 18, 0, 7); g.fill(); }
sbBox().classList.add('on'); sbOpen({R, B:{x0, x1, y0, y1, Nx, Ny}, Q, W, D, H, img:cv, src:'демонстрация (синтетический рельеф)'}); };
{ const st = document.createElement('style'); st.textContent = `#v3skyL,#sbLab{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}.skL{position:absolute;transform:translate(-50%,-140%);font:600 12px sans-serif;color:#e8eeff;text-shadow:0 0 3px #000,0 0 2px #000;white-space:nowrap}.skL.con{font:italic 500 11px sans-serif;color:#9fc0ff;transform:translate(-50%,-50%)}
#v3skyC,#sbSkyC{position:absolute;left:10px;bottom:calc(env(safe-area-inset-bottom) + 70px);z-index:8;width:min(380px,calc(100vw - 20px));max-height:60%;overflow:auto;padding:8px 10px;border-radius:14px;display:none}#v3skyC.on,#sbSkyC.on{display:block}.skX{float:right}.skyC h4{margin:0 0 6px}
#sbox{position:fixed;inset:0;z-index:3200;background:#0b0f14;display:none}#sbox.on{display:block}#sbCv{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
#sbTop{position:absolute;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 8px);display:flex;flex-wrap:wrap;gap:6px;z-index:6}#sbTop>*{min-height:38px;padding:4px 10px;border-radius:10px;font-size:13px}#sbTop .sbT{display:flex;align-items:center;gap:6px}#sbTop .sbT input{width:120px}#sbTop .on{outline:2px solid var(--signal)}
#sbMsg{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);z-index:7;padding:12px 18px;border-radius:14px;font-weight:600}#sbInfo{position:absolute;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom) + 8px);z-index:6;padding:6px 10px;border-radius:10px;font-size:13px}
.sbL{position:absolute;transform:translate(-50%,-130%);font:600 12px sans-serif;color:#fff;text-shadow:0 0 3px #000,0 0 2px #000;white-space:nowrap}.sbL.g{font:700 11px sans-serif;color:#ffe9a8}.sbL.o::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c,#ff7a1a);margin-right:4px;box-shadow:0 0 0 1px #000}`; document.head.appendChild(st); }
