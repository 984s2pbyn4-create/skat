// СКАТ — модуль «Боевой контур»: корректировка огня (панель), План ОЗ (окна, выгрузка Excel), правка зон, точки встречи. Грузится лениво из index.html (modLoad). Версия 6.16
// ======== БОЕВОЙ КОНТУР: КОРРЕКТИРОВКА ОГНЯ ========
const corrL = L.layerGroup().addTo(map);
function sysTof(sys, d){ const k = SYS[sys] || SYS.d30; return Math.max(2, d / k.v * (k.hi ? 2 : 1.25)); }
const BOOM = n => `<div class="boomic"><svg viewBox="0 0 32 32"><path d="M16 2l3 8 7-4-3 8 8 2-8 3 4 7-8-3-3 8-3-8-8 3 4-7-8-3 8-2-3-8 7 4z" fill="#ff7a1a" stroke="#ffd400" stroke-width="1.5"/><circle cx="16" cy="16" r="5" fill="#ffd400"/></svg>${n != null ? `<b>${n}</b>` : ''}</div>`;
function corrDraw(){ corrL.clearLayers(); [...new Set([CT, ...(typeof mixOn !== 'undefined' && mixOn ? mixTasks() : [])])].filter(Boolean).forEach(corrDraw1); }
function corrDraw1(CT){
if (CT.gun) corrL.addLayer(L.marker([CT.gun.lat, CT.gun.lng], {interactive:false, icon:L.divIcon({className:'plc-wrap', iconSize:[0,0], html:'<div class="ctgun">▲</div>'})}));
if (CT.tgt) corrL.addLayer(L.marker([CT.tgt.lat, CT.tgt.lng], {interactive:false, icon:L.divIcon({className:'plc-wrap', iconSize:[0,0], html:'<div class="cttgt">⊕</div>'})}));
if (CT.gun && CT.tgt) corrL.addLayer(L.polyline([[CT.gun.lat, CT.gun.lng], [CT.tgt.lat, CT.tgt.lng]], {color:'#ff8a2a', weight:2, dashArray:'6 6', interactive:false}));
(CT.bursts || []).forEach(b => corrL.addLayer(L.marker([b.lat, b.lng], {interactive:false, icon:L.divIcon({className:'plc-wrap', iconSize:[0,0], html:BOOM(b.n)})})));
corrFly.forEach(f => { if (f.task !== CT) return; if (f.pts) corrL.addLayer(L.polyline(f.pts, {color:'#ffd400', weight:2, opacity:.8, interactive:false})); if (f.pos){ const q1 = map.latLngToContainerPoint(f.pos), q2 = map.latLngToContainerPoint(f.pts[Math.min(30, (f.idx || 0) + 1)]), ang = Math.atan2(q2.y - q1.y, q2.x - q1.x) * 180 / Math.PI, pk = projOf(f.sys || 'd30');
corrL.addLayer(L.marker(f.pos, {interactive:false, icon:L.divIcon({className:'plc-wrap', iconSize:[0,0], html:`<div class="proj ${pk}" style="transform:translate(-50%,-50%) rotate(${ang.toFixed(0)}deg)">${PROJ[pk]}</div>`})})); } if (false && f.pos) corrL.addLayer(L.circleMarker(f.pos, {radius:4, color:'#111', weight:1, fillColor:'#ffd400', fillOpacity:1, interactive:false})); }); }
// ---- учёт выстрелов задачи: номер по порядку (отменённый номер отдаётся следующему выстрелу), итог по боеприпасам
const RES_N = {hit:'в цель', dev:'отклонение', nobs:'не набл.', mis:'осечка'};
function shotStats(t){ const s = {shots:0, n:0, hit:0, dev:0, nobs:0, mis:0, wait:0}; (t.shots || []).forEach(x => { s.shots++; s.n += x.n || 1; if (x.res) s[x.res] += x.n || 1; else if (x.landed) s.wait += x.n || 1; }); return s; }
const statTxt = s => `Выстрелов ${s.shots}, снарядов ${s.n}: в цель ${s.hit} · откл. ${s.dev} · не набл. ${s.nobs} · осечка ${s.mis}${s.wait ? ' · ждут отметки ' + s.wait : ''}`;
const pendShot = t => (t.shots || []).find(x => x.landed && !x.res);
let corrEnd = false, corrMore = false;
function corrPanel(){ const el = $('corr'); if (!CT){ el.classList.remove('on'); return; } el.classList.add('on'); const sys = SYS[CT.sys] || SYS.d30, last = (CT.bursts || []).slice(-1)[0];
const d = CT.gun && CT.tgt ? distM(CT.gun, CT.tgt) : 0, mx = CT.maxOv || sys.max, far = d && mx && d > mx, ps = pendShot(CT), st = shotStats(CT), nextNo = (CT.reuse && CT.reuse.length) ? Math.min(...CT.reuse) : (CT.shotN || 0) + 1;
let dv = ''; if (last && CT.gun && CT.tgt){ const v = corrDev(last), dd = Math.round(Math.hypot(v.dN, v.dE)); dv = `<div class="cdv"><b>Разрыв ${last.n}:</b> ${devTxt(v)} (${dd} м${dd > 50 ? ', отклонение' : ', в цель'})</div>`; }
el.innerHTML = `<div class="crow"><b>Цель ${escapeHtml(CT.name || '…')}${CT.obj ? ' · ' + escapeHtml(CT.obj) : ''}${CT.res ? ' · ' + escapeHtml(CT.res) : ''}</b><button data-c="more" title="Подробнее">${corrMore ? '▴' : 'ⓘ'}</button><button data-c="x">✕</button></div>
<div class="crow"><button data-c="fire" class="primary" ${CT.gun && CT.tgt && !far ? '' : 'disabled'}>▶ №${nextNo}</button><button data-c="stop" id="corrStopB" ${corrFly.some(f => f.task === CT) ? '' : 'disabled'}>■</button><button data-c="un" ${(CT.bursts || []).length ? '' : 'disabled'} title="Убрать разрыв">↶</button><button data-c="gun" class="${corrPick === 'gun' ? 'on' : ''}">Ор.${CT.gun ? '✓' : ''}</button><button data-c="tgt" class="${corrPick === 'tgt' ? 'on' : ''}">Цель${CT.tgt ? '✓' : ''}</button></div>
<div class="ctm" id="corrTm"></div>${dv}
${ps ? `<div class="crow"><button data-c="nobs">Не набл. №${ps.no}</button><button data-c="mis">Осечка №${ps.no}</button></div>` : ''}
${corrEnd ? `<div class="crow"><button data-c="r1" class="primary">Уничтожена</button><button data-c="r2" class="primary">Подавлена</button><button data-c="r0">Отмена</button></div>` : ''}
${corrMore ? `<div class="crow"><select data-c="sig"><option value="">сигнал —</option>${sigList().map(s => `<option value="${escapeHtml(s.n)}"${s.n === CT.sig ? ' selected' : ''}>${escapeHtml(s.n)}</option>`).join('')}</select></div><div class="crow"><select data-c="sys">${sysOpts(CT.sys)}</select>${sys.rs ? `<select data-c="rs">${[1, 2, 4, 8, 12, 20, sys.rs].filter((v, i, ar) => v <= sys.rs && ar.indexOf(v) === i).map(v => `<option value="${v}"${v === (CT.rs || 4) ? ' selected' : ''}>${v} РС</option>`).join('')}</select>` : ''}</div>
${d ? `<div class="cdv"${far ? ' style="color:#ff6b5a"' : ''}>Д ${fmtDist(d)} · подлёт ${sysTof(CT.sys, d).toFixed(1)} с${mx ? ' · макс. ' + fmtDist(mx) : ''}${far ? ' — вне досягаемости' : ''}</div>` : '<div class="cdv">Выберите орудие и цель</div>'}
${faLine(CT)}${st.shots ? `<div class="cdv">${statTxt(st)}</div>` : ''}
<div class="crow"><button data-c="end" ${st.shots ? '' : 'disabled'}>✔ Итог</button><button data-c="xfer" ${CT.tgt ? '' : 'disabled'}>⇪ Передать</button></div>` : (far ? '<div class="cdv" style="color:#ff6b5a">Цель вне досягаемости</div>' : '')}`;
el.classList.toggle('mini', !corrMore);
corrTimer();
el.querySelectorAll('[data-c]').forEach(b => { const c = b.dataset.c; if (b.tagName === 'SELECT') b.onchange = () => { if (c === 'sys') CT.sys = b.value; else if (c === 'sig') CT.sig = b.value; else if (c === 'am') CT.ammoT = b.value; else CT.rs = +b.value; persist(); corrPanel(); };
else b.onclick = () => { if (c === 'x'){ CT = null; corrPick = null; corrEnd = false; corrDraw(); corrPanel(); return; } if (c === 'stop'){ corrStop(); return; } if (c === 'gun'){ pickGun(CT); return; } if (c === 'tgt'){ pickTgt(CT); return; }
if (c === 'nobs' || c === 'mis'){ const p = pendShot(CT); if (p){ p.res = c; persist(); corrPanel(); } return; }
if (c === 'more'){ corrMore = !corrMore; corrPanel(); return; } if (c === 'end'){ corrEnd = true; corrPanel(); return; } if (c === 'xfer'){ xferSend(xferText(CT)); return; } if (c === 'r0'){ corrEnd = false; corrPanel(); return; }
if (c === 'r1' || c === 'r2'){ CT.res = c === 'r1' ? 'Уничтожена' : 'Подавлена'; CT.done = Date.now(); corrEnd = false; logFromTask(CT); corrPanel(); toast(`Цель ${CT.name || ''} ${CT.res.toLowerCase()}. ${statTxt(shotStats(CT))}`, 6000); return; }
if (c === 'un'){ const b0 = CT.bursts.pop(), sh = b0 && (CT.shots || []).find(x => x.no === b0.n && (x.res === 'hit' || x.res === 'dev')); if (sh) sh.res = null; persist(); corrDraw(); corrPanel(); return; } if (c === 'fire') corrFire(); }; }); }
// разрыв по касанию: привязка к первому упавшему неотмеченному выстрелу, «в цель» — до 50 м
function corrMark(ll){ const p = pendShot(CT), b = {lat:+ll.lat.toFixed(7), lng:+ll.lng.toFixed(7), n:p ? p.no : (CT.bursts.length ? Math.max(...CT.bursts.map(x => x.n)) + 1 : 1), t:Date.now()};
CT.bursts.push(b); if (p && CT.tgt) p.res = distM(b, CT.tgt) > 50 ? 'dev' : 'hit'; try { navigator.vibrate && navigator.vibrate(20); } catch(e){} }
function newTask(){ let id0 = Date.now(); while (state.ftasks.some(x => x.id === id0)) id0++; const t = {id:id0, name:'', sys:'d30', rs:4, bursts:[]}; state.ftasks.push(t); persist(); return t; }
$('corrBtn').onclick = () => { if (CT){ CT = null; corrEnd = false; corrDraw(); corrPanel(); return; } CT = newTask(); corrDraw(); corrPanel(); pickGun(CT); };
function corrTap(ll){ const h = hitPoint(...(() => { const q = map.latLngToContainerPoint(ll), r = map.getContainer().getBoundingClientRect(); return [q.x + r.left, q.y + r.top, corrPick === 'tgt' ? 48 : 30]; })()), at = h && h.i != null ? {lat:h.a.points[h.i].lat, lng:h.a.points[h.i].lng} : {lat:ll.lat, lng:ll.lng};
if (corrPick === 'gun'){ CT.gun = at; if (h && h.i != null){ CT.gname = labelOf(h.a, h.i); const k = itKind(h.a, h.a.points[h.i]); CT.sys = k === 'mortar' ? 'm120' : k === 'rszo' ? 'grad' : k === 'tank' ? 'tank' : k === 'sau' ? 'sau' : CT.sys; } corrPick = CT.tgt ? null : 'tgt'; if (corrPick) toast('Коснитесь цели'); }
else if (corrPick === 'tgt'){ if (CT.tgt){ const prev = CT; CT = newTask(); CT.gun = prev.gun; CT.sys = prev.sys; CT.rs = prev.rs; CT.gname = prev.gname; } CT.tgt = at; { const sid0 = h && h.i != null ? (h.a.points[h.i].sym || h.a.sym) : null; let c0 = catOfSym(sid0); if (!c0){ c0 = catOfTxt(prompt('Характер цели (например: живая сила, миномёт, танк, РЭБ, ПВО)', '')) || 1; } CT.cat = c0; CT.name = tgtNo(at.lat, at.lng, c0, CT); } if (h && h.i != null) CT.obj = labelOf(h.a, h.i); corrPick = null; toast(`Цель ${CT.name}${CT.obj ? ' — ' + CT.obj : ''}. Разрывы считаются с 1`); }
else corrMark(ll);
persist(); corrDraw(); corrPanel(); }
function arcPts(g, t, k){ const out = [], [kx, ky] = mk(g.lat), dx = (t.lng - g.lng) * kx, dy = (t.lat - g.lat) * ky, D = Math.hypot(dx, dy) || 1, nx = -dy / D, ny = dx / D, bow = D * (k ? .18 : .1);
for (let i = 0; i <= 30; i++){ const u = i / 30, o = 4 * bow * u * (1 - u); out.push([g.lat + (dy * u + ny * o) / ky, g.lng + (dx * u + nx * o) / kx]); } return out; }
function corrFire(T){ if (T || CT) corrFire1(T || CT); }
function corrFire1(CT){ const sys = SYS[CT.sys] || SYS.d30, d = distM(CT.gun, CT.tgt);
const mx = CT.maxOv || sys.max; if (mx && d > mx){ toast(`Цель вне досягаемости: ${fmtDist(d)}, у ${CT.gname || sys.n} максимум ${fmtDist(mx)}`); return; }
const tof = sysTof(CT.sys, d), n = sys.rs ? Math.min(sys.rs, Math.max(1, +CT.rs || 4)) : 1, pts = arcPts(CT.gun, CT.tgt, sys.hi), t0 = performance.now() / 1000;
CT.shots = CT.shots || []; CT.reuse = CT.reuse || []; let no; if (CT.reuse.length){ no = Math.min(...CT.reuse); CT.reuse = CT.reuse.filter(x => x !== no); } else no = CT.shotN = (CT.shotN || 0) + 1;
const shot = {no, n, sys:CT.sys, t:Date.now()}; CT.shots.push(shot); CT.shots.sort((x, y) => x.no - y.no); persist();
shot.am = faUse(CT, n) || null; persist();
for (let i = 0; i < n; i++) corrFly.push({task:CT, shot:no, rec:shot, sys:CT.sys, d0:i * .5, t0, tof, pts, pos:null, left:tof + i * .5});
try { navigator.vibrate && navigator.vibrate(30); } catch(e){}
corrPanel(); if (!corrRaf) corrRaf = requestAnimationFrame(corrStep); }
// «Стоп» отменяет крайний выстрел этой задачи, его номер получит следующий выстрел
function corrStop(T){ if (T || CT) corrStop1(T || CT); }
function corrStop1(CT){ const mine = corrFly.filter(f => f.task === CT); if (!mine.length) return; const no = Math.max(...mine.map(f => f.shot));
corrFly = corrFly.filter(f => !(f.task === CT && f.shot === no)); { const cs0 = (CT.shots || []).find(x => x.no === no); if (cs0) faUse(CT, -(cs0.n || 1)); } CT.shots = (CT.shots || []).filter(x => x.no !== no); (CT.reuse = CT.reuse || []).push(no); persist();
toast(`Выстрел №${no} отменён`); if (!corrFly.length && corrRaf){ cancelAnimationFrame(corrRaf); corrRaf = 0; } corrDraw(); corrPanel(); }
function corrTimer(){ mixTimer(); const el = $('corrTm'), sb = $('corrStopB'), mine = corrFly.filter(f => f.task === CT); if (sb) sb.disabled = !mine.length; if (!el) return;
const by = new Map(); mine.forEach(f => by.set(f.shot, Math.max(by.get(f.shot) || 0, f.left)));
el.textContent = by.size ? '⏱ ' + [...by.entries()].sort((x, y) => x[0] - y[0]).map(([id, l]) => `№${id}: ${l.toFixed(1)} с`).join(' · ') : ''; }
function corrStep(ms){ const now = ms / 1000;
corrFly.forEach(f => { const t = now - f.t0, u = (t - f.d0) / f.tof; f.left = Math.max(0, f.tof + f.d0 - t); if (u >= 1){ f.done = true; f.pos = null; } else if (u >= 0){ f.idx = Math.min(29, Math.floor(u * 30)); f.pos = f.pts[f.idx]; } else f.pos = null; });
const ended = [...new Set(corrFly.map(f => f.rec))].filter(r => corrFly.every(f => f.rec !== r || f.done));
if (ended.length){ corrFly = corrFly.filter(f => !ended.includes(f.rec)); ended.forEach(r => { r.landed = true; }); persist(); toast(`Разрыв №${ended.map(r => r.no).join(', №')}! Отметьте место касанием карты или «Не набл.»`); try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch(e){} corrPanel(); }
corrDraw(); corrTimer(); corrRaf = corrFly.length ? requestAnimationFrame(corrStep) : 0; }
// ---- огневые задачи в «Слоях»
// ---- полоса со скруглёнными краями

