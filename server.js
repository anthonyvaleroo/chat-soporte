const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000, () => {
  console.log('HTTP http://localhost:3000');
});
const server = app.listen(process.env.PORT || 3000, () => {
  console.log('Servidor iniciado');
});

const wss = new WebSocket.Server({ server });


let admin = null;
let clients = {};
let counter = 0;

function time() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

wss.on('connection', ws => {

  ws.on('message', data => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    /* ===== LOGIN CLIENTE ===== */
    if (msg.type === 'login' && msg.role === 'client') {
      ws.role = 'client';
      ws.clientId = randomUUID();
      clients[ws.clientId] = { ws, label:null };
      return;
    }

    /* ===== LOGIN ADMIN ===== */
    if (msg.type === 'login' && msg.role === 'admin') {
      admin = ws;
      ws.role = 'admin';
      return;
    }

    /* ===== ADMIN ESCRIBIENDO ===== */
    if (msg.type === 'typing' && ws.role === 'admin') {
      const c = clients[msg.clientId];
      if (c) c.ws.send(JSON.stringify({ type:'typing' }));
      return;
    }

    /* ===== CLIENTE ENVÍA ===== */
    if (ws.role === 'client') {
      const c = clients[ws.clientId];

      if (!c.label) {
        counter++;
        c.label = `CLIENTE ${counter}`;
        if (admin) {
          admin.send(JSON.stringify({
            type:'new-session',
            clientId: ws.clientId,
            label: c.label
          }));
        }
      }

      const payload = {
        ...msg,
        from:'client',
        clientId: ws.clientId,
        label: c.label,
        time: time()
      };

      if (admin) admin.send(JSON.stringify(payload));
      return;
    }

    /* ===== ADMIN ENVÍA ===== */
    if (ws.role === 'admin') {
      const c = clients[msg.clientId];
      if (!c) return;

      const payload = {
        ...msg,
        from:'admin',
        time: time()
      };

      c.ws.send(JSON.stringify(payload));
    }
  });

  ws.on('close', () => {
    if (ws.role === 'client') delete clients[ws.clientId];
    if (ws === admin) admin = null;
  });
});
