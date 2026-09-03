// Gestor de sitios turísticos: instancia cada Site a partir de sitesData,
// lo agrega a la escena y en cada frame anima las maquetas y determina cuál
// está activo (cerca del jugador). También expone colisiones y búsqueda por id.
import { SITES } from './sitesData.js';
import { SITE_BUILDERS } from './siteBuilders.js';
import { Site, findActiveSite, resolveSiteCollisions } from './Site.js';

export class SiteManager {
  constructor(scene, sitesData = SITES) {
    this.sites = [];
    for (const data of sitesData) {
      const builder = SITE_BUILDERS[data.builderFn];
      if (!builder) {
        console.warn(`Sin builder para sitio "${data.id}" (${data.builderFn})`);
        continue;
      }
      const site = new Site(data, builder());
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

  getColliders() {
    return this.sites.map((site) => ({
      x: site.position.x,
      z: site.position.z,
      r: site.solidRadius,
    }));
  }

  get activeSite() {
    return this._active;
  }
}