// ======== СНАРЯДЫ, НУМЕРАЦИЯ ЦЕЛЕЙ, ПЛАНОВЫЕ ОЗ ========
const PROJ = {shell:'<svg viewBox="0 0 40 12"><path d="M2 3h24l10 3-10 3H2z" fill="#c9a24a" stroke="#222" stroke-width="1"/><path d="M6 3v6M9 3v6" stroke="#8a5a2b" stroke-width="1.6"/></svg>',
mine:'<svg viewBox="0 0 40 16"><path d="M14 2c10 0 20 3 22 6-2 3-12 6-22 6-4 0-6-2-6-6s2-6 6-6z" fill="#5b6650" stroke="#222"/><path d="M8 8H1M4 3l-3 5 3 5" stroke="#333" stroke-width="1.6" fill="none"/></svg>',
rocket:'<svg viewBox="0 0 56 12"><path d="M6 3h38l10 3-10 3H6z" fill="#7d8a6a" stroke="#222"/><path d="M6 3L1 0v12l5-3M14 3l-4-3M14 9l-4 3" stroke="#222" stroke-width="1.4" fill="#555"/><path d="M1 6h-1" stroke="#ff8a2a" stroke-width="4"/></svg>'};
const projOf = sys => (SYS[sys] || {}).hi ? 'mine' : (SYS[sys] || {}).rs ? 'rocket' : 'shell';
function nextTgtNo(){ let m = 100; state.ftasks.forEach(t => { const n = parseInt(t.name, 10); if (n > m) m = n; }); state.arrays.forEach(a => { if (a.fplan) a.points.forEach((p, i) => { const n = parseInt(labelOf(a, i), 10); if (n > m) m = n; }); }); return String(m + 1); }
function planLayer(){ const n = prompt('Название слоя плановых огневых задач', `Плановые ОЗ ${state.arrays.filter(a => a.fplan).length + 1}`); if (n === null) return null;
const a = normArr({id:Date.now(), kind:'main', fplan:true, name:n.trim() || 'Плановые ОЗ', ident:n.trim() || 'Плановые ОЗ', prefix:'', start:nextTgtNo(), step:1, style:copySt(state.palette.find(p => p.name === 'Оранжевый') || state.palette[0] || DEFAULT_PAL[2]), points:[], minZ:0, lblZ:10}); state.arrays.push(a); persist(); return a; }
function renderPlan(){ renderPlan0(); const el = $('planList'), Z = zoneShapes(); if (!Z.length) return; const d = document.createElement('div');
d.innerHTML = '<div class="sub-h">Зоны поражения</div>' + Z.map((sh, k) => `<div class="arr" data-z="${k}"><span class="sw" style="background:${sh.color || '#e2533f'}"></span><div class="nm"><div>${escapeHtml(sh.name || 'Зона ' + sh.zn)}</div><div>целей: ${zoneTargets(sh).length} · поражает: ${escapeHtml(zoneWho(sh))}</div></div><button data-zz="go">Показать</button><button data-zz="tb">Таблица</button><button class="eye" data-zz="dr" title="Перетащить точки контура">✥</button><button class="eye" data-zz="ed">✎</button><button class="eye" data-zz="del">🗑</button></div>`).join(''); el.appendChild(d);
d.querySelectorAll('[data-z]').forEach(r => { const sh = Z[+r.dataset.z], za = state.arrays.find(x => x.zones);
r.querySelector('[data-zz=go]').onclick = () => { closeModals(); map.fitBounds(L.latLngBounds(sh.pts.map(q => [q[0] ?? q.lat, q[1] ?? q.lng])).pad(.2)); };
r.querySelector('[data-zz=ed]').onclick = () => { closeModals(); openShapeEd(za, za.shapes.indexOf(sh)); }; r.querySelector('[data-zz=tb]').onclick = () => openZoneTbl(sh); r.querySelector('[data-zz=dr]').onclick = () => zoneDrag(za, sh);
r.querySelector('[data-zz=del]').onclick = () => askConfirm(`Удалить «${sh.name || 'Зона ' + sh.zn}»? (↶ — вернуть)`, 'Удалить', () => { za.shapes.splice(za.shapes.indexOf(sh), 1); state.arrays.forEach(L1 => { if (L1.fplan) L1.points.forEach(q => planNum(L1, q)); }); persist(); renderMarkers(); openModal('planModal'); renderPlan(); }); }); }
function renderPlan0(){ const el = $('planList'), L1 = state.arrays.filter(a => a.fplan);
el.innerHTML = L1.length ? L1.map(a => `<div class="arr" data-id="${a.id}"><span class="sw" style="background:${a.style.color}"></span><div class="nm"><div>${escapeHtml(a.name)}</div><div>целей: ${a.points.length}${a.points.length ? ` (${escapeHtml(labelOf(a, 0))}…${escapeHtml(labelOf(a, a.points.length - 1))})` : ''}</div></div><button class="eye" data-p="eye">${a.hidden ? '◌' : '●'}</button><button data-p="add">＋ Цели</button><button data-p="tbl">Таблица</button><button class="eye" data-p="ren">✎</button><button class="eye" data-p="del">🗑</button></div>`).join('') : '<div class="empty">Слоёв плановых огневых задач нет — нажмите «Добавить слой».</div>';
el.querySelectorAll('.arr').forEach(r => { const a = arrById(+r.dataset.id);
r.querySelector('[data-p=add]').onclick = () => planPreset(a); r.querySelector('[data-p=eye]').onclick = () => { a.hidden = !a.hidden; persist(); renderMarkers(); renderPlan(); };
r.querySelector('[data-p=tbl]').onclick = () => { closeModals(); openTable(a.id); };
r.querySelector('[data-p=ren]').onclick = () => { const v = prompt('Номер ТЗ', a.tz || ''); if (v === null) return; if (v.trim()){ const old = a.tz; a.tz = v.trim(); a.name = `ТЗ № ${a.tz}`; a.ident = `ТЗ ${a.tz}`; a.points.forEach(p => { if (p.tz === old) p.tz = a.tz; if (p.tzs) p.tzs = p.tzs.map(t => t === old ? a.tz : t); }); persist(); renderPlan(); renderMarkers(); } };
r.querySelector('[data-p=del]').onclick = () => askConfirm(`Удалить «${a.name}» со всеми целями? (можно вернуть из корзины)`, 'Удалить', () => { trashLayer(a); openModal('planModal'); renderPlan(); }); }); }
$('planBtn').onclick = () => { renderPlan(); openModal('planModal'); };

