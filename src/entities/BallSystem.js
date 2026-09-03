// Sistema de balones del complejo deportivo. Gestiona varios `Ball`: recoger y
// soltar (G), patear o lanzar (F), empuje al chocar con el jugador, colisiones
// contra colisionadores circulares del mundo, paredes de arco (AABB), entre
// balones, y detección de goles/canastas mediante zonas.

import { Ball } from './Ball.js';
import { nearbyCircles } from '../core/collision.js';

const PLAYER_RADIUS = .5;
const PICKUP_RANGE = 2;
const KICK_RANGE = 1.9;
const KICK_SPEED = 13;
const KICK_LIFT = 4.5;
const THROW_SPEED = 16;
const THROW_LIFT = 7;
const HOLD_DISTANCE = .95;
const HOLD_HEIGHT = 1.4;

const DEFAULT_SPAWNS = [
    { kind: 'soccer', x: -30, z: 165 },
    { kind: 'basket', x: 50, z: 205 },
    { kind: 'volley', x: -12, z: 212 },
];

export class BallSystem {
    constructor(scene, colliders = [], spawns = null, { goalWalls, goalZones, onGoal, groundFn = null } = {}) {
        this.colliders = colliders;
        this.goalWalls = goalWalls || [];
        this.goalZones = goalZones || [];
        this.onGoal = onGoal || null;
        this.groundFn = groundFn || (() => 0);
        const spawnList = spawns || DEFAULT_SPAWNS;
        this.balls = spawnList.map((spawn) => new Ball(spawn.kind, spawn.x, spawn.z));
        for (const ball of this.balls) {
            ball.applyToMesh();
            scene.add(ball.mesh);
        }
        this.held = null;
        this._px = 0;
        this._pz = 0;
    }

    // fEdge / gEdge: flanco de pulsación de F (patear/lanzar) y G (agarrar/soltar).
    update(dt, player, { fEdge = false, gEdge = false } = {}) {
        const playerX = player.state.x;
        const playerZ = player.state.z;
        const rotationY = player.state.rotationY;
        const dirX = Math.sin(rotationY);
        const dirZ = Math.cos(rotationY);
        const playerSpeed = Math.hypot(playerX - this._px, playerZ - this._pz) / Math.max(dt, 1e-4);
        this._px = playerX;
        this._pz = playerZ;

        if (gEdge) {
            if (this.held) {
                this._release(this.held, dirX, dirZ, 1.5, 0);
                this.held = null;
            } else {
                const nearest = this._nearest(playerX, playerZ, PICKUP_RANGE);
                if (nearest) {
                    this.held = nearest;
                    nearest.held = true;
                }
            }
        }

        if (fEdge) {
            if (this.held) {
                this._release(this.held, dirX, dirZ, THROW_SPEED, THROW_LIFT);
                this.held = null;
            } else {
                const target = this._nearestInFront(playerX, playerZ, dirX, dirZ, KICK_RANGE);
                if (target) {
                    target.state.vx += dirX * KICK_SPEED;
                    target.state.vz += dirZ * KICK_SPEED;
                    target.state.vy = KICK_LIFT;
                }
            }
        }

        for (const ball of this.balls) {
            if (ball === this.held) {
                // Balón en manos: acompaña al jugador frente al pecho.
                ball.state.x = playerX + dirX * HOLD_DISTANCE;
                ball.state.z = playerZ + dirZ * HOLD_DISTANCE;
                ball.state.y = player.state.y + HOLD_HEIGHT;
                ball.state.vx = ball.state.vy = ball.state.vz = 0;
                ball.applyToMesh(dt);
                continue;
            }

            // Empuje al chocar con el cuerpo del jugador.
            const dx = ball.state.x - playerX;
            const dz = ball.state.z - playerZ;
            const dist = Math.hypot(dx, dz);
            const minDist = PLAYER_RADIUS + ball.radius;
            if (dist < minDist && dist > .001) {
                const overlap = minDist - dist;
                ball.state.x += dx / dist * overlap;
                ball.state.z += dz / dist * overlap;
                const pushSpeed = Math.max(playerSpeed, 2.5) * .9;
                ball.state.vx += dx / dist * pushSpeed;
                ball.state.vz += dz / dist * pushSpeed;
            }

            ball.state = Ball.simulateStep(ball.state, dt, ball.radius, this.groundFn(ball.state.x, ball.state.z));
            this._collideWorld(ball);
            this._collideAABBs(ball);
        }

        this._collideBalls();
        this._checkGoals();
        for (const ball of this.balls) {
            if (ball !== this.held) ball.applyToMesh(dt);
        }
    }

