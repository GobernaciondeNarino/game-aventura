// Modo multijugador: sincroniza la pose, el aspecto y el chat de cada
// jugador con el resto de la sala. Los avatares remotos reutilizan el rig del
// jugador local (mismo modelo, animaciones, capa y sombrero) y se interpolan
// entre paquetes para moverse con suavidad aunque la red vaya a 12 Hz.

import { CanvasTexture, Sprite, SpriteMaterial } from 'three';
import { Player } from '../entities/Player.js';
import { SpeechBubble } from '../entities/SpeechBubble.js';

const POSE_RATE = 12;              // envíos de pose por segundo
const PROFILE_HEARTBEAT = 5;       // segundos entre reenvíos del perfil
const PEER_TIMEOUT = 20;           // segundos sin poses → se retira el avatar
const MAX_CHAT = 140;

// Bits del campo `f` de la pose.
const F_MOVING = 1;
const F_SPRINT = 2;
const F_GROUNDED = 4;
const F_RIDING = 8;

function makeNameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 54px system-ui, sans-serif';
  const width = Math.min(480, ctx.measureText(name).width + 48);
  const x = (512 - width) / 2;
  ctx.fillStyle = 'rgba(12, 36, 57, 0.82)';
  ctx.beginPath();
  ctx.roundRect(x, 20, width, 88, 22);
  ctx.fill();
  ctx.strokeStyle = '#e8a020';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 64, width - 30);
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

class RemoteAvatar {
  constructor(scene, id) {
    this.id = id;
    this.player = new Player();
    this.player.group.visible = false;
    scene.add(this.player.group);
    scene.add(this.player.cape.mesh);
    this.tag = new Sprite(new SpriteMaterial({ map: makeNameTag('Viajero'), transparent: true, depthTest: true }));
    this.tag.scale.set(2.8, 0.7, 1);
    this.tag.position.set(0, 2.75, 0);
    this.player.group.add(this.tag);
    this.bubble = new SpeechBubble();
    this.bubble.sprite.position.set(0, 3.5, 0);
    this.player.group.add(this.bubble.sprite);
    this.profile = { name: 'Viajero', score: 0 };
    this.target = null;
    this.current = null;
    this.lastSeen = performance.now() / 1000;
    this.scene = scene;
  }

  setProfile(profile) {
    const nameChanged = profile.name !== this.profile.name;
    this.profile = { ...this.profile, ...profile };
    if (nameChanged) {
      this.tag.material.map.dispose();
      this.tag.material.map = makeNameTag(String(profile.name || 'Viajero').slice(0, 24));
      this.tag.material.needsUpdate = true;
    }
    this.player.setSkin({
      shirt: profile.shirt,
      pants: profile.pants,
      cape: profile.cape,
      hat: profile.hat === undefined ? undefined : profile.hat,
    });
    if (typeof profile.capeVisible === 'boolean') this.player.setCapeVisible(profile.capeVisible);
  }

  setPose(pose) {
    this.target = pose;
    this.lastSeen = performance.now() / 1000;
    if (!this.current) {
      this.current = { ...pose };
      this.player.group.visible = true;
    }
  }

  update(dt) {
    if (!this.target || !this.current) return;
    const k = 1 - Math.exp(-dt * 12);
    const c = this.current;
    const t = this.target;
    c.x += (t.x - c.x) * k;
    c.y += (t.y - c.y) * k;
    c.z += (t.z - c.z) * k;
    let dr = t.r - c.r;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    c.r += dr * k;
    c.f = t.f;
    this.player.applyRemoteState(dt, {
      x: c.x,
      y: c.y,
      z: c.z,
      rotationY: c.r,
      isMoving: !!(t.f & F_MOVING),
      isSprinting: !!(t.f & F_SPRINT),
      isGrounded: !!(t.f & F_GROUNDED),
      riding: !!(t.f & F_RIDING),
    });
    this.bubble.update(dt);
  }

  dispose() {
    this.scene.remove(this.player.group);
    this.scene.remove(this.player.cape.mesh);
    this.tag.material.map.dispose();
    this.tag.material.dispose();
  }
}

export class Multiplayer {
  /**
   * @param {import('three').Scene} scene
   * @param {{
   *   transport: object,
   *   getProfile: () => object,
   *   onChat?: (name: string, text: string, isSelf: boolean) => void,
   *   onPeersChanged?: (count: number) => void,
   *   onSystem?: (text: string) => void,
   * }} opts
   */
  constructor(scene, { transport, getProfile, onChat, onPeersChanged, onSystem }) {
    this.scene = scene;
    this.transport = transport;
    this.getProfile = getProfile;
    this.onChat = onChat || (() => {});
    this.onPeersChanged = onPeersChanged || (() => {});
    this.onSystem = onSystem || (() => {});
    this.avatars = new Map();
    this._poseAcc = 0;
    this._profileAcc = 0;
    this._lastProfileJson = '';
    this.localBubble = null;
  }

