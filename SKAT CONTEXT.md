# SKAT_CONTEXT v6.15 — файл передачи контекста (для Claude). Читать целиком перед работой.

## 0. Пользователь и правила (ОБЯЗАТЕЛЬНО)
- Пишет по-русски, только iPhone/iPad, компьютера нет. Claude Pro. Экономить лимит.
- Перед каждой доработкой: краткий план + оценка расхода (% 5-часового окна) → ждать «Да/Делай/Продолжай».
- Ответы кратко, по делу. В КОНЦЕ КАЖДОГО ответа: «Версия: X», «Файлы: …», «Ссылки на приложение» (обе):
  GitHub Pages: https://984s2pbyn4-create.github.io/skat/ (sharable.link больше НЕ используется)
- Обновление: пользователь загружает на GitHub (репо 984s2pbyn4-create/skat) только изменённые файлы; обычно index.html (+ mk.js / op.js / tp.js, если правился модуль). APK собирается сам (Actions → Build APK → Artifacts SKAT-apk), ключ подписи в секрете SKAT_KEYSTORE.
- Только ОДИН чат правит код одновременно (параллельные «субагенты» с разными копиями index.html давали ошибки/потери). Новый чат всегда стартует с последнего index.html + этого файла.

## 1. Продукт
СКАТ — полевой топопланшет СК-42 (Leaflet). Разделы (secMode): op «Оператор» (обстановка, знаки, надписи, таблицы на карте, печать JPEG с рамкой топокарты), tp «Боевой контур» (точки, массивы, корректировка огня «Корр.», «План ОЗ»: ТЗ, цели, зоны, точки встречи), mk «Макет» (3D MapLibre: рельеф, OSM-объекты, модели знаков, объекты макета, сценарии с шкалой, камеры, огневое поражение).
Файлы: index.html (ядро + Оператор + Боевой контур; modLoad(m) лениво грузит m.js?v=<версия>; модуль в конце ставит window.__mod_<m>=1), op.js (печать JPEG, редактор надписей, свойства знака), tp.js (панель корректировки, окна Плана ОЗ, выгрузка Excel, правка зон, точки встречи), mk.js (Макет/3D: 3D-просмотр, объекты, анимация, сцены, шкала, камеры, огонь; ~82 КБ), index.html ранее (всё приложение, ~330 КБ JS внутри одного <script>), sw.js (офлайн-кэш, cache-first приложения), apk.yml (Capacitor 6 сборка, скачивает libs в lib/ и sed-заменяет CDN-URL), manifest.json, icon-192/512.png.
Библиотеки: Leaflet 1.9.4, leaflet-rotate 0.2.8 (jsdelivr), XLSX 0.18.5, sql.js 1.10.3 (lazy, .mbtiles), MapLibre GL 4.7.1 (lazy, 3D). Шрифты IBM Plex Sans Condensed, Roboto Condensed 700.

## 2. Метод правок (как работать дёшево и без ошибок)
- НЕ перезаписывать index.html целиком. Патч python: `rep(old,new,n=1)` с assert на точное число вхождений; новые блоки кода вставлять перед маркером `// ---- удержание пальца` (он в конце скрипта, до инициализации).
- После патча: извлечь скрипт (от `<script>\nconst VERSION` до последнего `</script>`) → `node --check`. Сложную логику проверять node-смоук-тестом на выдранной функции.
- Модули: classic-скрипты, общие глобалы. В ядре оставлены нужные ему из 3D: circlePoly, inRing, mk(), MDL_OF(+ls), objCells, ENV_N, ENV_IC, envMarkers, isMk, itKind. Ядро вызывает 3D только через mkLoad().then(open3D). Функции модулей, вызываемые из ядра, — заглушки modStub(m, имена) (op: openTextEd, openProp; tp: corrTap, exportPlanXlsx, openShapeEd, meetTap, corrDraw, corrPanel, askChar, applyChar); кнопки на панели — modBtn (prnBtn; corrBtn, planBtn). В ядре оставлено для отрисовки: textLayer/txtHtml/FONTS/TXT_BG/txtShadow/symOpt/lbStyle/FAKE/applySectionOp; CT, SYS, corrDev, isPlanL, zoneKids, zoneTargets, zoneShape, AUX, auxSection, devTxt, FX, ftaskSection, stadiumPts, NOLBL, OBX, CHAR, planHtml, tzList, meetMode, meetMarkers, planPrep, colName, нумерация/зоны/поиск знаков, характер→знак. Новую функцию модуля, нужную ядру синхронно, держать в ядре. Импорт/экспорт точек в ядре (выбор файла iOS требует жеста). При правке mk.js — та же VERSION, проверять node --check обоих и склейки core+mk. sw.js: same-origin *.js — cache-first в APP (ключ с ?v=), V='skat-2.7'; apk.yml копирует mk.js и sed-заменяет CDN и в нём.
- Каждая правка: VERSION++ (строка `const VERSION = 'версия X.Y';`). Файл в /mnt/user-data/outputs/index.html → present_files.
- Перед патчем искать якоря через python `s.count(pat)`; вывод печатать коротко (не грузить большие куски — дорого). `cut -c` ломает UTF-8 — использовать python для срезов.
- Глобальные переменные, используемые в renderMarkers/drawOpt, объявлять до первого вызова (init в самом конце скрипта: `sizeCanvas(); setLayer(...); renderMarkers(); ... histSnap(); applySection()`).
- Модальные окна z-index 2800 (выше 3D 2500), круговое меню 2700, тост 3000.

