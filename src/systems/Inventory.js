// Inventario del jugador: artículos poseídos y equipados por categoría.
// Se persiste en localStorage con una clave por nombre de jugador
// (`narino_inventory_<nombre>`). La compra descuenta puntos del Progress.

import { SHOP_ITEMS, DEFAULT_EQUIPPED, findItem } from '../data/shopItems.js';

/** Prefijo de la clave de localStorage. */
const STORAGE_KEY = 'narino_inventory';

export class Inventory {
  constructor(playerName = '') {
    this.playerName = playerName;
    this.owned = new Set();
    this.equipped = { ...DEFAULT_EQUIPPED };
    for (const item of SHOP_ITEMS) if (item.free) this.owned.add(item.id);
    this._load();
  }

  /** Cambia de jugador y carga su inventario guardado (se acumula con el actual). */
  setPlayerName(name) {
    this.playerName = name || '';
    this._load();
  }

  _key() {
    return `${STORAGE_KEY}_${(this.playerName || 'anon').toLowerCase()}`;
  }

  _load() {
    try {
      const raw = localStorage.getItem(this._key());
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.owned)) {
        for (const id of data.owned) this.owned.add(id);
      }
      if (data.equipped && typeof data.equipped === 'object') {
        // Solo se restaura lo equipado si realmente se posee
        for (const cat of Object.keys(this.equipped)) {
          if (data.equipped[cat] && this.owned.has(data.equipped[cat])) {
            this.equipped[cat] = data.equipped[cat];
          }
        }
      }
    } catch {}
  }

  _save() {
    try {
      localStorage.setItem(this._key(), JSON.stringify({
        owned: [...this.owned],
        equipped: this.equipped,
      }));
    } catch {}
  }

  isOwned(id) {
    return this.owned.has(id);
  }

  isEquipped(id) {
    return Object.values(this.equipped).includes(id);
  }

  /** Intenta comprar `id` con los puntos de `progress`. Devuelve { ok, reason | item }. */
  buy(id, progress) {
    if (this.isOwned(id)) return { ok: false, reason: 'owned' };
    const item = findItem(id);
    if (!item) return { ok: false, reason: 'invalid' };
    if (progress.score < item.price) return { ok: false, reason: 'cant_afford' };
    progress.addScore(-item.price);
    this.owned.add(id);
    this._save();
    return { ok: true, item };
  }

  /** Otorga un artículo sin costo (p. ej. como recompensa). */
  grant(id) {
    if (!findItem(id)) return false;
    this.owned.add(id);
    this._save();
    return true;
  }

  equip(id) {
    const item = findItem(id);
    if (!item || !this.isOwned(id)) return false;
    this.equipped[item.cat] = id;
    this._save();
    return true;
  }

  /** Artículo equipado en la categoría `cat` (o undefined). */
  getEquipped(cat) {
    return findItem(this.equipped[cat]);
  }
}
