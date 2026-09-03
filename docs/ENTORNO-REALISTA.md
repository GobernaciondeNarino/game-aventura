# Nariño Aventura 3D — Entorno realista y multijugador

Documento técnico de la conversión del mundo original (plano, materiales
lisos, montañas cónicas) en un mundo abierto realista, y del modo multijugador.
Escrito para el equipo de la Secretaría TIC / hosting de la Gobernación de Nariño.

## 1. Resumen ejecutivo

| Aspecto | Antes | Ahora |
|---|---|---|
| Código fuente | Solo el bundle compilado (`assets/index-*.js`) | 70+ módulos ES legibles en `src/`, build con Vite 8 |
| Motor | Three.js r160 | Three.js r185 |
| Suelo | Plano de 600 m con textura de canvas | Terreno de 1,8 km con colinas, cordillera, playa, cuencas de lagos y cauce de río |
| Vegetación | Conos y esferas | Césped GPU (≈120 000 briznas con viento y pisadas), robles, fresnos, álamos, pinos y arbustos procedurales instanciados con impostores a distancia |
| Agua | Discos planos | Mar con reflejo en tiempo real, lagos, río con corriente, cascada con niebla |
| Cielo/luz | Gradiente + luz fija | Cielo físico (Preetham), mapa de entorno PBR, sol con sombras que siguen al jugador, niebla, nubes |
| Postprocesado | Ninguno | Oclusión ambiental (N8AO), SMAA, bloom, viñeta, tone mapping ACES |
| Jugadores | Uno | Multijugador P2P (sin servidor) con avatares, nombres y chat; relay opcional |
| Hosting | Estático | Sigue siendo estático: `index.html + assets/ + mp3` |

Toda la jugabilidad original se conserva: preguntas por sitio, pistas de los
guías, fauna, complejo deportivo con balones, laberinto, patineta, tienda,
ranking y recompensas.

## 2. Arquitectura

```
Game.constructor()       síncrono: renderer, cámara, atmósfera, mundo jugable, HUD
Game.init()  (async)     terreno (Web Workers) → césped → hojas → árboles → agua → postFX → red
Game.update(dt)          entrada → física del jugador sobre el terreno → colisiones → sistemas → cámara
```

Módulos nuevos en `src/environment/`:

| Módulo | Responsabilidad |
|---|---|
| `terrainMath.js` | Función analítica `heightAt(x, z)` (la "verdad" del relieve), máscaras y clasificación de superficie. Sin Three.js. |
| `terrainBake.js` / `terrainWorker.js` | Horneado de la malla y de las texturas de altura/superficie en paralelo. |
| `Terrain.js` | Malla con rejilla deformada (densa en el centro, dispersa en el horizonte) y material PBR con mezcla césped/tierra/arena/roca/nieve. |
| `Atmosphere.js` | Cielo, sol, sombras, niebla, entorno PBR, nubes. |
| `Grass.js` | Césped instanciado en un solo draw call. |
| `Trees.js` | Árboles ez-tree: variantes, distribución, instancias cercanas e impostores. |
| `WaterBodies.js` | Mar, lagos, río, poza y cascada. |
| `Leaves.js` | Hojas al viento (partículas en GPU). |
| `Postprocessing.js` | Cadena de efectos. |
| `quality.js` | Perfiles alta/media/baja y detección de dispositivo. |

`src/world/worldLayout.js` centraliza las coordenadas que comparten varios
sistemas (vías, glorietas, canchas, laberinto, tienda, lagos, río, cascada).

## 3. Terreno

### 3.1 Relieve analítico

`heightAt(x, z)` compone:

1. **Colinas** de ruido fBm (simplex 2D, semilla fija) de 0 a ~5 m.
2. **Máscara de zonas planas** (`flatMask`): plaza, senderos a los sitios,
   circunvalar y ramales, glorietas, parque deportivo, laberinto, tienda,
   patineta y orillas de agua quedan a cota 0 con transición suave de 6–14 m.
   Así ninguna cancha, camino ni edificio queda inclinado.
