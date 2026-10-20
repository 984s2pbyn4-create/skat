// СКАТ — модуль «Штаб»: штамп и атлас при печати, журнал, сводка, донесения, строевая записка, снимки обстановки, график от «Ч», режим доклада, подразделения, задачи, заметки, история правок,
// рубежи и полосы, ориентиры, кодированная сетка, разграфка листов, две карты, шаблоны карт, расчёт марша, калькулятор, солнце и луна, позывные, пакет изменений, автокопии, чек-листы.
// Грузится лениво из index.html (modLoad('sh')). Версия 6.57
window.__mod_sh = 1;
(() => {
const E = escapeHtml, now = () => Date.now();
const D0 = {log:[], stamp:{}, H:{t:0, it:[]}, cs:[], units:[], tasks:[], steps:[], tpls:[], cls:null, np:null, cg:null, nom:0, xh:{}, xt:0, bakMin:10, snl:[], rtpl:null};
state.sh = Object.assign(D0, state.sh || {}); const S = state.sh;
const me = () => lsGet('skat_me', '') || 'я';
const dt = t => new Date(t).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
const hm = t => new Date(t).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
const dIn = t => { const d = new Date(t - new Date(t).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
const dOut = v => v ? new Date(v).getTime() : 0;
const sk = (lat, lng) => { const s = GEO.toSK(lat, lng); return {x:Math.round(s.x), y:Math.round(s.y), kv:sqOf(s)}; };
const skS = (lat, lng) => { const s = sk(lat, lng); return `X ${s.x} Y ${s.y} (кв. ${s.kv})`; };
const brg = (a, b) => { const f1 = a.lat * Math.PI / 180, f2 = b.lat * Math.PI / 180, dl = (b.lng - a.lng) * Math.PI / 180; const y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
const du = deg => { const v = Math.round(deg * 100 / 6) % 6000; return `${Math.floor(v / 100)}-${String(v % 100).padStart(2, '0')}`; };
const km = m => m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 1 : 2).replace('.', ',') + ' км' : Math.round(m) + ' м';
const vis = () => state.arrays.filter(a => !a.hidden && !(isMk(a)));
const nmOf = (a, o, i) => o.name || o.lbl || (a.points && a.points.indexOf(o) >= 0 ? labelOf(a, a.points.indexOf(o)) : '') || (o.sym && SYM_BY[o.sym] ? SYM_BY[o.sym].n : '') || 'объект';
const symN = o => (o.sym && SYM_BY[o.sym] ? SYM_BY[o.sym].n : '') || 'Точка';
const copy = async t => { try { await navigator.clipboard.writeText(t); toast('Скопировано'); } catch(e){ prompt('Скопируйте текст', t); } };
const share = (t, nm) => { if (navigator.share) navigator.share({text:t}).catch(() => {}); else deliverFile(new Blob([t], {type:'text/plain'}), nm + '_' + stamp() + '.txt', 'Файл готов'); };
const txtFile = (t, nm) => deliverFile(new Blob(['﻿' + t], {type:'text/plain;charset=utf-8'}), `СКАТ_${nm}_${stamp()}.txt`, 'Файл готов');
const csvFile = (rows, nm) => deliverFile(new Blob(['﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')], {type:'text/csv'}), `СКАТ_${nm}_${stamp()}.csv`, 'Таблица готова');
const vib = () => { try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e){} };
const save = () => persist();
const newLayer = (name, kind, color, extra) => { const a = normArr(Object.assign({id:Date.now() + Math.floor(Math.random() * 1000), kind, name, ident:name, style:{color, name:colorName(color), glyph:''}, points:[], shapes:[], texts:[]}, extra || {})); state.arrays.push(a); return a; };
const findPt = uid => { for (const a of state.arrays){ const i = (a.points || []).findIndex(p => p.uid === uid); if (i >= 0) return {a, i, p:a.points[i]}; } return null; };
const inPoly = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){ const a = poly[i], b = poly[j]; if (((a[0] > pt[0]) !== (b[0] > pt[0])) && (pt[1] < (b[1] - a[1]) * (pt[0] - a[0]) / (b[0] - a[0]) + a[1])) c = !c; } return c; };

// ===== окно «Штаб» =====
let PG = 'hub', ARG = null;
function modal(){ let m = $('shModal'); if (!m){ m = document.createElement('div'); m.className = 'modal'; m.id = 'shModal';
m.innerHTML = '<div class="card big shCard"><div class="shHd"><button class="ghost shBk" id="shBack">‹</button><h3 id="shTtl">Штаб</h3><button class="ghost shBk" data-close>✕</button></div><div id="shB"></div></div>';
m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('open'); }); document.body.appendChild(m);
$('shBack').onclick = () => go(ARG && ARG.back ? ARG.back : 'hub'); } return m; }
const HUB = [['Документы', [['stamp', 'Штамп и печать', '▤'], ['atlas', 'Печать атласом', '▦'], ['log', 'Журнал', '✎'], ['sum', 'Сводка сил и средств', 'Σ'], ['rep', 'Донесения', '✉'], ['str', 'Строевая записка', '☰']]],
['Обстановка', [['snap', 'Снимки обстановки', '◷'], ['hh', 'График от «Ч»', 'Ч'], ['brief', 'Режим доклада', '▶'], ['tasks', 'Задачи и поручения', '☑'], ['notes', 'Заметки к объектам', '💬'], ['hist', 'История правок', '↶'], ['units', 'Подразделения', '▣']]],
['Карта', [['lines', 'Рубежи и полосы', '┅'], ['ori', 'Ориентиры', '◬'], ['code', 'Кодированная сетка', '#'], ['nom', 'Разграфка листов', '⊞'], ['two', 'Две карты рядом', '◫'], ['tpl', 'Шаблоны карт', '⧉']]],
['Расчёты', [['march', 'Расчёт марша', '➜'], ['calc', 'Калькулятор', '±'], ['astro', 'Солнце и луна', '☼'], ['cs', 'Позывные', '☏']]],
['Сервис', [['pkg', 'Пакет изменений', '⇅'], ['bak', 'Автокопии', '⟲'], ['cl', 'Чек-листы', '✓']]]];
const TTL = Object.fromEntries(HUB.flatMap(g => g[1]).map(([k, t]) => [k, t]));
function go(pg, arg){ PG = pg; ARG = arg || null; const m = modal(); $('shTtl').textContent = pg === 'hub' ? 'Штаб' : (arg && arg.title) || TTL[pg] || 'Штаб'; $('shBack').style.visibility = pg === 'hub' ? 'hidden' : '';
const b = $('shB'); b.innerHTML = ''; try { P[pg](b, arg); } catch(e){ console.error(e); b.innerHTML = `<p class="status">Ошибка: ${E(e.message || e)}</p>`; } if (!m.classList.contains('open')) openModal('shModal'); const c = m.querySelector('.card'); if (c) c.scrollTop = 0; }
const P = {};
P.hub = b => { const od = S.tasks.filter(t => t.st < 2 && t.due && t.due < now()).length, nt = openNotes().length, nx = hhNext();
b.innerHTML = `<div class="shMe"><label class="f">Кто работает (подпись в журнале и правках)<input id="shMeI" value="${E(lsGet('skat_me', ''))}" placeholder="например, НШ Иванов"></label></div>` +
(od || nt || nx ? `<div class="shAl">${nx ? `<span>Ближайшее по «Ч»: ${E(nx)}</span>` : ''}${od ? `<span class="bad">Просрочено задач: ${od}</span>` : ''}${nt ? `<span>Открытых заметок: ${nt}</span>` : ''}</div>` : '') +
HUB.map(([g, it]) => `<div class="flabel">${g}</div><div class="shGrid">${it.map(([k, t, ic]) => `<button class="shTile" data-p="${k}"><b>${ic}</b><span>${t}</span></button>`).join('')}</div>`).join('');
$('shMeI').onchange = e => { lsSet('skat_me', e.target.value.trim()); toast('Сохранено'); };
b.querySelectorAll('[data-p]').forEach(x => x.onclick = () => go(x.dataset.p)); };
window.shOpen = (pg, arg) => go(pg || 'hub', arg);
const H = (b, h) => { b.insertAdjacentHTML('beforeend', h); };
const on = (b, sel, ev, fn) => b.querySelectorAll(sel).forEach(x => x.addEventListener(ev, e => fn(x, e)));

// ===== история правок и журнал (сравнение после каждого сохранения) =====
const IT = new Map(); let itInit = false, inDiff = 0, dT = 0;
const strip = o => JSON.stringify(o, (k, v) => (k === 'uid' || k === 'ed' || k === 'hv' || k === 'notes') ? undefined : v);
const uidN = () => Math.random().toString(36).slice(2, 10);
function diff(){ const t = now(), au = me(), seen = new Set(), ev = {}, msgs = []; let ch = 0;
const bump = (a, k) => { const c = ev[a.name] = ev[a.name] || [0, 0, 0]; c[k]++; };
state.arrays.forEach(a => { if (isMk(a)) return; ['points', 'shapes', 'texts'].forEach(f => (a[f] || []).forEach(o => {
if (!o || typeof o !== 'object') return; if (!o.uid || seen.has(o.uid)){ o.uid = uidN(); ch = 1; } seen.add(o.uid);
const j = strip(o), pr = IT.get(o.uid);
if (!itInit){ IT.set(o.uid, {j, d:!!o.dst, c:!!o.cov, a:a.name}); return; }
if (!pr){ o.ed = {t, au, k:'+'}; IT.set(o.uid, {j, d:!!o.dst, c:!!o.cov, a:a.name}); bump(a, 0); ch = 1; return; }
if (pr.j !== j){ (o.hv = o.hv || []).push({t:(o.ed && o.ed.t) || 0, au:(o.ed && o.ed.au) || '', j:pr.j}); if (o.hv.length > 3) o.hv.shift(); o.ed = {t, au, k:'~'};
if (o.dst && !pr.d) msgs.push(`«${nmOf(a, o)}» (${a.name}) — уничтожена`); if (o.cov && !pr.c) msgs.push(`«${nmOf(a, o)}» (${a.name}) — укрыта`);
pr.j = j; pr.d = !!o.dst; pr.c = !!o.cov; pr.a = a.name; bump(a, 1); ch = 1; } })); });
if (itInit) IT.forEach((v, k) => { if (!seen.has(k)){ (ev[v.a] = ev[v.a] || [0, 0, 0])[2]++; IT.delete(k); } });
if (itInit && Object.keys(ev).length){ const L0 = S.log[S.log.length - 1];
if (L0 && L0.k === 'a' && L0.au === au && t - L0.t < 180000){ Object.entries(ev).forEach(([n, c]) => { const q = L0.c[n] = L0.c[n] || [0, 0, 0]; c.forEach((v, i) => q[i] += v); }); L0.t2 = t; }
else S.log.push({t, k:'a', au, c:ev}); ch = 1; }
msgs.forEach(x => S.log.push({t, k:'m', au, x})); if (S.log.length > 3000) S.log.splice(0, S.log.length - 3000);
itInit = true; return ch; }
function diffRun(){ inDiff = 1; try { if (diff()){ const m0 = hist.mute; hist.mute = true; try { pn0(); } finally { hist.mute = m0; } } } catch(e){ console.error('sh diff', e); } inDiff = 0; }
const pn0 = persistNow;
persistNow = function(){ const r = pn0.apply(this, arguments); if (!inDiff){ clearTimeout(dT); dT = setTimeout(diffRun, 1500); } return r; };
setTimeout(diffRun, 300);
window.shLog = (x, k) => { S.log.push({t:now(), k:k || 'm', au:me(), x}); save(); };
const logTxt = L1 => L1.k === 'a' ? Object.entries(L1.c).map(([n, c]) => `«${n}»: ${[c[0] ? '+' + c[0] : '', c[1] ? 'изм. ' + c[1] : '', c[2] ? 'удал. ' + c[2] : ''].filter(Boolean).join(', ')}`).join('; ') : L1.x;
P.log = b => { let q = ARG && ARG.q || '', man = ARG && ARG.man;
b.innerHTML = `<div class="row"><input id="lgQ" placeholder="Поиск по журналу" value="${E(q)}" style="flex:1"><button class="ghost${man ? ' on' : ''}" id="lgM">Только записи</button></div>
<label class="f">Новая запись<textarea id="lgT" rows="2" placeholder="Что произошло"></textarea></label><div class="row"><input type="datetime-local" id="lgD" value="${dIn(now())}"><button class="primary" id="lgA">Записать</button></div>
<div class="row"><button class="ghost" id="lgX">Файл .txt</button><button class="ghost" id="lgC">Таблица .csv</button><button class="ghost" id="lgCl">Очистить…</button></div><div id="lgL" class="shList"></div>`;
const draw = () => { const ql = q.toLowerCase(), L1 = S.log.map((x, i) => [x, i]).filter(([x]) => (!man || x.k === 'm') && (!ql || (logTxt(x) + ' ' + x.au).toLowerCase().includes(ql))).reverse().slice(0, 400);
$('lgL').innerHTML = L1.map(([x, i]) => `<div class="shRow${x.k === 'a' ? ' auto' : ''}"><small>${dt(x.t)} · ${E(x.au || '')}</small><div>${E(logTxt(x))}</div>${x.k === 'm' ? `<button class="ghost sm" data-del="${i}">✕</button>` : ''}</div>`).join('') || '<div class="empty">Записей нет</div>';
on($('lgL'), '[data-del]', 'click', x => askConfirm('Удалить запись?', 'Удалить', () => { S.log.splice(+x.dataset.del, 1); save(); draw(); })); };
draw(); $('lgQ').oninput = e => { q = e.target.value; draw(); }; $('lgM').onclick = e => { man = !man; e.target.classList.toggle('on', man); draw(); };
$('lgA').onclick = () => { const x = $('lgT').value.trim(); if (!x) return; S.log.push({t:dOut($('lgD').value) || now(), k:'m', au:me(), x}); S.log.sort((p, r) => p.t - r.t); $('lgT').value = ''; save(); draw(); };
const rows = () => S.log.filter(x => !man || x.k === 'm').map(x => [dt(x.t), x.au || '', x.k === 'a' ? 'авто' : 'запись', logTxt(x)]);
$('lgX').onclick = () => txtFile('ЖУРНАЛ\r\n' + rows().map(r => `${r[0]}  ${r[1]}  ${r[3]}`).join('\r\n'), 'журнал'); $('lgC').onclick = () => csvFile([['Время', 'Кто', 'Тип', 'Содержание'], ...rows()], 'журнал');
$('lgCl').onclick = () => askConfirm('Удалить все автоматические записи журнала (ручные останутся)?', 'Удалить', () => { S.log = S.log.filter(x => x.k === 'm'); save(); draw(); }); };
P.hist = b => { const L1 = []; state.arrays.forEach(a => ['points', 'shapes', 'texts'].forEach(f => (a[f] || []).forEach(o => { if (o && o.ed) L1.push({a, f, o}); }))); L1.sort((p, q) => q.o.ed.t - p.o.ed.t);
const K = {'+':'добавлен', '~':'изменён', '↶':'откат'}; b.innerHTML = `<p class="status">Последние правки по объектам. «↶» возвращает предыдущее состояние объекта (хранятся 3 последних).</p><div class="shList">${L1.slice(0, 150).map((x, k) => `<div class="shRow"><small>${dt(x.o.ed.t)} · ${E(x.o.ed.au || '')} · ${K[x.o.ed.k] || ''}</small><div>${E(nmOf(x.a, x.o))} <small>— ${E(x.a.name)}</small></div><span><button class="ghost sm" data-sh="${k}">◎</button>${(x.o.hv || []).length ? `<button class="ghost sm" data-rb="${k}">↶</button>` : ''}</span></div>`).join('') || '<div class="empty">Правок пока нет — они пишутся с версии 6.57</div>'}</div>`;
on(b, '[data-sh]', 'click', x => { const it = L1[+x.dataset.sh], p = itPos({points:'p', shapes:'s', texts:'x'}[it.f], it.o); closeModals(); map.setView(p, Math.max(map.getZoom(), 15)); });
on(b, '[data-rb]', 'click', x => { const it = L1[+x.dataset.rb], o = it.o, h = o.hv.pop(); let old; try { old = JSON.parse(h.j); } catch(e){ return; }
Object.keys(o).forEach(k => { if (!['uid', 'ed', 'hv', 'notes'].includes(k)) delete o[k]; }); Object.assign(o, old); o.ed = {t:now(), au:me(), k:'↶'}; const r = IT.get(o.uid); if (r) r.j = strip(o);
S.log.push({t:now(), k:'m', au:me(), x:`Откат правки: «${nmOf(it.a, o)}» (${it.a.name})`}); persistNow(); renderMarkers(); go('hist'); toast('Возвращено предыдущее состояние'); }); };