    // Paredes/postes de arco como cajas con rango vertical.
    _collideAABBs(ball) {
        for (const wall of this.goalWalls) {
            if (ball.state.y < wall.minY || ball.state.y > wall.maxY) continue;
            const closestX = Math.max(wall.minX, Math.min(ball.state.x, wall.maxX));
            const closestZ = Math.max(wall.minZ, Math.min(ball.state.z, wall.maxZ));
            const dx = ball.state.x - closestX;
            const dz = ball.state.z - closestZ;
            const distSq = dx * dx + dz * dz;
            if (distSq >= ball.radius * ball.radius) continue;
            if (distSq > 1e-9) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const nz = dz / dist;
                ball.state.x += nx * (ball.radius - dist);
                ball.state.z += nz * (ball.radius - dist);
                const dot = ball.state.vx * nx + ball.state.vz * nz;
                if (dot < 0) {
                    ball.state.vx -= 2 * dot * nx * .4;
                    ball.state.vz -= 2 * dot * nz * .4;
                }
            } else {
                // Centro dentro de la caja: salir por la cara más cercana.
                const toMinX = ball.state.x - wall.minX;
                const toMaxX = wall.maxX - ball.state.x;
                const toMinZ = ball.state.z - wall.minZ;
                const toMaxZ = wall.maxZ - ball.state.z;
                const nearest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
                if (nearest === toMinX) {
                    ball.state.x = wall.minX - ball.radius;
                    ball.state.vx = Math.min(0, ball.state.vx);
                } else if (nearest === toMaxX) {
                    ball.state.x = wall.maxX + ball.radius;
                    ball.state.vx = Math.max(0, ball.state.vx);
                } else if (nearest === toMinZ) {
                    ball.state.z = wall.minZ - ball.radius;
                    ball.state.vz = Math.min(0, ball.state.vz);
                } else {
                    ball.state.z = wall.maxZ + ball.radius;
                    ball.state.vz = Math.max(0, ball.state.vz);
                }
            }
        }
    }

    // Dispara onGoal una sola vez por entrada del balón en una zona.
    _checkGoals() {
        if (!this.onGoal || !this.goalZones.length) return;
        for (const ball of this.balls) {
            if (ball === this.held) {
                ball._scoredZone = null;
                continue;
            }
            let zoneHit = null;
            for (const zone of this.goalZones) {
                if (
                    ball.state.x >= zone.minX && ball.state.x <= zone.maxX &&
                    ball.state.z >= zone.minZ && ball.state.z <= zone.maxZ &&
                    Math.abs(ball.state.y - zone.y) <= zone.yTol
                ) {
                    zoneHit = zone;
                    break;
                }
            }
            if (zoneHit && ball._scoredZone !== zoneHit) {
                this.onGoal();
                ball._scoredZone = zoneHit;
            } else if (!zoneHit) {
                ball._scoredZone = null;
            }
        }
    }

    // Colisión elástica entre pares de balones libres.
    _collideBalls() {
        const count = this.balls.length;
        for (let i = 0; i < count; i++) {
            const a = this.balls[i];
            if (a === this.held) continue;
            for (let j = i + 1; j < count; j++) {
                const b = this.balls[j];
                if (b === this.held) continue;
                const dx = b.state.x - a.state.x;
                const dz = b.state.z - a.state.z;
                const minDist = a.radius + b.radius;
                const dist = Math.hypot(dx, dz);
                if (dist < minDist && dist > .001) {
                    const nx = dx / dist;
                    const nz = dz / dist;
                    const half = (minDist - dist) / 2;
                    a.state.x -= nx * half;
                    a.state.z -= nz * half;
                    b.state.x += nx * half;
                    b.state.z += nz * half;
                    const velA = a.state.vx * nx + a.state.vz * nz;
                    const relative = b.state.vx * nx + b.state.vz * nz - velA;
                    a.state.vx += relative * nx;
                    a.state.vz += relative * nz;
                    b.state.vx -= relative * nx;
                    b.state.vz -= relative * nz;
                }
            }
        }
    }

    nearBall(x, z, range = 2.5) {
        if (this.held) return true;
        for (const ball of this.balls) {
            if (Math.hypot(ball.state.x - x, ball.state.z - z) < range) return true;
        }
        return false;
    }

    _release(ball, dirX, dirZ, speed, lift) {
        ball.held = false;
        ball.state.x += dirX * .3;
        ball.state.z += dirZ * .3;
        ball.state.vx = dirX * speed;
        ball.state.vz = dirZ * speed;
        ball.state.vy = lift;
    }

    _nearest(x, z, range) {
        let best = null;
        let bestDist = range;
        for (const ball of this.balls) {
            if (ball === this.held) continue;
            const dist = Math.hypot(ball.state.x - x, ball.state.z - z);
            if (dist < bestDist) {
                best = ball;
                bestDist = dist;
            }
        }
        return best;
    }

    // Balón más cercano que no esté claramente detrás del jugador.
    _nearestInFront(x, z, dirX, dirZ, range) {
        let best = null;
        let bestDist = range;
        for (const ball of this.balls) {
            if (ball === this.held) continue;
            const dx = ball.state.x - x;
            const dz = ball.state.z - z;
            const dist = Math.hypot(dx, dz);
            if (dist >= bestDist || dist < .001 || dx / dist * dirX + dz / dist * dirZ < -.4) continue;
            best = ball;
            bestDist = dist;
        }
        return best;
    }

    // Colisionadores circulares del mundo ({ x, z, r }).
    _collideWorld(ball) {
        for (const collider of nearbyCircles(this.colliders, ball.state.x, ball.state.z, ball.radius)) {
            if (!collider.r) continue;
            const dx = ball.state.x - collider.x;
            const dz = ball.state.z - collider.z;
            const minDist = collider.r + ball.radius;
            const dist = Math.hypot(dx, dz);
            if (dist < minDist && dist > .001) {
                const nx = dx / dist;
                const nz = dz / dist;
                const overlap = minDist - dist;
                ball.state.x += nx * overlap;
                ball.state.z += nz * overlap;
                const dot = ball.state.vx * nx + ball.state.vz * nz;
                if (dot < 0) {
                    ball.state.vx -= 2 * dot * nx * .6;
                    ball.state.vz -= 2 * dot * nz * .6;
                }
            }
        }
    }
}
