// СКАТ — модуль «Редактор» (ed.js, с 6.65): проекты карт для печати.
// Проект: подложка (участок карты или свой файл с привязкой по квадрату сетки), лист, масштаб, рамка.
// Слои проекта хранятся отдельно (IndexedDB 'skat_ed'); при открытии подменяют state.arrays, основная обстановка — в ED.main.
(() => {
const ED = {on:0, cur:null, main:null, layer0:null, q:Promise.resolve(), img:null, lg:null};
const E = escapeHtml, te = new TextEncoder(), td = new TextDecoder();
const PP = {A4:[210, 297], A3:[297, 420], A2:[420, 594], A1:[594, 841], A0:[841, 1189]}, SCL = [10000, 25000, 50000, 100000, 200000];
const fmtS = n => '1:' + Math.round(n).toLocaleString('ru-RU'), km1 = v => v.toFixed(1).replace('.', ',');
const stOf = sc => sc <= 50000 ? 1000 : sc <= 100000 ? 2000 : 4000;
const paperMM = P => { const [w, h] = PP[P.paper] || PP.A4; return P.ori === 'l' ? [h, w] : [w, h]; };
// внутренняя область листа — как в prnRender: поля 8 мм, заголовок 11, подвал 7, рамка 9 с каждой стороны
const innerMM = P => { const [w, h] = paperMM(P), fb = P.frame ? 18 : 0; return [w - 16 - fb, h - 16 - (P.name ? 11 : 0) - 7 - fb]; };
const info = P => `${P.paper}, ${P.ori === 'l' ? 'альбомная' : 'книжная'} · ${fmtS(P.scale)}${P.frame ? ' · рамка' : ''} · ${P.base === 'img' ? 'свой файл' : 'карта'}`;
const nid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const css = document.createElement('style'); css.textContent = `
#edCal{position:fixed;inset:0;z-index:2900;background:#0b0f0d;display:flex;flex-direction:column;touch-action:none}
#edCal .ecTop{padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px;background:var(--panel);display:flex;flex-direction:column;gap:6px;border-bottom:1px solid var(--line)}
#ecMsg{font-size:13px;line-height:1.3}
#edCal .ecF{display:flex;gap:6px}
#edCal .ecF label{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--mute);flex:1;min-width:0}
#edCal .ecF input{width:100%;font-size:16px;min-height:36px;padding:4px 8px}
#edCal canvas{flex:1;min-height:0;width:100%;display:block;touch-action:none}
#edCal .ecBot{display:flex;gap:8px;padding:8px 10px calc(env(safe-area-inset-bottom,0px) + 8px);background:var(--panel);border-top:1px solid var(--line)}
#edCal .ecBot button{flex:1}
.edIt{display:flex;gap:10px;align-items:center;padding:8px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px;cursor:pointer}
.edIt.cur{border-color:var(--signal)}
.edIt img,.edIt .edTh{width:72px;height:52px;object-fit:cover;border-radius:6px;background:var(--panel2);flex:none}
.edIt>div{flex:1;min-width:0}.edIt b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.edIt small{color:var(--mute)}
.edIt>button{flex:none;min-width:40px}
.edAct{display:flex;gap:6px;flex-wrap:wrap;margin:-4px 0 10px}.edAct[hidden]{display:none}.edAct button{flex:1;min-width:100px}
.edG{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.edG button{min-height:44px}
label.f.chk{display:flex;align-items:center;gap:10px}label.f.chk input{width:22px;min-height:22px;margin:0}
.edLblI{pointer-events:none}.edLbl{position:absolute;left:0;top:-24px;white-space:nowrap;background:rgba(255,59,48,.92);color:#fff;font:600 11px/1.3 var(--font,sans-serif);padding:2px 7px;border-radius:6px}
#edPl{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);z-index:2600;display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:14px;background:var(--panel);border:1px solid var(--line2);box-shadow:0 6px 24px rgba(0,0,0,.4);font-size:13px;max-width:calc(100vw - 20px)}
.edImgEl{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none!important;max-height:none!important;pointer-events:none;user-select:none;-webkit-user-select:none;opacity:var(--edio,1)}
body.edimg .leaflet-tile-pane{opacity:var(--edmo,0)}
body.edimg .leaflet-container{background:#ecebe4}`;
document.head.appendChild(css);

// ---------- хранилище (шифруется вместе с приложением, если включён PIN)
let dbP = null;
const db = () => dbP || (dbP = new Promise((res, rej) => { const r = indexedDB.open('skat_ed', 1);
r.onupgradeneeded = () => { const d = r.result; ['p', 'i'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); }); };
r.onsuccess = () => res(r.result); r.onerror = () => { dbP = null; rej(r.error); }; }));
const tx = async (st, rw, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(st, rw ? 'readwrite' : 'readonly'), q = fn(t.objectStore(st)); t.oncomplete = () => res(q && q.result); t.onerror = t.onabort = () => rej(t.error); }); };
const dGet = (st, k) => tx(st, 0, s => s.get(k)), dPut = (st, k, v) => tx(st, 1, s => s.put(v, k)), dDel = (st, k) => tx(st, 1, s => s.delete(k)), dKeys = st => tx(st, 0, s => s.getAllKeys());
const encOn = () => !!(window.SEC && SEC.key);
async function pPut(id, j, enc = encOn()){ await dPut('p', id, enc ? {id, e:1, b:await SEC.enc(te.encode(j))} : {id, j}); }
async function pOf(r){ if (!r) return null; try { return JSON.parse(r.e ? (encOn() ? td.decode(await SEC.dec(r.b)) : 'null') : r.j); } catch(e){ return null; } }
const pGet = async id => pOf(await dGet('p', id));
async function iPut(id, blob, enc = encOn()){ await dPut('i', id, enc ? {e:1, t:blob.type, b:await SEC.enc(new Uint8Array(await blob.arrayBuffer()))} : {b:blob}); }
async function iOf(r){ if (!r) return null; try { return r.e ? (encOn() ? new Blob([await SEC.dec(r.b)], {type:r.t || 'image/jpeg'}) : null) : r.b; } catch(e){ return null; } }
const iGet = async id => iOf(await dGet('i', id));
ED.save = () => { const P = ED.cur; if (!P || !ED.main) return; P.t = Date.now(); if (P.base === 'map') P.lay = state.layer;
const j = JSON.stringify(Object.assign({}, P, {arrays:state.arrays})); ED.q = ED.q.then(() => pPut(P.id, j)).catch(e => console.warn('ed save', e)); };

