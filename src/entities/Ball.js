// Balón deportivo (fútbol, baloncesto o voleibol). Su estado físico es un objeto
// plano { x, y, z, vx, vy, vz, grounded }; `simulateStep` es puro y estático
// (gravedad, rebote y fricción) y `applyToMesh` vuelca el estado a la malla,
// rodándola según la velocidad horizontal.

import { Mesh, SphereGeometry, MeshStandardMaterial, CanvasTexture, Vector3 } from 'three';

const GRAVITY = -25;
const BOUNCE = .6;
const FRICTION = .95;
const BALL_RADIUS = .38;

export class Ball {
    constructor(kind, x, z) {
        this.kind = kind;
        this.radius = BALL_RADIUS;
        this.state = {
            x,
            y: BALL_RADIUS,
            z,
            vx: 0,
            vy: 0,
            vz: 0,
            grounded: true,
        };
        this.held = false;
        const texture = makeBallTexture(kind);
        const material = new MeshStandardMaterial({ map: texture, roughness: .55, metalness: 0 });
        this.mesh = new Mesh(new SphereGeometry(BALL_RADIUS, 20, 16), material);
        this.mesh.castShadow = true;
        this._axis = new Vector3();
    }

    static simulateStep(state, dt, radius = BALL_RADIUS) {
        let { x, y, z, vx, vy, vz } = state;
        vy += GRAVITY * dt;
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        let grounded = false;
        if (y <= radius) {
            y = radius;
            grounded = true;
            if (vy < 0) {
                vy = -vy * BOUNCE;
                if (vy < .8) vy = 0;
            }
            vx *= FRICTION;
            vz *= FRICTION;
            if (Math.abs(vx) < .02) vx = 0;
            if (Math.abs(vz) < .02) vz = 0;
        }
        return { x, y, z, vx, vy, vz, grounded };
    }

    applyToMesh(dt = 0) {
        const state = this.state;
        this.mesh.position.set(state.x, state.y, state.z);
        if (dt > 0 && !this.held) {
            const speed = Math.hypot(state.vx, state.vz);
            if (speed > .01) {
                this._axis.set(-state.vz, 0, state.vx).normalize();
                this.mesh.rotateOnWorldAxis(this._axis, speed * dt / this.radius);
            }
        }
    }
}

// Textura procedural según el tipo de balón.
function makeBallTexture(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (kind === 'basket') {
        ctx.fillStyle = '#e0792a';
        ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#161616';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(64, 0);
        ctx.lineTo(64, 128);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 64);
        ctx.lineTo(128, 64);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 64, 38, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(128, 64, 38, Math.PI / 2, 3 * Math.PI / 2);
        ctx.stroke();
    } else if (kind === 'volley') {
        ctx.fillStyle = '#f4f8ff';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#1a5276';
        for (let i = 0; i < 3; i++) ctx.fillRect(i * 44 + 6, 0, 12, 128);
    } else {
        // Fútbol: pentágonos oscuros sobre fondo claro.
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = '#1c1c22';
        const centers = [
            [32, 30],
            [92, 40],
            [60, 70],
            [24, 96],
            [100, 100],
        ];
        for (const [cx, cy] of centers) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = i / 5 * Math.PI * 2 - Math.PI / 2;
                const px = cx + Math.cos(angle) * 14;
                const py = cy + Math.sin(angle) * 14;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    return new CanvasTexture(canvas);
}
