// Sistema de NPCs: puebla el mundo con errantes (Wanderer) y NPCs de pistas
// (HintNpc) junto a cada sitio turístico. Gestiona su movimiento, colisiones
// con el mundo, con el jugador y entre ellos, los bocadillos de charla y las
// pistas de las preguntas. Los errantes lejanos se actualizan con menor
// frecuencia (throttling) para ahorrar CPU.
import { Wanderer } from './Wanderer.js';
import { HintNpc } from './HintNpc.js';
import { SpeechBubble } from './SpeechBubble.js';
import { HAIR_COLORS } from './npcBuilder.js';
import { SITES } from '../world/sitesData.js';
import { resolveCircles } from '../core/collision.js';
import { clampToWorld } from '../world/worldBounds.js';

export const NPC_PHRASES = [
  '¡Bonito día!',
  'He oído cosas sobre este lugar…',
  'Cuidado por dónde caminas',
  '¿Ya visitaste Las Lajas?',
  'Nariño es hermoso, ¿verdad?',
  '¡El carnaval es lo mejor!',
  'Dicen que el Galeras sigue activo',
  '¿Probaste el cuy asado?',
  'La Laguna de La Cocha es mágica',
  '¡Sigue explorando, viajero!',
];

const WANDERER_COUNT = 16;
const BUBBLE_DISTANCE = 3;
const HINT_DISTANCE = 3.5;
const BUBBLE_COOLDOWN_MS = 8e3;
const THROTTLE_DISTANCE = 40;
const THROTTLE_INTERVAL = .1;

const PLAYER_RADIUS = .5;
const HINT_FALLBACK = 'Observa bien el lugar…';

// Centros secundarios de deambulación (rotondas y extremos de las vías).
const LOCAL_WANDER_CENTERS = [
  [92, 0],
  [-92, 0],
  [0, -92],
  [120, 0],
  [-150, 0],
];

export class NpcSystem {
  constructor(scene, { colliders = [], progress } = {}) {
    this.colliders = colliders;
    this.progress = progress;
    this.wanderers = [];
    this.hintNpcs = [];

    // Errantes repartidos en anillo alrededor del centro.
    for (let i = 0; i < WANDERER_COUNT; i++) {
      const angle = i / WANDERER_COUNT * Math.PI * 2 + Math.random();
      const distance = 22 + Math.random() * 40;
      this._addWanderer(scene, Math.sin(angle) * distance, Math.cos(angle) * distance, 85, 0, 0);
    }

    // Errantes con pelo largo.
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 45;
      const appearance = {
        hat: 'hairLong',
        hatColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
      };
      this._addWanderer(scene, Math.sin(angle) * distance, Math.cos(angle) * distance, 85, 0, 0, appearance);
    }

    // Errantes en la playa.
    for (let i = 0; i < 5; i++) {
      const x = 230 + Math.random() * 40;
      const z = -120 + Math.random() * 240;
      this._addWanderer(scene, x, z, 80, 250, 0);
    }

    // Errantes locales cerca de puntos de interés.
    for (const [cx, cz] of LOCAL_WANDER_CENTERS) {
      this._addWanderer(scene, cx + (Math.random() - .5) * 10, cz + (Math.random() - .5) * 10, 22, cx, cz);
    }