// ---------- привязка снимка: аффинное преобразование пиксели (u вправо, v вниз) → СК-42 (X север, Y восток, м)
const gSK = (g, u, v) => [g.a[0] + g.a[1] * u + g.a[2] * v, g.b[0] + g.b[1] * u + g.b[2] * v];
const gLL = (g, u, v) => { const [x, y] = gSK(g, u, v); return GEO.fromSK(x, y, g.z); };
function freeGeo(P, W, H){ const [iw, ih] = innerMM(P), c = P.c || [map.getCenter().lat, map.getCenter().lng], s = GEO.toSK(c[0], c[1]), m = Math.min(iw * P.scale / 1000 / W, ih * P.scale / 1000 / H);
return {free:1, W, H, z:s.zone, a:[s.x + H / 2 * m, 0, -m], b:[s.y - W / 2 * m, m, 0]}; }
function fitAff(U, T){ const n = U.length, mu = U.reduce((s, p) => s + p[0], 0) / n, mv = U.reduce((s, p) => s + p[1], 0) / n; let Suu = 0, Suv = 0, Svv = 0;
U.forEach(([u, v]) => { u -= mu; v -= mv; Suu += u * u; Suv += u * v; Svv += v * v; }); const det = Suu * Svv - Suv * Suv; if (!(det > 1e-6 * Suu * Svv)) return null;
const one = k => { const c = T.reduce((s, t) => s + t[k], 0) / n; let Sut = 0, Svt = 0; U.forEach(([u, v], i) => { Sut += (u - mu) * (T[i][k] - c); Svt += (v - mv) * (T[i][k] - c); });
const p = (Sut * Svv - Svt * Suv) / det, q = (Svt * Suu - Sut * Suv) / det; return [c - p * mu - q * mv, p, q]; };
const a = one(0), b = one(1), rms = Math.sqrt(U.reduce((s, [u, v], i) => s + (a[0] + a[1] * u + a[2] * v - T[i][0]) ** 2 + (b[0] + b[1] * u + b[2] * v - T[i][1]) ** 2, 0) / n); return {a, b, rms}; }

// ---------- снимок на карте (поворот/наклон скана — CSS matrix по трём углам)
const EdImg = L.Layer.extend({
initialize(url, g){ this._u = url; this._g = g; },
onAdd(m){ let pn = m.getPane('edImg'); if (!pn){ pn = m.createPane('edImg', m.getPane('overlayPane').parentNode); pn.style.zIndex = 250; pn.style.pointerEvents = 'none'; }
const im = this._im = L.DomUtil.create('img', 'leaflet-zoom-hide leaflet-image-layer edImgEl', pn); im.alt = ''; im.draggable = false; im.src = this._u; this._upd(); },
onRemove(){ if (this._im) this._im.remove(); this._im = null; },
getEvents(){ return {zoomend:this._upd, viewreset:this._upd, moveend:this._upd, rotate:this._upd}; },
_upd(){ const im = this._im, g = this._g, m = this._map; if (!im || !m) return; const W = g.W, H = g.H, p = [[0, 0], [W, 0], [0, H]].map(([u, v]) => m.latLngToLayerPoint(gLL(g, u, v)));
im.style.width = W + 'px'; im.style.height = H + 'px'; im.style.transform = `matrix(${(p[1].x - p[0].x) / W},${(p[1].y - p[0].y) / W},${(p[2].x - p[0].x) / H},${(p[2].y - p[0].y) / H},${p[0].x},${p[0].y})`; }
});
async function imgShow(P){ const b = await iGet(P.id); if (!b || !P.geo){ toast('Файл подложки не найден'); return; } const u = URL.createObjectURL(b), l = new EdImg(u, P.geo).addTo(map); ED.img = {u, l};
document.body.classList.add('edimg'); document.body.style.setProperty('--edmo', (P.mo || 0) / 100); document.body.style.setProperty('--edio', (P.io ?? 100) / 100); }
function unshow(){ if (ED.img){ try { map.removeLayer(ED.img.l); } catch(e){} URL.revokeObjectURL(ED.img.u); ED.img = null; } document.body.classList.remove('edimg'); if (ED.lg) ED.lg.clearLayers(); }

