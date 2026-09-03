// Punto de entrada: crea el juego sobre #game-canvas y oculta la pantalla de carga.
import { Game } from './game/Game.js';

function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('No #game-canvas element found in the DOM');
    return;
  }
  new Game(canvas).start();
  const loading = document.getElementById('loading');
  loading && requestAnimationFrame(() => loading.classList.add('hidden'));
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', bootstrap)
  : bootstrap();
