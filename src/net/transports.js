// Transportes de red para el modo multijugador.
//
// - P2PTransport: WebRTC entre navegadores usando Trystero (señalización por
//   relés públicos Nostr). No requiere ningún servidor propio: funciona desde
//   un hosting estático como el de la Gobernación.
// - RelayTransport: WebSocket contra `server/relay.mjs` (Node.js) para redes
//   donde WebRTC esté bloqueado o cuando se quiera control total del tráfico.
//
// Ambos exponen la misma interfaz: on(action, handler), send(action, payload,
// [targetId]), onPeerJoin(cb), onPeerLeave(cb), peers(), selfId, leave().

import { joinRoom, selfId } from 'trystero';

export const APP_ID = 'gobernacion-narino-aventura-3d';
export const DEFAULT_ROOM = 'narino-principal';

export class P2PTransport {
  constructor({ appId = APP_ID, roomId = DEFAULT_ROOM, password } = {}) {
    this.kind = 'p2p';
    this.roomId = roomId;
    this.selfId = selfId;
    this.room = joinRoom({ appId, password }, roomId);
    this._actions = new Map();
    this._joinHandlers = [];
    this._leaveHandlers = [];
    // Trystero ≥ 0.25 expone onPeerJoin/onPeerLeave como propiedades; en
    // versiones anteriores eran funciones. Se soportan ambas.
    const room = this.room;
    const fanJoin = (id) => { for (const cb of this._joinHandlers) cb(id); };
    const fanLeave = (id) => { for (const cb of this._leaveHandlers) cb(id); };
    if (typeof room.onPeerJoin === 'function') room.onPeerJoin(fanJoin);
    else room.onPeerJoin = fanJoin;
    if (typeof room.onPeerLeave === 'function') room.onPeerLeave(fanLeave);
    else room.onPeerLeave = fanLeave;
  }

  _action(name) {
    let entry = this._actions.get(name);
    if (!entry) {
      const made = this.room.makeAction(name);
      if (Array.isArray(made)) {
        // API antigua: [send, receive]
        entry = { send: (p, target) => made[0](p, target), setHandler: (h) => made[1](h) };
      } else {
        // API nueva: { send(data, { target }), onMessage }
        entry = {
          send: (p, target) => made.send(p, target ? { target } : undefined),
          setHandler: (h) => { made.onMessage = (data, ctx) => h(data, typeof ctx === 'string' ? ctx : ctx?.peerId); },
        };
      }
      this._actions.set(name, entry);
    }
    return entry;
  }

  on(action, handler) {
    this._action(action).setHandler((payload, peerId) => handler(payload, peerId));
  }

  send(action, payload, targetId) {
    try {
      const result = this._action(action).send(payload, targetId);
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (err) {
      console.warn('[red] no se pudo enviar', action, err?.message || err);
    }
  }

  onPeerJoin(cb) {
    this._joinHandlers.push(cb);
  }

  onPeerLeave(cb) {
    this._leaveHandlers.push(cb);
  }

  peers() {
    return Object.keys(this.room.getPeers());
  }

  leave() {
    const p = this.room.leave();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
}

export class RelayTransport {
  constructor({ url, roomId = DEFAULT_ROOM }) {
    this.kind = 'relay';
    this.url = url;
    this.roomId = roomId;
    this.selfId = null;
    this._handlers = new Map();
    this._peerJoin = [];
    this._peerLeave = [];
    this._peers = new Set();
    this._queue = [];
    this._closed = false;
    this._retry = 1000;
    this._connect();
  }

  _connect() {
    if (this._closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this._retry = 1000;
      ws.send(JSON.stringify({ t: 'join', room: this.roomId }));
      for (const raw of this._queue) ws.send(raw);
      this._queue.length = 0;
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.t === 'welcome') {
        this.selfId = msg.id;
        for (const id of msg.peers || []) {
          this._peers.add(id);
          for (const cb of this._peerJoin) cb(id);
        }
      } else if (msg.t === 'peer-join') {
        this._peers.add(msg.id);
        for (const cb of this._peerJoin) cb(msg.id);
      } else if (msg.t === 'peer-leave') {
        this._peers.delete(msg.id);
        for (const cb of this._peerLeave) cb(msg.id);
      } else if (msg.t === 'msg') {
        const handlers = this._handlers.get(msg.a);
        if (handlers) for (const h of handlers) h(msg.p, msg.from);
      }
    };
    ws.onclose = () => {
      for (const id of this._peers) for (const cb of this._peerLeave) cb(id);
      this._peers.clear();
      if (!this._closed) {
        setTimeout(() => this._connect(), this._retry);
        this._retry = Math.min(this._retry * 2, 15000);
      }
    };
    ws.onerror = () => ws.close();
  }

  on(action, handler) {
    if (!this._handlers.has(action)) this._handlers.set(action, []);
    this._handlers.get(action).push(handler);
  }

  send(action, payload, targetId) {
    const raw = JSON.stringify({ t: 'msg', a: action, p: payload, to: targetId || null });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(raw);
    else if (this._queue.length < 20) this._queue.push(raw);
  }

  onPeerJoin(cb) {
    this._peerJoin.push(cb);
  }

  onPeerLeave(cb) {
    this._peerLeave.push(cb);
  }

  peers() {
    return [...this._peers];
  }

  leave() {
    this._closed = true;
    this.ws && this.ws.close();
  }
}

/**
 * Crea el transporte según la URL:
 *   ?sala=nombre          sala (por defecto "narino-principal")
 *   ?red=off              desactiva el multijugador
 *   ?red=relay&relay=wss://host   usa el servidor relay
 * Devuelve null si la red está desactivada o no hay WebRTC/WebSocket.
 */
export function createTransportFromUrl() {
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
  const mode = params.get('red') || 'p2p';
  if (mode === 'off') return null;
  const roomId = (params.get('sala') || DEFAULT_ROOM).slice(0, 40).replace(/[^\w-]/g, '_');
  if (mode === 'relay') {
    const url = params.get('relay');
    if (!url || typeof WebSocket === 'undefined') return null;
    return new RelayTransport({ url, roomId });
  }
  if (typeof RTCPeerConnection === 'undefined') return null;
  try {
    return new P2PTransport({ roomId });
  } catch (err) {
    console.warn('[red] P2P no disponible:', err?.message || err);
    return null;
  }
}
