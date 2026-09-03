// Game — orquestador principal de "Nariño Aventura 3D".
// Crea la escena, el renderer y la cámara; construye el mundo (caminos, sitios,
// complejo deportivo, paisaje, carreteras, laberinto, tienda), los sistemas
// (balones, NPCs, fauna, patineta, progreso, inventario, ranking) y el HUD.
// Ejecuta el bucle de render y coordina puntuación, preguntas y eventos.

import {
  Scene,
  WebGLRenderer,
  PCFSoftShadowMap,
  Vector3,
  Clock,
  AmbientLight,
  DirectionalLight,
} from 'three';

import { InputManager } from '../core/InputManager.js';
import { CameraRig } from '../core/CameraRig.js';
import { resolveCircles } from '../core/collision.js';

import { Player } from '../entities/Player.js';
import { BallSystem } from '../entities/BallSystem.js';
import { NpcSystem } from '../entities/NpcSystem.js';
import { FaunaSystem } from '../entities/FaunaSystem.js';
import { Skateboard } from '../entities/Skateboard.js';

import { setupEnvironment } from '../world/environment.js';
import { buildPaths } from '../world/paths.js';
import { buildLandscape } from '../world/landscape.js';
import { buildRoads } from '../world/roads.js';
import { buildSportsComplex } from '../world/sportsComplex.js';
import { Maze } from '../world/Maze.js';
import { SiteManager } from '../world/SiteManager.js';
import { Scoreboard } from '../world/Scoreboard.js';
import { Shop } from '../world/Shop.js';
import { clampToWorld } from '../world/worldBounds.js';

import { REWARDS } from '../data/rewards.js';
import { SHOP_ITEMS } from '../data/shopItems.js';

import { Progress } from '../systems/Progress.js';
import { Inventory } from '../systems/Inventory.js';
import { Leaderboard } from '../systems/Leaderboard.js';
import { Sfx } from '../systems/Sfx.js';

import { InfoPanel } from '../ui/InfoPanel.js';
import { QuestionPanel } from '../ui/QuestionPanel.js';
import { AudioToggle } from '../ui/AudioToggle.js';
import { Toast } from '../ui/Toast.js';
import { ControlsHint } from '../ui/ControlsHint.js';
import { Minimap } from '../ui/Minimap.js';
import { FaunaCard } from '../ui/FaunaCard.js';
import { InfoButton } from '../ui/InfoButton.js';
import { UsersButton } from '../ui/UsersButton.js';
import { NameModal } from '../ui/NameModal.js';
import { RewardCard } from '../ui/RewardCard.js';
import { FpsCounter } from '../ui/FpsCounter.js';
import { TouchControls, isTouchDevice } from '../ui/TouchControls.js';
import { ShopUI } from '../ui/ShopUI.js';

