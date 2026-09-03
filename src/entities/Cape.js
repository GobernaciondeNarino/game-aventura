// Capa de tela simulada con integración de Verlet: una malla plana cuyos
// vértices son partículas unidas por restricciones de distancia. La fila
// superior queda "anclada" a los puntos que entrega el jugador cada frame;
// el resto responde a gravedad, viento y a un colisionador cilíndrico (el cuerpo).

import { PlaneGeometry, MeshStandardMaterial, DoubleSide, Mesh, Vector3 } from 'three';

const DEFAULT_COLS = 8;
const DEFAULT_ROWS = 12;
const DEFAULT_WIDTH = .85;
const DEFAULT_HEIGHT = 1.1;
const CONSTRAINT_ITERATIONS = 8;
const DAMPING = .92;
const GRAVITY = -9;
const MAX_DELTA = .35;
const MAX_STRETCH = 1.3;
const DEFAULT_COLOR = 1457507; // 0x163d63

export class Cape {
    constructor({
        cols = DEFAULT_COLS,
        rows = DEFAULT_ROWS,
        width = DEFAULT_WIDTH,
        height = DEFAULT_HEIGHT,
        color = DEFAULT_COLOR,
    } = {}) {
        this.cols = cols;
        this.rows = rows;
        this.geometry = new PlaneGeometry(width, height, cols - 1, rows - 1);
        this.material = new MeshStandardMaterial({
            color,
            side: DoubleSide,
            roughness: .85,
            metalness: .05,
        });
        this.mesh = new Mesh(this.geometry, this.material);
        this.mesh.castShadow = true;
        this.mesh.matrixAutoUpdate = false;
        this.mesh.frustumCulled = false;

        // Una partícula por vértice; la primera fila está fijada (pinned).
        this.particles = [];
        const positions = this.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const point = new Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
            this.particles.push({
                position: point.clone(),
                prev: point.clone(),
                pinned: this._rowOf(i) === 0,
            });
        }

        // Restricciones horizontales y verticales entre vecinos.
        this.constraints = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const index = row * cols + col;
                if (col < cols - 1) this._addConstraint(index, index + 1);
                if (row < rows - 1) this._addConstraint(index, index + cols);
            }
        }
        this._time = 0;
    }

    _rowOf(index) {
        return Math.floor(index / this.cols);
    }

    _addConstraint(a, b) {
        const rest = this.particles[a].position.distanceTo(this.particles[b].position);
        this.constraints.push({ a, b, rest });
    }

    // anchors: posiciones mundiales de la fila superior; wind: Vector3 o null;
    // collider: { x, z, r } o null.
    update(dt, anchors, wind = null, collider = null) {
        this._time += dt;
        const dtSq = dt * dt;

        // Fijar la fila superior a los anclajes.
        for (let i = 0; i < this.cols; i++) {
            const particle = this.particles[i];
            particle.position.copy(anchors[i]);
            particle.prev.copy(anchors[i]);
        }

        const windX = wind ? wind.x : 0;
        const windY = wind ? wind.y : 0;
        const windZ = wind ? wind.z : 0;

        // Integración de Verlet con amortiguación y límite de velocidad.
        for (const particle of this.particles) {
            if (particle.pinned) continue;
            const vx = clampDelta((particle.position.x - particle.prev.x) * DAMPING);
            const vy = clampDelta((particle.position.y - particle.prev.y) * DAMPING);
            const vz = clampDelta((particle.position.z - particle.prev.z) * DAMPING);
            particle.prev.copy(particle.position);
            particle.position.x += vx + windX * dtSq;
            particle.position.y += vy + (GRAVITY + windY) * dtSq;
            particle.position.z += vz + windZ * dtSq;
        }

        // Relajación de restricciones de distancia.
        for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
            for (const constraint of this.constraints) {
                const pa = this.particles[constraint.a];
                const pb = this.particles[constraint.b];
                const dx = pb.position.x - pa.position.x;
                const dy = pb.position.y - pa.position.y;
                const dz = pb.position.z - pa.position.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
                const correction = (dist - constraint.rest) / dist * .5;
                const offX = dx * correction;
                const offY = dy * correction;
                const offZ = dz * correction;
                if (!pa.pinned) {
                    pa.position.x += offX;
                    pa.position.y += offY;
                    pa.position.z += offZ;
                }
                if (!pb.pinned) {
                    pb.position.x -= offX;
                    pb.position.y -= offY;
                    pb.position.z -= offZ;
                }
            }
        }

        // Límite de estiramiento máximo por restricción.
        for (const constraint of this.constraints) {
            const pa = this.particles[constraint.a];
            const pb = this.particles[constraint.b];
            const dx = pb.position.x - pa.position.x;
            const dy = pb.position.y - pa.position.y;
            const dz = pb.position.z - pa.position.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
            const maxLen = constraint.rest * MAX_STRETCH;
            if (dist > maxLen) {
                const factor = (dist - maxLen) / dist;
                if (pa.pinned) {
                    pb.position.x -= dx * factor;
                    pb.position.y -= dy * factor;
                    pb.position.z -= dz * factor;
                } else if (pb.pinned) {
                    pa.position.x += dx * factor;
                    pa.position.y += dy * factor;
                    pa.position.z += dz * factor;
                } else {
                    pa.position.x += dx * factor * .5;
                    pa.position.y += dy * factor * .5;
                    pa.position.z += dz * factor * .5;
                    pb.position.x -= dx * factor * .5;
                    pb.position.y -= dy * factor * .5;
                    pb.position.z -= dz * factor * .5;
                }
            }
        }

        // Colisión con el cilindro del cuerpo (solo en XZ).
        if (collider && collider.r > 0) {
            for (const particle of this.particles) {
                if (particle.pinned) continue;
                const dx = particle.position.x - collider.x;
                const dz = particle.position.z - collider.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < collider.r && dist > 1e-4) {
                    const push = collider.r - dist;
                    particle.position.x += dx / dist * push;
                    particle.position.z += dz / dist * push;
                }
            }
        }

        // Volcar partículas a la geometría.
        const positions = this.geometry.attributes.position;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i].position;
            positions.setXYZ(i, p.x, p.y, p.z);
        }
        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingSphere();
    }
}

// Limita el desplazamiento por frame de una partícula.
function clampDelta(value) {
    return value > MAX_DELTA ? MAX_DELTA : value < -MAX_DELTA ? -MAX_DELTA : value;
}