// ===== хранилище копий и снимков (IndexedDB, шифруется вместе с проектом) =====
let bdbP = null; const bdb = () => bdbP || (bdbP = new Promise(res => { try { const r = indexedDB.open('skat_bak', 1); r.onupgradeneeded = () => { r.result.createObjectStore('b'); r.result.createObjectStore('s'); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch(e){ res(null); } }));
const btx = async (st, mode, fn) => { const d = await bdb(); if (!d) throw new Error('хранилище недоступно'); return new Promise((res, rej) => { const tx = d.transaction(st, mode); let out; const q = fn(tx.objectStore(st)); if (q) q.onsuccess = () => { out = q.result; }; tx.oncomplete = () => res(out); tx.onerror = () => rej(tx.error); }); };
const te = new TextEncoder(), td = new TextDecoder();
async function bput(st, k, meta, json){ const v = Object.assign({}, meta); if (window.SEC && SEC.key){ v.e = 1; v.d = await SEC.enc(te.encode(json)); } else v.d = json; return btx(st, 'readwrite', s => s.put(v, k)); }
async function bget(st, k){ const v = await btx(st, 'readonly', s => s.get(k)); if (!v) return null; if (v.e){ if (!(window.SEC && SEC.key)) throw new Error('данные зашифрованы'); return td.decode(await SEC.dec(v.d)); } return v.d; }
const bdel = (st, k) => btx(st, 'readwrite', s => s.delete(k));
async function blist(st){ const d = await bdb(); if (!d) return []; return new Promise(res => { const out = [], tx = d.transaction(st, 'readonly'); tx.objectStore(st).openCursor().onsuccess = e => { const c = e.target.result; if (c){ const v = c.value; out.push({k:c.key, t:v.t, n:v.n, nm:v.nm, sz:v.sz}); c.continue(); } }; tx.oncomplete = () => res(out); tx.onerror = () => res(out); }); }
const stJson = () => JSON.stringify({ftlog:state.ftlog, ftasks:state.ftasks, scenes:state.scenes, trash:state.trash, arrays:state.arrays, palette:state.palette, palVer:PAL_VER, layer:state.layer, grid:state.grid, full:state.full, places:state.places, voice:state.voice, sh:state.sh});
const nObj = arrs => arrs.reduce((s, a) => s + (a.points || []).length + (a.shapes || []).length + (a.texts || []).length, 0);
let bakH = '', bakT = lsGet('skat_bak_t', 0);
const hsh = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36) + ':' + s.length; };
async function bakNow(force){ const j = stJson(), h = hsh(j); if (!force && h === bakH) return false; const t = now();
await bput('b', t, {t, n:nObj(state.arrays), sz:j.length}, j); bakH = h; bakT = t; lsSet('skat_bak_t', t);
const L1 = (await blist('b')).sort((p, q) => p.k - q.k); for (const x of L1.slice(0, Math.max(0, L1.length - 20))) await bdel('b', x.k); return true; }
setInterval(() => { if (S.bakMin > 0 && now() - bakT >= S.bakMin * 60000) bakNow().catch(e => console.warn('bak', e)); }, 60000);
async function restoreJson(j, what){ let d; try { d = JSON.parse(j); } catch(e){ toast('Копия повреждена'); return; }
await bakNow(true).catch(() => {}); clearTimeout(persistT);
Object.assign(state, {ftlog:d.ftlog || [], ftasks:d.ftasks || [], scenes:d.scenes || [], trash:d.trash || [], arrays:(d.arrays || []).map(normArr), palette:d.palette || state.palette, layer:d.layer || state.layer, grid:d.grid !== false, full:!!d.full, places:d.places, voice:d.voice});
if (d.sh) state.sh = d.sh; pn0(); toast(what + ' — перезапуск…'); setTimeout(() => (window.SEC && SEC.last ? SEC.last : Promise.resolve()).then(() => location.reload()), 600); }
P.bak = b => { b.innerHTML = `<label class="f">Автокопия проекта<select id="bkM">${[[0, 'выключено'], [5, 'каждые 5 мин'], [10, 'каждые 10 мин'], [30, 'каждые 30 мин'], [60, 'каждый час']].map(([v, t]) => `<option value="${v}"${S.bakMin === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
<p class="status">Копия делается, только если были изменения. Хранятся 20 последних, на этом устройстве (при включённой защите — в зашифрованном виде). Перед восстановлением текущее состояние тоже сохраняется.</p><div class="row"><button class="primary" id="bkN">Сделать копию сейчас</button></div><div id="bkL" class="shList"><div class="empty">…</div></div>`;
$('bkM').onchange = e => { S.bakMin = +e.target.value; save(); };
const draw = async () => { const L1 = (await blist('b')).sort((p, q) => q.k - p.k); if (!$('bkL')) return; $('bkL').innerHTML = L1.map(x => `<div class="shRow"><div>${dt(x.t)}</div><small>объектов ${x.n} · ${(x.sz / 1048576).toFixed(2)} МБ</small><span><button class="ghost sm" data-r="${x.k}">Восстановить</button><button class="ghost sm" data-d="${x.k}">✕</button></span></div>`).join('') || '<div class="empty">Копий пока нет</div>';
on($('bkL'), '[data-r]', 'click', x => askConfirm(`Восстановить проект из копии ${dt(+x.dataset.r)}? Текущее состояние сохранится отдельной копией.`, 'Восстановить', async () => { try { restoreJson(await bget('b', +x.dataset.r), 'Проект восстановлен'); } catch(e){ toast('Не удалось: ' + e.message); } }));
on($('bkL'), '[data-d]', 'click', async x => { await bdel('b', +x.dataset.d); draw(); }); };
draw(); $('bkN').onclick = async () => { try { await bakNow(true); toast('Копия сделана'); draw(); } catch(e){ toast('Не удалось: ' + e.message); } }; };

// ===== снимки обстановки =====
const snapL = L.layerGroup().addTo(map); let snapOn = null;
async function snapTake(nm){ const t = now(), k = 's' + t, arrs = state.arrays.filter(a => !(isMk(a)));
await bput('s', k, {t, nm, n:nObj(arrs)}, JSON.stringify(arrs)); S.snl.push({k, t, nm, n:nObj(arrs)}); S.log.push({t, k:'m', au:me(), x:`Снимок обстановки «${nm}»`}); save(); }
const itAll = arrs => { const M = new Map(); arrs.forEach(a => (a.points || []).forEach(p => { if (p && p.uid) M.set(p.uid, {a, p}); })); return M; };
function snapShow(arrs, cmp){ try { diffRun(); } catch(e){} snapL.clearLayers(); const A = itAll(arrs), C = itAll(state.arrays.filter(a => !a.hidden)); let ad = 0, rm = 0, mv = 0;
const ic = (c, t) => L.divIcon({className:'shSnI', iconSize:[0, 0], html:`<div style="--c:${c}">${t}</div>`});
if (!cmp){ arrs.forEach(a => (a.points || []).forEach(p => L.marker([p.lat, p.lng], {icon:ic('#9aa3ad', '●'), interactive:false}).addTo(snapL)));
(arrs || []).forEach(a => (a.shapes || []).forEach(s => { try { shapeLayer(s, '#9aa3ad', .1, {dashArray:'4 4', interactive:false}).addTo(snapL); } catch(e){} })); return null; }
A.forEach((v, k) => { const c = C.get(k); if (!c){ rm++; L.marker([v.p.lat, v.p.lng], {icon:ic('#e2533f', '✕'), interactive:false}).addTo(snapL); } else if (distM(v.p, c.p) > 10){ mv++; L.polyline([[v.p.lat, v.p.lng], [c.p.lat, c.p.lng]], {color:'#ff9f1a', weight:2, dashArray:'5 4', interactive:false}).addTo(snapL); L.marker([v.p.lat, v.p.lng], {icon:ic('#ff9f1a', '○'), interactive:false}).addTo(snapL); } });
C.forEach((v, k) => { if (!A.has(k)){ ad++; L.marker([v.p.lat, v.p.lng], {icon:ic('#22c55e', '＋'), interactive:false}).addTo(snapL); } }); return {ad, rm, mv}; }
function snapBar(h){ floatBarX(h ? `<span>${h}</span><button class="ghost" id="snX">Скрыть</button>` : ''); if (h) $('snX').onclick = () => { snapL.clearLayers(); snapOn = null; floatBarX(''); }; }
P.snap = b => { b.innerHTML = `<div class="row"><input id="snN" value="на ${hm(now())} ${new Date().toLocaleDateString('ru-RU')}" style="flex:1"><button class="primary" id="snT">Сохранить снимок</button></div>
<p class="status">«Показать» — серым поверх карты. «Сравнить» — что изменилось с того момента: ＋ появилось, ✕ исчезло, ○ — прежнее место перемещённого. Снимки хранятся на этом устройстве.</p><div id="snL" class="shList"></div>`;
const draw = () => { $('snL').innerHTML = S.snl.slice().reverse().map(x => `<div class="shRow"><div>${E(x.nm)}</div><small>${dt(x.t)} · объектов ${x.n}</small><span><button class="ghost sm" data-a="v" data-k="${x.k}">Показать</button><button class="ghost sm" data-a="c" data-k="${x.k}">Сравнить</button><button class="ghost sm" data-a="r" data-k="${x.k}">Вернуть</button><button class="ghost sm" data-a="d" data-k="${x.k}">✕</button></span></div>`).join('') || '<div class="empty">Снимков нет</div>';
on($('snL'), '[data-a]', 'click', async x => { const k = x.dataset.k, m = S.snl.find(s => s.k === k), a = x.dataset.a;
if (a === 'd'){ askConfirm(`Удалить снимок «${m.nm}»?`, 'Удалить', async () => { await bdel('s', k).catch(() => {}); S.snl = S.snl.filter(s => s.k !== k); save(); draw(); }); return; }
let arrs; try { arrs = JSON.parse(await bget('s', k)); } catch(e){ toast('Снимок недоступен: ' + e.message); return; } if (!arrs){ toast('Снимок не найден на этом устройстве'); return; }
if (a === 'r'){ askConfirm(`Вернуть обстановку «${m.nm}»? Текущая сохранится снимком «перед возвратом».`, 'Вернуть', async () => { await snapTake('перед возвратом ' + hm(now())); const mk = state.arrays.filter(q => isMk(q)); state.arrays = arrs.map(normArr).concat(mk); S.log.push({t:now(), k:'m', au:me(), x:`Возврат к снимку «${m.nm}»`}); persistNow(); renderMarkers(); try { renderLayers(); } catch(e){} closeModals(); toast('Обстановка возвращена'); }); return; }
closeModals(); const r = snapShow(arrs, a === 'c'); snapOn = k; snapBar(a === 'c' ? `«${E(m.nm)}» → сейчас: ＋${r.ad} ✕${r.rm} ○${r.mv}` : `Снимок «${E(m.nm)}» (серым)`); }); };
draw(); $('snT').onclick = async () => { const nm = $('snN').value.trim() || dt(now()); try { await snapTake(nm); toast('Снимок сохранён'); draw(); } catch(e){ toast('Не удалось: ' + e.message); } }; };

// ===== штамп при печати и печать атласом =====
function stampDraw(cv){ const st = S.stamp || {}, g = cv.getContext('2d'), W = cv.width, H = cv.height, k = W / prnSize()[0], mm = v => v * k, mg = mm(8);
const box = (x, y, lines, al) => { const fs = mm(3.4), lh = fs * 1.35; g.font = `600 ${fs}px sans-serif`; const w = Math.max(...lines.map(l => g.measureText(l).width)) + mm(4), h = lines.length * lh + mm(3);
const X = al === 'r' ? x - w : x; g.fillStyle = 'rgba(255,255,255,.93)'; g.fillRect(X, y, w, h); g.strokeStyle = '#111'; g.lineWidth = Math.max(1, mm(.25)); g.strokeRect(X, y, w, h);
g.fillStyle = '#111'; g.textBaseline = 'top'; g.textAlign = 'left'; lines.forEach((l, i) => { g.font = `${i === 0 ? 700 : 500} ${fs}px sans-serif`; g.fillText(l, X + mm(2), y + mm(1.5) + i * lh); }); };
if (st.gr){ g.font = `700 ${mm(3.6)}px sans-serif`; g.fillStyle = '#111'; g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText(st.gr, W - mg, mm(2)); }
if (st.ut || st.utN) box(mg + mm(12), mg + mm(14), ['УТВЕРЖДАЮ', st.ut || '', st.utN || '', '«___» ____________ 20__ г.'].filter(Boolean), 'l');
const ob = st.ob ? `Обстановка на ${st.ob}` : `Обстановка на ${dt(now())}`; box(W - mg - mm(12), H - mg - mm(30), [ob, st.isp ? 'Исполнитель: ' + st.isp : '', st.nm || ''].filter(Boolean), 'r'); }
function prnHook(){ if (typeof prnRender !== 'function' || prnRender.__sh) return !!(typeof prnRender === 'function');
const r0 = prnRender; prnRender = async function(prev){ const r = await r0.apply(this, arguments); try { if (r && r.cv && S.stamp && S.stamp.on) stampDraw(r.cv); } catch(e){ console.warn(e); } return r; }; prnRender.__sh = 1;
const lg = $('prnLeg'); if (lg && !$('prnStamp')){ const l = document.createElement('label'); l.className = 'f'; l.style.cssText = 'display:flex;align-items:center;gap:10px'; l.innerHTML = '<input type="checkbox" id="prnStamp" style="width:22px;min-height:22px;margin:0"> Штамп: гриф, «Утверждаю», исполнитель <button class="ghost sm" id="prnStampE" type="button">Настроить</button>'; lg.closest('label').after(l);
$('prnStamp').checked = !!(S.stamp && S.stamp.on); $('prnStamp').onchange = e => { S.stamp.on = e.target.checked; save(); }; $('prnStampE').onclick = e => { e.preventDefault(); go('stamp'); }; } return true; }
{ const iv = setInterval(() => { if (prnHook()) clearInterval(iv); }, 2000); }
P.stamp = b => { const st = S.stamp = S.stamp || {}; const f = (k, t, ph) => `<label class="f">${t}<input data-k="${k}" value="${E(st[k] || '')}" placeholder="${ph || ''}"></label>`;
b.innerHTML = `<label class="f" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="stOn" ${st.on ? 'checked' : ''} style="width:22px;min-height:22px;margin:0"> Ставить штамп на печатный лист</label>
${f('gr', 'Гриф (справа вверху)', 'например, Экз. № 1')}${f('ut', '«Утверждаю»: должность', 'Командир 1 мсб')}${f('utN', '«Утверждаю»: звание, фамилия', 'майор И. Иванов')}${f('isp', 'Исполнитель', 'НШ капитан П. Петров')}${f('ob', 'Обстановка на (пусто — время печати)', '06:00 20.10')}${f('nm', 'Подпись листа (необязательно)', 'Рабочая карта НШ')}
<p class="status">Условные обозначения — галочка «Условные обозначения» в окне печати: туда попадают знаки видимых слоёв.</p><div class="row"><button class="primary" id="stPr">Открыть печать</button></div>`;
on(b, '[data-k]', 'change', x => { st[x.dataset.k] = x.value.trim(); save(); }); $('stOn').onchange = e => { st.on = e.target.checked; save(); if ($('prnStamp')) $('prnStamp').checked = st.on; };
$('stPr').onclick = async () => { await modLoad('op').catch(() => {}); prnHook(); closeModals(); const pb = $('prnBtn'); if (pb) pb.click(); }; };
const atlL = L.layerGroup().addTo(map); let ATL = null;
function atlPlan(R){ const Ws = map.getSize().x, Hs = map.getSize().y, c = map.getCenter(), a0 = map.containerPointToLatLng([Ws / 2 - 50, Hs / 2]), a1 = map.containerPointToLatLng([Ws / 2 + 50, Hs / 2]), mpp = distM(a0, a1) / 100;
const [w, h] = prnSize(), fb = $('prnGrid') && $('prnGrid').checked ? 9 : 0, ar = (w - 16 - 2 * fb) / (h - 16 - 11 - 7 - 2 * fb); let wm = Ws * mpp, hm = Hs * mpp; if (ar > wm / hm) hm = wm / ar; else wm = hm * ar;
const ov = .06, kl = 111320 * Math.cos((R.s + R.n) / 2 * Math.PI / 180), Wr = (R.e - R.w) * kl, Hr = (R.n - R.s) * 111320, sx = wm * (1 - ov), sy = hm * (1 - ov);
const nc = Math.max(1, Math.ceil((Wr - wm * ov) / sx)), nr = Math.max(1, Math.ceil((Hr - hm * ov) / sy)), S0 = [];
for (let r = 0; r < nr; r++) for (let q = 0; q < nc; q++){ const cy = R.n - (hm / 2 + r * sy) / 111320, cx = R.w + (wm / 2 + q * sx) / kl; S0.push({c:[cy, cx], b:[[cy - hm / 2 / 111320, cx - wm / 2 / kl], [cy + hm / 2 / 111320, cx + wm / 2 / kl]], n:S0.length + 1}); }
return {S:S0, nc, nr, z:map.getZoom(), wm, hm}; }
function atlDraw(){ atlL.clearLayers(); if (!ATL) return; ATL.S.forEach(s => { L.rectangle(s.b, {color:'#2f7cf6', weight:2, fillOpacity:.05, dashArray:'6 4', interactive:false}).addTo(atlL); L.marker(s.c, {interactive:false, icon:L.divIcon({className:'shAtN', iconSize:[0, 0], html:`<div>${s.n}</div>`})}).addTo(atlL); }); }
async function atlRun(){ if (!ATL) return; const v0 = [map.getCenter(), map.getZoom()], t0 = $('prnTitle').value, N = ATL.S.length; floatBarX(''); atlL.clearLayers();
try { for (const s of ATL.S){ map.setView(s.c, ATL.z, {animate:false}); await new Promise(r => setTimeout(r, 150)); $('prnTitle').value = `${t0 || 'Атлас'} — лист ${s.n} из ${N}`;
const r = await prnRender(false); if (!r) break; const blob = await new Promise(q => r.cv.toBlob(q, 'image/jpeg', .9)); r.cv.width = r.cv.height = 1; if (!blob){ toast('Не хватило памяти — уменьшите формат'); break; }
deliverFile(blob, `СКАТ_атлас_${stamp()}_лист${String(s.n).padStart(2, '0')}.jpg`, `Лист ${s.n} из ${N} готов`); await new Promise(r => setTimeout(r, 900)); } }
finally { $('prnTitle').value = t0; map.setView(v0[0], v0[1], {animate:false}); } }
function atlScheme(){ if (!ATL) return; const a = newLayer('Атлас: схема листов', 'shapes', '#2f7cf6'); ATL.S.forEach(s => { const [[s0, w0], [n0, e0]] = s.b; a.shapes.push({type:'poly', pts:[[s0, w0], [s0, e0], [n0, e0], [n0, w0]], color:'#2f7cf6', op:.04, name:'Лист ' + s.n, dash:'dash', t:now()}); a.texts.push({t:String(s.n), lat:s.c[0], lng:s.c[1], s:22, c:'#2f7cf6', f:'Roboto Condensed', b:1, al:'center'}); }); persistNow(); renderMarkers(); toast('Схема листов добавлена слоем'); }
P.atlas = b => { b.innerHTML = `<p class="status">Атлас печатается с настройками окна печати (формат, ориентация, разрешение, слои) и текущим масштабом карты. Сначала задайте их, затем выделите район рамкой — он разобьётся на листы с перекрытием 6%.</p>
<div class="row"><button class="ghost" id="atP">Настройки печати</button><button class="primary" id="atR">Выделить район</button></div>`;
$('atP').onclick = async () => { await modLoad('op').catch(() => {}); prnHook(); closeModals(); $('prnBtn').click(); };
$('atR').onclick = async () => { await modLoad('op').catch(() => {}); prnHook(); pickRect('Выделите район атласа рамкой', R => { ATL = atlPlan(R); if (ATL.S.length > 40){ toast(`Листов ${ATL.S.length} — слишком много. Уменьшите масштаб карты или район.`); ATL = null; return; } atlDraw();
floatBarX(`<span>Атлас: ${ATL.S.length} лист. (${ATL.nr}×${ATL.nc})</span><button class="primary" id="atG">Сохранить листы</button><button class="ghost" id="atS">Схема слоем</button><button class="ghost" id="atX">Отмена</button>`);
$('atG').onclick = atlRun; $('atS').onclick = atlScheme; $('atX').onclick = () => { ATL = null; atlL.clearLayers(); floatBarX(''); }; }); }; };

// ===== сводка сил и средств =====
const SIDE = {b:'Свои', r:'Противник', '':'Без стороны'};
function sumCalc(arrs, R){ const T = {}, inR = (lat, lng) => !R || (lat >= R.s && lat <= R.n && lng >= R.w && lng <= R.e); let n = 0, dst = 0, cov = 0;
arrs.forEach(a => { (a.points || []).forEach(p => { if (p.hid || !inR(p.lat, p.lng)) return; const sd = p.side === 'b' || p.side === 'r' ? p.side : (a.style && /e2533f|ff3b|d93|c0392b/i.test(a.style.color) ? 'r' : ''), k = symN(p); ((T[sd] = T[sd] || {})[k] = (T[sd][k] || 0) + 1); n++; if (p.dst) dst++; if (p.cov) cov++; });
(a.shapes || []).forEach(s => { if (!s.sym || s.hid) return; const q = itPos('s', s); if (!inR(q[0], q[1])) return; const sd = s.side || '', k = symN(s); ((T[sd] = T[sd] || {})[k] = (T[sd][k] || 0) + 1); n++; }); }); return {T, n, dst, cov}; }
const sumText = r => Object.entries(r.T).map(([sd, o]) => `${SIDE[sd] || sd}: ` + Object.entries(o).sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} — ${v}`).join(', ')).join('\n') + (r.dst || r.cov ? `\nУничтожено: ${r.dst}, укрыто: ${r.cov}` : '');
P.sum = b => { const ar = ARG || {}; b.innerHTML = `<label class="f">Что считать<select id="smS"><option value="v">Все видимые слои</option>${state.arrays.filter(a => !isMk(a)).map(a => `<option value="${a.id}"${String(ar.id) === String(a.id) ? ' selected' : ''}>${E(a.name)}</option>`).join('')}</select></label><div class="row"><button class="ghost" id="smR">${ar.R ? 'Район выбран ✓' : 'Только в районе…'}</button>${ar.R ? '<button class="ghost" id="smR0">Весь</button>' : ''}<button class="ghost" id="smC">Копировать</button></div><div id="smO"></div>`;
const calc = () => { const v = $('smS').value, arrs = v === 'v' ? vis() : [arrById(+v)].filter(Boolean), r = sumCalc(arrs, ar.R); ar.id = v; ARG = ar;
$('smO').innerHTML = `<p class="status">Всего объектов со знаками и точек: ${r.n}</p>` + Object.entries(r.T).map(([sd, o]) => `<div class="flabel">${SIDE[sd] || sd} (${Object.values(o).reduce((s, x) => s + x, 0)})</div><table class="shTb">${Object.entries(o).sort((p, q) => q[1] - p[1]).map(([k, x]) => `<tr><td>${E(k)}</td><td>${x}</td></tr>`).join('')}</table>`).join('') + (r.dst || r.cov ? `<p class="status">Уничтожено: ${r.dst} · укрыто: ${r.cov}</p>` : ''); return r; };
calc(); $('smS').onchange = calc; $('smC').onclick = () => copy(sumText(calc()));
$('smR').onclick = () => pickRect('Выделите район рамкой', R => { ar.R = R; go('sum', ar); }); if ($('smR0')) $('smR0').onclick = () => { ar.R = null; go('sum', ar); }; };