// ---------- лист на карте
function sheetLL(P, crs = map.options.crs){ const c = L.latLng(P.c[0], P.c[1]), pc = crs.project(c), k = distM(c, crs.unproject(L.point(pc.x + 1000, pc.y))) / 1000 || 1, [iw, ih] = innerMM(P), hx = iw * P.scale / 2000 / k, hy = ih * P.scale / 2000 / k;
return [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([sx, sy]) => crs.unproject(L.point(pc.x + sx * hx, pc.y + sy * hy))); }
function drawSheet(){ if (!ED.lg) ED.lg = L.layerGroup().addTo(map); ED.lg.clearLayers(); const P = ED.cur; if (!P || !P.c) return; const s = sheetLL(P);
L.polygon([[[-85, -179.9], [85, -179.9], [85, 179.9], [-85, 179.9]], s], {stroke:false, fillColor:'#000', fillOpacity:.28, interactive:false}).addTo(ED.lg);
L.polygon(s, {color:'#ff3b30', weight:2, dashArray:'8 6', fill:false, interactive:false}).addTo(ED.lg);
L.marker(s[0], {interactive:false, keyboard:false, icon:L.divIcon({className:'edLblI', iconSize:[0, 0], html:`<div class="edLbl">${E(P.name)} · ${P.paper} · ${fmtS(P.scale)}</div>`})}).addTo(ED.lg); }
const fitSheet = P => { try { map.fitBounds(L.latLngBounds(sheetLL(P)), {padding:[30, 30]}); } catch(e){} };
function edPlace(){ const P = ED.cur; if (!P) return; closeModals(); const c0 = P.c.slice(); map.panTo(P.c);
const bar = document.createElement('div'); bar.id = 'edPl'; bar.innerHTML = '<span>Двигайте карту — лист в центре экрана</span><button class="ghost" id="edPlX">Отмена</button><button class="primary" id="edPlOk">Готово</button>'; document.body.appendChild(bar);
const mv = () => { const c = map.getCenter(); P.c = [+c.lat.toFixed(6), +c.lng.toFixed(6)]; drawSheet(); }; map.on('move', mv);
const end = ok => { map.off('move', mv); bar.remove(); if (!ok){ P.c = c0; drawSheet(); return; } ED.save(); toast('Положение листа сохранено'); if (P.base === 'map') mapThumb(P).then(t => { if (t && ED.cur === P){ P.thumb = t; ED.save(); } }); };
$('edPlX').onclick = () => end(false); $('edPlOk').onclick = () => end(true); }

// ---------- миниатюры
const thumbOf = bm => { const k = 160 / Math.max(bm.width, bm.height), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bm.width * k)); cv.height = Math.max(1, Math.round(bm.height * k)); cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', .7); };
async function mapThumb(P){ try { const key = LAYERS[P.lay] ? P.lay : state.layer, def = LAYERS[key], crs = crsOf(key), s = sheetLL(P, crs); let z = 17, b;
for (; z > 3; z--){ const p = s.map(q => crs.latLngToPoint(q, z)); b = {x0:Math.min(...p.map(q => q.x)), x1:Math.max(...p.map(q => q.x)), y0:Math.min(...p.map(q => q.y)), y1:Math.max(...p.map(q => q.y))}; if (b.x1 - b.x0 <= 320 && b.y1 - b.y0 <= 320) break; }
const W = b.x1 - b.x0, H = b.y1 - b.y0, k = 160 / Math.max(W, H), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(W * k)); cv.height = Math.max(1, Math.round(H * k)); const g = cv.getContext('2d'); g.fillStyle = '#d8dbd3'; g.fillRect(0, 0, cv.width, cv.height);
const jobs = []; for (let tx = Math.floor(b.x0 / 256); tx <= Math.floor(b.x1 / 256); tx++) for (let ty = Math.floor(b.y0 / 256); ty <= Math.floor(b.y1 / 256); ty++) jobs.push([tx, ty]); if (jobs.length > 16) return null;
await Promise.all(jobs.map(async ([tx, ty]) => { try { const bl = await tileFb(def.urls[0], z, tx, ty); if (!bl) return; const bm = await createImageBitmap(bl); g.drawImage(bm, (tx * 256 - b.x0) * k, (ty * 256 - b.y0) * k, 256 * k + .5, 256 * k + .5); bm.close(); } catch(e){} }));
return cv.toDataURL('image/jpeg', .7); } catch(e){ return null; } }

// ---------- вход, открытие, закрытие
const label = () => { const s = $('modeBtn') && $('modeBtn').querySelector('span'); if (s) s.textContent = ED.on ? 'Редакт.' : (SEC_SH[secMode] || 'Раздел'); };
function resetWork(){ if (session){ session = null; document.body.classList.remove('picking'); try { map.doubleClickZoom.enable(); } catch(e){} }
hist.stack = []; hist.i = -1; hist.mute = false; histSnap();
try { renderMarkers(); renderSheet(); if ($('layModal').classList.contains('open')) renderLayers(); updUndo(); } catch(e){ console.warn('ed', e); } }
async function edStart(boot){ if (!ED.on){ if (secMode !== 'op') setSection('op'); ED.on = 1; document.body.classList.add('edm'); $('edBtn').style.display = ''; lsSet('skat_edm', 1); label(); }
if (boot && !ED.cur){ const id = lsGet('skat_edcur', null); if (id && await dGet('p', id).catch(() => null)){ await edOpen(id); return; } }
edList(); }
async function edOpen(id){ const P = await pGet(id); if (!P){ toast('Проект не открылся (зашифрован или повреждён)'); return; }
if (ED.cur){ ED.save(); unshow(); ED.cur = null; }
if (!ED.main){ persistNow(); ED.layer0 = state.layer; ED.main = state.arrays; }
const arr = P.arrays || []; delete P.arrays; ED.cur = P; window.SKAT_ED = ED; state.arrays = arr.map(normArr); lsSet('skat_edcur', P.id);
if (P.base === 'map' && LAYERS[P.lay] && P.lay !== state.layer){ state.layer = P.lay; try { setLayer(P.lay); } catch(e){} }
resetWork(); if (P.base === 'img') await imgShow(P); drawSheet(); fitSheet(P); closeModals(); ED.save(); label(); toast(`Проект «${P.name}»`); }
function edClose(){ if (!ED.cur) return; ED.save(); unshow(); state.arrays = ED.main; ED.main = null; ED.cur = null; window.SKAT_ED = null;
if (ED.layer0 && LAYERS[ED.layer0] && ED.layer0 !== state.layer){ state.layer = ED.layer0; try { setLayer(ED.layer0); } catch(e){} }
resetWork(); persistNow(); label(); }
function edLeave(){ if (!ED.on) return; edClose(); ED.on = 0; document.body.classList.remove('edm'); $('edBtn').style.display = 'none'; lsSet('skat_edm', 0); label(); }

