// СКАТ — сервер обмена изменениями и чата между планшетами в своей сети. Запуск: node skat-sync.js [порт]
// Нужен только Node.js (без пакетов). Данные хранятся в файле skat-sync.json рядом со скриптом.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.argv[2] || 8787, FILE = path.join(__dirname, 'skat-sync.json'), KEEP = 3000;
let db = {seq:0, items:[], cseq:0, chat:[]};
try { db = Object.assign(db, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}
let saveT = null;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => fs.writeFile(FILE, JSON.stringify(db), () => {}), 500); };
const send = (res, code, obj) => {
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Allow-Private-Network':'true'});
  res.end(JSON.stringify(obj));
};
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && u.pathname === '/') return send(res, 200, {app:'skat-sync', seq:db.seq, items:db.items.length});
  if (req.method === 'GET' && u.pathname === '/pull') {
    const ch = u.searchParams.get('ch') || 'skat', after = +u.searchParams.get('after') || 0;
    return send(res, 200, {seq:db.seq, items:db.items.filter(x => x.ch === ch && x.seq > after).slice(0, 200)});
  }
  if (req.method === 'POST' && u.pathname === '/push') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 50e6) req.destroy(); });
    req.on('end', () => {
      let d; try { d = JSON.parse(body); } catch (e) { return send(res, 400, {error:'bad json'}); }
      const it = {seq:++db.seq, ch:d.ch || 'skat', from:d.from || '', au:d.au || '', t:d.t || Date.now(), layers:d.layers || [], del:d.del || []};
      db.items.push(it); if (db.items.length > KEEP) db.items.splice(0, db.items.length - KEEP); save();
      console.log(new Date().toLocaleTimeString(), it.ch, it.au, 'слоёв', it.layers.length, 'удалений', it.del.length);
      send(res, 200, {ok:1, seq:it.seq});
    });
    return;
  }
  if (req.method === 'GET' && u.pathname === '/chat/pull') {
    const room = u.searchParams.get('room') || 'skat', after = +u.searchParams.get('after') || 0;
    return send(res, 200, {seq:db.cseq, items:db.chat.filter(x => x.room === room && x.seq > after).slice(0, 500)});
  }
  if (req.method === 'POST' && u.pathname === '/chat/push') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      let m; try { m = JSON.parse(body); } catch (e) { return send(res, 400, {error:'bad json'}); }
      if (!m.id || db.chat.some(x => x.id === m.id && x.room === (m.room || 'skat'))) return send(res, 200, {ok:1, dup:1});
      const it = Object.assign({}, m, {room:m.room || 'skat', seq:++db.cseq}); delete it.sent;
      db.chat.push(it); if (db.chat.length > 20000) db.chat.splice(0, db.chat.length - 20000); save();
      console.log(new Date().toLocaleTimeString(), 'чат', it.ch, it.au, String(it.x).slice(0, 60));
      send(res, 200, {ok:1, seq:it.seq});
    });
    return;
  }
  send(res, 404, {error:'not found'});
}).listen(PORT, '0.0.0.0', () => console.log('СКАТ: сервер обмена на порту ' + PORT));