3. **Cordillera** cercana (a partir de 250 m del centro) y **cordillera lejana**
   (430–720 m) moduladas por dirección: al este no hay montañas porque está el
   Pacífico. Crestas afiladas con ruido "ridged".
4. **Playa** al este: la arena desciende suavemente bajo el nivel del mar (-0,45 m).
5. **Colina de la cascada** (gaussiana asimétrica, cara este abrupta).
6. **Cuencas** negativas para dos lagos, la poza de la cascada y el canal del río.

Las mismas funciones se usan en CPU (jugador, NPC, balones, fauna, props) y se
hornean a texturas para la GPU (césped y hojas), por lo que todo queda apoyado
en el suelo de forma coherente.

### 3.2 Malla

Rejilla de 640×640 vértices (perfil alta) con deformación cúbica: ~0,8 m de
paso en el centro jugable y ~7 m en el horizonte, sin costuras ni T-junctions,
en un único draw call. El horneado (≈400 000 evaluaciones de `heightAt` más
1 M de texeles) se reparte entre Web Workers; si no hay workers se hace en el
hilo principal.

### 3.3 Material

`MeshStandardMaterial` extendido con `onBeforeCompile`: mezcla césped (dos
tonos + variación macro), tierra en bordes de caminos y suelo de bosque, arena,
roca por pendiente, nieve por altura (línea ~118 m con ruido) y oscurecimiento
del fondo bajo el agua. Normal map y ruido tileables generados en tiempo de carga.

### 3.4 Jugabilidad sobre el relieve

- El jugador se pega al suelo al caminar, aterriza si cae bajo él y no puede
  subir pendientes de más de ~42° (la cordillera actúa como límite natural).
- Los balones rebotan sobre la altura local; los NPC, osos, cangrejos y
  mariposas leen `heightAt`; los props se colocan a la altura del terreno.
- La cámara nunca se hunde en el terreno (`CameraRig.clampAboveGround`).
- Colisionadores circulares indexados en una rejilla espacial
  (`core/collision.js → ColliderIndex`) para soportar más de mil árboles.

## 4. Atmósfera e iluminación

- `Sky` de Three.js (dispersión de Preetham): turbidez 2,6, Rayleigh 1,7.
- **Mapa de entorno** PBR generado con `PMREMGenerator` a partir del cielo.
  Nota: el disco solar HDR desborda el half-float y produce NaN al difuminar
  (todo el mundo se veía negro); se hornea con el disco apagado y menor Mie.
- Sol direccional (2,3) + luz hemisférica (0,5). Sombras PCF 4096² que siguen
  al jugador con "snap" a la rejilla de texeles para evitar parpadeo.
- Niebla lineal 120–900 m del color del horizonte; dos capas de nubes
  procedurales que derivan lentamente.

## 5. Césped

Técnica inspirada en la charla de GDC 2021 sobre *Ghost of Tsushima* y en
`simondevyoutube/Quick_Grass`:

- Una sola `InstancedBufferGeometry` (brizna de 4 segmentos, 7 triángulos) con
  9×9 tiles de 16 m alrededor del jugador; el vertex shader calcula el origen
  del tile a partir de la posición del jugador y un hash por tile para romper la
  repetición.
- Altura del terreno leída del heightmap R16F; densidad según el mapa de
  superficie (nada sobre pavimento, agua o arena), pendiente, altitud y parches
  de ruido.
- Viento multicapa (dos ondas viajeras + ráfagas de ruido desplazadas en el
  tiempo), LOD por distancia y desvanecimiento; las briznas se aplastan y
  oscurecen alrededor del jugador.
- Deriva de `MeshStandardMaterial`: recibe sombras, niebla y oclusión ambiental.

## 6. Árboles y bosques

- Generador **ez-tree** (MIT) incluido en `src/vendor/ez-tree` con un
  subconjunto de texturas (1,3 MB en lugar de 4 MB) y carga perezosa.
- Ocho variantes (roble, roble joven, fresno, álamo, pino, pino joven, dos
  arbustos) con menos secciones/segmentos y hojas más grandes para instanciar.