## 3. Модель данных
state (localStorage 'sk42_planshet_v1' через persistNow; снимки для ↶/↷ — hist):
 arrays[] (слои), palette[], palVer, layer (подложка), grid, full, places, voice, trash[], scenes[], ftasks[].
Слой a: {id, kind:'main'(массив, нумерация prefix/start/step)|'pts'(именные)|'aux'(ориентиры-ёлочки)|'route'|'desc'(описание)|'shapes'(фигуры), name, ident, style{color,name,glyph}, points[], shapes[], texts[], tables[], env[](объекты макета), meet[](точки встречи), hidden, opt(⚡canvas), minZ, lblZ, nolbl, tags[], sym/symSide/fc (знак слоя), fplan(слой ТЗ: tz), zones(зоны поражения), meetL}.
Точка p: {lat,lng,h,hManual,place,placeManual,comment,name,lbl(своя подпись),sym('_none'=без знака),side('r'|'b'),fc(заливка принадл.),rot,ssz,slw,plan(пунктир),fake(зелёный),nolbl,lf/ls/lc(шрифт подписи),style,hid,g(группа),tags,path[],spd,t0,fires[],msc,alt, (план ОЗ) tz,tzs[],ch(характер),tno('31101'),osym}.
Фигура sh: {type:'line'|'poly'|'rect'|'circle', pts:[[lat,lng]], r, color, op, name, sym(линейный знак), scl, z0, zn(номер зоны), hid, g}.
Текст t: {lat,lng,t,f,s,c,sc,sw,b,i,bg,r,al,lh,lsp,u,shd,fr}. Таблица T: {lat,lng,rows[][],f,s,c,bg,op,bd,bw,hdr,hbg,al,pd,zb}.
env o (макет): {k:house|flat|wh|hangar|tree_n|tree_b|grove|trow(line)|tpoly(ring)|pw|mast|wt|tank, lat,lng,rot,msc,step,w,sp,n,r,lf,path,spd,t0}.
ftask (корректировка): {id,name(№ цели),gun{lat,lng},tgt,sys(SYS ключ),rs,bursts[{lat,lng,n}],obj,cat}.
Сцена: {id,name,b:[w,s,e,n],cam{c,z,p,br}}.
Отдельные LS-ключи: skat_mode, skat_fav_<mode>, skat_syms(+_ver=4,_del), skat_rel, skat_rot, skat_v3, skat_cl, skat_nolbl, skat_cache_off.
IndexedDB 'skat' v3: regions (база н.п.), tiles (тайлы по URL, 'mb:id/z/x/y', 'obj4:cy:cx' 3D-участки), maps (.mbtiles).

