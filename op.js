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
if (sh.arr !== 'start') hd(C[C.length - 2], C[C.length - 1]); if (sh.arr !== 'end') hd(C[1], C[0]); } g.globalAlpha = 1;
if (sh.tp && sh.type !== 'circle' && pts.length > 1){ const C = pts.map(toC), fs = sh.tp.s * sc; g.save(); g.font = `700 ${fs}px "Roboto Condensed", sans-serif`; g.fillStyle = sh.tp.c; g.strokeStyle = '#fff'; g.lineWidth = 3 * sc; g.lineJoin = 'round'; const sg = []; let tot = 0; for (let i = 1; i < C.length; i++){ const l = Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]); sg.push(l); tot += l; }
let d = Math.max(0, (tot - g.measureText(sh.tp.t).width) / 2); const at = s => { let i = 0; while (i < sg.length - 1 && s > sg[i]){ s -= sg[i]; i++; } const A = C[i], B = C[i + 1], t = sg[i] ? Math.min(1, s / sg[i]) : 0; return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, Math.atan2(B[1] - A[1], B[0] - A[0])]; };
for (const ch of sh.tp.t){ const w = g.measureText(ch).width, [x, y, an] = at(d + w / 2); g.save(); g.translate(x, y); g.rotate(an); g.translate(0, -fs * .35); g.strokeText(ch, -w / 2, 0); g.fillText(ch, -w / 2, 0); g.restore(); d += w; } g.restore(); } });
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
function veAll(lk){ const out = [], z = map.getZoom(); state.arrays.forEach(a => { if (a.hidden) return; veT.forEach(t => (a[ARRK[t]] || []).forEach(o => { if (!o || o.hid || (o.lk && !lk) || !tagOk(a, o)) return; if ((t === 'p' || t === 's') && z < (a.minZ || 0)) return; out.push({a, t, o}); })); }); return out; }
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
function veEnd(){ VE.orig = null; VE.inf = ''; VE.snapMk = null; if (VE.sel.some(s => s.t === 's' && s.o.zn) && typeof planNum === 'function') state.arrays.forEach(L1 => { if (L1.fplan) L1.points.forEach(q => planNum(L1, q)); }); persist(); renderMarkers(); }
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
VE.svg.innerHTML = veGuidesSvg() + h; $('veN').textContent = VE.inf || `Выбрано: ${VE.sel.length}`; const nb = VE.bar.querySelector('#veNdB b'); if (nb && (VE.nd || VE.pen) && VE.ndi >= 0) nb.textContent = `${VE.pen ? 'Перо' : 'Узлы'}: ${VE.ndi + 1} из ${(VE.nd || VE.pen).o.bz.n.length}`; VE.bar.querySelector('[data-v="add"]').classList.toggle('on', VE.add); }
function veUI(){ if (VE.ov) return;
VE.ov = document.createElement('div'); VE.ov.id = 'veOv'; VE.ov.innerHTML = '<svg></svg>'; document.body.appendChild(VE.ov); VE.svg = VE.ov.firstChild;
VE.bar = document.createElement('div'); VE.bar.id = 'veBar'; VE.bar.className = 'glass';
VE.bar.innerHTML = '<b id="veN"></b><button data-v="all">Все</button><button data-v="add">＋ К выбору</button><button data-v="nd">Узлы</button><button data-v="st">Стиль</button><button data-v="pen">Перо</button><button data-v="pcl">Карандаш</button><button data-v="ex">Точность</button><button data-v="ob">Объекты</button><button data-v="tp">Текст по линии</button><button data-v="xch">SVG / PDF</button><button data-v="dup">Дубль</button><button data-v="copy">Копир.</button><button data-v="paste">Вставить</button><button data-v="grp">Группа</button><button data-v="ugrp">Разгруп.</button><button data-v="up">Выше</button><button data-v="dn">Ниже</button><button data-v="bu" title="Объединить">⊕ Объед.</button><button data-v="bd" title="Вычесть из первой выбранной">⊖ Вычесть</button><button data-v="bi" title="Пересечение">⊗ Пересеч.</button><button data-v="bx" title="Исключить общую часть">◫ Исключ.</button><button data-v="al">Выровнять ▾</button><button data-v="del" class="danger">Удалить</button><button data-v="x">✕</button>'
+ '<div id="veAl"><button data-v="al:l">⇤ Лево</button><button data-v="al:ch">⇹ Центр</button><button data-v="al:r">⇥ Право</button><button data-v="al:t">⤒ Верх</button><button data-v="al:cv">⇕ Середина</button><button data-v="al:b">⤓ Низ</button><button data-v="al:dh">↔ Распределить</button><button data-v="al:dv">↕ Распределить</button></div><div id="veNdB"></div>';
document.body.appendChild(VE.bar);
VE.bar.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const v = b.dataset.v;
if (v.startsWith('al:')) return veAlign(v.slice(3));
({all:() => { VE.sel = veAll(); veDraw(); }, add:() => { VE.add = !VE.add; veDraw(); }, dup:veDup, copy:veCopy, paste:vePaste, grp:veGroup, ugrp:veUngroup, up:() => veOrder(true), dn:() => veOrder(false), del:veDel, x:veOff,
al:() => $('veAl').classList.toggle('on'), nd:veNodes, st:veStyle, ex:veExact, bu:() => veBool('u'), bd:() => veBool('d'), bi:() => veBool('i'), bx:() => veBool('x'), ob:veObjs, tp:veTextPath, xch:veXch,
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
if (!g.mode){ if (Math.hypot(dx, dy) < 6) return; if (g.it){ if (!veHas(g.it)){ if (!g.add) VE.sel = []; veAddSel(veExpand(g.it)); } g.mode = 'move'; veBegin(); veSnapBegin(); } else g.mode = 'band'; }
if (g.mode === 'move'){ const [sx, sy] = veSnapMove(dx, dy); VE.inf = `Сдвиг ${Math.round(sx)}, ${Math.round(sy)} пикс.`; veApply(q => ({x:q.x + sx, y:q.y + sy}), 1, 0); }
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
if (!g.mode){ if (VE.pip && g.it){ vePipette(g.it); veDraw(); return; } if (g.it){ const ex = veExpand(g.it); if (g.add){ if (veHas(g.it)) VE.sel = VE.sel.filter(s => !ex.some(x => x.o === s.o)); else veAddSel(ex); } else VE.sel = ex; } else if (!g.add) VE.sel = []; veDraw(); return; }
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
VE.mr = map.getContainer().getBoundingClientRect(); VE.sel = [it]; veBegin(); veSnapBegin(it.o); VE.g = {id:e.pointerId, p0:vePt(e), x2:'node', i:+i, k, mode:null}; try { VE.ov.setPointerCapture(e.pointerId); } catch(_){} }
function veDown2(e){ const p = vePt(e), mc = map.getContainer(); VE.g = {id:e.pointerId, p0:p, x2:VE.pen ? 'pen' : VE.pcl ? 'pcl' : 'ndtap', pts:[p], mode:null}; try { mc.setPointerCapture(e.pointerId); } catch(_){}
if (VE.pen){ if (!VE.pen.o){ const it = veNewShape({c:false, n:[]}); Object.assign(VE.pen, it); } const sh = VE.pen.o; const ps = vePenSnap(p, sh); VE.g.p0 = {x:ps.x, y:ps.y}; sh.bz.n.push({p:veBack(ps), a:null, b:null, s:0}); VE.ndi = sh.bz.n.length - 1; bzApply(sh); renderMarkers(); } }
function veMove2(e, g){ const p = vePt(e), dx = p.x - g.p0.x, dy = p.y - g.p0.y; if (g.x2 === 'pcl'){ g.pts.push(p); VE.stroke = g.pts; veDraw(); return; }
if (!g.mode){ if (Math.hypot(dx, dy) < 5) return; g.mode = 'drag'; }
if (g.x2 === 'node'){ const it = VE.nd || VE.pen, sh = it.o, O = VE.orig[0].bz.n[g.i], n = sh.bz.n[g.i]; if (!O || !n) return; let ddx = dx, ddy = dy; if (g.k === 'p'){ const c0 = veCp(O.p), s = veSnapPt({x:c0.x + dx, y:c0.y + dy}); ddx = s.x - c0.x; ddy = s.y - c0.y; VE.snapMk = s.hit ? s : null; } const off = q => { const c = veCp(q); return veBack({x:c.x + ddx, y:c.y + ddy}); };
if (g.k === 'p'){ n.p = off(O.p); n.a = O.a && off(O.a); n.b = O.b && off(O.b); }
else { n[g.k] = off(O[g.k]); const ok = g.k === 'a' ? 'b' : 'a'; if (n.s && O[ok]){ const c = veCp(n.p), hh = veCp(n[g.k]), o0 = veCp(O[ok]), len = Math.hypot(o0.x - c.x, o0.y - c.y), d = Math.hypot(hh.x - c.x, hh.y - c.y) || 1; n[ok] = veBack({x:c.x - (hh.x - c.x) / d * len, y:c.y - (hh.y - c.y) / d * len}); } }
bzApply(sh); veFrame(); return; }
if (g.x2 === 'pen' && VE.pen && VE.pen.o){ const sh = VE.pen.o, n = sh.bz.n[sh.bz.n.length - 1], c = veCp(n.p); n.b = veBack(p); n.a = sh.bz.n.length > 1 ? veBack({x:2 * c.x - p.x, y:2 * c.y - p.y}) : null; n.s = 1; bzApply(sh); veFrame(); } }
function veUp2(e, g){ VE.g = null;
if (g.x2 === 'node'){ if (!g.mode){ VE.orig = null; const it = VE.nd || VE.pen; if (VE.pen && g.i === 0 && g.k === 'p' && it.o.bz.n.length >= 3){ it.o.bz.c = true; bzApply(it.o); vePenEnd(); veDraw(); toast('Контур замкнут'); return; } VE.ndi = g.i; veDraw(); return; } veEnd(); return; }
if (g.x2 === 'pen'){ VE.snapMk = null; persist(); veDraw(); return; }
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
// ======== ВЕКТОРНЫЙ РЕДАКТОР 4.4: ТОЧНОСТЬ (привязки, направляющие, размеры и координаты, окно «Объекты», текст по линии) ========
const veLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } }, veLSs = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
VE.snap = Object.assign({nd:true, gr:false, an:true}, veLS('skat_vsnap', {})); VE.guides = veLS('skat_vguides', []);
function veKeyLL(t, o){ if (t === 's'){ if (o.bz) return o.bz.n.map(n => n.p); if (o.type === 'circle') return [veLL(o.pts[0])]; return (o.pts || []).map(veLL); } return [[o.lat, o.lng]]; }
function veSnapBegin(skipO){ const H = new Map(), K = [], sz = map.getSize(), ins = q => q.x > -40 && q.y > -40 && q.x < sz.x + 40 && q.y < sz.y + 40; let n = 0;
state.arrays.forEach(a => { if (a.hidden) return; veT.forEach(t => (a[ARRK[t]] || []).forEach(o => { if (!o || o.hid) return; const mine = o === skipO || VE.sel.some(s => s.o === o);
veKeyLL(t, o).forEach(ll => { const q = veCp(ll); if (!ins(q)) return; if (mine){ if (K.length < 60) K.push({x:q.x, y:q.y}); return; } if (n++ > 6000) return; const k = Math.floor(q.x / 16) + ',' + Math.floor(q.y / 16); if (!H.has(k)) H.set(k, []); H.get(k).push({x:q.x, y:q.y}); }); })); });
VE.snH = H; VE.snK = K; }
function veGridStep(){ const c = map.getCenter(), r = GEO.toSK(c.lat, c.lng), p0 = map.latLngToContainerPoint(c), p1 = veCp(GEO.fromSK(r.x, r.y + 1000, r.zone)), pxm = Math.hypot(p1.x - p0.x, p1.y - p0.y) / 1000; return [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000].find(s => s * pxm >= 24) || 10000; }
function veGuideSeg(g){ const c = map.getCenter(), r = GEO.toSK(c.lat, c.lng, g.z); return g.k === 'x' ? [veCp(GEO.fromSK(g.v, r.y - 60000, g.z)), veCp(GEO.fromSK(g.v, r.y + 60000, g.z))] : [veCp(GEO.fromSK(r.x - 60000, g.v, g.z)), veCp(GEO.fromSK(r.x + 60000, g.v, g.z))]; }
function veSnapPt(q){ if (VE.snap.nd && VE.snH){ let best = null, bd = 11; const cx = Math.floor(q.x / 16), cy = Math.floor(q.y / 16);
for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) (VE.snH.get((cx + i) + ',' + (cy + j)) || []).forEach(t => { const d = Math.hypot(t.x - q.x, t.y - q.y); if (d < bd){ bd = d; best = t; } }); if (best) return {x:best.x, y:best.y, hit:1}; }
for (const g of VE.guides){ const [A, B] = veGuideSeg(g), dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy; if (!L2) continue; const t = ((q.x - A.x) * dx + (q.y - A.y) * dy) / L2, P = {x:A.x + t * dx, y:A.y + t * dy}; if (Math.hypot(P.x - q.x, P.y - q.y) < 9) return Object.assign(P, {hit:1}); }
if (VE.snap.gr){ const ll = map.containerPointToLatLng(L.point(q.x, q.y)), s = GEO.toSK(ll.lat, ll.lng), st = veGridStep(), P = veCp(GEO.fromSK(Math.round(s.x / st) * st, Math.round(s.y / st) * st, s.zone)); if (Math.hypot(P.x - q.x, P.y - q.y) < 14) return {x:P.x, y:P.y, hit:1}; }
return {x:q.x, y:q.y, hit:0}; }
function veSnapMove(dx, dy){ VE.snapMk = null; if (!VE.snK || !VE.snK.length) return [dx, dy]; let best = null, bd = 1e9;
for (const k of VE.snK){ const q = {x:k.x + dx, y:k.y + dy}, s = veSnapPt(q); if (s.hit){ const d = Math.hypot(s.x - q.x, s.y - q.y); if (d < bd){ bd = d; best = [s.x - q.x, s.y - q.y, s]; } } }
if (!best) return [dx, dy]; VE.snapMk = best[2]; return [dx + best[0], dy + best[1]]; }
function vePenSnap(p, sh){ veSnapBegin(sh); let s = veSnapPt(p); VE.snapMk = s.hit ? s : null; const N = sh.bz.n;
if (!s.hit && VE.snap.an && N.length){ const c = veCp(N[N.length - 1].p), dx = s.x - c.x, dy = s.y - c.y, r = Math.hypot(dx, dy), a = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12); s = {x:c.x + r * Math.cos(a), y:c.y + r * Math.sin(a)}; } return s; }
function veGuidesSvg(){ let h = ''; VE.guides.forEach(g => { const [A, B] = veGuideSeg(g); h += `<line class="vgd" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"/>`; }); if (VE.snapMk) h += `<path class="vsm" d="M${VE.snapMk.x - 7} ${VE.snapMk.y}h14M${VE.snapMk.x} ${VE.snapMk.y - 7}v14"/>`; return h; }
// ---- размеры и координаты выделенного (СК-42), привязки, направляющие
function veMet(){ let z = null, X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity;
VE.sel.forEach(s => { const L1 = s.t === 's' && s.o.type !== 'circle' ? (s.o.pts || []).map(veLL) : veKeyLL(s.t, s.o); L1.forEach(ll => { const k = GEO.toSK(ll[0], ll[1], z ?? undefined); if (z == null) z = k.zone; X0 = Math.min(X0, k.x); X1 = Math.max(X1, k.x); Y0 = Math.min(Y0, k.y); Y1 = Math.max(Y1, k.y); });
if (s.t === 's' && s.o.type === 'circle'){ const r = s.o.r || 0; X0 -= r; X1 += r; Y0 -= r; Y1 += r; } });
return z == null ? null : {z, X0, X1, Y0, Y1, Xc:(X0 + X1) / 2, Yc:(Y0 + Y1) / 2, W:Y1 - Y0, H:X1 - X0}; }
function veExact(){ let m = $('veExM'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'veExM'; m.innerHTML = '<div class="card big"><h3>Точность</h3><div id="veExB"></div><div class="row"><button class="primary" data-close>Готово</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); const M = VE.sel.length ? veMet() : null, n0 = v => Math.round(v), cb = (k, t) => `<label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" data-sn="${k}" ${VE.snap[k] ? 'checked' : ''} style="width:20px;height:20px">${t}</label>`;
let g1 = ''; if (VE.sel.length === 1 && VE.sel[0].t === 's'){ const sh = VE.sel[0].o, G = shapeGeo(sh); g1 = sh.type === 'line' ? `Длина ${fmtDist(G.len)}` : `Площадь ${fmtArea(G.area)} · ${sh.type === 'circle' ? 'окружность' : 'периметр'} ${fmtDist(G.per)}`; }
$('veExB').innerHTML = `<div class="sub-h">Привязки</div>${cb('nd', 'к узлам фигур и знакам')}${cb('gr', `к сетке СК-42 (сейчас шаг ${veGridStep()} м)`)}${cb('an', 'углы через 15° у пера')}
<div class="sub-h">Направляющие (${VE.guides.length})</div><div class="row"><button id="veGx">＋ Горизонталь</button><button id="veGy">＋ Вертикаль</button><button class="ghost" id="veG0">Убрать все</button></div><small>Проходят через центр выделения (или экрана) по линиям X / Y СК-42; к ним работает привязка.</small>
${M ? `<div class="sub-h">Выделено: ${VE.sel.length}${g1 ? ' · ' + g1 : ''}</div><div class="row"><label class="f">Центр X, м<input id="veEX" inputmode="numeric" value="${n0(M.Xc)}"></label><label class="f">Центр Y, м<input id="veEY" inputmode="numeric" value="${n0(M.Yc)}"></label></div>
<div class="row"><label class="f">Ширина (по Y), м<input id="veEW" inputmode="decimal" value="${n0(M.W)}"></label><label class="f">Высота (по X), м<input id="veEH" inputmode="decimal" value="${n0(M.H)}"></label></div>
<label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="veEP" checked style="width:20px;height:20px">пропорционально</label><label class="f">Повернуть на, °<input id="veER" inputmode="decimal" value="0"></label><div class="row"><button class="primary" id="veEA">Применить</button></div>` : '<div class="cdv">Выберите объекты, чтобы задать точные координаты, размеры и поворот.</div>'}`;
$('veExB').querySelectorAll('[data-sn]').forEach(c => c.onchange = () => { VE.snap[c.dataset.sn] = c.checked; veLSs('skat_vsnap', VE.snap); });
const gAdd = k => { const c = M ? [M.Xc, M.Yc, M.z] : (() => { const q = map.getCenter(), s = GEO.toSK(q.lat, q.lng); return [s.x, s.y, s.zone]; })(); VE.guides.push({k, v:Math.round(k === 'x' ? c[0] : c[1]), z:c[2]}); veLSs('skat_vguides', VE.guides); veDraw(); veExact(); };
$('veGx').onclick = () => gAdd('x'); $('veGy').onclick = () => gAdd('y'); $('veG0').onclick = () => { VE.guides = []; veLSs('skat_vguides', VE.guides); veDraw(); veExact(); };
if (!M) { openModal('veExM'); return; }
const sync = src => { if (!$('veEP').checked) return; const k = src === 'W' ? (+$('veEW').value.replace(',', '.') / M.W) : (+$('veEH').value.replace(',', '.') / M.H); if (!isFinite(k) || k <= 0) return; if (src === 'W' && M.H) $('veEH').value = n0(M.H * k); if (src === 'H' && M.W) $('veEW').value = n0(M.W * k); };
$('veEW').oninput = () => sync('W'); $('veEH').oninput = () => sync('H');
$('veEA').onclick = () => { const num = id => +String($(id).value).replace(',', '.').replace(/\s/g, ''), Xc = num('veEX'), Yc = num('veEY'), W = num('veEW'), H = num('veEH'), deg = num('veER') || 0;
if (![Xc, Yc, W, H].every(isFinite)){ toast('Проверьте числа'); return; } const sy = M.W > .5 ? W / M.W : 1, sx = M.H > .5 ? H / M.H : 1; if (sx <= 0 || sy <= 0){ toast('Размеры должны быть больше нуля'); return; }
const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
veBegin(); veApply(q => { const ll = map.containerPointToLatLng(L.point(q.x, q.y)), s = GEO.toSK(ll.lat, ll.lng, M.z); let u = (s.y - M.Yc) * sy, v = -(s.x - M.Xc) * sx; const u2 = u * cs - v * sn, v2 = u * sn + v * cs; return veCp(GEO.fromSK(Xc - v2, Yc + u2, M.z)); }, Math.sqrt(sx * sy), veNorm(deg));
veEnd(); toast('Применено'); veExact(); };
openModal('veExM'); }
// ---- окно «Объекты»: выбор, видимость, блокировка (заблокированные не выделяются на карте)
function veObjs(){ let m = $('veObM'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'veObM'; m.innerHTML = '<div class="card big"><h3>Объекты</h3><div id="veObB" style="max-height:60vh;overflow:auto"></div><div class="row"><button class="primary" data-close>Готово</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); let h = '';
state.arrays.forEach(a => { const its = layItems(a).filter(x => veT.includes(x.t)); if (!its.length) return; h += `<div class="sub-h">${escapeHtml(a.name)}${a.hidden ? ' (скрыт)' : ''} · ${its.length}</div>` + its.slice(0, 400).map(x => `<div class="kid${x.o.hid ? ' off' : ''}" data-k="${a.id}|${x.t}|${x.i}"><span class="kn" data-a="sel">${x.o.g ? '▣ ' : ''}${escapeHtml(x.n)}</span><button class="eye" data-a="lk" title="Блокировка">${x.o.lk ? '🔒' : '🔓'}</button><button class="eye" data-a="hid">${x.o.hid ? EYE_OFF : EYE_ON}</button></div>`).join(''); });
$('veObB').innerHTML = h || '<div class="empty">Объектов нет</div>';
$('veObB').querySelectorAll('.kid').forEach(r => r.onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; const [aid, t, i] = r.dataset.k.split('|'), a = arrById(+aid), o = a && a[ARRK[t]][+i]; if (!o) return;
if (b.dataset.a === 'lk'){ if (o.lk) delete o.lk; else o.lk = 1; VE.sel = VE.sel.filter(s => s.o !== o); persist(); veObjs(); veDraw(); return; }
if (b.dataset.a === 'hid'){ if (o.hid) delete o.hid; else o.hid = true; persist(); renderMarkers(); veObjs(); return; }
if (o.hid || o.lk || a.hidden){ toast('Объект скрыт или заблокирован'); return; } const ll = veKeyLL(t, o)[0]; if (ll) map.panTo(ll); VE.sel = [{a, t, o}]; m.classList.remove('open'); if (!VE.on) veOn(); setTimeout(veDraw, 300); });
openModal('veObM'); }
function veTextPath(){ const s = VE.sel.length === 1 && VE.sel[0].t === 's' ? VE.sel[0].o : null; if (!s || s.type === 'circle'){ toast('Выберите одну линию или контур'); return; }
const v = prompt('Текст вдоль линии (пусто — убрать). Текст идёт от первой точки линии к последней', s.tp ? s.tp.t : ''); if (v === null) return;
if (!v.trim()) delete s.tp; else { const z = prompt('Размер шрифта, пикс.', s.tp ? s.tp.s : 14); if (z === null) return; s.tp = {t:v.trim(), s:Math.max(6, Math.min(60, +z || 14)), c:(s.tp && s.tp.c) || s.color || '#111111'}; }
persist(); renderMarkers(); }
// ======== ВЕКТОРНЫЙ РЕДАКТОР 4.5: ОБМЕН — ЭКСПОРТ SVG, ПЕЧАТЬ / PDF, ИМПОРТ SVG ========
const veX = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function veMpp(){ const s = map.getSize(); return map.distance(map.containerPointToLatLng([s.x / 2, s.y / 2]), map.containerPointToLatLng([s.x / 2 + 100, s.y / 2])) / 100 || 1; }
function veSvgBuild(items){ if (!items.length) return null; const l0 = veKeyLL(items[0].t, items[0].o)[0], z = GEO.toSK(l0[0], l0[1]).zone, S = ll => GEO.toSK(ll[0], ll[1], z), mpp = veMpp(), f = v => +(+v).toFixed(2);
let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity; const ext = (s, r) => { X0 = Math.min(X0, s.x - r); X1 = Math.max(X1, s.x + r); Y0 = Math.min(Y0, s.y - r); Y1 = Math.max(Y1, s.y + r); };
items.forEach(it => { if (it.t === 's' && it.o.type === 'circle') ext(S(veLL(it.o.pts[0])), it.o.r || 0); else (it.t === 's' ? (it.o.pts || []).map(veLL) : veKeyLL(it.t, it.o)).forEach(ll => ext(S(ll), 0)); });
const pad = 80 * mpp; X0 -= pad; X1 += pad; Y0 -= pad; Y1 += pad; const W = Y1 - Y0, H = X1 - X0, P = ll => { const s = S(ll); return [f(s.y - Y0), f(X1 - s.x)]; };
const css = getComputedStyle(document.documentElement), sg = parseFloat(css.getPropertyValue('--sg')) || 33, lf = parseFloat(css.getPropertyValue('--lf')) || 12; const defs = []; let body = '', pid = 0;
items.forEach(it => { const {a, t, o} = it;
if (t === 's'){ const col = o.color || a.style.color, sw = (o.sw || 2.5) * mpp, D = SH_DASH[o.dash], fc = o.fill || col, ln = o.type === 'line'; let fill = ln ? 'none' : fc, fop = ln ? 0 : (o.op ?? 35) / 100;
if (!ln && o.hatch && SH_HATCH[o.hatch]){ const id = 'h' + defs.length; defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${f(10 * mpp)}" height="${f(10 * mpp)}"><path d="${SH_HATCH[o.hatch]}" transform="scale(${f(mpp)})" ${o.hatch === '.' ? `fill="${fc}"` : `stroke="${fc}" stroke-width="1.6" fill="none"`}/></pattern>`); fill = `url(#${id})`; fop = 1; }
const st = `stroke="${col}" stroke-width="${f(sw)}" stroke-opacity="${o.so != null ? o.so / 100 : .95}" fill="${fill}" fill-opacity="${fop}"${D ? ` stroke-dasharray="${D.map(v => f(v * sw)).join(' ')}"` : ''}${D && o.dash !== 'dash' && o.dash !== 'long' ? ' stroke-linecap="round"' : ''} stroke-linejoin="round"`;
if (o.type === 'circle'){ const c = P(veLL(o.pts[0])); body += `<circle cx="${c[0]}" cy="${c[1]}" r="${f(o.r || 0)}" ${st}/>`; return; }
const Q = (o.pts || []).map(q => P(veLL(q))); if (Q.length < 2) return; const id = 'p' + (++pid); body += `<path id="${id}" d="M${Q.map(q => q.join(' ')).join('L')}${ln ? '' : 'Z'}" ${st}/>`;
if (ln && o.arr){ const L0 = (6 + 3.2 * (o.sw || 2.5)) * mpp, W0 = (3 + 1.6 * (o.sw || 2.5)) * mpp, hd = (A, B) => { const d = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / d, uy = (B[1] - A[1]) / d, bx = B[0] - ux * L0, by = B[1] - uy * L0; body += `<path d="M${B[0]} ${B[1]}L${f(bx - uy * W0)} ${f(by + ux * W0)}L${f(bx + uy * W0)} ${f(by - ux * W0)}Z" fill="${col}"/>`; };
if (o.arr !== 'start') hd(Q[Q.length - 2], Q[Q.length - 1]); if (o.arr !== 'end') hd(Q[1], Q[0]); }
if (o.tp) body += `<text font-family="Roboto Condensed, sans-serif" font-weight="700" font-size="${f(o.tp.s * mpp)}" fill="${o.tp.c}" stroke="#fff" stroke-width="${f(3 * mpp)}" paint-order="stroke" dy="${f(-o.tp.s * .35 * mpp)}"><textPath href="#${id}" xlink:href="#${id}" startOffset="50%" text-anchor="middle">${veX(o.tp.t)}</textPath></text>`; return; }
if (t === 'x'){ const [x, y] = P([o.lat, o.lng]), fs = (o.s || 14) * mpp, ls = String(o.t).split('\n'), lh = (o.lh || 1.15) * fs, an = {left:'start', right:'end'}[o.al] || 'middle';
body += `<text x="${x}" y="${y}" font-family="${veX(o.f || 'Roboto Condensed')}, sans-serif" font-size="${f(fs)}" font-weight="${o.b ? 700 : 500}"${o.i ? ' font-style="italic"' : ''} fill="${o.c || '#111'}" text-anchor="${an}"${o.r ? ` transform="rotate(${o.r} ${x} ${y})"` : ''}${o.sw && o.sc ? ` stroke="${o.sc}" stroke-width="${f(2 * o.sw * mpp)}" paint-order="stroke" stroke-linejoin="round"` : ''}>${ls.map((l, i) => `<tspan x="${x}" dy="${f(i ? lh : -(ls.length - 1) * lh / 2 + fs * .35)}">${veX(l)}</tspan>`).join('')}</text>`; return; }
if (t === 'tb'){ const [x, y] = P([o.lat, o.lng]), fs = (o.s || 12) * mpp, pd = (o.pd ?? 2) * mpp, rows = (o.rows || []).slice(0, 40), nc = Math.max(1, ...rows.map(r => r.length)), cw = Array.from({length:nc}, (_, j) => Math.max(...rows.map(r => String(r[j] ?? '').length), 1) * fs * .56 + pd * 6), rh = fs * 1.35 + pd * 2, TW = cw.reduce((p, v) => p + v, 0), TH = rh * rows.length, x0 = x - TW / 2, y0 = y - TH / 2, bd = o.bd || '';
body += `<g font-family="${veX(o.f || 'Roboto Condensed')}, sans-serif" font-size="${f(fs)}" fill="${o.c || '#111'}">${o.bg ? `<rect x="${f(x0)}" y="${f(y0)}" width="${f(TW)}" height="${f(TH)}" fill="${o.bg}" fill-opacity="${o.op ?? 1}"/>` : ''}`;
rows.forEach((r, ri) => { let cx = x0; for (let j = 0; j < nc; j++){ if (bd) body += `<rect x="${f(cx)}" y="${f(y0 + ri * rh)}" width="${f(cw[j])}" height="${f(rh)}" fill="none" stroke="${bd}" stroke-width="${f(mpp)}"/>`; body += `<text x="${f(cx + pd * 3)}" y="${f(y0 + ri * rh + rh / 2 + fs * .35)}"${ri === 0 && o.hdr ? ' font-weight="700"' : ''}>${veX(r[j] ?? '')}</text>`; cx += cw[j]; } }); body += '</g>'; return; }
if (t === 'p'){ const [x, y] = P([o.lat, o.lng]), col = styleOf(a, o).color, sid = o.sym || a.sym, sz = sg * mpp, sv = sid && sid !== '_none' ? symSvg(sid) : '', i = a.points.indexOf(o);
body += `<g color="${col}" style="color:${col}"${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''}>${sv.startsWith('<svg') ? sv.replace('<svg', `<svg x="${f(x - sz / 2)}" y="${f(y - sz / 2)}" width="${f(sz)}" height="${f(sz)}"`) : `<circle cx="${x}" cy="${y}" r="${f(sz * .22)}" fill="${col}" stroke="#fff" stroke-width="${f(mpp * 1.5)}"/>`}</g>`;
if (i >= 0) body += `<text x="${x}" y="${f(y + sz * .5 + lf * mpp * 1.1)}" font-family="Roboto Condensed, sans-serif" font-size="${f(lf * mpp)}" font-weight="700" text-anchor="middle" fill="${col}" stroke="#fff" stroke-width="${f(2.5 * mpp)}" paint-order="stroke">${veX(labelOf(a, i))}</text>`; } });
return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${f(W)} ${f(H)}" width="${Math.round(W / mpp)}" height="${Math.round(H / mpp)}">\n<metadata id="skat-geo">${JSON.stringify({v:1, z, X1:f(X1), Y0:f(Y0), unit:'м СК-42'})}</metadata>\n<defs>${defs.join('')}</defs>\n${body}\n</svg>`; }
function veXItems(all){ const L1 = all ? veAll(true) : VE.sel.slice(); if (!L1.length) toast(all ? 'Нет видимых объектов' : 'Ничего не выбрано'); return L1; }
function veSvgSave(all){ const L1 = veXItems(all); if (!L1.length) return; const s = veSvgBuild(L1); deliverFile(new Blob([s], {type:'image/svg+xml'}), `СКАТ_${all ? 'обстановка' : 'выделенное'}_${stamp()}.svg`, `SVG готов: объектов ${L1.length}`); }
function veSvgPrint(all){ const L1 = veXItems(all); if (!L1.length) return; if (typeof window.print !== 'function'){ toast('Печать недоступна — сохраните SVG'); return; }
const d = document.createElement('div'); d.id = 'vePrint'; d.innerHTML = veSvgBuild(L1).replace(/^<\?xml[^>]*>\s*/, ''); const sv = d.querySelector('svg'); sv.removeAttribute('width'); sv.removeAttribute('height'); sv.style.cssText = 'width:100%;height:auto;max-height:100%';
const st = document.createElement('style'); st.id = 'vePrintCss'; st.textContent = '#vePrint{display:none}@media print{body>*:not(#vePrint){display:none!important}#vePrint{display:block!important}@page{margin:10mm}}'; document.head.appendChild(st); document.body.appendChild(d);
const done = () => { d.remove(); st.remove(); removeEventListener('afterprint', done); }; addEventListener('afterprint', done); document.querySelectorAll('.modal.open').forEach(x => x.classList.remove('open'));
setTimeout(() => { try { window.print(); } catch(e){ toast('Печать недоступна — сохраните SVG'); } setTimeout(done, 60000); }, 300); }
const veHex = c => { if (!c || c === 'none' || c === 'transparent') return null; const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return /^#/.test(c) ? c : null; const v = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); if (v.length > 3 && v[3] === 0) return null; return '#' + v.slice(0, 3).map(x => Math.round(x).toString(16).padStart(2, '0')).join(''); };
async function veSvgImport(file){ let txt; try { txt = await file.text(); } catch(e){ toast('Файл не читается'); return; }
const doc = new DOMParser().parseFromString(txt, 'image/svg+xml'), root = doc.documentElement; if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')){ toast('Это не SVG'); return; }
const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-30000px;top:0;width:1200px;height:1200px;visibility:hidden;pointer-events:none'; const sv = document.importNode(root, true); host.appendChild(sv); document.body.appendChild(host);
const raw = []; let meta = null; try { const md = sv.querySelector('metadata#skat-geo'); if (md) meta = JSON.parse(md.textContent); } catch(e){}
try { const bb = sv.getBBox(), diag = Math.hypot(bb.width, bb.height) || 100, R = sv.getScreenCTM().inverse();
const els = [...sv.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse,text')].filter(el => el.closest('svg') === sv && !el.closest('defs,pattern,marker,clipPath,mask,symbol,metadata') && !el.querySelector('textPath')).slice(0, 3000);
for (const el of els){ const M = R.multiply(el.getScreenCTM()), k = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1, cs = getComputedStyle(el), tg = el.nodeName.toLowerCase();
if (tg === 'text'){ const tx = el.textContent.trim(); if (!tx) continue; const b = el.getBBox(), q = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(M); raw.push({k:'x', t:tx, q, fs:(parseFloat(cs.fontSize) || 12) * k, c:veHex(cs.fill) || '#111111', b:+cs.fontWeight >= 600}); continue; }
let len = 0; try { len = el.getTotalLength(); } catch(e){} if (!len) continue; const step = Math.max(len / 500, diag / 400), N = Math.min(800, Math.ceil(len / step)), parts = []; let cur = [], prev = null;
for (let j = 0; j <= N; j++){ const p0 = el.getPointAtLength(Math.min(len, j * len / N)), q = new DOMPoint(p0.x, p0.y).matrixTransform(M); if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) > step * k * 3){ if (cur.length > 1) parts.push(cur); cur = []; } cur.push({x:q.x, y:q.y}); prev = q; }
if (cur.length > 1) parts.push(cur); const st = veHex(cs.stroke), fl = veHex(cs.fill), cl0 = /^(polygon|rect|circle|ellipse)$/.test(tg) || (tg === 'path' && /z\s*$/i.test((el.getAttribute('d') || '').trim()));
if (!st && !fl) continue; parts.forEach(P => { const cl = cl0 && Math.hypot(P[0].x - P[P.length - 1].x, P[0].y - P[P.length - 1].y) < step * k * 2; let Q = veRdp(P, diag / 1500); if (cl && Q.length > 3) Q.pop(); if (Q.length < 2) return;
raw.push({k:'s', Q, cl:cl && Q.length > 2, st, fl, sw:(st ? parseFloat(cs.strokeWidth) || 1 : 1) * k, fo:+cs.fillOpacity * (+cs.opacity || 1)}); }); } }
catch(e){ toast('Ошибка чтения SVG: ' + (e.message || e)); } finally { host.remove(); }
if (!raw.length){ toast('В SVG не найдено линий и текстов'); return; }
let toLL, px; const mpp = veMpp();
if (meta && meta.z){ toLL = q => { const g = GEO.fromSK(meta.X1 - q.y, meta.Y0 + q.x, meta.z); return [+(+g[0]).toFixed(7), +(+g[1]).toFixed(7)]; }; px = v => v / mpp; }
else { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; raw.forEach(r => (r.k === 's' ? r.Q : [r.q]).forEach(q => { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }));
const s = map.getSize(), kk = Math.min(.6 * s.x / Math.max(1e-6, x1 - x0), .6 * s.y / Math.max(1e-6, y1 - y0)), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; toLL = q => veBack({x:s.x / 2 + (q.x - cx) * kk, y:s.y / 2 + (q.y - cy) * kk}); px = v => v * kk; }
const a = normArr({id:Date.now(), kind:'shapes', name:'Импорт SVG ' + String(file.name || '').replace(/\.svg$/i, '').slice(0, 30), ident:'Импорт SVG', style:{color:'#111111', name:'Чёрный', glyph:''}, points:[], shapes:[], texts:[]}); state.arrays.push(a); const nw = [];
raw.forEach(r => { if (r.k === 'x'){ const q = toLL(r.q), o = {t:r.t, lat:q[0], lng:q[1], s:Math.max(6, Math.min(80, Math.round(px(r.fs)))), c:r.c, f:'Roboto Condensed', b:r.b, al:'center'}; a.texts.push(o); nw.push({a, t:'x', o}); return; }
const o = {type:r.cl ? 'poly' : 'line', pts:r.Q.map(toLL), color:r.st || r.fl, sw:Math.max(.5, Math.min(16, Math.round(px(r.sw) * 2) / 2)), op:r.cl && r.fl ? Math.round(Math.min(1, r.fo || 1) * 100) : 0, t:Date.now()}; if (r.fl && r.st && r.fl !== r.st) o.fill = r.fl; if (!r.st) o.sw = 1;
a.shapes.push(o); nw.push({a, t:'s', o}); });
persist(); renderMarkers(); if (!VE.on) veOn(); VE.sel = nw; veDraw(); toast(`Импортировано: ${nw.length}${meta ? ' (на исходные координаты)' : ' — размещено в центре экрана, подгоните рамкой'}`); }
function veXch(){ let m = $('veXM'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'veXM'; m.innerHTML = '<div class="card"><h3>SVG / PDF</h3><div id="veXB"></div><div class="row"><button class="primary" data-close>Готово</button></div><input type="file" id="veXIn" accept=".svg,image/svg+xml" style="display:none"></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); const n = VE.sel.length;
$('veXB').innerHTML = `<div class="sub-h">Экспорт SVG (векторный, координаты в метрах СК-42)</div><div class="row"><button data-x="sv1"${n ? '' : ' disabled'}>Выделенное (${n})</button><button data-x="sv2">Всё видимое</button></div>
<div class="sub-h">Печать / PDF</div><div class="row"><button data-x="pr1"${n ? '' : ' disabled'}>Выделенное</button><button data-x="pr2">Всё видимое</button></div><small>Откроется печать: выберите «Сохранить как PDF» (на iPhone — «Поделиться» в окне печати). В APK печати нет — сохраните SVG.</small>
<div class="sub-h">Импорт SVG</div><div class="row"><button data-x="imp">Открыть файл SVG</button></div><small>Линии, фигуры и тексты станут объектами нового слоя. SVG, выгруженный из СКАТ, встанет на свои координаты.</small>`;
$('veXB').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { const x = b.dataset.x; if (x === 'imp'){ $('veXIn').click(); return; } m.classList.remove('open'); if (x === 'sv1') veSvgSave(false); else if (x === 'sv2') veSvgSave(true); else if (x === 'pr1') veSvgPrint(false); else veSvgPrint(true); });
$('veXIn').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f){ m.classList.remove('open'); veSvgImport(f); } };
openModal('veXM'); }
{ const st = document.createElement('style'); st.textContent = '#veOv .vgd{stroke:#00b3c7;stroke-width:1;stroke-dasharray:8 5}#veOv .vsm{stroke:#e0287d;stroke-width:2.5;fill:none}'; document.head.appendChild(st); }
// ======== РАБОЧЕЕ МЕСТО ОПЕРАТОРА (6.31): инструменты слева (#lrail), свойства сверху (#veBar), палитра снизу (#opPal) ========
const OPW = {on:false, t:'hand', mode:'f', ids:new WeakMap(), n:0, key:''};
const OPW_T = [['sel', 'Выбор', '<path d="M5 3l14 8-6 2-3 6z"/>'], ['nd', 'Узлы', '<path d="M4 18C8 6 16 18 20 6"/><rect x="2.5" y="16.5" width="3" height="3"/><rect x="18.5" y="4.5" width="3" height="3"/>'], ['hand', 'Карта', '<path d="M8 13V5a1.5 1.5 0 013 0v6M11 11V4a1.5 1.5 0 013 0v7M14 11V5.5a1.5 1.5 0 013 0V14c0 4-3 7-7 7s-6-3-7-6l-1-3a1.5 1.5 0 012.6-1.4L8 14"/>'],
['line', 'Линия', '<path d="M4 20L20 4"/>'], ['rect', 'Прямоуг.', '<rect x="4" y="6" width="16" height="12"/>'], ['circle', 'Круг', '<circle cx="12" cy="12" r="8"/>'], ['poly', 'Многоуг.', '<path d="M12 3l8 6-3 10H7L4 9z"/>'],
['pen', 'Перо', '<path d="M12 3l5 9-5 9-5-9z"/><circle cx="12" cy="12" r="1.5"/>'], ['pcl', 'Карандаш', '<path d="M4 20l1-5L16 4l4 4L9 19z"/>'], ['text', 'Текст', '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'], ['tbl', 'Таблица', '<rect x="3" y="5" width="18" height="14"/><path d="M3 10h18M3 14h18M9 5v14M15 5v14"/>'],
['sym', 'Знак', '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.8 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'], ['pip', 'Пипетка', '<path d="M14 4l6 6-2 2-6-6zM12 8l-7 7v4h4l7-7"/>']];
const OPW_C = ['#000000', '#ffffff', '#7f7f7f', '#d62020', '#e2533f', '#ff8a2a', '#ffd400', '#8b5a2b', '#2e8b57', '#58c472', '#1e5bd8', '#3a7bd5', '#00a0b0', '#7b3fa0'];
function opwSync(){ const on = secMode === 'op'; document.body.classList.toggle('opws', on); OPW.on = on; if (!$('opTb')) opwUI(); $('opTb').style.display = on ? '' : 'none'; $('opPal').style.display = on ? 'flex' : 'none'; if ($('veBtn')) $('veBtn').style.display = on ? 'none' : (secMode === 'op' ? '' : 'none'); if (!on) return; opwMark(); }
function opwUI(){ const tb = document.createElement('div'); tb.id = 'opTb'; tb.innerHTML = OPW_T.map(([k, n, ic]) => `<button class="rb ot" data-ot="${k}" title="${n}"><svg viewBox="0 0 24 24">${ic}</svg>${n}</button>`).join(''); $('lrail').prepend(tb);
tb.onclick = e => { const b = e.target.closest('[data-ot]'); if (b) opwTool(b.dataset.ot); };
const p = document.createElement('div'); p.id = 'opPal'; p.className = 'glass'; document.body.appendChild(p); opwPal();
p.addEventListener('click', e => { if (OPW.lp){ OPW.lp = 0; return; } const b = e.target.closest('[data-pc]'); if (b){ opwColor(b.dataset.pc, OPW.mode); return; } const m = e.target.closest('[data-pm]'); if (m){ OPW.mode = m.dataset.pm; opwPal(); } });
p.addEventListener('contextmenu', e => { const b = e.target.closest('[data-pc]'); if (b){ e.preventDefault(); opwColor(b.dataset.pc, 's'); } });
p.addEventListener('pointerdown', e => { const b = e.target.closest('[data-pc]'); if (!b) return; clearTimeout(OPW.lt); OPW.lt = setTimeout(() => { OPW.lp = 1; opwColor(b.dataset.pc, OPW.mode === 'f' ? 's' : 'f'); }, 480); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => p.addEventListener(ev, () => clearTimeout(OPW.lt)));
p.addEventListener('input', e => { if (e.target.id === 'opPc'){ OPW.cust = e.target.value; } });
p.addEventListener('change', e => { if (e.target.id === 'opPc'){ const L1 = veLS('skat_opcol', []); if (!L1.includes(e.target.value)){ L1.unshift(e.target.value); veLSs('skat_opcol', L1.slice(0, 8)); } opwPal(); opwColor(e.target.value, OPW.mode); } });
const st = document.createElement('style'); st.textContent = '#opTb{display:flex;flex-direction:column;gap:6px}#opTb .rb.on{color:var(--signal);background:var(--acc-soft);border-color:var(--signal)}'
+ '#opPal{position:fixed;left:0;right:0;bottom:var(--sheet-h,0px);z-index:1040;display:none;align-items:center;gap:6px;padding:7px 10px calc(var(--safe-b) + 7px);border-radius:16px 16px 0 0;overflow-x:auto;-webkit-overflow-scrolling:touch}body.picking #opPal{display:none!important}'
+ '#opPal .pm{display:flex;flex:none;gap:0}#opPal .pm button{min-height:34px;padding:0 10px;border-radius:0;font-size:13px}#opPal .pm button:first-child{border-radius:999px 0 0 999px}#opPal .pm button:last-child{border-radius:0 999px 999px 0}#opPal .pm button.on{background:var(--ink);color:var(--panel)}'
+ '#opPal [data-pc]{flex:none;width:32px;height:32px;min-height:0;padding:0;border-radius:50%;border:2px solid var(--line2)}#opPal [data-pc="none"]{background:linear-gradient(135deg,transparent 45%,#d62020 45% 55%,transparent 55%),var(--panel)}#opPal .sep{flex:none;width:1px;height:26px;background:var(--line)}#opPal input[type=color]{flex:none;width:34px;height:34px;padding:0;border:0;background:none}'
+ 'body.opws #veBar{top:calc(var(--safe-t) + var(--tg) + 66px);bottom:auto;left:74px;right:74px;transform:none;max-width:none;flex-wrap:nowrap;overflow-x:auto;justify-content:flex-start;border-radius:14px;padding:6px 8px}body.opws #veBar>*{flex:none}body.opws #veBar [data-v="nd"],body.opws #veBar [data-v="pen"],body.opws #veBar [data-v="pcl"],body.opws #veBar [data-v="x"]{display:none}body.opws #veAl,body.opws #veNdB{position:fixed;left:74px;right:74px;top:calc(var(--safe-t) + var(--tg) + 118px);width:auto;padding:6px;background:var(--glass);border:1px solid var(--line);border-radius:14px}'
+ '#veCtx{display:flex;gap:4px;align-items:center;flex:none;padding-right:6px;margin-right:4px;border-right:1px solid var(--line)}#veCtx:empty{display:none}#veCtx button{min-height:34px;padding:0 9px}#veCtx button.on{background:var(--acc-soft);color:var(--signal);border-color:var(--signal)}#veCtx select{min-height:34px;border-radius:10px;border:1px solid var(--line2);background:var(--panel);color:var(--ink);padding:0 6px;font-size:13px}#veCtx b{min-width:26px;text-align:center}';
document.head.appendChild(st); }
function opwPal(){ const my = veLS('skat_opcol', []); $('opPal').innerHTML = `<div class="pm"><button data-pm="f" class="${OPW.mode === 'f' ? 'on' : ''}">■ Заливка</button><button data-pm="s" class="${OPW.mode === 's' ? 'on' : ''}">□ Обводка</button></div><button data-pc="none" title="Без цвета"></button>`
+ OPW_C.concat(my).map(c => `<button data-pc="${c}" style="background:${c}" title="${c}"></button>`).join('') + `<span class="sep"></span><input type="color" id="opPc" value="${OPW.cust || '#ff8a2a'}" title="Свой цвет"><small style="flex:none;color:var(--mute)">удержание — ${OPW.mode === 'f' ? 'обводка' : 'заливка'}</small>`; }
function opwColor(c, m){ const none = c === 'none', S = (VE.sel || []).filter(s => s.t !== 'p'); let n = 0;
if (!S.length){ if (VE.sel && VE.sel.length){ toast('Цвет знака задаёт сторона — меняйте в свойствах знака'); return; } if (m === 'f'){ if (none) VE.st.op = 0; else { VE.st.fill = c; if (!(VE.st.op > 0)) VE.st.op = 35; } } else { if (none) VE.st.so = 0; else { VE.st.color = c; delete VE.st.so; } } toast('Цвет для новых линий'); return; }
S.forEach(s => { const o = s.o; n++;
if (s.t === 's'){ if (m === 'f'){ if (none){ o.op = 0; delete o.fill; delete o.hatch; } else { o.fill = c; if (!(o.op > 0)) o.op = 35; } } else { if (none) o.so = 0; else { o.color = c; if (o.so === 0) delete o.so; } } }
else if (s.t === 'x'){ if (m === 'f'){ if (!none) o.c = c; } else { if (none) o.sw = 0; else { o.sc = c; o.sw = +o.sw || 2; } } }
else if (s.t === 'tb'){ if (m === 'f'){ if (none) delete o.bg; else o.bg = c; } else { if (none) delete o.bd; else o.bd = c; } } });
persist(); renderMarkers(); toast(`${m === 'f' ? 'Заливка' : 'Обводка'}: ${n}`); }
function opwMark(){ document.querySelectorAll('#opTb [data-ot]').forEach(b => b.classList.toggle('on', b.dataset.ot === OPW.t)); }
function opwTool(k){ const prev = OPW.t; OPW.t = k; VE.pip = false; if (typeof tool !== 'undefined' && tool.on && !['line', 'rect', 'circle', 'poly'].includes(k)) closeTools();
if (VE.on && (VE.pen || VE.pcl || VE.nd) && k !== 'nd') veModeEnd();
if (k === 'sel'){ veOn(); }
else if (k === 'nd'){ veOn(); if (VE.sel.length === 1 && VE.sel[0].t === 's') veNodes(); else { toast('Выберите фигуру, затем «Узлы»'); OPW.t = 'sel'; } }
else if (k === 'hand'){ veOff(); }
else if (['line', 'rect', 'circle', 'poly'].includes(k)){ veOff(); if (!tool.on) openTools(null); tool.mode = k; drawTool(); renderTool(); toast('Касайтесь карты, чтобы ставить точки'); }
else if (k === 'pen' || k === 'pcl'){ veOn(); VE.bar.querySelector(`[data-v="${k}"]`).click(); }
else if (k === 'text'){ veOff(); textPending = {target:null}; toast('Коснитесь карты там, где поставить надпись'); OPW.t = 'hand'; }
else if (k === 'tbl'){ veOff(); tblPending = {target:null}; $('tbAddIn').click(); OPW.t = 'hand'; }
else if (k === 'sym'){ veOff(); addTarget = null; addPick('obj'); OPW.t = 'hand'; }
else if (k === 'pip'){ veOn(); VE.pip = true; VE.pipSel = VE.sel.slice(); toast(VE.pipSel.length ? 'Коснитесь объекта-образца — его стиль получит выделенное' : 'Коснитесь объекта — стиль будет скопирован'); }
opwMark(); }
function vePipette(src){ const K = VST[src.t]; VE.pip = false; OPW.t = 'sel'; opwMark(); if (!K){ toast('У знаков нет стиля для копирования'); return; } const st = vePick(src.o, K); VE.stClip = {t:src.t, st};
const T = (VE.pipSel || []).filter(s => s.t === src.t && s.o !== src.o); if (!T.length){ VE.sel = [src]; veDraw(); toast('Стиль скопирован (вставка — «Стиль» → «Вставить стиль»)'); return; }
T.forEach(s => veSetSt(s.o, st, K)); VE.sel = T; persist(); renderMarkers(); toast(`Стиль применён: ${T.length}`); }
// ---- контекстные свойства в верхней панели
function opwCtx(){ if (!VE.bar) return; let c = $('veCtx'); if (!c){ c = document.createElement('span'); c.id = 'veCtx'; VE.bar.insertBefore(c, VE.bar.children[1] || null); c.addEventListener('click', opwCtxAct); c.addEventListener('change', opwCtxAct); }
const id = o => { if (!OPW.ids.has(o)) OPW.ids.set(o, ++OPW.n); return OPW.ids.get(o); }, S = VE.sel, ty = [...new Set(S.map(s => s.t))], key = S.map(s => id(s.o)).join(',') + '|' + (VE.nd || VE.pen || VE.pcl ? 'm' : '');
if (key === OPW.key && !OPW.dirty) return; OPW.key = key; OPW.dirty = 0; if (!S.length || VE.nd || VE.pen || VE.pcl || ty.length !== 1){ c.innerHTML = ''; return; }
const o = S[0].o, O = (L1, v) => L1.map(([k, t]) => `<option value="${k}"${(v || '') === k ? ' selected' : ''}>${t}</option>`).join(''), on = v => v ? ' class="on"' : '';
if (ty[0] === 'x') c.innerHTML = `<select data-c="f">${O(FONTS.map(f => [f[0], f[1]]), o.f)}</select><button data-c="s-">−</button><b>${o.s || 14}</b><button data-c="s+">＋</button><button data-c="b"${on(o.b)}><b>Ж</b></button><button data-c="i"${on(o.i)}><i>К</i></button><button data-c="u"${on(o.u)}><u>Ч</u></button><button data-c="al:left"${on(o.al === 'left')}>⇤</button><button data-c="al:center"${on(!o.al || o.al === 'center')}>≡</button><button data-c="al:right"${on(o.al === 'right')}>⇥</button><button data-c="ed">✎ Текст</button>`;
else if (ty[0] === 's') c.innerHTML = `<span style="color:var(--mute);font-size:13px">Толщина</span><button data-c="w-">−</button><b>${String(o.sw || 2.5).replace('.', ',')}</b><button data-c="w+">＋</button><select data-c="dash">${O([['', 'сплошная'], ['dash', 'штрих'], ['long', 'длинный'], ['dot', 'точки'], ['dashdot', 'штрих-пункт.']], o.dash)}</select>${o.type === 'line' ? `<select data-c="arr">${O([['', 'без стрелок'], ['end', 'стрелка →'], ['start', '← стрелка'], ['both', '↔']], o.arr)}</select>` : `<select data-c="hatch">${O([['', 'без штриховки'], ['/', '/ косая'], ['\\', '\\ косая'], ['x', 'сетка ×'], ['-', '— гориз.'], ['|', '| верт.'], ['+', '+ сетка'], ['.', '· точки']], o.hatch)}</select>`}`;
else if (ty[0] === 'tb') c.innerHTML = `<span style="color:var(--mute);font-size:13px">Шрифт</span><button data-c="s-">−</button><b>${o.s || 12}</b><button data-c="s+">＋</button>`;
else c.innerHTML = ''; }
function opwCtxAct(e){ const b = e.target.closest('[data-c]'); if (!b || (e.type === 'click' && b.tagName === 'SELECT')) return; const k = b.dataset.c, S = VE.sel;
if (k === 'ed'){ const s = S[0]; if (s) openTextEd(s.a, s.a.texts.indexOf(s.o)); return; }
S.forEach(({t, o}) => { if (k === 's-' || k === 's+') o.s = Math.max(6, Math.min(120, (o.s || (t === 'tb' ? 12 : 14)) + (k === 's+' ? 1 : -1)));
else if (k === 'w-' || k === 'w+') o.sw = Math.max(.5, Math.min(16, (o.sw || 2.5) + (k === 'w+' ? .5 : -.5)));
else if (k === 'b' || k === 'i' || k === 'u'){ if (S[0].o[k]) delete o[k]; else o[k] = true; }
else if (k.startsWith('al:')) o.al = k.slice(3);
else if (['f', 'dash', 'arr', 'hatch'].includes(k)){ if (b.value) o[k] = b.value; else delete o[k]; } });
OPW.dirty = 1; persist(); renderMarkers(); }
{ const d0 = veDraw; window.veDraw = function(){ d0(); if (OPW.on) opwCtx(); }; }
opwSync();
// ======== ВЕКТОРНЫЙ РЕДАКТОР: БУЛЕВЫ ОПЕРАЦИИ (6.32) — Грайнер–Хорманн в плоских метрах, дырки — «замочной скважиной» ========
function bPip(p, R){ let ins = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++){ const a = R[i], b = R[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
function bArea(R){ let s = 0; for (let i = 0, j = R.length - 1; i < R.length; j = i++) s += (R[j][0] + R[i][0]) * (R[j][1] - R[i][1]); return s / 2; }
function bList(R){ const N = R.map(p => ({x:p[0], y:p[1], it:false})); N.forEach((n, i) => { n.next = N[(i + 1) % N.length]; n.prev = N[(i - 1 + N.length) % N.length]; }); return N; }
function bIns(a, b, n){ let c = a; while (c.next !== b && c.next.it && c.next.al < n.al) c = c.next; n.next = c.next; n.prev = c; c.next.prev = n; c.next = n; }
// op: 'i' пересечение, 'u' объединение, 'd' A − B. Возвращает массив колец или null, если границы не пересекаются
function ghClip(A, B, op){ const SA = bList(A), SB = bList(B); let cnt = 0;
for (const a of SA) for (const b of SB){ const a2 = a.next.it ? (() => { let c = a.next; while (c.it) c = c.next; return c; })() : a.next, b2 = (() => { let c = b.next; while (c.it) c = c.next; return c; })();
const d = (b2.y - b.y) * (a2.x - a.x) - (b2.x - b.x) * (a2.y - a.y); if (Math.abs(d) < 1e-12) continue;
const ua = ((b2.x - b.x) * (a.y - b.y) - (b2.y - b.y) * (a.x - b.x)) / d, ub = ((a2.x - a.x) * (a.y - b.y) - (a2.y - a.y) * (a.x - b.x)) / d;
if (ua <= 0 || ua >= 1 || ub <= 0 || ub >= 1) continue; const x = a.x + ua * (a2.x - a.x), y = a.y + ua * (a2.y - a.y);
const n1 = {x, y, it:true, al:ua}, n2 = {x, y, it:true, al:ub}; n1.nb = n2; n2.nb = n1; bIns(a, a2, n1); bIns(b, b2, n2); cnt++; }
if (!cnt) return null;
const mark = (L0, R, e0) => { let e = e0, c = L0; do { if (c.it){ c.en = e; e = !e; } c = c.next; } while (c !== L0); };
const a0 = SA[0], b0 = SB[0], inA = bPip([a0.x, a0.y], B), inB = bPip([b0.x, b0.y], A);
mark(a0, B, op === 'i' ? !inA : op === 'u' ? inA : inA); mark(b0, A, op === 'i' ? !inB : op === 'u' ? inB : !inB);
const out = [], all = []; { let c = a0; do { if (c.it) all.push(c); c = c.next; } while (c !== a0); }
for (const st of all){ if (st.vis) continue; const R = []; let c = st, guard = 0;
do { c.vis = true; c.nb.vis = true; R.push([c.x, c.y]); const fw = c.en;
do { c = fw ? c.next : c.prev; if (!c.it) R.push([c.x, c.y]); } while (!c.it && guard++ < 1e5); c = c.nb; } while (!c.vis && guard++ < 1e5);
if (R.length > 2) out.push(R); } return out; }
function bKey(outer, hole){ if (Math.sign(bArea(outer)) === Math.sign(bArea(hole))) hole = hole.slice().reverse(); let bi = 0, bj = 0, bd = Infinity; outer.forEach((p, i) => hole.forEach((q, j) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd){ bd = d; bi = i; bj = j; } }));
return outer.slice(0, bi + 1).concat(hole.slice(bj), hole.slice(0, bj + 1), outer.slice(bi)); }
function bNest(R){ R = R.filter(r => r.length > 2 && Math.abs(bArea(r)) > 1e-6); const outer = R.filter(r => !R.some(o => o !== r && Math.abs(bArea(o)) > Math.abs(bArea(r)) && bPip(r[0], o)));
return outer.map(o => R.filter(h => h !== o && !outer.includes(h) && bPip(h[0], o)).reduce((acc, h) => bKey(acc, h), o)); }
function bOp(A, B, op){ // A, B — кольца; результат — список внешних колец (дырки вшиты)
const r = ghClip(A, B, op); if (r) return bNest(r);
const aInB = bPip(A[0], B), bInA = bPip(B[0], A);
if (op === 'i') return aInB ? [A] : bInA ? [B] : [];
if (op === 'u') return aInB ? [B] : bInA ? [A] : [A, B];
return aInB ? [] : bInA ? [bKey(A, B)] : [A]; }
function veBool(op){ const S = VE.sel.filter(s => s.t === 's' && s.o.type !== 'line'); if (S.length < 2){ toast('Выберите две и более замкнутые фигуры'); return; }
const o0 = S[0].o, c0 = veLL(o0.pts[0]), k = Math.cos(c0[0] * Math.PI / 180) * 111320, P = ll => [(ll[1] - c0[1]) * k, (ll[0] - c0[0]) * 110574], Q = p => [+(c0[0] + p[1] / 110574).toFixed(7), +(c0[1] + p[0] / k).toFixed(7)];
const ring = o => { if (o.type === 'circle'){ const c = P(veLL(o.pts[0])), r = o.r || 1; return Array.from({length:72}, (_, i) => [c[0] + r * Math.cos(i * Math.PI / 36), c[1] + r * Math.sin(i * Math.PI / 36)]); } return (o.pts || []).map(q => P(veLL(q))); };
const jit = R => R.map(p => [p[0] + (Math.random() - .5) * 1e-4, p[1] + (Math.random() - .5) * 1e-4]);
let res;
try { if (op === 'x'){ if (S.length !== 2){ toast('«Исключить» — ровно для двух фигур'); return; } const A = ring(S[0].o), B = jit(ring(S[1].o)); res = bOp(A, B, 'd').concat(bOp(B, A, 'd')); }
else { res = [ring(S[0].o)]; for (const s of S.slice(1)){ const B = jit(ring(s.o)); if (op === 'u'){ let acc = B; const rest = []; res.forEach(R => { const u = bOp(R, acc, 'u'); if (u.length === 1) acc = u[0]; else rest.push(R); }); res = rest.concat([acc]); }
else res = res.flatMap(R => bOp(R, B, op)); } } } catch(e){ toast('Не удалось: ' + (e.message || e)); return; }
res = res.filter(R => R.length > 2 && Math.abs(bArea(R)) > 0.5);
if (!res.length){ toast(op === 'i' ? 'Фигуры не пересекаются — результат пуст' : 'Результат пуст'); return; }
const a = S[0].a, base = veCl(o0); ['pts', 'bz', 'r', 'tp', 'zn', 'id'].forEach(x => delete base[x]); base.type = 'poly';
const idx = a.shapes.indexOf(o0); S.forEach(s => { const arr = s.a.shapes, i = arr.indexOf(s.o); if (i >= 0) arr.splice(i, 1); });
const nw = res.map(R => Object.assign(veCl(base), {pts:R.map(Q), t:Date.now()})); a.shapes.splice(Math.max(0, Math.min(idx, a.shapes.length)), 0, ...nw);
VE.sel = nw.map(o => ({a, t:'s', o})); persist(); renderMarkers();
toast({u:'Объединено', d:'Вычтено из первой выбранной', i:'Пересечение', x:'Исключено (общая часть убрана)'}[op] + (nw.length > 1 ? `: фигур ${nw.length}` : '') + '. ↶ — отменить'); }
window.__mod_op = 1;