// ===== донесения по шаблонам =====
const RT0 = [{n:'Донесение об обстановке', x:'ДОНЕСЕНИЕ\nна {время} {дата}\nРайон: кв. {кв} ({центр}).\nОбстановка:\n{сводка}\nЗадачи в работе:\n{задачи}\n{подпись}'},
{n:'Доклад о выполнении задачи', x:'{время} {дата}. Задача ______ выполнена. Район кв. {кв}.\nПотерь нет.\n{подпись}'},
{n:'Строевая записка', x:'СТРОЕВАЯ ЗАПИСКА на {время} {дата}\n{строевая}\n{подпись}'}];
const rtpl = () => S.rtpl || (S.rtpl = RT0.map(x => ({...x})));
function repFill(x){ const c = map.getCenter(), s = sk(c.lat, c.lng), d = new Date();
const V = {'дата':d.toLocaleDateString('ru-RU'), 'время':hm(d), 'кв':s.kv, 'центр':`X ${s.x} Y ${s.y}`, 'сводка':sumText(sumCalc(vis())), 'строевая':strText(), 'задачи':S.tasks.filter(t => t.st < 2).map(t => `— ${t.x}${t.who ? ' (' + t.who + ')' : ''}${t.due ? ' до ' + dt(t.due) : ''}`).join('\n') || '—', 'подпись':me() === 'я' ? '' : me()};
return x.replace(/\{([а-яё]+)\}/gi, (m, k) => V[k.toLowerCase()] ?? m); }
P.rep = b => { const T = rtpl(); let i = Math.min(T.length - 1, (ARG && ARG.i) || 0);
b.innerHTML = `<div class="row"><select id="rpS" style="flex:1">${T.map((t, k) => `<option value="${k}"${k === i ? ' selected' : ''}>${E(t.n)}</option>`).join('')}</select><button class="ghost" id="rpN">＋</button><button class="ghost" id="rpD">✕</button></div>
<label class="f">Шаблон (подстановки: {дата} {время} {кв} {центр} {сводка} {строевая} {задачи} {подпись})<textarea id="rpT" rows="5"></textarea></label><label class="f">Готовый текст (можно править)<textarea id="rpO" rows="8"></textarea></label>
<div class="row"><button class="ghost" id="rpF">Обновить</button><button class="ghost" id="rpC">Копировать</button><button class="primary" id="rpSh">Отправить</button><button class="ghost" id="rpL">В журнал</button></div>`;
const fill = () => { $('rpT').value = T[i].x; $('rpO').value = repFill(T[i].x); }; fill();
$('rpS').onchange = e => { i = +e.target.value; ARG = {i}; fill(); }; $('rpT').onchange = e => { T[i].x = e.target.value; save(); $('rpO').value = repFill(T[i].x); }; $('rpF').onclick = () => { $('rpO').value = repFill($('rpT').value); };
$('rpN').onclick = () => { const n = prompt('Название шаблона', 'Донесение'); if (!n) return; T.push({n, x:'{время} {дата}. Кв. {кв}.\n\n{подпись}'}); save(); go('rep', {i:T.length - 1}); };
$('rpD').onclick = () => askConfirm(`Удалить шаблон «${T[i].n}»?`, 'Удалить', () => { T.splice(i, 1); if (!T.length) S.rtpl = null; save(); go('rep'); });
$('rpC').onclick = () => copy($('rpO').value); $('rpSh').onclick = () => share($('rpO').value, 'донесение'); $('rpL').onclick = () => { S.log.push({t:now(), k:'m', au:me(), x:'Донесение: ' + $('rpO').value.slice(0, 500)}); save(); toast('Записано в журнал'); }; };