  start(localPlayer) {
    this.local = localPlayer;
    this.localBubble = new SpeechBubble();
    this.localBubble.sprite.position.set(0, 3.5, 0);
    localPlayer.group.add(this.localBubble.sprite);

    const t = this.transport;
    t.on('pose', (pose, id) => {
      if (!pose || typeof pose.x !== 'number') return;
      this._avatar(id).setPose(pose);
    });
    t.on('profile', (profile, id) => {
      if (!profile || typeof profile !== 'object') return;
      const avatar = this._avatar(id);
      const isNew = avatar.profile.name === 'Viajero' && profile.name && profile.name !== 'Viajero';
      avatar.setProfile(profile);
      if (isNew) this.onSystem(`${profile.name} se unió a la aventura`);
      this.onPeersChanged(this.avatars.size);
    });
    t.on('chat', (msg, id) => {
      if (!msg || typeof msg.t !== 'string') return;
      const text = msg.t.slice(0, MAX_CHAT);
      const avatar = this._avatar(id);
      avatar.bubble.show(text, 5);
      this.onChat(avatar.profile.name || 'Viajero', text, false);
    });
    t.onPeerJoin((id) => {
      this._avatar(id);
      // Al llegar alguien le enviamos nuestro perfil directamente.
      t.send('profile', this._profilePayload(), id);
      this.onPeersChanged(this.avatars.size);
    });
    t.onPeerLeave((id) => {
      const avatar = this.avatars.get(id);
      if (avatar) {
        if (avatar.profile.name !== 'Viajero') this.onSystem(`${avatar.profile.name} salió de la aventura`);
        avatar.dispose();
        this.avatars.delete(id);
      }
      this.onPeersChanged(this.avatars.size);
    });
  }

  _avatar(id) {
    let avatar = this.avatars.get(id);
    if (!avatar) {
      avatar = new RemoteAvatar(this.scene, id);
      this.avatars.set(id, avatar);
      this.onPeersChanged(this.avatars.size);
    }
    return avatar;
  }

  _profilePayload() {
    const p = this.getProfile() || {};
    return {
      name: String(p.name || 'Viajero').slice(0, 24),
      shirt: p.shirt,
      pants: p.pants,
      cape: p.cape,
      hat: p.hat ?? null,
      capeVisible: !!p.capeVisible,
      score: p.score | 0,
      sites: p.sites | 0,
    };
  }

  /** Reenvía el perfil (tras cambiar skin, nombre o puntuación). */
  broadcastProfile() {
    const payload = this._profilePayload();
    this._lastProfileJson = JSON.stringify(payload);
    this.transport.send('profile', payload);
  }

  sendChat(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT);
    if (!clean) return;
    this.transport.send('chat', { t: clean });
    this.localBubble && this.localBubble.show(clean, 5);
    this.onChat(this._profilePayload().name, clean, true);
  }

  /** Lista de jugadores conectados (incluido el local) para el panel. */
  peersInfo() {
    const me = this._profilePayload();
    const list = [{ id: this.transport.selfId, name: me.name, score: me.score, self: true }];
    for (const avatar of this.avatars.values()) {
      list.push({ id: avatar.id, name: avatar.profile.name, score: avatar.profile.score | 0, self: false });
    }
    return list.sort((a, b) => b.score - a.score);
  }

  get onlineCount() {
    return this.avatars.size + 1;
  }

  update(dt, localPlayer) {
    // Envío de pose a ritmo fijo.
    this._poseAcc += dt;
    if (this._poseAcc >= 1 / POSE_RATE) {
      this._poseAcc = 0;
      const s = localPlayer.state;
      const flags = (s.isMoving ? F_MOVING : 0) | (s.isSprinting ? F_SPRINT : 0)
        | (s.isGrounded ? F_GROUNDED : 0) | (localPlayer.riding ? F_RIDING : 0);
      this.transport.send('pose', {
        x: Math.round(s.x * 100) / 100,
        y: Math.round(s.y * 100) / 100,
        z: Math.round(s.z * 100) / 100,
        r: Math.round(s.rotationY * 1000) / 1000,
        f: flags,
      });
    }
    // Perfil periódico (también sirve de latido y lleva la puntuación).
    this._profileAcc += dt;
    if (this._profileAcc >= PROFILE_HEARTBEAT) {
      this._profileAcc = 0;
      const json = JSON.stringify(this._profilePayload());
      if (json !== this._lastProfileJson) this.broadcastProfile();
      else this.transport.send('profile', this._profilePayload());
    }
    this.localBubble && this.localBubble.update(dt);

    // Avatares remotos.
    const now = performance.now() / 1000;
    for (const [id, avatar] of this.avatars) {
      if (now - avatar.lastSeen > PEER_TIMEOUT && avatar.current) {
        avatar.dispose();
        this.avatars.delete(id);
        this.onPeersChanged(this.avatars.size);
        continue;
      }
      avatar.update(dt);
    }
  }

  dispose() {
    for (const avatar of this.avatars.values()) avatar.dispose();
    this.avatars.clear();
    this.transport.leave();
  }
}
