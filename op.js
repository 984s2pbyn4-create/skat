// СКАТ — модуль «Оператор»: редактор надписей, печать JPEG, свойства знака. Грузится лениво из index.html (modLoad). Версия 6.4
// ======== ОПЕРАТОР: НАДПИСИ ========
function openTextEd(a, ti, ll){
const t = ti != null ? a.texts[ti] : {t:'', f:'Roboto Condensed', s:18, c:'#111111', sc:'#ffffff', sw:2, b:true, i:false, bg:'', r:0, lat:ll.lat, lng:ll.lng};
txtRef = {a, ti, t:Object.assign({}, t)};
$('txtTitle').textContent = ti != null ? 'Надпись' : 'Новая надпись';
$('tTxt').value = t.t; $('tFont').value = t.f; $('tSize').value = t.s; $('tSC').value = t.sc || ''; $('tSW').value = t.sw || 0; $('tB').checked = !!t.b; $('tI').checked = !!t.i; $('tBg').value = t.bg || ''; $('tRot').value = t.r || 0;
$('tAl').value = t.al || 'center'; $('tLh').value = t.lh || 1.15; $('tLsp').value = t.lsp || 0; $('tU').checked = !!t.u; $('tShd').checked = !!t.shd; $('tFr').value = t.fr || 0;
$('tDel').style.display = ti != null ? '' : 'none';
renderFillPick($('tCol'), t.c, c => { txtRef.t.c = c || '#111111'; txtPrev(); });
txtPrev(); openModal('txtModal'); setTimeout(() => $('tTxt').focus(), 60);
}
function txtRead(){ const t = txtRef.t; t.al = $('tAl').value; t.lh = +$('tLh').value; t.lsp = +$('tLsp').value; t.u = $('tU').checked; t.shd = $('tShd').checked; t.fr = +$('tFr').value; t.t = $('tTxt').value; t.f = $('tFont').value; t.s = +$('tSize').value; t.sc = $('tSC').value; t.sw = +$('tSW').value; t.b = $('tB').checked; t.i = $('tI').checked; t.bg = $('tBg').value; t.r = +$('tRot').value; }
function txtPrev(){ txtRead(); const t = txtRef.t; $('tSizeV').textContent = t.s; $('tSWV').textContent = t.sw; $('tRotV').textContent = t.r + '°';
$('tPrev').innerHTML = `<div style="position:relative;height:100%">${txtHtml(Object.assign({}, t, {t:t.t || 'Пример надписи'})).replace('class="txl" style="', 'class="txl" style="left:50%;top:50%;')}</div>`; }
['tTxt', 'tFont', 'tSize', 'tSC', 'tSW', 'tB', 'tI', 'tBg', 'tRot', 'tAl', 'tLh', 'tLsp', 'tU', 'tShd', 'tFr'].forEach(id => { $(id).addEventListener('input', txtPrev); $(id).addEventListener('change', txtPrev); });
$('tSave').onclick = () => { txtRead(); const {a, ti, t} = txtRef; if (!t.t.trim()){ $('tTxt').focus(); return; } if (ti != null) a.texts[ti] = t; else a.texts.push(t); textPending = null; persist(); closeModals(); renderMarkers(); };
$('tDel').onclick = () => { const {a, ti} = txtRef; a.texts.splice(ti, 1); persist(); closeModals(); renderMarkers(); toast('Надпись удалена (↶ — вернуть)'); };
$('tFont').innerHTML = FONTS.map(([v, n]) => `<option value="${v}" style="font-family:'${v}'">${n}</option>`).join('');
$('tBg').innerHTML = TXT_BG.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
// ======== ОПЕРАТОР: ПЕЧАТЬ В JPEG ========
const PAPERS = {A5:[148, 210], A4:[210, 297], A3:[297, 420], A2:[420, 594], A1:[594, 841], A0:[841, 1189]};
let prnPaper = 'A4', prnOri = 'l';
function prnSize(){ let w, h; if (prnPaper === 'U'){ w = +$('prnW').value || 297; h = +$('prnH').value || 210; } else { [w, h] = PAPERS[prnPaper]; if (prnOri === 'l') [w, h] = [h, w]; } return [w, h]; }
function prnInfo(){ const [w, h] = prnSize(), dpi = +$('prnDpi').value; let W = Math.round(w / 25.4 * dpi), H = Math.round(h / 25.4 * dpi), note = '';
if (W * H > 16e6){ const f = Math.sqrt(16e6 / (W * H)); W = Math.floor(W * f); H = Math.floor(H * f); note = ' (разрешение снижено под возможности устройства)'; }
const jq = +$('prnJq').value, bpp = jq >= 100 ? .9 : jq >= 95 ? .45 : jq >= 90 ? .3 : jq >= 80 ? .2 : jq >= 70 ? .15 : .11; $('prnJqV').textContent = jq; $('prnInfo').textContent = `Лист ${w}×${h} мм, изображение ${W}×${H} пикс., файл ≈ ${(W * H * bpp / 1048576).toFixed(1)} МБ${note}. Печатается видимая на экране область.`; return [w, h, W, H]; }
function renderPrnUI(){ prnSettingsUI(); $('prnPaperSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.p === prnPaper)); $('prnOriSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.o === prnOri));
$('prnCustom').style.display = prnPaper === 'U' ? '' : 'none'; $('prnOriSeg').style.display = prnPaper === 'U' ? 'none' : ''; prnInfo(); }
$('prnPaperSeg').querySelectorAll('button').forEach(b => b.onclick = () => { prnPaper = b.dataset.p; renderPrnUI(); });
$('prnOriSeg').querySelectorAll('button').forEach(b => b.onclick = () => { prnOri = b.dataset.o; renderPrnUI(); });
['prnW', 'prnH', 'prnDpi', 'prnQ', 'prnJq'].forEach(id => $(id).addEventListener('input', prnInfo)); $('prnQ').addEventListener('change', prnInfo);
$('prnBtn').onclick = () => { renderPrnUI(); openModal('prnModal'); };
async function tileBmp(u){ try { let b = savedKeys.has(u) ? await tileGetFast(u) : null; if (!b && navigator.onLine !== false) b = await netBlob(u); return b ? await createImageBitmap(b) : null; } catch(e){ return null; } }
async function prnRender(prev){
let [wmm, hmm, W, H] = prnInfo(); if (prev){ const f0 = Math.min(1, 1200 / Math.max(W, H)); W = Math.round(W * f0); H = Math.round(H * f0); }
const prK = {s:+$('prnSym').value || 1, l:+$('prnLbl').value || 1, lbl:$('prnShowL').checked, txt:$('prnShowT').checked, shp:$('prnShowS').checked}, pOn = prnLaysOn();
const k = W / (wmm / 25.4 * +$('prnDpi').value), dpi = +$('prnDpi').value * k, mm = v => v / 25.4 * dpi;
const title = $('prnTitle').value.trim(), legend = $('prnLeg').checked, grid = $('prnGrid').checked;
netMsg(prev ? 'Готовлю предпросмотр…' : 'Готовлю лист для печати…');
try {
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
const mg = mm(8), th = title ? mm(11) : 0, fh = mm(7), ox0 = mg, oy0 = mg + th, ow = W - 2 * mg, oh = H - 2 * mg - th - fh, fb = grid ? mm(9) : 0, ix0 = ox0 + fb, iy0 = oy0 + fb, iw = ow - 2 * fb, ih = oh - 2 * fb;
let FRAME = null;
const Ws = map.getSize().x, Hs = map.getSize().y, c = map.getCenter(), a0 = map.containerPointToLatLng([Ws / 2 - 50, Hs / 2]), a1 = map.containerPointToLatLng([Ws / 2 + 50, Hs / 2]), mpp = distM(a0, a1) / 100;
let wm = Ws * mpp, hm = Hs * mpp; if (iw / ih > wm / hm) hm = wm * ih / iw; else wm = hm * iw / ih;
const bk = LAYERS[$('prnBase').value] ? $('prnBase').value : state.layer, def = LAYERS[bk], crs = crsOf(bk), z0 = map.getZoom();
const pq = +$('prnQ').value; let zt = Math.min(def.max, pq + Math.max(Math.floor(z0), Math.round(z0 + Math.log2((wm / iw) > 0 ? mpp / (wm / iw) : 1))));
const pc = crs.latLngToPoint(c, zt); let mz = mpp * Math.pow(2, z0 - zt);
while (((wm / mz) / 256) * ((hm / mz) / 256) > (prev ? 300 : [800, 1800, 3500][pq]) && zt > 3){ zt--; mz *= 2; }
const pc2 = crs.latLngToPoint(c, zt), hw = wm / mz / 2, hh = hm / mz / 2, bx0 = pc2.x - hw, by0 = pc2.y - hh, f = iw / (2 * hw);
const toC = ll => { const p = crs.latLngToPoint(L.latLng(ll), zt); return [ix0 + (p.x - bx0) * f, iy0 + (p.y - by0) * f]; };
g.save(); g.beginPath(); g.rect(ix0, iy0, iw, ih); g.clip(); g.fillStyle = '#e9ece6'; g.fillRect(ix0, iy0, iw, ih);
let miss = 0; const tx0 = Math.floor(bx0 / 256), tx1 = Math.floor((bx0 + 2 * hw) / 256), ty0 = Math.floor(by0 / 256), ty1 = Math.floor((by0 + 2 * hh) / 256), jobs = [];
for (const tpl of def.urls) for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push([tpl, tx, ty]);
for (let q = 0; q < jobs.length; q += 8){ netMsg(`Готовлю лист: подложка ${Math.min(q + 8, jobs.length)} из ${jobs.length}…`);
const part = await Promise.all(jobs.slice(q, q + 8).map(async ([tpl, tx, ty]) => [tx, ty, await (async () => { try { const b = await tileFb(tpl, zt, tx, ty); return b ? await createImageBitmap(b) : null; } catch(e){ return null; } })()]));
part.forEach(([tx, ty, bm]) => { if (bm){ g.drawImage(bm, ix0 + (tx * 256 - bx0) * f, iy0 + (ty * 256 - by0) * f, 256 * f + 1, 256 * f + 1); try { bm.close(); } catch(e){} } else miss++; }); }
const sc = dpi / 110;
if (grid){
const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => crs.pointToLatLng(L.point(bx0 + u * 2 * hw, by0 + v * 2 * hh), zt)), zone = GEO.toSK(c.lat, c.lng).zone;
const S1 = corners.map(q => GEO.toSK(q.lat, q.lng, zone)), X0 = Math.min(...S1.map(q => q.x)), X1 = Math.max(...S1.map(q => q.x)), Y0 = Math.min(...S1.map(q => q.y)), Y1 = Math.max(...S1.map(q => q.y)), st = (X1 - X0) > 20000 ? 5000 : (X1 - X0) > 9000 ? 2000 : 1000;
g.strokeStyle = 'rgba(20,20,20,.8)'; g.lineWidth = Math.max(1, sc * .8);
const xs = [], ys = [];
for (let y = Math.ceil(Y0 / st) * st; y <= Y1; y += st){ const a1 = toC(GEO.fromSK(X0, y, zone)), b1 = toC(GEO.fromSK(X1, y, zone)); g.beginPath(); g.moveTo(...a1); g.lineTo(...b1); g.stroke(); ys.push([y, a1, b1]); }
for (let x = Math.ceil(X0 / st) * st; x <= X1; x += st){ const a1 = toC(GEO.fromSK(x, Y0, zone)), b1 = toC(GEO.fromSK(x, Y1, zone)); g.beginPath(); g.moveTo(...a1); g.lineTo(...b1); g.stroke(); xs.push([x, a1, b1]); }
FRAME = {xs, ys, corners};
}
const used = new Map();
state.arrays.forEach(a => { if (!pOn.has(String(a.id))) return;
(prK.shp ? (a.shapes || []) : []).forEach(sh => { const col = sh.color || a.style.color, pts = sh.type === 'circle' ? circlePoly(LL(sh.pts[0]), sh.r).map(q => [q[1], q[0]]) : sh.pts.map(q => [q[0] ?? q.lat, q[1] ?? q.lng]);
g.beginPath(); pts.forEach((q, i) => { const [px, py] = toC(q); i ? g.lineTo(px, py) : g.moveTo(px, py); }); if (sh.type !== 'line') g.closePath();
if (sh.type !== 'line'){ const fc = sh.fill || col; if (sh.hatch && SH_HATCH[sh.hatch]){ const n = Math.max(6, Math.round(10 * sc)), cv = document.createElement('canvas'); cv.width = cv.height = n; const q = cv.getContext('2d'); q.scale(n / 10, n / 10); q.strokeStyle = fc; q.fillStyle = fc; q.lineWidth = 1.6; const pa = new Path2D(SH_HATCH[sh.hatch]); sh.hatch === '.' ? q.fill(pa) : q.stroke(pa); g.globalAlpha = 1; g.fillStyle = g.createPattern(cv, 'repeat'); } else { g.globalAlpha = (sh.op ?? 35) / 100; g.fillStyle = fc; } g.fill(); g.globalAlpha = 1; }
const w = (sh.sw || 2.5) * sc, D = SH_DASH[sh.dash]; g.setLineDash(D ? D.map(v => v * w) : []); g.lineCap = D && sh.dash !== 'dash' && sh.dash !== 'long' ? 'round' : 'butt'; g.globalAlpha = sh.so != null ? sh.so / 100 : .95; g.strokeStyle = col; g.lineWidth = w; g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
if (sh.type === 'line' && sh.arr && pts.length > 1){ const C = pts.map(toC), sw0 = sh.sw || 2.5, hd = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d, L0 = (6 + 3.2 * sw0) * sc, W0 = (3 + 1.6 * sw0) * sc, bx = b[0] - ux * L0, by = b[1] - uy * L0; g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(bx - uy * W0, by + ux * W0); g.lineTo(bx + uy * W0, by - ux * W0); g.closePath(); g.fillStyle = col; g.fill(); };
if (sh.arr !== 'start') hd(C[C.length - 2], C[C.length - 1]); if (sh.arr !== 'end') hd(C[1], C[0]); } g.globalAlpha = 1; });
if (a.kind === 'route' && a.points.length > 1){ g.beginPath(); a.points.forEach((p, i) => { const [px, py] = toC([p.lat, p.lng]); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.strokeStyle = a.style.color; g.lineWidth = 3 * sc; g.stroke(); }
a.points.forEach((p, i) => { const [px, py] = toC([p.lat, p.lng]); if (px < ix0 || py < iy0 || px > ix0 + iw || py > iy0 + ih) return;
const st = styleOf(a, p), sid = p.sym === '_none' ? null : (p.sym || a.sym), lb = labelOf(a, i);
if (a.kind === 'aux'){ g.save(); g.translate(px, py); g.scale(sc * prK.s, sc * prK.s); g.beginPath(); TREE_PTS.forEach(([dx, dy], k2) => k2 ? g.lineTo(dx, dy) : g.moveTo(dx, dy)); g.closePath(); g.fillStyle = a.style.color; g.fill(); g.restore(); }
else if (a.fplan){ g.beginPath(); g.arc(px, py, 19 * sc * prK.s, 0, 7); g.fillStyle = st.color; g.fill(); g.lineWidth = 2 * sc; g.strokeStyle = '#111'; g.stroke(); if (sid && SYM_BY[sid]){ g.save(); g.translate(px, py); g.scale(sc * .8 * prK.s, sc * .8 * prK.s); drawSym(g, sid, 0, 0, '#111', null); g.restore(); } }
else if (sid && SYM_BY[sid]){ const col = symCol(sid, sideOf(a, p), st.color); g.save(); g.translate(px, py); g.scale(sc * prK.s, sc * prK.s); if (p.rot) g.rotate(p.rot * Math.PI / 180); drawSym(g, sid, 0, 0, col, p.fc || a.fc); g.restore(); used.set(sid + '|' + col, [sid, col]); }
else { g.beginPath(); g.arc(px, py, 6 * sc * prK.s, 0, 7); g.fillStyle = st.color; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2 * sc; g.stroke(); }
if (prK.lbl){ g.font = `${a.kind === 'aux' ? 'italic ' : ''}700 ${Math.round(12 * sc * prK.l)}px sans-serif`; g.lineWidth = 3 * sc; g.strokeStyle = '#fff'; g.fillStyle = '#111'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; const lw2 = g.measureText(lb).width; let lx = px + 14 * sc * prK.s, ly = py - 10 * sc * prK.s; if (lx + lw2 > ix0 + iw - 2 * sc) lx = Math.max(ix0 + 2 * sc, px - 14 * sc - lw2); if (ly - 12 * sc < iy0) ly = py + 22 * sc; if (ly > iy0 + ih - 2 * sc) ly = iy0 + ih - 2 * sc; g.strokeText(lb, lx, ly); g.fillText(lb, lx, ly); } });
(a.tables || []).forEach(T => { if (T.hid) return; const [px, py] = toC([T.lat, T.lng]), rows = T.rows.slice(0, 40), nc = Math.min(10, Math.max(...rows.map(r => r.length))), fs = T.s * sc, ch = fs * 1.6;
g.font = `500 ${fs}px '${T.f}', sans-serif`; const cw = Array.from({length:nc}, (_, c) => Math.max(...rows.map(r => g.measureText(String(r[c] ?? '')).width)) + fs);
const tw = cw.reduce((x, y) => x + y, 0), th2 = ch * rows.length, x0 = px - tw / 2, y0 = py - th2 / 2;
if (T.bg){ g.globalAlpha = T.op ?? 1; g.fillStyle = T.bg; g.fillRect(x0, y0, tw, th2); g.globalAlpha = 1; }
rows.forEach((r, ri) => { let xx = x0; for (let c = 0; c < nc; c++){ g.font = `${ri === 0 && T.hdr ? 700 : 500} ${fs}px '${T.f}', sans-serif`; g.fillStyle = T.c; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(String(r[c] ?? ''), xx + fs / 2, y0 + ri * ch + ch / 2); if (T.bd){ g.strokeStyle = T.bd; g.lineWidth = (T.bw || 1) * sc; g.strokeRect(xx, y0 + ri * ch, cw[c], ch); } xx += cw[c]; } }); });
(a.texts || []).forEach(t => { if (t.hid || !prK.txt) return; const [px, py] = toC([t.lat, t.lng]); g.save(); g.translate(px, py); g.rotate((t.r || 0) * Math.PI / 180); g.font = `${t.i ? 'italic ' : ''}${t.b ? 700 : 500} ${Math.round(t.s * sc)}px '${t.f}', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
const lines = String(t.t).split('\n'), lh = t.s * sc * 1.15, w = Math.max(...lines.map(l => g.measureText(l).width));
if (t.bg){ g.fillStyle = t.bg; g.fillRect(-w / 2 - 6 * sc, -lh * lines.length / 2 - 2 * sc, w + 12 * sc, lh * lines.length + 4 * sc); }
lines.forEach((l, k2) => { const yy = (k2 - (lines.length - 1) / 2) * lh; if (t.sw && t.sc){ g.lineJoin = 'round'; g.lineWidth = t.sw * 2 * sc; g.strokeStyle = t.sc; g.strokeText(l, 0, yy); } g.fillStyle = t.c; g.fillText(l, 0, yy); }); g.restore(); });
});
if (legend && used.size){ const items = [...used.values()].slice(0, 18), rh = 26 * sc, bw = 230 * sc, bh = rh * items.length + 30 * sc, bx = ix0 + iw - bw - 8 * sc, by = iy0 + ih - bh - 8 * sc;
g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(bx, by, bw, bh); g.strokeStyle = '#111'; g.lineWidth = 1.5 * sc; g.strokeRect(bx, by, bw, bh);
g.fillStyle = '#111'; g.font = `700 ${Math.round(12 * sc)}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Условные обозначения', bx + 8 * sc, by + 14 * sc);
items.forEach(([sid, col], k2) => { const yy = by + 30 * sc + k2 * rh + rh / 2; g.save(); g.translate(bx + 22 * sc, yy); g.scale(sc * .7, sc * .7); drawSym(g, sid, 0, 0, col, null); g.restore(); g.fillStyle = '#111'; g.font = `500 ${Math.round(11 * sc)}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(SYM_BY[sid].n, bx + 42 * sc, yy); }); }
g.restore();
// ---- рамка листа по образцу топографической карты
g.strokeStyle = '#111'; g.lineWidth = Math.max(1.2, .9 * sc); g.strokeRect(ix0, iy0, iw, ih);
const mb = mm(1.4), fo = mm(.9);
g.strokeRect(ix0 - mb, iy0 - mb, iw + 2 * mb, ih + 2 * mb);
g.lineWidth = Math.max(2.5, 2.2 * sc); g.strokeRect(ox0, oy0, ow, oh);
if (FRAME){
const tl = crs.pointToLatLng(L.point(bx0, by0), zt), br = crs.pointToLatLng(L.point(bx0 + 2 * hw, by0 + 2 * hh), zt);
const dms = (v, lat) => { const d = Math.floor(Math.abs(v)), m = Math.round((Math.abs(v) - d) * 60); return `${d}°${String(m === 60 ? 0 : m).padStart(2, '0')}′`; };
g.fillStyle = '#111';
for (let m = Math.floor(br.lat * 60); m < tl.lat * 60; m++){ const y1 = toC([m / 60, tl.lng])[1], y2 = toC([(m + 1) / 60, tl.lng])[1], ya = Math.max(iy0, Math.min(y1, y2)), yb = Math.min(iy0 + ih, Math.max(y1, y2));
if (yb > ya && (m % 2 === 0)){ g.fillRect(ix0 - mb, ya, mb, yb - ya); g.fillRect(ix0 + iw, ya, mb, yb - ya); } }
for (let m = Math.floor(tl.lng * 60); m < br.lng * 60; m++){ const x1 = toC([tl.lat, m / 60])[0], x2 = toC([tl.lat, (m + 1) / 60])[0], xa = Math.max(ix0, Math.min(x1, x2)), xb = Math.min(ix0 + iw, Math.max(x1, x2));
if (xb > xa && (m % 2 === 0)){ g.fillRect(xa, iy0 - mb, xb - xa, mb); g.fillRect(xa, iy0 + ih, xb - xa, mb); } }
const big = Math.round(mm(3.2)), small = Math.round(mm(2.2)), gap = mm(1.2);
const lab = (hi, lo, x, y, align, base) => { g.textBaseline = base; g.font = `700 ${big}px sans-serif`; const wB = g.measureText(lo).width; g.font = `500 ${small}px sans-serif`; const wS = hi ? g.measureText(hi).width : 0, tot = wB + wS;
let x0 = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x; g.textAlign = 'left';
if (hi){ g.font = `500 ${small}px sans-serif`; g.fillText(hi, x0, y); } g.font = `700 ${big}px sans-serif`; g.fillText(lo, x0 + wS, y); };
const kmS = v => { const k = Math.round(v / 1000), s0 = String(k); return [s0.slice(0, -2), s0.slice(-2)]; };
const ys = FRAME.ys.filter(([, a1, b1]) => true), xs = FRAME.xs;
const crossX = (p, q, Y) => p[0] + (q[0] - p[0]) * ((Y - p[1]) / ((q[1] - p[1]) || 1e-9));
const crossY = (p, q, X) => p[1] + (q[1] - p[1]) * ((X - p[0]) / ((q[0] - p[0]) || 1e-9));
const vy = ys.map(([y, a1, b1]) => [y, crossX(a1, b1, iy0), crossX(a1, b1, iy0 + ih)]).filter(([, t, b]) => t > ix0 + 1 && t < ix0 + iw - 1);
vy.forEach(([y, t, b], k) => { const [hi, lo] = kmS(y), full = k === 0 || k === vy.length - 1;
g.beginPath(); g.moveTo(t, iy0 - mb); g.lineTo(t, iy0 - mb - gap); g.moveTo(b, iy0 + ih + mb); g.lineTo(b, iy0 + ih + mb + gap); g.lineWidth = Math.max(1, .8 * sc); g.stroke();
lab(full ? hi : '', lo, t, iy0 - mb - gap * 1.3, 'center', 'bottom'); lab(full ? hi : '', lo, b, iy0 + ih + mb + gap * 1.3, 'center', 'top'); });
const hx = xs.map(([x, a1, b1]) => [x, crossY(a1, b1, ix0), crossY(a1, b1, ix0 + iw)]).filter(([, l, r]) => l > iy0 + 1 && l < iy0 + ih - 1);
hx.forEach(([x, l, r], k) => { const [hi, lo] = kmS(x), full = k === 0 || k === hx.length - 1;
g.beginPath(); g.moveTo(ix0 - mb, l); g.lineTo(ix0 - mb - gap, l); g.moveTo(ix0 + iw + mb, r); g.lineTo(ix0 + iw + mb + gap, r); g.lineWidth = Math.max(1, .8 * sc); g.stroke();
lab(full ? hi : '', lo, ix0 - mb - gap * 1.4, l, 'right', 'middle'); lab(full ? hi : '', lo, ix0 + iw + mb + gap * 1.4, r, 'left', 'middle'); });
g.font = `500 ${small}px sans-serif`; g.fillStyle = '#111';
const cl = [[ix0 - mb, iy0 - mb, tl.lat, tl.lng, 'right', 'bottom'], [ix0 + iw + mb, iy0 - mb, tl.lat, br.lng, 'left', 'bottom'], [ix0 - mb, iy0 + ih + mb, br.lat, tl.lng, 'right', 'top'], [ix0 + iw + mb, iy0 + ih + mb, br.lat, br.lng, 'left', 'top']];
cl.forEach(([x, y, la, lo, al, bs]) => { g.textAlign = al; g.textBaseline = bs; const dx = al === 'right' ? -gap : gap; g.fillText(dms(la, true), x + dx, y + (bs === 'bottom' ? -gap * 4.5 : gap * 4.5)); g.fillText(dms(lo, false), x + dx, y + (bs === 'bottom' ? -gap * .3 : gap * .3)); });
}

g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
if (title){ g.font = `700 ${Math.round(mm(6))}px sans-serif`; g.fillText(title, W / 2, mg + th / 2); }
const scale = Math.round(wm / (iw / dpi * 0.0254) / 100) * 100;
g.font = `500 ${Math.round(mm(3.2))}px sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`Масштаб ~1:${scale.toLocaleString('ru-RU')} · СК-42, зона ${GEO.toSK(c.lat, c.lng).zone} · сетка ${grid ? 'через ' + (FRAME && FRAME.xs.length > 1 ? Math.round(Math.abs((FRAME.xs[1][0] - FRAME.xs[0][0]) / 1000)) : 1) + ' км' : 'нет'} · ${new Date().toLocaleDateString('ru-RU')}`, ox0, oy0 + oh + fh / 2); g.textAlign = 'right'; g.fillText('СКАТ', ox0 + ow, oy0 + oh + fh / 2);
netMsg(''); return {cv, W, H, miss};
} catch(e){ netMsg(''); toast('Не удалось подготовить лист: ' + (e.message || e)); return null; }
}
const prnSel = new Map();
function prnLaysOn(){ const on = new Set(); state.arrays.forEach(a => { if (isMk(a)) return; const v = prnSel.has(String(a.id)) ? prnSel.get(String(a.id)) : !a.hidden; if (v) on.add(String(a.id)); }); return on; }
function prnSettingsUI(){ const cur = $('prnBase').value || state.layer; $('prnBase').innerHTML = Object.entries(LAYERS).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${escapeHtml(v.name || k)}</option>`).join('');
const on = prnLaysOn(); $('prnLays').innerHTML = state.arrays.filter(a => !isMk(a)).map(a => `<label class="f" style="display:flex;align-items:center;gap:10px;margin:2px 0"><input type="checkbox" data-pl="${a.id}"${on.has(String(a.id)) ? ' checked' : ''} style="width:22px;min-height:22px;margin:0"> ${escapeHtml(a.name)}</label>`).join('') || '<div class="empty">Слоёв нет</div>';
$('prnLays').querySelectorAll('[data-pl]').forEach(c => c.onchange = () => prnSel.set(c.dataset.pl, c.checked)); }
async function prnSave(){ closeModals(); const r = await prnRender(false); if (!r) return; netMsg('Сохраняю JPEG…');
const blob = await new Promise(q => r.cv.toBlob(q, 'image/jpeg', Math.min(1, (+$('prnJq').value || 90) / 100))); netMsg(''); r.cv.width = r.cv.height = 1;
if (!blob){ toast('Не хватило памяти — уменьшите формат или разрешение'); return; }
deliverFile(blob, `СКАТ_печать_${stamp()}.jpg`, `Лист готов: ${r.W}×${r.H} пикс., ${(blob.size / 1048576).toFixed(1)} МБ.${r.miss ? ` Не загрузилось тайлов подложки: ${r.miss}.` : ''}`); }
$('prnGo').onclick = prnSave; $('prnPvGo').onclick = prnSave;
$('prnPrev').onclick = async () => { const r = await prnRender(true); if (!r) return; $('prnPvImg').src = r.cv.toDataURL('image/jpeg', .85); r.cv.width = r.cv.height = 1;
const [w, h, W, H] = prnInfo(); $('prnPvInfo').textContent = `Уменьшенный вид. В файле: ${W}×${H} пикс. Подложка в предпросмотре грубее, чем в файле.${r.miss ? ` Не загрузилось участков: ${r.miss}.` : ''}`; openModal('prnPvModal'); };
[['prnSym', 'prnSymV'], ['prnLbl', 'prnLblV']].forEach(([a, b]) => $(a).addEventListener('input', () => { $(b).textContent = (+$(a).value).toFixed(1); }));

// ======== ОПЕРАТОР: СВОЙСТВА ЗНАКА ========
let propRef = null;
function openProp(a, p){ propRef = {a, p};
$('prPlan').checked = !!p.plan; $('prNoL').checked = !!p.nolbl; $('prFake').checked = !!p.fake; $('prSz').value = p.ssz || 1; $('prLw').value = p.slw || 2.6; $('prLs').value = p.ls || 12.5;
$('prLf').innerHTML = '<option value="">как обычно</option>' + FONTS.map(([v, n]) => `<option value="${v}">${n}</option>`).join(''); $('prLf').value = p.lf || '';
renderFillPick($('prLc'), p.lc || null, c => { if (c) p.lc = c; else delete p.lc; renderMarkers(); }); prV(); openModal('propModal'); }
function prV(){ $('prSzV').textContent = '×' + $('prSz').value; $('prLwV').textContent = $('prLw').value; $('prLsV').textContent = $('prLs').value; }
['prPlan', 'prNoL', 'prFake', 'prSz', 'prLw', 'prLf', 'prLs'].forEach(id => $(id).addEventListener('input', () => { const p = propRef.p;
p.plan = $('prPlan').checked || undefined; if ($('prNoL').checked) p.nolbl = true; else delete p.nolbl; p.fake = $('prFake').checked || undefined; const sz = +$('prSz').value, lw = +$('prLw').value, ls = +$('prLs').value;
if (sz !== 1) p.ssz = sz; else delete p.ssz; if (lw !== 2.6) p.slw = lw; else delete p.slw; if (ls !== 12.5) p.ls = ls; else delete p.ls; if ($('prLf').value) p.lf = $('prLf').value; else delete p.lf;
['plan', 'fake'].forEach(k => { if (!p[k]) delete p[k]; }); prV(); renderMarkers(); }));
$('prOk').onclick = () => { persist(); closeModals(); renderMarkers(); };
// ======== ВЕКТОРНЫЙ РЕДАКТОР 4.1: ВЫДЕЛЕНИЕ И ТРАНСФОРМАЦИЯ (знаки p, фигуры s, надписи x, таблицы tb) ========
const VE = {on:false, sel:[], add:false, clip:null, g:null, band:null, orig:null, raf:0, bb:null, mr:null, inf:''};
const veT = ['p', 's', 'x', 'tb'], veLL = q => [q[0] ?? q.lat, q[1] ?? q.lng], veCp = ll => map.latLngToContainerPoint(L.latLng(ll[0], ll[1]));
const veBack = q => { const l = map.containerPointToLatLng(L.point(q.x, q.y)); return [+l.lat.toFixed(7), +l.lng.toFixed(7)]; };
const veNorm = d => { d = Math.round(((d % 360) + 540) % 360 - 180); return d; }, veCl = o => JSON.parse(JSON.stringify(o));
const veHas = it => VE.sel.some(s => s.o === it.o);
function veAll(){ const out = [], z = map.getZoom(); state.arrays.forEach(a => { if (a.hidden) return; veT.forEach(t => (a[ARRK[t]] || []).forEach(o => { if (!o || o.hid || !tagOk(a, o)) return; if ((t === 'p' || t === 's') && z < (a.minZ || 0)) return; out.push({a, t, o}); })); }); return out; }
function veRpx(sh){ const c = veLL(sh.pts[0]), p = veCp(c), q = veCp([c[0] + (sh.r || 0) / 111320, c[1]]); return Math.hypot(p.x - q.x, p.y - q.y); }
function veBox(it){ const {t, o} = it;
if (t === 'x' || t === 'tb'){ const arr = it.a[ARRK[t]] || [], el = document.querySelector(`[data-ve="${it.a.id}|${t}|${arr.indexOf(o)}"]`), m = VE.mr;
if (el && m){ let r = el.getBoundingClientRect(); if (!r.width && el.firstElementChild) r = el.firstElementChild.getBoundingClientRect(); if (r.width) return {x1:r.left - m.left, y1:r.top - m.top, x2:r.right - m.left, y2:r.bottom - m.top}; }
const q = veCp([o.lat, o.lng]); return {x1:q.x - 20, y1:q.y - 10, x2:q.x + 20, y2:q.y + 10}; }
if (t === 'p'){ const q = veCp([o.lat, o.lng]); return {x1:q.x - 16, y1:q.y - 16, x2:q.x + 16, y2:q.y + 16}; }
const P = (o.pts || []).map(q => veCp(veLL(q))); if (!P.length) return null;
if (o.type === 'circle'){ const r = veRpx(o); return {x1:P[0].x - r, y1:P[0].y - r, x2:P[0].x + r, y2:P[0].y + r}; }
const X = P.map(q => q.x), Y = P.map(q => q.y); return {x1:Math.min(...X), y1:Math.min(...Y), x2:Math.max(...X), y2:Math.max(...Y)}; }
function veBB(L1){ let B = null; (L1 || VE.sel).forEach(s => { const b = veBox(s); if (!b) return; B = B ? {x1:Math.min(B.x1, b.x1), y1:Math.min(B.y1, b.y1), x2:Math.max(B.x2, b.x2), y2:Math.max(B.y2, b.y2)} : Object.assign({}, b); }); return B; }
function veShapeHit(sh, x, y){ const P = (sh.pts || []).map(q => veCp(veLL(q))); if (!P.length) return false;
if (sh.type === 'circle') return Math.hypot(P[0].x - x, P[0].y - y) <= veRpx(sh) + 8;
const sd = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L2)) : 0; return Math.hypot(a.x + t * dx - x, a.y + t * dy - y); };
for (let i = 1; i < P.length; i++) if (sd(P[i - 1], P[i]) < 10) return true;
if (sh.type === 'line' || P.length < 3) return false; if (sd(P[P.length - 1], P[0]) < 10) return true;
let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i].y > y) !== (P[j].y > y) && x < (P[j].x - P[i].x) * (y - P[i].y) / (P[j].y - P[i].y) + P[i].x) ins = !ins; return ins; }
function veHit(x, y){ const all = veAll(); let best = null, bd = 24;
for (let k = all.length - 1; k >= 0; k--){ const it = all[k]; if (it.t !== 'x' && it.t !== 'tb') continue; const b = veBox(it); if (b && x >= b.x1 - 4 && x <= b.x2 + 4 && y >= b.y1 - 4 && y <= b.y2 + 4) return it; }
all.forEach(it => { if (it.t !== 'p') return; const q = veCp([it.o.lat, it.o.lng]), d = Math.hypot(q.x - x, q.y - y); if (d < bd){ bd = d; best = it; } }); if (best) return best;
for (let k = all.length - 1; k >= 0; k--){ const it = all[k]; if (it.t === 's' && veShapeHit(it.o, x, y)) return it; } return null; }
function veExpand(it){ if (!it.o.g) return [it]; return veAll().filter(s => s.a === it.a && s.o.g === it.o.g); }
function veAddSel(L1){ L1.forEach(s => { if (!veHas(s)) VE.sel.push(s); }); }
// ---- применение преобразования: fn(точка экрана, номер) → точка экрана; k — масштаб размеров; deg — поворот
function veBegin(){ VE.orig = VE.sel.map(s => veCl(s.o)); }
function veApply(fn, k, deg){ VE.sel.forEach((s, j) => { const o = s.o, O = VE.orig && VE.orig[j]; if (!O) return; const mv = ll => veBack(fn(veCp(ll), j));
if (s.t === 's'){ if (O.bz){ o.bz = {c:O.bz.c, n:O.bz.n.map(n => ({p:mv(n.p), a:n.a ? mv(n.a) : null, b:n.b ? mv(n.b) : null, s:n.s || 0}))}; o.pts = bzFlat(o.bz); } else o.pts = (O.pts || []).map(q => mv(veLL(q))); if (o.type === 'circle' && O.r) o.r = Math.max(1, +(O.r * k).toFixed(1)); return; }
const q = mv([O.lat, O.lng]); o.lat = q[0]; o.lng = q[1];
if ((s.t === 'x' || s.t === 'tb') && k !== 1 && O.s) o.s = Math.max(4, Math.round(O.s * k));
if (deg && s.t === 'x'){ const r = veNorm((O.r || 0) + deg); if (r) o.r = r; else delete o.r; }
if (deg && s.t === 'p'){ const r = veNorm((O.rot || 0) + deg); if (r) o.rot = r; else delete o.rot; } }); veFrame(); }
function veFrame(){ if (!VE.raf) VE.raf = requestAnimationFrame(() => { VE.raf = 0; renderMarkers(); }); }
function veEnd(){ VE.orig = null; VE.inf = ''; if (VE.sel.some(s => s.t === 's' && s.o.zn) && typeof planNum === 'function') state.arrays.forEach(L1 => { if (L1.fplan) L1.points.forEach(q => planNum(L1, q)); }); persist(); renderMarkers(); }
function veCancel(){ if (VE.orig) VE.sel.forEach((s, j) => { const O = VE.orig[j]; if (!O) return; Object.keys(s.o).forEach(k => { if (!(k in O)) delete s.o[k]; }); Object.assign(s.o, O); }); const had = !!VE.orig; VE.orig = null; VE.g = null; VE.band = null; VE.stroke = null; VE.inf = ''; if (had) renderMarkers(); else veDraw(); }
function veMoveBy(dx, dy){ if (!VE.sel.length) return; veBegin(); veApply(q => ({x:q.x + dx, y:q.y + dy}), 1, 0); VE.orig = null; persist(); }
// ---- рамка, маркеры, панель
function veDraw(){ if (!VE.on || !VE.ov) return; if (secMode !== 'op'){ veOff(); return; } const m = VE.mr = map.getContainer().getBoundingClientRect();
Object.assign(VE.ov.style, {left:m.left + 'px', top:m.top + 'px', width:m.width + 'px', height:m.height + 'px'});
VE.sel = VE.sel.filter(s => state.arrays.includes(s.a) && (s.a[ARRK[s.t]] || []).includes(s.o)); if (VE.nd && !(VE.nd.a.shapes || []).includes(VE.nd.o)){ VE.nd = null; veBarMode(); }
const B = VE.bb = VE.sel.length && !VE.nd && !VE.pen && !VE.pcl ? veBB() : null; let h = VE.nd || VE.pen ? veNodesSvg() : '';
if (VE.stroke) h += `<polyline class="vstk" points="${VE.stroke.map(q => q.x + ',' + q.y).join(' ')}"/>`;
if (B){ if (VE.sel.length > 1) VE.sel.forEach(s => { const b = veBox(s); if (b) h += `<rect class="vi" x="${b.x1}" y="${b.y1}" width="${b.x2 - b.x1}" height="${b.y2 - b.y1}"/>`; });
const x1 = B.x1 - 6, y1 = B.y1 - 6, x2 = B.x2 + 6, y2 = B.y2 + 6, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
h += `<rect class="vb" x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}"/><line class="vb" x1="${cx}" y1="${y1}" x2="${cx}" y2="${y1 - 26}"/>`;
const H = [['nw', x1, y1], ['n', cx, y1], ['ne', x2, y1], ['e', x2, cy], ['se', x2, y2], ['s', cx, y2], ['sw', x1, y2], ['w', x1, cy]];
if (!VE.g || VE.g.mode !== 'move') H.forEach(([k, x, y]) => { h += `<g data-h="${k}" class="hd"><circle cx="${x}" cy="${y}" r="16" fill="transparent"/><rect x="${x - 5}" y="${y - 5}" width="10" height="10" class="hv"/></g>`; });
h += `<g data-h="rot" class="hd"><circle cx="${cx}" cy="${y1 - 30}" r="18" fill="transparent"/><circle cx="${cx}" cy="${y1 - 30}" r="7" class="hv hr"/></g>`; }
if (VE.band){ const b = VE.band; h += `<rect class="vband" x="${b.x1}" y="${b.y1}" width="${b.x2 - b.x1}" height="${b.y2 - b.y1}"/>`; }
VE.svg.innerHTML = h; $('veN').textContent = VE.inf || `Выбрано: ${VE.sel.length}`; const nb = VE.bar.querySelector('#veNdB b'); if (nb && (VE.nd || VE.pen) && VE.ndi >= 0) nb.textContent = `${VE.pen ? 'Перо' : 'Узлы'}: ${VE.ndi + 1} из ${(VE.nd || VE.pen).o.bz.n.length}`; VE.bar.querySelector('[data-v="add"]').classList.toggle('on', VE.add); }
function veUI(){ if (VE.ov) return;
VE.ov = document.createElement('div'); VE.ov.id = 'veOv'; VE.ov.innerHTML = '<svg></svg>'; document.body.appendChild(VE.ov); VE.svg = VE.ov.firstChild;
VE.bar = document.createElement('div'); VE.bar.id = 'veBar'; VE.bar.className = 'glass';
VE.bar.innerHTML = '<b id="veN"></b><button data-v="all">Все</button><button data-v="add">＋ К выбору</button><button data-v="nd">Узлы</button><button data-v="st">Стиль</button><button data-v="pen">Перо</button><button data-v="pcl">Карандаш</button><button data-v="dup">Дубль</button><button data-v="copy">Копир.</button><button data-v="paste">Вставить</button><button data-v="grp">Группа</button><button data-v="ugrp">Разгруп.</button><button data-v="up">Выше</button><button data-v="dn">Ниже</button><button data-v="al">Выровнять ▾</button><button data-v="del" class="danger">Удалить</button><button data-v="x">✕</button>'
+ '<div id="veAl"><button data-v="al:l">⇤ Лево</button><button data-v="al:ch">⇹ Центр</button><button data-v="al:r">⇥ Право</button><button data-v="al:t">⤒ Верх</button><button data-v="al:cv">⇕ Середина</button><button data-v="al:b">⤓ Низ</button><button data-v="al:dh">↔ Распределить</button><button data-v="al:dv">↕ Распределить</button></div><div id="veNdB"></div>';
document.body.appendChild(VE.bar);
VE.bar.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v;
if (v.startsWith('al:')) return veAlign(v.slice(3));
({all:() => { VE.sel = veAll(); veDraw(); }, add:() => { VE.add = !VE.add; veDraw(); }, dup:veDup, copy:veCopy, paste:vePaste, grp:veGroup, ugrp:veUngroup, up:() => veOrder(true), dn:() => veOrder(false), del:veDel, x:veOff,
al:() => $('veAl').classList.toggle('on'), nd:veNodes, st:veStyle,
pen:() => { veModeEnd(); VE.pen = {a:null, t:'s', o:null}; VE.sel = []; veBarMode(); veDraw(); toast('Перо: касание — угловой узел, касание с протяжкой — гладкий; касание первого узла замыкает'); },
pcl:() => { veModeEnd(); VE.pcl = true; VE.sel = []; veBarMode(); veDraw(); toast('Карандаш: рисуйте пальцем; конец у начала — замкнутая фигура'); }})[v](); });
VE.bar.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) veNdAct(b.dataset.w); });
VE.svg.addEventListener('pointerdown', e => { if (e.target.closest('[data-n]')) return veNodeDown(e); const hd = e.target.closest('[data-h]'); if (!hd || !VE.bb || VE.g) return; e.stopPropagation(); e.preventDefault();
VE.mr = map.getContainer().getBoundingClientRect(); const B = VE.bb, k = hd.dataset.h, p = vePt(e);
VE.g = {id:e.pointerId, p0:p, mode:k === 'rot' ? 'rot' : 'scale', k, B, c:{x:(B.x1 + B.x2) / 2, y:(B.y1 + B.y2) / 2}}; veBegin(); try { VE.ov.setPointerCapture(e.pointerId); } catch(_){} });
VE.ov.addEventListener('pointermove', veMove); VE.ov.addEventListener('pointerup', veUp); VE.ov.addEventListener('pointercancel', e => { if (VE.g && e.pointerId === VE.g.id) veCancel(); });
const st = document.createElement('style'); st.textContent = '#veOv{position:fixed;z-index:450;pointer-events:none;display:none}#veOv svg{width:100%;height:100%;overflow:visible;pointer-events:none}#veOv .vb{fill:none;stroke:#1e90ff;stroke-width:1.5;stroke-dasharray:6 4}#veOv .vi{fill:none;stroke:#1e90ff;stroke-width:1;opacity:.55}#veOv .vband{fill:rgba(30,144,255,.12);stroke:#1e90ff;stroke-width:1;stroke-dasharray:4 3}#veOv .hd{pointer-events:all;cursor:pointer;touch-action:none}#veOv .hv{fill:#fff;stroke:#1e90ff;stroke-width:2}#veOv .hr{fill:#1e90ff;stroke:#fff}#veBar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(12px + env(safe-area-inset-bottom));z-index:1500;display:none;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;max-width:calc(100vw - 16px);padding:8px;border-radius:12px}#veBar button{padding:6px 10px}#veBar button.on{outline:2px solid #1e90ff}#veBar #veN{padding:0 6px;font-variant-numeric:tabular-nums}#veAl{display:none;width:100%;flex-wrap:wrap;gap:6px;justify-content:center}#veAl.on{display:flex}'; document.head.appendChild(st);
map.on('zoomstart', () => { if (VE.on) VE.svg.style.display = 'none'; }); map.on('move zoomend resize rotate', () => { if (!VE.on) return; VE.svg.style.display = ''; veDraw(); }); }
// ---- жесты на карте (перехват до карты: один палец — выделение, два — карта)
const vePt = e => ({x:e.clientX - VE.mr.left, y:e.clientY - VE.mr.top});
function veDown(e){ if (!VE.on || (e.pointerType === 'mouse' && e.button !== 0)) return; if (VE.g){ if (e.pointerId !== VE.g.id) veCancel(); return; }
if (document.querySelector('.modal.open')) return; e.stopPropagation();
VE.mr = map.getContainer().getBoundingClientRect(); if (VE.pen || VE.pcl || VE.nd) return veDown2(e); const p = vePt(e);
VE.g = {id:e.pointerId, p0:p, it:veHit(p.x, p.y), add:VE.add || e.shiftKey || e.ctrlKey || e.metaKey, mode:null}; try { map.getContainer().setPointerCapture(e.pointerId); } catch(_){} }
function veMove(e){ const g = VE.g; if (!g || e.pointerId !== g.id) return; e.stopPropagation(); if (g.x2) return veMove2(e, g); const p = vePt(e), dx = p.x - g.p0.x, dy = p.y - g.p0.y;
if (!g.mode){ if (Math.hypot(dx, dy) < 6) return; if (g.it){ if (!veHas(g.it)){ if (!g.add) VE.sel = []; veAddSel(veExpand(g.it)); } g.mode = 'move'; veBegin(); } else g.mode = 'band'; }
if (g.mode === 'move'){ VE.inf = `Сдвиг ${Math.round(dx)}, ${Math.round(dy)} пикс.`; veApply(q => ({x:q.x + dx, y:q.y + dy}), 1, 0); }
else if (g.mode === 'band'){ VE.band = {x1:Math.min(p.x, g.p0.x), y1:Math.min(p.y, g.p0.y), x2:Math.max(p.x, g.p0.x), y2:Math.max(p.y, g.p0.y)}; veDraw(); }
else if (g.mode === 'rot'){ const c = g.c; let deg = (Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(g.p0.y - c.y, g.p0.x - c.x)) * 180 / Math.PI; deg = veNorm(deg);
const sn = Math.round(deg / 15) * 15; if (e.shiftKey || Math.abs(deg - sn) < 2) deg = sn; const a = deg * Math.PI / 180, cs = Math.cos(a), sn2 = Math.sin(a); VE.inf = `Поворот ${deg}°`;
veApply(q => ({x:c.x + (q.x - c.x) * cs - (q.y - c.y) * sn2, y:c.y + (q.x - c.x) * sn2 + (q.y - c.y) * cs}), 1, deg); }
else if (g.mode === 'scale'){ const B = g.B, k = g.k, ax = k.includes('w') ? B.x2 + 6 : k.includes('e') ? B.x1 - 6 : (B.x1 + B.x2) / 2, ay = k.includes('n') ? B.y2 + 6 : k.includes('s') ? B.y1 - 6 : (B.y1 + B.y2) / 2;
let sx = 1, sy = 1; const lim = v => Math.abs(v) < .05 ? (v < 0 ? -.05 : .05) : v;
if (k.length === 2){ const d0 = Math.hypot(g.p0.x - ax, g.p0.y - ay), d1 = Math.hypot(p.x - ax, p.y - ay); sx = sy = Math.max(.05, d0 ? d1 / d0 : 1); }
else if (k === 'e' || k === 'w') sx = lim((p.x - ax) / ((g.p0.x - ax) || 1)); else sy = lim((p.y - ay) / ((g.p0.y - ay) || 1));
VE.inf = `Масштаб ×${(k.length === 2 ? sx : k === 'e' || k === 'w' ? sx : sy).toFixed(2).replace('.', ',')}`; veApply(q => ({x:ax + (q.x - ax) * sx, y:ay + (q.y - ay) * sy}), Math.sqrt(Math.abs(sx * sy)), 0); } }
function veUp(e){ const g = VE.g; if (!g || e.pointerId !== g.id) return; e.stopPropagation(); if (g.x2) return veUp2(e, g); VE.g = null;
if (!g.mode){ if (g.it){ const ex = veExpand(g.it); if (g.add){ if (veHas(g.it)) VE.sel = VE.sel.filter(s => !ex.some(x => x.o === s.o)); else veAddSel(ex); } else VE.sel = ex; } else if (!g.add) VE.sel = []; veDraw(); return; }
if (g.mode === 'band'){ const b = VE.band; VE.band = null; if (!g.add) VE.sel = []; if (b) veAll().forEach(it => { const q = veBox(it); if (q && q.x1 >= b.x1 && q.x2 <= b.x2 && q.y1 >= b.y1 && q.y2 <= b.y2) veAddSel(veExpand(it)); }); veDraw(); return; }
veEnd(); }
{ const mc = map.getContainer();
mc.addEventListener('pointerdown', veDown, true); mc.addEventListener('pointermove', veMove, true); mc.addEventListener('pointerup', veUp, true);
mc.addEventListener('pointercancel', e => { if (VE.g && e.pointerId === VE.g.id) veCancel(); }, true);
mc.addEventListener('touchstart', e => { if (VE.on && e.touches.length === 1) e.stopPropagation(); }, true);
['click', 'dblclick', 'contextmenu'].forEach(ev => mc.addEventListener(ev, e => { if (VE.on) e.stopPropagation(); }, true)); }
// ---- действия
function veNewObj(t, o){ const c = veCl(o); if (t === 'p'){ delete c.f; delete c.tno; } if ('id' in c && typeof c.id === 'number') c.id = Date.now() + Math.floor(Math.random() * 1e6); return c; }
function veDup(){ if (!VE.sel.length){ toast('Ничего не выбрано'); return; } const nw = [];
VE.sel.forEach(s => { const arr = s.a[ARRK[s.t]], c = veNewObj(s.t, s.o); arr.splice(arr.indexOf(s.o) + 1, 0, c); nw.push({a:s.a, t:s.t, o:c}); });
VE.sel = nw; veMoveBy(18, 18); toast(`Дублировано: ${nw.length}`); }
function veCopy(){ if (!VE.sel.length){ toast('Ничего не выбрано'); return; } const B = VE.bb || veBB(); VE.clip = {c:veBack({x:(B.x1 + B.x2) / 2, y:(B.y1 + B.y2) / 2}), it:VE.sel.map(s => ({aid:s.a.id, t:s.t, o:veCl(s.o)}))}; toast(`Скопировано: ${VE.clip.it.length}`); }
function vePaste(){ if (!VE.clip){ toast('Буфер пуст'); return; } const nw = []; let skip = 0;
VE.clip.it.forEach(x => { let a = arrById(x.aid); if (!a){ if (x.t === 'p'){ skip++; return; } a = textLayer(); } const arr = a[ARRK[x.t]] || (a[ARRK[x.t]] = []), c = veNewObj(x.t, x.o); arr.push(c); nw.push({a, t:x.t, o:c}); });
if (!nw.length){ toast('Некуда вставить: исходный слой удалён'); return; } VE.sel = nw; const q = veCp(VE.clip.c), s = map.getSize();
veMoveBy(s.x / 2 - q.x, s.y / 2 - q.y); renderMarkers(); toast(`Вставлено в центр экрана: ${nw.length}${skip ? `, пропущено знаков: ${skip}` : ''}`); }
function veGroup(){ if (VE.sel.length < 2){ toast('Выберите несколько объектов'); return; } const v = prompt('Название группы', VE.sel.find(s => s.o.g)?.o.g || 'Группа ' + (new Set(veAll().map(s => s.o.g).filter(Boolean)).size + 1)); if (v === null || !v.trim()) return;
VE.sel.forEach(s => { s.o.g = v.trim(); }); persist(); toast(`Группа «${v.trim()}»: ${VE.sel.length}${new Set(VE.sel.map(s => s.a)).size > 1 ? ' (в разных слоях — группа в каждом слое своя)' : ''}`); }
function veUngroup(){ let n = 0; VE.sel.forEach(s => { if (s.o.g){ delete s.o.g; n++; } }); if (n){ persist(); toast(`Разгруппировано: ${n}`); } else toast('В выбранном нет групп'); }
function veOrder(top){ const by = new Map(); let pts = 0; VE.sel.forEach(s => { if (s.t === 'p'){ pts++; return; } const arr = s.a[ARRK[s.t]]; if (!by.has(arr)) by.set(arr, []); by.get(arr).push(s.o); });
if (!by.size){ toast(pts ? 'Порядок знаков задаёт нумерация — не меняется' : 'Ничего не выбрано'); return; }
by.forEach((os, arr) => { const mine = arr.filter(o => os.includes(o)), rest = arr.filter(o => !os.includes(o)); arr.length = 0; arr.push(...(top ? rest.concat(mine) : mine.concat(rest))); });
persist(); renderMarkers(); toast((top ? 'На передний план' : 'На задний план') + ' (внутри своего слоя)'); }
function veAlign(m){ const n = VE.sel.length; if (n < 2 || (m[0] === 'd' && n < 3)){ toast(m[0] === 'd' ? 'Для распределения нужно не меньше трёх объектов' : 'Нужно не меньше двух объектов'); return; }
const B = veBB(), bx = VE.sel.map(veBox), D = bx.map(() => [0, 0]), cx = b => (b.x1 + b.x2) / 2, cy = b => (b.y1 + b.y2) / 2;
if (m === 'dh' || m === 'dv'){ const f = m === 'dh' ? cx : cy, ord = bx.map((b, j) => j).filter(j => bx[j]).sort((i, j) => f(bx[i]) - f(bx[j])), a = f(bx[ord[0]]), st = (f(bx[ord[ord.length - 1]]) - a) / (ord.length - 1);
ord.forEach((j, k) => { const d = a + st * k - f(bx[j]); D[j] = m === 'dh' ? [d, 0] : [0, d]; }); }
else bx.forEach((b, j) => { if (!b) return; D[j] = {l:[B.x1 - b.x1, 0], r:[B.x2 - b.x2, 0], ch:[cx(B) - cx(b), 0], t:[0, B.y1 - b.y1], b:[0, B.y2 - b.y2], cv:[0, cy(B) - cy(b)]}[m]; });
veBegin(); veApply((q, j) => ({x:q.x + D[j][0], y:q.y + D[j][1]}), 1, 0); VE.orig = null; persist(); $('veAl').classList.remove('on'); }
function veDel(){ if (!VE.sel.length){ toast('Ничего не выбрано'); return; } askConfirm(`Удалить выбранное (${VE.sel.length})?`, 'Удалить', () => {
VE.sel.forEach(s => { const arr = s.a[ARRK[s.t]], i = arr.indexOf(s.o); if (i < 0) return; arr.splice(i, 1); if (s.t === 'p') trashPush({t:'pt', aid:s.a.id, an:s.a.name, p:s.o, i}); });
VE.sel = []; persist(); renderMarkers(); toast('Удалено (↶ — вернуть)'); }); }
// ---- вкл/выкл, клавиши
function veOn(){ if (VE.on) return; if (secMode !== 'op'){ toast('Выделение работает в разделе «Оператор»'); return; } if (typeof tool !== 'undefined' && tool.on) closeTools(); veUI(); VE.on = true;
VE.was = {d:map.dragging.enabled(), dz:map.doubleClickZoom.enabled(), bz:!!(map.boxZoom && map.boxZoom.enabled())}; map.dragging.disable(); map.doubleClickZoom.disable(); if (map.boxZoom) map.boxZoom.disable();
VE.ov.style.display = 'block'; VE.bar.style.display = 'flex'; $('veBtn').classList.add('on'); veDraw(); toast('Выделение: касание — объект, протяжка по пустому — рамка, двумя пальцами — карта'); }
function veOff(){ if (!VE.on) return; if (VE.g) veCancel(); veModeEnd(); VE.on = false; VE.sel = []; VE.band = null; VE.add = false;
if (VE.was){ if (VE.was.d) map.dragging.enable(); if (VE.was.dz) map.doubleClickZoom.enable(); if (VE.was.bz) map.boxZoom.enable(); }
VE.ov.style.display = 'none'; VE.bar.style.display = 'none'; $('veAl').classList.remove('on'); $('veBtn').classList.remove('on'); }
function veToggle(){ VE.on ? veOff() : veOn(); }
document.addEventListener('keydown', e => { if (!VE.on || document.querySelector('.modal.open') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName || '')) return;
const c = e.ctrlKey || e.metaKey, k = e.code, st = e.shiftKey ? 10 : 1; let ok = true;
if (e.key === 'Escape' && (VE.nd || VE.pen || VE.pcl)){ veModeEnd(); veDraw(); }
else if (e.key === 'Enter' && VE.pen) veNdAct('ok');
else if (e.key === 'Escape'){ if (VE.sel.length){ VE.sel = []; veDraw(); } else veOff(); }
else if (e.key === 'Delete' || e.key === 'Backspace') (VE.nd || VE.pen) ? veNdAct(VE.pen ? 'back' : 'del') : veDel();
else if (c && k === 'KeyA'){ VE.sel = veAll(); veDraw(); } else if (c && k === 'KeyC') veCopy(); else if (c && k === 'KeyV') vePaste(); else if (c && k === 'KeyD') veDup();
else if (c && k === 'KeyG') e.shiftKey ? veUngroup() : veGroup();
else if (e.key === 'ArrowLeft') veMoveBy(-st, 0); else if (e.key === 'ArrowRight') veMoveBy(st, 0); else if (e.key === 'ArrowUp') veMoveBy(0, -st); else if (e.key === 'ArrowDown') veMoveBy(0, st);
else ok = false; if (ok){ e.preventDefault(); e.stopPropagation(); } }, true);
{ const r0 = renderMarkers; window.renderMarkers = function(){ const r = r0.apply(this, arguments); if (VE.on) requestAnimationFrame(veDraw); return r; }; }
// ======== ВЕКТОРНЫЙ РЕДАКТОР 4.2: УЗЛЫ И КРИВЫЕ (sh.bz = {c:замкнута, n:[{p, a, b, s}]} — p узел, a/b рычаги [lat,lng], s гладкий; sh.pts — сглаженная ломаная) ========
function bzFlat(bz){ const N = bz.n, out = []; if (!N.length) return out;
const seg = (A, B) => { if (!A.b && !B.a){ out.push(B.p.slice()); return; } const c1 = A.b || A.p, c2 = B.a || B.p, K = 16; for (let k = 1; k <= K; k++){ const t = k / K, u = 1 - t; out.push([0, 1].map(i => +(u * u * u * A.p[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * B.p[i]).toFixed(7))); } };
out.push(N[0].p.slice()); for (let i = 1; i < N.length; i++) seg(N[i - 1], N[i]); if (bz.c && N.length > 2){ seg(N[N.length - 1], N[0]); out.pop(); } return out; }
function bzApply(sh){ sh.pts = bzFlat(sh.bz); sh.type = sh.bz.c ? 'poly' : 'line'; }
function bzSplit(bz, i, t){ const N = bz.n, A = N[i], B = N[(i + 1) % N.length], c1 = A.b || A.p, c2 = B.a || B.p, lp = (x, y) => [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t];
const q0 = lp(A.p, c1), q1 = lp(c1, c2), q2 = lp(c2, B.p), r0 = lp(q0, q1), r1 = lp(q1, q2), m = lp(r0, r1), cv = !!(A.b || B.a);
if (cv){ A.b = q0; B.a = q2; } N.splice(i + 1, 0, {p:m, a:cv ? r0 : null, b:cv ? r1 : null, s:cv ? 1 : 0}); }
function veRdp(P, eps){ if (P.length < 3) return P.slice(); const a = P[0], b = P[P.length - 1], dx = b.x - a.x, dy = b.y - a.y, L0 = Math.hypot(dx, dy); let md = 0, mi = 0;
for (let i = 1; i < P.length - 1; i++){ const d = L0 > 1e-6 ? Math.abs(dy * P[i].x - dx * P[i].y + b.x * a.y - b.y * a.x) / L0 : Math.hypot(P[i].x - a.x, P[i].y - a.y); if (d > md){ md = d; mi = i; } }
if (md > eps){ const l = veRdp(P.slice(0, mi + 1), eps), r = veRdp(P.slice(mi), eps); return l.slice(0, -1).concat(r); } return [a, b]; }
VE.st = {color:'#e2533f', sw:3}; VE.sm = 1; VE.ndi = -1;
function veDrawLayer(){ const s0 = VE.sel.find(s => s.a.kind === 'shapes'); if (s0) return s0.a; let a = state.arrays.find(x => x.kind === 'shapes' && x.name === 'Рисунок');
if (!a){ a = normArr({id:Date.now(), kind:'shapes', name:'Рисунок', ident:'Рисунок', style:{color:'#e2533f', name:'Красный', glyph:''}, points:[], shapes:[], texts:[]}); state.arrays.push(a); }
if (!a.shapes) a.shapes = []; a.hidden = false; return a; }
function veNewShape(bz){ const a = veDrawLayer(), sh = Object.assign({type:'line', pts:[], bz, t:Date.now()}, veCl(VE.st)); bzApply(sh); a.shapes.push(sh); return {a, t:'s', o:sh}; }
function veNodesSvg(){ const it = VE.nd || VE.pen, sh = it && it.o; if (!sh || !sh.bz) return ''; let h = '';
sh.bz.n.forEach((n, i) => { const p = veCp(n.p); ['a', 'b'].forEach(k => { if (!n[k]) return; const q = veCp(n[k]); h += `<line class="vh" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/><g data-n="${i}|${k}" class="hd"><circle cx="${q.x}" cy="${q.y}" r="14" fill="transparent"/><circle cx="${q.x}" cy="${q.y}" r="4.5" class="hv hr"/></g>`; });
const cl = 'hv' + (VE.ndi === i ? ' hs' : ''); h += `<g data-n="${i}|p" class="hd"><circle cx="${p.x}" cy="${p.y}" r="16" fill="transparent"/>${n.s ? `<circle cx="${p.x}" cy="${p.y}" r="6" class="${cl}"/>` : `<rect x="${p.x - 5.5}" y="${p.y - 5.5}" width="11" height="11" class="${cl}"/>`}</g>`; }); return h; }
function veNodes(){ const it = VE.sel.length === 1 && VE.sel[0].t === 's' ? VE.sel[0] : null, sh = it && it.o; if (!sh){ toast('Выберите одну фигуру'); return; } if (sh.type === 'circle'){ toast('У круга нет узлов — меняйте его рамкой'); return; }
if (!sh.bz) sh.bz = {c:sh.type !== 'line', n:(sh.pts || []).map(q => ({p:veLL(q), a:null, b:null, s:0}))}; VE.nd = it; VE.ndi = -1; veBarMode(); veDraw(); toast('Узлы: тяните узлы и рычаги; касание линии — новый узел; касание пустого места — выход'); }
function veModeEnd(){ if (VE.pen) vePenEnd(); VE.pcl = false; VE.nd = null; VE.stroke = null; VE.ndi = -1; veBarMode(); }
function vePenEnd(){ const it = VE.pen; VE.pen = null; if (it && it.o){ if (it.o.bz.n.length < 2){ const i = it.a.shapes.indexOf(it.o); if (i >= 0) it.a.shapes.splice(i, 1); } else { VE.sel = [it]; persist(); } } VE.ndi = -1; veBarMode(); renderMarkers(); }
function veBarMode(){ if (!VE.bar) return; const md = VE.pen ? 'pen' : VE.pcl ? 'pcl' : VE.nd ? 'nd' : ''; VE.bar.classList.toggle('nd', !!md); if (!md) return;
const B = (w, t) => `<button data-w="${w}">${t}</button>`, sm = ['слабое', 'среднее', 'сильное'][VE.sm];
$('veNdB').innerHTML = md === 'nd' ? `<b>Узлы</b>${B('del', 'Удалить узел')}${B('sm', 'Гладкий / угол')}${B('seg', 'Отрезок: кривая / прямая')}${B('cl', 'Замкнуть / разомкнуть')}${B('ok', 'Готово')}`
: md === 'pen' ? `<b>Перо</b>${B('back', 'Убрать узел')}${B('sm', 'Гладкий / угол')}${B('ok', 'Готово')}`
: `<b>Карандаш</b>${B('smo', 'Сглаживание: ' + sm)}${B('ok', 'Готово')}`; }
function veNdAct(v){ if (v === 'smo'){ VE.sm = (VE.sm + 1) % 3; veBarMode(); return; } if (v === 'ok'){ if (VE.pen) vePenEnd(); else { VE.pcl = false; VE.nd = null; VE.ndi = -1; veBarMode(); } veDraw(); return; }
const it = VE.nd || VE.pen; if (!it || !it.o) { toast(VE.pen ? 'Поставьте узлы касанием' : 'Нет фигуры'); return; } const sh = it.o, bz = sh.bz, N = bz.n, i = v === 'back' ? N.length - 1 : VE.ndi, n = N[i];
if (!n){ toast('Коснитесь узла'); return; }
if (v === 'del' || v === 'back'){ if (v === 'del' && N.length <= (bz.c ? 3 : 2)){ toast('Меньше узлов нельзя'); return; } N.splice(i, 1); VE.ndi = -1; if (bz.c && N.length < 3) bz.c = false; }
else if (v === 'sm'){ if (n.s || n.a || n.b){ n.s = 0; n.a = null; n.b = null; } else { const L0 = N.length, pv = N[bz.c ? (i - 1 + L0) % L0 : Math.max(0, i - 1)], nx = N[bz.c ? (i + 1) % L0 : Math.min(L0 - 1, i + 1)], d = [(nx.p[0] - pv.p[0]) / 6, (nx.p[1] - pv.p[1]) / 6];
n.a = (bz.c || i > 0) ? [n.p[0] - d[0], n.p[1] - d[1]] : null; n.b = (bz.c || i < L0 - 1) ? [n.p[0] + d[0], n.p[1] + d[1]] : null; n.s = 1; } }
else if (v === 'seg'){ const j = bz.c ? (i + 1) % N.length : i + 1; if (j >= N.length){ toast('После последнего узла нет отрезка'); return; } const m = N[j];
if (n.b || m.a){ n.b = null; m.a = null; } else { n.b = [n.p[0] + (m.p[0] - n.p[0]) / 3, n.p[1] + (m.p[1] - n.p[1]) / 3]; m.a = [n.p[0] + (m.p[0] - n.p[0]) * 2 / 3, n.p[1] + (m.p[1] - n.p[1]) * 2 / 3]; } }
else if (v === 'cl'){ if (!bz.c && N.length < 3){ toast('Для замыкания нужно 3 узла'); return; } bz.c = !bz.c; }
if (N.length) bzApply(sh); persist(); renderMarkers(); }
function veNdTap(p){ const it = VE.nd, sh = it.o, bz = sh.bz, N = bz.n, cnt = bz.c ? N.length : N.length - 1; let best = null, bd = 14;
for (let i = 0; i < cnt; i++){ const A = N[i], B = N[(i + 1) % N.length], c1 = A.b || A.p, c2 = B.a || B.p;
for (let k = 1; k < 24; k++){ const t = k / 24, u = 1 - t, q = veCp([0, 1].map(j => u * u * u * A.p[j] + 3 * u * u * t * c1[j] + 3 * u * t * t * c2[j] + t * t * t * B.p[j])), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd){ bd = d; best = [i, t]; } } }
if (!best){ VE.nd = null; VE.ndi = -1; veBarMode(); veDraw(); return; } bzSplit(bz, best[0], best[1]); VE.ndi = best[0] + 1; bzApply(sh); persist(); renderMarkers(); toast('Узел добавлен'); }
function vePclMake(P){ if (P.length < 3) return; let Q = veRdp(P, [1.5, 3, 6][VE.sm]); if (Q.length < 2) return; const closed = Q.length > 3 && Math.hypot(Q[0].x - Q[Q.length - 1].x, Q[0].y - Q[Q.length - 1].y) < 18; if (closed) Q.pop();
const n = Q.length, N = Q.map((q, i) => { const pv = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], nx = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], tx = (nx.x - pv.x) / 6, ty = (nx.y - pv.y) / 6;
return {p:veBack(q), a:veBack({x:q.x - tx, y:q.y - ty}), b:veBack({x:q.x + tx, y:q.y + ty}), s:1}; });
if (!closed){ N[0].a = null; N[n - 1].b = null; } veNewShape({c:closed, n:N}); persist(); renderMarkers(); }
// жесты режимов узлов, пера, карандаша
function veNodeDown(e){ const el = e.target.closest('[data-n]'), it = VE.nd || VE.pen; e.stopPropagation(); e.preventDefault(); if (!it || !it.o || VE.g) return; const [i, k] = el.dataset.n.split('|');
VE.mr = map.getContainer().getBoundingClientRect(); VE.sel = [it]; veBegin(); VE.g = {id:e.pointerId, p0:vePt(e), x2:'node', i:+i, k, mode:null}; try { VE.ov.setPointerCapture(e.pointerId); } catch(_){} }
function veDown2(e){ const p = vePt(e), mc = map.getContainer(); VE.g = {id:e.pointerId, p0:p, x2:VE.pen ? 'pen' : VE.pcl ? 'pcl' : 'ndtap', pts:[p], mode:null}; try { mc.setPointerCapture(e.pointerId); } catch(_){}
if (VE.pen){ if (!VE.pen.o){ const it = veNewShape({c:false, n:[]}); Object.assign(VE.pen, it); } const sh = VE.pen.o; sh.bz.n.push({p:veBack(p), a:null, b:null, s:0}); VE.ndi = sh.bz.n.length - 1; bzApply(sh); renderMarkers(); } }
function veMove2(e, g){ const p = vePt(e), dx = p.x - g.p0.x, dy = p.y - g.p0.y; if (g.x2 === 'pcl'){ g.pts.push(p); VE.stroke = g.pts; veDraw(); return; }
if (!g.mode){ if (Math.hypot(dx, dy) < 5) return; g.mode = 'drag'; }
if (g.x2 === 'node'){ const it = VE.nd || VE.pen, sh = it.o, O = VE.orig[0].bz.n[g.i], n = sh.bz.n[g.i]; if (!O || !n) return; const off = q => { const c = veCp(q); return veBack({x:c.x + dx, y:c.y + dy}); };
if (g.k === 'p'){ n.p = off(O.p); n.a = O.a && off(O.a); n.b = O.b && off(O.b); }
else { n[g.k] = off(O[g.k]); const ok = g.k === 'a' ? 'b' : 'a'; if (n.s && O[ok]){ const c = veCp(n.p), hh = veCp(n[g.k]), o0 = veCp(O[ok]), len = Math.hypot(o0.x - c.x, o0.y - c.y), d = Math.hypot(hh.x - c.x, hh.y - c.y) || 1; n[ok] = veBack({x:c.x - (hh.x - c.x) / d * len, y:c.y - (hh.y - c.y) / d * len}); } }
bzApply(sh); veFrame(); return; }
if (g.x2 === 'pen' && VE.pen && VE.pen.o){ const sh = VE.pen.o, n = sh.bz.n[sh.bz.n.length - 1], c = veCp(n.p); n.b = veBack(p); n.a = sh.bz.n.length > 1 ? veBack({x:2 * c.x - p.x, y:2 * c.y - p.y}) : null; n.s = 1; bzApply(sh); veFrame(); } }
function veUp2(e, g){ VE.g = null;
if (g.x2 === 'node'){ if (!g.mode){ VE.orig = null; const it = VE.nd || VE.pen; if (VE.pen && g.i === 0 && g.k === 'p' && it.o.bz.n.length >= 3){ it.o.bz.c = true; bzApply(it.o); vePenEnd(); veDraw(); toast('Контур замкнут'); return; } VE.ndi = g.i; veDraw(); return; } veEnd(); return; }
if (g.x2 === 'pen'){ persist(); veDraw(); return; }
if (g.x2 === 'pcl'){ VE.stroke = null; vePclMake(g.pts); veDraw(); return; }
if (g.x2 === 'ndtap' && !g.mode) veNdTap(g.p0); }
// ======== ВЕКТОРНЫЙ РЕДАКТОР 4.3: СТИЛЬ ФИГУР, КОПИРОВАНИЕ СТИЛЯ, ИЗБРАННЫЕ СТИЛИ ========
const VST = {s:['color', 'sw', 'so', 'dash', 'arr', 'fill', 'op', 'hatch'], x:['f', 's', 'c', 'b', 'i', 'u', 'bg', 'sw', 'sc', 'al', 'lh', 'lsp', 'fr', 'shd'], tb:['f', 's', 'op', 'bd', 'hdr', 'al', 'pd', 'zb', 'bg', 'c', 'hbg']};
const vePick = (o, K) => { const r = {}; K.forEach(k => { if (o[k] !== undefined) r[k] = veCl(o[k]); }); return r; };
const veSetSt = (o, st, K) => K.forEach(k => { if (st[k] === undefined || st[k] === null || st[k] === '') delete o[k]; else o[k] = veCl(st[k]); });
const veFav = () => { try { return JSON.parse(localStorage.getItem('skat_vfav')) || []; } catch(e){ return []; } }, veFavSet = L1 => { try { localStorage.setItem('skat_vfav', JSON.stringify(L1)); } catch(e){} };
function veStApply(st){ const S = VE.sel.filter(s => s.t === 's'); if (S.length) S.forEach(s => veSetSt(s.o, st, VST.s)); else VE.st = Object.assign({}, st); persist(); renderMarkers(); }
function veStyle(){ const S = VE.sel.filter(s => s.t === 's'), base = S[0] ? S[0].o : VE.st, hex = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : '#e2533f'; let m = $('veStM');
if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'veStM'; m.innerHTML = '<div class="card big"><h3>Стиль</h3><div id="veStB"></div><div class="row"><button class="ghost" id="vsCp">Копировать стиль</button><button class="ghost" id="vsPs">Вставить стиль</button><button class="ghost" id="vsFv">★ В избранное</button><button class="primary" data-close>Готово</button></div></div>';
m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); const O = (L1, v) => L1.map(([k, t]) => `<option value="${k}"${(v || '') === k ? ' selected' : ''}>${t}</option>`).join('');
$('veStB').innerHTML = `<div class="cdv">${S.length ? `Фигур выбрано: ${S.length}` : 'Фигуры не выбраны — это стиль для новых линий (Перо, Карандаш)'}${VE.sel.some(s => s.t !== 's') ? '. Надписи и таблицы: «Копировать / Вставить стиль».' : ''}</div>
<div class="sub-h">Обводка</div><label class="f">Цвет<input type="color" id="vsC" value="${hex(base.color)}"></label><label class="f">Толщина: <b id="vsWv"></b><input type="range" id="vsW" min="0.5" max="16" step="0.5" value="${base.sw || 2.5}"></label>
<label class="f">Непрозрачность: <b id="vsSov"></b><input type="range" id="vsSo" min="10" max="100" step="5" value="${base.so ?? 95}"></label>
<label class="f">Линия<select id="vsD">${O([['', 'сплошная'], ['dash', 'штрих'], ['long', 'длинный штрих'], ['dot', 'точки'], ['dashdot', 'штрих-пунктир']], base.dash)}</select></label>
<label class="f">Стрелки (у линий)<select id="vsA">${O([['', 'нет'], ['end', 'в конце'], ['start', 'в начале'], ['both', 'с обеих сторон']], base.arr)}</select></label>
<div class="sub-h">Заливка</div><label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="vsFs" ${base.fill ? '' : 'checked'} style="width:20px;height:20px">как обводка</label><label class="f">Цвет заливки<input type="color" id="vsF" value="${hex(base.fill || base.color)}"></label>
<label class="f">Непрозрачность заливки: <b id="vsOpv"></b><input type="range" id="vsOp" min="0" max="100" step="5" value="${base.op ?? 35}"></label>
<label class="f">Штриховка<select id="vsH">${O([['', 'нет'], ['/', 'косая /'], ['\\', 'косая \\'], ['x', 'косая сетка'], ['-', 'горизонтальная'], ['|', 'вертикальная'], ['+', 'прямая сетка'], ['.', 'точки']], base.hatch)}</select></label>
<div class="sub-h">Избранные стили</div><div id="vsFav" class="vfav"></div>`;
const lab = () => { $('vsWv').textContent = String($('vsW').value).replace('.', ','); $('vsSov').textContent = $('vsSo').value + '%'; $('vsOpv').textContent = $('vsOp').value + '%'; };
const read = () => ({color:$('vsC').value, sw:+$('vsW').value, so:+$('vsSo').value === 95 ? '' : +$('vsSo').value, dash:$('vsD').value, arr:$('vsA').value, fill:$('vsFs').checked ? '' : $('vsF').value, op:+$('vsOp').value, hatch:$('vsH').value});
['vsC', 'vsW', 'vsSo', 'vsD', 'vsA', 'vsFs', 'vsF', 'vsOp', 'vsH'].forEach(id => $(id).addEventListener('input', () => { lab(); veStApply(read()); })); ['vsD', 'vsA', 'vsFs', 'vsH'].forEach(id => $(id).addEventListener('change', () => veStApply(read())));
const favR = () => { const F = veFav(); $('vsFav').innerHTML = F.length ? F.map((f, i) => `<span class="vfc"><button data-fi="${i}" style="border-left:6px solid ${f.st.color || '#888'}">${escapeHtml(f.n)}</button><button data-fd="${i}">✕</button></span>`).join('') : '<small>Пока пусто: настройте стиль и нажмите «★ В избранное».</small>';
$('vsFav').querySelectorAll('[data-fi]').forEach(b => b.onclick = () => { veStApply(veFav()[+b.dataset.fi].st); veStyle(); }); $('vsFav').querySelectorAll('[data-fd]').forEach(b => b.onclick = () => { const F1 = veFav(); F1.splice(+b.dataset.fd, 1); veFavSet(F1); favR(); }); };
$('vsFv').onclick = () => { const n = prompt('Название стиля', 'Стиль ' + (veFav().length + 1)); if (!n || !n.trim()) return; const F = veFav(); F.push({n:n.trim(), st:read()}); veFavSet(F); favR(); };
$('vsCp').onclick = () => { const s = VE.sel[0]; if (!s || !VST[s.t]){ VE.stClip = {t:'s', st:read()}; toast('Скопирован стиль фигуры'); return; } VE.stClip = {t:s.t, st:vePick(s.o, VST[s.t])}; toast('Стиль скопирован'); };
$('vsPs').onclick = () => { const c = VE.stClip; if (!c){ toast('Сначала «Копировать стиль»'); return; } const T = VE.sel.filter(s => s.t === c.t); if (!T.length){ if (c.t === 's' && !VE.sel.length){ VE.st = Object.assign({}, c.st); veStyle(); toast('Стиль для новых линий'); } else toast('Нет выбранных объектов того же вида'); return; }
T.forEach(s => veSetSt(s.o, c.st, VST[c.t])); persist(); renderMarkers(); veStyle(); toast(`Стиль вставлен: ${T.length}`); };
lab(); favR(); openModal('veStM'); }
{ const st = document.createElement('style'); st.textContent = '#veBar.nd>button,#veBar.nd>#veN,#veBar.nd #veAl{display:none!important}#veNdB{display:none;width:100%;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center}#veBar.nd #veNdB{display:flex}#veOv .vh{stroke:#1e90ff;stroke-width:1}#veOv .hs{fill:#1e90ff}#veOv .vstk{fill:none;stroke:#e2533f;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.vfav{display:flex;flex-wrap:wrap;gap:6px}.vfc{display:inline-flex}.vfc button{padding:5px 8px}.vfc button+button{padding:5px 7px;opacity:.7}'; document.head.appendChild(st); }
window.__mod_op = 1;
