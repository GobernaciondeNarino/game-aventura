// Game — orquestador principal de "Nariño Aventura 3D".
// Crea la escena, el renderer y la cámara; construye el mundo (caminos, sitios,
// complejo deportivo, paisaje, carreteras, laberinto, tienda), el entorno
// realista (terreno, atmósfera, césped, árboles, agua, hojas), los sistemas
// (balones, NPCs, fauna, patineta, progreso, inventario, ranking) y el HUD.
// Ejecuta el bucle de render y coordina puntuación, preguntas y eventos.

import { Scene, WebGLRenderer, PCFShadowMap, Clock } from 'three';

import { InputManager } from '../core/InputManager.js';
import { CameraRig } from '../core/CameraRig.js';
import { MouseLook } from '../core/MouseLook.js';
import { ColliderIndex, resolveCircles } from '../core/collision.js';

import { Player } from '../entities/Player.js';
import { BallSystem } from '../entities/BallSystem.js';
import { NpcSystem } from '../entities/NpcSystem.js';
import { FaunaSystem } from '../entities/FaunaSystem.js';
import { Skateboard } from '../entities/Skateboard.js';

import { buildPaths } from '../world/paths.js';
import { buildLandscape } from '../world/landscape.js';
import { buildRoads } from '../world/roads.js';
import { buildSportsComplex } from '../world/sportsComplex.js';
import { Maze } from '../world/Maze.js';
import { SiteManager } from '../world/SiteManager.js';
import { Scoreboard } from '../world/Scoreboard.js';
import { Shop } from '../world/Shop.js';
import { clampToWorld } from '../world/worldBounds.js';
import { MAZE, SKATE_SPAWN, buildGuardColliders } from '../world/worldLayout.js';

import { detectQuality, bakeWorkerCount } from '../environment/quality.js';
import { buildTerrain, heightAt } from '../environment/Terrain.js';
import { MAP_HALF, waterLevelAt } from '../environment/terrainMath.js';
import { Atmosphere } from '../environment/Atmosphere.js';
import { Grass } from '../environment/Grass.js';
import { Trees } from '../environment/Trees.js';
import { WaterBodies } from '../environment/WaterBodies.js';
import { Leaves } from '../environment/Leaves.js';
import { PostFX } from '../environment/Postprocessing.js';