- **Cercanos** (≤110 m): `InstancedMesh` de ramas y hojas con sombras (material
  de profundidad con alphaTest) y vaivén de hojas por instancia.
- **Lejanos**: impostores (billboards cilíndricos) leídos de un atlas
  renderizado al arrancar con la misma luz que la escena. El conjunto cercano
  se recalcula cuando el jugador se desplaza más de 8 m.
- Distribución determinista: bosque de niebla alrededor de la cascada, anillo
  de bosque en la Reserva La Planada, orillas de los lagos, arboledas por ruido y
  pinos en el piedemonte; se evitan pavimento, agua, arena, pendientes >0,55 y
  las zonas jugables. ≈1 700 árboles en calidad alta.

## 7. Agua

| Cuerpo | Técnica |
|---|---|
| Mar | `Water` de Three.js: reflejo en tiempo real (512², 256² en media), normal map procedural, brillo solar y niebla. Durante el render del reflejo se ocultan césped, hojas e impostores. En calidad baja se usa el material ligero. |
| Lagos y poza | `MeshStandardMaterial` translúcido con dos capas de normales animadas (UV métricas), reflejo del cielo vía mapa de entorno. |
| Río | Cinta que sigue la polilínea (`world/ribbon.js`) con el patrón fluyendo aguas abajo hacia la laguna baja. |
| Cascada | Dos láminas que siguen la ladera real del terreno (muestreando `heightAt`), texturas de espuma desplazándose y niebla ascendente con sprites aditivos. |

## 8. Hojas al viento

Partículas instanciadas animadas por completo en el vertex shader: cada hoja
cae, deriva con el viento y voltea en un volumen de 52 m que envuelve al
jugador (módulo), leyendo la altura del suelo del heightmap.

## 9. Postprocesado

`pmndrs/postprocessing` (Zlib) + `n8ao` (ISC): `RenderPass → N8AOPostPass
(media resolución) → SMAA (HIGH) + Bloom sutil + Viñeta + ACES`. El renderer
entrega valores lineales en half-float y el tone mapping se aplica al final.
En calidad baja se renderiza directo con ACES y MSAA.

## 10. Perfiles de calidad (`environment/quality.js`)

| | alta | media | baja |
|---|---|---|---|
| Rejilla de terreno | 640² | 448² | 320² |
| Texturas de mapa | 1024² | 768² | 512² |
| Sombras | 4096² / 70 m | 2048² / 60 m | 1024² / 50 m |
| Césped | 9×9 tiles, 100 % | 7×7, 60 % | 5×5, 35 % |
| Árboles cercanos | 240 (110 m) | 150 (80 m) | 80 (50 m) |
| Reflejo del mar | 512² | 256² | no |
| AO / Bloom / SMAA | sí / sí / sí | no / sí / sí | no / no / no |
| Pixel ratio máximo | 2 | 1,5 | 1 |

Detección: pantallas táctiles pequeñas → baja; táctil, ≤4 núcleos o ≤4 GB → media;
resto → alta. Se puede forzar con `?calidad=`.

## 11. Multijugador

### 11.1 Transporte

- **P2P (por defecto)**: `trystero` (MIT) sobre WebRTC, señalización mediante
  relés públicos Nostr. No requiere servidor: funciona desde el hosting estático.
  Todos los que abren la misma URL entran en la sala `narino-principal`;
  `?sala=colegio-x` crea salas privadas.
- **Relay (opcional)**: `server/relay.mjs` (Node + ws). Solo retransmite JSON
  entre los navegadores de una sala; no guarda datos. Útil si la red bloquea
  WebRTC/Nostr. Cliente: `?red=relay&relay=wss://servidor:8787`.
- `?red=off` desactiva la red. Cualquier fallo de red deja el juego en modo
  individual sin interrumpir la carga.

### 11.2 Protocolo

| Acción | Contenido | Ritmo |
|---|---|---|
| `pose` | x, y, z, rotación y banderas (moviéndose, corriendo, en el suelo, en patineta) | 12 Hz |
| `profile` | nombre, camisa, pantalón, capa, sombrero, capa visible, puntaje, sitios | al entrar, al cambiar y cada 5 s (latido) |
| `chat` | texto (≤140 caracteres, sin HTML) | al enviar |