    // Un NPC de pistas por sitio, colocado hacia el centro del mundo, fuera
    // del radio sólido del sitio.
    for (const site of SITES) {
      const distanceFromOrigin = Math.hypot(site.position.x, site.position.z) || 1;
      const offset = (site.solidRadius || 8) + 3;
      const x = site.position.x - site.position.x / distanceFromOrigin * offset;
      const z = site.position.z - site.position.z / distanceFromOrigin * offset;
      const hintNpc = new HintNpc({ x, z });
      hintNpc.siteId = site.id;
      this._attachBubble(hintNpc);
      scene.add(hintNpc.group);
      this.hintNpcs.push(hintNpc);
    }
  }

  _addWanderer(scene, x, z, bounds, boundCX, boundCZ, appearance) {
    const wanderer = new Wanderer({ x, z, bounds, boundCX, boundCZ, appearance });
    this._attachBubble(wanderer);
    scene.add(wanderer.group);
    this.wanderers.push(wanderer);
  }

  _attachBubble(npc) {
    npc.bubble = new SpeechBubble();
    npc.group.add(npc.bubble.sprite);
    npc._bubbleCd = 0;
  }

  // `hEdge`: flanco de la tecla de interacción (H) en este fotograma.
  update(dt, player, { hEdge = false } = {}) {
    const now = Date.now();
    const playerX = player.state.x;
    const playerZ = player.state.z;

    for (const wanderer of this.wanderers) {
      const distance = Math.hypot(wanderer.state.x - playerX, wanderer.state.z - playerZ);
      let stepDt = dt;
      if (distance > THROTTLE_DISTANCE) {
        // Lejos del jugador: acumular tiempo y actualizar solo cada THROTTLE_INTERVAL.
        wanderer._throttleAcc = (wanderer._throttleAcc || 0) + dt;
        if (wanderer._throttleAcc < THROTTLE_INTERVAL) continue;
        stepDt = wanderer._throttleAcc;
        wanderer._throttleAcc = 0;
      } else {
        wanderer._throttleAcc = 0;
      }

      const speed = wanderer.updateBehavior(stepDt);
      wanderer.state = Wanderer.stepWander(wanderer.state, stepDt, Math.random, speed, wanderer.bounds, wanderer.boundCX, wanderer.boundCZ);
      const resolved = resolveCircles(this.colliders, wanderer.state.x, wanderer.state.z, wanderer.radius);
      const clamped = clampToWorld(resolved.x, resolved.z);
      wanderer.state.x = clamped.x;
      wanderer.state.z = clamped.z;
      this._playerCollide(wanderer, player);
      wanderer.animate(stepDt);
      wanderer.applyPose();
      wanderer.bubble.update(stepDt);
      if (!wanderer.bubble.visible && now > wanderer._bubbleCd && distance < BUBBLE_DISTANCE) {
        wanderer.bubble.show(NPC_PHRASES[Math.floor(Math.random() * NPC_PHRASES.length)], 3);
        wanderer._bubbleCd = now + BUBBLE_COOLDOWN_MS;
      }
    }

    this._npcVsNpc();

    for (const hintNpc of this.hintNpcs) {
      hintNpc.state = HintNpc.stepTethered(hintNpc.state, dt, hintNpc.spawnX, hintNpc.spawnZ, Math.random);
      const resolved = resolveCircles(this.colliders, hintNpc.state.x, hintNpc.state.z, hintNpc.radius);
      hintNpc.state.x = resolved.x;
      hintNpc.state.z = resolved.z;
      this._playerCollide(hintNpc, player);
      hintNpc.animateWalk(dt);
      hintNpc.applyPose();
      hintNpc.bubble.update(dt);
    }

    if (hEdge) this._tryHint(playerX, playerZ, now);
  }

  // Busca el NPC de pistas más cercano y muestra la pista (o pide esperar).
  _tryHint(playerX, playerZ, now) {
    let nearest = null;
    let nearestDistance = HINT_DISTANCE;
    for (const hintNpc of this.hintNpcs) {
      const distance = Math.hypot(hintNpc.state.x - playerX, hintNpc.state.z - playerZ);
      if (distance < nearestDistance) {
        nearest = hintNpc;
        nearestDistance = distance;
      }
    }
    if (nearest) {
      if (!nearest.isReady(now)) {
        nearest.bubble.show('Dame un momento… (espera)', 2);
        return;
      }
      nearest.bubble.show(this._hintText(nearest.siteId), 6);
      nearest.triggerCooldown(now);
    }
  }

  _hintText(siteId) {
    if (!this.progress) return HINT_FALLBACK;
    const next = this.progress.getNextQuestion(siteId);
    return next ? next.question.hint || HINT_FALLBACK : '¡Ya respondiste todo de este sitio!';
  }

  // Separa NPC y jugador repartiendo la penetración a partes iguales.
  _playerCollide(npc, player) {
    const dx = npc.state.x - player.state.x;
    const dz = npc.state.z - player.state.z;
    const minDistance = npc.radius + PLAYER_RADIUS;
    const distance = Math.hypot(dx, dz);
    if (distance < minDistance && distance > .001) {
      const push = (minDistance - distance) * .5;
      const nx = dx / distance;
      const nz = dz / distance;
      npc.state.x += nx * push;
      npc.state.z += nz * push;
      player.state.x -= nx * push;
      player.state.z -= nz * push;
      player.group.position.x = player.state.x;
      player.group.position.z = player.state.z;
    }
  }

  // Separa errantes entre sí; el primero cambia de rumbo al chocar.
  _npcVsNpc() {
    const wanderers = this.wanderers;
    for (let i = 0; i < wanderers.length; i++) {
      for (let j = i + 1; j < wanderers.length; j++) {
        const a = wanderers[i];
        const b = wanderers[j];
        const dx = b.state.x - a.state.x;
        const dz = b.state.z - a.state.z;
        const minDistance = a.radius + b.radius;
        const distance = Math.hypot(dx, dz);
        if (distance < minDistance && distance > .001) {
          const push = (minDistance - distance) * .5;
          const nx = dx / distance;
          const nz = dz / distance;
          a.state.x -= nx * push;
          a.state.z -= nz * push;
          b.state.x += nx * push;
          b.state.z += nz * push;
          a.changeDirection();
        }
      }
    }
  }
}