import { createTransportFromUrl } from '../net/transports.js';
import { Multiplayer } from '../net/Multiplayer.js';
import { ChatBox } from '../ui/ChatBox.js';

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
import { PointerHint } from '../ui/PointerHint.js';
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
// Pendiente máxima que el jugador puede subir (subida / avance horizontal ≈ 42°).
const MAX_CLIMB = 0.9;
// Sensibilidad del ratón y del arrastre táctil para girar la cámara (rad/px).
const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_LOOK_SENSITIVITY = 0.006;
// Velocidad de giro con las flechas ← → cuando el ratón no dirige la cámara (rad/s).
const KEY_TURN_SPEED = 2.2;

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = detectQuality();
    const usePost = Boolean(this.quality.smaa || this.quality.bloom || this.quality.ambientOcclusion);

    this.scene = new Scene();
    this.renderer = new WebGLRenderer({ canvas, antialias: !usePost, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;

    // Cámara orbital (ratón / arrastre / flechas) con tres modos (tecla C).
    this.cameraRig = new CameraRig({ aspect: window.innerWidth / window.innerHeight, far: 2200 });
    this.camera = this.cameraRig.camera;
    this.input = new InputManager(window);
    this.mouseLook = new MouseLook(canvas);
    this._firstPerson = false;
    this._capeWasVisible = false;
    this.clock = new Clock();

    // Cielo físico, sol con sombras, niebla, mapa de entorno y nubes.
    this.atmosphere = new Atmosphere(this.scene, this.renderer, this.quality);

    // Jugador (con capa), apoyado sobre el terreno.
    this.player = new Player();
    this.player.state.x = 0;
    this.player.state.z = 10;
    this.player.state.y = heightAt(0, 10);
    this.player.group.position.set(0, this.player.state.y, 10);
    this.scene.add(this.player.group);
    this.scene.add(this.player.cape.mesh);

    // Mundo: caminos, sitios turísticos, marcador, complejo deportivo, paisaje, carreteras y tienda.
    const paths = buildPaths(this.scene);
    this.sites = new SiteManager(this.scene, { groundFn: heightAt, waterFn: waterLevelAt });
    this.scoreboard = new Scoreboard();
    this.scene.add(this.scoreboard.group);
    const sports = buildSportsComplex(this.scene);
    this.zones = sports.zones;
    this.landscape = buildLandscape(this.scene);
    const roads = buildRoads(this.scene);
    this.shop = new Shop(this.scene);

    // Colisionadores circulares compartidos por jugador, balones y NPCs,
    // indexados espacialmente (los árboles se añaden en `init`).
    this.colliders = [
      ...this.sites.getColliders(),
      ...buildGuardColliders(),
      ...paths.colliders,
      this.scoreboard.getCollider(),
      ...sports.colliders,
      ...this.landscape.colliders,
      ...roads.colliders,
      ...this.shop.colliders,
    ];
    this.colliderIndex = new ColliderIndex(this.colliders, 16);

    // Balones con porterías: cada gol suma 1 punto.
    this.balls = new BallSystem(this.scene, this.colliderIndex, sports.ballSpawns, {
      goalWalls: sports.goalWalls,
      goalZones: sports.goalZones,
      groundFn: heightAt,
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
    this.hud = hud;
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
    this.skate = new Skateboard(this.scene, { x: SKATE_SPAWN.x, z: SKATE_SPAWN.z, groundFn: heightAt });

    // Laberinto: al completarlo otorga puntos y una pista pendiente.
    this.maze = new Maze(
      this.scene,
      hud,
      { cx: MAZE.cx, cz: MAZE.cz, size: MAZE.size, cols: MAZE.cols },
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
      colliders: this.colliderIndex,
      progress: this.progress,
      groundFn: heightAt,
    });
    this.controlsHint = new ControlsHint(hud);
    this.pointerHint = new PointerHint(hud);
    if (isTouchDevice()) this.pointerHint.disable();
    this.minimap = new Minimap(hud, this.sites);
    this.fpsCounter = new FpsCounter(hud);
    this.sfx = new Sfx();
    this.faunaCard = new FaunaCard(hud);

    // Fauna: descubrir un animal muestra su ficha y suma puntos.
    this.fauna = new FaunaSystem(this.scene, {
      groundFn: heightAt,
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
    this.usersBtn = new UsersButton(hud, this.leaderboard, () => (this.net ? this.net.peersInfo() : []));
    this.nameModal = new NameModal(hud);
    this.rewardCard = new RewardCard(hud);

    // Inventario + interfaz de compra de la tienda.
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
    this._cPrev = false;

    this._handleResize = () => this.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', this._handleResize);
    this.resize(window.innerWidth, window.innerHeight);
    this.cameraRig.update(this.player.group, 0, true, heightAt);

    // Función de altura del terreno, expuesta para depuración/pruebas.
    this.heightAt = heightAt;
    this._ready = false;
    this._running = false;
    this._tick = this._tick.bind(this);
    this._focus = { x: 0, y: 0, z: 0 };
  }

  /**
   * Construye el entorno realista (parte asíncrona: el relieve se hornea en
   * Web Workers). Debe llamarse antes de `start()`.
   * @param {(message: string) => void} [onProgress]
   */
  async init(onProgress = () => {}) {
    const q = this.quality;
    onProgress('Modelando el relieve de Nariño…');
    const terrain = await buildTerrain({
      segments: q.terrainSegments,
      mapSize: q.mapSize,
      workers: bakeWorkerCount(),
    });
    this.terrain = terrain;
    this.scene.add(terrain.mesh);

    onProgress('Sembrando el césped…');
    this.grass = new Grass(this.scene, {
      heightTexture: terrain.heightTexture,
      surfaceTexture: terrain.surfaceTexture,
      mapHalf: MAP_HALF,
      mapSize: q.mapSize,
      quality: q,
    });
    this.leaves = new Leaves(this.scene, {
      heightTexture: terrain.heightTexture,
      mapHalf: MAP_HALF,
      count: q.leafParticles,
    });

    onProgress('Plantando bosques…');
    this.trees = new Trees(this.scene, { quality: q });
    await this.trees.build(this.renderer, this.scene.environment, this.atmosphere.sunDirection);
    for (const c of this.trees.colliders) this.colliderIndex.add(c);

    onProgress('Llenando lagos, ríos y el Pacífico…');
    this.water = new WaterBodies(this.scene, {
      sunDirection: this.atmosphere.sunDirection,
      quality: q,
      reflectionHide: [this.grass.mesh, this.leaves.mesh, this.trees.impostors].filter(Boolean),
    });

    this.postfx = new PostFX(this.renderer, this.scene, this.camera, q, window.innerWidth, window.innerHeight);
    this.resize(window.innerWidth, window.innerHeight);

    this._updateFocus();
    this.atmosphere.update(0, this._focus);
    this.trees.update(0, this._focus);
    this.grass.update(0, this._focus);
    this.cameraRig.update(this.player.group, 0, true, heightAt);
    this._setupMultiplayer();
    this._ready = true;
  }

  // Multijugador: P2P por defecto (sin servidor); ver net/transports.js para
  // las opciones de URL (?sala=, ?red=off, ?red=relay&relay=wss://...).
  _setupMultiplayer() {
    let transport = null;
    try {
      transport = createTransportFromUrl();
    } catch (err) {
      console.warn('[red] multijugador no disponible:', err?.message || err);
    }
    if (!transport) return;
    try {
      this._startMultiplayer(transport);
    } catch (err) {
      console.warn('[red] multijugador desactivado por error:', err);
      this.net = null;
    }
  }

  _startMultiplayer(transport) {
    this.chat = new ChatBox(this.hud, { onSend: (text) => this.net && this.net.sendChat(text) });
    this.net = new Multiplayer(this.scene, {
      transport,
      getProfile: () => this._netProfile(),
      onChat: (name, text, isSelf) => this.chat.addMessage(name, text, isSelf),
      onPeersChanged: (count) => this.chat.setOnline(count + 1),
      onSystem: (text) => this.chat.addMessage('', text, false, true),
    });
    this.net.start(this.player);
    this.chat.setOnline(1);
    this.net.broadcastProfile();
  }

  // Perfil que se comparte con los demás jugadores (nombre, aspecto, puntaje).
  _netProfile() {
    const shirt = this.inventory.getEquipped('shirt');
    const pants = this.inventory.getEquipped('pants');
    const cape = this.inventory.getEquipped('cape');
    const hat = this.inventory.getEquipped('hat');
    return {
      name: this.leaderboard.getLastName() || 'Viajero',
      shirt: shirt?.color,
      pants: pants?.color,
      cape: cape?.color,
      hat: hat?.type === 'none' ? null : { type: hat?.type, color: hat?.color },
      capeVisible: this._firstPerson ? this._capeWasVisible : this.player.cape.mesh.visible,
      score: this.progress.score,
      sites: this.progress.sitesCompleted,
    };
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
      this.net && this.net.broadcastProfile();
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
    this.net && this.net.broadcastProfile();
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
    if (this.postfx) this.postfx.render(dt);
    else this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._tick);
  }

  _updateFocus() {
    this._focus.x = this.player.state.x;
    this._focus.y = this.player.state.y;
    this._focus.z = this.player.state.z;
  }

  // Entorno vivo: viento, agua, nubes, sombras que siguen al jugador.
  _updateEnvironment(dt) {
    this._updateFocus();
    this.atmosphere.update(dt, this._focus);
    this.grass && this.grass.update(dt, this._focus);
    this.trees && this.trees.update(dt, this._focus);
    this.water && this.water.update(dt);
    this.leaves && this.leaves.update(dt, this._focus);
    this.net && this.net.update(dt, this.player);
  }

  // Actualización por frame: entrada, física del jugador, colisiones y sistemas.
  update(dt) {
    if (!this._ready) return;
    // Entrada: ratón (cámara + clics), arrastre táctil y flancos de teclas.
    const look = this.mouseLook.consume();
    const touchLook = this.touch ? this.touch.consumeLook() : null;
    const eEdge = this._keyEdge('KeyE', '_ePrev');
    const fEdge = this._keyEdge('KeyF', '_fPrev') || (look.locked && look.left);
    const gEdge = this._keyEdge('KeyG', '_gPrev') || look.right;
    const hEdge = this._keyEdge('KeyH', '_hPrev');
    const bEdge = this._keyEdge('KeyB', '_bPrev');
    const cEdge = this._keyEdge('KeyC', '_cPrev');

    this._updateEnvironment(dt);

    const uiOpen = this.paused || Boolean(this.shopUI && this.shopUI.isOpen);
    if (uiOpen && look.locked) this.mouseLook.unlock();
    this.pointerHint.update(look.locked, uiOpen);
    if (cEdge && !uiOpen) this._cycleCameraMode();

    // El cursor da la dirección: el ratón capturado (o el arrastre táctil) gira la cámara.
    if (look.locked && !uiOpen) this.cameraRig.rotate(-look.dx * MOUSE_SENSITIVITY, look.dy * MOUSE_SENSITIVITY);
    if (touchLook && !uiOpen) this.cameraRig.rotate(-touchLook.dx * TOUCH_LOOK_SENSITIVITY, touchLook.dy * TOUCH_LOOK_SENSITIVITY);

    // Pausa (pregunta abierta): solo se animan sitios y cámara.
    if (this.paused) {
      this.sites.update(dt, this.player.state.x, this.player.state.z);
      this._updateCamera(dt);
      return;
    }
    // Tienda abierta: solo se anima el tendero y la cámara.
    if (this.shopUI && this.shopUI.isOpen) {
      this.shop.update(dt);
      this._updateCamera(dt);
      return;
    }

    const prevX = this.player.state.x;
    const prevZ = this.player.state.z;
    const prevGround = heightAt(prevX, prevZ);
    const cmd = this._buildCommand(dt, look, fEdge || gEdge);
    this.player.update(dt, cmd, heightAt);

    // Pendientes demasiado empinadas: el terreno actúa como muro natural.
    const moved = Math.hypot(this.player.state.x - prevX, this.player.state.z - prevZ);
    if (moved > 1e-4 && this.player.state.isGrounded) {
      const rise = heightAt(this.player.state.x, this.player.state.z) - prevGround;
      if (rise > moved * MAX_CLIMB) {
        this.player.state.x = prevX;
        this.player.state.z = prevZ;
        this.player.state.y = prevGround;
      }
    }

    // Colisiones: círculos del mundo → laberinto → tienda → límites del mundo.
    const afterCircles = resolveCircles(this.colliderIndex, this.player.state.x, this.player.state.z);
    const afterMaze = this.maze.collide(afterCircles.x, afterCircles.z);
    const afterShop = this.shop.collide(afterMaze.x, afterMaze.z);
    const resolved = this._applyWorldBounds(afterShop.x, afterShop.z);
    if (resolved.x !== this.player.state.x || resolved.z !== this.player.state.z) {
      this.player.state.x = resolved.x;
      this.player.state.z = resolved.z;
      if (this.player.state.isGrounded) this.player.state.y = heightAt(resolved.x, resolved.z);
    }
    const lift = this.player.riding ? 0.4 : 0;
    this.player.group.position.set(this.player.state.x, this.player.state.y + lift, this.player.state.z);

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
    this._updateCamera(dt);
  }

  // Flanco de pulsación de una tecla (true solo en el frame en que se pulsa).
  _keyEdge(code, prevKey) {
    const down = this.input.isPressed(code);
    const edge = down && !this[prevKey];
    this[prevKey] = down;
    return edge;
  }

  /**
   * Traduce la entrada a una orden relativa a la cámara: ↑/W y ↓/S avanzan y
   * retroceden hacia donde mira la cámara; ←/A y →/D se desplazan lateralmente
   * cuando el ratón (o el táctil) dirige la cámara y, si no, la giran como en
   * un control clásico. El cuerpo se orienta hacia donde camina; al patear,
   * agarrar o en primera persona mira hacia donde apunta la cámara.
   */
  _buildCommand(dt, look, actionEdge) {
    const input = this.input;
    const forward = (input.isPressed('KeyW') ? 1 : 0) + (input.isPressed('KeyS') ? -1 : 0);
    const side = (input.isPressed('KeyD') ? 1 : 0) + (input.isPressed('KeyA') ? -1 : 0);
    const pointerControl = look.locked || Boolean(this.touch);
    let moveX = 0;
    if (pointerControl) moveX = side;
    else if (side !== 0) this.cameraRig.rotate(-side * KEY_TURN_SPEED * dt, 0);
    const yaw = this.cameraRig.yaw;
    const firstPerson = Boolean(this.cameraRig.mode.firstPerson);
    const faceCamera = firstPerson || actionEdge || (!pointerControl && side !== 0);
    return {
      moveX,
      moveZ: forward,
      yaw,
      faceYaw: faceCamera ? yaw : null,
      snap: actionEdge || firstPerson,
      sprint: input.isPressed('ShiftLeft') || input.isPressed('ShiftRight'),
      jump: input.isPressed('Space'),
    };
  }

  // Tecla C: alterna tercera persona → panorámica → primera persona.
  _cycleCameraMode() {
    const mode = this.cameraRig.cycleMode();
    const firstPerson = Boolean(mode.firstPerson);
    if (firstPerson !== this._firstPerson) {
      this._firstPerson = firstPerson;
      if (firstPerson) {
        this._capeWasVisible = this.player.cape.mesh.visible;
        this.player.cape.mesh.visible = false;
      } else if (this._capeWasVisible) {
        this.player.cape.mesh.visible = true;
      }
      this.player.group.visible = !firstPerson;
    }
    this.toast.show(`📷 Cámara: ${mode.name}`, 1800);
    this.sfx && this.sfx.zone && this.sfx.zone();
  }

  _updateCamera(dt) {
    this.cameraRig.update(this.player.group, dt, false, heightAt);
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
    this.postfx && this.postfx.setSize(width, height);
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._handleResize);
    this.input.dispose();
    this.mouseLook.dispose();
    this.renderer.dispose();
  }
}
