// СКАТ — модуль «Оператор»: редактор надписей, печать JPEG, свойства знака. Грузится лениво из index.html (modLoad). Версия 6.2
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
$('prnInfo').textContent = `Лист ${w}×${h} мм, изображение ${W}×${H} пикс.${note} Печатается видимая на экране область.`; return [w, h, W, H]; }
function renderPrnUI(){ $('prnPaperSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.p === prnPaper)); $('prnOriSeg').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.o === prnOri));
$('prnCustom').style.display = prnPaper === 'U' ? '' : 'none'; $('prnOriSeg').style.display = prnPaper === 'U' ? 'none' : ''; prnInfo(); }
$('prnPaperSeg').querySelectorAll('button').forEach(b => b.onclick = () => { prnPaper = b.dataset.p; renderPrnUI(); });
$('prnOriSeg').querySelectorAll('button').forEach(b => b.onclick = () => { prnOri = b.dataset.o; renderPrnUI(); });
['prnW', 'prnH', 'prnDpi'].forEach(id => $(id).addEventListener('input', prnInfo));
$('prnBtn').onclick = () => { renderPrnUI(); openModal('prnModal'); };
async function tileBmp(u){ try { let b = savedKeys.has(u) ? await tileGetFast(u) : null; if (!b && navigator.onLine !== false) b = await netBlob(u); return b ? await createImageBitmap(b) : null; } catch(e){ return null; } }
$('prnGo').onclick = async () => {
const [wmm, hmm, W, H] = prnInfo(), k = W / (wmm / 25.4 * +$('prnDpi').value), dpi = +$('prnDpi').value * k, mm = v => v / 25.4 * dpi;
const title = $('prnTitle').value.trim(), legend = $('prnLeg').checked, grid = $('prnGrid').checked;
closeModals(); netMsg('Готовлю лист для печати…');
try {
const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
const mg = mm(8), th = title ? mm(11) : 0, fh = mm(7), ox0 = mg, oy0 = mg + th, ow = W - 2 * mg, oh = H - 2 * mg - th - fh, fb = grid ? mm(9) : 0, ix0 = ox0 + fb, iy0 = oy0 + fb, iw = ow - 2 * fb, ih = oh - 2 * fb;
let FRAME = null;
const Ws = map.getSize().x, Hs = map.getSize().y, c = map.getCenter(), a0 = map.containerPointToLatLng([Ws / 2 - 50, Hs / 2]), a1 = map.containerPointToLatLng([Ws / 2 + 50, Hs / 2]), mpp = distM(a0, a1) / 100;
let wm = Ws * mpp, hm = Hs * mpp; if (iw / ih > wm / hm) hm = wm * ih / iw; else wm = hm * iw / ih;
const def = LAYERS[state.layer], crs = crsOf(state.layer), z0 = map.getZoom();
let zt = Math.min(def.max, Math.max(Math.floor(z0), Math.round(z0 + Math.log2((wm / iw) > 0 ? mpp / (wm / iw) : 1))));
const pc = crs.latLngToPoint(c, zt); let mz = mpp * Math.pow(2, z0 - zt);
while (((wm / mz) / 256) * ((hm / mz) / 256) > 700 && zt > 3){ zt--; mz *= 2; }
const pc2 = crs.latLngToPoint(c, zt), hw = wm / mz / 2, hh = hm / mz / 2, bx0 = pc2.x - hw, by0 = pc2.y - hh, f = iw / (2 * hw);
const toC = ll => { const p = crs.latLngToPoint(L.latLng(ll), zt); return [ix0 + (p.x - bx0) * f, iy0 + (p.y - by0) * f]; };
g.save(); g.beginPath(); g.rect(ix0, iy0, iw, ih); g.clip(); g.fillStyle = '#e9ece6'; g.fillRect(ix0, iy0, iw, ih);
let miss = 0; const tx0 = Math.floor(bx0 / 256), tx1 = Math.floor((bx0 + 2 * hw) / 256), ty0 = Math.floor(by0 / 256), ty1 = Math.floor((by0 + 2 * hh) / 256), jobs = [];
for (const tpl of def.urls) for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) jobs.push([tpl, tx, ty]);
for (let q = 0; q < jobs.length; q += 8){ netMsg(`Готовлю лист: подложка ${Math.min(q + 8, jobs.length)} из ${jobs.length}…`);
const part = await Promise.all(jobs.slice(q, q + 8).map(async ([tpl, tx, ty]) => [tx, ty, await tileBmp(tpl.replace('{s}', 'abc'[(tx + ty) % 3]).replace('{x}', tx).replace('{y}', ty).replace('{z}', zt))]));
part.forEach(([tx, ty, bm]) => { if (bm) g.drawImage(bm, ix0 + (tx * 256 - bx0) * f, iy0 + (ty * 256 - by0) * f, 256 * f + 1, 256 * f + 1); else miss++; }); }
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
state.arrays.forEach(a => { if (a.hidden) return;
(a.shapes || []).forEach(sh => { const col = sh.color || a.style.color, pts = sh.type === 'circle' ? circlePoly(LL(sh.pts[0]), sh.r).map(q => [q[1], q[0]]) : sh.pts.map(q => [q[0] ?? q.lat, q[1] ?? q.lng]);
g.beginPath(); pts.forEach((q, i) => { const [px, py] = toC(q); i ? g.lineTo(px, py) : g.moveTo(px, py); }); if (sh.type !== 'line') g.closePath();
if (sh.type !== 'line'){ g.globalAlpha = (sh.op ?? 35) / 100; g.fillStyle = col; g.fill(); g.globalAlpha = 1; } g.strokeStyle = col; g.lineWidth = 2.5 * sc; g.stroke(); });
if (a.kind === 'route' && a.points.length > 1){ g.beginPath(); a.points.forEach((p, i) => { const [px, py] = toC([p.lat, p.lng]); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.strokeStyle = a.style.color; g.lineWidth = 3 * sc; g.stroke(); }
a.points.forEach((p, i) => { const [px, py] = toC([p.lat, p.lng]); if (px < ix0 || py < iy0 || px > ix0 + iw || py > iy0 + ih) return;
const st = styleOf(a, p), sid = p.sym === '_none' ? null : (p.sym || a.sym), lb = labelOf(a, i);
if (a.kind === 'aux'){ g.save(); g.translate(px, py); g.scale(sc, sc); g.beginPath(); TREE_PTS.forEach(([dx, dy], k2) => k2 ? g.lineTo(dx, dy) : g.moveTo(dx, dy)); g.closePath(); g.fillStyle = a.style.color; g.fill(); g.restore(); }
else if (a.fplan){ g.beginPath(); g.arc(px, py, 19 * sc, 0, 7); g.fillStyle = st.color; g.fill(); g.lineWidth = 2 * sc; g.strokeStyle = '#111'; g.stroke(); if (sid && SYM_BY[sid]){ g.save(); g.translate(px, py); g.scale(sc * .8, sc * .8); drawSym(g, sid, 0, 0, '#111', null); g.restore(); } }
else if (sid && SYM_BY[sid]){ const col = symCol(sid, sideOf(a, p), st.color); g.save(); g.translate(px, py); g.scale(sc, sc); if (p.rot) g.rotate(p.rot * Math.PI / 180); drawSym(g, sid, 0, 0, col, p.fc || a.fc); g.restore(); used.set(sid + '|' + col, [sid, col]); }
else { g.beginPath(); g.arc(px, py, 6 * sc, 0, 7); g.fillStyle = st.color; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2 * sc; g.stroke(); }
g.font = `${a.kind === 'aux' ? 'italic ' : ''}700 ${Math.round(12 * sc)}px sans-serif`; g.lineWidth = 3 * sc; g.strokeStyle = '#fff'; g.fillStyle = '#111'; g.strokeText(lb, px + 14 * sc, py - 10 * sc); g.fillText(lb, px + 14 * sc, py - 10 * sc); });
(a.tables || []).forEach(T => { if (T.hid) return; const [px, py] = toC([T.lat, T.lng]), rows = T.rows.slice(0, 40), nc = Math.min(10, Math.max(...rows.map(r => r.length))), fs = T.s * sc, ch = fs * 1.6;
g.font = `500 ${fs}px '${T.f}', sans-serif`; const cw = Array.from({length:nc}, (_, c) => Math.max(...rows.map(r => g.measureText(String(r[c] ?? '')).width)) + fs);
const tw = cw.reduce((x, y) => x + y, 0), th2 = ch * rows.length, x0 = px - tw / 2, y0 = py - th2 / 2;
if (T.bg){ g.globalAlpha = T.op ?? 1; g.fillStyle = T.bg; g.fillRect(x0, y0, tw, th2); g.globalAlpha = 1; }
rows.forEach((r, ri) => { let xx = x0; for (let c = 0; c < nc; c++){ g.font = `${ri === 0 && T.hdr ? 700 : 500} ${fs}px '${T.f}', sans-serif`; g.fillStyle = T.c; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(String(r[c] ?? ''), xx + fs / 2, y0 + ri * ch + ch / 2); if (T.bd){ g.strokeStyle = T.bd; g.lineWidth = (T.bw || 1) * sc; g.strokeRect(xx, y0 + ri * ch, cw[c], ch); } xx += cw[c]; } }); });
(a.texts || []).forEach(t => { if (t.hid) return; const [px, py] = toC([t.lat, t.lng]); g.save(); g.translate(px, py); g.rotate((t.r || 0) * Math.PI / 180); g.font = `${t.i ? 'italic ' : ''}${t.b ? 700 : 500} ${Math.round(t.s * sc)}px '${t.f}', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
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
const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92)); netMsg('');
if (!blob){ toast('Не хватило памяти — уменьшите формат или разрешение'); return; }
deliverFile(blob, `СКАТ_печать_${stamp()}.jpg`, `Лист готов: ${W}×${H} пикс.${miss ? ` Не загрузилось тайлов подложки: ${miss} (Яндекс в веб-версии не копируется — выберите Esri или Топо).` : ''}`);
} catch(e){ netMsg(''); toast('Не удалось подготовить лист: ' + (e.message || e)); }
};

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
window.__mod_op = 1;
