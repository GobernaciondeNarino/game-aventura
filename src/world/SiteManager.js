// Gestor de sitios turísticos: instancia cada Site a partir de sitesData,
// lo agrega a la escena y en cada frame anima las maquetas y determina cuál
// está activo (cerca del jugador). También expone colisiones y búsqueda por id.
//
// Cada builder recibe un contexto con la cota local del terreno para apoyar
// sus piezas en el relieve (terrazas, laderas de volcán, orillas).
import { SITES, siteRotation, siteBaseY } from './sitesData.js';
import { SITE_BUILDERS } from './siteBuilders.js';
import { Site, findActiveSite, resolveSiteCollisions } from './Site.js';

export class SiteManager {
  /**
   * @param {import('three').Scene} scene
   * @param {object} [options]
   * @param {(x:number, z:number) => number} [options.groundFn] cota del terreno
   * @param {(x:number, z:number) => number|null} [options.waterFn] nivel del agua o null
   * @param {object[]} [options.sitesData]
   */
  constructor(scene, { groundFn = () => 0, waterFn = () => null, sitesData = SITES } = {}) {
    this.sites = [];
    for (const data of sitesData) {
      const builder = SITE_BUILDERS[data.builderFn];
      if (!builder) {
        console.warn(`Sin builder para sitio "${data.id}" (${data.builderFn})`);
        continue;
      }
      const ctx = makeContext(data, groundFn, waterFn);
      let group;
      try {
        group = builder(ctx);
      } catch (err) {
        console.error(`Error construyendo el sitio "${data.id}":`, err);
        continue;
      }
      if (ctx.tickers.length) {
        const tickers = ctx.tickers;
        group.userData.tick = (dt) => {
          for (const tick of tickers) tick(dt);
        };
      }
      const site = new Site(data, group, ctx.baseY);
      site.extraColliders = ctx.colliders.map((c) => {
        const w = ctx.worldOf(c.x, c.z);
        return { x: w.x, z: w.z, r: c.r };
      });
      site.addToScene(scene);
      this.sites.push(site);
    }
    this._active = null;
  }

  // Anima los sitios y devuelve el activo según la posición del jugador
  update(dt, x, z) {
    for (const site of this.sites) site.tick(dt);
    this._active = findActiveSite(this.sites, x, z);
    return this._active;
  }

  collide(x, z) {
    return resolveSiteCollisions(this.sites, x, z);
  }

  getById(id) {
    return this.sites.find((site) => site.id === id) || null;
  }

  /** Colisionadores circulares: radio sólido de cada sitio + piezas de la maqueta. */
  getColliders() {
    const list = [];
    for (const site of this.sites) {
      list.push({ x: site.position.x, z: site.position.z, r: site.solidRadius });
      list.push(...site.extraColliders);
    }
    return list;
  }

  get activeSite() {
    return this._active;
  }
}

// Contexto de construcción: conversión local ↔ mundo y cotas relativas.
function makeContext(data, groundFn, waterFn) {
  const px = data.position.x;
  const pz = data.position.z;
  const rot = siteRotation(data);
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const baseY = siteBaseY(data, groundFn);
  const worldOf = (lx, lz) => ({ x: px + lx * cos + lz * sin, z: pz - lx * sin + lz * cos });
  return {
    site: data,
    baseY,
    worldOf,
    groundAt(lx, lz) {
      const w = worldOf(lx, lz);
      return groundFn(w.x, w.z) - baseY;
    },
    waterAt(lx, lz) {
      const w = worldOf(lx, lz);
      const level = waterFn(w.x, w.z);
      return level == null ? null : level - baseY;
    },
    colliders: [],
    tickers: [],
  };
}