// Límite del delta de tiempo por frame (evita saltos tras pestañas inactivas).
const MAX_DELTA = 0.05;
// Retardo del regalo de bienvenida tras iniciar la partida.
const WELCOME_GIFT_DELAY_MS = 1e4;
// Precio máximo de los artículos candidatos al regalo de bienvenida.
const WELCOME_GIFT_MAX_PRICE = 220;
// Retardo entre completar un sitio y abrir el modal de nombre.
const SITE_COMPLETED_DELAY_MS = 1600;
// Duración de los avisos del laberinto y retardo del aviso de patineta.
const MAZE_TOAST_MS = 6e3;
const SKATE_UNLOCK_TOAST_DELAY_MS = 4e3;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new Scene();
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    // Cámara en tercera persona que sigue al jugador.
    this.cameraRig = new CameraRig({
      aspect: window.innerWidth / window.innerHeight,
      far: 1200,
      offset: new Vector3(0, 4, -7),
      lookOffset: new Vector3(0, 1.5, 0),
    });
    this.camera = this.cameraRig.camera;
    this.input = new InputManager(window);
    this.clock = new Clock();

    this._buildLights();
    setupEnvironment(this.scene);

    // Jugador (con capa).
    this.player = new Player();
    this.player.state.x = 0;
    this.player.state.z = 10;
    this.player.group.position.set(0, 0, 10);
    this.scene.add(this.player.group);
    this.scene.add(this.player.cape.mesh);

    // Mundo: caminos, sitios turísticos, marcador, complejo deportivo, paisaje y carreteras.
    const paths = buildPaths(this.scene);
    this.sites = new SiteManager(this.scene);
    this.scoreboard = new Scoreboard();
    this.scene.add(this.scoreboard.group);
    const sports = buildSportsComplex(this.scene);
    this.zones = sports.zones;
    this.landscape = buildLandscape(this.scene);
    const roads = buildRoads(this.scene);

    // Colisionadores circulares compartidos por jugador, balones y NPCs.
    this.colliders = [
      ...this.sites.getColliders(),
      ...paths.colliders,
      this.scoreboard.getCollider(),
      ...sports.colliders,
      ...this.landscape.colliders,
      ...roads.colliders,
    ];

    // Balones con porterías: cada gol suma 1 punto.
    this.balls = new BallSystem(this.scene, this.colliders, sports.ballSpawns, {
      goalWalls: sports.goalWalls,
      goalZones: sports.goalZones,
      onGoal: () => {
        this.progress.addScore(1);
        this.scoreboard.updateStats(this.progress.stats());
        this.toast.show('¡Anotación! +1');
        this.sfx && this.sfx.goal();
      },
    });

    // Progreso (preguntas, zonas, puntuación).
    this.progress = new Progress();
    this.progress.zonesTotal = this.zones.length;
    this.scoreboard.updateStats(this.progress.stats());

    // HUD.
    const hud = document.getElementById('hud') || document.body;
    this.infoPanel = new InfoPanel(hud);
    this.paused = false;
    this.questionPanel = new QuestionPanel(hud, {
      onAnswer: (site, questionIndex, choice) => this._onAnswer(site, questionIndex, choice),
      onClose: () => {
        this.paused = false;
      },
    });
    this.audioToggle = new AudioToggle(hud);
    this.toast = new Toast(hud);

    // Patineta (se desbloquea al completar el laberinto).
    this.skate = new Skateboard(this.scene, { x: 5, z: -140 });

    // Laberinto: al completarlo otorga puntos y una pista pendiente.
    this.maze = new Maze(
      this.scene,
      hud,
      { cx: 0, cz: -185, size: 74, cols: 11 },
      (points) => {
        this.progress.addScore(points);
        this.scoreboard.updateStats(this.progress.stats());
        this.sfx && this.sfx.maze();
        const hint = this.progress.getRandomPendingHint();
        this.toast.show(
          hint ? `💎 Pista: ${hint}` : `💎 +${points} · ¡Ya respondiste todo!`,
          MAZE_TOAST_MS,
        );
        this.skate.unlock() &&
          setTimeout(
            () => this.toast.show('🛹 ¡Patineta desbloqueada! (tecla B para montar)', MAZE_TOAST_MS),
            SKATE_UNLOCK_TOAST_DELAY_MS,
          );
      },
    );

    this.npcs = new NpcSystem(this.scene, {
      colliders: this.colliders,
      progress: this.progress,
    });
    this.controlsHint = new ControlsHint(hud);
    this.minimap = new Minimap(hud, this.sites);
    this.fpsCounter = new FpsCounter(hud);
    this.sfx = new Sfx();
    this.faunaCard = new FaunaCard(hud);

    // Fauna: descubrir un animal muestra su ficha y suma puntos.
    this.fauna = new FaunaSystem(this.scene, {
      onDiscover: (animal) => {
        this.progress.addScore(animal.points);
        this.scoreboard.updateStats(this.progress.stats());
        this.faunaCard.show(animal);
        this.toast.show(`🐾 ${animal.name} · +${animal.points}`);
        this.sfx && this.sfx.zone();
      },
    });

    this.leaderboard = new Leaderboard();
    this.infoBtn = new InfoButton(hud);
    this.usersBtn = new UsersButton(hud, this.leaderboard);
    this.nameModal = new NameModal(hud);
    this.rewardCard = new RewardCard(hud);

    // Tienda 3D + inventario + interfaz de compra.
    this.shop = new Shop(this.scene);
    this.colliders.push(...this.shop.colliders);
    this.inventory = new Inventory(this.leaderboard.getLastName());
    this.shopUI = new ShopUI(hud, {
      onBuy: (item) => {
        this.toast.show(`✓ Comprado: ${item.name}`, 2500);
        this.scoreboard.updateStats(this.progress.stats());
        this._applyEquippedSkin();
      },
      onEquip: () => this._applyEquippedSkin(),
      onClose: () => {
        this._shopOpen = false;
        this._shopDismissed = true;
      },
    });
    this._shopOpen = false;
    this._inShopZone = false;
    this._shopDismissed = false;
    this._applyEquippedSkin();
    setTimeout(() => this._welcomeGift(), WELCOME_GIFT_DELAY_MS);

    // Controles táctiles en dispositivos móviles.
    if (isTouchDevice()) this.touch = new TouchControls(hud, this.input);

    // Estado previo de teclas para detectar flancos de pulsación.
    this._ePrev = false;
    this._fPrev = false;
    this._gPrev = false;
    this._hPrev = false;
    this._bPrev = false;

    this._handleResize = () => this.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', this._handleResize);
    this.resize(window.innerWidth, window.innerHeight);
    this.cameraRig.update(this.player.group, true);

    this._running = false;
    this._tick = this._tick.bind(this);
  }

  // Respuesta a una pregunta: actualiza progreso, sonido y capa; al completar el sitio lo marca.
  _onAnswer(site, questionIndex, choice) {
    const result = this.progress.answer(site.id, questionIndex, choice);
    this.scoreboard.updateStats(this.progress.stats());
    this.sfx && (result.correct ? this.sfx.correct() : this.sfx.wrong());
    if (this.progress.answeredCount >= 3) this.player.setCapeVisible(true);
    if (result.siteCompleted) {
      const siteObject = this.sites.getById(site.id);
      siteObject && siteObject.markVisited();
      setTimeout(() => this._onSiteCompleted(site), SITE_COMPLETED_DELAY_MS);
    }
    return result;
  }

  // Sitio completado: pide el nombre, guarda en el ranking y muestra la recompensa.
  _onSiteCompleted(site) {
    const reward = REWARDS[site.id];
    this.nameModal.open(site.name, this.leaderboard.getLastName(), (name) => {
      this.leaderboard.upsert({
        name,
        score: this.progress.score,
        sites: this.progress.sitesCompleted,
        rewards: reward ? [reward.icon] : [],
      });
      this.inventory.setPlayerName(name);
      this._applyEquippedSkin();
      reward && this.rewardCard.show(reward);
    });
  }

  // Aplica al jugador (y a la patineta) los artículos equipados en el inventario.
  _applyEquippedSkin() {
    if (!this.inventory) return;
    const shirt = this.inventory.getEquipped('shirt');
    const pants = this.inventory.getEquipped('pants');
    const cape = this.inventory.getEquipped('cape');
    const hat = this.inventory.getEquipped('hat');
    const skate = this.inventory.getEquipped('skate');
    this.player.setSkin({
      shirt: shirt?.color,
      pants: pants?.color,
      cape: cape?.color,
      hat: hat?.type === 'none' ? null : { type: hat?.type, color: hat?.color },
    });
    skate && this.skate.setBorderColor(skate.color);
  }

  // Regalo de bienvenida: un artículo aleatorio (gorro, camiseta o patineta) no poseído.
  _welcomeGift() {
    const candidates = SHOP_ITEMS.filter(
      (item) =>
        !item.free &&
        item.price <= WELCOME_GIFT_MAX_PRICE &&
        (item.cat === 'hat' || item.cat === 'shirt' || item.cat === 'skate') &&
        !this.inventory.isOwned(item.id),
    );
    if (!candidates.length) return;
    const gift = candidates[Math.floor(Math.random() * candidates.length)];
    this.inventory.grant(gift.id);
    this.toast.show(`🎁 ¡Regalo: ${gift.name}! Visita la tienda al sur-este para equiparlo.`, 7e3);
  }

  // Luz ambiente + sol direccional con sombras.
  _buildLights() {
    const ambient = new AmbientLight(16777215, 0.85);
    this.scene.add(ambient);
    const sun = new DirectionalLight(16775920, 1.2);
    sun.position.set(40, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90;
    sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90;
    sun.shadow.camera.bottom = -90;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 260;
    this.scene.add(sun);
    this.sun = sun;
  }

  start() {
    if (this._running) return;
    this._running = true;
    this.clock.start();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
  }

  // Bucle de render.
  _tick() {
    if (!this._running) return;
    const dt = Math.min(this.clock.getDelta(), MAX_DELTA);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._tick);
  }

  // Actualización por frame: entrada, física del jugador, colisiones y sistemas.
  update(dt) {
    const eDown = this.input.isPressed('KeyE');
    const eEdge = eDown && !this._ePrev;
    this._ePrev = eDown;
    const fDown = this.input.isPressed('KeyF');
    const fEdge = fDown && !this._fPrev;
    this._fPrev = fDown;
    const gDown = this.input.isPressed('KeyG');
    const gEdge = gDown && !this._gPrev;
    this._gPrev = gDown;
    const hDown = this.input.isPressed('KeyH');
    const hEdge = hDown && !this._hPrev;
    this._hPrev = hDown;
    const bDown = this.input.isPressed('KeyB');
    const bEdge = bDown && !this._bPrev;
    this._bPrev = bDown;

    // Pausa (pregunta abierta): solo se animan sitios y cámara.
    if (this.paused) {
      this.sites.update(dt, this.player.state.x, this.player.state.z);
      this.cameraRig.update(this.player.group);
      return;
    }
    // Tienda abierta: solo se anima el tendero y la cámara.
    if (this.shopUI && this.shopUI.isOpen) {
      this.shop.update(dt);
      this.cameraRig.update(this.player.group);
      return;
    }

    this.player.update(dt, this.input);

    // Colisiones: círculos del mundo → laberinto → tienda → límites del mundo.
    const afterCircles = resolveCircles(this.colliders, this.player.state.x, this.player.state.z);
    const afterMaze = this.maze.collide(afterCircles.x, afterCircles.z);
    const afterShop = this.shop.collide(afterMaze.x, afterMaze.z);
    const resolved = this._applyWorldBounds(afterShop.x, afterShop.z);
    if (resolved.x !== this.player.state.x || resolved.z !== this.player.state.z) {
      this.player.state.x = resolved.x;
      this.player.state.z = resolved.z;
      this.player.group.position.x = resolved.x;
      this.player.group.position.z = resolved.z;
    }

    // Sitio turístico activo: panel informativo y pregunta con la tecla E.
    const activeSite = this.sites.update(dt, this.player.state.x, this.player.state.z);
    if (activeSite) {
      this.infoPanel.show(activeSite, this._siteStatus(activeSite));
      eEdge && this._tryOpenQuestion(activeSite);
    } else {
      this.infoPanel.hide();
    }

    this._checkZones();
    this.balls.update(dt, this.player, { fEdge, gEdge });
    this.maze.update(dt, this.player.state.x, this.player.state.z);
    this.player.setMazeGlow(this.maze.active);
    this.npcs.update(dt, this.player, { hEdge });
    this.skate.update(dt, this.player, bEdge);
    this.fauna.update(dt, this.player);
    this.landscape.tick(dt);
    this.shop.update(dt);
    this._updateShopTrigger();
    this.minimap.update(this.player);
    this.fpsCounter.tick(dt);

    if (!activeSite && this.balls.nearBall(this.player.state.x, this.player.state.z)) {
      this.controlsHint.show();
    } else {
      this.controlsHint.hide();
    }
    this.cameraRig.update(this.player.group);
  }

  // Abre/cierra la tienda al entrar o salir del área del tendero.
  _updateShopTrigger() {
    const x = this.player.state.x;
    const z = this.player.state.z;
    const nearNpc = this.shop.isNearNpc(x, z);
    if (nearNpc && !this._inShopZone) {
      this._inShopZone = true;
      if (!this._shopDismissed) {
        this.shop.greet();
        if (!this._shopOpen) {
          this.shopUI.show(this.inventory, this.progress);
          this._shopOpen = true;
        }
      }
    } else if (!nearNpc && this._inShopZone) {
      this._inShopZone = false;
      this.shop.farewell();
      if (this._shopOpen) {
        this.shopUI.hide();
        this._shopOpen = false;
      }
      this._shopDismissed = false;
    }
  }

  // Zonas deportivas: la primera visita a cada una otorga puntos.
  _checkZones() {
    const x = this.player.state.x;
    const z = this.player.state.z;
    for (const zone of this.zones) {
      if (
        Math.abs(x - zone.x) <= zone.hw &&
        Math.abs(z - zone.z) <= zone.hd &&
        this.progress.visitZone(zone.id, zone.points)
      ) {
        this.toast.show(`+${zone.points} · ${zone.name}`);
        this.scoreboard.updateStats(this.progress.stats());
        this.sfx && this.sfx.zone();
      }
    }
  }

  _applyWorldBounds(x, z) {
    return clampToWorld(x, z);
  }

  // Estado del sitio para el panel informativo: completado, en espera o disponible.
  _siteStatus(site) {
    return this.progress.isSiteComplete(site.id)
      ? { type: 'done' }
      : this.progress.isOnCooldown(site.id)
        ? { type: 'cooldown', seconds: this.progress.cooldownRemaining(site.id) }
        : { type: 'prompt' };
  }

  // Abre la siguiente pregunta pendiente del sitio (si no está completo ni en espera).
  _tryOpenQuestion(site) {
    if (this.progress.isSiteComplete(site.id) || this.progress.isOnCooldown(site.id)) return;
    const next = this.progress.getNextQuestion(site.id);
    if (next) {
      this.paused = true;
      this.questionPanel.open(site, next.index, next.question);
    }
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.cameraRig.setAspect(width / height);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._handleResize);
    this.input.dispose();
    this.renderer.dispose();
  }
}
