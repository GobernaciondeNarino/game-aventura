// Configuración de Vite para "Nariño Aventura 3D".
// El código fuente vive en `src/`; el build se escribe en la raíz del repositorio
// (index.html + assets/) sin vaciarla, para convivir con aventura-narino.mp3 y el .git.
import { createReadStream, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const AUDIO_ROUTE = '/aventura-narino.mp3';
const AUDIO_FILE = fileURLToPath(new URL('./aventura-narino.mp3', import.meta.url));

// Plugin mínimo: en `vite dev` sirve la música de fondo desde la raíz del repo
// (fuera de `root: 'src'`), con soporte de rangos para que <audio> pueda buscar.
function serveRootAudio() {
  return {
    name: 'serve-root-audio',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0];
        if (path !== AUDIO_ROUTE) return next();

        let size;
        try {
          size = statSync(AUDIO_FILE).size;
        } catch {
          res.statusCode = 404;
          res.end('aventura-narino.mp3 not found');
          return;
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');

        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
          const start = range[1] ? Number(range[1]) : 0;
          const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          if (start > end || start >= size) {
            res.statusCode = 416;
            res.setHeader('Content-Range', `bytes */${size}`);
            res.end();
            return;
          }
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          res.setHeader('Content-Length', String(end - start + 1));
          if (req.method === 'HEAD') return res.end();
          createReadStream(AUDIO_FILE, { start, end }).pipe(res);
          return;
        }

        res.statusCode = 200;
        res.setHeader('Content-Length', String(size));
        if (req.method === 'HEAD') return res.end();
        createReadStream(AUDIO_FILE).pipe(res);
      });
    },
  };
}

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: false,
  plugins: [serveRootAudio()],
  build: {
    outDir: '..',
    emptyOutDir: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Rolldown (Vite 8): separa Three.js en su propio chunk cacheable.
        advancedChunks: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
  },
});
