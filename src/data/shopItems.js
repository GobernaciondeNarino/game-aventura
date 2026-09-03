// Catálogo de la Tienda Ñaño: categorías, artículos (con precio en puntos y
// color 0xRRGGBB) y el equipamiento por defecto del jugador.
// Los artículos con `free: true` se poseen desde el inicio.

export const SHOP_CATEGORIES = [
  { id: 'shirt', label: '👕 Camisa' },
  { id: 'pants', label: '👖 Pantalón' },
  { id: 'cape', label: '🦸 Capa' },
  { id: 'hat', label: '🎩 Sombrero' },
  { id: 'skate', label: '🛹 Patineta' },
];

export const SHOP_ITEMS = [
  // Camisas
  { id: 'shirt_white', cat: 'shirt', name: 'Blanca clásica', price: 0, color: 0xffffff, free: true },
  { id: 'shirt_yellow', cat: 'shirt', name: 'Amarilla', price: 120, color: 0xfdd835 },
  { id: 'shirt_green', cat: 'shirt', name: 'Verde Galeras', price: 180, color: 0x2e7d32 },
  { id: 'shirt_red', cat: 'shirt', name: 'Roja Tumaco', price: 240, color: 0xc62828 },
  { id: 'shirt_purple', cat: 'shirt', name: 'Púrpura Laguna', price: 320, color: 0x6a1b9a },
  { id: 'shirt_narino', cat: 'shirt', name: 'Azul Nariño', price: 280, color: 0x1a5276 },
  // Pantalones
  { id: 'pants_teal', cat: 'pants', name: 'Teal Ñaño', price: 0, color: 0x0f7d84, free: true },
  { id: 'pants_blue', cat: 'pants', name: 'Azul institucional', price: 120, color: 0x003087 },
  { id: 'pants_black', cat: 'pants', name: 'Negro', price: 160, color: 0x222222 },
  { id: 'pants_brown', cat: 'pants', name: 'Café tierra', price: 220, color: 0x6d4c41 },
  { id: 'pants_olive', cat: 'pants', name: 'Olivo páramo', price: 260, color: 0x556b2f },
  // Capas
  { id: 'cape_white', cat: 'cape', name: 'Blanca', price: 0, color: 0xffffff, free: true },
  { id: 'cape_gold', cat: 'cape', name: 'Dorada Lajas', price: 280, color: 0xe8a020 },
  { id: 'cape_red', cat: 'cape', name: 'Roja Carnaval', price: 320, color: 0xb71c1c },
  { id: 'cape_narino', cat: 'cape', name: 'Azul Nariño', price: 380, color: 0x1a5276 },
  { id: 'cape_black', cat: 'cape', name: 'Negra Volcán', price: 450, color: 0x111111 },
  // Sombreros (el campo `type` lo usa el constructor de sombreros del jugador)
  { id: 'hat_none', cat: 'hat', name: 'Sin sombrero', price: 0, color: 0, free: true, type: 'none' },
  { id: 'hat_straw', cat: 'hat', name: 'Sombrero de paja', price: 200, color: 0xe8c860, type: 'straw' },
  { id: 'hat_cap', cat: 'hat', name: 'Gorra azul', price: 140, color: 0x1976d2, type: 'cap' },
  { id: 'hat_beanie', cat: 'hat', name: 'Gorro de lana', price: 180, color: 0xb71c1c, type: 'beanie' },
  { id: 'hat_top', cat: 'hat', name: 'Sombrero de copa', price: 400, color: 0x1a1a1a, type: 'top' },
  // Patinetas
  { id: 'skate_orange', cat: 'skate', name: 'Naranja clásica', price: 0, color: 0xff7b29, free: true },
  { id: 'skate_blue', cat: 'skate', name: 'Azul', price: 200, color: 0x1976d2 },
  { id: 'skate_green', cat: 'skate', name: 'Verde', price: 260, color: 0x43a047 },
  { id: 'skate_pink', cat: 'skate', name: 'Rosa', price: 300, color: 0xec407a },
  { id: 'skate_gold', cat: 'skate', name: 'Dorada', price: 420, color: 0xe8a020 },
];

/** Artículo equipado por defecto en cada categoría. */
export const DEFAULT_EQUIPPED = {
  shirt: 'shirt_white',
  pants: 'pants_teal',
  cape: 'cape_white',
  hat: 'hat_none',
  skate: 'skate_orange',
};

/** Busca un artículo por su id; devuelve undefined si no existe. */
export function findItem(id) {
  return SHOP_ITEMS.find((item) => item.id === id);
}
