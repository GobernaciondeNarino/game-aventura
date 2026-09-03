// Interfaz de la Tienda Ñaño: overlay con pestañas por categoría y una rejilla
// de artículos (muestra de color, nombre y botón Comprar/Equipar/EQUIPADO).
// Trabaja sobre un `Inventory` y un `Progress` (para el puntaje disponible)
// y notifica mediante `onBuy(item)`, `onEquip(item)` y `onClose()`.

import { SHOP_CATEGORIES, SHOP_ITEMS } from '../data/shopItems.js';

/** Escapa &, <, > y " para insertar texto dentro de HTML. */
function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Convierte un color numérico (0xRRGGBB) a cadena CSS `#rrggbb`. */
function hexColor(color) {
  return `#${(color || 0).toString(16).padStart(6, '0')}`;
}

export class ShopUI {
  constructor(parent, { onBuy, onEquip, onClose } = {}) {
    this.onBuy = onBuy;
    this.onEquip = onEquip;
    this.onClose = onClose;
    this.currentCat = 'shirt';
    this.isOpen = false;

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(8, 26, 42, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 60;
      pointer-events: auto;
    `;
    // Clic fuera del panel cierra la tienda
    this.overlay.addEventListener('click', (event) => {
      if (event.target === this.overlay) this._close();
    });

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      background: linear-gradient(180deg, #ffffff, #f4f9fa);
      border: 3px solid #0f7d84;
      border-radius: 18px;
      padding: 18px 22px;
      width: min(780px, 94vw);
      max-height: 86vh;
      overflow-y: auto;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #0c2439;
      box-shadow: 0 16px 40px rgba(0,0,0,0.45);
    `;
    this.overlay.appendChild(this.panel);
    parent.appendChild(this.overlay);
  }

  show(inventory, progress) {
    this.inventory = inventory;
    this.progress = progress;
    this.overlay.style.display = 'flex';
    this.isOpen = true;
    this._render();
  }

  hide() {
    this.overlay.style.display = 'none';
    this.isOpen = false;
  }

  _close() {
    this.hide();
    if (this.onClose) this.onClose();
  }

  /** Reconstruye todo el HTML del panel y vuelve a enlazar los botones. */
  _render() {
    if (!this.inventory || !this.progress) return;
    const inventory = this.inventory;
    const score = this.progress.score;
    const equippedSummary = Object.keys(inventory.equipped)
      .map((cat) => escapeHtml(inventory.getEquipped(cat)?.name || ''))
      .filter(Boolean)
      .join(' · ');

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">
        <div style="font-size:1.3rem;font-weight:800;color:#0f7d84;">🛍️ Tienda Ñaño</div>
        <div style="font-weight:700;background:#e8a020;color:#fff;padding:6px 12px;border-radius:8px;">⭐ ${score} pts</div>
        <button id="shopClose" style="background:#0f7d84;color:#fff;border:none;width:34px;height:34px;border-radius:50%;font-size:1.1rem;cursor:pointer;font-weight:800;">✕</button>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
    `;

    // Pestañas de categoría
    for (const category of SHOP_CATEGORIES) {
      const active = category.id === this.currentCat;
      html += `<button data-cat="${category.id}" style="
        padding:6px 12px;border-radius:8px;border:2px solid #0f7d84;
        background:${active ? '#0f7d84' : '#fff'};
        color:${active ? '#fff' : '#0f7d84'};
        font-weight:700;cursor:pointer;font-size:0.9rem;
      ">${category.label}</button>`;
    }
    html += '</div>';

    // Rejilla de artículos de la categoría actual
    const items = SHOP_ITEMS.filter((item) => item.cat === this.currentCat);
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;">';
    for (const item of items) {
      const owned = inventory.isOwned(item.id);
      const equipped = inventory.isEquipped(item.id);
      const affordable = score >= item.price;
      const swatch = item.type === 'none'
        ? '<div style="width:100%;height:54px;border-radius:6px;border:2px dashed #bbb;display:flex;align-items:center;justify-content:center;color:#888;font-size:0.8rem;">sin sombrero</div>'
        : `<div style="width:100%;height:54px;background:${hexColor(item.color)};border-radius:6px;border:1px solid rgba(0,0,0,0.15);"></div>`;
      let action;
      if (equipped) {
        action = '<div style="text-align:center;padding:6px;background:#0f7d84;color:#fff;border-radius:6px;font-weight:700;font-size:0.85rem;">✓ EQUIPADO</div>';
      } else if (owned) {
        action = `<button data-equip="${item.id}" style="width:100%;padding:7px;border-radius:6px;border:none;background:#e8a020;color:#fff;font-weight:800;cursor:pointer;font-size:0.85rem;">Equipar</button>`;
      } else {
        action = `<button data-buy="${item.id}" ${affordable ? '' : 'disabled'} style="width:100%;padding:7px;border-radius:6px;border:none;background:${affordable ? '#0f7d84' : '#b0b0b0'};color:#fff;font-weight:800;cursor:${affordable ? 'pointer' : 'not-allowed'};font-size:0.85rem;">${item.price} ⭐</button>`;
      }
      html += `
        <div style="border:2px solid #e0e9ea;border-radius:10px;padding:9px;background:#fff;">
          ${swatch}
          <div style="font-size:0.85rem;font-weight:700;margin:7px 0;min-height:34px;">${escapeHtml(item.name)}</div>
          ${action}
        </div>
      `;
    }
    html += '</div>';

    html += `
      <div style="margin-top:14px;padding:10px;background:#e6f4f5;border-radius:8px;font-size:0.85rem;">
        <b>Equipado:</b> ${equippedSummary || '—'}
      </div>
    `;
    this.panel.innerHTML = html;

    // Enlaces de eventos
    this.panel.querySelector('#shopClose').onclick = () => this._close();
    for (const button of this.panel.querySelectorAll('[data-cat]')) {
      button.onclick = () => {
        this.currentCat = button.dataset.cat;
        this._render();
      };
    }
    for (const button of this.panel.querySelectorAll('[data-buy]')) {
      button.onclick = () => {
        const result = inventory.buy(button.dataset.buy, this.progress);
        if (result.ok && this.onBuy) this.onBuy(result.item);
        this._render();
      };
    }
    for (const button of this.panel.querySelectorAll('[data-equip]')) {
      button.onclick = () => {
        const item = SHOP_ITEMS.find((entry) => entry.id === button.dataset.equip);
        if (inventory.equip(button.dataset.equip)) {
          if (this.onEquip) this.onEquip(item);
          this._render();
        }
      };
    }
  }
}
