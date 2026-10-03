// СКАТ — модуль «Боевой контур»: корректировка огня (панель), План ОЗ (окна, выгрузка Excel), правка зон, точки встречи. Грузится лениво из index.html (modLoad). Версия 6.4
// ======== БОЕВОЙ КОНТУР: КОРРЕКТИРОВКА ОГНЯ ========
const corrL = L.layerGroup().addTo(map);
function sysTof(sys, d){ const k = SYS[sys] || SYS.d30; return Math.max(2, d / k.v * (k.hi ? 2 : 1.25)); }
const BOOM = n => `<div class="boomic"><svg viewBox="0 0 32 32"><path d="M16 2l3 8 7-4-3 8 8 2-8 3 4 7-8-3-3 8-3-8-8 3 4-7-8-3 8-2-3-8 7 4z" fill="#ff7a1a" stroke="#ffd400" stroke-width="1.5"/><circle cx="16" cy="16" r="5" fill="#ffd400"/></svg>${n != null ? `<b>${n}</b>` : ''}</div>`;
function corrDraw(){ corrL.clearLayers(); if (!CT) return;
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
let corrEnd = false;
function corrPanel(){ const el = $('corr'); if (!CT){ el.classList.remove('on'); return; } el.classList.add('on'); const sys = SYS[CT.sys] || SYS.d30, last = (CT.bursts || []).slice(-1)[0];
const d = CT.gun && CT.tgt ? distM(CT.gun, CT.tgt) : 0, far = d && sys.max && d > sys.max, ps = pendShot(CT), st = shotStats(CT), nextNo = (CT.reuse && CT.reuse.length) ? Math.min(...CT.reuse) : (CT.shotN || 0) + 1;
let dv = ''; if (last && CT.gun && CT.tgt){ const v = corrDev(last), dd = Math.round(Math.hypot(v.dN, v.dE)); dv = `<div class="cdv"><b>Разрыв ${last.n}:</b> ${devTxt(v)} (${dd} м${dd > 50 ? ', отклонение' : ', в цель'})</div>`; }
el.innerHTML = `<div class="crow"><b>Цель ${escapeHtml(CT.name || '…')}${CT.obj ? ' · ' + escapeHtml(CT.obj) : ''}${CT.res ? ' · ' + escapeHtml(CT.res) : ''}</b><button data-c="x">✕</button></div>
<div class="crow"><button data-c="gun" class="${corrPick === 'gun' ? 'on' : ''}">Орудие${CT.gun ? ' ✓' : ''}</button><button data-c="tgt" class="${corrPick === 'tgt' ? 'on' : ''}">Цель${CT.tgt ? ' ✓' : ''}</button><select data-c="sys">${Object.entries(SYS).map(([k, v]) => `<option value="${k}"${k === CT.sys ? ' selected' : ''}>${v.n}</option>`).join('')}</select>${sys.rs ? `<select data-c="rs">${[1, 2, 4, 8, 12, 20, sys.rs].filter((v, i, ar) => v <= sys.rs && ar.indexOf(v) === i).map(v => `<option value="${v}"${v === (CT.rs || 4) ? ' selected' : ''}>${v} РС</option>`).join('')}</select>` : ''}</div>
${d ? `<div class="cdv"${far ? ' style="color:#ff6b5a"' : ''}>Дальность ${fmtDist(d)} · подлёт ${sysTof(CT.sys, d).toFixed(1)} с · макс. ${fmtDist(sys.max)}${far ? ' — цель вне досягаемости' : ''}</div>` : '<div class="cdv">Выберите орудие и цель: кнопка, затем касание карты или знака</div>'}
<div class="ctm" id="corrTm"></div>${dv}
${st.shots ? `<div class="cdv">${statTxt(st)}</div>` : ''}
<div class="crow"><button data-c="fire" class="primary" ${CT.gun && CT.tgt && !far ? '' : 'disabled'}>▶ Выстрел №${nextNo}</button><button data-c="stop" id="corrStopB" ${corrFly.some(f => f.task === CT) ? '' : 'disabled'}>■ Стоп</button><button data-c="un" ${(CT.bursts || []).length ? '' : 'disabled'}>↶ Разрыв</button></div>
${ps ? `<div class="crow"><button data-c="nobs">Не набл. №${ps.no}</button><button data-c="mis">Осечка №${ps.no}</button></div>` : ''}
${corrEnd ? `<div class="crow"><button data-c="r1" class="primary">Уничтожена</button><button data-c="r2" class="primary">Подавлена</button><button data-c="r0">Отмена</button></div>` : `<div class="crow"><button data-c="end" ${st.shots ? '' : 'disabled'}>✔ Итог задачи</button></div>`}
<div class="cdv" style="opacity:.75">Касание карты — отметить разрыв${ps ? ' №' + ps.no : ''}</div>`;
corrTimer();
el.querySelectorAll('[data-c]').forEach(b => { const c = b.dataset.c; if (b.tagName === 'SELECT') b.onchange = () => { if (c === 'sys') CT.sys = b.value; else CT.rs = +b.value; persist(); corrPanel(); };
else b.onclick = () => { if (c === 'x'){ CT = null; corrPick = null; corrEnd = false; corrDraw(); corrPanel(); return; } if (c === 'stop'){ corrStop(); return; } if (c === 'gun' || c === 'tgt'){ corrPick = corrPick === c ? null : c; corrPanel(); toast(c === 'gun' ? 'Коснитесь огневой позиции или знака орудия' : 'Коснитесь цели'); return; }
if (c === 'nobs' || c === 'mis'){ const p = pendShot(CT); if (p){ p.res = c; persist(); corrPanel(); } return; }
if (c === 'end'){ corrEnd = true; corrPanel(); return; } if (c === 'r0'){ corrEnd = false; corrPanel(); return; }
if (c === 'r1' || c === 'r2'){ CT.res = c === 'r1' ? 'Уничтожена' : 'Подавлена'; CT.done = Date.now(); corrEnd = false; persist(); corrPanel(); toast(`Цель ${CT.name || ''} ${CT.res.toLowerCase()}. ${statTxt(shotStats(CT))}`, 6000); return; }
if (c === 'un'){ const b0 = CT.bursts.pop(), sh = b0 && (CT.shots || []).find(x => x.no === b0.n && (x.res === 'hit' || x.res === 'dev')); if (sh) sh.res = null; persist(); corrDraw(); corrPanel(); return; } if (c === 'fire') corrFire(); }; }); }
// разрыв по касанию: привязка к первому упавшему неотмеченному выстрелу, «в цель» — до 50 м
function corrMark(ll){ const p = pendShot(CT), b = {lat:+ll.lat.toFixed(7), lng:+ll.lng.toFixed(7), n:p ? p.no : (CT.bursts.length ? Math.max(...CT.bursts.map(x => x.n)) + 1 : 1), t:Date.now()};
CT.bursts.push(b); if (p && CT.tgt) p.res = distM(b, CT.tgt) > 50 ? 'dev' : 'hit'; try { navigator.vibrate && navigator.vibrate(20); } catch(e){} }
function newTask(){ const t = {id:Date.now(), name:'', sys:'d30', rs:4, bursts:[]}; state.ftasks.push(t); persist(); return t; }
$('corrBtn').onclick = () => { if (CT){ CT = null; corrEnd = false; corrDraw(); corrPanel(); return; } CT = newTask(); corrPick = 'gun'; corrDraw(); corrPanel(); toast('Коснитесь огневой позиции или знака орудия'); };
function corrTap(ll){ const h = hitPoint(...(() => { const q = map.latLngToContainerPoint(ll), r = map.getContainer().getBoundingClientRect(); return [q.x + r.left, q.y + r.top, corrPick === 'tgt' ? 48 : 30]; })()), at = h && h.i != null ? {lat:h.a.points[h.i].lat, lng:h.a.points[h.i].lng} : {lat:ll.lat, lng:ll.lng};
if (corrPick === 'gun'){ CT.gun = at; if (h && h.i != null){ const k = itKind(h.a, h.a.points[h.i]); CT.sys = k === 'mortar' ? 'm120' : k === 'rszo' ? 'grad' : k === 'tank' ? 'tank' : k === 'sau' ? 'sau' : CT.sys; } corrPick = CT.tgt ? null : 'tgt'; if (corrPick) toast('Коснитесь цели'); }
else if (corrPick === 'tgt'){ if (CT.tgt){ const prev = CT; CT = newTask(); CT.gun = prev.gun; CT.sys = prev.sys; CT.rs = prev.rs; } CT.tgt = at; { const sid0 = h && h.i != null ? (h.a.points[h.i].sym || h.a.sym) : null; let c0 = catOfSym(sid0); if (!c0){ c0 = catOfTxt(prompt('Характер цели (например: живая сила, миномёт, танк, РЭБ, ПВО)', '')) || 1; } CT.cat = c0; CT.name = tgtNo(at.lat, at.lng, c0, CT); } if (h && h.i != null) CT.obj = labelOf(h.a, h.i); corrPick = null; toast(`Цель ${CT.name}${CT.obj ? ' — ' + CT.obj : ''}. Разрывы считаются с 1`); }
else corrMark(ll);
persist(); corrDraw(); corrPanel(); }
function arcPts(g, t, k){ const out = [], [kx, ky] = mk(g.lat), dx = (t.lng - g.lng) * kx, dy = (t.lat - g.lat) * ky, D = Math.hypot(dx, dy) || 1, nx = -dy / D, ny = dx / D, bow = D * (k ? .18 : .1);
for (let i = 0; i <= 30; i++){ const u = i / 30, o = 4 * bow * u * (1 - u); out.push([g.lat + (dy * u + ny * o) / ky, g.lng + (dx * u + nx * o) / kx]); } return out; }
function corrFire(){ const sys = SYS[CT.sys] || SYS.d30, d = distM(CT.gun, CT.tgt);
if (sys.max && d > sys.max){ toast(`Цель вне досягаемости: ${fmtDist(d)}, у ${sys.n} максимум ${fmtDist(sys.max)}`); return; }
const tof = sysTof(CT.sys, d), n = sys.rs ? Math.min(sys.rs, Math.max(1, +CT.rs || 4)) : 1, pts = arcPts(CT.gun, CT.tgt, sys.hi), t0 = performance.now() / 1000;
CT.shots = CT.shots || []; CT.reuse = CT.reuse || []; let no; if (CT.reuse.length){ no = Math.min(...CT.reuse); CT.reuse = CT.reuse.filter(x => x !== no); } else no = CT.shotN = (CT.shotN || 0) + 1;
const shot = {no, n, sys:CT.sys, t:Date.now()}; CT.shots.push(shot); CT.shots.sort((x, y) => x.no - y.no); persist();
for (let i = 0; i < n; i++) corrFly.push({task:CT, shot:no, rec:shot, sys:CT.sys, d0:i * .5, t0, tof, pts, pos:null, left:tof + i * .5});
try { navigator.vibrate && navigator.vibrate(30); } catch(e){}
corrPanel(); if (!corrRaf) corrRaf = requestAnimationFrame(corrStep); }
// «Стоп» отменяет крайний выстрел этой задачи, его номер получит следующий выстрел
function corrStop(){ const mine = corrFly.filter(f => f.task === CT); if (!mine.length) return; const no = Math.max(...mine.map(f => f.shot));
corrFly = corrFly.filter(f => !(f.task === CT && f.shot === no)); CT.shots = (CT.shots || []).filter(x => x.no !== no); (CT.reuse = CT.reuse || []).push(no); persist();
toast(`Выстрел №${no} отменён`); if (!corrFly.length && corrRaf){ cancelAnimationFrame(corrRaf); corrRaf = 0; } corrDraw(); corrPanel(); }
function corrTimer(){ const el = $('corrTm'), sb = $('corrStopB'), mine = corrFly.filter(f => f.task === CT); if (sb) sb.disabled = !mine.length; if (!el) return;
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
d.innerHTML = '<div class="sub-h">Зоны поражения</div>' + Z.map((sh, k) => `<div class="arr" data-z="${k}"><span class="sw" style="background:${sh.color || '#e2533f'}"></span><div class="nm"><div>${escapeHtml(sh.name || 'Зона ' + sh.zn)}</div><div>целей: ${zoneTargets(sh).length} · поражает: ${escapeHtml(colName(sh.color || '#e2533f'))}</div></div><button data-zz="go">Показать</button><button class="eye" data-zz="ed">✎</button><button class="eye" data-zz="del">🗑</button></div>`).join(''); el.appendChild(d);
d.querySelectorAll('[data-z]').forEach(r => { const sh = Z[+r.dataset.z], za = state.arrays.find(x => x.zones);
r.querySelector('[data-zz=go]').onclick = () => { closeModals(); map.fitBounds(L.latLngBounds(sh.pts.map(q => [q[0] ?? q.lat, q[1] ?? q.lng])).pad(.2)); };
r.querySelector('[data-zz=ed]').onclick = () => { closeModals(); openShapeEd(za, za.shapes.indexOf(sh)); };
r.querySelector('[data-zz=del]').onclick = () => askConfirm(`Удалить «${sh.name || 'Зона ' + sh.zn}»? (↶ — вернуть)`, 'Удалить', () => { za.shapes.splice(za.shapes.indexOf(sh), 1); state.arrays.forEach(L1 => { if (L1.fplan) L1.points.forEach(q => planNum(L1, q)); }); persist(); renderMarkers(); openModal('planModal'); renderPlan(); }); }); }
function renderPlan0(){ const el = $('planList'), L1 = state.arrays.filter(a => a.fplan);
el.innerHTML = L1.length ? L1.map(a => `<div class="arr" data-id="${a.id}"><span class="sw" style="background:${a.style.color}"></span><div class="nm"><div>${escapeHtml(a.name)}</div><div>целей: ${a.points.length}${a.points.length ? ` (${escapeHtml(labelOf(a, 0))}…${escapeHtml(labelOf(a, a.points.length - 1))})` : ''}</div></div><button data-p="add">＋ Цели</button><button data-p="tbl">Таблица</button><button class="eye" data-p="ren">✎</button><button class="eye" data-p="del">🗑</button></div>`).join('') : '<div class="empty">Слоёв плановых огневых задач нет — нажмите «Добавить слой».</div>';
el.querySelectorAll('.arr').forEach(r => { const a = arrById(+r.dataset.id);
r.querySelector('[data-p=add]').onclick = () => planPreset(a);
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
const sid2 = symForChar(v); if (sid2){ p.sym = sid2; if (!p.side) p.side = 'b'; } if (!planNum(a, p)){ const c = catOfSym(p.sym); if (!c){ p.tno = tgtNo(p.lat, p.lng, 1, p); p.lbl = p.tno + ' ' + v; } } persist(); renderMarkers(); }
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
function planAoaTz(tz){ const aoa = [['№ ТЗ', 'Зона', 'Цвет зоны', 'Категория', 'Характер цели', '№ цели', 'X', 'Y', 'H', 'Квадрат', 'Населённый пункт', 'Комментарий', 'Привлекается (цвет)']];
state.arrays.forEach(a => { if (!a.fplan) return; rowsOf(a).forEach((r, i) => { const p = a.points[i]; if (!tzList(a, p).includes(tz)) return; const ct = planCat(p), zs = zoneShape(p.lat, p.lng);
aoa.push([tz, p.tno ? p.tno.slice(0, 2) : '', zs ? colName(zs.color || '#e2533f') : '', ct ? TCAT[ct - 1][1] : '', p.ch || '', p.tno || r.id, r.x, r.y, r.h === '' ? '' : r.h, r.sq, r.place, r.comment, styleText(r.st)]); }); }); return aoa; }

// ======== ЗОНЫ В «ПЛАН ОЗ»: ПОДГРУППЫ ЦЕЛЕЙ, ВКЛАДКИ ПО ЗОНАМ ========
function zoneTgtAoa(sh){ const aoa = [['№ ТЗ', 'Зона', 'Цвет зоны', 'Категория', 'Характер цели', '№ цели', 'X', 'Y', 'H', 'Квадрат', 'Населённый пункт', 'Комментарий', 'Привлекается (цвет)']];
zoneTargets(sh).forEach(({a, p, i}) => { const r = rowsOf(a)[i], ct = planCat(p); aoa.push([tzList(a, p).join(', '), sh.zn, colName(sh.color || '#e2533f'), ct ? TCAT[ct - 1][1] : '', p.ch || '', p.tno || r.id, r.x, r.y, r.h === '' ? '' : r.h, r.sq, r.place, r.comment, styleText(r.st)]); }); return aoa; }
function zoneShapes(){ const z = state.arrays.find(x => x.zones); return z ? z.shapes.filter(s0 => s0.zn) : []; }

window.__mod_tp = 1;