async function exportPlanXlsx(a){
if (typeof XLSX === 'undefined'){ toast('Модуль Excel не загрузился'); return; }
const miss = a.points.filter(p => !p.place && !p.placeManual); if (miss.length){ toast('Определяю населённые пункты…'); await Promise.race([Promise.all(miss.map(fillPlace)), new Promise(r => setTimeout(r, 10000))]); }
const aoa = [['№ ТЗ', 'Зона', 'Категория', 'Характер цели', '№ цели', 'X', 'Y', 'H', 'Квадрат', 'Населённый пункт', 'Комментарий', 'Привлекается (цвет)']];
rowsOf(a).forEach((r, i) => { const p = a.points[i]; const ct = planCat(p); aoa.push([p.tz || '', p.tno ? p.tno.slice(0, 2) : '', ct ? TCAT[ct - 1][1] : '', p.ch || '', p.tno || r.id, r.x, r.y, r.h === '' ? '' : r.h, r.sq, r.place, r.comment, styleText(r.st)]); });
const ws = XLSX.utils.aoa_to_sheet(aoa); for (let r = 2; r <= aoa.length; r++) ['A', 'B', 'E', 'F', 'G', 'I'].forEach(c => { const cell = ws[c + r]; if (cell){ cell.t = 's'; cell.v = String(cell.v); cell.z = '@'; } });
ws['!cols'] = [{wch:7}, {wch:6}, {wch:24}, {wch:16}, {wch:8}, {wch:8}, {wch:8}, {wch:6}, {wch:9}, {wch:18}, {wch:24}, {wch:18}];
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Плановые ОЗ');
deliverFile(new Blob([XLSX.write(wb, {bookType:'xlsx', type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `${safeName(a.name)}_${stamp()}.xlsx`, 'Таблица плановых огневых задач готова');
}

// ======== ПЛАН ОЗ: ТЗ, ХАРАКТЕР С ПОДСКАЗКАМИ, ЗОНЫ, ПРАВКА, ВЫГРУЗКА ========
function locText(lat, lng){ const sq = sqOf(GEO.toSK(lat, lng)), q = nearestSync(lat, lng); if (!q) return {loc:`кв. ${sq}`, place:''};
const km = distM(q, {lat, lng}) / 1000; if (km < 0.3) return {loc:`в н.п. ${q.name}, кв. ${sq}`, place:q.name};
const ang = Math.atan2((lng - q.lng) * Math.cos(lat * Math.PI / 180), lat - q.lat) * 180 / Math.PI; return {loc:`${km.toFixed(1).replace('.', ',')} км ${DIRS[((Math.round(ang / 45) % 8) + 8) % 8]} н.п. ${q.name}, кв. ${sq}`, place:q.name}; }
// ---- ТЗ
$('planAdd').onclick = () => { const n = prompt('Номер ТЗ', String(state.arrays.filter(a => a.fplan).length + 1)); if (n === null || !n.trim()) return;
const a = normArr({id:Date.now(), kind:'main', fplan:true, tz:n.trim(), name:`ТЗ № ${n.trim()}`, ident:`ТЗ ${n.trim()}`, prefix:'', start:'1', step:1, style:copySt(state.palette.find(p => p.name === 'Оранжевый') || state.palette[0] || DEFAULT_PAL[2]), points:[], minZ:0, lblZ:10}); state.arrays.push(a); persist();
planPreset(a); };
// ---- характер цели с подсказками
let chCb = null;
function chList(q){ q = String(q || '').trim().toLowerCase(); const it = [...new Set(CHAR.concat(['МТО', 'ПВД', 'РЭБ', 'РЛС', 'ПУ БпЛА', 'Пикап', 'ЗРК', 'ЗПУ', 'Гаубица', 'РСЗО', 'Окоп', 'Склад боеприпасов']).concat(SYMS.filter(s => s.type === 'pt').map(s => s.n)))];
return it.filter(x => !q || x.toLowerCase().includes(q)).sort((a, b) => (a.toLowerCase().startsWith(q) ? 0 : 1) - (b.toLowerCase().startsWith(q) ? 0 : 1)).slice(0, 30); }
function chRender(){ const q = $('chQ').value; $('chRes').innerHTML = chList(q).map(x => { const sy = SYMS.find(s => s.type === 'pt' && s.n.toLowerCase() === x.toLowerCase()), c = catOfTxt(x) || (sy ? catOfSym(sy.id) : 0);
return `<div class="arr" data-v="${escapeHtml(x)}">${sy ? `<span class="kth" style="color:#c0282a">${symSvg(sy.id)}</span>` : '<span class="kth">•</span>'}<div class="nm"><div>${escapeHtml(x)}</div><div>${c ? TCAT[c - 1][1] + ' · ' + c + '01–' + c + '99' : 'категория не определена'}</div></div></div>`; }).join('') + (q.trim() ? `<div class="arr" data-v="${escapeHtml(q.trim())}"><span class="kth">✎</span><div class="nm"><div>«${escapeHtml(q.trim())}»</div><div>свой вариант</div></div></div>` : '');
$('chRes').querySelectorAll('.arr').forEach(d => d.onclick = () => { const cb = chCb; chCb = null; closeModals(); cb && cb(d.dataset.v); }); }
function askChar(cb, init){ chCb = cb; $('chQ').value = init || ''; chRender(); openModal('chModal'); setTimeout(() => $('chQ').focus(), 80); }
$('chQ').oninput = chRender;
function applyChar(a, p, v){ p.ch = v; const sy = SYMS.find(s => s.type === 'pt' && (s.n.toLowerCase() === v.toLowerCase())) || SYMS.find(s => s.type === 'pt' && catOfSym(s.id) && v.toLowerCase().includes(s.n.toLowerCase()));
const sid2 = symForChar(v); if (sid2){ p.sym = sid2; if (!p.side) p.side = 'b'; } if (!planNum(a, p)){ const c = catOfSym(p.sym); if (!c){ p.tno = tgtNo(p.lat, p.lng, 1, p); p.lbl = p.tno; } } persist(); renderMarkers(); }
// ---- правка фигур и зон
let shRef = null;
function openShapeEd(a, i){ const sh = a.shapes[i]; shRef = {a, i, sh};
$('seName').value = sh.name || ''; $('seZnW').style.display = a.zones ? '' : 'none'; $('seZn').value = sh.zn || ''; $('seOp').value = sh.op ?? 35; $('seOpV').textContent = (sh.op ?? 35) + '%';
renderFillPick($('seCol'), sh.color || a.style.color, c => { if (c) sh.color = c; renderMarkers(); }); openModal('shEdModal'); }
$('seOp').oninput = e => { shRef.sh.op = +e.target.value; $('seOpV').textContent = e.target.value + '%'; renderMarkers(); };
$('seOk').onclick = () => { const {a, sh} = shRef; sh.name = $('seName').value.trim(); if (a.zones){ const z = $('seZn').value.trim(); if (z) sh.zn = z; sh.name = sh.name || `Зона ${sh.zn}`; state.arrays.forEach(L1 => { if (L1.fplan) L1.points.forEach(q => planNum(L1, q)); }); } persist(); closeModals(); renderMarkers(); };
$('seGeo').onclick = () => { const {a, i, sh} = shRef; closeModals(); openTools(a.id); tool.mode = sh.type === 'line' ? 'line' : sh.type === 'circle' ? 'circle' : 'poly'; tool.pts = sh.pts.map(q => L.latLng(q[0] ?? q.lat, q[1] ?? q.lng)); tool.r = sh.r || 0; tool.color = {color:sh.color || a.style.color, name:'', glyph:''}; tool.op = sh.op ?? 35; tool.editRef = {a, i}; drawTool(); renderTool(); toast('Измените контур: ↶ убирает точки, касания добавляют; затем «Сохранить фигуру»'); };
$('seDel').onclick = () => { const {a, i} = shRef; a.shapes.splice(i, 1); persist(); closeModals(); renderMarkers(); toast('Удалено (↶ — вернуть)'); };
// ---- общая выгрузка
function planAoa(a){ const aoa = [['№ ТЗ', 'Зона', 'Цвет зоны', 'Категория', 'Характер цели', '№ цели', 'X', 'Y', 'H', 'Квадрат', 'Населённый пункт', 'Комментарий', 'Привлекается (цвет)']];
rowsOf(a).forEach((r, i) => { const p = a.points[i], ct = planCat(p), zs = zoneShape(p.lat, p.lng); aoa.push([p.tz || a.tz || '', p.tno ? p.tno.slice(0, 2) : '', zs ? colName(zs.color || '#e2533f') : '', ct ? TCAT[ct - 1][1] : '', p.ch || '', p.tno || r.id, r.x, r.y, r.h === '' ? '' : r.h, r.sq, r.place, r.comment, styleText(r.st)]); }); return aoa; }
function zonesAoa(){ const aoa = [['№ п/п', 'Наименование', 'Местоположение', 'Примечание', 'Населённый пункт']]; let n = 0;
zoneShapes().forEach(sh => { const T = zoneTargets(sh).length; sh.pts.forEach((q, k) => { const lat = q[0] ?? q.lat, lng = q[1] ?? q.lng, lt = locText(lat, lng);
aoa.push([++n, `${sh.name || 'Зона ' + sh.zn}, точка ${k + 1}`, lt.loc, k === 0 ? `поражает: ${colName(sh.color || '#e2533f')}; целей в зоне: ${T}` : '', lt.place]); }); }); return aoa; }
function fireAoa(){ const aoa = [['Цель', 'Объект', 'Средство', 'X цели', 'Y цели', 'Квадрат', 'Местоположение', 'Разрывов', 'Последний разрыв от цели']];
state.ftasks.forEach(t => { if (!t.tgt) return; const s0 = GEO.toSK(t.tgt.lat, t.tgt.lng), last = (t.bursts || []).slice(-1)[0]; let dv = ''; if (last && t.gun){ const keep = CT; CT = t; dv = devTxt(corrDev(last)); CT = keep; }
aoa.push([t.name, t.obj || '', (SYS[t.sys] || SYS.d30).n, pad5(s0.x), pad5(s0.y), sqOf(s0), locText(t.tgt.lat, t.tgt.lng).loc, (t.bursts || []).length, dv]); }); return aoa; }
function addSheet(wb, aoa, name, txt){ const ws = XLSX.utils.aoa_to_sheet(aoa); for (let r = 2; r <= aoa.length; r++) txt.forEach(c => { const cell = ws[c + r]; if (cell){ cell.t = 's'; cell.v = String(cell.v); cell.z = '@'; } }); ws['!cols'] = aoa[0].map(h => ({wch:Math.max(8, Math.min(40, String(h).length + 4))})); XLSX.utils.book_append_sheet(wb, ws, safeName(name).slice(0, 31)); }
async function exportPlanAll(){ if (typeof XLSX === 'undefined'){ toast('Модуль Excel не загрузился'); return; }
const pls = state.arrays.filter(a => a.fplan), miss = pls.flatMap(a => a.points).filter(p => !p.place && !p.placeManual); if (miss.length){ toast('Определяю населённые пункты…'); await Promise.race([Promise.all(miss.map(fillPlace)), new Promise(r => setTimeout(r, 10000))]); }
const wb = XLSX.utils.book_new(), used = new Set();
const tzs = [...new Set(pls.flatMap(a => a.points.flatMap(p => tzList(a, p))).concat(pls.map(a => String(a.tz || '')).filter(Boolean)))].sort((x, y) => (+x || 0) - (+y || 0) || x.localeCompare(y));
tzs.forEach(tz => addSheet(wb, planAoaTz(tz), 'ТЗ ' + tz, ['A', 'B', 'F', 'G', 'H', 'J']));
const ma = meetAoa(); if (ma.length > 1) addSheet(wb, ma, 'Точки встречи', ['C', 'D', 'E', 'F']);
const za = zonesAoa(); if (za.length > 1) addSheet(wb, za, 'Зоны (описание)', ['B', 'C']);
zoneShapes().forEach(sh => { const zt = zoneTgtAoa(sh); if (zt.length > 1) addSheet(wb, zt, 'Зона ' + sh.zn, ['A', 'B', 'F', 'G', 'H', 'J']); });
const fa = fireAoa(); if (fa.length > 1) addSheet(wb, fa, 'Огневые задачи', ['A', 'D', 'E', 'F']);
if (!wb.SheetNames.length){ toast('Нет данных для выгрузки'); return; }
deliverFile(new Blob([XLSX.write(wb, {bookType:'xlsx', type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `План_ОЗ_${stamp()}.xlsx`, `Файл готов: вкладок ${wb.SheetNames.length}`); }
$('planAll').onclick = () => { closeModals(); exportPlanAll(); };

// ======== ПЛАН ОЗ: ЗАГОТОВКА, ВИД ЦЕЛЕЙ, ТОЧКИ ВСТРЕЧИ, НЕСКОЛЬКО ТЗ ========
let psRef = null;
function planPreset(a, then){ psRef = {a, ch:'', color:(a.style && a.style.color) || '#ff7a1a', then};
$('psCh').textContent = 'не задан — спрашивать у каждой цели'; renderFillPick($('psCol'), psRef.color, c => { psRef.color = c || psRef.color; }); closeModals(); openModal('psModal'); }
$('psChB').onclick = () => { closeModals(); askChar(v => { psRef.ch = v; $('psCh').textContent = v; openModal('psModal'); }); };
$('psGo').onclick = () => { const {a, ch, color, then} = psRef; closeModals(); startSession(a.id, 'pick'); session.plan = {ch, color}; then && then(); toast(`Касайтесь целей подряд${ch ? ' — «' + ch + '»' : ''}, в конце ✓`); };
// ---- точки встречи
function meetLayer(){ let a = state.arrays.find(x => x.meetL); if (!a){ a = normArr({id:Date.now(), kind:'shapes', meetL:true, name:'Точки встречи', ident:'Точки встречи', style:{color:'#ffd400', name:'Жёлтый', glyph:''}, points:[], shapes:[], meet:[], minZ:0, lblZ:10}); state.arrays.push(a); } if (!a.meet) a.meet = []; return a; }
function meetBar(){ const el = $('meetBar'); if (!meetMode){ el.classList.remove('on'); return; } el.classList.add('on');
el.innerHTML = `<b>${escapeHtml(meetMode.r)} — ${meetMode.k}</b><span>${meetMode.p1 ? `коснитесь точки ${meetMode.k}2` : `коснитесь точки ${meetMode.k}1`}</span><button id="meetDone">Готово</button>`; $('meetDone').onclick = () => { meetMode = null; meetBar(); renderMarkers(); }; }
$('planMeet').onclick = () => { const r = prompt('Название маршрута (например, Питон)', ''); if (!r || !r.trim()) return; const a = meetLayer(), k0 = a.meet.filter(m => m.r === r.trim()).reduce((m, x) => Math.max(m, x.k), 0);
closeModals(); meetMode = {r:r.trim(), k:k0 + 1, p1:null}; meetBar(); };
function meetTap(ll){ if (!meetMode.p1){ meetMode.p1 = [+ll.lat.toFixed(7), +ll.lng.toFixed(7)]; meetBar(); renderMarkers(); return; }
const p2 = [+ll.lat.toFixed(7), +ll.lng.toFixed(7)], d = distM({lat:meetMode.p1[0], lng:meetMode.p1[1]}, {lat:p2[0], lng:p2[1]});
if ((d < 500 || d > 800) && !confirm(`Расстояние между точками ${Math.round(d)} м (норма 500–800 м). Поставить всё равно?`)) return;
const t = prompt('Время поражения после «С» (например, 00:05)', '00:05'); if (t === null) return;
meetLayer().meet.push({r:meetMode.r, k:meetMode.k, t:t.trim() || '00:00', p1:meetMode.p1, p2}); persist(); meetMode = {r:meetMode.r, k:meetMode.k + 1, p1:null}; meetBar(); renderMarkers(); }
function meetAoa(){ const aoa = [['Маршрут', 'Пара', 'Точка', 'X', 'Y', 'Квадрат', 'Время поражения', 'Местоположение']]; const a = state.arrays.find(x => x.meetL);
(a ? a.meet : []).forEach(m => [[m.p1, 1], [m.p2, 2]].forEach(([q, n]) => { const s0 = GEO.toSK(q[0], q[1]); aoa.push([m.r, `${m.r} – ${m.k}`, `${m.k}${n}`, pad5(s0.x), pad5(s0.y), sqOf(s0), `«С» + ${m.t}`, locText(q[0], q[1]).loc]); })); return aoa; }
function planAoaTz(tz){ const aoa = [['№ ТЗ', 'Зона', 'Поражает', 'Категория', 'Характер цели', '№ цели', 'X', 'Y', 'H', 'Квадрат', 'Населённый пункт', 'Комментарий (лесополоса)', 'Привлекается (цвет)']];
state.arrays.forEach(a => { if (!a.fplan) return; rowsOf(a).forEach((r, i) => { const p = a.points[i]; if (!tzList(a, p).includes(tz)) return; const ct = planCat(p), zs = zoneShape(p.lat, p.lng);
aoa.push([tz, p.tno ? p.tno.slice(0, 2) : '', zs ? zoneWho(zs) : '', ct ? TCAT[ct - 1][1] : '', p.ch || '', p.tno || r.id, r.x, r.y, r.h === '' ? '' : r.h, r.sq, r.place, [r.comment, lpTxt(p)].filter(Boolean).join('; '), styleText(r.st)]); aoa[aoa.length - 1]._k = tgtSortKey(p, r); }); }); const H0 = aoa.shift(); aoa.sort((x, y) => cmpKey(x._k || [], y._k || [])); aoa.unshift(H0); return aoa; }

// ======== ЗОНЫ В «ПЛАН ОЗ»: ПОДГРУППЫ ЦЕЛЕЙ, ВКЛАДКИ ПО ЗОНАМ ========
function zoneTgtAoa(sh){ const aoa = [['№ ТЗ', 'Зона', 'Цвет зоны', 'Категория', 'Характер цели', '№ цели', 'X', 'Y', 'H', 'Квадрат', 'Населённый пункт', 'Комментарий', 'Привлекается (цвет)']];
zoneTargets(sh).forEach(({a, p, i}) => { const r = rowsOf(a)[i], ct = planCat(p); aoa.push([tzList(a, p).join(', '), sh.zn, zoneWho(sh), ct ? TCAT[ct - 1][1] : '', p.ch || '', p.tno || r.id, r.x, r.y, r.h === '' ? '' : r.h, r.sq, r.place, [r.comment, lpTxt(p)].filter(Boolean).join('; '), styleText(r.st)]); aoa[aoa.length - 1]._k = tgtSortKey(p, r); }); const H0 = aoa.shift(); aoa.sort((x, y) => cmpKey(x._k || [], y._k || [])); aoa.unshift(H0); return aoa; }
function zoneShapes(){ const z = state.arrays.find(x => x.zones); return z ? z.shapes.filter(s0 => s0.zn) : []; }

// ======== ОГНЕВЫЕ ЗАДАЧИ (окно слева): ТЕКУЩИЕ И ЖУРНАЛ С ВЫГРУЗКОЙ В EXCEL ========
let ftTab = 'cur', ftEdRef = null;
const fmtDT = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit'}); };
const toLocDT = d => { const x = new Date(d || Date.now()), z = n => String(n).padStart(2, '0'); return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}T${z(x.getHours())}:${z(x.getMinutes())}`; };
function logFromTask(t){ const s = shotStats(t), sk = t.tgt ? GEO.toSK(t.tgt.lat, t.tgt.lng) : null, lt = t.tgt ? locText(t.tgt.lat, t.tgt.lng) : null;
let r = state.ftlog.find(x => x.tid === t.id); if (!r){ r = {id:Date.now(), tid:t.id}; state.ftlog.push(r); }
Object.assign(r, {date:new Date().toISOString(), name:t.name || '', obj:t.obj || '', loc:lt ? lt.loc : '', x:sk ? pad5(sk.x) : '', y:sk ? pad5(sk.y) : '', sys:(SYS[t.sys] || SYS.d30).n, fa:t.gname || '', sig:t.sig || '', res:t.res || '', shots:s.shots, n:s.n, hit:s.hit, dev:s.dev, nobs:s.nobs, mis:s.mis}); persist(); return r; }
function renderFt(){ keepScroll('ftModal', renderFt0); }
function renderFt0(){ const el = $('ftList'), row = $('ftRow'); $('ftTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === ftTab));
if (ftTab === 'cur'){ const pl = state.arrays.filter(isPlanL);
el.innerHTML = (state.ftasks.length ? state.ftasks.map((t, k) => { if (!(t.tgt || (t.shots || []).length)) return ''; const st = shotStats(t); return `<div class="arr" data-k="${k}"><span class="kth" style="color:#d9532c">⊕</span><div class="nm"><div>${escapeHtml(t.name || 'Цель')}${t.obj ? ' · ' + escapeHtml(t.obj) : ''}</div><div>${escapeHtml((SYS[t.sys] || SYS.d30).n)}${t.res ? ' · <b>' + escapeHtml(t.res) + '</b>' : ''} · выстрелов ${st.shots}, снарядов ${st.n}</div></div>${t.name ? '<button data-a="hist">История</button>' : ''}<button data-a="open">Открыть</button></div>`; }).join('') : '<div class="empty">Огневых задач нет</div>')
+ (pl.length ? '<div class="sub-h">Плановые (ТЗ)</div>' + pl.map(a => { const Z = a.zones ? zoneShapes() : []; return `<div class="arr${a.hidden ? ' off' : ''}" data-id="${a.id}"><button class="eye" data-a="eye">${a.hidden ? '◌' : '●'}</button><div class="nm"><div>${escapeHtml(a.name)}</div><div>${a.zones ? `зон ${Z.length}, целей в зонах ${Z.reduce((q, sh) => q + zoneTargets(sh).length, 0)}` : a.meetL ? `точек: ${a.points.length}` : `целей: ${a.points.length}`}</div></div><button data-a="plan">План ОЗ</button></div>` + (Z.length ? `<div class="kids">${Z.map((sh, k) => `<div class="kid"><span class="sw" style="background:${sh.color || '#e2533f'}"></span><span class="kn">${escapeHtml(sh.name || 'Зона ' + sh.zn)} — целей ${zoneTargets(sh).length}</span><button data-zt="${k}">Таблица</button></div>`).join('')}</div>` : ''); }).join('') : '');
row.innerHTML = '<button class="primary" id="ftNew">+ Задача (корректировка)</button><button id="prjSave">Сохранить проект</button><button id="prjOpen">Открыть проект</button><button data-close>Закрыть</button>'; $('prjSave').onclick = saveProject; $('prjOpen').onclick = openProject;
el.querySelectorAll('.arr[data-k]').forEach(r => { const t = state.ftasks[+r.dataset.k];
{ const hb = r.querySelector('[data-a=hist]'); if (hb) hb.onclick = () => tgtHistory(t.name); }
r.querySelector('[data-a=open]').onclick = () => { closeModals(); CT = t; corrPick = null; corrEnd = false; corrDraw(); corrPanel(); if (t.tgt) map.setView([t.tgt.lat, t.tgt.lng], Math.max(map.getZoom(), 14)); };
swipeable(r, () => askConfirm(`Удалить огневую задачу «${t.name || 'Цель'}»? Запись в журнале останется.`, 'Удалить', () => { state.ftasks = state.ftasks.filter(x => x !== t); if (CT === t){ CT = null; corrDraw(); corrPanel(); } persist(); renderFt(); })); });
el.querySelectorAll('.arr[data-id]').forEach(r => { const a = state.arrays.find(x => String(x.id) === r.dataset.id); if (!a) return;
r.querySelector('[data-a=eye]').onclick = () => { a.hidden = !a.hidden; persist(); renderMarkers(); renderFt(); };
r.querySelector('[data-a=plan]').onclick = () => { closeModals(); renderPlan(); openModal('planModal'); }; });
el.querySelectorAll('[data-zt]').forEach(b => b.onclick = () => openZoneTbl(zoneShapes()[+b.dataset.zt]));
$('ftNew').onclick = () => { closeModals(); CT = newTask(); corrEnd = false; corrDraw(); corrPanel(); pickGun(CT); };
row.querySelector('[data-close]').onclick = () => $('ftModal').classList.remove('open'); return; }
if (ftTab === 'sum'){ renderSum(el, row); return; } if (ftTab === 'sig'){ renderSig(el, row); return; }
const L1 = state.ftlog.slice().sort((x, y) => String(y.date).localeCompare(String(x.date)));
el.innerHTML = L1.length ? L1.map(r => `<div class="arr" data-l="${r.id}"><span class="kth" style="color:${r.res === 'Уничтожена' ? '#2f9e44' : r.res === 'Подавлена' ? '#e8a33a' : '#888'}">${r.res === 'Уничтожена' ? '✖' : r.res === 'Подавлена' ? '◐' : '○'}</span><div class="nm"><div>${escapeHtml(r.name || 'Цель')}${r.obj ? ' · ' + escapeHtml(r.obj) : ''} — <b>${escapeHtml(r.res || '—')}</b></div><div>${fmtDT(r.date)} · ${escapeHtml(r.sys || '')} · снарядов ${r.n || 0}: в цель ${r.hit || 0}, откл. ${r.dev || 0}, не набл. ${r.nobs || 0}, осечка ${r.mis || 0}${r.note ? ' · ' + escapeHtml(r.note) : ''}</div></div><button class="eye" data-a="ed">✎</button></div>`).join('') : '<div class="empty">Журнал пуст. Записи появляются по «Итог задачи» в корректировке или кнопкой «+ Запись»</div>';
row.innerHTML = `<button class="primary" id="ftXls" ${L1.length ? '' : 'disabled'}>Выгрузить в Excel</button><button id="ftAdd">+ Запись</button>`;
el.querySelectorAll('.arr[data-l]').forEach(rw => { const r = state.ftlog.find(x => String(x.id) === rw.dataset.l); if (!r) return;
rw.querySelector('[data-a=ed]').onclick = () => openFtEd(r);
swipeable(rw, () => askConfirm(`Удалить запись журнала «${r.name || 'Цель'}»?`, 'Удалить', () => { state.ftlog = state.ftlog.filter(x => x !== r); persist(); renderFt(); })); });
$('ftXls').onclick = exportFtLog; $('ftAdd').onclick = () => openFtEd(null); }
const FTF = [['date', 'Дата и время', 'dt'], ['name', '№ цели', 'text'], ['obj', 'Объект / характер', 'text'], ['loc', 'Местоположение', 'text'], ['x', 'X', 'text'], ['y', 'Y', 'text'], ['fa', 'Огневое средство', 'text'], ['sys', 'Система', 'text'], ['res', 'Результат', 'sel'], ['sig', 'Сигнал', 'text'],
['shots', 'Выстрелов', 'num'], ['n', 'Снарядов (расход)', 'num'], ['hit', 'В цель', 'num'], ['dev', 'Отклонение (> 50 м)', 'num'], ['nobs', 'Не наблюдались', 'num'], ['mis', 'Осечка', 'num'], ['note', 'Примечание', 'text']];
function openFtEd(r){ ftEdRef = r; const v = r || {date:new Date().toISOString(), res:'Подавлена'};
$('ftEdBody').innerHTML = FTF.map(([k, l, ty]) => `<label class="f">${l}${ty === 'sel' ? `<select id="fe_${k}">${['Уничтожена', 'Подавлена', 'Не выполнена'].map(x => `<option${x === v.res ? ' selected' : ''}>${x}</option>`).join('')}</select>`
: `<input id="fe_${k}" type="${ty === 'dt' ? 'datetime-local' : ty === 'num' ? 'number' : 'text'}" ${ty === 'num' ? 'inputmode="numeric" min="0"' : 'autocomplete="off"'} value="${escapeHtml(ty === 'dt' ? toLocDT(v[k]) : String(v[k] ?? ''))}">`}</label>`).join('');
openModal('ftEdModal'); }
$('ftEdOk').onclick = () => { const r = ftEdRef || {id:Date.now()}; FTF.forEach(([k, , ty]) => { const x = $('fe_' + k).value; r[k] = ty === 'num' ? Math.max(0, +x || 0) : ty === 'dt' ? (x ? new Date(x).toISOString() : r[k]) : x.trim(); });
if (!ftEdRef) state.ftlog.push(r); persist(); $('ftEdModal').classList.remove('open'); renderFt(); toast('Запись сохранена'); };
function exportFtLog(){ const L1 = state.ftlog.slice().sort((x, y) => String(x.date).localeCompare(String(y.date))), K = ['shots', 'n', 'hit', 'dev', 'nobs', 'mis'];
const aoa = [['№ п/п', 'Дата', 'Время', '№ цели', 'Объект / характер', 'Местоположение', 'X', 'Y', 'Огневое средство', 'Система', 'Результат', 'Выстрелов', 'Снарядов', 'В цель', 'Отклонение (>50 м)', 'Не наблюдались', 'Осечка', 'Сигнал', 'Примечание']];
L1.forEach((r, i) => { const d = new Date(r.date); aoa.push([i + 1, isNaN(d) ? '' : d.toLocaleDateString('ru-RU'), isNaN(d) ? '' : d.toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'}), r.name || '', r.obj || '', r.loc || '', r.x || '', r.y || '', r.fa || '', r.sys || '', r.res || '', ...K.map(k => +r[k] || 0), r.sig || '', r.note || '']); });
aoa.push(['', '', '', '', '', '', '', '', '', '', 'Итого', ...K.map(k => L1.reduce((q, r) => q + (+r[k] || 0), 0)), '', `уничтожено ${L1.filter(r => r.res === 'Уничтожена').length}, подавлено ${L1.filter(r => r.res === 'Подавлена').length}`]);
const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [6, 10, 7, 10, 24, 30, 9, 9, 16, 18, 13, 9, 9, 8, 12, 12, 8, 12, 24].map(w => ({wch:w}));
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Журнал ОЗ');
deliverFile(new Blob([XLSX.write(wb, {bookType:'xlsx', type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Журнал_огневых_задач_${stamp()}.xlsx`, 'Журнал огневых задач готов'); }
$('ftTabs').querySelectorAll('button').forEach(b => b.onclick = () => { ftTab = b.dataset.t; renderFt(); });
$('ftBtn').onclick = () => { ftTab = 'cur'; renderFt(); openModal('ftModal'); };
{ const rp0 = renderPlan; window.renderPlan = () => keepScroll('planModal', rp0); }
// ---- таблица целей зоны поражения
function openZoneTbl(sh){ let m = $('ztModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'ztModal'; m.innerHTML = '<div class="card big"><h3 id="ztH"></h3><div id="ztBody" style="overflow-x:auto"></div><div class="row"><button class="ghost" data-close>Закрыть</button></div></div>';
m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); });
const st = document.createElement('style'); st.textContent = '.ztt{border-collapse:collapse;width:100%;font-size:13px}.ztt td,.ztt th{border-bottom:1px solid rgba(128,128,128,.3);padding:7px 5px;text-align:left;white-space:nowrap}.ztt tr[data-k]{cursor:pointer}'; document.head.appendChild(st); }
document.body.appendChild(m); m.querySelector('.card').style.cssText += ';width:calc(100vw - 16px);max-width:none'; const T = zoneTargets(sh).sort((x, y) => cmpKey(tgtSortKey(x.p, rowsOf(x.a)[x.i]), tgtSortKey(y.p, rowsOf(y.a)[y.i]))), who = zoneWho(sh);
$('ztH').textContent = `${sh.name || 'Зона ' + sh.zn}: целей ${T.length}`;
$('ztBody').innerHTML = T.length ? `<table class="ztt"><tr><th>№ цели</th><th>Характер</th><th>ТЗ</th><th>X</th><th>Y</th><th>H</th><th>Квадрат</th><th>Населённый пункт</th><th>Комментарий (лесополоса)</th><th>Поражает</th></tr>${T.map(({a, p, i}, k) => { const r = rowsOf(a)[i], pl = r.place || locText(p.lat, p.lng).place || ''; return `<tr data-k="${k}"><td><b>${escapeHtml(String(p.tno || r.id).replace(/\s.*$/, ''))}</b></td><td>${escapeHtml(p.ch || '')}</td><td>${escapeHtml(a.name)}</td><td>${r.x}</td><td>${r.y}</td><td>${r.h}</td><td>${r.sq}</td><td>${escapeHtml(pl)}</td><td style="white-space:normal">${escapeHtml([r.comment, lpTxt(p)].filter(Boolean).join('; '))}</td><td>${escapeHtml(who)}</td></tr>`; }).join('')}</table>` : '<div class="empty">В зоне нет целей</div>';
$('ztBody').querySelectorAll('tr[data-k]').forEach(r => r.onclick = () => { const {p} = T[+r.dataset.k]; closeModals(); map.setView([p.lat, p.lng], Math.max(map.getZoom(), 15)); });
openModal('ztModal'); }
// ======== МИКШЕР ОРУДИЙ: КАНАЛЫ ВНИЗУ ЭКРАНА (каждый канал — огневая задача со своим орудием и целью) ========
var MIX = lsGet('skat_mix', []), mixOn = false;
function mixTasks(){ return MIX.map(id => state.ftasks.find(t => t.id === id)).filter(Boolean); }
function mixSave(){ MIX = mixTasks().map(t => t.id); lsSet('skat_mix', MIX); }
function azTxt(g, t){ const [kx, ky] = mk(g.lat), dx = (t.lng - g.lng) * kx, dy = (t.lat - g.lat) * ky; let a = Math.atan2(dx, dy) * 180 / Math.PI; if (a < 0) a += 360; const du = Math.round(a / 360 * 6000) % 6000; return `${Math.round(a)}° (${Math.floor(du / 100)}-${String(du % 100).padStart(2, '0')})`; }
function renderMix(){ const el = $('mixer'); if (!mixOn){ el.classList.remove('on'); return; } el.classList.add('on'); const sc = el.querySelector('.mxin'), x0 = sc ? sc.scrollLeft : 0;
const V = mixV(), All = mixTasks(), T0 = V.mode === 'fav' ? All.filter(t => t.fav) : All, T = mixSort(T0, V.sort);
const bar = `<div class="mxbar"><div class="mxseg">${[['all', 'Все'], ['deck', 'Колоды'], ['fav', '★ Избранные']].map(([k, l]) => `<button data-v="${k}" class="${V.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
<select data-vs="grp">${[['reg', 'Группы: по полкам'], ['unit', 'Группы: по подразделениям'], ['own', 'Группы: свои']].map(([k, l]) => `<option value="${k}"${V.grp === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
<select data-vs="sort">${[['unit', 'Сорт.: подразделение'], ['sys', 'Сорт.: система'], ['ammo', 'Сорт.: остаток БП'], ['cs', 'Сорт.: позывной'], ['ready', 'Сорт.: готовность']].map(([k, l]) => `<option value="${k}"${V.sort === k ? ' selected' : ''}>${l}</option>`).join('')}</select>
<button data-m="add" class="primary">＋ Орудие</button><button data-m="fal" title="Все огневые средства">ОС</button><button data-m="bp">Ведомость БП</button><button data-m="trk">${faTrkOn ? 'Следы ОП ✓' : 'Следы ОП'}</button><button data-sz="peek" title="Свернуть">▾</button><button data-sz="${V.size === 'full' ? 'third' : 'full'}" title="${V.size === 'full' ? 'Уменьшить' : 'Развернуть'}">${V.size === 'full' ? '⤓' : '⤒'}</button><button data-m="hide" title="Скрыть">✕</button></div>`;
let body = '';
el.classList.remove('sz-peek', 'sz-third', 'sz-full'); el.classList.add('sz-' + (V.size || 'third'));
if (V.size === 'peek'){ mixWheel(el, true); el.innerHTML = `<div class="mxin mxpeek">${T.map(mixTip).join('')}<button class="mxup" data-sz="third">▴ Микшер</button></div>`; el.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { V.size = b.dataset.sz; mixRaise = null; mixVSave(); renderMix(); }); mixBind(el, T, V); return; }
if (V.mode === 'deck'){ const G = mixGroups(T, V.grp);
body = [...G.entries()].map(([g, L1]) => { if (V.open === g) return `<div class="mxgh"><button data-gc="${escapeHtml(g)}" class="mxgt">▾ ${escapeHtml(g)} · ${L1.length}</button><button data-ga="fire" data-g="${escapeHtml(g)}" class="primary">▶ Группой</button><button data-ga="stop" data-g="${escapeHtml(g)}">■ Стоп всем</button><button data-ga="xf" data-g="${escapeHtml(g)}">⇪</button></div>` + L1.map(mixCard).join('');
const ammo = L1.reduce((q, t) => { const r = t.faId && faFind(t.faId); return q + (r ? faLeft(r.p.fa) : 0); }, 0), fly = L1.filter(t => corrFly.some(f => f.task === t)).length;
return `<div class="mxdeck${fly ? ' firing' : ''}" data-go="${escapeHtml(g)}">${L1.slice(0, 3).map((t, k) => `<div class="mxdl" style="transform:translate(${k * 7}px,${k * 7}px);z-index:${3 - k};${mixBg(t)}"></div>`).join('')}<div class="mxdt"><b>${escapeHtml(g)}</b><div>орудий ${L1.length}</div><div>БП ${ammo}</div>${fly ? `<div class="mxt">в воздухе: ${fly}</div>` : ''}</div></div>`; }).join(''); }
else body = T.map(mixCard).join('') || '<div class="mxs mxadd"><div class="mxi">Нет карточек</div></div>';
el.innerHTML = bar + `<div class="mxin">${body}</div>`; el.querySelector('.mxin').scrollLeft = x0; mixWheel(el);
el.querySelectorAll('[data-sz]').forEach(b => b.onclick = () => { V.size = b.dataset.sz; mixRaise = null; mixVSave(); renderMix(); });
el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { V.mode = b.dataset.v; mixVSave(); renderMix(); });
el.querySelectorAll('[data-vs]').forEach(q => q.onchange = () => { V[q.dataset.vs] = q.value; V.open = null; mixVSave(); renderMix(); });
el.querySelectorAll('[data-go]').forEach(d => d.onclick = () => { V.open = d.dataset.go; mixVSave(); renderMix(); });
el.querySelectorAll('[data-gc]').forEach(d => d.onclick = () => { V.open = null; mixVSave(); renderMix(); });
el.querySelectorAll('[data-ga]').forEach(b => b.onclick = () => { const L1 = mixGroups(T, V.grp).get(b.dataset.g) || [], a = b.dataset.ga;
if (a === 'fire'){ let n = 0; L1.forEach(t => { const s = SYS[t.sys] || SYS.d30, mx = t.maxOv || s.max; if (t.gun && t.tgt && !(mx && distM(t.gun, t.tgt) > mx)){ corrFire(t); n++; } }); toast(n ? `Выстрел группой: ${n} ор.` : 'Нет готовых орудий (орудие и цель)'); }
if (a === 'stop') L1.forEach(t => { if (corrFly.some(f => f.task === t)) corrStop(t); });
if (a === 'xf') xferSend(L1.map(xferText).join('\n\n')); });
mixBind(el, T, V);
el.querySelector('[data-m=add]').onclick = () => { const prev = mixTasks().slice(-1)[0]; CT = newTask(); if (prev){ CT.sys = prev.sys; CT.rs = prev.rs; } MIX.push(CT.id); mixSave(); corrEnd = false; corrDraw(); corrPanel(); pickGun(CT); };
el.querySelector('[data-m=hide]').onclick = () => { mixOn = false; renderMix(); };
el.querySelector('[data-m=fal]').onclick = () => { renderFa(); openModal('faModal'); }; el.querySelector('[data-m=bp]').onclick = exportAmmo; el.querySelector('[data-m=trk]').onclick = () => { faTrkOn = !faTrkOn; lsSet('skat_trk', faTrkOn); faTracks(); renderMix(); };
mixTimer(); }
function mixCard(t){ const sys = SYS[t.sys] || SYS.d30, d = t.gun && t.tgt ? distM(t.gun, t.tgt) : 0, mx = t.maxOv || sys.max, far = d && mx && d > mx, st = shotStats(t), last = (t.bursts || []).slice(-1)[0], nextNo = (t.reuse && t.reuse.length) ? Math.min(...t.reuse) : (t.shotN || 0) + 1, ps = pendShot(t), r = t.faId && faFind(t.faId), fa = r && r.p.fa, k = MIX.indexOf(t.id);
let dv = ''; if (last && t.gun && t.tgt){ const keep = CT; CT = t; const v = corrDev(last); CT = keep; dv = `${devTxt(v)} (${Math.round(Math.hypot(v.dN, v.dE))} м)`; }
const day = Date.now() - 864e5, spent = {}; state.ftasks.forEach(q => { if (fa && q.faId === fa.id) (q.shots || []).forEach(s => { if (s.t > day){ const key = s.am || '—'; spent[key] = (spent[key] || 0) + (s.n || 1); } }); });
const front = `<div class="mxh"><button data-m="fav" class="mxfv">${t.fav ? '★' : '☆'}</button>${fa ? faStDot(fa) : ''}<b>${escapeHtml(t.gname || 'Орудие ' + (k + 1))}</b><button data-m="xf" title="Передать данные">⇪</button><button data-m="flip" title="Оборот">↻</button><button data-m="x" title="Убрать из микшера">✕</button></div>
<div class="mxi mxsub">${escapeHtml([fa && fa.unit, fa && fa.reg, t.grp].filter(Boolean).join(' · ') || 'без группы')}</div>
<select data-m="sys">${sysOpts(t.sys)}</select>${sys.rs ? `<select data-m="rs">${[1, 2, 4, 8, 12, 20, sys.rs].filter((v, i, ar) => v <= sys.rs && ar.indexOf(v) === i).map(v => `<option value="${v}"${v === (t.rs || 4) ? ' selected' : ''}>${v} РС</option>`).join('')}</select>` : ''}
${fa && (fa.ammo || []).length ? `<select data-m="am">${fa.ammo.map(z => `<option value="${escapeHtml(z.t)}"${z.t === t.ammoT ? ' selected' : ''}>${escapeHtml(z.t)} — ${+z.have || 0}</option>`).join('')}</select>` : ''}
<div class="mxi">${t.tgt ? 'Цель ' + escapeHtml(t.name || '…') + (t.res ? ' · ' + escapeHtml(t.res) : '') : 'цель не задана'}</div>
<div class="mxi"${far ? ' style="color:#ff6b5a"' : ''}>${d ? `Д ${fmtDist(d)} · Аз ${azTxt(t.gun, t.tgt)}${far ? ' · вне досягаемости' : ''}` : (t.gun ? 'орудие ✓' : 'орудие не задано')}</div>
<div class="mxt" data-tm="${t.id}"></div><div class="mxi">${dv ? 'Разрыв ' + last.n + ': ' + dv : ''}</div><div class="mxi">${st.shots ? `сн. ${st.n}: цель ${st.hit}, откл. ${st.dev}, н/н ${st.nobs}, осеч. ${st.mis}` : ''}</div>
<div class="mxb"><button data-m="fire" class="primary" ${t.gun && t.tgt && !far ? '' : 'disabled'}>▶ №${nextNo}</button><button data-m="stop" data-st="${t.id}">■ Стоп</button></div>
<div class="mxb"><button data-m="gun">Орудие</button><button data-m="tgt">Цель</button><button data-m="corr" class="${t === CT ? 'on' : ''}">Корр.${ps ? ' №' + ps.no : ''}</button></div>
${ps ? `<div class="mxb"><button data-m="nobs">Не набл.</button><button data-m="mis">Осечка</button></div>` : ''}`;
const back = `<div class="mxh"><b>${escapeHtml(fa ? fa.cs || t.gname || 'Орудие' : t.gname || 'Орудие')}</b><button data-m="flip">↻</button></div>
<div class="mxi">${escapeHtml(sys.n)}${fa && fa.n ? ' × ' + fa.n : ''}</div><div class="mxi">${fa ? escapeHtml([fa.unit, fa.reg].filter(Boolean).join(', ') || 'подразделение не указано') : 'без карточки огневого средства'}</div>
<div class="mxi">Макс. дальность: ${mx ? fmtDist(mx) : 'не задана'}</div>
<label class="mxi">Своя группа<input data-m="grp" value="${escapeHtml(t.grp || '')}" placeholder="например, Огневая группа 1"></label>
<div class="mxi"><b>Боеприпасы</b></div>${fa && (fa.ammo || []).length ? fa.ammo.map(z => `<div class="mxi">${escapeHtml(z.t)}${z.vz ? ', ' + escapeHtml(z.vz) : ''}${z.zr ? ', ' + escapeHtml(z.zr) : ''}: <b>${+z.have || 0}</b>${z.norm ? ' · норма ' + z.norm : ''}${spent[z.t] ? ' · за сутки −' + spent[z.t] : ''}</div>`).join('') : '<div class="mxi">не указаны</div>'}
${fa && fa.note ? `<div class="mxi">${escapeHtml(fa.note)}</div>` : ''}<div class="mxb"><button data-m="card">✎ Карточка</button></div>`;
const fly = corrFly.some(f => f.task === t);
return `<div class="mxs${t === CT ? ' act' : ''}${fly ? ' firing' : ''}${mixFlip.has(t.id) ? ' flip' : ''}" data-id="${t.id}"><div class="mxc"><div class="mxface" style="${mixBg(t)}">${front}</div><div class="mxface mxback" style="${mixBg(t)}">${back}</div></div></div>`; }
function mixBind(el, T, V){ el.querySelectorAll('.mxs[data-id]').forEach(s => { const t = state.ftasks.find(x => x.id === +s.dataset.id); if (!t) return;
if (s.classList.contains('mxtip')) s.addEventListener('click', e => { if (e.target.closest('button,select')) return; mixRaise = mixRaise === t.id ? null : t.id; CT = t; corrEnd = false; corrPick = null; corrDraw(); corrPanel(); });
let y0 = null, x1 = 0; s.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; x1 = e.touches[0].clientX; }, {passive:true});
s.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0, dx = e.changedTouches[0].clientX - x1; y0 = null; if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.5 && !e.target.closest('select,input')){ if ((dy < 0) !== mixFlip.has(t.id)){ mixFlip.has(t.id) ? mixFlip.delete(t.id) : mixFlip.add(t.id); s.classList.toggle('flip'); } } }, {passive:true});
s.querySelectorAll('select[data-m]').forEach(q => q.onchange = () => { if (q.dataset.m === 'sys') t.sys = q.value; else if (q.dataset.m === 'am') t.ammoT = q.value; else t.rs = +q.value; persist(); corrPanel(); });
s.querySelectorAll('input[data-m=grp]').forEach(q => q.onchange = () => { t.grp = q.value.trim(); persist(); renderMix(); });
s.querySelectorAll('button[data-m]').forEach(b => b.onclick = e => { e.stopPropagation(); const m = b.dataset.m;
if (m === 'flip'){ mixFlip.has(t.id) ? mixFlip.delete(t.id) : mixFlip.add(t.id); s.classList.toggle('flip'); return; }
if (m === 'fav'){ t.fav = !t.fav; persist(); renderMix(); return; }
if (m === 'card'){ const r = t.faId && faFind(t.faId); if (r) openFaEd(r); else toast('Орудие без карточки — выберите огневое средство кнопкой «Орудие»'); return; }
if (m === 'x'){ MIX = MIX.filter(id => id !== t.id); mixSave(); corrDraw(); renderMix(); return; }
if (m === 'fire'){ corrFire(t); return; } if (m === 'xf'){ xferSend(xferText(t)); return; } if (m === 'stop'){ corrStop(t); return; }
if (m === 'gun'){ pickGun(t); return; } if (m === 'tgt'){ pickTgt(t); return; }
if (m === 'nobs' || m === 'mis'){ const p = pendShot(t); if (p){ p.res = m; persist(); corrPanel(); } return; }
CT = t; corrEnd = false; corrPick = null; corrDraw(); corrPanel(); toast(`Канал «${t.gname || 'Орудие'}» активен: касание карты — разрыв`); if (t.tgt) map.panTo([t.tgt.lat, t.tgt.lng]); }); }); mixTimer(); }
let mixRaise = null;
function mixTip(t){ const r = t.faId && faFind(t.faId), sys = SYS[t.sys] || SYS.d30, d = t.gun && t.tgt ? distM(t.gun, t.tgt) : 0, mx = t.maxOv || sys.max, far = d && mx && d > mx, nextNo = (t.reuse && t.reuse.length) ? Math.min(...t.reuse) : (t.shotN || 0) + 1, up = mixRaise === t.id, fly = corrFly.some(f => f.task === t), ps = pendShot(t);
return `<div class="mxs mxtip${up ? ' up' : ''}${fly ? ' firing' : ''}${t === CT ? ' act' : ''}" data-id="${t.id}" style="${mixBg(t)}"><div class="mxh"><b>${escapeHtml(t.gname || 'Орудие')}</b>${r ? `<span class="mxsub">БП ${faLeft(r.p.fa)}</span>` : ''}</div><div class="mxi mxsub">${t.tgt ? 'Ц ' + escapeHtml(t.name || '…') + (d ? ' · ' + fmtDist(d) : '') : 'цель не задана'}</div><div class="mxt" data-tm="${t.id}"></div>
${up ? `<div class="mxb"><button data-m="fire" class="primary" ${t.gun && t.tgt && !far ? '' : 'disabled'}>▶ №${nextNo}</button><button data-m="stop" data-st="${t.id}">■</button><button data-m="corr" class="on">Корр.${ps ? ' №' + ps.no : ''}</button></div><div class="mxb"><button data-m="gun">Орудие</button><button data-m="tgt">Цель</button></div>${ps ? `<div class="mxb"><button data-m="nobs">Не набл.</button><button data-m="mis">Осечка</button></div>` : ''}` : ''}</div>`; }
const mixFlip = new Set();
// колесо мыши прокручивает карточки вправо-влево
function mixWheel(el, later){ const f = () => { const q = el.querySelector('.mxin'); if (q) q.onwheel = e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && q.scrollWidth > q.clientWidth && !e.shiftKey){ q.scrollLeft += e.deltaY; e.preventDefault(); } }; }; later ? setTimeout(f, 0) : f(); }
function mixV(){ if (!window._mixV) window._mixV = Object.assign({mode:'all', grp:'unit', sort:'unit', open:null, size:'third'}, lsGet('skat_mixv', {})); return window._mixV; }
function mixVSave(){ lsSet('skat_mixv', mixV()); }
function mixGKey(t, grp){ const r = t.faId && faFind(t.faId), fa = r && r.p.fa; return (grp === 'reg' ? fa && fa.reg : grp === 'unit' ? fa && fa.unit : t.grp) || 'Без группы'; }
function mixGroups(T, grp){ const G = new Map(); T.forEach(t => { const k = mixGKey(t, grp); if (!G.has(k)) G.set(k, []); G.get(k).push(t); }); return new Map([...G.entries()].sort((a, b) => a[0] === 'Без группы' ? 1 : b[0] === 'Без группы' ? -1 : a[0].localeCompare(b[0], 'ru'))); }
function mixSort(T, by){ const left = t => { const r = t.faId && faFind(t.faId); return r ? faLeft(r.p.fa) : -1; }, fly = t => corrFly.some(f => f.task === t) ? 2 : t.gun && t.tgt ? 1 : 0;
const key = {unit:t => mixGKey(t, 'unit') + ' ' + (t.gname || ''), sys:t => (SYS[t.sys] || SYS.d30).n, cs:t => t.gname || '', ammo:null, ready:null}[by];
return T.slice().sort((a, b) => by === 'ammo' ? left(b) - left(a) : by === 'ready' ? fly(b) - fly(a) : String(key(a)).localeCompare(String(key(b)), 'ru')); }
// полупрозрачный силуэт арт. системы (вид сверху) на фоне карточки
const SIL = {
gun:'<path d="M45 60L8 28M45 60L8 92" stroke-width="7"/><rect x="52" y="30" width="16" height="14" rx="3"/><rect x="52" y="76" width="16" height="14" rx="3"/><path d="M78 40q8 20 0 40" stroke-width="5" fill="none"/><rect x="48" y="52" width="34" height="16" rx="3"/><rect x="80" y="56" width="112" height="8" rx="2"/>',
spg:'<rect x="18" y="22" width="132" height="14" rx="5"/><rect x="18" y="84" width="132" height="14" rx="5"/><rect x="24" y="36" width="120" height="48" rx="6"/><rect x="62" y="40" width="58" height="40" rx="10"/><rect x="118" y="56" width="76" height="8" rx="2"/>',
mlrs:'<rect x="150" y="38" width="34" height="44" rx="6"/><rect x="16" y="42" width="136" height="36" rx="4"/>' + Array.from({length:20}, (_, i) => `<circle cx="${34 + (i % 10) * 10}" cy="${52 + Math.floor(i / 10) * 16}" r="4"/>`).join(''),
tank:'<rect x="22" y="20" width="140" height="16" rx="6"/><rect x="22" y="84" width="140" height="16" rx="6"/><rect x="28" y="36" width="128" height="48" rx="8"/><ellipse cx="88" cy="60" rx="30" ry="24"/><rect x="112" y="56" width="84" height="8" rx="2"/>',
mortar:'<circle cx="62" cy="60" r="24"/><rect x="62" y="55" width="92" height="10" rx="3"/><path d="M128 60L150 30M128 60L150 90" stroke-width="5"/>',
ags:'<path d="M70 60L30 26M70 60L30 94M70 60L24 60" stroke-width="5"/><rect x="62" y="48" width="48" height="24" rx="5"/><rect x="108" y="56" width="70" height="8" rx="2"/>'};
function sysCat(k){ const s = SYS[k] || SYS.d30; if (['s19', 's3', 's1', 'sau', 'g2s5', 'g2s7', 'm2s9', 'm2s31', 'm2s34', 'm2s4'].includes(k)) return 'spg'; return {'Миномёты':'mortar', 'РСЗО':'mlrs', 'Танки и БМ':'tank', 'Гранатомёты':'ags'}[s.g] || 'gun'; }
function mixBg(t){ const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><g fill="#ffffff" stroke="#ffffff" opacity=".13" stroke-linecap="round">${SIL[sysCat(t.sys)]}</g></svg>`; return `background-image:url('data:image/svg+xml,${encodeURIComponent(svg)}');background-repeat:no-repeat;background-position:center 62%;background-size:96% auto`; }
function mixTimer(){ if (!mixOn) return; $('mixer').querySelectorAll('[data-tm]').forEach(e => { const id = +e.dataset.tm, by = new Map(); corrFly.forEach(f => { if (f.task && f.task.id === id) by.set(f.shot, Math.max(by.get(f.shot) || 0, f.left)); });
e.textContent = by.size ? '⏱ ' + [...by.entries()].sort((x, y) => x[0] - y[0]).map(([n, l]) => `№${n} ${l.toFixed(1)}`).join(' · ') : '';
const card = e.closest('.mxs'); if (card) card.classList.toggle('firing', by.size > 0); const sb = $('mixer').querySelector(`[data-st="${id}"]`); if (sb) sb.disabled = !by.size; });
$('mixer').querySelectorAll('.mxdeck').forEach(d => { const g = d.dataset.go, V = mixV(), L1 = (mixGroups(mixTasks(), V.grp).get(g) || []); d.classList.toggle('firing', L1.some(t => corrFly.some(f => f.task === t))); }); }
$('mixBtn').onclick = () => { mixOn = !mixOn; if (mixOn && !MIX.length && CT){ MIX.push(CT.id); mixSave(); } renderMix(); corrDraw(); };
{ const cp0 = corrPanel; window.corrPanel = () => { cp0(); if (mixOn) renderMix(); }; }
{ const ct0 = corrTap; window.corrTap = ll => { const before = CT; ct0(ll); if (before && CT && CT !== before){ const i = MIX.indexOf(before.id); if (i >= 0){ MIX[i] = CT.id; lsSet('skat_mix', MIX); } } if (mixOn) renderMix(); }; }
// ======== ОГНЕВЫЕ СРЕДСТВА: КАРТОЧКИ У ЗНАКОВ ОРУДИЙ, ВЫБОР ОРУДИЯ И ЦЕЛИ ========
const FA_KIND = {gun:'d30', sau:'s19', rszo:'grad', mortar:'m120', tank:'tank'};
function faAll(){ const out = []; state.arrays.forEach(a => a.points.forEach((p, i) => { if (p.fa) out.push({a, p, i}); })); return out; }
function faFind(id){ return faAll().find(x => x.p.fa.id === id); }
function faCand(){ const out = []; state.arrays.forEach(a => { if (a.fplan || a.zones || a.meetL || a.kind === 'aux') return; a.points.forEach((p, i) => { if (!p.fa && FA_KIND[itKind(a, p)] && sideOf(a, p) !== 'b') out.push({a, p, i}); }); }); return out; }
const faLeft = fa => (fa.ammo || []).reduce((q, x) => q + (+x.have || 0), 0);
const faTxt = fa => `${escapeHtml((SYS[fa.sys] || SYS.d30).n)}${fa.n ? ' × ' + fa.n : ''} · БП ${(fa.ammo || []).map(x => `${escapeHtml(x.t)} ${+x.have || 0}`).join(', ') || 'не указаны'}`;
// расход: со склада огневого средства задачи списывается выбранный тип (или первый с остатком), отмена «Стоп» — возврат
function faUse(t, n){ const r = t && t.faId && faFind(t.faId); if (!r) return; const A = r.p.fa.ammo || []; let x = A.find(z => z.t === t.ammoT) || A.find(z => (+z.have || 0) > 0) || A[0]; if (!x) return; x.have = Math.max(0, (+x.have || 0) - n); persist();
if (n > 0 && x.have === 0) toast(`«${r.p.fa.cs || 'Орудие'}»: ${x.t} закончились`); return x.t; }
function pkModal(){ let m = $('pkModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'pkModal'; m.innerHTML = '<div class="card big"><h3 id="pkH"></h3><input id="pkQ" placeholder="Поиск: номер, позывной, характер" autocomplete="off" style="width:100%;margin-bottom:8px"><div id="pkList"></div><div class="row" style="margin-top:8px"><button class="ghost" data-close>Отмена</button><button class="primary" id="pkMap">Указать на карте</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); } document.body.appendChild(m); return m; }
function pickGun(t){ pkModal(); $('pkH').textContent = 'Выбор огневого средства'; $('pkQ').value = '';
const draw = () => { const q = $('pkQ').value.trim().toLowerCase(), F = faAll().filter(x => !q || (x.p.fa.cs + ' ' + x.p.fa.unit + ' ' + x.p.fa.reg + ' ' + (SYS[x.p.fa.sys] || {}).n).toLowerCase().includes(q)), C = faCand().filter(x => !q || labelOf(x.a, x.i).toLowerCase().includes(q));
$('pkList').innerHTML = (F.length ? F.map((x, k) => `<div class="arr" data-f="${k}"><span class="kth" style="color:#e0302a">▲</span><div class="nm"><div>${faStDot(x.p.fa)} <b>${escapeHtml(x.p.fa.cs || labelOf(x.a, x.i))}</b>${x.p.fa.unit ? ' · ' + escapeHtml(x.p.fa.unit) : ''}${x.p.fa.reg ? ' · ' + escapeHtml(x.p.fa.reg) : ''}</div><div>${faTxt(x.p.fa)}</div></div><button data-a="ok">Выбрать</button></div>`).join('') : '<div class="empty">Огневых средств с карточкой нет — заведите их кнопкой «Огн. ср.» слева</div>')
+ (C.length ? '<div class="sub-h">Знаки орудий без карточки</div>' + C.slice(0, 60).map((x, k) => `<div class="arr" data-c="${k}"><span class="kth">▲</span><div class="nm"><div>${escapeHtml(labelOf(x.a, x.i))}</div><div>${escapeHtml(x.a.name)}</div></div><button data-a="ok">Выбрать</button></div>`).join('') : '');
$('pkList').querySelectorAll('[data-f]').forEach(r => r.querySelector('[data-a=ok]').onclick = () => { const x = F[+r.dataset.f], fa = x.p.fa; t.gun = {lat:x.p.lat, lng:x.p.lng, h:x.p.h}; t.gname = fa.cs || labelOf(x.a, x.i); t.sys = SYS[fa.sys] ? fa.sys : t.sys; t.faId = fa.id; t.maxOv = +fa.max || null; t.ammoT = null; pkDone(t, 'gun'); });
$('pkList').querySelectorAll('[data-c]').forEach(r => r.querySelector('[data-a=ok]').onclick = () => { const x = C[+r.dataset.c]; t.gun = {lat:x.p.lat, lng:x.p.lng}; t.gname = labelOf(x.a, x.i); t.sys = FA_KIND[itKind(x.a, x.p)] || t.sys; t.faId = null; t.maxOv = null; pkDone(t, 'gun'); }); };
$('pkQ').oninput = draw; draw(); $('pkMap').onclick = () => { $('pkModal').classList.remove('open'); CT = t; corrPick = 'gun'; corrDraw(); corrPanel(); toast('Коснитесь огневой позиции или знака орудия'); }; openModal('pkModal'); }
function pickTgt(t){ pkModal(); $('pkH').textContent = 'Выбор цели'; $('pkQ').value = '';
const enemy = [], plan = []; state.arrays.forEach(a => { if (a.zones || a.meetL || a.kind === 'aux') return; a.points.forEach((p, i) => { if (a.fplan) plan.push({a, p, i}); else if (sideOf(a, p) === 'b') enemy.push({a, p, i}); }); });
const draw = () => { const q = $('pkQ').value.trim().toLowerCase(), f = L1 => L1.filter(x => !q || (labelOf(x.a, x.i) + ' ' + (x.p.ch || '') + ' ' + (x.p.tno || '') + ' ' + x.a.name).toLowerCase().includes(q)), P = f(plan), E = f(enemy);
const row = (x, k, g) => { const d = t.gun ? distM(t.gun, x.p) : 0; return `<div class="arr" data-${g}="${k}"><span class="kth" style="color:#1f5fe0">⊕</span><div class="nm"><div><b>${escapeHtml(String(x.p.tno || labelOf(x.a, x.i)))}</b>${x.p.ch ? ' · ' + escapeHtml(x.p.ch) : ''}</div><div>${escapeHtml(x.a.name)}${d ? ' · ' + fmtDist(d) : ''}</div></div><button data-a="ok">Выбрать</button></div>`; };
$('pkList').innerHTML = '<div class="sub-h">Плановые цели (ТЗ)</div>' + (P.slice(0, 120).map((x, k) => row(x, k, 'p')).join('') || '<div class="empty">Нет</div>') + '<div class="sub-h">Противник на карте</div>' + (E.slice(0, 120).map((x, k) => row(x, k, 'e')).join('') || '<div class="empty">Нет</div>');
const bind = (g, Lx) => $('pkList').querySelectorAll(`[data-${g}]`).forEach(r => r.querySelector('[data-a=ok]').onclick = () => { const x = Lx[+r.dataset[g]]; setTgt(t, x); });
bind('p', P); bind('e', E); };
$('pkQ').oninput = draw; draw(); $('pkMap').onclick = () => { $('pkModal').classList.remove('open'); CT = t; corrPick = 'tgt'; corrDraw(); corrPanel(); toast('Коснитесь цели'); }; openModal('pkModal'); }
// новая цель для задачи, по которой уже стреляли, — новая задача с тем же орудием (как при касании карты)
function setTgt(t, x){ let T = t; if (t.tgt && (t.shots || []).length){ T = newTask(); ['gun', 'sys', 'rs', 'gname', 'faId', 'maxOv', 'ammoT'].forEach(k => { T[k] = t[k]; }); const i = MIX.indexOf(t.id); if (i >= 0){ MIX[i] = T.id; lsSet('skat_mix', MIX); } }
T.tgt = {lat:x.p.lat, lng:x.p.lng, h:x.p.h}; T.name = String(x.p.tno || labelOf(x.a, x.i)); T.obj = x.p.ch || (x.p.tno ? '' : labelOf(x.a, x.i)); T.cat = catOfSym(x.p.sym || x.a.sym) || T.cat || 1; pkDone(T, 'tgt'); }
function pkDone(t, what){ $('pkModal').classList.remove('open'); CT = t; corrPick = null; corrEnd = false; persist(); corrDraw(); corrPanel(); if (what === 'gun' && !t.tgt) setTimeout(() => pickTgt(t), 150); else toast(what === 'gun' ? `Орудие: ${t.gname || ''}` : `Цель ${t.name}`); }
// ---- окно «Огневые средства»: по полкам и подразделениям
function renderFa(){ keepScroll('faModal', () => { const F = faAll(), C = faCand(), G = new Map(); F.forEach(x => { const k = (x.p.fa.reg || 'Без полка') + ' / ' + (x.p.fa.unit || 'без подразделения'); if (!G.has(k)) G.set(k, []); G.get(k).push(x); });
$('faList').innerHTML = (F.length ? [...G.entries()].sort().map(([k, L1]) => `<div class="sub-h">${escapeHtml(k)}</div>` + L1.map(x => `<div class="arr" data-id="${x.p.fa.id}"><span class="kth" style="color:#e0302a">▲</span><div class="nm"><div>${faStDot(x.p.fa)} <b>${escapeHtml(x.p.fa.cs || labelOf(x.a, x.i))}</b> · ${escapeHtml((SYS[x.p.fa.sys] || SYS.d30).n)}${x.p.fa.n ? ' × ' + x.p.fa.n : ''}${(x.p.fa.moves || []).length ? ' · смен ОП ' + x.p.fa.moves.length : ''}</div><div>БП: ${(x.p.fa.ammo || []).map(z => `${escapeHtml(z.t)} ${+z.have || 0}${z.norm ? ' (норма ' + z.norm + ')' : ''}`).join(', ') || 'не указаны'}</div></div><button data-a="go">Показать</button><button class="eye" data-a="ed">✎</button></div>`).join('')).join('') : '<div class="empty">Карточек пока нет</div>')
+ (C.length ? '<div class="sub-h">Знаки орудий без карточки</div>' + C.slice(0, 80).map((x, k) => `<div class="arr" data-c="${k}"><span class="kth">▲</span><div class="nm"><div>${escapeHtml(labelOf(x.a, x.i))}</div><div>${escapeHtml(x.a.name)}</div></div><button data-a="add">+ Карточка</button></div>`).join('') : '');
$('faList').querySelectorAll('.arr[data-id]').forEach(r => { const x = faFind(+r.dataset.id); r.querySelector('[data-a=go]').onclick = () => { closeModals(); map.setView([x.p.lat, x.p.lng], Math.max(map.getZoom(), 15)); }; r.querySelector('[data-a=ed]').onclick = () => openFaEd(x);
swipeable(r, () => askConfirm(`Убрать карточку «${x.p.fa.cs || 'орудие'}»? Знак на карте останется.`, 'Убрать', () => { delete x.p.fa; persist(); renderFa(); })); });
$('faList').querySelectorAll('.arr[data-c]').forEach(r => r.querySelector('[data-a=add]').onclick = () => { const x = C[+r.dataset.c]; x.p.fa = {id:Date.now(), cs:labelOf(x.a, x.i), sys:FA_KIND[itKind(x.a, x.p)] || 'd30', n:1, ammo:[]}; persist(); openFaEd(x); }); }); }
let faRef = null;
function openFaEd(x){ faRef = x; const fa = x.p.fa; let m = $('faEdModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'faEdModal'; m.innerHTML = '<div class="card big"><h3>Карточка огневого средства</h3><div id="faEdBody"></div><div class="row"><button class="ghost" data-close>Отмена</button><button class="primary" id="faEdOk">Сохранить</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); const sys = SYS[fa.sys] || SYS.d30;
const am = () => (fa.ammo || []).map((z, k) => `<div class="duo" data-am="${k}" style="flex-wrap:wrap;border-bottom:1px solid rgba(128,128,128,.25);padding-bottom:6px;margin-bottom:6px"><label class="f">Снаряд / мина<input data-k="t" list="fdlSh" value="${escapeHtml(z.t || '')}" placeholder="ОФ-462"></label><label class="f">Взрыватель<input data-k="vz" list="fdlFz" value="${escapeHtml(z.vz || '')}"></label><label class="f">Заряд<input data-k="zr" list="fdlCh" value="${escapeHtml(z.zr || '')}"></label><label class="f">Наличие<input data-k="have" inputmode="numeric" value="${+z.have || 0}"></label><label class="f">Норма на цель<input data-k="norm" inputmode="numeric" value="${z.norm || ''}"></label><button class="eye" data-x="${k}" style="align-self:end">🗑</button></div>`).join('');
$('faEdBody').innerHTML = `<label class="f">Позывной<input id="fa_cs" value="${escapeHtml(fa.cs || '')}" autocomplete="off"></label><div class="duo"><label class="f">Полк<input id="fa_reg" value="${escapeHtml(fa.reg || '')}"></label><label class="f">Подразделение<input id="fa_unit" value="${escapeHtml(fa.unit || '')}"></label></div>
<label class="f">Состояние<select id="fa_st">${Object.entries(FA_ST).map(([k, v]) => `<option value="${k}"${k === faStOf(fa) ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label><label class="f">Система<select id="fa_sys">${sysOpts(fa.sys)}</select></label><div class="duo"><label class="f">Орудий<input id="fa_n" inputmode="numeric" value="${fa.n || 1}"></label><label class="f">Макс. дальность, м<input id="fa_max" inputmode="numeric" value="${fa.max || ''}" placeholder="${sys.max}"></label></div>
<div class="flabel">Боеприпасы</div><div id="fa_am">${am()}</div><button id="fa_amAdd">+ Тип боеприпасов</button><label class="f">Примечание<input id="fa_note" value="${escapeHtml(fa.note || '')}"></label>`;
const readAm = () => { $('fa_am').querySelectorAll('[data-am]').forEach(r => { const z = fa.ammo[+r.dataset.am]; r.querySelectorAll('input').forEach(i => { z[i.dataset.k] = ['t', 'vz', 'zr'].includes(i.dataset.k) ? i.value.trim() : Math.max(0, +i.value || 0); }); }); };
const bindAm = () => $('fa_am').querySelectorAll('[data-x]').forEach(b => b.onclick = () => { readAm(); fa.ammo.splice(+b.dataset.x, 1); $('fa_am').innerHTML = am(); bindAm(); });
bindAm(); $('fa_amAdd').onclick = () => { readAm(); (fa.ammo = fa.ammo || []).push({t:'', vz:'', zr:'', have:0, norm:0}); $('fa_am').innerHTML = am(); bindAm(); };
amDl(fa.sys); $('fa_sys').onchange = () => { $('fa_max').placeholder = (SYS[$('fa_sys').value] || SYS.d30).max || 'не задана'; amDl($('fa_sys').value); };
$('faEdOk').onclick = () => { readAm(); fa.st = $('fa_st').value; fa.cs = $('fa_cs').value.trim(); fa.reg = $('fa_reg').value.trim(); fa.unit = $('fa_unit').value.trim(); fa.sys = $('fa_sys').value; fa.n = Math.max(1, +$('fa_n').value || 1); fa.max = +$('fa_max').value || null; fa.note = $('fa_note').value.trim(); fa.ammo = (fa.ammo || []).filter(z => z.t); amLearn(fa.sys, fa.ammo);
state.ftasks.forEach(t => { if (t.faId === fa.id){ t.sys = fa.sys; t.maxOv = fa.max; t.gname = fa.cs || t.gname; } }); persist(); m.classList.remove('open'); if ($('faModal').classList.contains('open')) renderFa(); corrPanel(); toast('Карточка сохранена'); };
openModal('faEdModal'); }
$('faBtn').onclick = () => { renderFa(); openModal('faModal'); };
function faLine(t, short){ const r = t && t.faId && faFind(t.faId); if (!r) return ''; const A = r.p.fa.ammo || []; if (!A.length) return short ? 'БП не указаны' : '<div class="cdv">БП не указаны — заполните карточку</div>';
const cur = (A.find(z => z.t === t.ammoT) || A.find(z => (+z.have || 0) > 0) || A[0]).t;
if (short) return 'БП: ' + A.map(z => `${escapeHtml(z.t)} ${+z.have || 0}`).join(', ');
return `<div class="crow">БП:<select data-c="am">${A.map(z => `<option value="${escapeHtml(z.t)}"${z.t === cur ? ' selected' : ''}>${escapeHtml(z.t)} — ${+z.have || 0}${z.norm ? ' (норма ' + z.norm + ')' : ''}</option>`).join('')}</select></div>`; }
// ---- передача данных цели и ОП (текст в порядке ввода; буфер обмена / «Поделиться»)
function xferText(t){ const L1 = [], sk = q => { const s = GEO.toSK(q.lat, q.lng); return `X ${Math.round(s.x)}  Y ${Math.round(s.y)}${q.h != null && q.h !== '' ? '  H ' + Math.round(q.h) : ''}  кв. ${sqOf(s)}`; };
const r = t.faId && faFind(t.faId), fa = r && r.p.fa, A = fa && (fa.ammo || []), am = A && (A.find(z => z.t === t.ammoT) || A.find(z => (+z.have || 0) > 0) || A[0]);
L1.push(`ОП: ${t.gname || 'орудие'}${fa && fa.unit ? ' (' + fa.unit + ')' : ''}`, `Система: ${(SYS[t.sys] || SYS.d30).n}${fa && fa.n ? ', орудий ' + fa.n : ''}`); if (t.gun) L1.push('Координаты ОП: ' + sk(t.gun));
if (am) L1.push(`Боеприпас: ${am.t}${am.vz ? ', взр. ' + am.vz : ''}${am.zr ? ', заряд ' + am.zr : ''}${am.have != null ? ', в наличии ' + am.have : ''}`);
L1.push(`Цель № ${t.name || '—'}${t.obj ? ' — ' + t.obj : ''}`); if (t.tgt) L1.push('Координаты цели: ' + sk(t.tgt));
if (t.gun && t.tgt){ const d = distM(t.gun, t.tgt); L1.push(`Дальность (топогр.): ${Math.round(d)} м · дир. угол ${azTxt(t.gun, t.tgt)}`); }
return L1.join('\n'); }
async function xferSend(txt){ const Sh = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
try { if (Sh){ await Sh.share({title:'СКАТ: данные цели', text:txt, dialogTitle:'Передать данные'}); return; } if (navigator.share){ await navigator.share({title:'СКАТ: данные цели', text:txt}); return; } } catch(e){ if (e && e.name === 'AbortError') return; }
try { await navigator.clipboard.writeText(txt); toast('Данные скопированы — вставьте в программу'); } catch(e){ toast(txt); } }
// ======== ТОПОГЕОДЕЗИЯ: ПРЯМАЯ И ОБРАТНАЯ ЗАДАЧИ, ЗАСЕЧКИ, ПЕРЕСЧЁТ КООРДИНАТ, УГЛЫ ========
const DU = 6000, du2r = d => d / DU * 2 * Math.PI, r2du = r => ((r / (2 * Math.PI) * DU) % DU + DU) % DU;
const fmtDU = d => { const v = Math.round(d) % DU; return `${Math.floor(v / 100)}-${String(v % 100).padStart(2, '0')}`; };
const fmtDeg = r => { let g = (r * 180 / Math.PI % 360 + 360) % 360; const d = Math.floor(g), m = (g - d) * 60; return `${d}°${m.toFixed(1)}′`; };
let geoTab = 'dir', geoUnit = 'du';
function parseAng(s){ s = String(s || '').trim().replace(',', '.'); if (!s) return NaN; const m = s.match(/^(\d{1,2})-(\d{1,2})$/); if (m) return du2r(+m[1] * 100 + +m[2]); const v = parseFloat(s); if (isNaN(v)) return NaN; return geoUnit === 'du' && !/°/.test(s) ? du2r(v) : v * Math.PI / 180; }
const angOut = r => `${fmtDU(r2du(r))} (${fmtDeg(r)})`;
// короткие (5 цифр) координаты дополняются по центру карты
function fullXY(xs, ys){ const c = map.getCenter(), s0 = GEO.toSK(c.lat, c.lng), ex = (v, ref) => { v = +String(v).replace(/\s/g, ''); if (isNaN(v)) return NaN; if (v >= 1e5) return v; const b = ref - ref % 1e5; return [b - 1e5, b, b + 1e5].map(q => q + v).sort((p, q) => Math.abs(p - ref) - Math.abs(q - ref))[0]; }; return {x:ex(xs, s0.x), y:ex(ys, s0.y)}; }
const ptHtml = (k, l) => `<div class="flabel">${l}</div><div class="duo"><label class="f">X<input id="g${k}x" inputmode="numeric" autocomplete="off"></label><label class="f">Y<input id="g${k}y" inputmode="numeric" autocomplete="off"></label></div><div class="crow"><button data-pk="${k}">📍 С карты</button><button data-pc="${k}">Центр карты</button></div>`;
const angHtml = (id, l) => `<label class="f">${l} <small>(д.у. «45-00» или число в выбранных единицах)</small><input id="${id}" autocomplete="off"></label>`;
function geoPt(k){ return fullXY($('g' + k + 'x').value, $('g' + k + 'y').value); }
function geoSet(k, ll){ const s = GEO.toSK(ll.lat, ll.lng); $('g' + k + 'x').value = Math.round(s.x); $('g' + k + 'y').value = Math.round(s.y); }
function geoRes(html, pts){ $('geoOut').innerHTML = html + (pts && pts.length ? `<div class="crow" style="margin-top:6px"><button class="primary" id="geoPut">Поставить на карту</button><button id="geoCopy">Скопировать</button></div>` : '');
if (pts && pts.length){ $('geoPut').onclick = () => { let a = state.arrays.find(x => x.name === 'Топогеодезия'); if (!a){ a = normArr({id:Date.now(), kind:'pts', name:'Топогеодезия', ident:'Т', style:{color:'#8a2be2', name:'Фиолетовый', glyph:''}, points:[], shapes:[]}); state.arrays.push(a); }
pts.forEach(q => { const [la, lo] = GEO.fromSK(q.x, q.y); a.points.push({lat:+la.toFixed(7), lng:+lo.toFixed(7), name:q.n || ('Т' + (a.points.length + 1))}); }); persist(); renderMarkers(); const [la, lo] = GEO.fromSK(pts[0].x, pts[0].y); $('geoModal').classList.remove('open'); map.setView([la, lo], Math.max(map.getZoom(), 14)); toast('Точка поставлена в слой «Топогеодезия»'); };
$('geoCopy').onclick = () => { const t = $('geoOut').innerText; try { navigator.clipboard.writeText(t); toast('Скопировано'); } catch(e){ toast(t); } }; } }
const sq2 = (x, y) => sqOf({x, y});
function renderGeo(){ const T = {dir:'Прямая', inv:'Обратная', fwd:'Засечка прямая', res:'Засечка обратная', conv:'Пересчёт', ang:'Углы'};
$('geoTabs').innerHTML = Object.entries(T).map(([k, v]) => `<button data-g="${k}" class="${k === geoTab ? 'on' : ''}">${v}</button>`).join('');
$('geoTabs').querySelectorAll('button').forEach(b => b.onclick = () => { geoTab = b.dataset.g; renderGeo(); });
const unit = `<label class="f">Единицы углов<select id="geoU"><option value="du"${geoUnit === 'du' ? ' selected' : ''}>деления угломера (60-00)</option><option value="deg"${geoUnit === 'deg' ? ' selected' : ''}>градусы</option></select></label>`;
const F = {dir:ptHtml('a', 'Исходная точка А') + unit + `<label class="f">Дальность, м<input id="gD" inputmode="numeric"></label>` + angHtml('gA', 'Дирекционный угол'),
inv:ptHtml('a', 'Точка А') + ptHtml('b', 'Точка Б'),
fwd:unit + ptHtml('a', 'Пункт А') + angHtml('gA', 'Дирекционный угол с А на цель') + ptHtml('b', 'Пункт Б') + angHtml('gB', 'Дирекционный угол с Б на цель'),
res:unit + '<p class="status">Измерьте с точки стояния направления (одним прибором, от одного нуля) на три ориентира А, Б, В.</p>' + ptHtml('a', 'Ориентир А') + angHtml('gA', 'Отсчёт на А') + ptHtml('b', 'Ориентир Б') + angHtml('gB', 'Отсчёт на Б') + ptHtml('c', 'Ориентир В') + angHtml('gC', 'Отсчёт на В'),
conv:ptHtml('a', 'СК-42 (X, Y)') + `<div class="flabel">или WGS-84</div><div class="duo"><label class="f">Широта<input id="gLat" autocomplete="off" placeholder="51.123456 или 51°07′24″"></label><label class="f">Долгота<input id="gLon" autocomplete="off"></label></div>`,
ang:unit + angHtml('gA', 'Угол') + `<div class="duo"><label class="f">Склонение магнитное δ<input id="gDec" placeholder="+7°30′ → 7.5" inputmode="decimal"></label><label class="f">Сближение меридианов γ<input id="gConv" placeholder="авто по центру карты" inputmode="decimal"></label></div><label class="f">Угол задан как<select id="gKind"><option value="dir">дирекционный угол</option><option value="mag">магнитный азимут</option></select></label>`};
$('geoBody').innerHTML = F[geoTab] + '<div class="row" style="margin-top:8px"><button class="primary" id="geoGo">Рассчитать</button></div><div id="geoOut" class="cdv" style="margin-top:8px;font-size:15px;line-height:1.5"></div>';
if ($('geoU')) $('geoU').onchange = e => { geoUnit = e.target.value; };
$('geoBody').querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const k = b.dataset.pk; $('geoModal').classList.remove('open'); toast('Коснитесь точки на карте'); window.geoPickCb = ll => { const h = hitPoint(...(() => { const q = map.latLngToContainerPoint(ll), r = map.getContainer().getBoundingClientRect(); return [q.x + r.left, q.y + r.top, 30]; })()); geoSet(k, h && h.i != null ? h.a.points[h.i] : ll); openModal('geoModal'); }; });
$('geoBody').querySelectorAll('[data-pc]').forEach(b => b.onclick = () => geoSet(b.dataset.pc, map.getCenter()));
$('geoGo').onclick = geoCalc; }
function geoCalc(){ const bad = () => geoRes('<b>Проверьте исходные данные</b>');
try { if (geoTab === 'dir'){ const A = geoPt('a'), D = +$('gD').value, al = parseAng($('gA').value); if ([A.x, A.y, D, al].some(isNaN)) return bad();
const x = A.x + D * Math.cos(al), y = A.y + D * Math.sin(al); return geoRes(`Точка Б: <b>X ${Math.round(x)} Y ${Math.round(y)}</b><br>кв. ${sq2(x, y)}`, [{x, y}]); }
if (geoTab === 'inv'){ const A = geoPt('a'), B = geoPt('b'); if ([A.x, A.y, B.x, B.y].some(isNaN)) return bad(); const dx = B.x - A.x, dy = B.y - A.y, D = Math.hypot(dx, dy), al = Math.atan2(dy, dx);
return geoRes(`Дальность: <b>${D.toFixed(1)} м</b><br>Дирекционный угол А→Б: <b>${angOut(al)}</b><br>Обратный Б→А: ${angOut(al + Math.PI)}`); }
if (geoTab === 'fwd'){ const A = geoPt('a'), B = geoPt('b'), a1 = parseAng($('gA').value), a2 = parseAng($('gB').value); if ([A.x, A.y, B.x, B.y, a1, a2].some(isNaN)) return bad();
const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2), den = c1 * s2 - s1 * c2; if (Math.abs(den) < 1e-6) return geoRes('<b>Направления почти параллельны — засечка невозможна</b>');
const t = ((B.x - A.x) * s2 - (B.y - A.y) * c2) / den, x = A.x + t * c1, y = A.y + t * s1, g = Math.abs(a1 - a2) * 180 / Math.PI % 180;
return geoRes(`Цель: <b>X ${Math.round(x)} Y ${Math.round(y)}</b><br>кв. ${sq2(x, y)} · угол засечки ${Math.round(Math.min(g, 180 - g))}°${Math.min(g, 180 - g) < 30 ? ' — <b>мал, точность низкая</b>' : ''}`, [{x, y}]); }
if (geoTab === 'res'){ const P = ['a', 'b', 'c'].map(geoPt), d = ['gA', 'gB', 'gC'].map(id => parseAng($(id).value)); if (P.some(q => isNaN(q.x) || isNaN(q.y)) || d.some(isNaN)) return bad();
// метод Тинстры (с выбором ориентации по согласию измеренных углов)
const ang = (u, v) => { let r = (v - u) % (2 * Math.PI); return r < 0 ? r + 2 * Math.PI : r; }, cot = v => 1 / Math.tan(v);
const tri = (p, q, r) => { const a1 = Math.atan2(q.y - p.y, q.x - p.x), a2 = Math.atan2(r.y - p.y, r.x - p.x); let v = Math.abs(a1 - a2); return v > Math.PI ? 2 * Math.PI - v : v; };
const A = tri(P[0], P[1], P[2]), B = tri(P[1], P[2], P[0]), C = tri(P[2], P[0], P[1]);
const tien = dd => { const k1 = 1 / (cot(A) - cot(ang(dd[1], dd[2]))), k2 = 1 / (cot(B) - cot(ang(dd[2], dd[0]))), k3 = 1 / (cot(C) - cot(ang(dd[0], dd[1]))), K = k1 + k2 + k3; return {x:(k1 * P[0].x + k2 * P[1].x + k3 * P[2].x) / K, y:(k1 * P[0].y + k2 * P[1].y + k3 * P[2].y) / K}; };
const err = r => { let s = 0; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++){ const o = Math.atan2(P[j].y - r.y, P[j].x - r.x) - Math.atan2(P[i].y - r.y, P[i].x - r.x), m = d[j] - d[i]; s += Math.abs(Math.atan2(Math.sin(o - m), Math.cos(o - m))); } return isFinite(s) ? s : 1e9; };
const c1 = tien(d), c2 = tien(d.map(v => -v)), R = err(c1) <= err(c2) ? c1 : c2, x = R.x, y = R.y;
if (!isFinite(x) || !isFinite(y) || err(R) > .01) return geoRes('<b>Решения нет: проверьте отсчёты или точка стояния близка к окружности через ориентиры</b>');
return geoRes(`Точка стояния: <b>X ${Math.round(x)} Y ${Math.round(y)}</b><br>кв. ${sq2(x, y)}`, [{x, y, n:'ТС'}]); }
if (geoTab === 'conv'){ let la, lo; const sx = $('gax').value.trim(), la0 = $('gLat').value.trim();
const dms = s => { const n = String(s).replace(',', '.').match(/[\d.]+/g); if (!n) return NaN; return +n[0] + (+n[1] || 0) / 60 + (+n[2] || 0) / 3600; };
if (sx){ const A = geoPt('a'); if (isNaN(A.x) || isNaN(A.y)) return bad(); [la, lo] = GEO.fromSK(A.x, A.y); } else if (la0){ la = dms(la0); lo = dms($('gLon').value); } if (isNaN(la) || isNaN(lo)) return bad();
const s = GEO.toSK(la, lo), dm = v => { const d = Math.floor(v), m = (v - d) * 60, mi = Math.floor(m); return `${d}°${String(mi).padStart(2, '0')}′${((m - mi) * 60).toFixed(1)}″`; };
return geoRes(`СК-42: <b>X ${Math.round(s.x)} Y ${Math.round(s.y)}</b> (зона ${s.zone}) · кв. ${sqOf(s)}<br>WGS-84: <b>${la.toFixed(6)}, ${lo.toFixed(6)}</b><br>${dm(la)} с.ш., ${dm(lo)} в.д.<br>МГРС: <b>${mgrs(la, lo)}</b>`, [{x:s.x, y:s.y}]); }
if (geoTab === 'ang'){ const a = parseAng($('gA').value); if (isNaN(a)) return bad(); const c = map.getCenter(), z = GEO.zoneOf(c.lng), L0 = 6 * z - 3;
const gAuto = (c.lng - L0) * Math.sin(c.lat * Math.PI / 180), dec = parseFloat(String($('gDec').value).replace(',', '.')) || 0, gm = $('gConv').value.trim() ? parseFloat($('gConv').value.replace(',', '.')) : gAuto, P = (dec - gm) * Math.PI / 180;
const isDir = $('gKind').value === 'dir', dir = isDir ? a : a + P, mag = isDir ? a - P : a;
return geoRes(`Дирекционный угол: <b>${angOut(dir)}</b><br>Магнитный азимут: <b>${angOut(mag)}</b><br>Поправка направления (δ − γ): ${(dec - gm).toFixed(2)}° (${fmtDU(r2du(Math.abs(P)))}${P < 0 ? ', минус' : ''})<br>γ ${gm.toFixed(2)}°${$('gConv').value.trim() ? '' : ' (по центру карты)'}, δ ${dec}°`); }
} catch(e){ bad(); } }
// МГРС из WGS-84 (UTM)
function mgrs(lat, lon){ const a = 6378137, f = 1 / 298.257223563, e2 = f * (2 - f), ep2 = e2 / (1 - e2), k0 = .9996, zn = Math.floor((lon + 180) / 6) + 1, L0 = (zn * 6 - 183) * Math.PI / 180, ph = lat * Math.PI / 180, la = lon * Math.PI / 180;
const N = a / Math.sqrt(1 - e2 * Math.sin(ph) ** 2), T = Math.tan(ph) ** 2, C = ep2 * Math.cos(ph) ** 2, A = Math.cos(ph) * (la - L0);
const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * ph - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * ph) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * ph) - 35 * e2 ** 3 / 3072 * Math.sin(6 * ph));
const E = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
let Nn = k0 * (M + N * Math.tan(ph) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720)); if (lat < 0) Nn += 1e7;
const band = 'CDEFGHJKLMNPQRSTUVWXX'[Math.floor((lat + 80) / 8)], set = (zn - 1) % 6, colL = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'][set % 3], rowL = 'ABCDEFGHJKLMNPQRSTUV';
const col = colL[Math.floor(E / 1e5) - 1], row = rowL[(Math.floor(Nn / 1e5) + (set % 2 ? 5 : 0)) % 20], p5 = v => String(Math.floor(v % 1e5)).padStart(5, '0');
return `${zn}${band} ${col}${row} ${p5(E)} ${p5(Nn)}`; }
$('geoBtn').onclick = () => { renderGeo(); openModal('geoModal'); };
// ---- боеприпасы под систему: сначала ранее вводившиеся для этой системы, затем подходящие по калибру/типу, затем прочие
function amFor(sk, kind){ const s = SYS[sk] || SYS.d30, cal = +((s.n.match(/(\d+) мм/) || [])[1] || 0), g = s.g || '', L0 = (lsGet('skat_amsys', {})[sk] || {})[kind] || [];
let R = null; if (kind === 'sh'){ R = g === 'РСЗО' ? (/Град/.test(s.n) ? /^9М2[28]|^9М52|^9М53[89]/ : /Ураган/.test(s.n) ? /^9М27|^9М59/ : cal === 107 ? /^107/ : cal === 240 ? /^Р-240/ : null) : g === 'Гранатомёты' ? /ВОГ|ОГ-9/ : g === 'Миномёты' ? (cal === 82 ? /832/ : cal === 120 ? /843|ОФ-3[46]|ОФ-49|ОФ-5[06]|ОФ-68|ОФ-74/ : cal === 240 ? /864/ : null) : cal === 122 ? /462|463|365|ОФ-24|ОФ-56|Г-530|З-О-1/ : cal === 152 ? /540|530|55[012]|47[2]|482|ОФ25|ОФ29|ОФ45|ОФ61|ОФ64|З-О-2/ : null; }
if (kind === 'ch') return [...new Set([...L0, ...(g === 'РСЗО' ? ['Большое ТК', 'Малое ТК'] : g === 'Миномёты' ? ['Основной', 'Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый', 'Шестой', 'Дальнобойный', 'Особый'] : ['Гранатомёты', 'Танки и БМ'].includes(g) ? ['Штатный'] : ['Полный', 'Уменьшенный', 'Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый', 'Шестой', 'Седьмой', 'Восьмой', 'Специальный', 'Штатный'])])];
const ref = AMMO_REF[kind] || [], hit = R ? ref.filter(v => R.test(v)) : []; return [...new Set([...L0, ...hit, ...ref])]; }
function amLearn(sk, A){ const M = lsGet('skat_amsys', {}), m = M[sk] = M[sk] || {}; [['sh', 't'], ['fz', 'vz'], ['ch', 'zr']].forEach(([k, f]) => { A.forEach(z => { if (z[f]){ m[k] = [z[f], ...(m[k] || []).filter(v => v !== z[f])].slice(0, 30); } }); }); lsSet('skat_amsys', M); }
function amDl(sk){ let d = $('fdl'); if (!d){ d = document.createElement('div'); d.id = 'fdl'; document.body.appendChild(d); } d.innerHTML = [['fdlSh', 'sh'], ['fdlFz', 'fz'], ['fdlCh', 'ch']].map(([id, k]) => `<datalist id="${id}">${amFor(sk, k).map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>`).join(''); }
// ---- ведомость БП (Excel)
function exportAmmo(){ const aoa = [['Полк', 'Подразделение', 'Позывной', 'Система', 'Орудий', 'Снаряд / мина', 'Взрыватель', 'Заряд', 'Наличие', 'Норма на цель', 'Израсходовано за сутки', 'Израсходовано всего']], day = Date.now() - 864e5;
faAll().forEach(({p}) => { const fa = p.fa, sp = {}, spd = {}; state.ftasks.forEach(t => { if (t.faId === fa.id) (t.shots || []).forEach(s => { const k = s.am || '—'; sp[k] = (sp[k] || 0) + (s.n || 1); if (s.t > day) spd[k] = (spd[k] || 0) + (s.n || 1); }); });
(fa.ammo && fa.ammo.length ? fa.ammo : [{t:''}]).forEach(z => aoa.push([fa.reg || '', fa.unit || '', fa.cs || '', (SYS[fa.sys] || SYS.d30).n, fa.n || 1, z.t || '', z.vz || '', z.zr || '', +z.have || 0, +z.norm || '', spd[z.t] || 0, sp[z.t] || 0])); });
const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [14, 16, 14, 24, 7, 14, 12, 12, 9, 10, 12, 12].map(w => ({wch:w})); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Ведомость БП');
const mv = [['Позывной', 'Подразделение', 'Время', 'Откуда X', 'Откуда Y', 'Куда X', 'Куда Y', 'Расстояние, м']]; faAll().forEach(({p}) => (p.fa.moves || []).forEach(m => { const a1 = GEO.toSK(m.from[0], m.from[1]), b1 = GEO.toSK(m.to[0], m.to[1]); mv.push([p.fa.cs || '', p.fa.unit || '', fmtDT(m.t), Math.round(a1.x), Math.round(a1.y), Math.round(b1.x), Math.round(b1.y), m.d]); }));
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(mv), 'Смена ОП');
deliverFile(new Blob([XLSX.write(wb, {bookType:'xlsx', type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Ведомость_БП_${stamp()}.xlsx`, 'Ведомость боеприпасов готова'); }
// ---- история цели: все задачи и записи журнала по одному номеру цели
function tgtHistory(name){ const T = state.ftasks.filter(t => t.name === name), J = state.ftlog.filter(r => r.name === name); let m = $('thModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'thModal'; m.innerHTML = '<div class="card big"><h3 id="thH"></h3><div id="thB"></div><div class="row"><button class="ghost" data-close>Закрыть</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); const st = T.reduce((q, t) => { const s = shotStats(t); ['shots', 'n', 'hit', 'dev', 'nobs', 'mis'].forEach(k => q[k] += s[k]); return q; }, {shots:0, n:0, hit:0, dev:0, nobs:0, mis:0}), last = J.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
$('thH').textContent = `История цели ${name}`; $('thB').innerHTML = `<div class="cdv">Статус: <b>${escapeHtml(last ? last.res : (T.find(t => t.res) || {}).res || 'не поражена')}</b> · задач ${T.length} · ${statTxt(st)}</div>` + T.map(t => { const s = shotStats(t); return `<div class="arr"><div class="nm"><div>${escapeHtml(t.gname || 'орудие')} · ${escapeHtml((SYS[t.sys] || SYS.d30).n)}${t.res ? ' · <b>' + escapeHtml(t.res) + '</b>' : ''}</div><div>${fmtDT(t.id)} · выстрелов ${s.shots}, снарядов ${s.n}: в цель ${s.hit}, откл. ${s.dev}</div></div></div>`; }).join('') + (J.length ? '<div class="sub-h">Журнал</div>' + J.map(r => `<div class="arr"><div class="nm"><div>${fmtDT(r.date)} — <b>${escapeHtml(r.res || '')}</b></div><div>${escapeHtml(r.fa || '')} · снарядов ${r.n || 0}${r.note ? ' · ' + escapeHtml(r.note) : ''}</div></div></div>`).join('') : '');
openModal('thModal'); }
// ---- файл проекта: все слои, задачи, журнал, сцены — для переноса между ПК и Android и резервной копии
function saveProject(){ const d = {skatProject:1, ver:VERSION, date:new Date().toISOString(), ftlog:state.ftlog, ftasks:state.ftasks, arrays:state.arrays, scenes:state.scenes, palette:state.palette, mix:MIX, amsys:lsGet('skat_amsys', {}), sig:lsGet('skat_sig', [])};
deliverFile(new Blob([JSON.stringify(d)], {type:'application/json'}), `СКАТ_проект_${stamp()}.json`, 'Файл проекта готов'); }
function openProject(){ const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const d = JSON.parse(await f.text()); if (!d.skatProject) throw 0;
askConfirm(`Открыть проект от ${fmtDT(d.date)}? Текущие слои, задачи и журнал будут заменены (сделайте «Сохранить проект», если они нужны).`, 'Открыть', () => { ['ftlog', 'ftasks', 'arrays', 'scenes', 'palette'].forEach(k => { if (Array.isArray(d[k])) state[k] = d[k]; }); if (d.mix) lsSet('skat_mix', d.mix); if (d.amsys) lsSet('skat_amsys', d.amsys); if (d.sig) lsSet('skat_sig', d.sig); persistNow(); toast('Проект открыт'); setTimeout(() => location.reload(), 600); }); } catch(e){ toast('Это не файл проекта СКАТ'); } }; inp.click(); }
$('faXls').onclick = exportAmmo; $('faTrk').textContent = faTrkOn ? 'Следы ОП: вкл' : 'Следы ОП: выкл'; $('faTrk').onclick = () => { faTrkOn = !faTrkOn; lsSet('skat_trk', faTrkOn); $('faTrk').textContent = faTrkOn ? 'Следы ОП: вкл' : 'Следы ОП: выкл'; faTracks(); };
// ======== СМЕНА ОП: ЖУРНАЛ ПЕРЕМЕЩЕНИЙ И СЛЕДЫ КОЛЁС; СОСТОЯНИЕ ОГНЕВЫХ СРЕДСТВ ========
const FA_ST = {ready:['Готово', '#2f9e44'], march:['На марше', '#1f7ae0'], reload:['Пополнение БП', '#e8a33a'], broken:['Неисправно', '#d9362c']};
const faStOf = fa => FA_ST[fa.st] ? fa.st : 'ready', faStDot = fa => `<span class="fadot" style="background:${FA_ST[faStOf(fa)][1]}" title="${FA_ST[faStOf(fa)][0]}"></span>`;
const faTrkL = L.layerGroup().addTo(map); let faTrkOn = lsGet('skat_trk', true);
// перемещение знака огневого средства более чем на 20 м — запись смены ОП
function faTrackMoves(){ let ch = false; faAll().forEach(({a, i, p}) => { const fa = p.fa; if (!fa.pos){ fa.pos = [p.lat, p.lng]; return; } const d = distM({lat:fa.pos[0], lng:fa.pos[1]}, p); if (d > 20){ (fa.moves = fa.moves || []).push({t:Date.now(), from:fa.pos, to:[p.lat, p.lng], d:Math.round(d)}); fa.pos = [p.lat, p.lng]; ch = true;
state.ftasks.forEach(t => { if (t.faId === fa.id && !(t.shots || []).length) t.gun = {lat:p.lat, lng:p.lng, h:p.h}; }); } }); return ch; }
function faTracks(){ faTrkL.clearLayers(); faAll().forEach(({p}) => { const fa = p.fa;
if (faTrkOn) (fa.moves || []).forEach(m => { const [kx, ky] = mk(m.from[0]), dx = (m.to[1] - m.from[1]) * kx, dy = (m.to[0] - m.from[0]) * ky, D = Math.hypot(dx, dy) || 1, ox = -dy / D * 1.6, oy = dx / D * 1.6;
[1, -1].forEach(sg => faTrkL.addLayer(L.polyline([[m.from[0] + sg * oy / ky, m.from[1] + sg * ox / kx], [m.to[0] + sg * oy / ky, m.to[1] + sg * ox / kx]], {color:'#4a3a28', weight:2.2, opacity:.8, dashArray:'3 3', interactive:false})));
faTrkL.addLayer(L.circleMarker([m.from[0], m.from[1]], {radius:4, color:'#4a3a28', weight:1.5, fillColor:'#fff', fillOpacity:.9, interactive:false})); });
faTrkL.addLayer(L.marker([p.lat, p.lng], {interactive:false, keyboard:false, icon:L.divIcon({className:'plc-wrap', iconSize:[0, 0], html:`<div class="fadotmap" style="background:${FA_ST[faStOf(fa)][1]}"></div>`})})); }); }
{ const pr0 = persist; window.persist = (...a) => { try { if (faTrackMoves()) setTimeout(faTracks, 0); } catch(e){} return pr0(...a); }; }
{ const rm0 = renderMarkers; window.renderMarkers = (...a) => { const r = rm0(...a); try { faTracks(); } catch(e){} return r; }; }
setTimeout(() => { faAll().forEach(({p}) => { if (!p.fa.pos) p.fa.pos = [p.lat, p.lng]; }); faTracks(); }, 0);
// ======== СВОДКА ЗА СУТКИ, СИГНАЛЫ ========
function sumData(h){ const t0 = Date.now() - h * 36e5, by = {}, J = state.ftlog.filter(r => new Date(r.date).getTime() >= t0);
state.ftasks.forEach(t => (t.shots || []).forEach(s => { if (s.t < t0) return; const r = t.faId && faFind(t.faId), u = r ? (r.p.fa.unit || r.p.fa.reg || 'без подразделения') : 'без карточки', k = u + '|' + (SYS[t.sys] || SYS.d30).n; by[k] = (by[k] || 0) + (s.n || 1); }));
return {J, by, kill:J.filter(r => r.res === 'Уничтожена').length, sup:J.filter(r => r.res === 'Подавлена').length, n:Object.values(by).reduce((q, v) => q + v, 0)}; }
function renderSum(el, row){ const D = sumData(24);
el.innerHTML = `<div class="cdv" style="font-size:15px;line-height:1.6">За 24 часа: задач выполнено <b>${D.J.length}</b> (уничтожено ${D.kill}, подавлено ${D.sup}), израсходовано снарядов <b>${D.n}</b></div><div class="sub-h">Расход по подразделениям и системам</div>`
+ (Object.keys(D.by).length ? Object.entries(D.by).sort().map(([k, v]) => { const [u, s] = k.split('|'); return `<div class="arr"><div class="nm"><div>${escapeHtml(u)}</div><div>${escapeHtml(s)}</div></div><b>${v}</b></div>`; }).join('') : '<div class="empty">Выстрелов за сутки нет</div>')
+ '<div class="sub-h">Состояние огневых средств</div>' + (faAll().map(({a, i, p}) => `<div class="arr"><div class="nm"><div>${faStDot(p.fa)} ${escapeHtml(p.fa.cs || labelOf(a, i))}</div><div>${FA_ST[faStOf(p.fa)][0]} · БП ${faLeft(p.fa)}${(p.fa.moves || []).length ? ' · смен ОП ' + p.fa.moves.length : ''}</div></div></div>`).join('') || '<div class="empty">Карточек нет</div>');
row.innerHTML = '<button class="primary" id="sumXls">Донесение (Excel)</button>'; $('sumXls').onclick = () => { const aoa = [['Донесение о выполнении огневых задач за 24 ч', '', '', `на ${new Date().toLocaleString('ru-RU')}`], [], ['Выполнено задач', D.J.length], ['Уничтожено целей', D.kill], ['Подавлено целей', D.sup], ['Израсходовано снарядов', D.n], [], ['Подразделение', 'Система', 'Израсходовано']];
Object.entries(D.by).sort().forEach(([k, v]) => { const [u, s] = k.split('|'); aoa.push([u, s, v]); }); aoa.push([], ['№ цели', 'Объект', 'Огневое средство', 'Результат', 'Снарядов', 'Время']); D.J.forEach(r => aoa.push([r.name, r.obj, r.fa, r.res, r.n, fmtDT(r.date)]));
const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = [{wch:26}, {wch:26}, {wch:18}, {wch:16}, {wch:10}, {wch:16}]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Сводка');
deliverFile(new Blob([XLSX.write(wb, {bookType:'xlsx', type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Сводка_${stamp()}.xlsx`, 'Донесение готово'); }; }
const sigList = () => lsGet('skat_sig', []);
function renderSig(el, row){ const S = sigList(); el.innerHTML = (S.length ? S.map((s, k) => `<div class="arr" data-k="${k}"><span class="kth">⚑</span><div class="nm"><div><b>${escapeHtml(s.n)}</b></div><div>${escapeHtml(s.m || '')}</div></div><button class="eye" data-a="ed">✎</button></div>`).join('') : '<div class="empty">Сигналов нет. Добавьте, например: «Вьюга» — открыть огонь по плану</div>')
+ '<div class="sub-h">Позывные огневых средств</div>' + (faAll().map(({p}) => `<div class="kid"><span class="kn">${faStDot(p.fa)} <b>${escapeHtml(p.fa.cs || '—')}</b> · ${escapeHtml([p.fa.unit, p.fa.reg].filter(Boolean).join(', '))} · ${escapeHtml((SYS[p.fa.sys] || SYS.d30).n)}</span></div>`).join('') || '<div class="empty">Нет</div>');
row.innerHTML = '<button class="primary" id="sigAdd">+ Сигнал</button>';
const ed = k => { const s = k == null ? {n:'', m:''} : S[k], n = prompt('Сигнал (например, Вьюга)', s.n); if (n == null || !n.trim()) return; const m = prompt('Значение сигнала', s.m || ''); if (m == null) return; if (k == null) S.push({n:n.trim(), m:m.trim()}); else Object.assign(S[k], {n:n.trim(), m:m.trim()}); lsSet('skat_sig', S); renderFt(); };
$('sigAdd').onclick = () => ed(null); el.querySelectorAll('.arr[data-k]').forEach(r => { r.querySelector('[data-a=ed]').onclick = () => ed(+r.dataset.k); swipeable(r, () => { S.splice(+r.dataset.k, 1); lsSet('skat_sig', S); renderFt(); }); }); }
// ======== ЕДИНЫЙ ПОИСК: цели, огневые средства, задачи, журнал ========
function openSearch(){ let m = $('usModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'usModal'; m.innerHTML = '<div class="card big"><h3>Поиск</h3><input id="usQ" placeholder="Номер цели, позывной, характер, подразделение…" autocomplete="off" style="width:100%"><div id="usR" style="margin-top:8px"></div><div class="row"><button class="ghost" data-close>Закрыть</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); const go = (lat, lng) => { closeModals(); map.setView([lat, lng], Math.max(map.getZoom(), 15)); };
const run = () => { const q = $('usQ').value.trim().toLowerCase(); if (q.length < 2){ $('usR').innerHTML = '<div class="empty">Введите не меньше 2 символов</div>'; return; } const R = [], has = s => String(s || '').toLowerCase().includes(q);
state.arrays.forEach(a => a.points.forEach((p, i) => { if (R.length < 200 && (has(p.tno) || has(labelOf(a, i)) || has(p.ch) || (p.fa && (has(p.fa.cs) || has(p.fa.unit) || has(p.fa.reg))))) R.push({g:p.fa ? 'Огневые средства' : a.fplan ? 'Плановые цели' : 'Точки на карте', t:p.fa ? p.fa.cs || labelOf(a, i) : String(p.tno || labelOf(a, i)), s:(p.ch ? p.ch + ' · ' : '') + a.name, f:() => go(p.lat, p.lng)}); }));
state.ftasks.forEach(t => { if (has(t.name) || has(t.gname) || has(t.obj)) R.push({g:'Огневые задачи', t:`Цель ${t.name || '…'}`, s:`${t.gname || ''}${t.res ? ' · ' + t.res : ''}`, f:() => { closeModals(); CT = t; corrDraw(); corrPanel(); if (t.tgt) map.setView([t.tgt.lat, t.tgt.lng], Math.max(map.getZoom(), 14)); }}); });
state.ftlog.forEach(r => { if (has(r.name) || has(r.fa) || has(r.obj) || has(r.note)) R.push({g:'Журнал', t:`${r.name || ''} — ${r.res || ''}`, s:`${fmtDT(r.date)} · ${r.fa || ''}`, f:() => tgtHistory(r.name)}); });
const G = {}; R.forEach((x, k) => (G[x.g] = G[x.g] || []).push(k));
$('usR').innerHTML = R.length ? Object.entries(G).map(([g, K]) => `<div class="sub-h">${g} (${K.length})</div>` + K.slice(0, 50).map(k => `<div class="arr" data-k="${k}"><div class="nm"><div><b>${escapeHtml(R[k].t)}</b></div><div>${escapeHtml(R[k].s)}</div></div></div>`).join('')).join('') : '<div class="empty">Ничего не найдено</div>';
$('usR').querySelectorAll('[data-k]').forEach(r => r.onclick = () => R[+r.dataset.k].f()); };
$('usQ').oninput = run; $('usQ').value = ''; run(); openModal('usModal'); setTimeout(() => $('usQ').focus(), 150); }
$('usBtn').onclick = openSearch;
// ======== ЗОНЫ: ПРАВКА КОНТУРА ПЕРЕТАСКИВАНИЕМ, «КТО ПОРАЖАЕТ» ========
const zdL = L.layerGroup().addTo(map); let zdRef = null;
const qLL = q => [q[0] ?? q.lat, q[1] ?? q.lng], qSet = (sh, k, ll) => { const q = sh.pts[k]; if (Array.isArray(q)){ q[0] = +ll.lat.toFixed(7); q[1] = +ll.lng.toFixed(7); } else { q.lat = +ll.lat.toFixed(7); q.lng = +ll.lng.toFixed(7); } };
function floatBar(html){ let b = $('fbar'); if (!b){ b = document.createElement('div'); b.id = 'fbar'; b.className = 'glass'; document.body.appendChild(b); } b.innerHTML = html; b.classList.toggle('on', !!html); return b; }
function zoneDrag(a, sh){ if (!sh.pts || sh.type === 'circle'){ toast('Эту фигуру так править нельзя'); return; } closeModals(); zdRef = {a, sh, bak:JSON.stringify(sh.pts)}; zdDraw();
floatBar(`<b>${escapeHtml(sh.name || 'Контур')}</b><span>Перетаскивайте точки. Касание середины стороны — новая точка, двойное касание точки — удалить</span><button id="zdOk" class="primary">Готово</button><button id="zdNo">Отмена</button>`);
$('zdOk').onclick = () => { zdEnd(true); }; $('zdNo').onclick = () => { zdRef.sh.pts = JSON.parse(zdRef.bak); zdEnd(false); }; }
function zdDraw(){ zdL.clearLayers(); if (!zdRef) return; const sh = zdRef.sh, P = sh.pts.map(qLL);
zdL.addLayer(L.polygon(P, {color:'#ffd400', weight:2, dashArray:'5 4', fill:false, interactive:false}));
P.forEach((ll, k) => { const m = L.marker(ll, {draggable:true, zIndexOffset:2000, icon:L.divIcon({className:'plc-wrap', iconSize:[0, 0], html:'<div class="zdh"></div>'})});
m.on('drag', e => { qSet(sh, k, e.target.getLatLng()); renderMarkers(); zdL.eachLayer(l => { if (l instanceof L.Polygon) l.setLatLngs(sh.pts.map(qLL)); }); }); m.on('dragend', zdDraw);
m.on('dblclick', () => { if (sh.pts.length > 3){ sh.pts.splice(k, 1); renderMarkers(); zdDraw(); } }); zdL.addLayer(m); });
P.forEach((ll, k) => { const n = P[(k + 1) % P.length], mid = [(ll[0] + n[0]) / 2, (ll[1] + n[1]) / 2], m = L.marker(mid, {zIndexOffset:1900, icon:L.divIcon({className:'plc-wrap', iconSize:[0, 0], html:'<div class="zdm">+</div>'})});
m.on('click', () => { const q0 = sh.pts[0]; sh.pts.splice(k + 1, 0, Array.isArray(q0) ? [mid[0], mid[1]] : {lat:mid[0], lng:mid[1]}); renderMarkers(); zdDraw(); }); zdL.addLayer(m); }); }
function zdEnd(save){ zdL.clearLayers(); floatBar(''); if (save && zdRef.a.zones) state.arrays.forEach(L1 => { if (L1.fplan) L1.points.forEach(q => planNum(L1, q)); }); zdRef = null; persist(); renderMarkers(); toast(save ? 'Контур сохранён' : 'Изменения отменены'); }
// «Кто поражает» — поле с подсказками (огневые средства, подразделения) в окне правки зоны
{ const w = $('seZnW'); if (w && !$('seWho')){ w.insertAdjacentHTML('beforeend', '<label class="f">Кто поражает<input id="seWho" list="whoDl" autocomplete="off" placeholder="позывной, подразделение"></label><datalist id="whoDl"></datalist><button id="seDrag" style="margin:4px 0 8px">✥ Перетащить точки контура</button>'); } }
{ const o0 = openShapeEd; window.openShapeEd = (a, i) => { o0(a, i); const sh = a.shapes[i]; $('seWho').value = sh.who || ''; $('whoDl').innerHTML = [...new Set(faAll().flatMap(({p}) => [p.fa.cs, p.fa.unit, p.fa.reg]).filter(Boolean))].map(v => `<option value="${escapeHtml(v)}">`).join('');
$('seDrag').onclick = () => zoneDrag(a, sh); }; }
{ const ok0 = $('seOk').onclick; $('seOk').onclick = () => { if (shRef && shRef.a.zones) shRef.sh.who = $('seWho').value.trim(); ok0(); }; }
const zoneWho = sh => sh.who || colName(sh.color || '#e2533f');
// ======== ЛЕСОПОЛОСЫ: КОНТУРЫ ПО ПРИНЦИПУ МАССИВА, БЛИЖАЙШАЯ ЛЕСОПОЛОСА ========
const lpL = L.layerGroup().addTo(map); let lpMode = null;
function lpLayer(){ let a = state.arrays.find(x => x.lpL); if (!a){ a = normArr({id:Date.now(), kind:'shapes', lpL:true, name:'Лесополосы', ident:'лп', style:{color:'#2f7a34', name:'Зелёный', glyph:''}, points:[], shapes:[]}); state.arrays.push(a); } return a; }
function lpStart(){ closeModals(); lpMode = {pts:[]}; lpBar(); toast('Обводите лесополосу касаниями по контуру'); }
function lpBar(){ if (!lpMode){ floatBar(''); lpL.clearLayers(); return; } lpL.clearLayers(); if (lpMode.pts.length) lpL.addLayer(L.polyline(lpMode.pts.concat(lpMode.pts.length > 2 ? [lpMode.pts[0]] : []), {color:'#2f7a34', weight:3, dashArray:'6 4', interactive:false})); lpMode.pts.forEach(p => lpL.addLayer(L.circleMarker(p, {radius:4, color:'#fff', weight:2, fillColor:'#2f7a34', fillOpacity:1, interactive:false})));
floatBar(`<b>Лесополоса: точек ${lpMode.pts.length}</b><span>Нажмите и ведите пальцем по краю лесополосы — контур замкнётся сам. Или касайтесь углов по очереди и нажмите «Замкнуть»</span><button id="lpUn" ${lpMode.pts.length ? '' : 'disabled'}>↶</button><button id="lpOk" class="primary" ${lpMode.pts.length > 2 ? '' : 'disabled'}>Замкнуть и назвать</button><button id="lpEnd">Готово</button>`);
$('lpUn').onclick = () => { lpMode.pts.pop(); lpBar(); }; $('lpEnd').onclick = () => { lpMode = null; lpBar(); renderMarkers(); };
$('lpOk').onclick = () => { const n = prompt('Название лесополосы (например, лп Сизо)', ''); if (n === null) return; const a = lpLayer(); a.shapes.push({type:'poly', pts:lpMode.pts.map(q => [q[0], q[1]]), name:n.trim() || ('лп ' + (a.shapes.length + 1)), color:'#2f7a34', op:30, lp:true}); persist(); lpMode = {pts:[]}; lpBar(); renderMarkers(); toast('Сохранено. Обводите следующую'); }; }
function lpTap(ll){ lpMode.pts.push([+ll.lat.toFixed(7), +ll.lng.toFixed(7)]); lpBar(); }
function inPoly(lat, lng, P){ let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const [yi, xi] = P[i], [yj, xj] = P[j]; if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) c = !c; } return c; }
function segDist(p, a, b){ const [kx, ky] = mk(p.lat), ax = (a[1] - p.lng) * kx, ay = (a[0] - p.lat) * ky, bx = (b[1] - p.lng) * kx, by = (b[0] - p.lat) * ky, dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy, t = L2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L2)) : 0; return Math.hypot(ax + t * dx, ay + t * dy); }
// ближайшая лесополоса: контуры «Лесополосы» и ориентиры с названием «лп …», до 1,5 км
function nearestLp(p){ let best = null, bd = 1500; state.arrays.forEach(a => { if (a.lpL) (a.shapes || []).forEach(sh => { if (!sh.pts || sh.hid) return; const P = sh.pts.map(qLL); if (inPoly(p.lat, p.lng, P)){ best = sh.name; bd = 0; return; } for (let i = 0; i < P.length; i++){ const d = segDist(p, P[i], P[(i + 1) % P.length]); if (d < bd){ bd = d; best = sh.name; } } });
if (a.kind === 'aux') a.points.forEach(q => { if (!/^лп\b/i.test(q.name || '')) return; const d = distM(p, q); if (d < bd){ bd = d; best = q.name; } }); }); return best ? {n:best, d:Math.round(bd)} : null; }
const lpTxt = p => { const r = nearestLp(p); return r ? (r.d < 30 ? r.n : `${r.n} (${r.d} м)`) : ''; };
// сортировка целей: кто поражает → лесополоса/н.п. → квадрат
function tgtSortKey(p, r){ const z = zoneShape(p.lat, p.lng), l = nearestLp(p); return [z ? zoneWho(z) : 'яя', (l && l.n) || r.place || 'яя', r.sq]; }
const cmpKey = (x, y) => { for (let i = 0; i < x.length; i++){ const c = String(x[i]).localeCompare(String(y[i]), 'ru', {numeric:true}); if (c) return c; } return 0; };
// ======== НУМЕРАЦИЯ ЦЕЛЕЙ ПО НАПРАВЛЕНИЮ: РУБЕЖИ ПО УДАЛЕНИЮ, ВНУТРИ — СПРАВА НАЛЕВО ========
function numByDir(){ closeModals(); const pts = []; toast('Направление: коснитесь точки у своих войск, затем в сторону противника');
const step = ll => { pts.push(ll); if (pts.length < 2){ window.geoPickCb = step; return; } const w = prompt('Глубина рубежа, м', '1000'); if (w === null) return; const W = Math.max(100, +w || 1000), A = pts[0], [kx, ky] = mk(A.lat), ux0 = (pts[1].lng - A.lng) * kx, uy0 = (pts[1].lat - A.lat) * ky, D = Math.hypot(ux0, uy0) || 1, ux = ux0 / D, uy = uy0 / D;
const G = new Map(); state.arrays.forEach(a => { if (!a.fplan) return; a.points.forEach(p => { if (!p.tno) return; const k = p.tno.slice(0, 2) + '|' + Math.floor(+p.tno.slice(2) / 100); if (!G.has(k)) G.set(k, []); const dx = (p.lng - A.lng) * kx, dy = (p.lat - A.lat) * ky; G.get(k).push({p, along:dx * ux + dy * uy, right:dx * uy - dy * ux}); }); });
let n = 0; G.forEach((L1, k) => { const [zz, c] = k.split('|'); L1.sort((x, y) => Math.floor(x.along / W) - Math.floor(y.along / W) || y.right - x.right); L1.forEach((x, i) => { x.p.tno = zz + String(+c * 100 + i + 1).padStart(3, '0'); x.p.lbl = x.p.tno; n++; }); });
persist(); renderMarkers(); toast(`Перенумеровано целей: ${n}`); };
window.geoPickCb = step; }
// ======== ТОЧКИ ВСТРЕЧИ: ОДИНОЧНЫЕ Р101…, ТАБЛИЦА И ПРАВКА В «ПЛАН ОЗ» ========
let rpMode = null;
function rpStart(){ const a = meetLayer(); a.meetP = a.meetP || []; const n0 = a.meetP.reduce((m, q) => Math.max(m, +String(q.n).replace(/\D/g, '') || 100), 100); rpMode = {n:n0 + 1}; rpBar(); }
function rpBar(){ if (!rpMode){ floatBar(''); return; } floatBar(`<b>Одиночные точки встречи</b><span>Касание карты — Р${rpMode.n}</span><button id="rpEnd" class="primary">Готово</button>`); $('rpEnd').onclick = () => { rpMode = null; rpBar(); }; }
function rpTap(ll){ const a = meetLayer(); (a.meetP = a.meetP || []).push({n:'Р' + rpMode.n, lat:+ll.lat.toFixed(7), lng:+ll.lng.toFixed(7)}); rpMode.n++; persist(); renderMarkers(); rpBar(); }
{ const mb0 = meetBar; window.meetBar = () => { mb0(); const b = $('meetDone'); if (b) b.onclick = () => { meetMode = null; mb0(); renderMarkers(); askConfirm('Поставить одиночные точки встречи (Р101, Р102…)?', 'Поставить', rpStart); }; }; }
function meetRows(){ const a = state.arrays.find(x => x.meetL), R = []; if (!a) return R; (a.meet || []).forEach((m, mi) => [[m.p1, 1], [m.p2, 2]].forEach(([q, n]) => R.push({nm:`${m.k}${n}`, grp:`${m.r} – ${m.k}`, t:'«С» + ' + m.t, lat:q[0], lng:q[1], m, mi}))); (a.meetP || []).forEach((q, pi) => R.push({nm:q.n, grp:'одиночная', t:q.t ? '«С» + ' + q.t : '', lat:q.lat, lng:q.lng, q, pi})); return R; }
function meetSection(el){ const R = meetRows(); if (!R.length) return; const d = document.createElement('div');
d.innerHTML = '<div class="sub-h">Точки встречи</div><div style="overflow-x:auto"><table class="ztt mtt"><tr><th>Точка</th><th>Маршрут</th><th>X</th><th>Y</th><th>Квадрат</th><th>Время</th><th>Местоположение</th><th></th></tr>' + R.map((r, k) => { const s0 = GEO.toSK(r.lat, r.lng); return `<tr data-k="${k}"><td><b>${escapeHtml(r.nm)}</b></td><td>${escapeHtml(r.grp)}</td><td>${pad5(s0.x)}</td><td>${pad5(s0.y)}</td><td>${sqOf(s0)}</td><td>${escapeHtml(r.t)}</td><td style="white-space:normal">${escapeHtml(locText(r.lat, r.lng).loc)}</td><td><button data-e="go">Показать</button><button data-e="ed">✎</button><button data-e="del">🗑</button></td></tr>`; }).join('') + '</table></div>';
el.appendChild(d); d.querySelectorAll('tr[data-k]').forEach(tr => { const r = R[+tr.dataset.k], a = state.arrays.find(x => x.meetL);
tr.querySelector('[data-e=go]').onclick = () => { closeModals(); map.setView([r.lat, r.lng], Math.max(map.getZoom(), 15)); };
tr.querySelector('[data-e=ed]').onclick = () => { if (r.m){ const t = prompt('Время поражения после «С»', r.m.t); if (t === null) return; const k = prompt('Номер пары', r.m.k); if (k === null) return; r.m.t = t.trim() || r.m.t; r.m.k = +k || r.m.k; } else { const n = prompt('Название точки', r.q.n); if (n === null) return; const t = prompt('Время после «С» (можно пусто)', r.q.t || ''); r.q.n = n.trim() || r.q.n; r.q.t = (t || '').trim(); } persist(); renderMarkers(); renderPlan(); };
tr.querySelector('[data-e=del]').onclick = () => askConfirm(`Удалить точку ${r.nm}${r.m ? ' (вместе с парой)' : ''}?`, 'Удалить', () => { if (r.m) a.meet.splice(r.mi, 1); else a.meetP.splice(r.pi, 1); persist(); renderMarkers(); renderPlan(); }); }); }
// ======== ХАРАКТЕР ЦЕЛИ: ИЗБРАННЫЕ / ПОСЛЕДНИЕ / ЧАСТЫЕ ========
const chUse = () => lsGet('skat_chuse', {}), chFavs = () => lsGet('skat_chfav', []);
{ const ac0 = askChar; window.askChar = (cb, init) => ac0(v => { const U = chUse(); U[v] = {n:((U[v] || {}).n || 0) + 1, t:Date.now()}; lsSet('skat_chuse', U); cb && cb(v); }, init); }
{ const cr0 = chRender; window.chRender = () => { cr0(); const box = $('chRes'), mode = lsGet('skat_chmode', 'recent'), U = chUse(), F = chFavs(), q = $('chQ').value.trim();
const top = mode === 'fav' ? F : Object.entries(U).sort((x, y) => mode === 'freq' ? y[1].n - x[1].n : y[1].t - x[1].t).map(x => x[0]).slice(0, 8);
const head = document.createElement('div'); head.innerHTML = `<div class="crow" style="margin:4px 0"><span>Сверху показывать:</span><select id="chMode">${[['fav', 'избранные'], ['recent', 'последние'], ['freq', 'частые']].map(([k, l]) => `<option value="${k}"${k === mode ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`
+ (q ? '' : (top.length ? top.map(v => `<div class="arr" data-v="${escapeHtml(v)}"><span class="kth">${F.includes(v) ? '★' : '⏱'}</span><div class="nm"><div>${escapeHtml(v)}</div><div>${U[v] ? 'выбрано ' + U[v].n + ' раз' : ''}</div></div></div>`).join('') : '<div class="empty">Пока пусто</div>') + '<div class="sub-h">Все</div>');
box.prepend(head); $('chMode').onchange = e => { lsSet('skat_chmode', e.target.value); window.chRender(); };
box.querySelectorAll('.arr[data-v]').forEach(d => { if (!d.querySelector('.chst')){ const b = document.createElement('button'); b.className = 'eye chst'; b.textContent = F.includes(d.dataset.v) ? '★' : '☆'; b.onclick = e => { e.stopPropagation(); const f = chFavs(), v = d.dataset.v; lsSet('skat_chfav', f.includes(v) ? f.filter(x => x !== v) : [v, ...f]); window.chRender(); }; d.appendChild(b); }
d.onclick = () => { const cb = chCb; chCb = null; closeModals(); cb && cb(d.dataset.v); }; }); }; }
$('chQ').oninput = () => window.chRender();
// ======== ПЕРИОДЫ ОГНЕВОГО ПОРАЖЕНИЯ И ОГНЕВЫЕ НАЛЁТЫ ========
function openPer(){ let m = $('perModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'perModal'; m.innerHTML = '<div class="card big"><h3>Периоды и огневые налёты</h3><div id="perBody"></div><div class="row"><button class="ghost" data-close>Закрыть</button></div></div>'; m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.classList.remove('open'); }); }
document.body.appendChild(m); renderPer(); openModal('perModal'); }
const perCfg = () => lsGet('skat_per', {periods:['Огневая подготовка', 'Огневая поддержка', 'Огневое сопровождение'], band:2000, by:'dist', dir:null});
function perTargets(){ const T = []; state.arrays.forEach(a => { if (a.fplan) a.points.forEach((p, i) => T.push({a, p, i})); }); return T; }
function renderPer(){ const C = perCfg(), T = perTargets(), S = sigList(), G = new Map();
T.forEach(x => { const k = (x.p.per || '—') + '|' + (x.p.nal || 0); if (!G.has(k)) G.set(k, []); G.get(k).push(x); });
$('perBody').innerHTML = `<div class="flabel">Периоды (через запятую)</div><input id="perList" value="${escapeHtml(C.periods.join(', '))}" style="width:100%">
<div class="duo"><label class="f">Разбивка на налёты<select id="perBy"><option value="dist"${C.by === 'dist' ? ' selected' : ''}>по удалению от переднего края</option><option value="cat"${C.by === 'cat' ? ' selected' : ''}>по характеру (категории)</option></select></label><label class="f">Глубина налёта, м<input id="perBand" inputmode="numeric" value="${C.band}"></label></div>
<div class="crow"><button id="perDir">${C.dir ? 'Направление задано ✓ (изменить)' : 'Задать направление (2 точки)'}</button><button id="perGo" class="primary">Распределить цели</button></div>
<p class="status">Передний край — первая точка направления, вторая — в сторону противника. Цели делятся на налёты по удалению (или по категории) и получают период и сигнал из таблицы ниже.</p>
<div class="sub-h">Налёты</div>` + ([...G.entries()].sort().map(([k, L1]) => { const [per, nal] = k.split('|'), sig = (L1[0].p.sig || ''); return `<div class="arr" data-k="${escapeHtml(k)}"><div class="nm"><div><b>${escapeHtml(per)}${+nal ? ' · налёт ' + nal : ''}</b> — целей ${L1.length}</div><div>${escapeHtml(L1.slice(0, 12).map(x => x.p.tno || labelOf(x.a, x.i)).join(', '))}${L1.length > 12 ? '…' : ''}</div></div><select data-sig><option value="">сигнал —</option>${S.map(s => `<option${s.n === sig ? ' selected' : ''}>${escapeHtml(s.n)}</option>`).join('')}</select><select data-per>${C.periods.map(p => `<option${p === per ? ' selected' : ''}>${escapeHtml(p)}</option>`).join('')}</select></div>`; }).join('') || '<div class="empty">Плановых целей нет</div>') + '<div class="crow" style="margin-top:8px"><button id="perXls">Выгрузить (Excel)</button></div>';
const save = () => { C.periods = $('perList').value.split(',').map(x => x.trim()).filter(Boolean); C.by = $('perBy').value; C.band = Math.max(100, +$('perBand').value || 2000); lsSet('skat_per', C); };
$('perList').onchange = () => { save(); renderPer(); }; $('perBy').onchange = save; $('perBand').onchange = save;
$('perDir').onclick = () => { save(); $('perModal').classList.remove('open'); toast('Коснитесь точки на переднем крае, затем в сторону противника'); const pts = []; const st = ll => { pts.push([ll.lat, ll.lng]); if (pts.length < 2){ window.geoPickCb = st; return; } C.dir = pts; lsSet('skat_per', C); openModal('perModal'); renderPer(); }; window.geoPickCb = st; };
$('perGo').onclick = () => { save(); if (C.by === 'dist' && !C.dir){ toast('Сначала задайте направление'); return; } const p0 = C.periods[0] || 'Период 1';
T.forEach(({p}) => { if (C.by === 'cat') p.nal = planCat(p) || 1; else { const [la, lo] = C.dir[0], [kx, ky] = mk(la), ux0 = (C.dir[1][1] - lo) * kx, uy0 = (C.dir[1][0] - la) * ky, D = Math.hypot(ux0, uy0) || 1, al = ((p.lng - lo) * kx * ux0 + (p.lat - la) * ky * uy0) / D; p.nal = Math.max(1, Math.floor(Math.max(0, al) / C.band) + 1); } p.per = p.per || p0; });
persist(); renderPer(); toast('Цели распределены по налётам'); };
$('perBody').querySelectorAll('.arr[data-k]').forEach(r => { const L1 = G.get(r.dataset.k); r.querySelector('[data-sig]').onchange = e => { L1.forEach(x => { x.p.sig = e.target.value; }); persist(); }; r.querySelector('[data-per]').onchange = e => { L1.forEach(x => { x.p.per = e.target.value; }); persist(); renderPer(); }; });
$('perXls').onclick = () => { const aoa = [['Период', 'Налёт', 'Сигнал', '№ ТЗ', '№ цели', 'Характер', 'X', 'Y', 'Квадрат', 'Лесополоса / н.п.', 'Поражает']];
T.slice().sort((x, y) => String(x.p.per).localeCompare(String(y.p.per), 'ru') || (x.p.nal || 0) - (y.p.nal || 0)).forEach(({a, p, i}) => { const r = rowsOf(a)[i], z = zoneShape(p.lat, p.lng); aoa.push([p.per || '', p.nal || '', p.sig || '', tzList(a, p).join(', '), p.tno || r.id, p.ch || '', r.x, r.y, r.sq, lpTxt(p) || r.place, z ? zoneWho(z) : '']); });
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Периоды и налёты'); deliverFile(new Blob([XLSX.write(wb, {bookType:'xlsx', type:'array'})], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), `Налёты_${stamp()}.xlsx`, 'Таблица налётов готова'); }; }
// ---- кнопки в «План ОЗ» и касания карты для новых режимов
{ const r = $('planAdd').parentNode; r.insertAdjacentHTML('beforeend', '<button id="planNumB">Нумерация целей</button><button id="planLp">Лесополосы</button><button id="planPer">Периоды и налёты</button><button id="planRp">Точки Р101…</button>');
$('planNumB').onclick = numByDir; $('planLp').onclick = lpStart; $('planPer').onclick = openPer; $('planRp').onclick = () => { closeModals(); rpStart(); }; }
window.mapTapHook = null; { const sync = () => { window.mapTapHook = lpMode ? lpTap : rpMode ? rpTap : null; }; const lb0 = lpBar, rb0 = rpBar; window.lpBar = () => { lb0(); sync(); }; window.rpBar = () => { rb0(); sync(); }; }
{ const rp1 = window.renderPlan; window.renderPlan = () => { rp1(); meetSection($('planList')); }; }
// ---- свои огневые средства на карте автоматически получают карточку и канал в «Микшере»; удалён знак — канал убирается
function faAuto(){ let ch = false; faCand().forEach(({a, i, p}) => { p.fa = {id:Date.now() + Math.floor(Math.random() * 1e6), cs:labelOf(a, i), sys:FA_KIND[itKind(a, p)] || 'd30', n:1, ammo:[], pos:[p.lat, p.lng]}; ch = true; });
const F = faAll(), ids = new Set(F.map(x => x.p.fa.id)), inMix = new Set(mixTasks().map(t => t.faId).filter(Boolean));
F.forEach(({a, i, p}) => { if (inMix.has(p.fa.id)) return; const t = newTask(); t.gun = {lat:p.lat, lng:p.lng, h:p.h}; t.gname = p.fa.cs || labelOf(a, i); t.sys = p.fa.sys; t.faId = p.fa.id; t.maxOv = +p.fa.max || null; MIX.push(t.id); inMix.add(p.fa.id); ch = true; });
const gone = mixTasks().filter(t => t.faId && !ids.has(t.faId)); if (gone.length){ MIX = MIX.filter(id => !gone.some(t => t.id === id)); state.ftasks = state.ftasks.filter(t => !(gone.includes(t) && !(t.shots || []).length)); ch = true; }
if (ch){ lsSet('skat_mix', MIX); if (mixOn) setTimeout(renderMix, 0); } return ch; }
{ const pr1 = window.persist; let busy = false; window.persist = (...a) => { if (!busy){ busy = true; try { faAuto(); } catch(e){} busy = false; } return pr1(...a); }; }
setTimeout(() => { try { if (faAuto()) persist(); } catch(e){} }, 300);
// ---- лесополосы: обводка пальцем (нажать и вести по краю) или касаниями по точкам
{ const ct = map.getContainer(); let fh = null;
ct.addEventListener('pointerdown', e => { if (!lpMode || !e.isPrimary || e.target.closest('#fbar,.leaflet-control,button')) return; fh = {x:e.clientX, y:e.clientY, pts:[], on:false}; }, true);
ct.addEventListener('pointermove', e => { if (!fh || !lpMode || !e.isPrimary) return; const d = Math.hypot(e.clientX - fh.x, e.clientY - fh.y); if (!fh.on && d > 12){ fh.on = true; map.dragging.disable(); }
if (fh.on){ const r = ct.getBoundingClientRect(), ll = map.containerPointToLatLng([e.clientX - r.left, e.clientY - r.top]), last = fh.pts[fh.pts.length - 1];
if (!last || map.latLngToContainerPoint(last).distanceTo(map.latLngToContainerPoint(ll)) > 10){ fh.pts.push(ll); lpMode.pts = fh.pts.map(q => [+q.lat.toFixed(7), +q.lng.toFixed(7)]); lpBar(); } } }, true);
const up = () => { if (!fh) return; const was = fh.on; fh = null; map.dragging.enable(); if (was && lpMode && lpMode.pts.length > 2){ window.lpSkipTap = Date.now(); setTimeout(() => $('lpOk') && $('lpOk').click(), 50); } };
ct.addEventListener('pointerup', up, true); ct.addEventListener('pointercancel', up, true); }
{ const lt0 = lpTap; window.lpTap = ll => { if (window.lpSkipTap && Date.now() - window.lpSkipTap < 600) return; lt0(ll); }; }
window.__mod_tp = 1;
