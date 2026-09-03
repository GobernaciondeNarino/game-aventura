// Build reproducible: limpia `assets/` (evita chunks huérfanos de builds
// anteriores) y ejecuta Vite. El resultado queda en la raíz del repositorio
// (index.html + assets/), listo para copiarse a cualquier hosting estático.
import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
rmSync(new URL('../assets', import.meta.url), { recursive: true, force: true });
execSync('npx vite build', { cwd: root, stdio: 'inherit' });
