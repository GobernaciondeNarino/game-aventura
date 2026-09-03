// Tabla de posiciones local persistida en localStorage. Guarda por jugador el
// mejor puntaje, el máximo de sitios completados y las recompensas obtenidas;
// también recuerda el último nombre usado para pre-rellenar el NameModal.

const LEADERBOARD_KEY = 'narino_leaderboard';
const PLAYER_NAME_KEY = 'narino_player_name';

export class Leaderboard {
  constructor() {
    this._cache = null;
  }

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      this._cache = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(this._cache)) this._cache = [];
    } catch {
      this._cache = [];
    }
    return this._cache;
  }

  _save() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this._cache));
    } catch {}
  }

  /** Último nombre de jugador guardado ('' si no hay). */
  getLastName() {
    try {
      return localStorage.getItem(PLAYER_NAME_KEY) || '';
    } catch {
      return '';
    }
  }

  /** Crea o actualiza la entrada de `name` conservando siempre los máximos. */
  upsert({ name, score, sites, rewards }) {
    if (!name) return;
    const entries = this._load();
    let entry = entries.find((item) => item.name === name);
    if (!entry) {
      entry = { name, score: 0, sites: 0, rewards: [], updatedAt: Date.now() };
      entries.push(entry);
    }
    if (typeof score === 'number') entry.score = Math.max(entry.score, score);
    if (typeof sites === 'number') entry.sites = Math.max(entry.sites, sites);
    if (Array.isArray(rewards)) {
      for (const reward of rewards) {
        if (!entry.rewards.includes(reward)) entry.rewards.push(reward);
      }
    }
    entry.updatedAt = Date.now();
    this._save();
    try {
      localStorage.setItem(PLAYER_NAME_KEY, name);
    } catch {}
  }

  /** Entradas ordenadas de mayor a menor puntaje (copia). */
  list() {
    return this._load().slice().sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}
