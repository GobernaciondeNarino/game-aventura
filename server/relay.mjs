// Servidor relay opcional para el modo multijugador (Node.js + ws).
//
// El juego funciona sin servidor (WebRTC P2P con Trystero). Este relay es la
// alternativa para redes institucionales donde WebRTC esté bloqueado o cuando
// se quiera un punto central controlado. Solo retransmite mensajes JSON entre
// los navegadores conectados a una misma sala; no guarda estado ni datos.
//
// Uso:  cd server && npm install && npm start
// Cliente:  https://mi-sitio/aventura/?red=relay&relay=wss://mi-servidor:8787
import { WebSocketServer } from 'ws';
import { randomBytes } from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const MAX_ROOM_SIZE = 32;
const MAX_MESSAGES_PER_SECOND = 40;

const wss = new WebSocketServer({ port: PORT, maxPayload: 4096 });
/** @type {Map<string, Map<string, import('ws').WebSocket>>} */
const rooms = new Map();

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  const id = randomBytes(6).toString('hex');
  let room = null;
  let budget = MAX_MESSAGES_PER_SECOND;
  const refill = setInterval(() => { budget = MAX_MESSAGES_PER_SECOND; }, 1000);

  ws.on('message', (raw) => {
    if (--budget < 0) return; // límite de ritmo por conexión
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.t === 'join' && !room) {
      room = String(msg.room || 'narino-principal').slice(0, 40).replace(/[^\w-]/g, '_');
      if (!rooms.has(room)) rooms.set(room, new Map());
      const peers = rooms.get(room);
      if (peers.size >= MAX_ROOM_SIZE) {
        send(ws, { t: 'full' });
        ws.close();
        return;
      }
      send(ws, { t: 'welcome', id, peers: [...peers.keys()] });
      for (const peer of peers.values()) send(peer, { t: 'peer-join', id });
      peers.set(id, ws);
    } else if (msg.t === 'msg' && room) {
      const out = { t: 'msg', from: id, a: String(msg.a || '').slice(0, 16), p: msg.p };
      const peers = rooms.get(room);
      if (!peers) return;
      if (msg.to) {
        const target = peers.get(String(msg.to));
        target && send(target, out);
      } else {
        for (const [peerId, peer] of peers) if (peerId !== id) send(peer, out);
      }
    }
  });

  ws.on('close', () => {
    clearInterval(refill);
    if (!room) return;
    const peers = rooms.get(room);
    if (!peers) return;
    peers.delete(id);
    for (const peer of peers.values()) send(peer, { t: 'peer-leave', id });
    if (peers.size === 0) rooms.delete(room);
  });
});

console.log(`Relay de Nariño Aventura escuchando en ws://0.0.0.0:${PORT}`);