// ---------- окна
function modal(id, html){ let m = $(id); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = id; m.innerHTML = '<div class="card big"></div>'; document.body.appendChild(m);
m.addEventListener('click', e => { if (e.target === m || (e.target.closest && e.target.closest('[data-close]'))){ m.classList.remove('open'); onClose(id); } }); }
m.firstChild.innerHTML = html; return m; }
const onClose = id => setTimeout(() => { if (ED.cur || !ED.on || $('edCal')) return; if (id === 'edFM') edList(); else if (id === 'edLM' && !document.querySelector('.modal.open')){ edLeave(); toast('Редактор закрыт'); } }, 60);

async function edList(){ modal('edLM', `<h3>Редактор: проекты</h3><div id="edLst"><p class="status">Загрузка…</p></div>
<div class="row"><button class="ghost" data-close>Закрыть</button><button class="ghost" id="edImp">Открыть файл</button><button class="primary" id="edNew">＋ Новый</button></div>`);
$('edNew').onclick = () => edForm(null); $('edImp').onclick = edImport; closeModals(); openModal('edLM'); await listFill(); }
async function listFill(){ const box = $('edLst'); if (!box) return; let L1 = [];
try { L1 = await Promise.all((await dKeys('p')).map(async k => ({k, P:await pGet(k)}))); } catch(e){ box.innerHTML = '<p class="status">Хранилище недоступно</p>'; return; }
L1.sort((x, y) => ((y.P && y.P.t) || 0) - ((x.P && x.P.t) || 0));
if (!L1.length){ box.innerHTML = '<div class="empty">Проектов пока нет. Новый проект: подложка — участок карты или свой файл (скан карты, схема), формат листа и масштаб для печати, рамка с сеткой.</div>'; return; }
box.innerHTML = L1.map(({k, P}) => P ? `<div class="edIt${ED.cur && ED.cur.id === k ? ' cur' : ''}" data-o="${E(k)}">${P.thumb ? `<img src="${P.thumb}" alt="">` : '<span class="edTh"></span>'}<div><b>${E(P.name)}</b><small>${E(info(P))} · ${new Date(P.t || 0).toLocaleDateString('ru-RU')}</small></div><button class="ghost" data-m="${E(k)}">⋯</button></div>
<div class="edAct" data-k="${E(k)}" hidden><button class="ghost" data-a="ren">Переименовать</button><button class="ghost" data-a="dup">Копия</button><button class="ghost" data-a="exp">В файл</button><button class="danger" data-a="del">Удалить</button></div>`
: `<div class="edIt"><span class="edTh"></span><div><b>Зашифрованный проект</b><small>Откроется при включённом PIN</small></div></div>`).join('');
box.onclick = e => { const mb = e.target.closest('[data-m]'), ab = e.target.closest('[data-a]'), it = e.target.closest('[data-o]');
if (mb){ const a = box.querySelector(`.edAct[data-k="${mb.dataset.m}"]`); if (a) a.hidden = !a.hidden; return; }
if (ab) return act(ab.dataset.a, ab.parentNode.dataset.k); if (it) edOpen(it.dataset.o); }; }
async function act(a, id){ const P = await pGet(id); if (!P) return; const isCur = ED.cur && ED.cur.id === id;
if (a === 'ren'){ const n = prompt('Название проекта', P.name); if (n == null || !n.trim()) return; if (isCur){ ED.cur.name = n.trim(); ED.save(); drawSheet(); } else { P.name = n.trim(); await pPut(id, JSON.stringify(P)); } }
else if (a === 'dup'){ if (isCur){ ED.save(); await ED.q; } const Q = await pGet(id); Q.id = nid(); Q.name += ' (копия)'; Q.t = Q.t0 = Date.now(); await pPut(Q.id, JSON.stringify(Q)); const ir = await dGet('i', id); if (ir) await dPut('i', Q.id, ir); toast('Копия создана'); }
else if (a === 'exp'){ if (isCur){ ED.save(); await ED.q; } return edExport(id); }
else if (a === 'del') return askConfirm(`Удалить проект «${P.name}»? Это нельзя отменить.`, 'Удалить', async () => { if (isCur){ edClose(); await ED.q; } await dDel('p', id); await dDel('i', id); toast('Проект удалён'); edList(); });
listFill(); }