## 4. Ключевые соглашения/логика
- Координаты: GEO.toSK/fromSK (СК-42, зона по долготе), pad5, sqOf (квадрат-улитка). labelOf(a,i) (учитывает p.lbl).
- Знаки: SYM_DEF→SYMS/SYM_BY (символы id, n, ab, type pt|line|area, d/f/z/tx, cR/cB цвета сторон); symSvg(sid,fc,o), drawSym(g,sid,x,y,color,fc,rot,sc,o{lw,dash,mx}); symCol(sid,side,def); sideOf(a,p); FACE_L — техника носом на запад, у синих зеркалится (mirB).
- Нумерация целей: TCAT 1..7 (101-199 жс/укрепл/НП; 2 ПУ/БпЛА; 3 разведка/РЛС/РЭБ; 4 арт/РСЗО/мин; 5 техника; 6 резерв МТО/ПВД; 7 ПВО). Номер = зона(2 цифры, нет зоны '00') + 3 цифры: tgtNo, planNum, zoneOf/zoneShape, catOfSym/catOfTxt, symForChar (CH2SYM).
- Excel плана: exportPlanAll → вкладки «ТЗ N» (planAoaTz, по tzList), «Зоны» (по КАЖДОЙ вершине, locText как «Описание»), «Огневые задачи», «Точки встречи».
- Корректировка: CT, corrTap, corrFire (PROJ снаряд/мина/РС), devTxt (только стороны света), SYS (скорости, rs у РСЗО).
- 3D: open3D/close3D, v3mdl (модели знаков, MDLS/MDL_OF/MDL_AIR), envFeatures (объекты макета), buildObjs (OSM здания/деревья/вышки), fireFx, scnSet/tlRender (сценарий), applyCam (камеры).
- Слои UI: renderLayers = renderLayers0 + decorateLayers (разделы Обстановка/Огневые задачи/Макет сворачиваются; kids-список объектов с ✎, 👁, свайпом; группы; ☑ выбор; теги; Aa подписи).