Los avatares remotos reutilizan el rig del jugador (`Player.applyRemoteState`)
con interpolación exponencial, etiqueta de nombre y burbuja de chat. El panel
"Jugadores" muestra la sección **En línea ahora**. Un jugador sin poses durante
20 s desaparece.

### 11.3 Límites y privacidad

- El chat es directo entre navegadores y no se modera ni se almacena; se
  recomienda usar salas privadas con estudiantes.
- Los balones no se sincronizan (cada cliente tiene su propia simulación);
  es la primera ampliación recomendada (autoridad del anfitrión).

## 12. Librerías del informe: evaluación y decisión

| Librería | Decisión | Motivo |
|---|---|---|
| three r185 (MIT) | **Instalada** | Núcleo de render; `Sky`, `Water`, `PMREMGenerator`. |
| pmndrs/postprocessing (Zlib) | **Instalada** | SMAA, bloom, viñeta, tone mapping fusionados en un pase. |
| n8ao (ISC) | **Instalada** | Oclusión ambiental estable y sencilla, compatible con postprocessing. |
| simplex-noise (MIT) | **Instalada** | Ruido determinista para relieve y texturas. |
| ez-tree (MIT) | **Incluida en `src/vendor`** | El paquete npm incrusta 4 MB de texturas; se copia el código y se recorta a las texturas necesarias. |
| trystero (MIT) | **Instalada** | Multijugador sin servidor, imprescindible para hosting estático. |
| Rapier | No | La física del juego (balones, salto, colisiones circulares) ya es determinista y ligera; Rapier obligaría a reescribirla y añade ~1 MB de WASM. Recomendado si se sincronizan balones entre jugadores. |
| three-mesh-bvh | No | El terreno es analítico (`heightAt`), no hacen falta raycasts contra mallas. |
| NASA 3DTilesRendererJS / geo-three / three-geo | No | El mundo es una representación ficticia y compacta de Nariño, no geoespacial. |
| takram three-geospatial | No | Orientado a WebGPU/geoespacial; el cielo de Preetham cubre la necesidad con menor coste. |
| THREE.Terrain | No | Estancado; se implementó un heightfield propio adaptado a las zonas jugables. |
| CSM (sombras en cascada) | No | Conflicto con `onBeforeCompile` de varios materiales; se usó una sombra única que sigue al jugador con snap de texel. |
| Colyseus / geckos.io | No (por ahora) | Requieren servidor Node persistente; se incluye un relay mínimo con la misma función de transporte. |
| WebGPURenderer / TSL | No (por ahora) | Water/Sky y postprocessing están maduros en WebGL 2; migración futura. |

## 13. Verificación

- Build de Vite sin errores (107 módulos).
- Pruebas de humo en Chromium headless (SwiftShader) para los tres perfiles:
  sin errores de ejecución ni de compilación de shaders; capturas del recorrido
  (plaza, laguna, cascada, playa, costa, río, bosque, cordillera) revisadas.
- Advertencias conocidas: `THREE.Clock` marcado como obsoleto (sin impacto).

## 14. Rendimiento y recomendaciones

- Presupuesto aproximado en calidad alta: terreno 0,8 M triángulos, césped
  ~0,8 M, árboles cercanos 0,5–1 M, más reflejo del mar (render adicional).
  Portátil con GPU integrada moderna: usar `media`; móviles: `baja` automático.
- El horneado del terreno tarda 1–3 s en un equipo de escritorio (se muestra
  progreso en la pantalla de carga).

## 15. Próximos pasos sugeridos

1. Sincronizar balones y anotaciones entre jugadores (autoridad del anfitrión).
2. Ciclo día/noche con recálculo periódico del mapa de entorno.
3. Migración progresiva a `WebGPURenderer` + TSL cuando postprocessing lo soporte.
4. Sonidos ambientales (viento, agua, aves) ligados a la posición.
5. Integrar las guías de identidad visual de la Gobernación en el HUD.