// ---------- новый проект / свойства
function edForm(P0){ const F = P0 ? JSON.parse(JSON.stringify(P0)) : {name:'', base:'map', lay:state.layer, paper:'A3', ori:'l', scale:25000, frame:true, st:1000, mo:0};
delete F.arrays; if (!P0) F.name = 'Проект ' + new Date().toLocaleDateString('ru-RU');
const lays = Object.keys(LAYERS).map(k => `<option value="${E(k)}"${k === F.lay ? ' selected' : ''}>${E(LAYERS[k].name || k)}</option>`).join('');
modal('edFM', `<h3>${P0 ? 'Свойства проекта' : 'Новый проект'}</h3><label class="f">Название<input id="efN" value="${E(F.name)}"></label>
<div class="flabel">Подложка</div><div class="seg" id="efB"><button data-v="map">Участок карты</button><button data-v="img">Свой файл</button></div>
<div id="efM"><label class="f">Карта<select id="efL">${lays}</select></label><div class="row"><button class="ghost" id="efPk">Выбрать участок рамкой</button></div></div>
<div id="efI"><div class="row"><button class="ghost" id="efF">Загрузить файл</button><button class="ghost" id="efC">Привязать по квадрату</button></div></div>
<p class="status" id="efBs"></p>
<div class="flabel">Лист для печати</div><div class="seg" id="efP">${Object.keys(PP).map(k => `<button data-v="${k}">${k}</button>`).join('')}</div>
<div class="seg" id="efO"><button data-v="p">Книжная</button><button data-v="l">Альбомная</button></div>
<label class="f">Масштаб<select id="efS">${SCL.map(v => `<option value="${v}">${fmtS(v)}</option>`).join('')}<option value="0">Свой…</option></select></label>
<label class="f" id="efSw">Свой масштаб, 1:<input id="efSv" inputmode="numeric"></label>
<label class="f chk"><input type="checkbox" id="efFr"> Рамка карты: сетка СК-42 с подписями</label>
<label class="f">Шаг сетки<select id="efSt">${[500, 1000, 2000, 4000, 5000].map(v => `<option value="${v}">${String(v / 1000).replace('.', ',')} км</option>`).join('')}</select></label>
<p class="status" id="efInf"></p>
<div class="row"><button class="ghost" data-close>Отмена</button><button class="primary" id="efOk">${P0 ? 'Сохранить' : 'Создать'}</button></div>`);
const noCal = () => F.base === 'img' && (!F.geo || F.geo.free);
const upd = () => { $('efM').style.display = F.base === 'map' ? '' : 'none'; $('efI').style.display = F.base === 'img' ? '' : 'none';
const cust = F._cs || !SCL.includes(F.scale); $('efS').value = cust ? '0' : String(F.scale); $('efSw').style.display = cust ? '' : 'none'; if (cust && document.activeElement !== $('efSv')) $('efSv').value = F.scale;
const fr = $('efFr'); fr.disabled = noCal(); fr.checked = !!F.frame && !noCal(); if (![...$('efSt').options].some(o => +o.value === F.st)) $('efSt').insertAdjacentHTML('beforeend', `<option value="${F.st}">${String(F.st / 1000).replace('.', ',')} км</option>`); $('efSt').value = String(F.st);
const g = F.geo; $('efBs').textContent = F.base === 'map' ? (F.c ? 'Участок выбран; положение листа можно поправить позже' : 'Лист встанет по центру экрана; положение можно поправить позже')
: g ? `Файл ${g.W}×${g.H} px · ${g.free ? 'не привязан: вписан в лист, рамка недоступна' : `привязан по квадрату ${g.sq}, расхождение ${g.rms < 1 ? 'менее 1' : Math.round(g.rms)} м`}` : 'Загрузите JPG или PNG (скан карты, схема), затем отметьте квадрат сетки и введите его номер';
const [iw, ih] = innerMM(Object.assign({}, F, {name:$('efN').value.trim(), frame:F.frame && !noCal()})); $('efInf').textContent = `На местности: ${km1(iw * F.scale / 1e6)} × ${km1(ih * F.scale / 1e6)} км`; };
const seg = (id, k) => { const el = $(id), set = () => el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(F[k])));
el.onclick = e => { const b = e.target.closest('button'); if (!b) return; F[k] = b.dataset.v; set(); upd(); }; set(); };
seg('efB', 'base'); seg('efP', 'paper'); seg('efO', 'ori');
$('efN').oninput = upd; $('efL').onchange = () => { F.lay = $('efL').value; };
$('efS').onchange = () => { const v = +$('efS').value; if (v){ F.scale = v; F._cs = 0; if (!F._stT) F.st = stOf(v); } else F._cs = 1; upd(); };
$('efSv').oninput = () => { const v = parseInt($('efSv').value.replace(/\D/g, ''), 10); if (v >= 500 && v <= 5e6){ F.scale = v; if (!F._stT) F.st = stOf(v); upd(); } };
$('efFr').onchange = () => { F.frame = $('efFr').checked; upd(); }; $('efSt').onchange = () => { F.st = +$('efSt').value; F._stT = 1; };
$('efPk').onclick = () => { let got = 0; F.name = $('efN').value.trim();
pickRect('Выделите участок карты для листа', b => { got = 1; const cy = (b.s + b.n) / 2, cx = (b.w + b.e) / 2, wm = distM(L.latLng(cy, b.w), L.latLng(cy, b.e)), hm = distM(L.latLng(b.s, cx), L.latLng(b.n, cx));
F.c = [+cy.toFixed(6), +cx.toFixed(6)]; F.ori = wm >= hm ? 'l' : 'p'; const [iw, ih] = innerMM(F), need = Math.max(wm / iw, hm / ih) * 1000;
F.scale = SCL.find(v => v >= need * .98) || Math.ceil(need / 1000) * 1000; F._cs = !SCL.includes(F.scale); if (!F._stT) F.st = stOf(F.scale);
openModal('edFM'); seg('efO', 'ori'); upd(); toast(`Подобран масштаб ${fmtS(F.scale)}`); });
const iv = setInterval(() => { if (!$('dlOv')){ clearInterval(iv); if (!got) openModal('edFM'); } }, 300); };
const calib = async () => { let blob = F._blob; if (!blob && P0) blob = await iGet(P0.id); if (!blob){ toast('Сначала загрузите файл'); return; }
edCal(blob, F.geo, F.st, g => { F.geo = g; F.frame = true; if (!F._stT) F.st = g.s; const c = gLL(g, g.W / 2, g.H / 2); F.c = [+c[0].toFixed(6), +c[1].toFixed(6)]; upd(); }); };
$('efC').onclick = calib;
$('efF').onclick = () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; try { netMsg('Открываю файл…'); const r = await prepImg(f); netMsg('');
F._blob = r.blob; F._th = r.th; if (!F.c){ const c = map.getCenter(); F.c = [+c.lat.toFixed(6), +c.lng.toFixed(6)]; } F.geo = freeGeo(Object.assign({}, F, {name:$('efN').value.trim()}), r.W, r.H); upd(); calib(); }
catch(e){ netMsg(''); toast('Не удалось открыть файл: ' + (e.message || e)); } }; inp.click(); };
$('efOk').onclick = async () => { F.name = $('efN').value.trim() || 'Без названия';
if (F.base === 'img' && !F.geo){ toast('Загрузите файл подложки'); return; } F.frame = !!F.frame && !noCal();
if (F.base === 'img' && !F._blob && !(P0 && P0.base === 'img')){ toast('Загрузите файл подложки'); return; }
if (!F.c){ const c = F.base === 'img' ? gLL(F.geo, F.geo.W / 2, F.geo.H / 2) : [map.getCenter().lat, map.getCenter().lng]; F.c = [+c[0].toFixed(6), +c[1].toFixed(6)]; }
if (F.base === 'map' && !LAYERS[F.lay]) F.lay = state.layer; const blob = F._blob, th = F._th; ['_blob', '_th', '_stT', '_cs'].forEach(k => delete F[k]); if (F.base !== 'img') delete F.geo;
try { netMsg('Сохраняю проект…');
if (!P0){ F.id = nid(); F.t0 = F.t = Date.now(); if (blob) await iPut(F.id, blob); F.thumb = F.base === 'img' ? th : await mapThumb(F); await pPut(F.id, JSON.stringify(Object.assign({}, F, {arrays:[]}))); lsSet('skat_edany', 1); netMsg(''); await edOpen(F.id); return; }
if (blob) await iPut(F.id, blob); if (F.base !== 'img') dDel('i', F.id).catch(() => {}); F.thumb = F.base === 'img' ? (th || F.thumb) : (await mapThumb(F) || F.thumb);
if (ED.cur && ED.cur.id === F.id){ const P = ED.cur; Object.keys(P).forEach(k => delete P[k]); Object.assign(P, F); unshow();
if (P.base === 'map' && LAYERS[P.lay] && P.lay !== state.layer){ state.layer = P.lay; try { setLayer(P.lay); } catch(e){} } ED.save(); if (P.base === 'img') await imgShow(P); drawSheet(); fitSheet(P); closeModals(); }
else { const Q = await pGet(F.id); await pPut(F.id, JSON.stringify(Object.assign(Q || {arrays:[]}, F))); closeModals(); edList(); }
netMsg(''); toast('Проект сохранён'); } catch(e){ netMsg(''); toast('Ошибка сохранения: ' + (e.message || e)); } };
upd(); closeModals(); openModal('edFM'); }
async function prepImg(f){ const bm = await createImageBitmap(f); let W = bm.width, H = bm.height, blob = f; const k = Math.min(1, Math.sqrt(16e6 / (W * H)), 8192 / Math.max(W, H));
if (k < 1 || !/^image\/(jpeg|png|webp)$/.test(f.type)){ W = Math.round(W * k); H = Math.round(H * k); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').drawImage(bm, 0, 0, W, H);
blob = await new Promise((r, j) => cv.toBlob(b => b ? r(b) : j(new Error('не удалось сжать')), 'image/jpeg', .9)); cv.width = cv.height = 0; }
const th = thumbOf(bm); bm.close(); return {blob, W, H, th}; }