## 5. Сделано (кратко по версиям)
2.x офлайн/кэш/APK; 3.x знаки по Прил.3 БУ, редактор знаков из элементов, 3D, поворот карты; 4.x разделы, корзина, ↶↷, надписи, печать JPEG, импорт Excel, макет (объекты, анимация, сценарии), группы/выбор; 4.9 теги, кэш, миниатюры; 5.0 свойства знака (планируется/ложная), сектор, полосы, поиск н.п.; 5.1 рамка топокарты в печати; 5.2 сценарий-шкала, камеры, огонь; 5.3 корректировка огня; 5.4 План ОЗ, номера целей; 5.5 зоны/категории, поиск знаков; 5.6 ТЗ, характер с подсказками, ✎ правка, выгрузка всего; 5.7 характер→знак, зеркало синих; 5.8 импорт ориентиров без задвоения; 6.15 все оставшиеся пакеты: цели — полупрозрачный круг (hexA), знак синий, по флажку «к востоку» зеркально (ls skat_tgtE, флажок в «План ОЗ»), поверх (zIndexOffset 1000, .tgt-wrap); точки встречи красные, одиночные Р101… (a.meetP, rpStart после «Готово» маршрута или кнопкой «Точки Р101…»); подпись зоны в СЗ углу (.zlb), лесополос (.lplb), ориентиров выделены; declutter() раздвигает подписи (renderMarkers → renderMarkers0 + declutter); зоны: правка контура перетаскиванием (zoneDrag: ✥, «+» на серединах, двойное касание — удалить точку; #fbar), «Кто поражает» sh.who (seWho, подсказки из ОС); «План ОЗ»: глазик у ТЗ, таблица точек встречи с правкой/удалением (meetSection), «Нумерация целей» по направлению (numByDir: рубеж W м, справа налево, номера внутри зона+категория), «Лесополосы» контурами массивом (lpL слой, lpStart, mapTapHook), nearestLp (контуры + ориентиры «лп …», ≤1,5 км) в комментарии; сортировка таблиц поражает → лп/н.п. → квадрат (tgtSortKey); характер: сверху избранные/последние/частые (ls skat_chmode/chuse/chfav, ☆); «Периоды и налёты» (openPer: периоды, разбивка по удалению от ПК или по категории, сигнал и период на налёт, Excel; p.per/p.nal/p.sig). 6.14 сборка .exe: .github/workflows/exe.yml (windows-latest, Electron 31 + electron-builder portable → артефакт SKAT-exe/SKAT.exe; библиотеки внутри как в APK; страница через свой протокол app://skat/ — постоянный origin для localStorage/IndexedDB; меню скрыто, F11 полный экран, Ctrl+Shift+I консоль). ПК: правый клик по строке со свайп-удалением = удалить (только без сенсора), колесо прокручивает «Микшер», Esc закрывает окно, пробел — выстрел активной задачи, Ctrl+F — «Найти». 6.13 смена ОП: fa.pos/fa.moves — перемещение знака огневого средства >20 м записывается (обёртка persist → faTrackMoves), на карте следы колёс (две пунктирные колеи, faTrkL, faTracks через обёртку renderMarkers; вкл/выкл faTrk в «Огн. ср.», ls skat_trk), лист «Смена ОП» в ведомости; состояние fa.st (FA_ST: Готово/На марше/Пополнение БП/Неисправно) — точка цвета у знака на карте и в списках; «Огн. зад.»: вкладки «Сводка» (24 ч: задачи, расход по подразделениям и системам, состояние ОС, донесение Excel) и «Сигналы» (ls skat_sig, позывные ОС); сигнал задачи CT.sig (в ⓘ корректировки, журнал, Excel); единый поиск usBtn «Найти» (цели, ОС, задачи, журнал). Второй этап завершён. 6.12 БП под систему: amFor(sys, sh/fz/ch) — ранее введённые для системы (ls skat_amsys, amLearn при сохранении карточки) → подходящие по калибру/типу → прочие; datalist fdlSh/fdlFz/fdlCh (amDl). Микшер: размеры V.size peek/third(по умолч., ≤1/3 экрана)/full; «▾» сворачивает до кончиков карточек (mixTip), касание кончика выдвигает его (mixRaise) с кнопками ▶/■/Корр./Орудие/Цель; mixBind — общая привязка. Корректировка компактная (#corr.mini): строка «▶ № / ■ / ↶ / Ор. / Цель», таймер, разрыв; ⓘ раскрывает систему, дальность, БП, счёт, «Итог», «Передать» (corrMore). Второй этап (частично): ведомость БП в Excel (faXls, exportAmmo), история цели (tgtHistory, кнопка «История» в «Огн. зад.»), файл проекта JSON (saveProject/openProject в «Огн. зад.»). Осталось: журнал смены ОП, состояние огневых средств, сводка за сутки, сигналы и позывные, единый поиск. 6.11 микшер: панель полупрозрачная; верхняя строка: режим Все/Колоды/★Избранные (t.fav), группировка по полкам/подразделениям/своим (t.grp), сортировка (подразделение, система, остаток БП, позывной, готовность); вид в ls skat_mixv; колоды со сдвигом 7 px, раскрытие одной (V.open), групповые «▶ Группой», «■ Стоп всем», «⇪»; карточка с оборотом (свайп вверх/вниз или ↻; на обороте система, подразделение, дальность, своя группа, БП и расход за сутки по типу shot.am); стреляющие карточки и колоды выдвигаются вверх (.firing); фон — силуэт системы сверху (SIL, sysCat, mixBg). 6.10 справочники из АртГруппы (только названия): SYS с группами g (Миномёты/Ствольная/РСЗО/Танки и БМ/Гранатомёты), sysOpts(cur) с optgroup; AMMO_REF (снаряды/мины sh, взрыватели fz, заряды ch, траектории tr) → datalist dlSh/dlFz/dlCh в карточке БП (поля t, vz, zr, have, norm); кнопка «⇪ Передать» (xferText/xferSend: Capacitor Share → navigator.share → буфер) в корректировке и канале микшера; «Топо» (geoBtn, всегда на левой панели, модуль tp): прямая, обратная, засечка прямая, обратная (Тинстра с выбором ориентации), пересчёт СК-42↔WGS-84↔МГРС, углы д.у.↔градусы, дир. угол↔магн. азимут (δ, γ авто); точки с карты (window.geoPickCb в map click), результат в слой «Топогеодезия». Баллистику/таблицы стрельбы не делаем. Следующий этап: движение БП, журнал смены ОП, состояние ОС, история цели, сводка, сигналы, файл проекта, единый поиск. 6.8 подписи целей = только номер (p.lbl = p.tno, перевод старых при загрузке); topoScale() в строке координат; печать: prnScale (Авто по ряду 1:10 000…1:200 000 или выбор), подпись масштаба в 1 см, подписи 2,6 мм с тонкой обводкой, 300 dpi по умолчанию; микшер: тёмные каналы 214 px, крупные списки/кнопки. 6.9 огневые средства: p.fa {id, cs позывной, reg, unit, sys, n, max, ammo:[{t, have, norm}], note} у знака; окно faModal (кнопка faBtn «Огн. ср.», группы полк/подразделение, «+ Карточка» у знаков орудий без неё, faEdModal); выбор орудия pickGun (карточки, знаки орудий, «Указать на карте») и цели pickTgt (плановые ТЗ, противник sideOf=b, поиск, карта) в корректировке и микшере; t.faId/t.maxOv/t.ammoT/t.gname; faUse списывает БП при выстреле, возврат при «Стоп»; SYS + s19, s3, s1, d20; журнал: поле «Огневое средство». 6.6 печать: prnRender(prev) → превью (prnPvModal) и prnSave; настройки: подложка prnBase, слои prnLays (prnSel), масштаб знаков prnSym, подписи prnLbl, флажки подписей/надписей/фигур, 400 dpi, лимит участков 800/1800/3500. 6.7 «Микшер» (#mixer, mixBtn в #lrail; MIX — id задач в ls skat_mix; канал = огневая задача: система, РС, цель, Д и Аз (° и д.у.), таймеры, ▶№/■ Стоп, Орудие/Цель/Корр. (делает задачу активной CT), Не набл./Осечка; corrFire(T)/corrStop(T) для любой задачи; corrDraw рисует все каналы; gname — подпись знака орудия). Таблица зоны во всю ширину: №, характер, ТЗ, X, Y, H, квадрат, н.п., комментарий, поражает. 6.5.1 maxZoom 18 (2D), cfModal переносится в конец body (поверх окон), «Таблица» целей зоны (openZoneTbl, в План ОЗ и «Огн. зад.»), счёт зон/целей в зонах, 3D: фон-слой bkg, отмена запросов тайлов (signal), проверка заглушки Esri только z≥15, подложка ≤18; toast «Загружаю 3D…»; 6.5 левая панель #lrail (ftBtn «Огн. зад.», corrBtn, planBtn; только в «Боевом контуре»), #corr сдвинут на left:72px; окно ftModal: «Текущие» (задачи, плановые ТЗ) и «Журнал» (state.ftlog, запись из «Итога» — logFromTask, правка ftEdModal, свайп-удаление, exportFtLog → Excel); openModal помнит прокрутку 15 с после закрытия, keepScroll для Слоёв/План ОЗ/журнала; 2D: пока грузится участок — сразу увеличенный родитель из кэша; 3D fadeDuration:0, raster-fade-duration:0; 6.4 учёт выстрелов задачи (CT.shots {no,n,landed,res: hit≤50м/dev/nobs/mis}, CT.shotN, CT.reuse — номер отменённого «Стопом» отдаётся следующему; corrMark привязывает разрыв к первому упавшему неотмеченному; «Итог задачи» → CT.res Уничтожена/Подавлена, расход в «Огневых задачах»); выбор режима (launch) при каждом запуске; печать: prnQ (подложка +0..2 уровня), prnJq (JPEG 60–100%, оценка размера), подложка через tileFb; 3D Esri maxzoom 17, isPlaceholder по однородности; 6.3 тайлы: tileBlob/parentTile/tileFb (заглушка Esri и пустые участки → увеличенный родитель, после «online» перерисовка), 3D-подложка и DEM через них; корректировка: параллельные выстрелы (corrFly с shot-id), «Стоп» отменяет крайний, таймеры №, SYS.max дальности, РСЗО по числу; печать: подписи у края внутрь; 6.2 модули на базе 6.1 (другой чат: зоны в План ОЗ, свайп-корзина, Ориентиры); 6.1 модули op.js/tp.js; 6.0 модуль mk.js (ленивая загрузка Макета/3D); 5.9 заготовка целей, вид целей (знак в круге), точки встречи, цель в нескольких ТЗ, таблицы на ширину, плавный свайп, фикс «Массив/Маршрут».

## 6. Дорожная карта
1) Модули: 6.0 — mk.js вынесен (этап 1а, сделано). 6.1 — op.js, tp.js (этап 1б). 6.2 — модули пересобраны на основе 6.1 из другого чата (зоны в «План ОЗ», свайп-корзина, раздел «Ориентиры», выгрузка зон). 2) Формуляры «Боевого контура»: объекты с журналом, хронометраж, фото/видео, шифрование+PIN (60–100%). 3) Видео из сценария (MediaRecorder) (10–15%). 4) Векторный редактор «Оператора» в духе CorelDRAW (150–250%, поэтапно). 5) Упрощённый тактический симулятор на Three.js (200–400%). Отложено: установщик ПК (.exe через Actions).