// ===== строевая записка =====
const UF = [['n', 'Подразделение'], ['lsS', 'ЛС по штату'], ['lsN', 'ЛС в наличии'], ['tS', 'Техника по штату'], ['tN', 'Техника исправна'], ['gsm', 'ГСМ, %'], ['bk', 'Обеспеч., %']];
const pct = (a, b) => b ? Math.round(a / b * 100) : '';
function strText(){ if (!S.units.length) return '—'; const t = strTot(); return S.units.map(u => `${u.n || '—'}: ЛС ${u.lsN || 0}/${u.lsS || 0}, техника ${u.tN || 0}/${u.tS || 0}${u.gsm !== '' && u.gsm != null ? ', ГСМ ' + u.gsm + '%' : ''}${u.bk !== '' && u.bk != null ? ', обеспеч. ' + u.bk + '%' : ''}`).join('\n') + `\nИТОГО: ЛС ${t.lsN}/${t.lsS} (${pct(t.lsN, t.lsS)}%), техника ${t.tN}/${t.tS} (${pct(t.tN, t.tS)}%)`; }
const strTot = () => S.units.reduce((s, u) => { ['lsS', 'lsN', 'tS', 'tN'].forEach(k => s[k] += +u[k] || 0); return s; }, {lsS:0, lsN:0, tS:0, tN:0});
P.str = b => { b.innerHTML = `<div class="shScroll"><table class="shTb shEd"><tr>${UF.map(f => `<th>${f[1]}</th>`).join('')}<th></th></tr>${S.units.map((u, i) => `<tr>${UF.map(([k]) => `<td><input data-i="${i}" data-k="${k}" value="${E(u[k] ?? '')}"${k === 'n' ? '' : ' inputmode="numeric"'}></td>`).join('')}<td><button class="ghost sm" data-d="${i}">✕</button></td></tr>`).join('')}
<tr class="tot"><td>ИТОГО</td>${(t => [t.lsS, t.lsN + ` (${pct(t.lsN, t.lsS)}%)`, t.tS, t.tN + ` (${pct(t.tN, t.tS)}%)`, '', ''].map(v => `<td>${v}</td>`).join(''))(strTot())}<td></td></tr></table></div>
<div class="row"><button class="ghost" id="suA">＋ Строка</button><button class="ghost" id="suM">Из карточек на карте</button><button class="ghost" id="suC">Копировать</button><button class="ghost" id="suX">CSV</button></div>`;
on(b, 'input[data-k]', 'change', x => { S.units[+x.dataset.i][x.dataset.k] = x.dataset.k === 'n' ? x.value.trim() : x.value.replace(',', '.').trim(); save(); go('str'); });
on(b, '[data-d]', 'click', x => { S.units.splice(+x.dataset.d, 1); save(); go('str'); }); $('suA').onclick = () => { S.units.push({n:''}); save(); go('str'); };
$('suM').onclick = () => { let k = 0; state.arrays.forEach(a => (a.points || []).forEach(p => { if (!p.u) return; const n = p.u.nm || nmOf(a, p), u = S.units.find(x => x.n === n) || (S.units.push({n}), S.units[S.units.length - 1]); Object.assign(u, {lsS:p.u.lsS ?? u.lsS, lsN:p.u.lsN ?? u.lsN, tS:p.u.tS ?? u.tS, tN:p.u.tN ?? u.tN, bk:p.u.ob ?? u.bk}); k++; })); save(); go('str'); toast(k ? `Подтянуто карточек: ${k}` : 'На карте нет карточек подразделений (карточка точки → «▣ Подразделение»)'); };
$('suC').onclick = () => copy('СТРОЕВАЯ ЗАПИСКА на ' + dt(now()) + '\n' + strText()); $('suX').onclick = () => csvFile([UF.map(f => f[1]), ...S.units.map(u => UF.map(([k]) => u[k] ?? ''))], 'строевая'); };