// ---------- привязка по квадрату сетки: 4 угла (минимум 3) + номер квадрата, например 7224
async function edCal(blob, g0, st, done){ let bm; try { bm = await createImageBitmap(blob); } catch(e){ toast('Не удалось открыть снимок'); return; }
const W = bm.width, H = bm.height, ov = document.createElement('div'); ov.id = 'edCal';
ov.innerHTML = `<div class="ecTop"><div id="ecMsg"></div><div class="ecF"><label>Квадрат<input id="ecQ" inputmode="numeric" maxlength="4" placeholder="7224"></label><label>X угла, км<input id="ecX" inputmode="numeric"></label><label>Y угла, км<input id="ecY" inputmode="numeric"></label><label>Сторона, км<input id="ecS" inputmode="decimal"></label></div></div>
<canvas id="ecCv"></canvas><div class="ecBot"><button class="ghost" id="ecNo">Отмена</button><button class="ghost" id="ecUn">↶ Точка</button><button class="primary" id="ecOk">Готово</button></div>`;
document.body.appendChild(ov);
const cv = $('ecCv'), g = cv.getContext('2d'), V = {s:1, x:0, y:0}, cal = g0 && !g0.free, PT = cal && g0.pts ? g0.pts.map(p => p.slice()) : [], NM = ['левый нижний (ЮЗ)', 'правый нижний (ЮВ)', 'правый верхний (СВ)', 'левый верхний (СЗ)'];
if (cal){ $('ecQ').value = g0.sq || ''; $('ecX').value = g0.X; $('ecY').value = g0.Y; } $('ecS').value = String(((cal && g0.s) || st || 1000) / 1000).replace('.', ',');
let cw = 0, ch = 0, raf = 0;
const size = () => { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cw = r.width; ch = r.height; cv.width = Math.round(cw * d); cv.height = Math.round(ch * d); g.setTransform(d, 0, 0, d, 0, 0); };
const scr = p => [V.x + p[0] * V.s, V.y + p[1] * V.s], img = (x, y) => [+((x - V.x) / V.s).toFixed(1), +((y - V.y) / V.s).toFixed(1)];
const cross = (x, y) => { g.beginPath(); g.moveTo(x - 16, y); g.lineTo(x - 4, y); g.moveTo(x + 4, y); g.lineTo(x + 16, y); g.moveTo(x, y - 16); g.lineTo(x, y - 4); g.moveTo(x, y + 4); g.lineTo(x, y + 16); g.stroke(); g.beginPath(); g.arc(x, y, 10, 0, 7); g.stroke(); };
const draw = () => { raf = 0; g.clearRect(0, 0, cw, ch); g.imageSmoothingEnabled = V.s < 2; g.drawImage(bm, V.x, V.y, W * V.s, H * V.s); const S = PT.map(scr);
if (S.length > 1){ g.beginPath(); S.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); if (S.length === 4) g.closePath(); g.strokeStyle = '#ffd60a'; g.setLineDash([6, 4]); g.lineWidth = 1.5; g.stroke(); g.setLineDash([]); }
S.forEach(([x, y], i) => { g.strokeStyle = '#000'; g.lineWidth = 4; cross(x, y); g.strokeStyle = '#ff3b30'; g.lineWidth = 2; cross(x, y); g.fillStyle = '#ff3b30'; g.fillRect(x + 9, y - 25, 17, 17); g.fillStyle = '#fff'; g.font = '700 13px sans-serif'; g.fillText(String(i + 1), x + 13, y - 12); });
$('ecMsg').textContent = PT.length < 4 ? `Увеличьте снимок и коснитесь угла ${PT.length + 1} квадрата — ${NM[PT.length]}${PT.length >= 3 ? '. Или «Готово» по трём точкам' : ''}` : 'Четыре угла отмечены (точки можно перетащить). Введите номер квадрата и нажмите «Готово»'; };
const req = () => { if (!raf) raf = requestAnimationFrame(draw); };
const ptr = new Map(); let st0 = null, pin = null, drag = -1, off = [0, 0];
const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
const pinch = () => { const [a, b] = [...ptr.values()]; return {c:[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], d:Math.hypot(a[0] - b[0], a[1] - b[1]) || 1}; };
cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch(_){} const p = pos(e); ptr.set(e.pointerId, p);
if (ptr.size === 1){ drag = PT.findIndex(q => { const s = scr(q); return Math.hypot(s[0] - p[0], s[1] - p[1]) < 26; }); if (drag >= 0){ const s = scr(PT[drag]); off = [s[0] - p[0], s[1] - p[1]]; } st0 = {p, t:Date.now(), vx:V.x, vy:V.y, mv:0}; }
else if (ptr.size === 2){ drag = -1; st0 = null; pin = Object.assign(pinch(), {s:V.s, x:V.x, y:V.y}); } };
cv.onpointermove = e => { if (!ptr.has(e.pointerId)) return; const p = pos(e); ptr.set(e.pointerId, p);
if (ptr.size >= 2 && pin){ const q = pinch(), s = Math.max(.02, Math.min(40, pin.s * q.d / pin.d)), ix = (pin.c[0] - pin.x) / pin.s, iy = (pin.c[1] - pin.y) / pin.s; V.s = s; V.x = q.c[0] - ix * s; V.y = q.c[1] - iy * s; req(); return; }
if (!st0) return; st0.mv = Math.max(st0.mv, Math.hypot(p[0] - st0.p[0], p[1] - st0.p[1]));
if (drag >= 0){ if (st0.mv > 3){ PT[drag] = img(p[0] + off[0], p[1] + off[1]); req(); } } else { V.x = st0.vx + p[0] - st0.p[0]; V.y = st0.vy + p[1] - st0.p[1]; req(); } };
const up = e => { if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
if (ptr.size === 1){ const p = [...ptr.values()][0]; pin = null; drag = -1; st0 = {p, t:0, vx:V.x, vy:V.y, mv:99}; return; }
if (!ptr.size){ if (st0 && drag < 0 && st0.mv < 8 && Date.now() - st0.t < 600){ if (PT.length < 4){ PT.push(img(st0.p[0], st0.p[1])); req(); } else toast('Уже 4 точки: перетащите нужную или «↶ Точка»'); } st0 = null; drag = -1; pin = null; } };
cv.onpointerup = up; cv.onpointercancel = up;
cv.onwheel = e => { e.preventDefault(); const p = pos(e), s = Math.max(.02, Math.min(40, V.s * Math.exp(-e.deltaY * .0015))); V.x = p[0] - (p[0] - V.x) * s / V.s; V.y = p[1] - (p[1] - V.y) * s / V.s; V.s = s; req(); };
$('ecQ').oninput = () => { const q = $('ecQ').value.replace(/\D/g, ''); if (q.length !== 4) return; const c0 = map.getCenter(), s0 = GEO.toSK(c0.lat, c0.lng),
near = (v0, two) => { const b = Math.floor(v0 / 100) * 100 + two; return [b - 100, b, b + 100].reduce((m, v) => Math.abs(v - v0) < Math.abs(m - v0) ? v : m); };
$('ecX').value = near(s0.x / 1000, +q.slice(0, 2)); $('ecY').value = near(s0.y / 1000, +q.slice(2)); };
const rs = () => { size(); req(); }; addEventListener('resize', rs);
const end = r => { removeEventListener('resize', rs); ov.remove(); try { bm.close(); } catch(e){} if (r) done(r); };
$('ecNo').onclick = () => end(null); $('ecUn').onclick = () => { PT.pop(); req(); };
$('ecOk').onclick = () => { if (PT.length < 3){ toast('Отметьте минимум 3 угла квадрата'); return; }
const num = id => parseFloat($(id).value.replace(',', '.')), X = num('ecX'), Y = num('ecY'), s = num('ecS') * 1000;
if (!(X > 0 && Y > 1000 && s > 0)){ toast('Введите номер квадрата (например, 7224) и проверьте X и Y угла'); return; }
const X0 = X * 1000, Y0 = Y * 1000, T = [[X0, Y0], [X0, Y0 + s], [X0 + s, Y0 + s], [X0 + s, Y0]].slice(0, PT.length), f = fitAff(PT, T);
if (!f){ toast('Точки на одной линии — отметьте углы квадрата'); return; }
if (f.rms > s * .08 && !confirm(`Большое расхождение: ${Math.round(f.rms)} м. Порядок углов: 1 — левый нижний, далее против часовой стрелки. Принять всё равно?`)) return;
const q = $('ecQ').value.replace(/\D/g, ''); end({W, H, z:Math.floor(Y * 1000 / 1e6), a:f.a, b:f.b, rms:f.rms, pts:PT.map(p => p.slice()), sq:q.length === 4 ? q : String(Math.floor(X) % 100).padStart(2, '0') + String(Math.floor(Y) % 100).padStart(2, '0'), X, Y, s}); };
size(); V.s = Math.min(cw / W, ch / H) * .95; V.x = (cw - W * V.s) / 2; V.y = (ch - H * V.s) / 2; req(); }