## 7. Карта кода (раздел → функции/константы; номера строк index.html v5.9)
VERSION, NATIVE, GEO, D2R, WGS, toEcef, fromEcef, wgsToKrs, krsToWgs, tmFwd, tmInv, zoneOf, toSK, fromSK, YA_SAT, LAYERS, loadAll, SOURCE, EMBED, PINK, DEFAULT_PAL, PAL_VER, persistNow, persist, START, ROTP, DEF_LBLZ, setLayer, showTileBanner, sizeCanvas, canvasBox, drawGrid, lines, DEM_Z, demTile, demData, elevation, snailOf, updateReadout, centerHeight, NAMED, colorName, styleOf, normArr, renderPalette, openPalette, renderPalList, labelOf, sqOf, rangeText, AUX_R, distM, auxNear, rowsOf, auxRowsOf, DIRS, nearestSync, descRowsOf, arrById, TREE, TREE_BTN, BOLT, renderMarkers, TREE_PTS, drawOpt, routeLive, sheetSoon, fillHeight, PDB_KEY, idbOpen, tst, queuePut, b64blob, netBlob, tileGetFast, flushGets, tileGet, tileHas, tilePutMany, tileGetMany, tileKeys, tileCount, tileClear, lsSave, pdbPut, pdbDel, pdbLoad, pdbClear, regItems, pdbFind, pdbAdd, tileInfo, exportOffline, importOffline, pdbInfo, OVERPASS, overpass, overpassRaw, placeTile, nearestPlace, netMsg, loadRegion, R100, ensureStartRegion, downloadPlaceDb, PLC_RANK, refreshPlaces, drawPlaces, fillPlace, startSession, setMode, endSession, createNamed, addPoint, EYE_ON, EYE_OFF, renderLayers, renderLayers0, renderSheet, openModal, closeModal, sheetify, askConfirm, closeModals, autoField, setAuto, setVal, ZOPTS, fillZSel, KIND_HINT, setKind, openArrModal, renderColors, formArr, updPreview, openTable, openPoint, withPre, stripPre, openAux, saveAux, exportXlsx, stamp, exportAuxCsv, exportSession, importSession, saveCopy, downloadBlob, b64of, nativeSave, deliverFile, escapeHtml, toast, SNAIL, nearest, parseQuery, pairToLL, importCsv, DL_CAP, dlBox, dlRange, dlCount, dlParams, dlUpdate, openDl, fillZSel2, dlBar, dlStopNow, SQLJS, loadSQL, mapsAll, mapsPut, registerMap, rebuildSel, fitMap, deleteMap, mapsClear, renderMapList, magic, importAny, importMbtiles, SQL, tmplRe, exportMbtiles, SQL, exportPlaces, importPlaces

