// Geometría de "cinta": una banda plana de ancho fijo que sigue una curva
// Catmull-Rom por una lista de puntos {x, y?, z}. Se usa para carreteras y
// caminos curvos. Las UV repiten a lo largo según la longitud de la curva.
import { Vector3, CatmullRomCurve3, BufferGeometry, BufferAttribute, Mesh } from 'three';

// Genera la BufferGeometry de la cinta (altura por defecto .07 si el punto no trae y).
export function ribbonGeometry(points, width = 3, segments = null) {
  const curvePoints = points.map((p) => new Vector3(p.x, p.y != null ? p.y : .07, p.z));
  const curve = new CatmullRomCurve3(curvePoints);
  const segmentCount = segments || Math.max(8, Math.ceil(curve.getLength() / 2));
  const halfWidth = width / 2;
  const uvRepeat = curve.getLength() / 3;
  const positions = [];
  const uvs = [];
  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    let normalX = -tangent.z;
    let normalZ = tangent.x;
    const normalLength = Math.hypot(normalX, normalZ) || 1;
    normalX /= normalLength;
    normalZ /= normalLength;
    positions.push(point.x + normalX * halfWidth, point.y, point.z + normalZ * halfWidth);
    positions.push(point.x - normalX * halfWidth, point.y, point.z - normalZ * halfWidth);
    const v = t * uvRepeat;
    uvs.push(0, v, 1, v);
  }
  const indices = [];
  for (let i = 0; i < segmentCount; i++) {
    const leftA = i * 2;
    const rightA = i * 2 + 1;
    const leftB = (i + 1) * 2;
    const rightB = (i + 1) * 2 + 1;
    indices.push(leftA, leftB, rightA, rightA, leftB, rightB);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Malla de cinta lista para añadir a la escena (recibe sombras).
export function ribbonMesh(points, width, material, segments = null) {
  const geometry = ribbonGeometry(points, width, segments);
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}
