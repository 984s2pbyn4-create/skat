// СКАТ — модуль «Макет» (3D, объекты, сценарии, камеры, огонь). Грузится лениво из index.html (modLoad). Версия 6.5.1
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
v3.on('load', ensureObjs); v3.on('load', envInit); v3.on('load', fxInit); v3.on('moveend', ensureObjs); v3.on('click', v3tap);
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
el.innerHTML = `<b>${escapeHtml(v3sel.ei != null ? ENV_N[p.k] || 'Объект' : labelOf(a, v3sel.pi))}${v3move ? ' — коснитесь нового места' : ''}</b><button data-a="card">Карточка</button><button data-a="move" class="${v3move ? 'on' : ''}">Переместить</button><button data-a="l">↺ 15°</button><button data-a="r">↻ 15°</button>${v3route ? `<button data-a="rok" class="on">Готово (${v3route.pts.length})</button><button data-a="rx">Сброс</button>` : `<button data-a="route">Маршрут</button>${p.path ? `<button data-a="play">▶</button><button data-a="t0">Старт ${fmtT(p.t0 || 0)}</button><select data-a="spd">${[5, 10, 20, 40, 60].map(v => `<option value="${v}"${(p.spd || 20) === v ? ' selected' : ''}>${v} км/ч</option>`).join('')}</select>` : ''}`}${extraBar(a, p)}<button data-a="del">Удалить</button><button data-a="x">✕</button>`;
const sp = el.querySelector('[data-a=spd]'); if (sp) sp.onchange = e => { p.spd = +e.target.value; persist(); };
el.classList.add('on'); }
$('v3act').onclick = e => { const b = e.target.closest('button'); if (!b || !v3sel) return; const a = state.arrays[v3sel.ai], p = a && v3item(a); if (!p) return;
const A = b.dataset.a;
if (A === 'card'){ if (v3sel.ei == null) openPoint(a, v3sel.pi); return; }
if (A === 'route'){ v3route = {pts:[[p.lng, p.lat]]}; v3bar(); toast('Касайтесь 3D-карты по точкам маршрута, затем «Готово»'); return; }
if (A === 'rx'){ v3route = null; delete p.path; persist(); envRefresh(); v3bar(); return; }
if (A === 'rok'){ if (v3route.pts.length > 1){ p.path = v3route.pts; p.spd = p.spd || 20; } v3route = null; persist(); envRefresh(); v3bar(); return; }
if (A === 't0'){ const v = prompt('Время старта от «Ч» (минуты:секунды)', `${Math.floor((p.t0 || 0) / 60)}:${String((p.t0 || 0) % 60).padStart(2, '0')}`); if (v === null) return; const m2 = v.trim().match(/^(\d+)(?:[:.,](\d+))?$/); if (!m2){ toast('Формат: 5:30 или 5'); return; } p.t0 = (+m2[1]) * 60 + (+(m2[2] || 0)); persist(); if (SC.cur){ SC.T = scnDur(SC.cur); $('tlR').max = SC.T; scnSet(SC.t, true); } v3bar(); return; }
if (A === 'play'){ playAnim([{key:(v3sel.ei != null ? 'e' : '') + a.id + ':' + (v3sel.ei != null ? v3sel.ei : v3sel.pi), it:p}]); return; }
if (A === 'spd') return;
if (A === 'move'){ v3move = !v3move; v3bar(); return; }
if (A === 'l' || A === 'r'){ p.rot = ((((p.rot ?? a.rot) ?? (v3sel.ei == null && sideOf(a, p) === 'b' ? 180 : 0)) + (A === 'r' ? 15 : -15)) % 360 + 360) % 360; v3upd(); toast(`Поворот ${p.rot}°`); return; }
if (A === 'del'){ if (!confirm(`Удалить «${labelOf(a, v3sel.pi)}»?`)) return; if (v3sel.ei != null) a.env.splice(v3sel.ei, 1); else a.points.splice(v3sel.pi, 1); envRefresh(); v3sel = null; v3move = false; v3bar(); v3upd(); return; }
v3sel = null; v3move = false; v3route = null; envRefresh(); v3bar(); };
function v3tap(e){ if (SIM.live) return;
if (fireMode){ fireTap(e); return; }
if (v3draw){ v3draw.pts.push([+e.lngLat.lng.toFixed(7), +e.lngLat.lat.toFixed(7)]); envRefresh(); drawBar(); return; }
if (SC.pick){ scnPickTap(e); return; }
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
$('v3play').style.display = secMode === 'mk' ? '' : 'none'; $('v3scnBtn').style.display = secMode === 'mk' ? '' : 'none';
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
animT0 = performance.now(); $('v3play').textContent = '■ Стоп';
const step = now => { const t = (now - animT0) / 1000; let alive = false;
animList.forEach(x => { const q = pathPos(x.it.path, t * (x.it.spd || 20) / 3.6); if (!q.end) alive = true; ANIM.set(x.key, q); });
if (now - animLast > 60){ animLast = now; try { v3.getSource('mdl').setData(v3mdl(v3.getCenter())); } catch(_){} envRefresh(); }
animRaf = alive ? requestAnimationFrame(step) : 0; if (!alive){ $('v3play').textContent = '▶ Все'; toast('Анимация завершена'); } };
animRaf = requestAnimationFrame(step);
}
function stopAnim(){ if (animRaf) cancelAnimationFrame(animRaf); animRaf = 0; ANIM.clear(); $('v3play').textContent = '▶ Все'; try { v3.getSource('mdl').setData(v3mdl(v3.getCenter())); } catch(_){} envRefresh(); }
function allAnimItems(){ const L1 = []; state.arrays.forEach(a => { if (a.hidden) return; a.points.forEach((p, pi) => L1.push({key:a.id + ':' + pi, it:p})); (a.env || []).forEach((o, ei) => L1.push({key:'e' + a.id + ':' + ei, it:o})); }); return L1; }
$('v3play').onclick = () => animRaf ? stopAnim() : playAnim(allAnimItems());
{ const box = $('v3map');
const clr = () => { if (v3lp){ clearTimeout(v3lp.tm); v3lp = null; } };
box.addEventListener('touchstart', e => { clr(); if (e.touches.length !== 1 || !v3 || secMode !== 'mk') return; const t = e.touches[0]; v3lp = {x:t.clientX, y:t.clientY};
v3lp.tm = setTimeout(() => { if (!v3lp) return; const r = box.getBoundingClientRect(), ll = v3.unproject([v3lp.x - r.left, v3lp.y - r.top]), x = v3lp.x, y = v3lp.y; v3lp = null; openRadial3D(x, y, ll); }, 600); }, {passive:true});
box.addEventListener('touchmove', e => { if (!v3lp) return; const t = e.touches[0]; if (e.touches.length > 1 || Math.hypot(t.clientX - v3lp.x, t.clientY - v3lp.y) > 10) clr(); }, {passive:true});
box.addEventListener('touchend', clr); box.addEventListener('touchcancel', clr); }