## L1878 ИНСТРУМЕНТЫ
SHAPE_NAMES, MODE_NAMES, fmtArea, segInfo, areaSK, rectPts, shapeGeo, curShape, shapeLayer, drawShapes, drawTool, toolSummary, setSheetH, renderTool, openTools, closeTools, toolAdd, saveShape, openShapeTable, showProfile

## L2065 РЕЛЬЕФ
RAMP, ramp, demSampler, reliefTile, applyRelief, renderRelUI

## L2128 КОМПАС
updCompass

## L2141 3D-ПРОСМОТР
loadML, v3bases, keyUrl, tileBytes, circlePoly, v3data, v3baseSrc, open3D, V3SYM, v3places, v3aux, v3tac, mmix, MDLS, MDL_OF, MDL_AIR, mdlPoly, mdlParts, mdlTrench, v3mdl, txtCanvas, haloText, v3img, cleanDem, v3apply, opQuery, sqPoly, treeRow, ROOFS, mk, ngon, rectR, cen, scaleRing, areaM, inRing, joinRings, perM, osmRaw, addTree, WALLS, strip, midLine, brgParts, offLine, buildObjs, refreshObjs, ensureObjs, v3upd, v3bar, v3tap, close3D

## L2554 ТАКТИЧЕСКИЕ ЗНАКИ
CIRC, SYM_DEF, LSTYLES, ASTYLES, SIDES, defSym, loadSyms, saveSyms, SVGH, LPREV, APREV, symSvg, symImgCanvas, sideOf, symCol, drawSym, shK, symExtra, walkLine, wavy, baseLine, arrowHead, DECOR