// ===== карточка подразделения и заметки на точке =====
const UC = [['nm', 'Подразделение', ''], ['cmd', 'Командир', ''], ['cs', 'Позывной', ''], ['lsS', 'ЛС по штату', 'n'], ['lsN', 'ЛС в наличии', 'n'], ['tS', 'Техника по штату', 'n'], ['tN', 'Техника исправна', 'n'], ['sv', 'Связь (частоты, каналы)', ''], ['ob', 'Обеспеченность, %', 'n'], ['nt', 'Примечание', '']];
P.unit = (b, ar) => { const p = ar.p, u = p.u || {}; b.innerHTML = UC.map(([k, t, n]) => `<label class="f">${t}<input data-k="${k}" value="${E(u[k] ?? '')}"${n ? ' inputmode="numeric"' : ''}></label>`).join('') + `<p class="status">Обеспеченность видна на карте под знаком; все карточки — Штаб → Подразделения и строевая записка.</p><div class="row"><button class="ghost" id="ucD">Убрать карточку</button><button class="primary" id="ucOk">Сохранить</button></div>`;
$('ucOk').onclick = () => { const o = {}; b.querySelectorAll('[data-k]').forEach(x => { const v = x.value.trim(); if (v !== '') o[x.dataset.k] = UC.find(c => c[0] === x.dataset.k)[2] ? +v.replace(',', '.') || 0 : v; }); p.u = o; persistNow(); renderMarkers(); closeModals(); toast('Карточка сохранена'); };
$('ucD').onclick = () => { delete p.u; persistNow(); renderMarkers(); closeModals(); }; };
P.note = (b, ar) => { const p = ar.p, N = p.notes = p.notes || []; b.innerHTML = `<div class="shList">${N.map((n, i) => `<div class="shRow${n.ok ? ' auto' : ''}"><small>${dt(n.t)} · ${E(n.au || '')}</small><div>${E(n.x)}</div><span><button class="ghost sm${n.ok ? ' on' : ''}" data-ok="${i}">${n.ok ? 'Решено ✓' : 'Решено'}</button><button class="ghost sm" data-d="${i}">✕</button></span></div>`).join('') || '<div class="empty">Заметок нет</div>'}</div>
<label class="f">Новая заметка или вопрос<textarea id="ntT" rows="2"></textarea></label><div class="row"><button class="primary" id="ntA">Добавить</button></div>`;
on(b, '[data-ok]', 'click', x => { const n = N[+x.dataset.ok]; n.ok = !n.ok; persistNow(); renderMarkers(); go('note', ar); }); on(b, '[data-d]', 'click', x => { N.splice(+x.dataset.d, 1); if (!N.length) delete p.notes; persistNow(); renderMarkers(); go('note', ar); });
$('ntA').onclick = () => { const x = $('ntT').value.trim(); if (!x) return; N.push({t:now(), au:me(), x}); persistNow(); renderMarkers(); go('note', ar); }; };
{ const pe1 = ptExtra; ptExtra = function(a, i){ pe1.apply(this, arguments); const w = $('ptX'), p = a.points[i]; if (!w || !p) return; const no = (p.notes || []).filter(n => !n.ok).length;
w.insertAdjacentHTML('beforeend', `<button data-x3="u">▣ Подразделение${p.u ? ' ✓' : ''}</button><button data-x3="n">💬 Заметки${no ? ' (' + no + ')' : ''}</button>`);
w.querySelector('[data-x3="u"]').onclick = () => go('unit', {p, title:'Подразделение: ' + labelOf(a, i), back:'units'}); w.querySelector('[data-x3="n"]').onclick = () => go('note', {p, title:'Заметки: ' + labelOf(a, i), back:'notes'}); }; }
const openNotes = () => { const o = []; state.arrays.forEach(a => (a.points || []).forEach((p, i) => (p.notes || []).forEach(n => { if (!n.ok) o.push({a, i, p, n}); }))); return o; };
P.notes = b => { const L1 = openNotes(); b.innerHTML = `<p class="status">Открытые заметки по всем точкам. Добавить — в карточке точки кнопка «💬 Заметки».</p><div class="shList">${L1.map((x, k) => `<div class="shRow"><small>${dt(x.n.t)} · ${E(x.n.au || '')} · ${E(labelOf(x.a, x.i))} (${E(x.a.name)})</small><div>${E(x.n.x)}</div><span><button class="ghost sm" data-g="${k}">◎</button><button class="ghost sm" data-o="${k}">Открыть</button></span></div>`).join('') || '<div class="empty">Открытых заметок нет</div>'}</div>`;
on(b, '[data-g]', 'click', x => { const it = L1[+x.dataset.g]; closeModals(); map.setView([it.p.lat, it.p.lng], Math.max(map.getZoom(), 15)); }); on(b, '[data-o]', 'click', x => { const it = L1[+x.dataset.o]; go('note', {p:it.p, title:'Заметки: ' + labelOf(it.a, it.i), back:'notes'}); }); };
P.units = b => { const L1 = []; state.arrays.forEach(a => (a.points || []).forEach((p, i) => { if (p.u) L1.push({a, i, p}); }));
b.innerHTML = `<p class="status">Карточки подразделений на знаках. Добавить — карточка точки → «▣ Подразделение».</p><div class="shScroll"><table class="shTb"><tr><th>Подразделение</th><th>Командир</th><th>Позывной</th><th>ЛС</th><th>Техника</th><th>%</th><th></th></tr>${L1.map((x, k) => { const u = x.p.u; return `<tr><td>${E(u.nm || labelOf(x.a, x.i))}</td><td>${E(u.cmd || '')}</td><td>${E(u.cs || '')}</td><td>${u.lsN ?? ''}/${u.lsS ?? ''}</td><td>${u.tN ?? ''}/${u.tS ?? ''}</td><td class="${obCls(u.ob)}">${u.ob ?? ''}</td><td><button class="ghost sm" data-e="${k}">✎</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Карточек нет</td></tr>'}</table></div>
<div class="row"><button class="ghost" id="unS">В строевую записку</button><button class="ghost" id="unC">Копировать</button></div>`;
on(b, '[data-e]', 'click', x => { const it = L1[+x.dataset.e]; go('unit', {p:it.p, title:'Подразделение: ' + labelOf(it.a, it.i), back:'units'}); }); $('unS').onclick = () => { go('str'); $('suM').click(); };
$('unC').onclick = () => copy(L1.map(x => { const u = x.p.u; return `${u.nm || labelOf(x.a, x.i)}: ${u.cmd || ''} ${u.cs ? '«' + u.cs + '»' : ''} ЛС ${u.lsN ?? '?'}/${u.lsS ?? '?'}, техника ${u.tN ?? '?'}/${u.tS ?? '?'}${u.ob != null ? ', ' + u.ob + '%' : ''}`; }).join('\n')); };
const obCls = v => v == null || v === '' ? '' : v >= 75 ? 'ok' : v >= 50 ? 'mid' : 'bad';
const bdgL = L.layerGroup().addTo(map);
function badges(){ bdgL.clearLayers(); const lim = map.getBounds().pad(.2); vis().forEach(a => (a.points || []).forEach(p => { if (p.hid || (!p.u && !p.notes) || !lim.contains([p.lat, p.lng])) return; const no = (p.notes || []).filter(n => !n.ok).length, ob = p.u && p.u.ob != null && p.u.ob !== '' ? p.u.ob : null; if (ob == null && !no) return;
L.marker([p.lat, p.lng], {interactive:false, icon:L.divIcon({className:'shBdg', iconSize:[0, 0], html:`<div>${ob != null ? `<b class="${obCls(ob)}">${ob}%</b>` : ''}${no ? `<i>💬${no}</i>` : ''}</div>`})}).addTo(bdgL); })); }
{ const rm0 = renderMarkers; renderMarkers = function(){ const r = rm0.apply(this, arguments); try { badges(); } catch(e){} return r; }; } map.on('moveend', () => { try { badges(); } catch(e){} }); setTimeout(badges, 500);

// ===== задачи и поручения =====
const tskL = L.layerGroup().addTo(map); const TST = ['новая', 'в работе', 'выполнена'];
function tskDraw(){ tskL.clearLayers(); S.tasks.forEach(t => { if (!t.ll || t.st === 2) return; const od = t.due && t.due < now(); L.marker(t.ll, {icon:L.divIcon({className:'shTsk', iconSize:[0, 0], html:`<div class="${od ? 'bad' : t.st ? 'mid' : ''}">☑ ${E(t.x.slice(0, 28))}</div>`})}).on('click', () => go('tasks')).addTo(tskL); }); }
setInterval(() => { let ch = 0; S.tasks.forEach(t => { if (t.st < 2 && t.due && !t.n && t.due <= now()){ t.n = 1; ch = 1; vib(); toast(`Срок задачи: ${t.x}${t.who ? ' (' + t.who + ')' : ''}`); } }); if (ch){ save(); tskDraw(); } }, 20000);
P.tasks = b => { b.innerHTML = `<label class="f">Задача<input id="tkX" placeholder="что сделать"></label><div class="duo"><label class="f">Исполнитель<input id="tkW"></label><label class="f">Срок<input type="datetime-local" id="tkD"></label></div>
<label class="f" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="tkP" style="width:22px;min-height:22px;margin:0"> Привязать к центру карты</label><div class="row"><button class="primary" id="tkA">Добавить</button></div><div id="tkL" class="shList"></div>`;
const draw = () => { const L1 = S.tasks.map((t, i) => [t, i]).sort((p, q) => (p[0].st === 2) - (q[0].st === 2) || (p[0].due || 9e15) - (q[0].due || 9e15));
$('tkL').innerHTML = L1.map(([t, i]) => { const od = t.st < 2 && t.due && t.due < now(); return `<div class="shRow${t.st === 2 ? ' auto' : ''}"><small class="${od ? 'bad' : ''}">${t.due ? 'до ' + dt(t.due) : 'без срока'}${od ? ' — просрочена' : ''}${t.who ? ' · ' + E(t.who) : ''}</small><div>${E(t.x)}</div><span><button class="ghost sm" data-s="${i}">${TST[t.st]}</button>${t.ll ? `<button class="ghost sm" data-g="${i}">◎</button>` : ''}<button class="ghost sm" data-d="${i}">✕</button></span></div>`; }).join('') || '<div class="empty">Задач нет</div>';
on($('tkL'), '[data-s]', 'click', x => { const t = S.tasks[+x.dataset.s]; t.st = (t.st + 1) % 3; if (t.st === 2) S.log.push({t:now(), k:'m', au:me(), x:'Выполнена задача: ' + t.x}); save(); tskDraw(); draw(); });
on($('tkL'), '[data-g]', 'click', x => { closeModals(); map.setView(S.tasks[+x.dataset.g].ll, Math.max(map.getZoom(), 14)); }); on($('tkL'), '[data-d]', 'click', x => { S.tasks.splice(+x.dataset.d, 1); save(); tskDraw(); draw(); }); };
draw(); $('tkA').onclick = () => { const x = $('tkX').value.trim(); if (!x) return; const c = map.getCenter(); S.tasks.push({id:now(), x, who:$('tkW').value.trim(), due:dOut($('tkD').value), st:0, ll:$('tkP').checked ? [+c.lat.toFixed(6), +c.lng.toFixed(6)] : null}); S.log.push({t:now(), k:'m', au:me(), x:'Поставлена задача: ' + x + ($('tkW').value.trim() ? ' — ' + $('tkW').value.trim() : '')}); save(); tskDraw(); go('tasks'); }; };
setTimeout(tskDraw, 400);

// ===== позывные =====
P.cs = b => { let q = ''; b.innerHTML = `<input id="csQ" placeholder="Поиск по позывному, должности, связи" style="width:100%"><div id="csL" class="shList"></div><div class="flabel">Добавить</div><div class="duo"><label class="f">Позывной<input id="csC"></label><label class="f">Должность, звание, ФИО<input id="csN"></label></div><div class="duo"><label class="f">Связь<input id="csF" placeholder="частота, канал, телефон"></label><label class="f">Привязать к точке<select id="csP"><option value="">— нет —</option>${state.arrays.filter(a => !isMk(a)).flatMap(a => (a.points || []).map((p, i) => p.uid ? `<option value="${p.uid}">${E(labelOf(a, i))} — ${E(a.name)}</option>` : '')).join('')}</select></label></div><div class="row"><button class="primary" id="csA">Добавить</button></div>`;
const draw = () => { const ql = q.toLowerCase(); $('csL').innerHTML = S.cs.map((c, i) => [c, i]).filter(([c]) => !ql || [c.cs, c.nm, c.fr].join(' ').toLowerCase().includes(ql)).map(([c, i]) => `<div class="shRow"><div><b>${E(c.cs)}</b> — ${E(c.nm || '')}</div><small>${E(c.fr || '')}${c.uid && findPt(c.uid) ? ' · на карте' : ''}</small><span>${c.uid ? `<button class="ghost sm" data-g="${i}">◎</button>` : ''}<button class="ghost sm" data-d="${i}">✕</button></span></div>`).join('') || '<div class="empty">Пусто</div>';
on($('csL'), '[data-g]', 'click', x => { const f = findPt(S.cs[+x.dataset.g].uid); if (!f){ toast('Точка не найдена'); return; } closeModals(); map.setView([f.p.lat, f.p.lng], Math.max(map.getZoom(), 15)); });
on($('csL'), '[data-d]', 'click', x => { S.cs.splice(+x.dataset.d, 1); save(); draw(); }); };
draw(); $('csQ').oninput = e => { q = e.target.value; draw(); }; $('csA').onclick = () => { const cs = $('csC').value.trim(); if (!cs) return; S.cs.push({cs, nm:$('csN').value.trim(), fr:$('csF').value.trim(), uid:$('csP').value || null}); save(); go('cs'); }; };

// ===== график от «Ч» =====
const fO = o => `Ч${o < 0 ? '−' : '+'}${Math.floor(Math.abs(o) / 60)}:${String(Math.abs(o) % 60).padStart(2, '0')}`;
const pO = v => { const m = String(v).trim().replace(/^Ч/i, '').replace('−', '-').match(/^([+-])?\s*(\d+)(?:[:.](\d{1,2}))?$/); if (!m) return null; const o = (+m[2]) * 60 + (+(m[3] || 0)); return m[1] === '-' ? -o : o; };
function hhNext(){ if (!S.H.t) return ''; const n = S.H.it.filter(x => !x.d && S.H.t + x.o * 60000 >= now()).sort((p, q) => p.o - q.o)[0]; return n ? `${fO(n.o)} (${hm(S.H.t + n.o * 60000)}) ${n.x}` : ''; }
setInterval(() => { if (!S.H.t) return; let ch = 0; S.H.it.forEach(x => { if (!x.d && !x.n && S.H.t + x.o * 60000 <= now()){ x.n = 1; ch = 1; vib(); toast(`${fO(x.o)}: ${x.x}`); } }); if (ch) save(); }, 15000);
P.hh = b => { const T = S.H; b.innerHTML = `<label class="f">Время «Ч»<input type="datetime-local" id="hhT" value="${T.t ? dIn(T.t) : ''}"></label><p class="status">Мероприятия задаются смещением от «Ч» (например, −2:00 или +0:30). При переносе «Ч» все времена пересчитываются; в назначенное время — напоминание.</p>
<div class="row"><input id="hhO" placeholder="−2:00" style="width:90px"><input id="hhX" placeholder="мероприятие" style="flex:1"><button class="primary" id="hhA">＋</button></div><div id="hhL" class="shList"></div><div class="row"><button class="ghost" id="hhC">Копировать график</button><button class="ghost" id="hhR">Сбросить отметки</button></div>`;
const rows = () => T.it.map((x, i) => [x, i]).sort((p, q) => p[0].o - q[0].o);
const draw = () => { $('hhL').innerHTML = rows().map(([x, i]) => { const at = T.t ? T.t + x.o * 60000 : 0, past = at && at < now(); return `<div class="shRow${x.d ? ' auto' : ''}"><div><b>${fO(x.o)}</b>${at ? ` <small class="${past && !x.d ? 'bad' : ''}">${dt(at)}</small>` : ''} — ${E(x.x)}</div><span><button class="ghost sm${x.d ? ' on' : ''}" data-ok="${i}">✓</button><button class="ghost sm" data-d="${i}">✕</button></span></div>`; }).join('') || '<div class="empty">Мероприятий нет</div>';
on($('hhL'), '[data-ok]', 'click', x => { const it = T.it[+x.dataset.ok]; it.d = !it.d; save(); draw(); }); on($('hhL'), '[data-d]', 'click', x => { T.it.splice(+x.dataset.d, 1); save(); draw(); }); };
draw(); $('hhT').onchange = e => { T.t = dOut(e.target.value); T.it.forEach(x => { x.n = 0; }); S.log.push({t:now(), k:'m', au:me(), x:'Время «Ч» — ' + (T.t ? dt(T.t) : 'снято')}); save(); draw(); };
$('hhA').onclick = () => { const o = pO($('hhO').value), x = $('hhX').value.trim(); if (o == null || !x){ toast('Нужны смещение (например, −2:00) и текст'); return; } T.it.push({o, x}); save(); $('hhO').value = ''; $('hhX').value = ''; draw(); };
$('hhC').onclick = () => copy(`ГРАФИК (Ч = ${T.t ? dt(T.t) : 'не задано'})\n` + rows().map(([x]) => `${fO(x.o)}${T.t ? ' (' + dt(T.t + x.o * 60000) + ')' : ''} — ${x.x}`).join('\n')); $('hhR').onclick = () => { T.it.forEach(x => { x.d = 0; x.n = 0; }); save(); draw(); }; };

// ===== режим доклада =====
let BR = null;
P.brief = b => { const St = S.steps; b.innerHTML = `<p class="status">Этап доклада = видимые сейчас слои + положение карты + пояснение. Настройте карту и нажмите «＋ Этап из текущего вида».</p><div class="row"><button class="ghost" id="brA">＋ Этап из текущего вида</button><button class="primary" id="brP"${St.length ? '' : ' disabled'}>▶ Начать доклад</button></div><div class="shList">${St.map((s, i) => `<div class="shRow"><div><b>${i + 1}.</b> ${E(s.nm)}</div><small>${E(s.note || '')} · слоёв ${s.lay.length}</small><span><button class="ghost sm" data-u="${i}">▲</button><button class="ghost sm" data-e="${i}">✎</button><button class="ghost sm" data-w="${i}">Обновить</button><button class="ghost sm" data-d="${i}">✕</button></span></div>`).join('') || '<div class="empty">Этапов нет</div>'}</div>`;
$('brA').onclick = () => { const nm = prompt('Название этапа', `Этап ${St.length + 1}`); if (nm === null) return; const c = map.getCenter(); St.push({nm:nm || `Этап ${St.length + 1}`, note:'', lay:vis().map(a => a.id), c:[c.lat, c.lng], z:map.getZoom()}); save(); go('brief'); };
on(b, '[data-u]', 'click', x => { const i = +x.dataset.u; if (i > 0){ [St[i - 1], St[i]] = [St[i], St[i - 1]]; save(); go('brief'); } });
on(b, '[data-e]', 'click', x => { const s = St[+x.dataset.e], nm = prompt('Название этапа', s.nm); if (nm === null) return; const nt = prompt('Пояснение (показывается внизу)', s.note || ''); s.nm = nm || s.nm; if (nt !== null) s.note = nt; save(); go('brief'); });
on(b, '[data-w]', 'click', x => { const s = St[+x.dataset.w], c = map.getCenter(); Object.assign(s, {lay:vis().map(a => a.id), c:[c.lat, c.lng], z:map.getZoom()}); save(); toast('Этап обновлён по текущему виду'); go('brief'); });
on(b, '[data-d]', 'click', x => { St.splice(+x.dataset.d, 1); save(); go('brief'); }); $('brP').onclick = brStart; };
function brStart(){ if (!S.steps.length) return; closeModals(); BR = {i:0, v0:Object.fromEntries(state.arrays.map(a => [a.id, !!a.hidden])), c0:[map.getCenter(), map.getZoom()], ptr:0, mag:null};
try { if (typeof zenSet === 'function') zenSet(true); } catch(e){} try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch(e){}
let bar = $('shBr'); if (!bar){ bar = document.createElement('div'); bar.id = 'shBr'; bar.className = 'glass'; document.body.appendChild(bar); } brShow(); }
function brShow(){ const s = S.steps[BR.i], bar = $('shBr'); state.arrays.forEach(a => { if (!isMk(a)) a.hidden = !s.lay.includes(a.id); }); renderMarkers(); map.setView(s.c, s.z);
bar.innerHTML = `<div class="row"><button class="ghost" id="brPv"${BR.i ? '' : ' disabled'}>◀</button><div class="brT"><b>${BR.i + 1}/${S.steps.length}. ${E(s.nm)}</b>${s.note ? `<small>${E(s.note)}</small>` : ''}</div><button class="ghost" id="brNx"${BR.i < S.steps.length - 1 ? '' : ' disabled'}>▶</button><button class="ghost${BR.ptr ? ' on' : ''}" id="brPt">Указка</button><button class="ghost${BR.mag ? ' on' : ''}" id="brMg">Лупа</button><button class="ghost" id="brX">✕</button></div>`;
$('brPv').onclick = () => { BR.i--; brShow(); }; $('brNx').onclick = () => { BR.i++; brShow(); }; $('brX').onclick = brEnd; $('brPt').onclick = () => { BR.ptr = !BR.ptr; brPtr(); brShow(); };
$('brMg').onclick = () => { if (BR.mag){ map.setView(BR.mag[0], BR.mag[1]); BR.mag = null; brShow(); return; } toast('Коснитесь места, которое увеличить'); const ov = brOv(); ov.onpointerdown = e => { const ll = map.mouseEventToLatLng(e); BR.mag = [map.getCenter(), map.getZoom()]; ov.remove(); map.setView(ll, Math.min(map.getMaxZoom ? map.getMaxZoom() : 19, map.getZoom() + 2)); brShow(); }; }; }
const brOv = () => { let ov = $('shBrOv'); if (!ov){ ov = document.createElement('div'); ov.id = 'shBrOv'; document.body.appendChild(ov); } return ov; };
function brPtr(){ const old = $('shBrOv'); if (old) old.remove(); if (!BR || !BR.ptr) return; const ov = brOv(), dot = document.createElement('div'); dot.className = 'shDot'; ov.appendChild(dot); let dn = 0;
const mv = e => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }; ov.onpointerdown = e => { dn = 1; dot.classList.add('on'); mv(e); try { ov.setPointerCapture(e.pointerId); } catch(_){} }; ov.onpointermove = e => { if (dn) mv(e); }; ov.onpointerup = ov.onpointercancel = () => { dn = 0; setTimeout(() => { if (!dn) dot.classList.remove('on'); }, 700); }; }
function brEnd(){ if (!BR) return; state.arrays.forEach(a => { if (a.id in BR.v0) a.hidden = BR.v0[a.id]; }); renderMarkers(); map.setView(BR.c0[0], BR.c0[1]); BR = null; const ov = $('shBrOv'); if (ov) ov.remove(); const bar = $('shBr'); if (bar) bar.remove();
try { if (typeof zenSet === 'function') zenSet(false); } catch(e){} try { document.fullscreenElement && document.exitFullscreen(); } catch(e){} persist(); }

// ===== рубежи, разграничительные линии и полосы =====
const LK = {rb:['Рубеж', 'line', 'dash'], rz:['Разграничительная линия', 'line', 'dashdot'], pl:['Полоса (район)', 'poly', 'long']}; const tmpL = L.layerGroup().addTo(map);
function lnLayer(){ return (window.actLayer && actLayer() && actLayer().shapes ? actLayer() : null) || state.arrays.find(a => a.lnL) || newLayer('Рубежи и полосы', 'shapes', '#8e4fd6', {lnL:1}); }
function lnDraw(o){ closeModals(); const pts = []; const upd = () => { tmpL.clearLayers(); if (pts.length) (o.k === 'pl' && pts.length > 2 ? L.polygon(pts, {color:o.c, weight:3, dashArray:'8 5', fillOpacity:.08}) : L.polyline(pts, {color:o.c, weight:3, dashArray:'8 5'})).addTo(tmpL); pts.forEach(p => L.circleMarker(p, {radius:4, color:o.c}).addTo(tmpL));
floatBarX(`<span>${LK[o.k][0]}: точек ${pts.length} — касайтесь карты</span><button class="ghost" id="lnU">↶</button><button class="primary" id="lnOk">Готово</button><button class="ghost" id="lnX">Отмена</button>`);
$('lnU').onclick = () => { pts.pop(); upd(); }; $('lnX').onclick = end; $('lnOk').onclick = fin; };
const end = () => { window.mapTapHook = null; tmpL.clearLayers(); floatBarX(''); };
const fin = () => { const need = o.k === 'pl' ? 3 : 2; if (pts.length < need){ toast(`Нужно точек: ${need}`); return; } const a = lnLayer(); if (!a.shapes) a.shapes = []; const lbl = [o.nm, o.tm, o.who].filter(Boolean).join(' · ') || LK[o.k][0];
a.shapes.push({type:LK[o.k][1], pts:pts.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]), color:o.c, op:o.k === 'pl' ? .07 : .2, sw:3, dash:LK[o.k][2], name:lbl, tp:{t:lbl, s:14, c:o.c}, ln:o.k, lnD:{nm:o.nm, tm:o.tm, who:o.who}, t:now()});
S.log.push({t:now(), k:'m', au:me(), x:`${LK[o.k][0]} «${lbl}» нанесён(а)`}); end(); persistNow(); renderMarkers(); toast(`${LK[o.k][0]} нанесён(а) в слой «${a.name}»`); };
window.mapTapHook = ll => { pts.push([ll.lat, ll.lng]); upd(); }; upd(); }
P.lines = b => { b.innerHTML = `<label class="f">Что наносим<select id="lnK">${Object.entries(LK).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label><div class="duo"><label class="f">Название<input id="lnN" placeholder="Рубеж «Береза»"></label><label class="f">Время<input id="lnT" placeholder="Ч+2:00"></label></div><div class="duo"><label class="f">Кто отвечает<input id="lnW" placeholder="1 мсб"></label><label class="f">Цвет<select id="lnC"><option value="#8e4fd6">Фиолетовый</option><option value="#111111">Чёрный</option><option value="#e2533f">Красный</option><option value="#2f7cf6">Синий</option><option value="#ff7a1a">Оранжевый</option></select></label></div><div class="row"><button class="primary" id="lnD">Нарисовать на карте</button></div><div class="flabel">Нанесённые</div><div id="lnL" class="shList"></div>`;
$('lnD').onclick = () => lnDraw({k:$('lnK').value, nm:$('lnN').value.trim(), tm:$('lnT').value.trim(), who:$('lnW').value.trim(), c:$('lnC').value});
const L1 = []; state.arrays.forEach(a => (a.shapes || []).forEach(s => { if (s.ln) L1.push({a, s}); }));
$('lnL').innerHTML = L1.map((x, k) => `<div class="shRow"><div>${E(x.s.name || '')}</div><small>${LK[x.s.ln] ? LK[x.s.ln][0] : ''} · ${E(x.a.name)}${x.s.type === 'line' ? ' · ' + km(shapeGeo(x.s).len || 0) : ''}</small><span><button class="ghost sm" data-g="${k}">◎</button>${x.s.type === 'poly' ? `<button class="ghost sm" data-in="${k}">Что внутри</button>` : ''}</span></div>`).join('') || '<div class="empty">Пока ничего</div>';
on(b, '[data-g]', 'click', x => { const s = L1[+x.dataset.g].s; closeModals(); map.fitBounds(L.latLngBounds(s.pts).pad(.2)); });
on(b, '[data-in]', 'click', x => { const s = L1[+x.dataset.in].s, o = []; vis().forEach(a => (a.points || []).forEach((p, i) => { if (inPoly([p.lat, p.lng], s.pts)) o.push(`${labelOf(a, i)} — ${symN(p)} (${a.name})`); }));
go('txt', {title:'В полосе: ' + (s.name || ''), back:'lines', t:o.length ? o.join('\n') : 'Точек внутри нет'}); }); };
P.txt = (b, ar) => { b.innerHTML = `<textarea rows="14" style="width:100%" readonly>${E(ar.t)}</textarea><div class="row"><button class="ghost" id="txC">Копировать</button></div>`; $('txC').onclick = () => copy(ar.t); };

// ===== ориентиры =====
const oriLayer = () => state.arrays.find(a => a.ori) || newLayer('Ориентиры', 'pts', '#ffd400', {ori:1});
const npLL = () => S.np ? {lat:S.np[0], lng:S.np[1]} : null;
function oriRows(){ const a = state.arrays.find(x => x.ori), np = npLL(); if (!a || !np) return []; return a.points.map((p, i) => { const az = brg(np, p); return {n:i + 1, nm:p.name || labelOf(a, i), d:distM(np, p), az, p}; }); }
P.ori = b => { const np = npLL(), R = oriRows(); b.innerHTML = `<p class="status">НП: ${np ? skS(np.lat, np.lng) : 'не задан'}. Ориентиры — точки слоя «Ориентиры», нумеруются по порядку; дальность и азимут — от НП.</p>
<div class="row"><button class="ghost" id="orN">НП — центр карты</button>${typeof GPS !== 'undefined' && GPS.pos ? '<button class="ghost" id="orG">НП — по GPS</button>' : ''}<button class="primary" id="orA">＋ Ориентир в центре карты</button></div>
<table class="shTb"><tr><th>№</th><th>Ориентир</th><th>Дальность</th><th>Азимут</th><th>д.у.</th><th></th></tr>${R.map((r, k) => `<tr><td>${r.n}</td><td>${E(r.nm)}</td><td>${km(r.d)}</td><td>${r.az.toFixed(0)}°</td><td>${du(r.az)}</td><td><button class="ghost sm" data-d="${k}">✕</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Нет ориентиров или не задан НП</td></tr>'}</table>
<div class="row"><button class="ghost" id="orC">Копировать</button><button class="ghost" id="orP"${R.length ? '' : ' disabled'}>Карточка JPEG</button></div>`;
$('orN').onclick = () => { const c = map.getCenter(); S.np = [+c.lat.toFixed(6), +c.lng.toFixed(6)]; save(); go('ori'); }; if ($('orG')) $('orG').onclick = () => { const g = GPS.pos; S.np = [g.lat ?? g[0], g.lng ?? g[1]]; save(); go('ori'); };
$('orA').onclick = () => { const a = oriLayer(), c = map.getCenter(), nm = prompt('Ориентир (например, «отд. дерево»)', ''); if (nm === null) return; a.hidden = false; a.points.push({lat:+c.lat.toFixed(6), lng:+c.lng.toFixed(6), name:`Ор. ${a.points.length + 1}${nm ? ' — ' + nm : ''}`}); persistNow(); renderMarkers(); go('ori'); };
on(b, '[data-d]', 'click', x => { const a = oriLayer(); a.points.splice(+x.dataset.d, 1); persistNow(); renderMarkers(); go('ori'); });
$('orC').onclick = () => copy('КАРТОЧКА ОРИЕНТИРОВ\nНП: ' + (np ? skS(np.lat, np.lng) : '') + '\n' + R.map(r => `${r.n}. ${r.nm} — ${km(r.d)}, ${r.az.toFixed(0)}° (${du(r.az)})`).join('\n')); $('orP').onclick = () => oriCard(R); };
function oriCard(R){ const W = 1240, H = 1754, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#111'; g.textAlign = 'center';
g.font = '700 46px sans-serif'; g.fillText('КАРТОЧКА ОРИЕНТИРОВ', W / 2, 80); const np = npLL(); g.font = '500 26px sans-serif'; g.fillText('НП: ' + skS(np.lat, np.lng) + ' · ' + dt(now()), W / 2, 125);
const cx = W / 2, cy = 640, Rm = Math.max(...R.map(r => r.d)) || 1, Rp = 440; g.strokeStyle = '#999'; g.lineWidth = 1.5; [.25, .5, .75, 1].forEach(f => { g.beginPath(); g.arc(cx, cy, Rp * f, 0, 7); g.stroke(); g.fillStyle = '#777'; g.font = '20px sans-serif'; g.fillText(km(Rm * f), cx + 4, cy - Rp * f - 6); });
for (let a = 0; a < 360; a += 30){ const r = a * Math.PI / 180; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(r) * Rp, cy - Math.cos(r) * Rp); g.stroke(); g.fillStyle = '#555'; g.fillText(du(a), cx + Math.sin(r) * (Rp + 28), cy - Math.cos(r) * (Rp + 28) + 7); }
g.fillStyle = '#e2533f'; g.beginPath(); g.arc(cx, cy, 9, 0, 7); g.fill(); g.font = '700 22px sans-serif'; g.fillText('НП', cx, cy + 34);
R.forEach(r => { const a = r.az * Math.PI / 180, q = r.d / Rm * Rp, x = cx + Math.sin(a) * q, y = cy - Math.cos(a) * q; g.fillStyle = '#2f5fd0'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.font = '700 24px sans-serif'; g.fillText(String(r.n), x, y - 14); });
let y = 1160; g.textAlign = 'left'; g.font = '700 26px sans-serif'; g.fillStyle = '#111'; [['№', 80], ['Ориентир', 140], ['Дальность', 700], ['Азимут', 880], ['д.у.', 1030]].forEach(([t, x]) => g.fillText(t, x, y)); g.font = '500 25px sans-serif';
R.slice(0, 16).forEach(r => { y += 34; [[String(r.n), 80], [r.nm.slice(0, 40), 140], [km(r.d), 700], [r.az.toFixed(0) + '°', 880], [du(r.az), 1030]].forEach(([t, x]) => g.fillText(t, x, y)); });
cv.toBlob(bl => deliverFile(bl, `СКАТ_ориентиры_${stamp()}.jpg`, 'Карточка ориентиров готова'), 'image/jpeg', .92); }

// ===== кодированная сетка =====
const SN = [[1, 2, 3], [8, 9, 4], [7, 6, 5]]; const cgL = L.layerGroup().addTo(map);
function cgSK2(X, Y){ const c = S.cg; const dx = c.x - X, dy = Y - c.y, r = Math.floor(dx / c.s), q = Math.floor(dy / c.s); if (r < 0 || q < 0 || r >= c.r || q >= c.c) return null;
const r3 = Math.min(2, Math.floor((dx - r * c.s) / (c.s / 3))), q3 = Math.min(2, Math.floor((dy - q * c.s) / (c.s / 3))); return {n:r * c.c + q + 1, u:SN[r3][q3]}; }
function cgLL(n, u){ const c = S.cg; n = +n; if (!(n >= 1 && n <= c.r * c.c)) return null; const r = Math.floor((n - 1) / c.c), q = (n - 1) % c.c; let X = c.x - r * c.s, Y = c.y + q * c.s;
if (u){ let r3 = 0, q3 = 0; SN.forEach((row, i) => row.forEach((v, j) => { if (v === +u){ r3 = i; q3 = j; } })); X -= (r3 + .5) * c.s / 3; Y += (q3 + .5) * c.s / 3; } else { X -= c.s / 2; Y += c.s / 2; } return GEO.fromSK(X, Y, c.z); }
function cgDraw(){ cgL.clearLayers(); const c = S.cg; if (!c || !c.on) return; const ll = (X, Y) => GEO.fromSK(X, Y, c.z), px = map.latLngToContainerPoint(ll(c.x, c.y)).distanceTo(map.latLngToContainerPoint(ll(c.x, c.y + c.s)));
for (let r = 0; r <= c.r; r++) L.polyline([ll(c.x - r * c.s, c.y), ll(c.x - r * c.s, c.y + c.c * c.s)], {color:'#d0158a', weight:1.6, interactive:false}).addTo(cgL);
for (let q = 0; q <= c.c; q++) L.polyline([ll(c.x, c.y + q * c.s), ll(c.x - c.r * c.s, c.y + q * c.s)], {color:'#d0158a', weight:1.6, interactive:false}).addTo(cgL);
if (px < 18) return; const B = map.getBounds().pad(.1);
for (let r = 0; r < c.r; r++) for (let q = 0; q < c.c; q++){ const X0 = c.x - r * c.s, Y0 = c.y + q * c.s, cc = ll(X0 - c.s / 2, Y0 + c.s / 2); if (!B.contains(cc)) continue;
L.marker(cc, {interactive:false, icon:L.divIcon({className:'shCgN', iconSize:[0, 0], html:`<div style="font-size:${Math.min(28, Math.max(11, px / 4))}px">${r * c.c + q + 1}</div>`})}).addTo(cgL);
if (px > 170){ for (let k = 1; k < 3; k++){ L.polyline([ll(X0 - k * c.s / 3, Y0), ll(X0 - k * c.s / 3, Y0 + c.s)], {color:'#d0158a', weight:.8, opacity:.6, interactive:false}).addTo(cgL); L.polyline([ll(X0, Y0 + k * c.s / 3), ll(X0 - c.s, Y0 + k * c.s / 3)], {color:'#d0158a', weight:.8, opacity:.6, interactive:false}).addTo(cgL); }
SN.forEach((row, i) => row.forEach((v, j) => { if (v === 9) return; L.marker(ll(X0 - (i + .25) * c.s / 3, Y0 + (j + .2) * c.s / 3), {interactive:false, icon:L.divIcon({className:'shCgU', iconSize:[0, 0], html:`<div>${v}</div>`})}).addTo(cgL); })); } } }
map.on('moveend zoomend', () => { try { cgDraw(); } catch(e){} }); setTimeout(() => { try { cgDraw(); } catch(e){} }, 600);
P.code = b => { const c = S.cg; const mk = map.getCenter(), here = c ? cgSK2(...(s => [s.x, s.y])(GEO.toSK(mk.lat, mk.lng, c.z))) : null;
b.innerHTML = `<p class="status">Своя нумерованная сетка для передачи места голосом: «квадрат 23, по улитке 7» (улитка: 1 2 3 / 8 9 4 / 7 6 5). Начало — левый верхний угол.</p>
${c ? `<div class="shAl"><span>Центр карты: ${here ? `<b>кв. ${here.n}, улитка ${here.u}</b>` : 'вне сетки'}</span></div><div class="row"><input id="cgQ" placeholder="23-7 или 23" style="flex:1"><button class="primary" id="cgGo">Показать</button></div>
<label class="f" style="display:flex;align-items:center;gap:10px"><input type="checkbox" id="cgOn" ${c.on ? 'checked' : ''} style="width:22px;min-height:22px;margin:0"> Показывать на карте</label><p class="status">${E(c.nm || '')} · квадрат ${c.s} м · ${c.r}×${c.c}</p>` : ''}
<div class="flabel">${c ? 'Заново' : 'Создать'}</div><div class="duo"><label class="f">Сторона квадрата, м<input id="cgS" inputmode="numeric" value="${c ? c.s : 1000}"></label><label class="f">Название<input id="cgN" value="${E(c ? c.nm || '' : 'Сетка 1')}"></label></div>
<div class="duo"><label class="f">Строк<input id="cgR" inputmode="numeric" value="${c ? c.r : ''}" placeholder="авто"></label><label class="f">Столбцов<input id="cgC" inputmode="numeric" value="${c ? c.c : ''}" placeholder="авто"></label></div><div class="row"><button class="ghost" id="cgM">По видимой части карты</button>${c ? '<button class="ghost" id="cgD">Удалить сетку</button>' : ''}</div>`;
if (c){ $('cgOn').onchange = e => { c.on = e.target.checked; save(); cgDraw(); }; $('cgGo').onclick = () => { const [n, u] = $('cgQ').value.split(/[^0-9]+/).filter(Boolean); const p = cgLL(n, u); if (!p){ toast('Нет такого квадрата'); return; } closeModals(); map.setView(p, Math.max(map.getZoom(), 15)); tmpL.clearLayers(); L.circleMarker(p, {radius:14, color:'#d0158a', weight:3}).addTo(tmpL); setTimeout(() => tmpL.clearLayers(), 6000); };
$('cgD').onclick = () => askConfirm('Удалить кодированную сетку?', 'Удалить', () => { S.cg = null; save(); cgDraw(); go('code'); }); }
$('cgM').onclick = () => { const B = map.getBounds(), nw = L.latLng(B.getNorth(), B.getWest()), s0 = Math.max(100, +$('cgS').value || 1000), z = GEO.toSK(map.getCenter().lat, map.getCenter().lng).zone, t = GEO.toSK(nw.lat, nw.lng, z);
const se = GEO.toSK(B.getSouth(), B.getEast(), z), X = Math.ceil(t.x / s0) * s0, Y = Math.floor(t.y / s0) * s0, r = Math.max(1, Math.min(60, Math.ceil((X - se.x) / s0))), cc = Math.max(1, Math.min(60, Math.ceil((se.y - Y) / s0)));
S.cg = {on:1, x:X, y:Y, s:s0, r:Math.min(60, +$('cgR').value || r), c:Math.min(60, +$('cgC').value || cc), z, nm:$('cgN').value.trim()}; save(); cgDraw(); go('code'); }; };

// ===== разграфка и номенклатура листов (по СК-42, эллипсоид Красовского) =====
const nomL = L.layerGroup().addTo(map); const ROWS = 'ABCDEFGHIJKLMNOPQRSTUV', RU50 = ['А', 'Б', 'В', 'Г'], RU25 = ['а', 'б', 'в', 'г'];
const NS = {100:[1 / 3, .5], 50:[1 / 6, .25], 25:[1 / 12, .125]};
function nomOf(B, Lg, sc){ const ri = Math.floor(B / 4), ci = Math.floor(Lg / 6), top = (ri + 1) * 4, left = ci * 6; if (ri < 0 || ri >= ROWS.length) return '';
const r = Math.min(11, Math.floor((top - B) / (1 / 3))), q = Math.min(11, Math.floor((Lg - left) / .5)); let n = `${ROWS[ri]}-${ci + 31}-${r * 12 + q + 1}`; if (sc === 100) return n;
const t1 = top - r / 3, l1 = left + q * .5, r2 = Math.min(1, Math.floor((t1 - B) / (1 / 6))), q2 = Math.min(1, Math.floor((Lg - l1) / .25)); n += '-' + RU50[r2 * 2 + q2]; if (sc === 50) return n;
const t2 = t1 - r2 / 6, l2 = l1 + q2 * .25, r3 = Math.min(1, Math.floor((t2 - B) / (1 / 12))), q3 = Math.min(1, Math.floor((Lg - l2) / .125)); return n + '-' + RU25[r3 * 2 + q3]; }
const k2w = (B, Lg) => GEO.krsToWgs ? GEO.krsToWgs(B, Lg) : [B, Lg]; const w2k = (la, lo) => GEO.wgsToKrs ? GEO.wgsToKrs(la, lo) : [la, lo];
function nomDraw(){ nomL.clearLayers(); const sc = S.nom; if (!sc || !NS[sc]) return; const [dB, dL] = NS[sc], Bd = map.getBounds(), [s0, w0] = w2k(Bd.getSouth(), Bd.getWest()), [n0, e0] = w2k(Bd.getNorth(), Bd.getEast());
const b0 = Math.floor(s0 / dB) * dB, b1 = Math.ceil(n0 / dB) * dB, l0 = Math.floor(w0 / dL) * dL, l1 = Math.ceil(e0 / dL) * dL; if ((b1 - b0) / dB * (l1 - l0) / dL > 300){ return; }
const st = {color:'#0b6e4f', weight:1.8, opacity:.85, interactive:false};
for (let B = b0; B <= b1 + 1e-9; B += dB){ const P0 = []; for (let Lg = l0; Lg <= l1 + 1e-9; Lg += dL / 4) P0.push(k2w(B, Lg)); L.polyline(P0, st).addTo(nomL); }
for (let Lg = l0; Lg <= l1 + 1e-9; Lg += dL){ const P0 = []; for (let B = b0; B <= b1 + 1e-9; B += dB / 4) P0.push(k2w(B, Lg)); L.polyline(P0, st).addTo(nomL); }
for (let B = b0; B < b1 - 1e-9; B += dB) for (let Lg = l0; Lg < l1 - 1e-9; Lg += dL) L.marker(k2w(B + dB / 2, Lg + dL / 2), {interactive:false, icon:L.divIcon({className:'shNom', iconSize:[0, 0], html:`<div>${nomOf(B + dB / 2, Lg + dL / 2, sc)}</div>`})}).addTo(nomL); }
map.on('moveend zoomend', () => { try { nomDraw(); } catch(e){} }); setTimeout(() => { try { nomDraw(); } catch(e){} }, 700);
P.nom = b => { const c = map.getCenter(), [B, Lg] = w2k(c.lat, c.lng); b.innerHTML = `<p class="status">Листы топокарт по международной разграфке (СК-42). В центре карты:</p><table class="shTb"><tr><td>1:100 000</td><td><b>${nomOf(B, Lg, 100)}</b></td></tr><tr><td>1:50 000</td><td><b>${nomOf(B, Lg, 50)}</b></td></tr><tr><td>1:25 000</td><td><b>${nomOf(B, Lg, 25)}</b></td></tr></table>
<label class="f">Показывать на карте<select id="nmS">${[[0, 'нет'], [100, 'листы 1:100 000'], [50, 'листы 1:50 000'], [25, 'листы 1:25 000']].map(([v, t]) => `<option value="${v}"${S.nom === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label><p class="status">Если листов в кадре слишком много, сетка не рисуется — приблизьте карту.</p>`;
$('nmS').onchange = e => { S.nom = +e.target.value; save(); nomDraw(); }; };

// ===== две карты рядом =====
let M2 = null;
function twoOn(k){ twoOff(); const def = LAYERS[k]; if (!def) return; const r = map.getContainer().getBoundingClientRect(), d = document.createElement('div'); d.id = 'shMap2'; Object.assign(d.style, {left:(r.left + r.width / 2) + 'px', top:r.top + 'px', width:r.width / 2 + 'px', height:r.height + 'px'}); document.body.appendChild(d);
const m2 = L.map(d, {crs:crsOf(k), zoomControl:false, attributionControl:false, rotate:false, inertia:false}); def.urls.forEach(u => (typeof IdbTile === 'function' ? new IdbTile(u, {maxNativeZoom:def.max, maxZoom:18, subdomains:'abc'}) : L.tileLayer(u, {maxNativeZoom:def.max, maxZoom:18, subdomains:'abc'})).addTo(m2));
const ln = document.createElement('div'); ln.id = 'shMap2L'; ln.innerHTML = `<span>${E(LAYERS[state.layer] ? LAYERS[state.layer].short || '' : '')}</span><span>${E(def.short || def.name)}</span>`; document.body.appendChild(ln); Object.assign(ln.style, {left:(r.left + r.width / 2 - 1) + 'px', top:r.top + 'px', height:r.height + 'px'});
let lock = 0; const fromMain = () => { if (lock) return; lock = 1; const s = map.getSize(); m2.setView(map.containerPointToLatLng([s.x / 4, s.y / 2]), map.getZoom(), {animate:false}); lock = 0; };
const fromM2 = () => { if (lock) return; lock = 1; if (Math.abs(m2.getZoom() - map.getZoom()) > .01) map.setZoom(m2.getZoom(), {animate:false}); const s = map.getSize(), p = map.latLngToContainerPoint(m2.getCenter()); map.panBy([p.x - s.x / 4, p.y - s.y / 2], {animate:false}); lock = 0; };
map.on('move zoomend', fromMain); m2.on('moveend zoomend', fromM2); M2 = {m2, d, ln, fromMain}; fromMain();
floatBarX(`<span>Две карты: слева — рабочая, справа — ${E(def.name)}</span><button class="ghost" id="twX">Закрыть</button>`); $('twX').onclick = twoOff; }
function twoOff(){ if (!M2) return; map.off('move zoomend', M2.fromMain); M2.m2.remove(); M2.d.remove(); M2.ln.remove(); M2 = null; floatBarX(''); }
P.two = b => { b.innerHTML = `<p class="status">Экран делится пополам: слева — рабочая карта со всеми слоями, справа — другая подложка того же места. Двигаются вместе. Для сравнения обстановки по времени — «Снимки обстановки».</p><label class="f">Справа<select id="twK">${Object.entries(LAYERS).filter(([k]) => k !== state.layer).map(([k, v]) => `<option value="${k}">${E(v.name || k)}</option>`).join('')}</select></label><div class="row">${M2 ? '<button class="ghost" id="twO">Выключить</button>' : ''}<button class="primary" id="twG">Включить</button></div>`;
$('twG').onclick = () => { closeModals(); twoOn($('twK').value); }; if ($('twO')) $('twO').onclick = () => { twoOff(); go('two'); }; };

// ===== шаблоны карт =====
const TP0 = [{n:'Рабочая карта НШ', L:[['Свои войска', 'pts', '#2f7cf6'], ['Противник', 'pts', '#e2533f'], ['Пункты управления', 'pts', '#2f7cf6'], ['Разграничительные линии', 'shapes', '#111111'], ['Рубежи', 'shapes', '#8e4fd6'], ['Пометки', 'shapes', '#ff7a1a']]},
{n:'Карта решения', L:[['Противник', 'pts', '#e2533f'], ['Замысел', 'shapes', '#e2533f'], ['Этап 1', 'shapes', '#2f7cf6'], ['Этап 2', 'shapes', '#2f7cf6'], ['Этап 3', 'shapes', '#2f7cf6'], ['Рубежи', 'shapes', '#8e4fd6']]},
{n:'Карта огня', L:[['Цели', 'pts', '#e2533f'], ['Огневые средства', 'pts', '#2f7cf6'], ['Рубежи и зоны', 'shapes', '#ff7a1a'], ['Ориентиры', 'pts', '#ffd400', 1]]}];
function tplMake(t){ t.L.forEach(([n, k, c, ori]) => newLayer(n, k, c, ori ? {ori:1} : null)); if (t.base && LAYERS[t.base]) try { setLayer(t.base); state.layer = t.base; } catch(e){} persistNow(); renderMarkers(); try { renderLayers(); } catch(e){} S.log.push({t:now(), k:'m', au:me(), x:`Слои по шаблону «${t.n}»`}); save(); toast(`Добавлено слоёв: ${t.L.length}`); }
P.tpl = b => { const all = TP0.map(t => ({...t, bi:1})).concat(S.tpls); b.innerHTML = `<p class="status">Шаблон — набор пустых слоёв (и подложка). Применение добавляет слои к текущим, ничего не удаляя.</p><div class="shList">${all.map((t, i) => `<div class="shRow"><div><b>${E(t.n)}</b></div><small>${t.L.map(l => E(l[0])).join(', ')}</small><span><button class="primary sm" data-u="${i}">Создать</button>${t.bi ? '' : `<button class="ghost sm" data-d="${i - TP0.length}">✕</button>`}</span></div>`).join('')}</div><div class="row"><button class="ghost" id="tpS">Сохранить текущие слои как шаблон</button></div>`;
on(b, '[data-u]', 'click', x => { const t = all[+x.dataset.u]; askConfirm(`Создать слои по шаблону «${t.n}»?`, 'Создать', () => { tplMake(t); closeModals(); }); }); on(b, '[data-d]', 'click', x => { S.tpls.splice(+x.dataset.d, 1); save(); go('tpl'); });
$('tpS').onclick = () => { const n = prompt('Название шаблона', 'Моя карта'); if (!n) return; S.tpls.push({n, base:state.layer, L:state.arrays.filter(a => !isMk(a) && !a.trk).map(a => [a.name, a.kind, a.style.color, a.ori ? 1 : 0])}); save(); go('tpl'); }; };

// ===== расчёт марша =====
function routes(){ const o = []; state.arrays.forEach(a => { if (isMk(a)) return; if (a.kind === 'route' && a.points.length > 1) o.push({n:`Маршрут «${a.name}»`, P:a.points.map(p => [p.lat, p.lng]), nm:a.points.map((p, i) => labelOf(a, i))});
(a.shapes || []).forEach(s => { if (s.type === 'line' && (s.pts || []).length > 1) o.push({n:`Линия «${s.name || a.name}»`, P:s.pts.map(q => [q[0] ?? q.lat, q[1] ?? q.lng]), nm:null}); }); }); return o; }
function march(R, v, t0, hE, hM, rk){ const out = [], seg = []; let D = 0; for (let i = 0; i < R.P.length; i++){ if (i) D += distM({lat:R.P[i - 1][0], lng:R.P[i - 1][1]}, {lat:R.P[i][0], lng:R.P[i][1]}); seg.push(D); }
const tAt = d => { const mv = d / 1000 / v * 3600000, nh = hE > 0 ? Math.floor(mv / (hE * 3600000) - 1e-9) : 0; return t0 + mv + Math.max(0, nh) * hM * 60000; };
const posAt = d => { for (let i = 1; i < seg.length; i++) if (seg[i] >= d){ const f = (d - seg[i - 1]) / ((seg[i] - seg[i - 1]) || 1); return [R.P[i - 1][0] + (R.P[i][0] - R.P[i - 1][0]) * f, R.P[i - 1][1] + (R.P[i][1] - R.P[i - 1][1]) * f]; } return R.P[R.P.length - 1]; };
R.P.forEach((p, i) => out.push({k:i === 0 ? 'Исходный пункт' : i === R.P.length - 1 ? 'Конечный пункт' : (R.nm ? R.nm[i] : 'КП ' + i), d:seg[i], t:tAt(seg[i]), p}));
if (rk > 0) for (let d = rk * 1000, n = 1; d < D; d += rk * 1000, n++) out.push({k:'Рубеж регулирования ' + n, d, t:tAt(d), p:posAt(d), rr:1});
if (hE > 0){ const mvT = D / 1000 / v; for (let h = hE, n = 1; h < mvT; h += hE, n++){ const d = h * v * 1000; out.push({k:`Привал ${n} (${hM} мин)`, d, t:tAt(d - 1), p:posAt(d), hl:1}); } }
out.sort((p, q) => p.d - q.d || (p.hl ? 1 : -1)); return {out, D, T:tAt(D)}; }
P.march = b => { const RS = routes(); b.innerHTML = RS.length ? `<label class="f">Маршрут<select id="mrR">${RS.map((r, i) => `<option value="${i}">${E(r.n)}</option>`).join('')}</select></label><div class="duo"><label class="f">Средняя скорость, км/ч<input id="mrV" inputmode="decimal" value="${lsGet('skat_mr_v', 25)}"></label><label class="f">Начало<input type="datetime-local" id="mrT" value="${dIn(now())}"></label></div>
<div class="duo"><label class="f">Привал через, ч (0 — нет)<input id="mrH" inputmode="decimal" value="3"></label><label class="f">Привал, мин<input id="mrM" inputmode="numeric" value="30"></label></div><label class="f">Рубежи регулирования через, км (0 — нет)<input id="mrK" inputmode="decimal" value="0"></label>
<div class="row"><button class="primary" id="mrG">Рассчитать</button></div><div id="mrO"></div>` : '<div class="empty">Нет маршрутов и линий. Нарисуйте маршрут (слой-маршрут) или линию.</div>'; if (!RS.length) return;
let res = null; const calc = () => { const v = +$('mrV').value.replace(',', '.') || 25; lsSet('skat_mr_v', v); const R = RS[+$('mrR').value]; res = march(R, v, dOut($('mrT').value) || now(), +$('mrH').value.replace(',', '.') || 0, +$('mrM').value || 0, +$('mrK').value.replace(',', '.') || 0);
$('mrO').innerHTML = `<p class="status">Длина ${km(res.D)} · в пути ${Math.floor((res.T - (dOut($('mrT').value) || now())) / 3600000)} ч ${Math.round(((res.T - (dOut($('mrT').value) || now())) % 3600000) / 60000)} мин · прибытие ${dt(res.T)}</p><table class="shTb"><tr><th>Пункт</th><th>от начала</th><th>время</th></tr>${res.out.map(o => `<tr class="${o.hl ? 'mid' : o.rr ? 'ok' : ''}"><td>${E(o.k)}</td><td>${km(o.d)}</td><td>${hm(o.t)}</td></tr>`).join('')}</table><div class="row"><button class="ghost" id="mrC">Копировать</button><button class="ghost" id="mrN">Нанести время на карту</button></div>`;
$('mrC').onclick = () => copy(`РАСЧЁТ МАРША: ${R.n}, ${km(res.D)}, ${v} км/ч\n` + res.out.map(o => `${hm(o.t)} — ${o.k} (${km(o.d)})`).join('\n'));
$('mrN').onclick = () => { const a = newLayer('Марш ' + hm(res.out[0].t), 'shapes', '#2f7cf6'); res.out.forEach(o => a.texts.push({t:`${o.rr ? 'РР ' : o.hl ? 'Привал ' : ''}${hm(o.t)}`, lat:+o.p[0].toFixed(6), lng:+o.p[1].toFixed(6), s:13, c:o.hl ? '#b45309' : '#1d4ed8', f:'Roboto Condensed', b:1, al:'center'})); persistNow(); renderMarkers(); toast('Время нанесено отдельным слоем'); }; };
$('mrG').onclick = calc; };

// ===== калькулятор =====
P.calc = b => { b.innerHTML = `<div class="flabel">Время · расстояние · скорость (оставьте пустым то, что найти)</div><div class="duo"><label class="f">Расстояние, км<input id="ccD" inputmode="decimal"></label><label class="f">Скорость, км/ч<input id="ccV" inputmode="decimal"></label></div><div class="duo"><label class="f">Время, ч:мм<input id="ccT"></label><span class="row"><button class="primary" id="ccG">=</button></span></div>
<div class="flabel">Расход горючего на марш</div><div class="duo"><label class="f">Путь, км<input id="cfD" inputmode="decimal"></label><label class="f">Норма, л/100 км<input id="cfN" inputmode="decimal" value="40"></label></div><div class="duo"><label class="f">Машин<input id="cfK" inputmode="numeric" value="1"></label><label class="f">Запас, %<input id="cfR" inputmode="numeric" value="10"></label></div><p class="status" id="cfO"></p>
<div class="flabel">Углы</div><div class="duo"><label class="f">Градусы<input id="caG" inputmode="decimal"></label><label class="f">Деления угломера (12-34)<input id="caU"></label></div>
<div class="flabel">Площадь и периметр фигуры</div><select id="csH" style="width:100%"><option value="">— выберите фигуру —</option>${state.arrays.flatMap(a => (a.shapes || []).map((s, i) => s.type !== 'line' ? `<option value="${a.id}|${i}">${E(s.name || SHAPE_NAMES[s.type] || 'Фигура')} — ${E(a.name)}</option>` : '')).join('')}</select><p class="status" id="csO"></p>`;
const n = id => +String($(id).value).replace(',', '.'); const pT = v => { const m = String(v).match(/^(\d+)(?::(\d{1,2}))?$/); return m ? +m[1] + (+(m[2] || 0)) / 60 : NaN; }, fT = h => `${Math.floor(h)}:${String(Math.round(h % 1 * 60)).padStart(2, '0')}`;
$('ccG').onclick = () => { const d = n('ccD'), v = n('ccV'), t = pT($('ccT').value); if (!$('ccT').value && d && v) $('ccT').value = fT(d / v); else if (!$('ccV').value && d && t) $('ccV').value = (d / t).toFixed(1); else if (!$('ccD').value && v && t) $('ccD').value = (v * t).toFixed(1); else toast('Заполните два поля из трёх'); };
const fuel = () => { const d = n('cfD'), q = n('cfN'), k = n('cfK') || 1, r = n('cfR') || 0; $('cfO').textContent = d && q ? `Нужно: ${Math.ceil(d * q / 100 * k * (1 + r / 100))} л (на машину ${Math.ceil(d * q / 100 * (1 + r / 100))} л)` : ''; }; ['cfD', 'cfN', 'cfK', 'cfR'].forEach(i => $(i).oninput = fuel);
$('caG').oninput = () => { const g = n('caG'); if (!isNaN(g)) $('caU').value = du(g); }; $('caU').oninput = () => { const m = $('caU').value.match(/^(\d{1,2})[-.\s]?(\d{2})$/); if (m) $('caG').value = ((+m[1] * 100 + +m[2]) * .06).toFixed(2); };
$('csH').onchange = e => { if (!e.target.value){ $('csO').textContent = ''; return; } const [id, i] = e.target.value.split('|'), s = arrById(+id).shapes[+i], g = shapeGeo(s); $('csO').textContent = g.area != null ? `Площадь ${(g.area / 1e6).toFixed(3)} км² (${(g.area / 1e4).toFixed(1)} га) · периметр ${km(g.per || 0)}` : 'Нет данных'; }; };

// ===== солнце и луна (алгоритм SunCalc) =====
const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e0 = rad * 23.4397;
const toJ = d => d / dayMs - .5 + J1970, frJ = j => (j + .5 - J1970) * dayMs, toD = d => toJ(d) - J2000;
const decl = (l, b) => Math.asin(Math.sin(b) * Math.cos(e0) + Math.cos(b) * Math.sin(e0) * Math.sin(l)), RA = (l, b) => Math.atan2(Math.sin(l) * Math.cos(e0) - Math.tan(b) * Math.sin(e0), Math.cos(l));
const sMA = d => rad * (357.5291 + .98560028 * d), eLon = M => M + rad * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
const sidT = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw, alt = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
function sunTimes(date, lat, lng){ const lw = rad * -lng, phi = rad * lat, d = toD(date), n = Math.round(d - .0009 - lw / (2 * Math.PI)), ds = .0009 + lw / (2 * Math.PI) + n, M = sMA(ds), Lx = eLon(M), dec = decl(Lx, 0), Jn = J2000 + ds + .0053 * Math.sin(M) - .0069 * Math.sin(2 * Lx);
const T = h => { const w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))); if (isNaN(w)) return [null, null]; const a = .0009 + (w + lw) / (2 * Math.PI) + n, Js = J2000 + a + .0053 * Math.sin(M) - .0069 * Math.sin(2 * Lx); return [frJ(Jn - (Js - Jn)), frJ(Js)]; };
return {noon:frJ(Jn), sun:T(-.833), civ:T(-6), nau:T(-12)}; }
function moonC(d){ const L0 = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d), l = L0 + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dt0 = 385001 - 20905 * Math.cos(M); return {ra:RA(l, b), dec:decl(l, b), dist:dt0}; }
function moonIll(date){ const d = toD(date), M = sMA(d), Ls = eLon(M), s = {ra:RA(Ls, 0), dec:decl(Ls, 0)}, m = moonC(d), sd = 149598000, phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra)), inc = Math.atan2(sd * Math.sin(phi), m.dist - sd * Math.cos(phi)), ang = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
return {f:(1 + Math.cos(inc)) / 2, ph:.5 + .5 * inc * (ang < 0 ? -1 : 1) / Math.PI}; }
function moonAlt(date, lat, lng){ const d = toD(date), c = moonC(d), H = sidT(d, rad * -lng) - c.ra; let h = alt(H, rad * lat, c.dec); h += .017 * rad / Math.tan(h + 10.26 * rad / (h + 5.10 * rad)); return h; }
function moonRS(date, lat, lng){ const t = new Date(date); t.setHours(0, 0, 0, 0); const hc = .133 * rad; let h0 = moonAlt(t, lat, lng) - hc, rise = null, set = null;
for (let i = 1; i <= 24; i += 2){ const h1 = moonAlt(+t + i * 36e5, lat, lng) - hc, h2 = moonAlt(+t + (i + 1) * 36e5, lat, lng) - hc, a = (h0 + h2) / 2 - h1, bb = (h2 - h0) / 2, xe = -bb / (2 * a), ye = (a * xe + bb) * xe + h1, dd = bb * bb - 4 * a * h1; let r = 0, x1 = 0, x2 = 0;
if (dd >= 0){ const dx = Math.sqrt(dd) / (Math.abs(a) * 2); x1 = xe - dx; x2 = xe + dx; if (Math.abs(x1) <= 1) r++; if (Math.abs(x2) <= 1) r++; if (x1 < -1) x1 = x2; }
if (r === 1){ if (h0 < 0) rise = i + x1; else set = i + x1; } else if (r === 2){ rise = i + (ye < 0 ? x2 : x1); set = i + (ye < 0 ? x1 : x2); } if (rise != null && set != null) break; h0 = h2; }
return {rise:rise != null ? +t + rise * 36e5 : null, set:set != null ? +t + set * 36e5 : null}; }
const PHN = f => ['новолуние', 'растущий серп', 'первая четверть', 'растущая луна', 'полнолуние', 'убывающая луна', 'последняя четверть', 'убывающий серп'][Math.round(f * 8) % 8];
P.astro = b => { const c = map.getCenter(); b.innerHTML = `<label class="f">Дата<input type="date" id="asD" value="${dIn(now()).slice(0, 10)}"></label><p class="status">Место — центр карты: ${skS(c.lat, c.lng)}. Время — по часам устройства.</p><div id="asO"></div>`;
const draw = () => { const d0 = new Date($('asD').value + 'T12:00'), t = sunTimes(+d0, c.lat, c.lng), mi = moonIll(+d0), mr = moonRS(+d0, c.lat, c.lng), f = x => x ? hm(x) : '—', dl = t.sun[0] && t.sun[1] ? (t.sun[1] - t.sun[0]) / 36e5 : 0;
$('asO').innerHTML = `<table class="shTb"><tr><td>Начало навигационных сумерек</td><td>${f(t.nau[0])}</td></tr><tr><td>Рассвет (гражданские сумерки)</td><td>${f(t.civ[0])}</td></tr><tr><td><b>Восход солнца</b></td><td><b>${f(t.sun[0])}</b></td></tr><tr><td>Полдень</td><td>${f(t.noon)}</td></tr><tr><td><b>Заход солнца</b></td><td><b>${f(t.sun[1])}</b></td></tr><tr><td>Конец гражданских сумерек</td><td>${f(t.civ[1])}</td></tr><tr><td>Конец навигационных сумерек</td><td>${f(t.nau[1])}</td></tr><tr><td>Светлое время</td><td>${Math.floor(dl)} ч ${Math.round(dl % 1 * 60)} мин</td></tr>
<tr><td>Луна</td><td>${PHN(mi.ph)}, освещена ${Math.round(mi.f * 100)}%</td></tr><tr><td>Восход / заход луны</td><td>${f(mr.rise)} / ${f(mr.set)}</td></tr></table>`; };
draw(); $('asD').onchange = draw; };

// ===== пакет изменений =====
const lHash = a => hsh(JSON.stringify(a, (k, v) => (k === 'ed' || k === 'hv') ? undefined : v));
function pkgDiff(){ const cur = state.arrays.filter(a => !isMk(a)), ch = cur.filter(a => S.xh[a.id] !== lHash(a)), del = Object.keys(S.xh).filter(id => !cur.some(a => String(a.id) === id)); return {ch, del}; }
const pkgBase = () => { S.xh = Object.fromEntries(state.arrays.filter(a => !isMk(a)).map(a => [a.id, lHash(a)])); S.xt = now(); save(); };
function pkgMake(){ const {ch, del} = pkgDiff(); if (!ch.length && !del.length){ toast('Изменений с прошлого обмена нет'); return; }
const d = {app:'skat', pkg:1, from:me(), t:now(), since:S.xt || 0, layers:ch, del}; deliverFile(new Blob([JSON.stringify(d)], {type:'application/json'}), `СКАТ_пакет_${stamp()}.json`, `Пакет: слоёв ${ch.length}${del.length ? ', удалено ' + del.length : ''}`);
S.log.push({t:now(), k:'m', au:me(), x:`Отправлен пакет изменений: слоёв ${ch.length}${del.length ? ', удалений ' + del.length : ''}`}); pkgBase(); }
async function pkgTake(f){ let d; try { d = JSON.parse(await f.text()); } catch(e){ toast('Это не пакет СКАТ'); return; } if (!d || !d.pkg || !Array.isArray(d.layers)){ toast('Это не пакет изменений СКАТ'); return; }
askConfirm(`Пакет от «${d.from || '?'}» (${dt(d.t)}): слоёв ${d.layers.length}${(d.del || []).length ? ', удалить ' + d.del.length : ''}. Совпадающие слои будут заменены. Принять?`, 'Принять', () => { let nw = 0, up = 0;
d.layers.forEach(a => { const i = state.arrays.findIndex(x => String(x.id) === String(a.id)); if (i >= 0){ state.arrays[i] = normArr(a); up++; } else { state.arrays.push(normArr(a)); nw++; } });
const dl = new Set((d.del || []).map(String)); const n0 = state.arrays.length; state.arrays = state.arrays.filter(a => !dl.has(String(a.id))); const rm = n0 - state.arrays.length;
S.log.push({t:now(), k:'m', au:me(), x:`Принят пакет от «${d.from || '?'}»: новых слоёв ${nw}, обновлено ${up}, удалено ${rm}`}); persistNow(); renderMarkers(); try { renderLayers(); } catch(e){} pkgBase(); closeModals(); toast(`Принято: новых ${nw}, обновлено ${up}, удалено ${rm}`); }); }
P.pkg = b => { const {ch, del} = pkgDiff(); b.innerHTML = `<p class="status">Передаются только слои, изменённые после прошлого обмена${S.xt ? ' (' + dt(S.xt) + ')' : ''}. Принимающий получает новые и обновлённые слои, удалённые — удаляются.</p>
<div class="shAl"><span>Изменено слоёв: ${ch.length}${del.length ? `, удалено: ${del.length}` : ''}</span></div><div class="shList">${ch.map(a => `<div class="shRow"><div>${E(a.name)}</div><small>объектов ${nObj([a])}</small></div>`).join('')}</div>
<div class="row"><button class="primary" id="pkM">Сформировать пакет</button><button class="ghost" id="pkT">Принять пакет…</button><button class="ghost" id="pkB">Отметить «всё передано»</button></div><input type="file" id="pkF" accept=".json,application/json" style="display:none">`;
$('pkM').onclick = () => { pkgMake(); go('pkg'); }; $('pkT').onclick = () => $('pkF').click(); $('pkF').onchange = e => { const f = e.target.files[0]; if (f) pkgTake(f); e.target.value = ''; }; $('pkB').onclick = () => { pkgBase(); go('pkg'); }; };

// ===== чек-листы =====
const CL0 = [{n:'Перед выездом', it:['Зарядить планшет и пауэрбанк', 'Скачать карты района без сети', 'Сделать автокопию проекта', 'Сохранить снимок обстановки', 'Проверить GPS', 'Сверить время']},
{n:'Смена позиции', it:['Снимок обстановки «перед сменой»', 'Перенести свои знаки', 'Обновить НП и ориентиры', 'Сообщить новые координаты', 'Отправить пакет изменений']},
{n:'Передача дежурства', it:['Доложена обстановка на карте', 'Журнал заполнен', 'Задачи и сроки переданы', 'Сделан снимок обстановки', 'Передан пакет изменений', 'Сменщик расписался в журнале']}];
P.cl = b => { const C = S.cls || (S.cls = CL0.map(c => ({n:c.n, it:c.it.map(x => ({x, ok:0}))})));
b.innerHTML = C.map((c, i) => `<div class="flabel">${E(c.n)} — ${c.it.filter(x => x.ok).length}/${c.it.length}</div><div class="shList">${c.it.map((x, j) => `<label class="shChk"><input type="checkbox" data-c="${i}|${j}" ${x.ok ? 'checked' : ''}> <span>${E(x.x)}</span><button class="ghost sm" data-xd="${i}|${j}">✕</button></label>`).join('')}</div><div class="row"><button class="ghost sm" data-ad="${i}">＋ Пункт</button><button class="ghost sm" data-rs="${i}">Сбросить</button><button class="ghost sm" data-dl="${i}">Удалить список</button></div>`).join('') + `<div class="row"><button class="ghost" id="clN">＋ Новый список</button><button class="ghost" id="clR">Вернуть стандартные</button></div>`;
on(b, '[data-c]', 'change', x => { const [i, j] = x.dataset.c.split('|'); C[i].it[j].ok = x.checked ? 1 : 0; if (C[i].it.every(y => y.ok)) S.log.push({t:now(), k:'m', au:me(), x:`Чек-лист «${C[i].n}» выполнен`}); save(); go('cl'); });
on(b, '[data-xd]', 'click', (x, e) => { e.preventDefault(); const [i, j] = x.dataset.xd.split('|'); C[i].it.splice(j, 1); save(); go('cl'); });
on(b, '[data-ad]', 'click', x => { const t = prompt('Пункт', ''); if (t){ C[+x.dataset.ad].it.push({x:t, ok:0}); save(); go('cl'); } }); on(b, '[data-rs]', 'click', x => { C[+x.dataset.rs].it.forEach(y => y.ok = 0); save(); go('cl'); });
on(b, '[data-dl]', 'click', x => askConfirm('Удалить список?', 'Удалить', () => { C.splice(+x.dataset.dl, 1); save(); go('cl'); })); $('clN').onclick = () => { const n = prompt('Название списка', ''); if (n){ C.push({n, it:[]}); save(); go('cl'); } }; $('clR').onclick = () => { S.cls = null; save(); go('cl'); }; };

if (typeof TIPS !== 'undefined' && Array.isArray(TIPS)) TIPS.push('Штаб (Ещё → Штаб): журнал, снимки обстановки, график от «Ч», режим доклада, задачи, расчёт марша, разграфка листов, атлас для печати и автокопии.');
})();