// ======== МАКЕТ: СЦЕНЫ И ВРЕМЕННАЯ ШКАЛА ========
const SC = {cur:null, t:0, T:0, mul:1, raf:0, last:0, prev:0, orbit:false, pick:null};
const fmtT = t => `Ч+${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function pathLen(P){ let L1 = 0; for (let i = 1; i < P.length; i++){ const [kx, ky] = mk(P[i][1]); L1 += Math.hypot((P[i][0] - P[i-1][0]) * kx, (P[i][1] - P[i-1][1]) * ky); } return L1; }
function scnItems(sc){ const [w, s0, e, n] = sc.b; return allAnimItems().filter(x => { const q = x.it.path && x.it.path.length ? {lng:x.it.path[0][0], lat:x.it.path[0][1]} : x.it; return q.lng >= w && q.lng <= e && q.lat >= s0 && q.lat <= n; }); }
function scnDur(sc){ let T = 0; scnItems(sc).forEach(x => { const it = x.it; if (it.path && it.path.length > 1) T = Math.max(T, simDurOf(it)); (it.fires || []).forEach(f => { const k = FIRE_K[f.k] || FIRE_K.gun; T = Math.max(T, (f.t0 || 0) + (f.n || k.n) * (f.ev || k.ev) + (f.tof || k.tof) + 3); }); }); return Math.max(10, Math.ceil(T + 3)); }
function scnRefresh(force){ const now = performance.now(); if (!force && now - SC.last < 60) return; SC.last = now; try { v3.getSource('mdl').setData(v3mdl(v3.getCenter())); } catch(_){} envRefresh(); }
function scnSet(t, force){ if (!SC.cur) return; SC.t = Math.max(0, Math.min(SC.T, t));
scnItems(SC.cur).forEach(x => { const it = x.it; if (!it.path || it.path.length < 2) return; const loc = Math.max(0, SC.t - (it.t0 || 0)); ANIM.set(x.key, simPos(it, loc)); });
$('tlR').value = SC.t; $('tlT').textContent = `${fmtT(SC.t)} / ${fmtT(SC.T)}`; scnRefresh(force); fireFx(SC.t); const ph = document.querySelector('.tlph'); if (ph) ph.style.left = (SC.t * tlZoom + 110) + 'px'; }
function scnLoop(now){ const dt = SC.prev ? (now - SC.prev) / 1000 : 0; SC.prev = now;
if (SC.orbit && camMode === 'free') try { v3.setBearing(v3.getBearing() + dt * 4); } catch(_){}
applyCam(dt);
scnSet(SC.t + dt * SC.mul);
if (SC.t >= SC.T){ scnPause(); toast('Сцена завершена'); return; } SC.raf = requestAnimationFrame(scnLoop); }
function scnPlay(){ if (!SC.cur) return; if (SC.t >= SC.T) SC.t = 0; SC.prev = 0; $('tlP').textContent = '⏸'; SC.raf = requestAnimationFrame(scnLoop); }
function scnPause(){ if (SC.raf) cancelAnimationFrame(SC.raf); SC.raf = 0; $('tlP').textContent = '▶'; scnRefresh(true); }
function scnBox(){ const F = []; const box = b => [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]];
if (SC.cur) F.push({type:'Feature', properties:{}, geometry:{type:'LineString', coordinates:box(SC.cur.b)}});
if (SC.pick && SC.pick.pts.length) SC.pick.pts.forEach(q => F.push({type:'Feature', properties:{}, geometry:{type:'Point', coordinates:q}}));
try { if (!v3.getSource('scnbox')){ v3.addSource('scnbox', {type:'geojson', data:{type:'FeatureCollection', features:F}}); v3.addLayer({id:'scnbox', type:'line', source:'scnbox', paint:{'line-color':'#ffd400', 'line-width':3, 'line-dasharray':[3, 2]}}); v3.addLayer({id:'scnpt', type:'circle', source:'scnbox', filter:['==', '$type', 'Point'], paint:{'circle-color':'#ffd400', 'circle-radius':6, 'circle-stroke-color':'#000', 'circle-stroke-width':1}}); }
else v3.getSource('scnbox').setData({type:'FeatureCollection', features:F}); } catch(_){} }
function renderScn(){ const el = $('scnList');
el.innerHTML = state.scenes.length ? state.scenes.map((sc, i) => `<div class="arr"><div class="nm"><div>${escapeHtml(sc.name)}</div><div>${fmtT(scnDur(sc))} · объектов: ${scnItems(sc).length}</div></div><button data-i="${i}" data-a="open">Открыть</button><button class="eye" data-i="${i}" data-a="del">🗑</button></div>`).join('') : '<div class="empty">Сцен пока нет.</div>';
el.querySelectorAll('button').forEach(b => b.onclick = () => { const sc = state.scenes[+b.dataset.i];
if (b.dataset.a === 'open') openScene(sc); else askConfirm(`Удалить сцену «${sc.name}»? Объекты на карте останутся.`, 'Удалить', () => { state.scenes.splice(+b.dataset.i, 1); persist(); if (SC.cur === sc) closeScene(); renderScn(); }); }); }
function openScene(sc){ $('v3scn').classList.remove('on'); SC.cur = sc; SC.T = scnDur(sc); $('tlR').max = SC.T; $('v3tl').classList.add('on'); $('tlN').textContent = sc.name;
try { v3.jumpTo({center:sc.cam.c, zoom:sc.cam.z, pitch:sc.cam.p, bearing:sc.cam.br}); } catch(_){} ANIM.clear(); scnBox(); fxInit(); scnSet(0, true); tlRender(); }
function closeScene(){ scnPause(); SC.cur = null; ANIM.clear(); fireFx(-999); tlRender(); $('v3tl').classList.remove('on'); scnBox(); scnRefresh(true); }
$('v3scnBtn').onclick = () => { $('v3panel').classList.remove('on'); $('v3my').classList.remove('on'); renderScn(); $('v3scn').classList.toggle('on'); };
$('scnNew').onclick = () => { $('v3scn').classList.remove('on'); SC.pick = {pts:[]}; scnBox(); toast('Коснитесь 3D-карты в двух противоположных углах сцены'); };
$('tlP').onclick = () => SC.raf ? scnPause() : scnPlay();
$('tlR').oninput = e => { scnPause(); scnSet(+e.target.value, true); };
$('tlM').querySelectorAll('button').forEach(b => b.onclick = () => { SC.mul = +b.dataset.m; $('tlM').querySelectorAll('button').forEach(q => q.classList.toggle('on', q === b)); });
$('tlO').onchange = e => { SC.orbit = e.target.checked; };
$('tlCam').onclick = () => { if (!SC.cur) return; SC.cur.cam = {c:v3.getCenter().toArray(), z:v3.getZoom(), p:v3.getPitch(), br:v3.getBearing()}; persist(); toast('Вид камеры сцены сохранён'); };
$('tlX').onclick = closeScene;
function scnPickTap(e){ SC.pick.pts.push([+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]); scnBox();
if (SC.pick.pts.length < 2) return true;
const [[x1, y1], [x2, y2]] = SC.pick.pts; SC.pick = null; const name = (prompt('Название сцены', `Сцена ${state.scenes.length + 1}`) || '').trim() || `Сцена ${state.scenes.length + 1}`;
const sc = {id:Date.now(), name, b:[Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)], cam:{c:v3.getCenter().toArray(), z:v3.getZoom(), p:v3.getPitch(), br:v3.getBearing()}};
state.scenes.push(sc); persist(); openScene(sc); toast('Сцена создана. Объектам в ней задайте маршрут и время старта'); return true; }

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
$('v3myBtn').onclick = () => { $('v3panel').classList.remove('on'); $('v3scn').classList.remove('on'); renderMy(); $('v3my').classList.toggle('on'); };

MDLS.ls3 = [...man(-1.1).map(p => (p[2] += .7, p)), ...man(0), ...man(1.1).map(p => (p[2] -= .7, p))];
MDLS.mortar = [MB(.35, 0, .55, .55, 0, .08, 'dk'), ...Array.from({length:8}, (_, i) => MB(.3 - i * .15, 0, .22, .14, .1 + i * .15, .32 + i * .15, 'dk')),
...[1, -1].flatMap(sg => Array.from({length:5}, (_, i) => { const t = i / 4; return MB(-.95 + t * .4, sg * (.38 - t * .3), .09, .09, t * .8, t * .8 + .22, 'dk'); })), ...man(1.1).map(p => (p[2] += .6, p))];
// ======== МАКЕТ: СЦЕНАРИЙ (МОНТАЖ), КАМЕРЫ, ОГОНЬ, НАСТРОЙКИ ОБЪЕКТОВ ========
const FIRE_K = {gun:{tof:28, ev:6, n:6}, sau:{tof:30, ev:6, n:6}, rszo:{tof:25, ev:.5, n:12}, mortar:{tof:18, ev:5, n:8}, tank:{tof:1.5, ev:8, n:5}};
let fireMode = null, camMode = 'free', camAng = 0, tlZoom = 8;
const fxSrc = () => { try { return v3.getSource('fx'); } catch(e){ return null; } };
function fxInit(){ try { if (!v3.getSource('fx')){ v3.addSource('fx', {type:'geojson', data:{type:'FeatureCollection', features:[]}});
v3.addSource('fxp', {type:'geojson', data:{type:'FeatureCollection', features:[]}}); v3.addLayer({id:'fxp', type:'symbol', source:'fxp', layout:{'icon-image':['get', 'img'], 'icon-size':['get', 'sz'], 'icon-allow-overlap':true, 'icon-ignore-placement':true, 'icon-anchor':'bottom', 'icon-pitch-alignment':'viewport'}});
v3.addLayer({id:'fx', type:'fill-extrusion', source:'fx', paint:{'fill-extrusion-color':['get', 'c'], 'fill-extrusion-base':['get', 'b'], 'fill-extrusion-height':['get', 'h'], 'fill-extrusion-opacity':.9}}); }
v3.setLayoutProperty('apath', 'visibility', v3cfg.paths === false ? 'none' : 'visible'); } catch(e){} }
function fireFx(t){ const F = [], P = [];
state.arrays.forEach(a => a.points.forEach((p, pi) => { (p.fires || []).forEach(f => { const k = FIRE_K[f.k] || FIRE_K.gun, ov = ANIM.get(a.id + ':' + pi) || p;
for (let i = 0; i < (f.n || k.n); i++){ const ts = (f.t0 || 0) + i * (f.ev || k.ev), dt = t - ts, tof = f.tof || k.tof, hsx = hsh(i * 3.1, f.t0 + 1), hsy = hsh(i * 7.7, f.t0 + 2);
const tx = f.tx + (hsx - .5) * 50 / mk(f.ty)[0], ty = f.ty + (hsy - .5) * 50 / 111320;
if (dt >= 0 && dt < tof){ const u = dt / tof, x = ov.lng + (tx - ov.lng) * u, y = ov.lat + (ty - ov.lat) * u, Hm = f.k === 'tank' ? 3 : Math.max(60, distM({lat:ov.lat, lng:ov.lng}, {lat:ty, lng:tx}) * .25), z = 4 * Hm * u * (1 - u) + 2;
F.push({type:'Feature', properties:{c:'#ffd27a', b:z, h:z + 1.5}, geometry:{type:'Polygon', coordinates:[ngon([x, y], .8, 6)]}});
if (v3cfg.traj !== false) for (let q = 1; q < 24; q++){ const w = q / 24; if (w > u) break; const zz = 4 * Hm * w * (1 - w) + 2; F.push({type:'Feature', properties:{c:'#ff8a2a', b:zz, h:zz + .4}, geometry:{type:'Polygon', coordinates:[ngon([ov.lng + (tx - ov.lng) * w, ov.lat + (ty - ov.lat) * w], .35, 4)]}}); } }
const de = dt - tof; if (de >= 0 && de < 3){ P.push({type:'Feature', properties:{img:de < .8 ? 'boom|' : 'smoke|', sz:de < .8 ? .6 + de : 1 + de * .3}, geometry:{type:'Point', coordinates:[tx, ty]}}); } if (false){ const r = 4 + de * 9, hh = de < .6 ? 14 + de * 20 : 26 - de * 4; F.push({type:'Feature', properties:{c:de < .6 ? '#ffb02e' : '#6d6a64', b:0, h:Math.max(2, hh)}, geometry:{type:'Polygon', coordinates:[ngon([tx, ty], r, 12, i)]}}); }
} }); }));
const s0 = fxSrc(); if (s0) s0.setData({type:'FeatureCollection', features:F}); try { v3.getSource('fxp').setData({type:'FeatureCollection', features:P}); } catch(_){} }
function camTarget(){ let it = null, key = null;
if (v3sel){ const a = state.arrays[v3sel.ai]; if (a){ it = v3item(a); key = (v3sel.ei != null ? 'e' : '') + a.id + ':' + (v3sel.ei != null ? v3sel.ei : v3sel.pi); } }
if (!it && SC.cur){ const x = scnItems(SC.cur).find(z => z.it.path); if (x){ it = x.it; key = x.key; } }
if (!it) return null; const ov = ANIM.get(key); return {lat:(ov || it).lat, lng:(ov || it).lng, hd:(((ov || it).rot ?? 180) - 90 + 360) % 360}; }
function applyCam(dt){ if (camMode === 'free' || !v3) return; const T = camTarget(); if (!T && camMode !== 'top') return; const c0 = T ? [T.lng, T.lat] : v3.getCenter().toArray();
try { if (camMode === 'top') v3.jumpTo({center:c0, pitch:0, bearing:0, zoom:Math.max(15, v3.getZoom())});
else if (camMode === 'third') v3.jumpTo({center:c0, pitch:62, bearing:T.hd, zoom:18});
else if (camMode === 'copter'){ camAng += (dt || .016) * 6; v3.jumpTo({center:c0, pitch:50, bearing:camAng, zoom:17.2}); }
else if (camMode === 'plane'){ camAng += (dt || .016) * 9; const [kx, ky] = mk(T.lat), r = 500, q = camAng * Math.PI / 180; v3.jumpTo({center:[T.lng + Math.cos(q) * r * .25 / kx, T.lat + Math.sin(q) * r * .25 / ky], pitch:68, bearing:(90 - camAng + 360) % 360, zoom:15.6}); }
else if (camMode === 'fpv'){ const [kx, ky] = mk(T.lat), h = T.hd * Math.PI / 180; v3.jumpTo({center:[T.lng + Math.sin(h) * 25 / kx, T.lat + Math.cos(h) * 25 / ky], pitch:84, bearing:T.hd, zoom:19.6}); } } catch(e){} }
$('camSel').onchange = e => { camMode = e.target.value; camAng = v3 ? v3.getBearing() : 0; applyCam(); toast({free:'Свободная камера', top:'Вид сверху', third:'От третьего лица — за выбранным объектом', copter:'С коптера — облёт объекта', plane:'С самолётного БПЛА — круг над объектом', fpv:'От первого лица'}[camMode]); };
// ---- монтажные дорожки
function tlRender(){ const el = $('tlTracks'); if (!SC.cur){ el.innerHTML = ''; return; } const its = scnItems(SC.cur), pxs = tlZoom, W1 = Math.max(300, SC.T * pxs + 40);
const rows = []; its.forEach(x => { const a = state.arrays.find(q => x.key.replace(/^e/, '').startsWith(q.id + ':')); const nm = x.it.k ? (ENV_N[x.it.k] || 'Объект') : (x.it.lbl || x.it.name || 'Объект');
if (x.it.path && x.it.path.length > 1){ const dur = pathLen(x.it.path) / ((x.it.spd || 20) / 3.6); rows.push({nm, it:x.it, t0:x.it.t0 || 0, dur, cls:'mv'}); }
(x.it.fires || []).forEach((f, fi) => { const k = FIRE_K[f.k] || FIRE_K.gun; rows.push({nm:nm + ' · огонь', it:f, t0:f.t0 || 0, dur:(f.n || k.n) * (f.ev || k.ev) + (f.tof || k.tof), cls:'fire'}); }); });
el.innerHTML = `<div class="tlin" style="width:${W1}px"><div class="tlph" style="left:${SC.t * pxs + 110}px"></div>${rows.map((r, k) => `<div class="tlrow"><span class="tln">${escapeHtml(r.nm)}</span><div class="tlclip ${r.cls}" data-k="${k}" style="left:${r.t0 * pxs + 110}px;width:${Math.max(14, r.dur * pxs)}px">${fmtT(r.t0)}<i class="rh"></i></div></div>`).join('') || '<div class="empty" style="padding:8px">В сцене нет объектов с маршрутом или огнём.</div>'}</div>`;
el.querySelectorAll('.tlclip').forEach(c => { const r = rows[+c.dataset.k]; let x0 = null, mode = null, b0 = 0, w0 = 0;
c.addEventListener('touchstart', e => { e.stopPropagation(); x0 = e.touches[0].clientX; mode = e.target.classList.contains('rh') ? 'rs' : 'mv'; b0 = r.t0; w0 = r.dur; }, {passive:true});
c.addEventListener('touchmove', e => { if (x0 == null) return; e.preventDefault(); const d = (e.touches[0].clientX - x0) / pxs;
if (mode === 'mv'){ r.it.t0 = Math.max(0, Math.round((b0 + d) * 2) / 2); c.style.left = (r.it.t0 * pxs + 110) + 'px'; c.firstChild.textContent = fmtT(r.it.t0); }
else if (r.cls === 'mv'){ const nd = Math.max(2, w0 + d); r.it.spd = Math.max(1, Math.round(pathLen(r.it.path) / nd * 3.6)); c.style.width = (nd * pxs) + 'px'; } }, {passive:false});
c.addEventListener('touchend', () => { if (x0 == null) return; x0 = null; persist(); SC.T = scnDur(SC.cur); $('tlR').max = SC.T; scnSet(SC.t, true); tlRender(); }); });
el.querySelector('.tlin').onclick = e => { if (e.target.closest('.tlclip')) return; const r0 = el.querySelector('.tlin').getBoundingClientRect(); scnPause(); scnSet((e.clientX - r0.left - 110) / pxs, true); };
}
$('tlZi').onclick = () => { tlZoom = Math.min(40, tlZoom * 1.5); tlRender(); }; $('tlZo').onclick = () => { tlZoom = Math.max(1, tlZoom / 1.5); tlRender(); };
// ---- размер моделей, параметры деревьев, высота БПЛА, огонь
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
if (key && FIRE_K[key]) h += `<button data-x="fire">Огонь${p.fires && p.fires.length ? ' (' + p.fires.length + ')' : ''}</button>${p.fires && p.fires.length ? '<button data-x="fclr">Сброс огня</button>' : ''}`;
return h; }
$('v3act').addEventListener('change', e => { const sl = e.target.closest('select[data-o]'); if (!sl || !v3sel) return; const a = state.arrays[v3sel.ai], p = a && v3item(a); if (!p) return; const k = sl.dataset.o, v = +sl.value;
if (k === 'lf') p.lf = ['m', 'n', 'b'][v]; else if (k === 'msc' && v === 1) delete p.msc; else p[k] = v; persist(); v3upd(); });
$('v3act').addEventListener('click', e => { const b = e.target.closest('button[data-x]'); if (!b || !v3sel) return; e.stopPropagation(); const a = state.arrays[v3sel.ai], p = a && v3item(a); if (!p) return;
if (b.dataset.x === 'fire'){ fireMode = {a, p}; toast('Коснитесь цели на 3D-карте'); }
if (b.dataset.x === 'fclr'){ delete p.fires; persist(); fireFx(SC.t); v3bar(); if (SC.cur) tlRender(); } }, true);
function fireTap(e){ const {a, p} = fireMode, key = itKind(a, p) || 'gun', k = FIRE_K[key] || FIRE_K.gun; fireMode = null;
(p.fires = p.fires || []).push({tx:+e.lngLat.lng.toFixed(6), ty:+e.lngLat.lat.toFixed(6), t0:Math.round((SC.cur ? SC.t : 0) * 2) / 2, k:key, n:key === 'rszo' ? (p.rs || 12) : k.n, ev:k.ev, tof:k.tof});
persist(); v3bar(); if (SC.cur){ SC.T = scnDur(SC.cur); $('tlR').max = SC.T; tlRender(); } toast(`Огневое поражение: ${k.n} выстр., подлёт ${k.tof} с. Сдвиньте начало на шкале сценария`); }

// ======== ЗАПИСЬ СЦЕНАРИЯ В ВИДЕО (MediaRecorder: кадр 3D + подпись сцены и времени Ч+) ========
const REC = {r:null, raf:0, t0:0};
function recMime(){ if (!window.MediaRecorder) return null; return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e){ return false; } }) || ''; }
function recBtn(){ const b = $('tlRec'); if (!b) return; const s = REC.r ? Math.floor((Date.now() - REC.t0) / 1000) : 0, t = REC.r ? `⏹ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '⏺'; if (b.textContent !== t) b.textContent = t; b.style.color = REC.r ? '#e33' : ''; }
function recBox(vis){ ['scnbox', 'scnpt'].forEach(id => { try { if (v3 && v3.getLayer(id)) v3.setLayoutProperty(id, 'visibility', vis ? 'visible' : 'none'); } catch(e){} }); }
function recStop(){ if (REC.r && REC.r.state !== 'inactive') try { REC.r.stop(); } catch(e){} }
function recStart(){ if (!SC.cur || !v3){ toast('Откройте сцену'); return; } const mime = recMime(), src = v3.getCanvas();
if (mime === null || !HTMLCanvasElement.prototype.captureStream){ toast('Запись видео не поддерживается на этом устройстве'); return; }
const k = Math.min(1, 1920 / Math.max(src.width, src.height)), c = document.createElement('canvas'); c.width = Math.round(src.width * k) & ~1; c.height = Math.round(src.height * k) & ~1; const g = c.getContext('2d');
let rec; try { const vs = c.captureStream(30), au = sndTrack(), o = {videoBitsPerSecond:8e6, audioBitsPerSecond:128000}; let mm = mime; if (au){ vs.addTrack(au); mm = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => { try { return MediaRecorder.isTypeSupported(t); } catch(e){ return false; } }) || ''; } if (mm) o.mimeType = mm; rec = new MediaRecorder(vs, o); } catch(e){ toast('Запись не запустилась: ' + (e.message || e)); return; }
if (SC.raf) scnPause(); const ch = [], name = SC.cur.name, fs = Math.max(14, Math.round(c.height / 28));
rec.ondataavailable = e => { if (e.data && e.data.size) ch.push(e.data); };
rec.onstop = () => { cancelAnimationFrame(REC.raf); REC.r = null; recBox(true); recBtn(); const type = rec.mimeType || mime || 'video/webm', blob = new Blob(ch, {type}); if (!blob.size){ toast('Видео пустое'); return; }
deliverFile(blob, `СКАТ_сцена_${String(name).replace(/[\\/:*?"<>|]/g, '_')}_${stamp()}.${/mp4/.test(type) ? 'mp4' : 'webm'}`, `Видео готово: ${(blob.size / 1048576).toFixed(1)} МБ`); };
const draw = () => { try { g.drawImage(src, 0, 0, c.width, c.height); const tx = `${name} · ${fmtT(SC.t)}`; g.font = `700 ${fs}px "Roboto Condensed", sans-serif`; g.textBaseline = 'top'; g.lineJoin = 'round'; g.lineWidth = Math.max(3, fs / 5); g.strokeStyle = 'rgba(0,0,0,.75)'; g.fillStyle = '#fff'; g.strokeText(tx, fs * .6, fs * .6); g.fillText(tx, fs * .6, fs * .6); } catch(e){} recBtn(); REC.raf = requestAnimationFrame(draw); };
recBox(false); REC.r = rec; REC.t0 = Date.now(); scnSet(0, true); draw(); rec.start(1000); scnPlay(); toast('Запись: сцена с начала. ⏹ — остановить'); }
{ const p0 = scnPause; window.scnPause = () => { p0(); recStop(); }; const c0 = close3D; window.close3D = () => { recStop(); c0(); };
const b = document.createElement('button'); b.id = 'tlRec'; b.title = 'Записать сцену в видео'; b.textContent = '⏺'; $('tlP').after(b); b.onclick = () => REC.r ? scnPause() : recStart(); }
// ======== 6.37: ЗВУК (Web Audio, синтез без файлов; идёт и в запись видео) ========
const SND = {ctx:null, vol:+(lsGet('skat_snd', 1)), last:[], amb:null};
function sndInit(){ if (SND.ctx || !(window.AudioContext || window.webkitAudioContext)) return SND.ctx; const A = SND.ctx = new (window.AudioContext || window.webkitAudioContext)();
SND.out = A.createGain(); SND.out.gain.value = .6 * SND.vol; const cmp = A.createDynamicsCompressor(); SND.out.connect(cmp); cmp.connect(A.destination); try { SND.dest = A.createMediaStreamDestination(); cmp.connect(SND.dest); } catch(e){}
const b = A.createBuffer(1, A.sampleRate * 2, A.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; SND.noise = b; return A; }
['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, () => { const A = sndInit(); if (A && A.state !== 'running') A.resume().catch(() => {}); }, {capture:true, passive:true}));
function sndOK(){ return SND.ctx && SND.ctx.state === 'running' && SND.vol > 0; }
// источник шума с фильтром и огибающей; d — расстояние, м (громкость, приглушение, задержка звука)
function sndNoise(t0, dur, f, q, type, peak, d, att = .005){ const A = SND.ctx, s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(), lp = A.createBiquadFilter(); s.buffer = SND.noise; fl.type = type; fl.frequency.setValueAtTime(f[0], t0); if (f[1]) fl.frequency.exponentialRampToValueAtTime(f[1], t0 + dur); fl.Q.value = q;
lp.type = 'lowpass'; lp.frequency.value = Math.max(300, 9000 / (1 + d / 400)); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak / (1 + d / 350), t0 + att); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); s.connect(fl); fl.connect(lp); lp.connect(g); g.connect(SND.out); s.start(t0, Math.random()); s.stop(t0 + dur + .05); }
function sndTone(t0, dur, f0, f1, type, peak, d){ const A = SND.ctx, o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak / (1 + d / 350), t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g); g.connect(SND.out); o.start(t0); o.stop(t0 + dur + .05); }
function sndLimit(){ const now = performance.now(); SND.last = SND.last.filter(x => now - x < 1000); if (SND.last.length > 14) return false; SND.last.push(now); return true; }
function sndShot(key, d){ if (!sndOK() || !sndLimit()) return; const t = SND.ctx.currentTime + Math.min(3, d / 343);
if (key === 'bmp' || key === 'btr') for (let i = 0; i < (key === 'bmp' ? 3 : 5); i++){ sndNoise(t + i * .11, .09, [3000, 900], .8, 'bandpass', .55, d); sndTone(t + i * .11, .06, 180, 70, 'square', .12, d); }
else if (key === 'mortar'){ sndNoise(t, .35, [1600, 300], .7, 'lowpass', .7, d); sndTone(t, .25, 110, 40, 'sine', .5, d); }
else if (key === 'rszo') for (let i = 0; i < 4; i++){ sndNoise(t + i * .45, 1.4, [600, 3200], 1.2, 'bandpass', .45, d, .08); sndTone(t + i * .45, .3, 90, 40, 'sine', .3, d); }
else { sndNoise(t, .9, [2200, 160], .7, 'lowpass', 1, d); sndTone(t, .5, 75, 32, 'sine', .9, d); sndNoise(t + .12 + d / 2500, 1.6, [500, 120], .5, 'lowpass', .25, d + 300, .1); } }
function sndBoom(d, big){ if (!sndOK() || !sndLimit()) return; const t = SND.ctx.currentTime + Math.min(3, d / 343); sndNoise(t, big ? 2.2 : 1.1, [1800, 90], .6, 'lowpass', big ? 1.1 : .75, d); sndTone(t, big ? 1.2 : .6, 60, 25, 'sine', big ? 1 : .6, d); sndNoise(t + .25, 1.8, [700, 150], .4, 'lowpass', .2, d + 400, .15); }
function sndHit(d){ if (!sndOK() || !sndLimit()) return; const t = SND.ctx.currentTime + Math.min(3, d / 343); sndNoise(t, .35, [2500, 400], .8, 'lowpass', .5, d); }
// фон: двигатели, лязг гусениц, БПЛА, горение
function sndAmb(trk, wh, uav, fire, d){ if (!SND.ctx) return; const A = SND.ctx;
if (!SND.amb){ const mk2 = (src, f, q, type) => { const fl = A.createBiquadFilter(), g = A.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(SND.out); return g; };
const e = A.createOscillator(); e.type = 'sawtooth'; e.frequency.value = 38; e.start(); const n = () => { const s = A.createBufferSource(); s.buffer = SND.noise; s.loop = true; s.start(); return s; };
const lfo = A.createOscillator(), lg = A.createGain(); lfo.type = 'square'; lfo.frequency.value = 7; lg.gain.value = .5; lfo.connect(lg); lfo.start();
const u = A.createOscillator(); u.type = 'sawtooth'; u.frequency.value = 190; u.start(); const ul = A.createOscillator(), ug = A.createGain(); ul.frequency.value = 3; ug.gain.value = 12; ul.connect(ug); ug.connect(u.frequency); ul.start();
const cl = mk2(n(), 1100, 3, 'bandpass'); lg.connect(cl.gain);
SND.amb = {eng:mk2(e, 160, .7, 'lowpass'), rum:mk2(n(), 120, .6, 'lowpass'), cl, uav:mk2(u, 900, 2, 'bandpass'), fire:mk2(n(), 2500, .5, 'highpass')}; }
const on = sndOK() && SC.raf ? 1 : 0, k = 1 / (1 + d / 450), T = A.currentTime + .15, M = SND.amb;
M.eng.gain.linearRampToValueAtTime(on * Math.min(.5, (trk + wh) * .07) * k, T); M.rum.gain.linearRampToValueAtTime(on * Math.min(.35, (trk + wh) * .05) * k, T); M.cl.gain.linearRampToValueAtTime(on * Math.min(.18, trk * .03) * k, T);
M.uav.gain.linearRampToValueAtTime(on * Math.min(.08, uav * .03) * k, T); M.fire.gain.linearRampToValueAtTime(on * Math.min(.12, fire * .03) * k * (.6 + Math.random() * .4), T); }
function sndTrack(){ sndInit(); if (SND.ctx && SND.ctx.state !== 'running') SND.ctx.resume().catch(() => {}); return SND.dest && SND.vol > 0 ? SND.dest.stream.getAudioTracks()[0] : null; }
// ======== 6.37: ШЕВРОНЫ НАД ЮНИТАМИ (как в стратегиях: флажок стороны, тип, имя, боеспособность, состояние) ========
const CHV = {on:lsGet('skat_chev', true) !== false};
function chvIcon(g, key, x, y, s){ g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round';
const R = (a, b, c, d) => g.strokeRect(a, b, c, d); if (key === 'inf'){ g.beginPath(); g.arc(0, -6, 3.5, 0, 7); g.fill(); g.fillRect(-3, -2, 6, 8); g.beginPath(); g.moveTo(-6, 9); g.lineTo(0, 2); g.lineTo(6, 9); g.stroke(); }
else if (key === 'uavp' || key === 'uavk'){ g.beginPath(); g.moveTo(-9, 2); g.lineTo(0, -6); g.lineTo(9, 2); g.lineTo(0, -1); g.closePath(); g.fill(); }
else if (key === 'gun' || key === 'mortar'){ g.beginPath(); g.arc(-3, 5, 4, 0, 7); g.stroke(); g.beginPath(); g.moveTo(-3, 3); g.lineTo(9, -7); g.stroke(); }
else if (key === 'rszo' || key === 'truck'){ R(-9, -4, 12, 8); R(4, -1, 5, 5); g.beginPath(); g.arc(-5, 6, 2, 0, 7); g.arc(5, 6, 2, 0, 7); g.fill(); if (key === 'rszo'){ g.beginPath(); g.moveTo(-8, -6); g.lineTo(2, -10); g.stroke(); } }
else { g.beginPath(); g.roundRect ? g.roundRect(-9, -2, 18, 8, 4) : g.rect(-9, -2, 18, 8); g.stroke(); g.fillRect(-4, -6, 8, 4); g.beginPath(); g.moveTo(4, -4); g.lineTo(key === 'bmp' || key === 'btr' ? 9 : 12, -4); g.stroke(); if (key === 'btr'){ g.beginPath(); [-6, -2, 2, 6].forEach(xx => g.arc(xx, 8, 1.5, 0, 7)); g.fill(); } }
g.restore(); }
function chvDraw(ud, name, col, hp, fl, firing, sel, key, mo, rk, md, am){ const W = 150, H = 66, c = ud.chc || (ud.chc = document.createElement('canvas')); c.width = W * 2; c.height = H * 2; const g = c.getContext('2d'); g.scale(2, 2); g.clearRect(0, 0, W, H);
const dead = fl & 4; g.globalAlpha = dead ? .5 : 1; g.lineJoin = 'round';
g.beginPath(); g.moveTo(4, 4); g.lineTo(W - 4, 4); g.lineTo(W - 4, 26); g.lineTo(W / 2 + 9, 26); g.lineTo(W / 2, 35); g.lineTo(W / 2 - 9, 26); g.lineTo(4, 26); g.closePath();
g.fillStyle = 'rgba(12,16,14,.82)'; g.fill(); g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = sel ? '#ffd400' : col; g.stroke();
g.fillStyle = col; g.fillRect(6, 6, 24, 18); chvIcon(g, key, 18, 15, .85);
g.font = '700 13px "Roboto Condensed","IBM Plex Sans Condensed",sans-serif'; g.fillStyle = '#fff'; g.textBaseline = 'middle'; let nm = String(name || ''); while (nm.length > 3 && g.measureText(nm).width > W - 62) nm = nm.slice(0, -1); if (nm !== String(name || '')) nm += '…'; g.fillText(nm, 35, 15.5);
const st = dead ? ['✖', '#ff3b30'] : fl & 32 ? ['⚑', '#ffffff'] : fl & 2 ? ['✚', '#ff7a1a'] : fl & 16 ? ['?', '#ffd400'] : fl & 1 ? ['⚠', '#ffd400'] : fl & 8 ? ['↩', '#5b9cff'] : firing ? ['◎', '#ff5a3c'] : null;
if (rk){ g.fillStyle = '#ffd400'; for (let k = 0; k < rk; k++){ g.beginPath(); const yy = 30 - k * 5; g.moveTo(7, yy); g.lineTo(13, yy - 3); g.lineTo(19, yy); g.lineTo(19, yy + 2); g.lineTo(13, yy - 1); g.lineTo(7, yy + 2); g.closePath(); g.fill(); } }
if (md){ g.font = '700 11px sans-serif'; g.fillStyle = '#ff9f43'; g.textAlign = 'right'; g.fillText('⚙' + (md & 1 ? 'Х' : '') + (md & 2 ? 'О' : '') + (md & 4 ? 'Э' : ''), W - 26, 15.5); g.textAlign = 'left'; }
if (fl & 32){ g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(3, 3, W - 6, 24); g.setLineDash([]); } if (st){ g.font = '700 14px sans-serif'; g.fillStyle = st[1]; g.textAlign = 'right'; g.fillText(st[0], W - 9, 15.5); g.textAlign = 'left'; }
if (mo != null){ const w = W - 50; g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(25, 49, w, 5); g.fillStyle = mo > 45 ? '#5b9cff' : mo > 15 ? '#c9a0ff' : '#ffffff'; g.fillRect(26, 50, (w - 2) * mo / 100, 3); if (am != null && am < 25){ g.font = '700 10px sans-serif'; g.fillStyle = am ? '#ffcc00' : '#ff3b30'; g.fillText(am ? 'мало БК' : 'нет БК', W - 22 - g.measureText(am ? 'мало БК' : 'нет БК').width + 22, 61); } }
if (hp != null){ const w = W - 50; g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(25, 40, w, 7); g.fillStyle = hp > 60 ? '#4cd964' : hp > 30 ? '#ffcc00' : '#ff3b30'; g.fillRect(26, 41, (w - 2) * Math.max(0, hp) / 100, 5); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1; g.strokeRect(25, 40, w, 7); }
if (!ud.cht){ ud.cht = new THREE.CanvasTexture(c); ud.cht.minFilter = THREE.LinearFilter; } ud.cht.needsUpdate = true; }
// ======== ТАКТИЧЕСКИЙ СИМУЛЯТОР, ЭТАП 1 (6.33): движение с учётом рельефа, видимость, сектора огня, журнал событий ========
// Юнит = знак сцены. Свойства в p: ut (тип), spd (км/ч), vr (наблюдение, м), fr (огонь, м), fs (сектор, °), faz (азимут сектора, если задан)
const UT = {inf:{n:'Пехота', spd:5, vr:1500, fr:600, fs:120, g:.6, eye:1.8}, trk:{n:'Гусеничная (танк, БМП)', spd:30, vr:2500, fr:2500, fs:60, g:.5, eye:2.8}, veh:{n:'Колёсная', spd:40, vr:2000, fr:1500, fs:90, g:.3, eye:2.5},
art:{n:'Артиллерия', spd:25, vr:1500, fr:15000, fs:40, g:.3, eye:2.5, ind:1}, uav:{n:'БПЛА', spd:80, vr:4000, fr:0, fs:0, g:9, eye:300}};
const SIM = {runId:0, g:null, ver:0, ev:[], sel:null, sec:true, vis:false, det:true, los:null, losPts:[], cache:new WeakMap(), lastVs:0};
const utOf = p => UT[p.ut] || ((p.spd || 20) >= 15 ? UT.trk : UT.inf), utK = p => p.ut || ((p.spd || 20) >= 15 ? 'trk' : 'inf');
const uv = (p, k) => p[k] != null && p[k] !== '' ? +p[k] : utOf(p)[k];
// ---- сетка высот сцены (синхронный доступ для движения и видимости)
async function simGrid(b){ const [w, s, e, n] = b, N = 160, pts = []; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pts.push([s + (n - s) * j / (N - 1), w + (e - w) * i / (N - 1)]);
const span = Math.max((e - w) * 111320 * Math.cos((s + n) / 2 * Math.PI / 180), (n - s) * 111320), zd = span < 4000 ? 14 : span < 12000 ? 13 : 12;
let h; try { h = await demSampler(pts, zd); } catch(e){ return; } const H = new Float32Array(N * N); let ok = 0; h.forEach((v, i) => { H[i] = isFinite(v) ? v : NaN; if (isFinite(v)) ok++; });
if (ok < N * N * .5){ toast('Рельеф для симуляции не загружен — движение без учёта склонов'); return; } SIM.g = {b, N, H}; SIM.ver++; }
function hAt(lng, lat){ const G = SIM.g; if (!G) return 0; const [w, s, e, n] = G.b, N = G.N, x = (lng - w) / (e - w) * (N - 1), y = (lat - s) / (n - s) * (N - 1);
if (x < 0 || y < 0 || x > N - 1 || y > N - 1) return 0; const i = Math.min(N - 2, Math.floor(x)), j = Math.min(N - 2, Math.floor(y)), fx = x - i, fy = y - j, H = G.H, a = H[j * N + i], b = H[j * N + i + 1], c = H[(j + 1) * N + i], d = H[(j + 1) * N + i + 1];
const v = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy; return isFinite(v) ? v : 0; }
// ---- движение: шаги ≤ 25 м, скорость падает на подъёмах, крутые склоны — ползком
function simPrep(it){ const sig = JSON.stringify(it.path) + '|' + it.spd + '|' + it.ut + '|' + SIM.ver; let c = SIM.cache.get(it); if (c && c.sig === sig) return c;
const P = [], T = [], R = [], B = [], D = [], F = [], u = utOf(it), v0 = (it.spd || u.spd) / 3.6; let t = 0, steep = 0; const path = it.path || [];
for (let k = 1; k < path.length; k++){ const [x1, y1] = path[k - 1], [x2, y2] = path[k], [kx, ky] = mk(y1), dx = (x2 - x1) * kx, dy = (y2 - y1) * ky, L0 = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(L0 / 25)), brg = (90 - Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, rot = Math.round(180 - Math.atan2(dy, dx) * 180 / Math.PI);
for (let q = 0; q < n; q++){ const xa = x1 + (x2 - x1) * q / n, ya = y1 + (y2 - y1) * q / n, xb = x1 + (x2 - x1) * (q + 1) / n, yb = y1 + (y2 - y1) * (q + 1) / n, d = L0 / n;
if (!P.length){ P.push([xa, ya]); T.push(0); R.push(rot); B.push(brg); D.push(0); F.push(1); }
let f = 1; if (SIM.g && utK(it) !== 'uav'){ const g = d ? (hAt(xb, yb) - hAt(xa, ya)) / d : 0; f = g > 0 ? 1 - 1.6 * g / u.g : 1 - Math.min(.3, Math.max(0, -g - .08) * 1.5); if (g > u.g){ f = .08; steep++; } f = Math.max(.08, Math.min(1, f)); }
t += d / (v0 * f); P.push([xb, yb]); T.push(t); R.push(rot); B.push(brg); D.push(D[D.length - 1] + d); F.push(f); } }
c = {sig, P, T, R, B, D, F, steep}; SIM.cache.set(it, c); return c; }
function simPos(it, t){ const c = simPrep(it), T = c.T, n = T.length; if (n < 2){ const p = it.path && it.path[0]; return p ? {lng:p[0], lat:p[1], rot:0, brg:0, end:true} : {lng:it.lng, lat:it.lat, rot:0, brg:0, end:true}; }
if (t >= T[n - 1]) return {lng:c.P[n - 1][0], lat:c.P[n - 1][1], rot:c.R[n - 1], brg:c.B[n - 1], end:true}; let lo = 0, hi = n - 1; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
const f = (t - T[lo]) / ((T[hi] - T[lo]) || 1); return {lng:c.P[lo][0] + (c.P[hi][0] - c.P[lo][0]) * f, lat:c.P[lo][1] + (c.P[hi][1] - c.P[lo][1]) * f, rot:c.R[hi], brg:c.B[hi], end:false}; }
function simDurOf(it){ const c = simPrep(it); return (it.t0 || 0) + (c.T.length ? c.T[c.T.length - 1] : 0); }
// ---- видимость
function losOk(a, b, ea, eb){ const [kx, ky] = mk(a[1]), D = Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * ky), n = Math.max(4, Math.min(80, Math.ceil(D / 40))), za = hAt(a[0], a[1]) + ea, zb = hAt(b[0], b[1]) + eb;
for (let i = 1; i < n; i++){ const f = i / n; if (hAt(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f) > za + (zb - za) * f) return false; } return true; }
function viewshed(c, R, eye){ const F = [], NR = 144, [kx, ky] = mk(c[1]), st = Math.max(25, R / 70), z0 = hAt(c[0], c[1]) + eye;
const pt = (a, d) => [c[0] + Math.sin(a) * d / kx, c[1] + Math.cos(a) * d / ky];
for (let r = 0; r < NR; r++){ const a1 = r / NR * 2 * Math.PI, a2 = (r + 1) / NR * 2 * Math.PI, am = (a1 + a2) / 2; let maxS = -Infinity, run = null;
for (let d = st; d <= R + 1; d += st){ const q = pt(am, d), s = (hAt(q[0], q[1]) + 1.5 - z0) / d, vis = s >= maxS; maxS = Math.max(maxS, (hAt(q[0], q[1]) - z0) / d);
if (vis && run == null) run = d - st; if ((!vis || d + st > R + 1) && run != null){ const e = vis ? d : d - st; if (e > run) F.push({type:'Feature', properties:{}, geometry:{type:'Polygon', coordinates:[[pt(a1, run), pt(a1, e), pt(a2, e), pt(a2, run), pt(a1, run)]]}}); run = null; } } }
return F; }
function sector(c, R, brg, w){ const [kx, ky] = mk(c[1]), L1 = []; if (w >= 360) for (let i = 0; i <= 72; i++){ const a = i / 72 * 2 * Math.PI; L1.push([c[0] + Math.sin(a) * R / kx, c[1] + Math.cos(a) * R / ky]); }
else { L1.push(c); for (let i = 0; i <= 24; i++){ const a = (brg - w / 2 + w * i / 24) * Math.PI / 180; L1.push([c[0] + Math.sin(a) * R / kx, c[1] + Math.cos(a) * R / ky]); } L1.push(c); } return L1; }
// ---- юниты сцены и их положение в момент t
function simUnits(){ if (!SC.cur) return []; return scnItems(SC.cur).filter(x => x.key.indexOf('e') !== 0).map(x => { const [aid, pi] = x.key.split(':'), a = arrById(+aid); return a ? {key:x.key, a, p:x.it, i:+pi, side:sideOf(a, x.it)} : null; }).filter(Boolean); }
function simAt(u, t){ const p = u.p; if (SIM.run){ const i = SIM.run.idx.get(u.key), S = SIM.run.st[i], fr = simFrame(t); if (i != null && fr){ const F0 = fr.F0, k1 = Math.min(SIM.run.frames.length - 1, Math.floor(t) + 1), F1 = SIM.run.frames[k1], ff = Math.min(1, t - Math.floor(t));
if (F0.x[i] != null){ const x1 = F1.x[i] != null ? F1.x[i] : F0.x[i], y1 = F1.y[i] != null ? F1.y[i] : F0.y[i], a = F0.a[i] != null ? F0.a[i] : 0; return {c:[F0.x[i] + (x1 - F0.x[i]) * ff, F0.y[i] + (y1 - F0.y[i]) * ff], brg:a, rot:Math.round(a - 90)}; }
if (!S.prep) return {c:[p.lng, p.lat], brg:F0.a[i] != null ? F0.a[i] : +(p.faz || p.rot || 0)}; const q = posAtS(S.prep, fr.s[i]); if (F0.a[i] != null) return {c:q.c, brg:F0.a[i], rot:q.rot}; return {c:q.c, brg:p.faz != null && p.faz !== '' ? +p.faz : (fr.F0.f[i] & 8 ? (q.brg + 180) % 360 : q.brg), rot:(fr.F0.f[i] & 8) ? (q.rot + 180) % 360 : q.rot}; } } if (p.path && p.path.length > 1){ const q = simPos(p, Math.max(0, t - (p.t0 || 0))); return {c:[q.lng, q.lat], brg:p.faz != null && p.faz !== '' ? +p.faz : q.brg}; } return {c:[p.lng, p.lat], brg:+(p.faz || p.rot || 0)}; }
// ---- этап 2 (6.34): пошаговый расчёт боя — обнаружение с задержкой, огонь, подавление, потери, команды, поведение
const FP = {inf:[40, 5], trk:[70, 60], veh:[35, 6], art:[50, 18], uav:[0, 0]}, AMMO = {inf:900, trk:600, veh:600, art:300, uav:0}; // боезапас — секунды непрерывного огня // поражение, %/мин по [незащищённым, бронированным]
const BH = {go:'идёт по маршруту', halt:'стоп при обнаружении', avoid:'отход под огнём', ai:'ИИ: по обстановке'};
function simCmds(p){ return String(p.cmds || '').split(/[;\n]+/).map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^(\d+)(?::(\d{1,2}))?\s+(.+)$/); if (!m) return null;
const t = m[2] != null ? +m[1] * 60 + +m[2] : +m[1], w = m[3].toLowerCase(), c = /^стоп|^стой/.test(w) ? 'stop' : /^впер|^движ|^марш/.test(w) ? 'go' : /^отх|^назад/.test(w) ? 'back' : /^не\s*огонь|^прекр|^тишин/.test(w) ? 'nofire' : /^огонь/.test(w) ? 'fire' : null; return c ? {t, c} : null; }).filter(Boolean).sort((a, b) => a.t - b.t); }
function posAtS(c, s){ const D = c.D, n = D.length; if (s >= D[n - 1]) return {c:c.P[n - 1], brg:c.B[n - 1], rot:c.R[n - 1]}; let lo = 0, hi = n - 1; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (D[m] <= s) lo = m; else hi = m; }
const f = (s - D[lo]) / ((D[hi] - D[lo]) || 1); return {c:[c.P[lo][0] + (c.P[hi][0] - c.P[lo][0]) * f, c.P[lo][1] + (c.P[hi][1] - c.P[lo][1]) * f], brg:c.B[hi], rot:c.R[hi]}; }
function segF(c, s){ const D = c.D; let lo = 0, hi = D.length - 1; while (hi - lo > 1){ const m = (lo + hi) >> 1; if (D[m] <= s) lo = m; else hi = m; } return c.F[hi] || 1; }
const UW = {inf:1, trk:3, veh:1.5, art:2, uav:.2}; // «вес» юнита для оценки соотношения сил
function simRun(live){ const U = simUnits(), id = ++SIM.runId, n = U.length, dt = 1, Tmax = 3600, Tbase = scnDur(SC.cur), AI = Object.assign({}, (SC.cur && SC.cur.ai) || {}); if (live) ['r', 'b'].forEach(s => { AI[s] = s !== SIM.me; }); const CP = (SC.cur.cp || []).map(c => Object.assign({}, c, {own:c.own0 || '', pr:0, cap:''})), VP = {r:0, b:0}, vpWin = +SC.cur.vpWin || 300, tlim = (+SC.cur.tl || 30) * 60, AIK = {easy:{acc:.7, det:1.3}, norm:{acc:1, det:1}, hard:{acc:1.25, det:.8}}[SC.cur.diff || 'norm']; let res = null; SIM.run = null; SIM.ev = []; SIM.busy = true; simLog();
const st = U.map(u => { const p = u.p; return {u, p, prep:p.path && p.path.length > 1 ? simPrep(p) : null, s:0, hp:p.hp0 != null && p.hp0 !== '' ? +p.hp0 : 100, sup:-1, dw:[], mode:'go', fire:true, cmds:simCmds(p), ci:0, lc:-999, arr:false, ko:false, dead:false, t0:p.t0 || 0, ut:utK(p), lf:-99, mv:false, free:null, aim:null, out:0, ret:null, order:null, ai:p.bh === 'ai' || !!AI[u.side], rk:Math.max(0, Math.min(3, +p.xp || 0)), xp:0, mo:Math.min(100, 70 + 10 * Math.max(0, Math.min(3, +p.xp || 0))), am:AMMO[utK(p)] || 0, am0:AMMO[utK(p)] || 0, md:{}, wav:false, rout:false, fl:0, sup0:0, cmd:/^(kp|knp|pu)/.test(p.sym || u.a.sym || ''), sp:MDL_OF[p.sym || u.a.sym] === 'truck', rf:(+p.rf || 0) * 60}; });
st.forEach(S => { if (S.rf > 0){ S.away = true; S.dead = true; } });
const sideOther = s => s === 'r' ? 'b' : 'r', vpAdd = (s, v) => { if (s === 'r' || s === 'b') VP[s] += v; };
let seed = [...String(SC.cur.name || 's')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7); const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x ^= x + Math.imul(x ^ x >>> 7, 61 | x); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
const CV = {tr:[], dg:[]}; state.arrays.forEach(a => { if (a.hidden) return; (a.shapes || []).forEach(sh => { const sy = sh.sym && SYM_BY[sh.sym]; if (sy && /trench/.test(sy.style || '') && sh.pts && sh.pts.length > 1) CV.tr.push(sh.pts.map(q => [q[1] ?? q.lng, q[0] ?? q.lat])); }); a.points.forEach(q => { const k = MDL_OF[q.sym || a.sym]; if (k === 'dugout' || k === 'uavpu' || k === 'op' || k === 'trSeg') CV.dg.push([q.lng, q.lat]); }); });
const segD = (c, a, b) => { const [kx, ky] = mk(c[1]), ax = (a[0] - c[0]) * kx, ay = (a[1] - c[1]) * ky, bx = (b[0] - c[0]) * kx, by = (b[1] - c[1]) * ky, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, u = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0; return Math.hypot(ax + u * dx, ay + u * dy); };
const coverAt = (S, c) => { let f = 1; if (CV.dg.some(q => dist(c, q) < 25)) f = .3; else if (CV.tr.some(L => L.some((q, k) => k && segD(c, L[k - 1], q) < 12))) f = S.ut === 'inf' ? .4 : .6; if (S.ut === 'inf' && !S.mv) f *= .75; if (S.order && S.order.k === 'prone') f *= .6; return f; };
const det = new Map(), frames = [], ev = [], nm = i => labelOf(U[i].a, U[i].i) || U[i].a.name;
const base = i => { const S = st[i]; if (S.free) return S.free; if (!S.prep) return [S.p.lng, S.p.lat]; return posAtS(S.prep, S.s).c; };
const pos = i => { const S = st[i], c = base(i); let brg; if (S.aim != null) brg = S.aim; else if (S.p.faz != null && S.p.faz !== '') brg = +S.p.faz; else if (S.prep && !S.free){ const q = posAtS(S.prep, S.s); brg = S.mode === 'back' ? (q.brg + 180) % 360 : q.brg; } else brg = S.hd != null ? S.hd : +(S.p.rot || 0); return {c, brg}; };
const azm = (a, b) => { const [kx, ky] = mk(a[1]); return (Math.atan2((b[0] - a[0]) * kx, (b[1] - a[1]) * ky) * 180 / Math.PI + 360) % 360; }, dist = (a, b) => { const [kx, ky] = mk(a[1]); return Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * ky); };
const freeMove = (S, to, vmax) => { const c = S.free || base(st.indexOf(S)), D = dist(c, to); if (D < 1) return false; const [kx, ky] = mk(c[1]), ux = (to[0] - c[0]) * kx / D, uy = (to[1] - c[1]) * ky / D, d0 = Math.min(D, vmax * dt), nx = c[0] + ux * d0 / kx, ny = c[1] + uy * d0 / ky;
let f = 1; if (SIM.g && S.ut !== 'uav'){ const g = (hAt(nx, ny) - hAt(c[0], c[1])) / (d0 || 1); f = g > UT[S.ut].g ? .08 : g > 0 ? Math.max(.08, 1 - 1.6 * g / UT[S.ut].g) : 1; } const d1 = d0 * f; S.free = [c[0] + ux * d1 / kx, c[1] + uy * d1 / ky]; S.hd = (Math.atan2(ux, uy) * 180 / Math.PI + 360) % 360; return d1 > .01; };
const strength = side => st.reduce((s, S) => s + (S.u.side === side && !S.dead && !S.ko ? S.hp / 100 * (UW[S.ut] || 1) : 0), 0);
let t = 0, quiet = 0;
const step = () => { const P = st.map((_, i) => pos(i)), lines = [], dmg = new Float32Array(n), flk = new Float32Array(n); st.forEach((S, i) => { S.cov = S.dead ? 1 : coverAt(S, P[i].c); });
st.forEach((S, i) => { if (!S.rout || S.dead) return; S.act = 'ret'; if (!S.ret){ let e = -1, De = Infinity; st.forEach((B, j) => { if (B.dead || B.u.side === S.u.side) return; const D = dist(P[i].c, P[j].c); if (D < De){ De = D; e = j; } }); const away = e >= 0 ? azm(P[e].c, P[i].c) : (P[i].brg + 180) % 360, [kx, ky] = mk(P[i].c[1]); S.ret = [P[i].c[0] + Math.sin(away * Math.PI / 180) * 600 / kx, P[i].c[1] + Math.cos(away * Math.PI / 180) * 600 / ky]; } });
st.forEach((S, i) => { while (S.ci < S.cmds.length && S.cmds[S.ci].t <= t){ const c = S.cmds[S.ci++].c; S.lc = t; if (c === 'fire') S.fire = true; else if (c === 'nofire') S.fire = false; else { S.mode = c; S.ret = null; } ev.push({t, k:'cmd', s:`${nm(i)}: ${{stop:'стой', go:'вперёд', back:'отход', fire:'огонь разрешён', nofire:'прекратить огонь'}[c]}`}); } });
for (let i = 0; i < n; i++) for (let j = 0; j < n; j++){ const A = st[i], B = st[j]; if (i === j || A.dead || B.dead || !A.u.side || !B.u.side || A.u.side === B.u.side) continue; const k = i * n + j; let d = det.get(k); if (!d){ d = {c:0, on:false, out:0, D:1e9, vis:false}; det.set(k, d); }
const D = dist(P[i].c, P[j].c), vr = uv(A.p, 'vr'), vis = D <= Math.max(vr, uv(A.p, 'fr')) && losOk(P[i].c, P[j].c, UT[A.ut].eye, 1.5); d.D = D; d.vis = vis;
if (vis && D <= vr){ d.out = 0; if (!d.on){ d.c += dt; if (d.c >= (4 + 16 * D / vr) * (B.lf > t - 10 ? .4 : 1) * (B.mv ? 1 : 1.5) * (B.cov < 1 ? 1.6 : 1) * (1 - .1 * A.rk) * (A.md.crew ? 1.4 : 1) * (A.ai ? AIK.det : 1)){ d.on = true; ev.push({t, k:'det', s:`${nm(i)} обнаружил ${nm(j)} (${Math.round(D)} м)`}); } } }
else { d.c = Math.max(0, d.c - dt); if (d.on && (d.out += dt) > 20) d.on = false; } }
const known = (i, j) => st.some((C, q) => C.u.side === st[i].u.side && !C.dead && (det.get(q * n + j) || {}).on);
// ИИ: решение на шаг (команды человека важнее ИИ в течение 60 с)
st.forEach((S, i) => { const o = S.order; if (!o || S.dead || S.rout) return; S.act = null; const fr = uv(S.p, 'fr');
if (o.k !== 'attack'){ let e = -1, De = fr; st.forEach((B, j) => { if (B.dead || !B.u.side || B.u.side === S.u.side || !known(i, j)) return; const D = dist(P[i].c, P[j].c); if (D < De){ De = D; e = j; } }); S.aim = e >= 0 ? azm(P[i].c, P[e].c) : (o.k === 'move' ? null : S.aim); }
if (o.k === 'hold' || o.k === 'prone') S.act = 'hold';
else if (o.k === 'move'){ if (dist(P[i].c, o.to) < 4){ S.order = {k:'hold'}; S.act = 'hold'; ev.push({t, k:'arr', s:`${nm(i)} на месте`}); } else { S.act = 'adv'; S.goal = o.to; S.goalD = 3; } }
else if (o.k === 'attack'){ const B = st[o.j]; if (!B || B.dead){ S.order = {k:'hold'}; S.act = 'hold'; return; } S.aim = azm(P[i].c, P[o.j].c); if (dist(P[i].c, P[o.j].c) > fr * .6){ S.act = 'adv'; S.goal = P[o.j].c; S.goalD = fr * .6; } else S.act = 'hold'; }
else if (o.k === 'retreat'){ S.act = 'ret'; if (!S.ret){ let e = -1, De = Infinity; st.forEach((B, j) => { if (B.dead || B.u.side === S.u.side) return; const D = dist(P[i].c, P[j].c); if (D < De){ De = D; e = j; } }); const away = e >= 0 ? azm(P[e].c, P[i].c) : (P[i].brg + 180) % 360, [kx, ky] = mk(P[i].c[1]); S.ret = [P[i].c[0] + Math.sin(away * Math.PI / 180) * 400 / kx, P[i].c[1] + Math.cos(away * Math.PI / 180) * 400 / ky]; } if (dist(P[i].c, S.ret) < 5){ S.order = {k:'hold'}; S.ret = null; } } });
st.forEach((S, i) => { if (S.rout || S.order) return; S.act = null; if (!S.ai || S.dead || t < S.t0 || t - S.lc < 60) return; let e = -1, De = Infinity; st.forEach((B, j) => { if (B.dead || B.ko || !B.u.side || B.u.side === S.u.side || !known(i, j)) return; const D = dist(P[i].c, P[j].c); if (D < De){ De = D; e = j; } });
const fr = uv(S.p, 'fr'); if (e >= 0) S.aim = azm(P[i].c, P[e].c); else if (!S.ko) S.aim = null;
if (S.ko || (t < S.sup && S.hp < 60)){ if (!S.ret){ const away = e >= 0 ? (azm(P[e].c, P[i].c)) : ((P[i].brg + 180) % 360), [kx, ky] = mk(P[i].c[1]), r = S.ko ? 500 : 250; S.ret = [P[i].c[0] + Math.sin(away * Math.PI / 180) * r / kx, P[i].c[1] + Math.cos(away * Math.PI / 180) * r / ky]; ev.push({t, k:'ai', s:`${nm(i)}: ИИ — отход${S.ko ? ' (небоеспособен)' : ' из-под огня'}`}); } S.act = 'ret'; return; }
if (S.ret && t >= S.sup){ S.ret = null; ev.push({t, k:'ai', s:`${nm(i)}: ИИ — снова в бой`}); }
if (e >= 0 && De <= fr * .7){ if (S.act !== 'hold' && !S.hold){ S.hold = 1; ev.push({t, k:'ai', s:`${nm(i)}: ИИ — стоп, огонь по ${nm(e)}`}); } S.act = 'hold'; return; } S.hold = 0;
if (CP.length && !S.wav && !S.md.trk && S.ut !== 'art' && (e < 0 || De > Math.max(fr * 2.5, 3000)) && (!S.prep || S.arr || S.free)){ let cb = null, cd = Infinity; CP.forEach(c => { if (c.own === S.u.side) return; const D = dist(P[i].c, [c.lng, c.lat]); if (D < cd){ cd = D; cb = c; } }); if (cb && cd > (cb.r || 150) * .4){ if (S.cpT !== cb){ S.cpT = cb; ev.push({t, k:'ai', s:`${nm(i)}: ИИ — к ${cb.n}`}); } S.act = 'adv'; S.goal = [cb.lng, cb.lat]; S.goalD = (cb.r || 150) * .4; return; } }
if (e >= 0 && !S.wav && !S.md.trk && S.ut !== 'art' && S.ut !== 'uav' && De <= Math.max(fr * 2.5, 3000) && strength(S.u.side) >= .8 * strength(st[e].u.side)){ if (!S.adv){ S.adv = 1; ev.push({t, k:'ai', s:`${nm(i)}: ИИ — сближение с ${nm(e)}`}); } S.act = 'adv'; S.goal = P[e].c; S.goalD = fr * .6; return; } S.adv = 0; });
for (let i = 0; i < n; i++){ const A = st[i], f = FP[A.ut]; if (A.dead || A.ko || A.rout || A.md.gun || (A.am0 && A.am <= 0) || !A.fire || A.mode === 'back' || A.act === 'ret' || !f || !(f[0] + f[1])) continue; const fr = uv(A.p, 'fr'), fs = uv(A.p, 'fs'); let best = -1, bd = Infinity, bp = Infinity;
for (let j = 0; j < n; j++){ const d = det.get(i * n + j); if (!d || st[j].dead || d.D > fr) continue; const own = d.on && d.vis, side = UT[A.ut].ind && known(i, j); if (!own && !side) continue;
if (fs < 360 && Math.abs((azm(P[i].c, P[j].c) - P[i].brg + 540) % 360 - 180) > fs / 2) continue; if (!UT[A.ut].ind && Math.pow(Math.max(.05, 1 - d.D / fr), 1.2) < .12) continue; const pr = d.D + (st[j].ko ? 5000 : 0) - (A.order && A.order.k === 'attack' && A.order.j === j ? 1e6 : 0); if (pr < bp){ bp = pr; bd = d.D; best = j; } }
if (best < 0) continue; const B = st[best]; if (A.lf < t - 30) ev.push({t, k:'fire', s:`${nm(i)} открыл огонь по ${nm(best)} (${Math.round(bd)} м)`}); A.lf = t;
const rel = Math.abs((azm(P[best].c, P[i].c) - P[best].brg + 540) % 360 - 180), arm = B.ut === 'trk' || B.ut === 'veh', face = arm ? (rel < 45 ? .55 : rel > 135 ? 1.8 : 1.25) : 1, hd = arm && !B.mv && !losOk(P[i].c, P[best].c, UT[A.ut].eye, .6) ? .5 : 1;
const dm = f[B.ut === 'trk' ? 1 : 0] * Math.max(.05, 1 - .7 * bd / fr) * (A.hp / 100) * (t < A.sup ? .3 : 1) * (B.mv ? 1.15 : .8) * (A.mv ? .6 : 1) * (1 + .12 * A.rk) * (A.md.crew ? .6 : 1) * (A.wav ? .5 : 1) * (A.am0 && A.am < A.am0 * .15 ? .7 : 1) * face * B.cov * hd * (A.ai ? AIK.acc : 1) * dt / 60;
dmg[best] += dm; if (rel > 60) flk[best] += rel > 135 ? 2 : 1; if (A.am0) A.am = Math.max(0, A.am - dt); if (A.am0 && A.am <= 0 && !A.noam){ A.noam = 1; ev.push({t, k:'sup', s:`${nm(i)}: кончились боеприпасы`}); }
A.out += Math.min(dm, B.hp); A.xp += Math.min(dm, B.hp); const rk = A.xp > 100 ? 3 : A.xp > 50 ? 2 : A.xp > 20 ? 1 : 0; if (rk > A.rk){ A.rk = rk; ev.push({t, k:'xp', s:`${nm(i)}: опыт — ранг ${rk} ${'★'.repeat(rk)}`}); } lines.push([i, best, 2]); }
for (let j = 0; j < n; j++){ const B = st[j]; if (B.dead || !dmg[j]) continue; B.hp = Math.max(0, B.hp - dmg[j]); B.mo -= dmg[j] * 1.4 * (1 + .5 * Math.min(2, flk[j])); if ((B.ut === 'trk' || B.ut === 'veh') && rnd() < dmg[j] * .05){ const free = ['trk', 'gun', 'crew'].filter(k => !B.md[k]); if (free.length){ const k = free[Math.floor(rnd() * free.length)]; B.md[k] = 1; ev.push({t, k:'mod', s:`${nm(j)}: ${{trk:'перебита гусеница / ходовая — обездвижен', gun:'повреждено орудие — не стреляет', crew:'ранен экипаж — стреляет хуже'}[k]}`}); } } B.dw.push([t, dmg[j]]); B.dw = B.dw.filter(x => x[0] > t - 10); const rec = B.dw.reduce((s, x) => s + x[1], 0);
if (rec > 1){ if (t >= B.sup){ ev.push({t, k:'sup', s:`${nm(j)} подавлен`}); if (B.p.bh === 'avoid' && B.mode !== 'back'){ B.mode = 'back'; ev.push({t, k:'cmd', s:`${nm(j)}: отход под огнём`}); } } B.sup = t + 15; }
if (!B.ko && B.hp <= 30){ B.ko = true; vpAdd(sideOther(B.u.side), 5 * (UW[B.ut] || 1)); ev.push({t, k:'ko', s:`${nm(j)} небоеспособен (${Math.round(B.hp)}%)`}); st.forEach((C, q) => { if (q !== j && C.u.side === B.u.side && !C.dead && dist(P[q].c, P[j].c) < 300) C.mo -= 8; }); } if (B.hp <= 0){ B.dead = true; vpAdd(sideOther(B.u.side), 10 * (UW[B.ut] || 1)); ev.push({t, k:'dead', s:`${nm(j)} уничтожен`}); st.forEach((C, q) => { if (q !== j && C.u.side === B.u.side && !C.dead && dist(P[q].c, P[j].c) < 300) C.mo -= 12; }); } }
st.forEach((S, i) => { if (S.dead) return; const hit = S.dw.some(x => x[0] > t - 5); if (!hit){ S.mo += .25 + (st.some((C, q) => q !== i && C.cmd && !C.dead && C.u.side === S.u.side && dist(P[q].c, P[i].c) < 400) ? .5 : 0); }
const en = st.filter((B, j) => !B.dead && !B.ko && B.u.side && B.u.side !== S.u.side && dist(P[j].c, P[i].c) < 200).length, fr0 = st.filter((B, j) => !B.dead && !B.ko && B.u.side === S.u.side && dist(P[j].c, P[i].c) < 250).length; if (en > fr0) S.mo -= .3 * (en - fr0);
S.mo = Math.max(0, Math.min(100, S.mo));
if (S.sp && !S.mv) st.forEach((C, q) => { if (q !== i && C.am0 && !C.dead && C.u.side === S.u.side && !C.mv && C.am < C.am0 && dist(P[q].c, P[i].c) < 150){ C.am = Math.min(C.am0, C.am + 3 * dt); C.noam = 0; } });
if (!S.rout && S.mo < 15){ S.rout = true; S.wav = true; S.ret = null; ev.push({t, k:'rout', s:`${nm(i)} бежит! (мораль ${Math.round(S.mo)})`}); }
else if (!S.wav && S.mo < 35){ S.wav = true; ev.push({t, k:'sup', s:`${nm(i)} колеблется`}); }
else if (S.wav && S.mo > 45){ if (S.rout) ev.push({t, k:'cmd', s:`${nm(i)} собрался и возвращается в бой`}); S.wav = false; S.rout = false; S.ret = null; S.act = null; } });
st.forEach((S, i) => { S.mv = false; if (S.dead || t < S.t0 || S.md.trk) return; const v = (S.p.spd || UT[S.ut].spd) / 3.6 * (t < S.sup && !S.rout ? .3 : 1) * (S.rout ? 1.1 : 1);
if (S.act === 'ret'){ if (S.ret) S.mv = freeMove(S, S.ret, v * (S.ko ? .5 : 1)); return; } if (S.ko || S.rout) return;
if (S.act === 'hold') return; if (S.act === 'adv'){ if (dist(base(i), S.goal) > S.goalD) S.mv = freeMove(S, S.goal, v); return; }
if (!S.prep || S.free || S.order) return; let m = S.mode; if (m === 'go' && !S.ai && (S.p.bh || 'go') !== 'go' && st.some((C, j) => !C.dead && (det.get(i * n + j) || {}).on)) m = 'halt'; if (m === 'stop' || m === 'halt') return;
const L0 = S.prep.D[S.prep.D.length - 1], s0 = S.s; S.s = Math.max(0, Math.min(L0, S.s + v * segF(S.prep, S.s) * dt * (m === 'back' ? -1 : 1))); S.mv = S.s !== s0;
if (!S.arr && m === 'go' && S.s >= L0 - .5){ S.arr = true; ev.push({t, k:'arr', s:`${nm(i)} прибыл в конечную точку`}); } });
frames.push({s:st.map(S => S.s), x:st.map(S => S.free ? S.free[0] : null), y:st.map(S => S.free ? S.free[1] : null), a:st.map(S => S.aim != null ? Math.round(S.aim) : S.free && S.hd != null ? Math.round(S.hd) : null), hp:st.map(S => Math.round(S.hp)), f:st.map(S => (t < S.sup ? 1 : 0) | (S.ko ? 2 : 0) | (S.dead && !S.away ? 4 : 0) | (S.away ? 256 : 0) | (S.mode === 'back' || S.act === 'ret' ? 8 : 0) | (S.wav ? 16 : 0) | (S.rout ? 32 : 0) | (S.am0 && S.am <= 0 ? 64 : 0) | (S.cov < 1 ? 128 : 0)), mo:st.map(S => Math.round(S.mo)), am:st.map(S => S.am0 ? Math.round(S.am / S.am0 * 100) : null), md:st.map(S => (S.md.trk ? 1 : 0) | (S.md.gun ? 2 : 0) | (S.md.crew ? 4 : 0)), rk:st.map(S => S.rk), cp:CP.map(c => [c.own, c.cap, Math.round(c.pr)]), vp:[Math.round(VP.r), Math.round(VP.b)], res, L:lines.concat([...det.entries()].filter(([, d]) => d.on && d.vis).map(([k]) => [Math.floor(k / n), k % n, 1]))});
st.forEach((S, i) => { if (S.away && t >= S.rf){ S.away = false; S.dead = false; ev.push({t, k:'arr', s:`${nm(i)}: подкрепление прибыло`}); } });
CP.forEach(c => { const cnt = {r:0, b:0}; st.forEach((S, i) => { if (S.dead || S.ko || S.rout || S.ut === 'uav' || !cnt.hasOwnProperty(S.u.side)) return; if (dist(P[i].c, [c.lng, c.lat]) <= (c.r || 150)) cnt[S.u.side]++; }); const sd = cnt.r && !cnt.b ? 'r' : cnt.b && !cnt.r ? 'b' : '';
if (sd && c.own !== sd){ if (c.cap !== sd){ c.cap = sd; c.pr = 0; } c.pr += 2 * Math.min(4, cnt[sd]) * dt; if (c.pr >= 100){ c.own = sd; c.pr = 0; c.cap = ''; ev.push({t, k:'cp', s:`${c.n} взята: ${(SIDES[sd] || {}).name || sd}`}); } } else if (!sd || c.own === sd){ c.pr = Math.max(0, c.pr - dt); if (!c.pr) c.cap = ''; } if (c.own) vpAdd(c.own, .1 * dt); });
if (!res){ const alive = s => st.some(S => S.u.side === s && !S.dead && !S.ko && !S.rout), have = s => st.some(S => S.u.side === s), sides = ['r', 'b'].filter(have);
if (sides.length === 2){ const w = VP.r >= vpWin ? 'r' : VP.b >= vpWin ? 'b' : null; if (w) res = {win:w, why:`набрано ${vpWin} очков`, t};
else if (!alive('r') && !st.some(S => S.u.side === 'r' && S.away)) res = {win:'b', why:'войска противника разбиты', t}; else if (!alive('b') && !st.some(S => S.u.side === 'b' && S.away)) res = {win:'r', why:'войска противника разбиты', t};
else if (live && t >= tlim) res = {win:VP.r > VP.b + 5 ? 'r' : VP.b > VP.r + 5 ? 'b' : '', why:'вышло время', t}; if (res) ev.push({t, k:'end', s:res.win ? `Итог: победа — ${(SIDES[res.win] || {}).name || res.win} (${res.why})` : `Итог: ничья (${res.why})`}); } }
quiet = lines.length || st.some(S => S.mv) || CP.some(c => c.pr > 0) ? 0 : quiet + dt; t += dt; };
if (live){ SIM.busy = false; SIM.run = {U, st, frames, CP, idx:new Map(U.map((u, i) => [u.key, i]))}; SIM.ev = ev; SIM.live = {id, st, U, frames, ev, step, CP, VP, get t(){ return t; }, get res(){ return res; }, tlim, vpWin, P:i => pos(i).c}; step(); return; }
const chunk = () => { if (id !== SIM.runId) return; const end = performance.now() + 25;
while (performance.now() < end){ step(); if (t > Tmax || (t > Tbase && quiet > 30) || (res && t > res.t + 20)){ SIM.busy = false; SIM.run = {U, st, frames, CP, res, VP, idx:new Map(U.map((u, i) => [u.key, i]))}; SIM.ev = ev; SC.T = Math.max(Tbase, frames.length - 1); $('tlR').max = SC.T; scnSet(Math.min(SC.t, SC.T), true);
const dd = ev.filter(e => e.k === 'dead').length, ko = ev.filter(e => e.k === 'ko').length; toast(`Бой рассчитан: ${fmtT(SC.T)}${dd || ko ? ` · уничтожено ${dd}, небоеспособно ${ko}` : ''}`); if ($('simP') && $('simP').style.display !== 'none') simPanel(); else simLog(); return; } }
SIM.prog = t; const el = $('simEv'); if (el) el.innerHTML = `<div class="empty">Расчёт боя… ${fmtT(t)}</div>`; setTimeout(chunk, 0); };
chunk(); }
// ---- разбор боя
function simDebrief(){ const R = SIM.run; if (!R) return null; const L = R.frames[R.frames.length - 1], F0 = R.frames[0], sides = [...new Set(R.U.map(u => u.side).filter(Boolean))], SN = s => (SIDES[s] && SIDES[s].name) || s, nm = i => labelOf(R.U[i].a, R.U[i].i) || R.U[i].a.name, ev = SIM.ev;
const rows = sides.map(s => { const I = R.U.map((u, i) => u.side === s ? i : -1).filter(i => i >= 0), sum = F => I.reduce((a, i) => a + F.hp[i] * (UW[R.st[i].ut] || 1), 0), w = I.reduce((a, i) => a + 100 * (UW[R.st[i].ut] || 1), 0);
const fd = ev.find(e => e.k === 'det' && I.some(i => e.s.startsWith(nm(i) + ' '))), ff = ev.find(e => e.k === 'fire' && I.some(i => e.s.startsWith(nm(i) + ' ')));
return {s, n:I.length, p0:Math.round(sum(F0) / w * 100), p1:Math.round(sum(L) / w * 100), dead:I.filter(i => L.f[i] & 4).length, ko:I.filter(i => (L.f[i] & 2) && !(L.f[i] & 4)).length, rout:I.filter(i => ev.some(e => / бежит!/.test(e.s) && e.s.startsWith(nm(i) + ' '))).length, fd:fd ? fd.t : null, ff:ff ? ff.t : null, best:I.slice().sort((a, b) => R.st[b].out - R.st[a].out)[0]}; });
const lf = R.frames[R.frames.length - 1], rr = R.frames.map(f => f.res).find(Boolean); let win = rows.length === 2 ? (rows[0].p1 - rows[1].p1 > 15 ? rows[0].s : rows[1].p1 - rows[0].p1 > 15 ? rows[1].s : null) : null; if (rr) win = rr.win || null; if (lf && lf.vp) rows.forEach(r => { r.vp = lf.vp[r.s === 'r' ? 0 : 1]; });
const txt = [`Разбор боя «${SC.cur.name}» · длительность ${fmtT(R.frames.length - 1)}`].concat(rows.map(r => `${SN(r.s)}: юнитов ${r.n}, боеспособность ${r.p0}% → ${r.p1}%, уничтожено ${r.dead}, небоеспособно ${r.ko}, бежали ${r.rout}; первое обнаружение ${r.fd != null ? fmtT(r.fd) : '—'}, первый огонь ${r.ff != null ? fmtT(r.ff) : '—'}; лучший стрелок — ${r.best != null && R.st[r.best].out > .5 ? nm(r.best) + ` (${Math.round(R.st[r.best].out)}% урона)` : '—'}`))
.concat([win ? `Итог: перевес у стороны «${SN(win)}».` : 'Итог: явного перевеса нет.', '', 'Ключевые события:'], ev.filter(e => /det|dead|ko|ai|cmd|mod|rout|xp|cp|end/.test(e.k)).slice(0, 60).map(e => `${fmtT(e.t)}  ${e.s}`));
return {rows, win, txt:txt.join('\n'), SN}; }
function simFrame(t){ const R = SIM.run; if (!R || !R.frames.length) return null; const k = Math.max(0, Math.min(R.frames.length - 1, Math.floor(t))), F0 = R.frames[k], F1 = R.frames[Math.min(R.frames.length - 1, k + 1)], f = Math.min(1, t - k); return {F0, s:F0.s.map((v, i) => v + (F1.s[i] - v) * f)}; }
// ---- отрисовка на 3D: сектора, видимость выбранного, линии обнаружения, линия видимости
function simDraw(){ if (!v3 || !SC.cur) return; const F = [], V = [], Ls = [], t = SC.t, U = simUnits(), S = new Map(U.map(u => [u.key, simAt(u, t)]));
if (SIM.sec) U.forEach(u => { const fr = uv(u.p, 'fr'); if (!fr || fr > 20000) return; const s = S.get(u.key); F.push({type:'Feature', properties:{c:u.side && SIDES[u.side] ? SIDES[u.side].color : '#ff8a2a'}, geometry:{type:'Polygon', coordinates:[sector(s.c, fr, s.brg, uv(u.p, 'fs'))]}}); });
if (SIM.vis && SIM.sel){ const u = U.find(x => x.key === SIM.sel); if (u){ const now = performance.now(); if (!SC.raf || now - SIM.lastVs > 900 || !SIM.vsF){ SIM.lastVs = now; SIM.vsF = viewshed(S.get(u.key).c, uv(u.p, 'vr'), utOf(u.p).eye); } V.push(...SIM.vsF); } }
(SC.cur.cp || []).forEach((c, k) => { const f0 = simFrame(t), cs = f0 && f0.F0.cp ? f0.F0.cp[k] : null, own = cs ? cs[0] : '', cap = cs ? cs[1] : '', pr = cs ? cs[2] : 0, col = own && SIDES[own] ? SIDES[own].color : '#d8d8d8'; F.push({type:'Feature', properties:{c:col}, geometry:{type:'Polygon', coordinates:[sector([c.lng, c.lat], c.r || 150, 0, 360)]}}); F.push({type:'Feature', properties:{c:col}, geometry:{type:'Polygon', coordinates:[sector([c.lng, c.lat], (c.r || 150) * .12, 0, 360)]}}); if (cap && pr) Ls.push({type:'Feature', properties:{c:SIDES[cap] ? SIDES[cap].color : '#fff', w:4}, geometry:{type:'LineString', coordinates:sector([c.lng, c.lat], (c.r || 150) * 1.06, 0, 360).slice(0, Math.max(2, Math.round(73 * pr / 100)))}}); });
const fr = simFrame(t); if (fr){ const R0 = SIM.run, seen = new Set(); if (SIM.det) fr.F0.L.forEach(([i, j, k]) => { const key = i + ':' + j; if (seen.has(key)) return; seen.add(key); const a = S.get(R0.U[i].key), b = S.get(R0.U[j].key); if (a && b) Ls.push({type:'Feature', properties:{c:k === 2 ? '#ff3b30' : '#ffd400', w:k === 2 ? 2.6 : 1.4}, geometry:{type:'LineString', coordinates:[a.c, b.c]}}); });
R0.U.forEach((u, i) => { const fl = fr.F0.f[i], s = S.get(u.key); if (!fl || !s) return; const col = fl & 4 ? '#5a0000' : fl & 2 ? '#ff6a00' : fl & 1 ? '#ffd400' : '#3a7bd5'; F.push({type:'Feature', properties:{c:col}, geometry:{type:'Polygon', coordinates:[sector(s.c, fl & 4 ? 30 : 22, 0, 360)]}}); if (fl & 4){ const [kx, ky] = mk(s.c[1]), r = 26; Ls.push({type:'Feature', properties:{c:'#ff3b30', w:3}, geometry:{type:'MultiLineString', coordinates:[[[s.c[0] - r / kx, s.c[1] - r / ky], [s.c[0] + r / kx, s.c[1] + r / ky]], [[s.c[0] - r / kx, s.c[1] + r / ky], [s.c[0] + r / kx, s.c[1] - r / ky]]]}}); } }); }
if (SIM.live) SIM.selS.forEach(k => { const i = SIM.live.U.findIndex(u => u.key === k); if (i < 0) return; const o = SIM.live.st[i].order; if (!o) return; const a = S.get(k), b = o.k === 'move' ? o.to : o.k === 'attack' ? (S.get(SIM.live.U[o.j].key) || {}).c : null; if (a && b) Ls.push({type:'Feature', properties:{c:o.k === 'attack' ? '#ff3b30' : '#4cd964', w:2}, geometry:{type:'LineString', coordinates:[a.c, b]}}); });
if (SIM.losPts.length === 2){ const [a, b] = SIM.losPts, ok = losOk(a, b, 1.8, 1.5); Ls.push({type:'Feature', properties:{c:ok ? '#34c759' : '#ff3b30', w:3}, geometry:{type:'LineString', coordinates:[a, b]}}); }
try { const add = (id, data, layer) => { if (!v3.getSource(id)){ v3.addSource(id, {type:'geojson', data}); v3.addLayer(layer); } else v3.getSource(id).setData(data); };
add('simvs', {type:'FeatureCollection', features:V}, {id:'simvs', type:'fill', source:'simvs', paint:{'fill-color':'#34c759', 'fill-opacity':.32}});
add('simsec', {type:'FeatureCollection', features:F}, {id:'simsec', type:'line', source:'simsec', paint:{'line-color':['get', 'c'], 'line-width':1.6, 'line-dasharray':[3, 2]}});
add('simln', {type:'FeatureCollection', features:Ls}, {id:'simln', type:'line', source:'simln', paint:{'line-color':['get', 'c'], 'line-width':['get', 'w']}}); } catch(e){} }
// ---- панель «Симуляция»
function simLog(){ const el = $('simEv'); if (!el) return; if (SIM.tab === 'db'){ const D = simDebrief(); if (!D){ el.innerHTML = '<div class="empty">Сначала дождитесь расчёта боя.</div>'; return; }
el.innerHTML = D.rows.map(r => `<div class="arr" style="flex-direction:column;align-items:stretch;gap:2px"><b style="color:${SIDES[r.s] ? SIDES[r.s].color : 'inherit'}">${escapeHtml(D.SN(r.s))}: ${r.p0}% → ${r.p1}%</b><div style="height:6px;border-radius:3px;background:var(--line)"><div style="height:6px;border-radius:3px;width:${r.p1}%;background:${SIDES[r.s] ? SIDES[r.s].color : 'var(--signal)'}"></div></div><span>${r.vp != null ? `Очки ${r.vp}. ` : ''}Уничтожено ${r.dead}, небоеспособно ${r.ko}, бежали ${r.rout} из ${r.n}; первое обнаружение ${r.fd != null ? fmtT(r.fd) : '—'}, первый огонь ${r.ff != null ? fmtT(r.ff) : '—'}</span></div>`).join('') + `<div class="arr"><b>${D.win ? 'Перевес: ' + escapeHtml(D.SN(D.win)) : 'Явного перевеса нет'}</b></div><div class="row"><button id="simDbS">⇩ Сохранить разбор (.txt)</button></div>`;
$('simDbS').onclick = () => deliverFile(new Blob([D.txt], {type:'text/plain;charset=utf-8'}), `СКАТ_разбор_${String(SC.cur.name).replace(/[\\/:*?"<>|]/g, '_')}_${stamp()}.txt`, 'Разбор готов'); return; } el.innerHTML = SIM.ev.length ? SIM.ev.map((e, i) => `<div class="arr" data-t="${e.t}" style="cursor:pointer"><b style="min-width:58px;color:${{fire:'#ff6b5e', det:'#e6b800', sup:'#ffb020', ko:'#ff7a1a', dead:'#d62020', cmd:'#5b9cff', ai:'#b07cff', mod:'#ff9f43', rout:'#ffffff', xp:'#ffd400', cp:'#4cd964', end:'#ffd400'}[e.k] || 'var(--mute)'}">${fmtT(e.t)}</b><span>${escapeHtml(e.s)}</span></div>`).join('') : (SIM.busy ? '<div class="empty">Расчёт боя…</div>' : '<div class="empty">Событий нет: нужны знаки разных сторон (красные/синие) в пределах сцены.</div>');
el.querySelectorAll('[data-t]').forEach(r => r.onclick = () => { if (SC.raf) scnPause(); scnSet(+r.dataset.t, true); }); }
function simPanel(){ let m = $('simP'); if (!m){ m = document.createElement('div'); m.id = 'simP'; m.className = 'glass'; $('v3d').appendChild(m); }
const U = simUnits(), O = (v) => Object.entries(UT).map(([k, u]) => `<option value="${k}"${v === k ? ' selected' : ''}>${u.n}</option>`).join(''), inp = (u, k, w) => `<input data-u="${u.key}" data-k="${k}" inputmode="numeric" value="${u.p[k] ?? ''}" placeholder="${utOf(u.p)[k]}" style="width:${w}px">`;
m.innerHTML = `<div class="row" style="align-items:center"><b style="flex:1">Симуляция</b><button id="simX">✕</button></div>
<div class="row" style="gap:6px;margin:6px 0"><button data-tg="sec" class="${SIM.sec ? 'on' : ''}">Сектора огня</button><button data-tg="vis" class="${SIM.vis ? 'on' : ''}">👁 Видимость</button><button data-tg="det" class="${SIM.det ? 'on' : ''}">Линии обнаружения</button><button data-tg="los" class="${SIM.los ? 'on' : ''}">📏 Линия видимости</button></div>
<div class="row" style="gap:6px;flex-wrap:wrap"><button id="simGm" class="${SIM.live ? 'on' : ''}">🎮 ${SIM.live ? 'Выйти из игры' : 'Играть'}</button><button id="simMe">Я — ${(SIDES[SC.cur.me || 'r'] || {}).name || 'красные'}</button><button id="simRe">⟳ Пересчитать бой</button>${['r', 'b'].map(s => `<button data-ai="${s}" class="${(SC.cur.ai || {})[s] ? 'on' : ''}">ИИ: ${(SIDES[s] && SIDES[s].name) || s}</button>`).join('')}<button id="simTurn" class="${SC.cur.turn ? 'on' : ''}">Пошагово (ход 1 мин)</button><button id="simDb" class="${SIM.tab === 'db' ? 'on' : ''}">📋 Разбор</button></div><div class="sub-h">Цели боя</div><div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">${(SC.cur.cp || []).map((c, k) => `<span class="arr" style="gap:4px;padding:2px 6px">⚑ ${escapeHtml(c.n)} <button data-cpd="${k}" style="min-height:26px;padding:0 6px">✕</button></span>`).join('')}<button id="simCpA" class="${SIM.cpAdd ? 'on' : ''}">＋ Контрольная точка</button></div>
<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><label style="font-size:12px">Очки победы <input id="simVp" inputmode="numeric" value="${SC.cur.vpWin || ''}" placeholder="300" style="width:54px"></label><label style="font-size:12px">Лимит, мин <input id="simTl" inputmode="numeric" value="${SC.cur.tl || ''}" placeholder="30" style="width:44px"></label><label style="font-size:12px">ИИ <select id="simDf">${[['easy', 'лёгкий'], ['norm', 'обычный'], ['hard', 'сложный']].map(([k, v]) => `<option value="${k}"${(SC.cur.diff || 'norm') === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label></div>
<div class="sub-h">Юниты сцены (${U.length}) · тип, км/ч, наблюд. м, огонь м, сектор °, опыт, поведение, команды</div><div style="max-height:30vh;overflow:auto">${U.map(u => `<div class="arr" style="gap:4px;flex-wrap:wrap"><span data-sel="${u.key}" style="flex:1 1 100%;cursor:pointer;${SIM.sel === u.key ? 'color:var(--signal);font-weight:700' : ''}"><i class="fadot" style="background:${u.side && SIDES[u.side] ? SIDES[u.side].color : '#888'}"></i>${escapeHtml(labelOf(u.a, u.i) || u.a.name)}${u.p.path && u.p.path.length > 1 ? ` · ${fmtT(simDurOf(u.p))}${simPrep(u.p).steep ? ' · ⚠ крутые склоны' : ''}` : ' · стоит'}</span><select data-u="${u.key}" data-k="ut">${O(utK(u.p))}</select>${inp(u, 'spd', 46)}${inp(u, 'vr', 56)}${inp(u, 'fr', 60)}${inp(u, 'fs', 44)}<select data-u="${u.key}" data-k="xp">${['Новобранцы', 'Обстрелянные ★', 'Ветераны ★★', 'Элита ★★★'].map((v, k) => `<option value="${k}"${(+u.p.xp || 0) === k ? ' selected' : ''}>${v}</option>`).join('')}</select><select data-u="${u.key}" data-k="rf">${[0, 2, 5, 10, 15].map(v => `<option value="${v || ''}"${(+u.p.rf || 0) === v ? ' selected' : ''}>${v ? 'подкрепление через ' + v + ' мин' : 'в бою с начала'}</option>`).join('')}</select><select data-u="${u.key}" data-k="bh">${Object.entries(BH).map(([k, v]) => `<option value="${k}"${(u.p.bh || 'go') === k ? ' selected' : ''}>${v}</option>`).join('')}</select><span style="display:flex;gap:4px">${[['stop', '⏹'], ['go', '▶'], ['back', '↩'], ['nofire', '🚫'], ['fire', '🔥']].map(([c, ic]) => `<button data-q="${u.key}|${c}" title="Команда сейчас (${fmtT(SC.t)})">${ic}</button>`).join('')}</span><input data-u="${u.key}" data-k="cmds" value="${escapeHtml(u.p.cmds || '')}" placeholder="2:00 стоп; 5:00 вперёд; 8:00 отход" style="flex:1 1 100%">${(() => { const fr = simFrame(SC.t), i = SIM.run && SIM.run.idx.get(u.key); if (!fr || i == null) return ''; const fl = fr.F0.f[i]; return `<b style="flex:1 1 100%;font-size:12px;color:${fl & 4 ? '#d62020' : fl & 2 ? '#ff7a1a' : fl & 1 ? '#e6b800' : 'var(--ok)'}">Боеспособность ${fr.F0.hp[i]}% · мораль ${fr.F0.mo[i]}${fr.F0.am[i] != null ? ` · боезапас ${fr.F0.am[i]}%` : ''}${fr.F0.rk[i] ? ' · ' + '★'.repeat(fr.F0.rk[i]) : ''}${fl & 4 ? ' · уничтожен' : fl & 2 ? ' · небоеспособен' : fl & 32 ? ' · БЕЖИТ' : fl & 16 ? ' · колеблется' : fl & 1 ? ' · подавлен' : ''}${fl & 8 ? ' · отход' : ''}${fl & 128 ? ' · в укрытии' : ''}${fr.F0.md[i] ? ' · ⚙ ' + [fr.F0.md[i] & 1 ? 'ходовая' : '', fr.F0.md[i] & 2 ? 'орудие' : '', fr.F0.md[i] & 4 ? 'экипаж' : ''].filter(Boolean).join(', ') : ''}</b>`; })()}</div>`).join('') || '<div class="empty">В сцене нет знаков.</div>'}</div>
<div class="sub-h">Журнал</div><div id="simEv" style="max-height:24vh;overflow:auto"></div><small style="color:var(--mute)">${SIM.g ? 'Рельеф учтён: подъёмы замедляют, видимость — по рельефу.' : 'Рельеф загружается…'}</small>`;
m.style.display = 'flex'; simLog();
$('simX').onclick = () => { m.style.display = 'none'; }; $('simRe').onclick = () => { if (SIM.live) simLive(true); else simRecalc(); };
$('simGm').onclick = () => simLive(!SIM.live);
$('simCpA').onclick = () => { SIM.cpAdd = !SIM.cpAdd; if (SIM.cpAdd) toast('Коснитесь рельефа — там будет контрольная точка'); simPanel(); };
m.querySelectorAll('[data-cpd]').forEach(b => b.onclick = () => { SC.cur.cp.splice(+b.dataset.cpd, 1); persist(); simRecalc(); simPanel(); });
[['simVp', 'vpWin'], ['simTl', 'tl'], ['simDf', 'diff']].forEach(([id, k]) => { $(id).onchange = e => { const v = e.target.value.trim(); if (v) SC.cur[k] = k === 'diff' ? v : +v; else delete SC.cur[k]; persist(); simRecalc(); }; }); $('simMe').onclick = () => { SC.cur.me = (SC.cur.me || 'r') === 'r' ? 'b' : 'r'; persist(); if (SIM.live) simLive(true); simPanel(); };
m.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => { const c = SC.cur.ai = SC.cur.ai || {}; c[b.dataset.ai] = !c[b.dataset.ai]; persist(); simRecalc(); simPanel(); });
$('simTurn').onclick = () => { SC.cur.turn = !SC.cur.turn; persist(); SIM.turnK = Math.floor(SC.t / 60); simPanel(); toast(SC.cur.turn ? 'Пошагово: проигрывание встаёт каждую минуту' : 'Непрерывное проигрывание'); };
$('simDb').onclick = () => { SIM.tab = SIM.tab === 'db' ? '' : 'db'; simPanel(); };
m.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const [key, c] = b.dataset.q.split('|'), u = U.find(x => x.key === key); if (!u) return; const tt = Math.floor(SC.t), w = {stop:'стоп', go:'вперёд', back:'отход', nofire:'прекратить огонь', fire:'огонь'}[c]; u.p.cmds = ((u.p.cmds ? u.p.cmds + '; ' : '') + `${Math.floor(tt / 60)}:${String(tt % 60).padStart(2, '0')} ${w}`); persist(); toast(`${labelOf(u.a, u.i) || u.a.name}: ${w} с ${fmtT(tt)}`); simRecalc(); simPanel(); });
m.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const k = b.dataset.tg; if (k === 'los'){ SIM.los = !SIM.los; SIM.losPts = []; if (SIM.los) toast('Коснитесь двух точек на рельефе'); } else { SIM[k] = !SIM[k]; if (k === 'vis' && SIM.vis && !SIM.sel) toast('Выберите юнит в списке'); SIM.vsF = null; } simPanel(); simDraw(); });
m.querySelectorAll('[data-sel]').forEach(s => s.onclick = () => { SIM.sel = s.dataset.sel; SIM.vsF = null; SIM.vis = true; simPanel(); simDraw(); });
m.querySelectorAll('[data-k]').forEach(el => el.onchange = () => { const u = U.find(x => x.key === el.dataset.u); if (!u) return; const k = el.dataset.k, v = el.value.trim(); if (v === '') delete u.p[k]; else u.p[k] = (k === 'ut' || k === 'bh' || k === 'cmds') ? v : +v.replace(',', '.'); persist(); simRecalc(); simPanel(); }); }
function simRecalc(){ if (!SC.cur) return; if (SIM.live){ simLive(true); return; } SC.T = scnDur(SC.cur); $('tlR').max = SC.T; scnSet(Math.min(SC.t, SC.T), true); simRun(); simDraw(); }
{ const os = openScene; window.openScene = function(sc){ SIM.live = null; SIM.liveUI = false; if ($('simCards')) $('simCards').style.display = 'none'; SIM.ev = []; SIM.run = null; SIM.busy = false; SIM.runId = (SIM.runId || 0) + 1; SIM.sel = null; SIM.vsF = null; SIM.losPts = []; SIM.g = null; os.apply(this, arguments); if (v3 && SIM.mapRef !== v3){ SIM.mapRef = v3; v3.on('click', simClick); } simGrid(sc.b).then(() => { if (SC.cur === sc){ simRecalc(); if ($('simP') && $('simP').style.display !== 'none') simPanel(); } }); setTimeout(() => { if (SC.cur === sc && !SIM.run && !SIM.busy) simRun(); }, 300); }; }
{ const ss = scnSet; window.scnSet = function(){ if (SIM.live && SC.cur){ let k = 0; while (SIM.live.t <= SC.t && k++ < 60) SIM.live.step(); if (SC.t > SIM.live.t) SC.t = SIM.live.t; if (SIM.liveUI && performance.now() - (SIM.cardsT || 0) > 350){ SIM.cardsT = performance.now(); simCards(); } } const r = ss.apply(this, arguments); if (SIM.run && SC.cur){ const fr = simFrame(SC.t); if (fr){ SIM.run.U.forEach((u, i) => { const S = SIM.run.st[i]; if (!S.prep && fr.F0.x[i] == null) return; const q = simAt(u, SC.t); ANIM.set(u.key, {lng:q.c[0], lat:q.c[1], rot:q.rot || 0}); }); scnRefresh(!SC.raf); } }
if (SC.cur && SC.cur.turn){ const k = Math.floor(SC.t / 60); if (SC.raf && SIM.turnK != null && k > SIM.turnK && SC.t < SC.T){ SIM.turnK = k; scnPause(); toast(`Ход ${k + 1} (${fmtT(k * 60)}): отдайте команды и нажмите ▶`); if ($('simP') && $('simP').style.display !== 'none') simPanel(); } else SIM.turnK = k; } const now = performance.now(); if (!SIM.ld || now - SIM.ld > 120 || !SC.raf){ SIM.ld = now; simDraw(); } return r; }; }
{ const sb = document.createElement('button'), cb = document.createElement('button'), ic = () => { sb.textContent = SND.vol >= 1 ? '🔊' : SND.vol > 0 ? '🔉' : '🔇'; cb.textContent = '⛉'; cb.classList.toggle('on', CHV.on); cb.style.color = CHV.on ? 'var(--signal)' : ''; }; sb.id = 'tlSnd'; sb.title = 'Звук: громко / тише / выкл'; cb.id = 'tlChev'; cb.title = 'Шевроны над юнитами';
sb.onclick = () => { SND.vol = SND.vol >= 1 ? .5 : SND.vol > 0 ? 0 : 1; lsSet('skat_snd', SND.vol); sndInit(); if (SND.out) SND.out.gain.value = .6 * SND.vol; ic(); toast(SND.vol ? `Звук: ${SND.vol >= 1 ? 'громко' : 'тише'}` : 'Звук выключен'); };
cb.onclick = () => { CHV.on = !CHV.on; lsSet('skat_chev', CHV.on); ic(); try { v3.triggerRepaint(); } catch(e){} }; $('tlRec').after(sb, cb); ic(); }
{ const b = document.createElement('button'); b.id = 'tlSim'; b.textContent = 'Сим.'; b.title = 'Симуляция: юниты, видимость, огонь, журнал'; $('tlRec').after(b); b.onclick = () => { const m = $('simP'); if (m && m.style.display !== 'none') m.style.display = 'none'; else simPanel(); }; }
function simClick(e){ if (!SIM.los) return; const q = [e.lngLat.lng, e.lngLat.lat]; if (SIM.losPts.length >= 2) SIM.losPts = []; SIM.losPts.push(q); if (SIM.losPts.length === 2){ const [a, b] = SIM.losPts, [kx, ky] = mk(a[1]); toast(`${losOk(a, b, 1.8, 1.5) ? 'Видно' : 'Не видно'} · ${Math.round(Math.hypot((b[0] - a[0]) * kx, (b[1] - a[1]) * ky))} м`); } simDraw(); }
{ const st = document.createElement('style'); st.textContent = '#simP{position:absolute;left:10px;top:calc(var(--safe-t) + var(--tg) + 56px);z-index:8;display:none;flex-direction:column;gap:4px;padding:10px 12px;width:min(460px,calc(100vw - 90px));max-height:calc(100vh - var(--safe-t) - 200px);overflow:auto;color:var(--ink);font-size:13.5px}#simP button{min-height:34px;padding:0 10px;font-size:13px}#simP button.on{background:var(--acc-soft);color:var(--signal);border-color:var(--signal)}#simP input,#simP select{min-height:30px;border-radius:8px;border:1px solid var(--line2);background:var(--panel);color:var(--ink);padding:0 6px;font-size:13px}'; document.head.appendChild(st); }
// ======== 6.39: ЖИВОЕ УПРАВЛЕНИЕ (игровой режим, как в RTS): тактическая пауза, карточки юнитов, приказы касанием, строй ========
SIM.me = 'r'; SIM.selS = new Set(); SIM.om = 'move'; SIM.fm = 'line';
const GICON = {tank:'Т', bmp:'Б', btr:'Б', truck:'А', gun:'Г', sau:'С', rszo:'Р', mortar:'М', inf:'П', uavp:'Д', uavk:'Д'};
function simLive(on){ if (on){ if (!SC.cur) return; SIM.me = SC.cur.me || 'r'; SIM.selS.clear(); SIM.endShown = false; if ($('simEnd')) $('simEnd').style.display = 'none'; if (SC.raf) scnPause(); SIM.runId++; SIM.live = null; simRun(true); SIM.liveUI = true; SC.T = 3600; $('tlR').max = SC.T; SC.t = 0; scnSet(0, true); simCards();
toast(`Игровой режим: вы — ${(SIDES[SIM.me] || {}).name || SIM.me}. Выбирайте юнитов внизу, касайтесь рельефа — приказ. ▶ — бой, ⏸ — тактическая пауза`); }
else { SIM.live = null; SIM.liveUI = false; SIM.selS.clear(); const c = $('simCards'); if (c) c.style.display = 'none'; simRecalc(); } if ($('simP') && $('simP').style.display !== 'none') simPanel(); }
function simCards(){ const L = SIM.live; let c = $('simCards'); if (!L){ if (c) c.style.display = 'none'; return; }
if (!c){ c = document.createElement('div'); c.id = 'simCards'; $('v3d').appendChild(c); c.addEventListener('click', simCardClick); }
const fr = simFrame(SC.t), mine = L.U.map((u, i) => [u, i]).filter(([u]) => u.side === SIM.me), sel = SIM.selS;
const card = ([u, i]) => { const f = fr ? fr.F0 : null, hp = f ? f.hp[i] : 100, mo = f ? f.mo[i] : 70, fl = f ? f.f[i] : 0, key = MDL_OF[u.p.sym || u.a.sym] || '', o = L.st[i].order;
const stt = fl & 4 ? '✖' : fl & 32 ? '⚑' : fl & 2 ? '✚' : fl & 16 ? '?' : fl & 1 ? '⚠' : o ? {move:'➜', attack:'◎', hold:'■', retreat:'↩', prone:'▁'}[o.k] || '' : '';
return `<div class="sc${sel.has(u.key) ? ' on' : ''}${fl & 4 ? ' dead' : ''}" data-k="${u.key}"><b class="si" style="background:${(SIDES[u.side] || {}).color || '#888'}">${GICON[key] || '•'}</b><span class="sn">${escapeHtml(labelOf(u.a, u.i) || u.a.name)}</span><i class="sb"><i style="width:${hp}%;background:${hp > 60 ? '#4cd964' : hp > 30 ? '#ffcc00' : '#ff3b30'}"></i></i><i class="sb"><i style="width:${mo}%;background:${mo > 45 ? '#5b9cff' : '#c9a0ff'}"></i></i><em>${stt}${f && f.rk[i] ? ' ' + '★'.repeat(f.rk[i]) : ''}</em></div>`; };
const B = (k, t, on) => `<button data-o="${k}"${on ? ' class="on"' : ''}>${t}</button>`, n = sel.size;
const F0 = fr ? fr.F0 : null, vp = F0 && F0.vp ? F0.vp : [0, 0], cps = (SC.cur.cp || []).map((cp, k) => { const s = F0 && F0.cp ? F0.cp[k] : ['', '', 0]; return `<b style="padding:2px 6px;border-radius:6px;background:${s[0] && SIDES[s[0]] ? SIDES[s[0]].color : '#666'};color:#fff">${escapeHtml(cp.n)}${s[1] && s[2] ? ' ' + s[2] + '%' : ''}</b>`; }).join(' ');
c.innerHTML = `<div class="sord svp"><b style="color:${(SIDES.r || {}).color}">${(SIDES.r || {}).name || 'Красные'} ${vp[0]}</b> : <b style="color:${(SIDES.b || {}).color}">${vp[1]} ${(SIDES.b || {}).name || 'Синие'}</b> <span style="color:var(--mute)">из ${L.vpWin}</span> ${cps} <span style="margin-left:auto">⏱ ${fmtT(L.t)} / ${fmtT(L.tlim)}</span></div><div class="sord">${n ? `<b>${n}</b>${B('move', '➜ Идти', SIM.om === 'move')}${B('attack', '◎ Атаковать', SIM.om === 'attack')}${B('hold', '■ Держать')}${B('retreat', '↩ Отступить')}${B('prone', '▁ Залечь')}${B('fm', 'Строй: ' + {line:'линия', col:'колонна', wedge:'клин'}[SIM.fm])}${B('none', '✕')}` : '<span>Коснитесь карточки — выбор; затем касание рельефа — «идти», по противнику — «атаковать»</span>'}${B('all', 'Все')}${B('exit', 'Выйти из игры')}</div><div class="srow">${mine.map(card).join('') || '<span>У вашей стороны нет юнитов в сцене</span>'}</div>`;
c.style.display = 'flex'; if (L.res && !SIM.endShown){ SIM.endShown = true; if (SC.raf) scnPause(); simEnd(); } }
function simEnd(){ const L = SIM.live, R = L && L.res; if (!R) return; let w = $('simEnd'); if (!w){ w = document.createElement('div'); w.id = 'simEnd'; $('v3d').appendChild(w); }
const me = SIM.me, D = simDebrief(), title = !R.win ? 'НИЧЬЯ' : R.win === me ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ', col = !R.win ? '#ffd400' : R.win === me ? '#4cd964' : '#ff3b30', vp = L.frames.length ? L.frames[L.frames.length - 1].vp : [0, 0];
w.innerHTML = `<div class="card" style="max-width:520px"><h2 style="color:${col};text-align:center;font-size:34px;margin:6px 0">${title}</h2><div style="text-align:center;color:var(--mute)">${escapeHtml(R.why)} · ${fmtT(R.t)} · счёт ${vp[0]} : ${vp[1]}</div>${D ? D.rows.map(r => `<div class="arr" style="flex-direction:column;align-items:stretch"><b style="color:${SIDES[r.s] ? SIDES[r.s].color : 'inherit'}">${escapeHtml(D.SN(r.s))}: ${r.p0}% → ${r.p1}%</b><span>Уничтожено ${r.dead}, небоеспособно ${r.ko}, бежали ${r.rout} из ${r.n}${r.best != null && SIM.run.st[r.best].out > .5 ? ' · лучший: ' + escapeHtml(labelOf(SIM.run.U[r.best].a, SIM.run.U[r.best].i) || '') : ''}</span></div>`).join('') : ''}<div class="row" style="justify-content:center;gap:8px;margin-top:10px"><button id="seAg">⟳ Сыграть снова</button><button id="seDb">📋 Разбор</button><button class="primary" id="seX">Закрыть</button></div></div>`;
w.style.display = 'flex'; $('seX').onclick = () => { w.style.display = 'none'; }; $('seAg').onclick = () => { w.style.display = 'none'; SIM.endShown = false; simLive(true); }; $('seDb').onclick = () => { w.style.display = 'none'; SIM.tab = 'db'; simPanel(); }; }
function simCardClick(e){ const L = SIM.live; if (!L) return; const cd = e.target.closest('[data-k]'), b = e.target.closest('[data-o]');
if (cd){ const k = cd.dataset.k; if (SIM.selS.has(k)) SIM.selS.delete(k); else { if (!e.shiftKey && !SIM.multi) SIM.selS.clear(); SIM.selS.add(k); } SIM.multi = false; if (e.detail === 2){ const i = L.U.findIndex(u => u.key === k); if (i >= 0){ const q = simAt(L.U[i], SC.t); v3.easeTo({center:q.c, duration:600}); } } simCards(); simDraw(); try { v3.triggerRepaint(); } catch(_){} return; }
if (!b) return; const o = b.dataset.o, S = [...SIM.selS].map(k => L.U.findIndex(u => u.key === k)).filter(i => i >= 0 && !L.st[i].dead);
if (o === 'all'){ L.U.forEach((u, i) => { if (u.side === SIM.me && !L.st[i].dead) SIM.selS.add(u.key); }); }
else if (o === 'none') SIM.selS.clear(); else if (o === 'exit'){ simLive(false); return; }
else if (o === 'fm') SIM.fm = {line:'col', col:'wedge', wedge:'line'}[SIM.fm];
else if (o === 'move' || o === 'attack'){ SIM.om = o; toast(o === 'move' ? 'Коснитесь рельефа — куда идти' : 'Коснитесь противника'); }
else { S.forEach(i => { L.st[i].order = {k:o}; L.st[i].ret = null; }); L.ev.push({t:L.t, k:'cmd', s:`Приказ (${S.length}): ${{hold:'держать позицию', retreat:'отступить', prone:'залечь'}[o]}`}); }
simCards(); simDraw(); }
// касание 3D-карты в игровом режиме: выбор своего, атака противника, движение строем
function simGameTap(e){ const L = SIM.live; if (!L) return; const pt = e.point; let best = -1, bd = 34;
L.U.forEach((u, i) => { if (L.st[i].dead) return; const q = simAt(u, SC.t), p = v3.project(q.c), d = Math.hypot(p.x - pt.x, p.y - pt.y); if (d < bd){ bd = d; best = i; } });
const S = [...SIM.selS].map(k => L.U.findIndex(u => u.key === k)).filter(i => i >= 0 && !L.st[i].dead && !L.st[i].rout);
if (best >= 0 && L.U[best].side === SIM.me && SIM.om !== 'attack'){ const k = L.U[best].key; if (!e.originalEvent || !e.originalEvent.shiftKey) SIM.selS.clear(); SIM.selS.add(k); simCards(); simDraw(); v3.triggerRepaint(); return; }
if (!S.length){ toast('Сначала выберите своих юнитов (карточки внизу)'); return; }
if (best >= 0 && L.U[best].side !== SIM.me){ S.forEach(i => { L.st[i].order = {k:'attack', j:best}; }); L.ev.push({t:L.t, k:'cmd', s:`Приказ (${S.length}): атаковать ${labelOf(L.U[best].a, L.U[best].i) || L.U[best].a.name}`}); SIM.om = 'move'; simCards(); simDraw(); return; }
if (SIM.om === 'attack'){ toast('Коснитесь противника'); return; }
const to = [e.lngLat.lng, e.lngLat.lat], [kx, ky] = mk(to[1]), C = S.map(i => L.P(i)), cx = C.reduce((s, c) => s + c[0], 0) / C.length, cy = C.reduce((s, c) => s + c[1], 0) / C.length, az = Math.atan2((to[0] - cx) * kx, (to[1] - cy) * ky), n = S.length, sp = 60;
const off = k => { const r = k - (n - 1) / 2; if (SIM.fm === 'col') return [0, -k * sp]; if (SIM.fm === 'wedge') return [r * sp, -Math.abs(r) * sp * .8]; return [r * sp, 0]; }; // [вправо, вперёд]
S.forEach((i, k) => { const [ox, oy] = off(k), ex = ox * Math.cos(az) + oy * Math.sin(az), ny = -ox * Math.sin(az) + oy * Math.cos(az); L.st[i].order = {k:'move', to:[to[0] + ex / kx, to[1] + ny / ky]}; });
L.ev.push({t:L.t, k:'cmd', s:`Приказ (${n}): идти, строй — ${{line:'линия', col:'колонна', wedge:'клин'}[SIM.fm]}`}); simCards(); simDraw(); }
{ const sc0 = simClick; window.simClick = function(e){ if (SIM.cpAdd && SC.cur){ SIM.cpAdd = false; const L1 = SC.cur.cp = SC.cur.cp || []; L1.push({n:'КТ-' + (L1.length + 1), lng:+e.lngLat.lng.toFixed(6), lat:+e.lngLat.lat.toFixed(6), r:150}); persist(); toast(`${L1[L1.length - 1].n} поставлена (радиус 150 м)`); simRecalc(); if ($('simP') && $('simP').style.display !== 'none') simPanel(); return; } if (SIM.live) return simGameTap(e); return sc0.apply(this, arguments); }; }
document.addEventListener('keydown', e => { if (!SIM.live || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return; if (e.code === 'Space'){ e.preventDefault(); SC.raf ? scnPause() : scnPlay(); } else if (e.key === 'Escape'){ SIM.selS.clear(); simCards(); simDraw(); } });
{ const st = document.createElement('style'); st.textContent = '#simCards{position:absolute;left:10px;right:70px;bottom:calc(var(--safe-b) + 140px);z-index:7;display:none;flex-direction:column;gap:6px;pointer-events:none}#simCards>*{pointer-events:auto}'
+ '#simCards .sord{display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:var(--glass);border:1px solid var(--line);border-radius:12px;padding:6px 8px;color:var(--ink);font-size:13px}#simCards .sord button{min-height:32px;padding:0 9px;font-size:13px}#simCards .sord button.on{background:var(--acc-soft);color:var(--signal);border-color:var(--signal)}'
+ '#simEnd{position:absolute;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45)}#simEnd .card{position:relative;width:min(520px,92%);max-height:80%;overflow:auto;border-radius:18px;padding:14px 16px}#simCards .svp{gap:8px}'
+ '#simCards .srow{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}#simCards .sc{flex:none;width:92px;padding:6px;border-radius:10px;background:rgba(12,16,14,.85);border:2px solid transparent;color:#fff;display:flex;flex-direction:column;gap:3px;cursor:pointer;font-size:11.5px}#simCards .sc.on{border-color:#ffd400}#simCards .sc.dead{opacity:.45}'
+ '#simCards .si{width:26px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff}#simCards .sn{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}#simCards .sb{display:block;height:5px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden}#simCards .sb>i{display:block;height:5px}#simCards em{font-style:normal;color:#ffd400;min-height:13px}'; document.head.appendChild(st); }
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
// пыль, дым, огонь, кольцо подавления
const dust = new T.Group(); G.add(dust); ud.dust = dust; for (let i = 0; i < 5; i++){ const s = new T.Mesh(tjG('sp', () => new T.SphereGeometry(.5, 6, 5)), tjM('#9c8a6a', {transparent:true, opacity:.35, depthWrite:false})); s.visible = false; dust.add(s); }
const smk = new T.Group(); G.add(smk); ud.smk = smk; for (let i = 0; i < 6; i++){ const s = new T.Mesh(tjG('sp', () => new T.SphereGeometry(.5, 6, 5)), tjM('#2b2b2b', {transparent:true, opacity:.45, depthWrite:false})); smk.add(s); } smk.visible = false;
const fire = new T.Mesh(tjG('fi', () => new T.ConeGeometry(.6, 1.6, 7)), tjB('#ff7a1a')); fire.position.y = 1.6; fire.visible = false; G.add(fire); ud.fire = fire;
const ring = new T.Mesh(tjG('rg', () => new T.TorusGeometry(2.6, .09, 4, 28)), tjB('#ffd400')); ring.rotation.x = Math.PI / 2; ring.position.y = .15; ring.visible = false; G.add(ring); ud.ring = ring;
ud.ph = Math.random(); return G; }
// ---- кадр: синхронизация с обстановкой, сценой и симуляцией
function tjFrame(){ if (!v3 || !TJ.ready) return false; const T = THREE, now = performance.now() / 1000, c = v3.getCenter(); let o0 = TJ.origin;
if (!o0 || Math.abs(c.lat - o0.lat) > .15 || Math.abs(c.lng - o0.lng) > .2){ const mc = maplibregl.MercatorCoordinate.fromLngLat([c.lng, c.lat], 0); o0 = TJ.origin = {lat:c.lat, lng:c.lng, x:mc.x, y:mc.y, z:mc.z, s:mc.meterInMercatorCoordinateUnits(), k:mk(c.lat)}; }
const want = new Set(), S0 = v3cfg.ms || 4, fr = SIM.run && SC.cur ? simFrame(SC.t) : null, tt = SC.cur ? SC.t : now; let anim = false, n = 0; const zm = v3.getZoom(), mpp = 40075016.7 * Math.cos(c.lat * Math.PI / 180) / (512 * Math.pow(2, zm)), cx = (c.lng - o0.lng) * o0.k[0], cy = (c.lat - o0.lat) * o0.k[1], camH = 40 * Math.pow(2, 17 - zm), AM = {trk:0, wh:0, uav:0, fire:0, d:1e9}, CH = [];
state.arrays.forEach(a => { if (a.hidden || a.kind === 'aux' || a.kind === 'shapes') return; a.points.forEach((p0, pi) => { if (p0.hid || !tagOk(a, p0) || n > 160) return; const sid = p0.sym || a.sym, key = sid && MDL_OF[sid]; if (!TJK[key]) return;
const id = a.id + ':' + pi, ov = ANIM.get(id), p = ov ? Object.assign({}, p0, ov) : p0; if (Math.abs(p.lat - c.lat) > .3 || Math.abs(p.lng - c.lng) > .45) return; n++; want.add(id);
const sd = sideOf(a, p0), col = sid === 'lozh' ? SCOL.g : symCol(sid, sd, styleOf(a, p0).color); let o = TJ.objs.get(id); if (!o || o.userData.key !== key || o.userData.col !== col){ if (o) TJ.scene.remove(o); o = tjBuild(key, col); TJ.scene.add(o); TJ.objs.set(id, o); }
const ud = o.userData, rot = (p.rot ?? a.rot) ?? (sd === 'b' ? 180 : 0), brg = ((rot + 270) % 360 + 360) % 360, air = MDL_AIR[key], el = (v3.queryTerrainElevation && v3.queryTerrainElevation([p.lng, p.lat])) || 0;
const x = (p.lng - o0.lng) * o0.k[0], y = (p.lat - o0.lat) * o0.k[1], mv = ud.px != null && Math.hypot(x - ud.px, y - ud.py) > .05; ud.px = x; ud.py = y; if (mv) ud.mt = now;
const moving = now - (ud.mt || -9) < .4, sc = (air ? Math.max(2, S0 * .8) : S0) * (p.msc || 1); o.visible = true; o.position.set(x, el + (air ? (p.alt ?? (v3cfg.alt || 60)) : 0), -y); o.rotation.set(0, -brg * Math.PI / 180, ud.dd ? .07 : 0); o.scale.setScalar(sc);
let fl = 0, tb = null, firing = false; if (fr){ const i = SIM.run.idx.get(id); if (i != null){ fl = fr.F0.f[i]; if (fl & 256){ o.visible = false; return; } const L = fr.F0.L.find(l => l[0] === i && l[2] === 2); if (L){ firing = true; const q = simAt(SIM.run.U[L[1]], SC.t), [kx, ky] = mk(p.lat); tb = (Math.atan2((q.c[0] - p.lng) * kx, (q.c[1] - p.lat) * ky) * 180 / Math.PI + 360) % 360; } } }
ud.td = null; if (firing && fr){ const L = fr.F0.L.find(l => l[0] === SIM.run.idx.get(id) && l[2] === 2); if (L){ const q = simAt(SIM.run.U[L[1]], SC.t); ud.td = Math.hypot((q.c[0] - o0.lng) * o0.k[0] - cx, (q.c[1] - o0.lat) * o0.k[1] - cy, camH); } }
if (!firing && (p.fires || []).some(f => { const k = FIRE_K[f.k] || FIRE_K.gun; return tt >= (f.t0 || 0) && tt <= (f.t0 || 0) + (f.n || k.n) * (f.ev || k.ev); })){ firing = true; const f = p.fires.find(f => tt >= (f.t0 || 0)); if (f){ const [kx, ky] = mk(p.lat); tb = (Math.atan2((f.tx - p.lng) * kx, (f.ty - p.lat) * ky) * 180 / Math.PI + 360) % 360; ud.fd = {d:Math.hypot((f.tx - o0.lng) * o0.k[0] - cx, (f.ty - o0.lat) * o0.k[1] - cy, camH), tof:f.tof || (FIRE_K[f.k] || FIRE_K.gun).tof}; } }
const dead = !!(fl & 4), ko = !!(fl & 2), sup = !!(fl & 1);
if (ud.tur){ let w = tb != null ? -(((tb - brg + 540) % 360) - 180) * Math.PI / 180 : 0, cur = ud.tur.rotation.y, d = ((w - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; if (Math.abs(d) > .002){ ud.tur.rotation.y = cur + d * .12; anim = true; } }
if (ud.gun && ud.flash){ const ph = (tt * .55 + ud.ph) % 1, on = firing && !dead && ph < .07; const dU = Math.hypot(x - cx, y - cy, camH); if (on && !ud.fon){ sndShot(key, dU); if (ud.fd) setTimeout(() => sndBoom(ud.fd.d), ud.fd.tof / Math.max(.1, SC.mul || 1) * 1000); else if (ud.td != null) setTimeout(() => sndHit(ud.td), 250); } ud.fon = on; ud.fd = null; ud.flash.visible = on; ud.flash.scale.setScalar(on ? .7 + Math.random() * .6 : 1); if (ud.gz0 == null) ud.gz0 = ud.gun.position.z; ud.gun.position.z = ud.gz0 + ((firing && !dead && ph < .2) ? .35 * (1 - ph / .2) : 0); if (firing) anim = true; }
if (moving && !dead){ ud.wh.forEach(w => { w.rotation.x -= .25; }); ud.legs.forEach((l, k) => { l.rotation.x = Math.sin(now * 9 + k * Math.PI) * .5; }); anim = true; } else ud.legs.forEach(l => { l.rotation.x *= .8; });
ud.rot.forEach(r => { r.o.rotation[r.ax] += r.v; anim = true; });
const dv = moving && !air && !dead && key !== 'inf' && key !== 'mortar'; ud.dust.children.forEach((s, k) => { s.visible = dv; if (dv){ const q = (now * .9 + k / 5) % 1; s.position.set((k % 2 ? .6 : -.6) * (1 + q), .3 + q * 1.2, 3 + q * 4); s.scale.setScalar(.5 + q * 1.6); } });
ud.smk.visible = dead || ko; if (dead || ko){ anim = true; ud.smk.children.forEach((s, k) => { const q = (now * .25 + k / 6) % 1; s.position.set(Math.sin(k * 2.1) * .5 + q * 1.2, 1.8 + q * 7, Math.cos(k * 1.7) * .5); s.scale.setScalar(.6 + q * 2.4); s.material = tjM(dead ? '#1f1f1f' : '#6b6b6b', {transparent:true, opacity:Math.round(4.5 * (1 - q)) / 10, depthWrite:false}); }); }
ud.fire.visible = dead && Math.sin(now * 7 + ud.ph * 9) > -.6; if (ud.fire.visible) ud.fire.scale.set(1, .8 + Math.random() * .5, 1);
if (dead !== !!ud.dd){ if (dead && SC.raf) sndBoom(Math.hypot(x - cx, y - cy, camH), true); ud.dd = dead; ud.paint.forEach(m => { if (!m.userData.m0) m.userData.m0 = m.material; m.material = dead ? tjM('#2a2420') : m.userData.m0; }); }
ud.ring.visible = sup && !dead && Math.sin(now * 8) > 0; if (sup) anim = true;
{ const dU2 = Math.hypot(x - cx, y - cy, camH); if (moving && !dead){ if (TJK[key] && ['tank', 'bmp', 'sau'].includes(key)) AM.trk++; else if (!air && key !== 'inf' && key !== 'mortar') AM.wh++; } if (air) AM.uav++; if (dead) AM.fire++; if ((moving || air || dead) && dU2 < AM.d) AM.d = dU2;
if (CHV.on){ const i = fr ? SIM.run.idx.get(id) : null, hp = i != null ? fr.F0.hp[i] : null, mo = i != null ? fr.F0.mo[i] : null, rk = i != null ? fr.F0.rk[i] : +p0.xp || 0, md = i != null ? fr.F0.md[i] : 0, amv = i != null ? fr.F0.am[i] : null, name = labelOf(a, pi) || p0.name || a.name, sk = [name, col, hp == null ? '' : Math.round(hp / 5), mo == null ? '' : Math.round(mo / 5), rk, md, amv == null ? '' : amv < 25 ? (amv ? 1 : 0) : 2, fl, firing ? 1 : 0, (SIM.sel === id || SIM.selS && SIM.selS.has(id)) ? 1 : 0].join('|');
if (!ud.chs){ ud.chs = new T.Sprite(new T.SpriteMaterial({transparent:true, depthTest:false, depthWrite:false})); ud.chs.renderOrder = 999; o.add(ud.chs); } if (ud.chk !== sk){ ud.chk = sk; chvDraw(ud, name, col, hp, fl, firing, SIM.sel === id || !!(SIM.selS && SIM.selS.has(id)), key, mo, rk, md, amv); ud.chs.material.map = ud.cht; ud.chs.material.needsUpdate = true; }
ud.chs.visible = true; CH.push([dU2, ud.chs]); ud.chs.scale.set(150 * mpp / sc, 66 * mpp / sc, 1); ud.chs.position.set(0, ((air ? 2 : 3.2) * sc + 34 * mpp) / sc, 0); } else if (ud.chs) ud.chs.visible = false; } }); });
CH.sort((a, b) => a[0] - b[0]).slice(60).forEach(([, s]) => { s.visible = false; }); sndAmb(AM.trk, AM.wh, AM.uav, AM.fire, AM.d);
TJ.objs.forEach((o, id) => { if (!want.has(id)){ TJ.scene.remove(o); TJ.objs.delete(id); } }); return anim; }
function tjLayer(){ return {id:'tj3', type:'custom', renderingMode:'3d',
onAdd(map, gl){ const T = THREE; this.cam = new T.Camera(); TJ.scene = new T.Scene(); TJ.scene.add(new T.HemisphereLight(0xffffff, 0x445544, .85)); const d = new T.DirectionalLight(0xffffff, .65); d.position.set(.4, 1, .3); TJ.scene.add(d);
this.r = new T.WebGLRenderer({canvas:map.getCanvas(), context:gl, antialias:true}); this.r.autoClear = false; TJ.objs.clear(); },
render(gl, matrix){ const T = THREE, anim = tjFrame(), o = TJ.origin; if (!o) return; const m = new T.Matrix4().fromArray(matrix), l = new T.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new T.Vector3(o.s, -o.s, o.s)).multiply(new T.Matrix4().makeRotationX(Math.PI / 2));
this.cam.projectionMatrix = m.multiply(l); this.r.resetState(); this.r.render(TJ.scene, this.cam); if (anim) v3.triggerRepaint(); },
onRemove(){ TJ.objs.clear(); TJ.scene = null; } }; }
function tjAdd(){ if (!v3 || !window.THREE) return; try { if (!v3.getLayer('tj3')) v3.addLayer(tjLayer()); TJ.ready = true; TJ.on = true; v3.getSource('mdl') && v3.getSource('mdl').setData(v3mdl(v3.getCenter())); v3.triggerRepaint(); } catch(e){ console.error('tj3', e); TJ.on = false; } }
{ const o3 = open3D; window.open3D = async function(){ const r = await o3.apply(this, arguments); try { if (v3 && !v3._dk){ v3._dk = 1; v3.on('movestart', e => { if (e.originalEvent && window.dockPan) dockPan(true); }); v3.on('moveend', () => window.dockPan && dockPan(false)); } } catch(e){} if (v3cfg.tj === false) return r; loadThree().then(() => { if (!v3) return; if (v3.loaded()) tjAdd(); else v3.once('load', tjAdd); if (!TJ.sd){ TJ.sd = 1; } v3.on('styledata', () => { if (TJ.on && !v3.getLayer('tj3')) setTimeout(tjAdd, 50); }); }).catch(() => toast('Объёмные модели недоступны без сети — показаны упрощённые')); return r; }; }
{ const c3 = close3D; window.close3D = function(){ TJ.on = false; TJ.ready = false; TJ.origin = null; TJ.objs.clear(); return c3.apply(this, arguments); }; }
window.__mod_mk = 1;
