// Punto de entrada: crea el juego, construye el entorno (asíncrono) y arranca
// el bucle de render; oculta la pantalla de carga cuando todo está listo.
import { Game } from './game/Game.js';

async function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('No #game-canvas element found in the DOM');
    return;
  }
  const loading = document.getElementById('loading');
  const setStatus = (message) => {
    if (loading) loading.textContent = message;
  };

  const game = new Game(canvas);
  try {
    await game.init(setStatus);
  } catch (error) {
    console.error('No se pudo construir el entorno 3D:', error);
    console.error(error && error.stack);
    setStatus('No se pudo cargar el entorno 3D. Recarga la página o prueba con ?calidad=baja');
    return;
  }
  game.start();
  // Referencia global para depuración y pruebas automatizadas.
  window.__narinoGame = game;
  if (loading) requestAnimationFrame(() => loading.classList.add('hidden'));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