## L2929 ДВИЖОК ЛИНЕЙНЫХ И ПЛОЩАДНЫХ ЗНАКОВ (Приложение 3)
SCOL, LSPEC, ldd, lgeo, lnAt, loff, lpath, lseg, lfill, lcirc, lsym, lbase, lmark, lend, decorOne, decorLine, SvgCtx, mkP, lprev, updateCluster, renderClUI, TYPE_N, renderSymList, openSymEd, renderSymEd, isClosedP, elPath, compileSym, elsFrom, elBox, elMove, drawSymEd, renderSymTools, renderSymPick

## L3265 КРУГОВОЕ МЕНЮ ПО УДЕРЖАНИЮ
radRender, radPush, closeRadial, openRadial, radKind, radSym, renderFillPick, sideStyle, pickSym, symObjLayer, startLineSym, placeAuxAt, toolAt

## L3369 РАЗДЕЛЫ, ДОБАВЛЕНИЕ, КОРЗИНА, ОТМЕНА
SECTIONS, favList, isFav, toggleFav, showLaunch, setSection, applySection, histSnap, updUndo, histGo, trashPush, trashLayer, trashPoint, renderTrash, swipeable, openSymPick, openSymPickR, ADD_ITEMS, openAdd, addPick, layTab, renderBaseList, hitPoint, openObjMenu, openRot

## L3493 ОПЕРАТОР: НАДПИСИ
FONTS, TXT_BG, txtShadow, txtHtml, textLayer, openTextEd, txtRead, txtPrev

## L3520 ОПЕРАТОР: ИМПОРТ И ЭКСПОРТ ТОЧЕК
exportPointsCsv, openImp, symByText

## L3561 ОПЕРАТОР: ПЕЧАТЬ В JPEG
PAPERS, prnSize, prnInfo, renderPrnUI, tileBmp, applySectionOp

## L3680 МАКЕТ: ОБЪЕКТЫ, КРУГОВОЕ МЕНЮ 3D, АНИМАЦИЯ
ENV_N, ENV_D, ANIM, envLayer, rotFeats, envFeatures, v3item, envRefresh, pathData, envInit, placeEnv, placeTech, openRadial3D, pathPos, playAnim, stopAnim, allAnimItems

## L3761 МАКЕТ: СЦЕНЫ И ВРЕМЕННАЯ ШКАЛА
pathLen, scnItems, scnDur, scnRefresh, scnSet, scnLoop, scnPlay, scnPause, scnBox, renderScn, openScene, closeScene, scnPickTap

## L3804 МАКЕТ: РИСОВАНИЕ РЯДОВ И РОЩ, «МОИ СЛОИ», ЗНАЧКИ В 2D
drawBar, startDraw, ENV_IC, envMarkers, renderMy

## L3840 СЛОИ: РАСКРЫТИЕ, ГРУППЫ, ВЫБОР; ТАБЛИЦЫ НА КАРТЕ; МОДЕЛИ
wavyLL, tblHtml, hexA, openTbEd, tbPrev, layItems, ARRK, itPos, kidsHtml, bindKids, selItems, selLayers, selBar, decorateLayers, openBatch

## L3947 СЛОИ: ТЕГИ, МИНИАТЮРЫ, КЭШ, БЫСТРОЕ СОЗДАНИЕ
tagOk, allTags, quickLayer, thumb, tagBar, cacheGroups, cOff, renderCache

