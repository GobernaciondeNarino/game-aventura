// Cámara en tercera persona que sigue a un objetivo. El offset se rota según la
// orientación Y del objetivo y la posición se interpola (lerp) para suavizar el
// movimiento; `snap = true` la coloca de inmediato sin interpolar.

import { PerspectiveCamera, Vector3 } from 'three';

const DEFAULT_OFFSET = new Vector3(0, 3, -6);
const DEFAULT_LOOK_OFFSET = new Vector3(0, .5, 0);

export class CameraRig {
    constructor({
        fov = 75,
        aspect = 1,
        near = .1,
        far = 500,
        offset = DEFAULT_OFFSET.clone(),
        lookOffset = DEFAULT_LOOK_OFFSET.clone(),
        lerp = .1,
    } = {}) {
        this.camera = new PerspectiveCamera(fov, aspect, near, far);
        this.offset = offset;
        this.lookOffset = lookOffset;
        this.lerp = lerp;
        this._desiredPos = new Vector3();
        this._desiredLook = new Vector3();
        this._rotatedOffset = new Vector3();
    }

    update(target, snap = false) {
        const cos = Math.cos(target.rotation.y);
        const sin = Math.sin(target.rotation.y);
        this._rotatedOffset.set(
            this.offset.x * cos + this.offset.z * sin,
            this.offset.y,
            -this.offset.x * sin + this.offset.z * cos,
        );
        this._desiredPos.copy(target.position).add(this._rotatedOffset);
        this._desiredLook.copy(target.position).add(this.lookOffset);
        if (snap) this.camera.position.copy(this._desiredPos);
        else this.camera.position.lerp(this._desiredPos, this.lerp);
        this.camera.lookAt(this._desiredLook);
    }

    /**
   * Evita que la cámara se hunda en el terreno: la eleva hasta `clearance`
   * metros sobre el suelo y vuelve a apuntar al objetivo.
   */
  clampAboveGround(groundFn, clearance = 1.2) {
    const minY = groundFn(this.camera.position.x, this.camera.position.z) + clearance;
    if (this.camera.position.y < minY) {
      this.camera.position.y = minY;
      this.camera.lookAt(this._desiredLook);
    }
  }

  setAspect(aspect) {
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
    }
}
