// СКАТ — модуль «Макет» (3D, объекты, анимация по маршруту, модели Three.js). Грузится лениво из index.html (modLoad). Версия 6.50
// ======== 3D-ПРОСМОТР ========
const ML = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/';
let MLp = null, v3 = null, v3proto = false;
function loadML(){ if (MLp) return MLp;
MLp = new Promise((res, rej) => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ML + 'maplibre-gl.css'; document.head.appendChild(l);
const sc = document.createElement('script'); sc.src = ML + 'maplibre-gl.js'; sc.onload = () => res(window.maplibregl); sc.onerror = () => { MLp = null; rej(new Error('ml')); }; document.head.appendChild(sc); });
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
if (!v3proto){ ml.addProtocol('skat', async (params, ac) => { const sig = ac && ac.signal; const m = params.url.match(/^skat:\/\/([^/]+)\/(\d+)\/(\d+)\/(\d+)/); const z = +m[2], x = +m[3], y = +m[4]; if (m[1] !== 'dem'){ const b = LAYERS[m[1]] ? await tileFb(LAYERS[m[1]].urls[0], z, x, y, false, sig) : null; if (!b) throw new Error('нет тайла'); return {data: await b.arrayBuffer()}; } let buf; try { buf = await tileBytes(keyUrl('dem', z, x, y)); } catch(e){ const b = await parentTile(keyUrl('dem', '{z}', '{x}', '{y}'), z, x, y, true); if (!b) throw e; buf = await b.arrayBuffer(); } return {data: await cleanDem(buf)}; }); v3proto = true; }
const B = v3bases(), cur = B[state.layer] ? state.layer : state.layer === 'ya_map' ? 'topo' : 'esri';
$('v3base').innerHTML = Object.entries(B).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');
const ex = +$('v3ex').value, c = map.getCenter();
v3center = c;
if (v3){ try { v3.remove(); } catch(e){} v3 = null; }
try {
v3 = new ml.Map({container:'v3map', fadeDuration:0, preserveDrawingBuffer:true, center:[c.lng, c.lat], zoom:Math.max(1, map.getZoom() - 1), pitch:60, maxPitch:85, attributionControl:false,
style:{version:8, sources:{base:v3baseSrc(cur),
dem:{type:'raster-dem', tiles:['skat://dem/{z}/{x}/{y}'], tileSize:256, encoding:'terrarium', maxzoom:14},
dem2:{type:'raster-dem', tiles:['skat://dem/{z}/{x}/{y}'], tileSize:256, encoding:'terrarium', maxzoom:14},
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
v3.on('load', () => { $('v3msg').textContent = 'Наклон — двумя пальцами вверх/вниз, поворот — двумя пальцами по кругу. Компас справа — север вверх.'; });
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
const bmp = await createImageBitmap(new Blob([buf], {type:'image/png'})), W = bmp.width, H = bmp.height;
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
function v3bar(){ const el = $('v3act'); if (!v3sel){ el.classList.remove('on'); el.innerHTML = ''; return; }
const a = state.arrays[v3sel.ai], p = a && v3item(a); if (!p){ v3sel = null; return v3bar(); }
el.innerHTML = `<b>${escapeHtml(v3sel.ei != null ? ENV_N[p.k] || 'Объект' : labelOf(a, v3sel.pi))}${v3move ? ' — коснитесь нового места' : ''}</b><button data-a="card">Карточка</button><button data-a="move" class="${v3move ? 'on' : ''}">Переместить</button><button data-a="l">↺ 15°</button><button data-a="r">↻ 15°</button>${v3route ? `<button data-a="rok" class="on">Готово (${v3route.pts.length})</button><button data-a="rx">Сброс</button>` : `<button data-a="route">Маршрут</button>${p.path ? `<button data-a="play">▶</button><select data-a="spd">${[5, 10, 20, 40, 60].map(v => `<option value="${v}"${(p.spd || 20) === v ? ' selected' : ''}>${v} км/ч</option>`).join('')}</select>` : ''}`}${extraBar(a, p)}<button data-a="del">Удалить</button><button data-a="x">✕</button>`;
const sp = el.querySelector('[data-a=spd]'); if (sp) sp.onchange = e => { p.spd = +e.target.value; persist(); };
el.classList.add('on'); }
$('v3act').onclick = e => { const b = e.target.closest('button'); if (!b || !v3sel) return; const a = state.arrays[v3sel.ai], p = a && v3item(a); if (!p) return;
const A = b.dataset.a;
if (A === 'card'){ if (v3sel.ei == null) openPoint(a, v3sel.pi); return; }
if (A === 'route'){ v3route = {pts:[[p.lng, p.lat]]}; v3bar(); toast('Касайтесь 3D-карты по точкам маршрута, затем «Готово»'); return; }
if (A === 'rx'){ v3route = null; delete p.path; persist(); envRefresh(); v3bar(); return; }
if (A === 'rok'){ if (v3route.pts.length > 1){ p.path = v3route.pts; p.spd = p.spd || 20; } v3route = null; persist(); envRefresh(); v3bar(); return; }
if (A === 'play'){ playAnim([{key:(v3sel.ei != null ? 'e' : '') + a.id + ':' + (v3sel.ei != null ? v3sel.ei : v3sel.pi), it:p}]); return; }
if (A === 'spd') return;
if (A === 'move'){ v3move = !v3move; v3bar(); return; }
if (A === 'l' || A === 'r'){ p.rot = ((((p.rot ?? a.rot) ?? (v3sel.ei == null && sideOf(a, p) === 'b' ? 180 : 0)) + (A === 'r' ? 15 : -15)) % 360 + 360) % 360; v3upd(); toast(`Поворот ${p.rot}°`); return; }
if (A === 'del'){ if (!confirm(`Удалить «${labelOf(a, v3sel.pi)}»?`)) return; if (v3sel.ei != null) a.env.splice(v3sel.ei, 1); else a.points.splice(v3sel.pi, 1); envRefresh(); v3sel = null; v3move = false; v3bar(); v3upd(); return; }
v3sel = null; v3move = false; v3route = null; envRefresh(); v3bar(); };
function v3tap(e){
if (v3draw){ v3draw.pts.push([+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]); envRefresh(); drawBar(); return; }
if (v3route){ v3route.pts.push([+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]); envRefresh(); v3bar(); return; }
if (v3move && v3sel){ const a = state.arrays[v3sel.ai], p = a && v3item(a); if (p){ const dla = e.lngLat.lat - p.lat, dlo = e.lngLat.lng - p.lng; ['line', 'ring', 'path'].forEach(k => { if (p[k]) p[k] = p[k].map(q => [+(q[0] + dlo).toFixed(7), +(q[1] + dla).toFixed(7)]); }); p.lat = +e.lngLat.lat.toFixed(7); p.lng = +e.lngLat.lng.toFixed(7); if (!p.hManual) fillHeight(p); if (!p.placeManual) delete p.place; v3upd(); } v3move = false; v3bar(); return; }
const pt = e.point, L = ['mdl', 'tac'].concat(v3.getStyle().layers.filter(l => l.id.startsWith('e_')).map(l => l.id)).filter(id => v3.getLayer(id));
const f = v3.queryRenderedFeatures([[pt.x - 14, pt.y - 14], [pt.x + 14, pt.y + 14]], {layers:L}).find(q => q.properties && q.properties.ai != null);
v3sel = f ? (f.properties.ei != null ? {ai:+f.properties.ai, ei:+f.properties.ei} : {ai:+f.properties.ai, pi:+f.properties.pi}) : null; v3move = false; v3bar(); }
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
if (b.dataset.a === 'go'){ $('v3my').classList.remove('on'); try { v3.flyTo({center:[it.lng, it.lat], zoom:Math.max(v3.getZoom(), 16.5)}); } catch(_){} v3sel = it.ei != null ? {ai:it.ai, ei:it.ei} : {ai:it.ai, pi:it.pi}; v3move = false; v3bar(); return; }
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
const optSel = (a, vals, cur, fmt) => `<select data-o="${a}">${vals.map(v => `<option value="${v}"${+cur === v ? ' selected' : ''}>${fmt(v)}</option>`).join('')}</select>`;
function extraBar(a, p){ let h = optSel('msc', [.5, .75, 1, 1.5, 2, 3], p.msc || 1, v => 'размер ×' + v);
const key = v3sel.ei == null ? itKind(a, p) : null;
if (key && MDL_AIR[key]) h += optSel('alt', [20, 40, 60, 100, 150, 240, 400, 600], p.alt ?? (v3cfg.alt || 60), v => 'высота ' + v + ' м');
if (v3sel.ei != null && ['trow', 'tpoly', 'grove'].includes(p.k)){ if (p.k !== 'grove') h += optSel('step', [3, 5, 7, 10, 15, 25], p.step || 7, v => 'шаг ' + v + ' м'); if (p.k === 'trow') h += optSel('w', [3, 6, 8, 12, 20, 40], p.w || 8, v => 'ширина ' + v + ' м');
if (p.k === 'grove'){ h += optSel('n', [5, 10, 14, 25, 40, 80], p.n || 14, v => v + ' деревьев'); h += optSel('r', [8, 12, 18, 30, 50], p.r || 18, v => 'радиус ' + v + ' м'); }
h += optSel('sp', [0, .2, .4, .7, 1], p.sp ?? .3, v => 'рассеивание ' + v); h += optSel('lf', ['m', 'n', 'b'].map((x, i) => i), ['m', 'n', 'b'].indexOf(p.lf || 'm'), v => ['смешанные', 'ели', 'берёзы'][v]); }
if (key === 'rszo') h += optSel('rs', [4, 8, 12, 20, 40], p.rs || 12, v => v + ' РС');
return h; }
$('v3act').addEventListener('change', e => { const sl = e.target.closest('select[data-o]'); if (!sl || !v3sel) return; const a = state.arrays[v3sel.ai], p = a && v3item(a); if (!p) return; const k = sl.dataset.o, v = +sl.value;
if (k === 'lf') p.lf = ['m', 'n', 'b'][v]; else if (k === 'msc' && v === 1) delete p.msc; else p[k] = v; persist(); v3upd(); });
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
render(gl, matrix){ const T = THREE, anim = tjFrame(), o = TJ.origin; if (!o) return; const m = new T.Matrix4().fromArray(matrix), l = new T.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new T.Vector3(o.s, -o.s, o.s)).multiply(new T.Matrix4().makeRotationX(Math.PI / 2));
this.cam.projectionMatrix = m.multiply(l); this.r.resetState(); this.r.render(TJ.scene, this.cam); if (anim) v3.triggerRepaint(); },
onRemove(){ TJ.objs.clear(); TJ.scene = null; } }; }
function tjAdd(){ if (!v3 || !window.THREE) return; try { if (!v3.getLayer('tj3')) v3.addLayer(tjLayer()); TJ.ready = true; TJ.on = true; v3.getSource('mdl') && v3.getSource('mdl').setData(v3mdl(v3.getCenter())); v3.triggerRepaint(); } catch(e){ console.error('tj3', e); TJ.on = false; } }
{ const o3 = open3D; window.open3D = async function(){ const r = await o3.apply(this, arguments); try { if (v3 && !v3._dk){ v3._dk = 1; v3.on('dragstart', () => window.dockPan && dockPan(true)); v3.on('zoomstart', e => { if (e.originalEvent && window.dockPan) dockPan(true); }); v3.on('rotatestart', () => window.dockPan && dockPan(true)); v3.on('pitchstart', () => window.dockPan && dockPan(true)); v3.on('moveend', () => window.dockPan && dockPan(false)); } } catch(e){} if (v3cfg.tj === false) return r; loadThree().then(() => { if (!v3) return; if (v3.loaded()) tjAdd(); else v3.once('load', tjAdd); if (!TJ.sd){ TJ.sd = 1; } v3.on('styledata', () => { if (TJ.on && !v3.getLayer('tj3')) setTimeout(tjAdd, 50); }); }).catch(() => toast('Объёмные модели недоступны без сети — показаны упрощённые')); return r; }; }
{ const c3 = close3D; window.close3D = function(){ TJ.on = false; TJ.ready = false; TJ.origin = null; TJ.objs.clear(); return c3.apply(this, arguments); }; }
window.__mod_mk = 1;