## L3987 ОПЕРАТОР: СВОЙСТВА ЗНАКА
FAKE, symOpt, lbStyle, openProp, prV

## L4002 ПОИСК НАСЕЛЁННЫХ ПУНКТОВ ПО БАЗЕ НА УСТРОЙСТВЕ
nameSearch

## L4011 ИНСТРУМЕНТЫ: СЕКТОР И ОВАЛЫ МАССИВОМ
destLL, sectorPts, ovalPts, ovalPts0

## L4020 МАКЕТ: СЦЕНАРИЙ (МОНТАЖ), КАМЕРЫ, ОГОНЬ, НАСТРОЙКИ ОБЪЕКТОВ
FIRE_K, fxInit, itKind, fireFx, camTarget, applyCam, tlRender, treeGen, scaleFeats, extraBar, fireTap

## L4094 БОЕВОЙ КОНТУР: КОРРЕКТИРОВКА ОГНЯ
SYS, sysTof, BOOM, corrDev, corrDraw, corrPanel, newTask, corrTap, arcPts, corrFire, ftaskSection, stadiumPts

## L4158 СНАРЯДЫ, НУМЕРАЦИЯ ЦЕЛЕЙ, ПЛАНОВЫЕ ОЗ
PROJ, nextTgtNo, OBX, CHAR, planLayer, renderPlan, exportPlanXlsx

## L4187 НУМЕРАЦИЯ ЦЕЛЕЙ ПО ХАРАКТЕРУ И ЗОНАМ, ПОИСК ЗНАКОВ
TCAT, zoneLayer, zoneOf, usedNos, tgtNo, planCat, planNum, planNew, SPCAT, symMatch, spChips

## L4220 ПЛАН ОЗ: ТЗ, ХАРАКТЕР С ПОДСКАЗКАМИ, ЗОНЫ, ПРАВКА, ВЫГРУЗКА
colName, zoneShape, locText, chList, chRender, askChar, applyChar, openShapeEd, planAoa, zonesAoa, fireAoa, addSheet, exportPlanAll

## L4273 ХАРАКТЕР → ЗНАК, ОТРАЖЕНИЕ СИНИХ
CH2SYM, symForChar, FACE_L, mirB, symTf, symOptM

## L4290 ПЛАН ОЗ: ЗАГОТОВКА, ВИД ЦЕЛЕЙ, ТОЧКИ ВСТРЕЧИ, НЕСКОЛЬКО ТЗ
planPreset, planPrep, planHtml, meetLayer, meetBar, meetTap, meetMarkers, meetAoa, planAoaTz, doSearch
## 7. Очередь доработок (одобрено, по пакетам)
(сделано) 6.6 печать; 6.7 «Микшер» орудий: нижняя прокручиваемая полоса каналов (орудие, цель, дальность/азимут, число снарядов, «Выстрел» и «Стоп» раздельно, таймеры, отклонение по сторонам света С/Ю/В/З, «Корр.», «+», показ на карте). Номера ниже сдвигаются на +1 версию.
1) 6.3 отображение: подтверждение удаления над нижней вкладкой; удаление не закрывает Слои/План ОЗ; без характера на карте; цели поверх, полупрозрачная заливка, синие внутри, к востоку; точки встречи красные; подписи зон/н.п./лесополос выделены, зона — в СЗ углу; раздвижка подписей.
2) 6.4 зоны: правка контура перетаскиванием; «кто поражает» — список или ввод; «Таблица» зоны — её цели, правка общая с ТЗ/Слоями.
3) 6.5 План ОЗ: глазик и ✎ у ТЗ; точки встречи в План ОЗ (таблица как у целей, правка); после «Готово» — одиночные Р101, Р102…; поиск (название, №, характер, поражающий); «Нумерация целей» по направлению A→B: рубежи по удалению, внутри справа налево.
4) 6.6 лесополосы контуром массивом с названием; ближайшая лесополоса у целей/точек; сортировка: поражающий → лесополоса/н.п. → квадрат.
5) 6.7 характер: избранное в настройках (выбранные/последние/частые).
6) 6.8 «Огневые средства»: полки, подразделения, системы, расход боеприпасов на цель.
7) 6.9 периоды ОП и огневые налёты с сигналом, по характеру и удалению от ПК (направление двумя точками).