// ---------- панель проекта, печать, файлы
function edPanel(){ const P = ED.cur; if (!P){ if (ED.on) edList(); else window.edStart(); return; }
modal('edPM', `<h3>${E(P.name)}</h3><p class="status">${E(info(P))}${P.base === 'img' && P.geo ? (P.geo.free ? ' · снимок не привязан' : ` · квадрат ${E(P.geo.sq)}`) : ''}</p>
<div class="edG"><button class="ghost" id="epS">Свойства листа</button><button class="ghost" id="epL">Положение листа</button><button class="ghost" id="epF">Показать лист</button><button class="primary" id="epP">Печать листа</button><button class="ghost" id="epE">Сохранить в файл</button><button class="ghost" id="epO">Проекты</button></div>
${P.base === 'img' ? `<label class="f">Карта под снимком: <b id="epMv">${P.mo || 0}%</b><input type="range" id="epM" min="0" max="100" step="5" value="${P.mo || 0}"></label><label class="f">Непрозрачность снимка<input type="range" id="epI" min="20" max="100" step="5" value="${P.io ?? 100}"></label>` : ''}
<div class="row"><button class="ghost" data-close>Закрыть</button><button class="danger" id="epX">Выйти из редактора</button></div>`);
$('epS').onclick = () => edForm(P); $('epL').onclick = edPlace; $('epF').onclick = () => { closeModals(); fitSheet(P); }; $('epP').onclick = edPrint; $('epO').onclick = edList;
$('epE').onclick = async () => { ED.save(); await ED.q; edExport(P.id); }; $('epX').onclick = () => { closeModals(); edLeave(); toast('Редактор закрыт'); };
if ($('epM')){ $('epM').oninput = () => { P.mo = +$('epM').value; $('epMv').textContent = P.mo + '%'; document.body.style.setProperty('--edmo', P.mo / 100); }; $('epM').onchange = ED.save;
$('epI').oninput = () => { P.io = +$('epI').value; document.body.style.setProperty('--edio', P.io / 100); }; $('epI').onchange = ED.save; }
closeModals(); openModal('edPM'); }
async function edPrint(){ const P = ED.cur; if (!P) return; try { await modLoad('op'); } catch(e){ return; }
prnPaper = P.paper; prnOri = P.ori; renderPrnUI();
const sel = $('prnScale'); if (sel){ if (![...sel.options].some(o => +o.value === P.scale)) sel.insertAdjacentHTML('beforeend', `<option value="${P.scale}">${fmtS(P.scale)}</option>`); sel.value = String(P.scale); }
if ($('prnGrid')) $('prnGrid').checked = !!P.frame; if ($('prnTitle')) $('prnTitle').value = P.name;
const pb = $('prnBase'); if (P.base === 'map' && pb && [...pb.options].some(o => o.value === P.lay)) pb.value = P.lay;
try { prnInfo(); } catch(e){} openModal('prnModal'); }
async function prnImg(g, toC){ const P = ED.cur, G = P && P.geo; if (!G) return; const b = await iGet(P.id); if (!b) return; const bm = await createImageBitmap(b), p = [[0, 0], [G.W, 0], [0, G.H]].map(([u, v]) => toC(gLL(G, u, v)));
g.save(); g.globalAlpha = (P.io ?? 100) / 100; g.imageSmoothingQuality = 'high'; g.transform((p[1][0] - p[0][0]) / G.W, (p[1][1] - p[0][1]) / G.W, (p[2][0] - p[0][0]) / G.H, (p[2][1] - p[0][1]) / G.H, p[0][0], p[0][1]); g.drawImage(bm, 0, 0); g.restore(); bm.close(); }
async function edExport(id){ const P = await pGet(id); if (!P) return; const b = await iGet(id); let img = null;
if (b) img = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = () => r(null); fr.readAsDataURL(b); });
deliverFile(new Blob([JSON.stringify({app:'skat-ed', v:1, p:P, img})], {type:'application/json'}), `СКАТ-проект ${(P.name || 'проект').replace(/[\\/:*?"<>|]+/g, '_')}.json`, 'Файл проекта сохранён'); }
function edImport(){ const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (!d || d.app !== 'skat-ed' || !d.p) throw new Error('это не файл проекта СКАТ');
const P = d.p; P.id = nid(); P.t = Date.now(); P.arrays = P.arrays || []; if (d.img) await iPut(P.id, await (await fetch(d.img)).blob()); await pPut(P.id, JSON.stringify(P)); lsSet('skat_edany', 1); toast(`Проект «${P.name}» добавлен`); listFill(); }
catch(e){ toast('Не удалось открыть: ' + (e.message || e)); } }; inp.click(); }
async function edCrypt(on){ for (const k of await dKeys('p')){ const r = await dGet('p', k); if (!r || !!r.e === on) continue; const P = await pOf(r); if (P) await pPut(k, JSON.stringify(P), on); }
for (const k of await dKeys('i')){ const r = await dGet('i', k); if (!r || !!r.e === on) continue; const b = await iOf(r); if (b) await iPut(k, b, on); } }

Object.assign(window, {edStart, edLeave, edPanel, edCrypt, edPrnArea:() => ED.cur ? {c:ED.cur.c, scale:ED.cur.scale, st:ED.cur.st, img:ED.cur.base === 'img', draw:ED.cur.base === 'img' ? prnImg : null} : null});
window.__mod_ed = 1;
})();
