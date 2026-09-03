// Gestor de entrada de teclado. Guarda el conjunto de teclas físicas presionadas
// (las flechas se traducen a WASD) y admite "teclas virtuales" que inyectan los
// controles táctiles. Al perder el foco de la ventana se limpian todas las teclas.

const KEY_ALIASES = {
    ArrowUp: 'KeyW',
    ArrowDown: 'KeyS',
    ArrowLeft: 'KeyA',
    ArrowRight: 'KeyD',
};

export class InputManager {
    constructor(target = typeof window !== 'undefined' ? window : null) {
        this._target = target;
        this._pressed = new Set();
        this._onKeyDown = (event) => this._handle(event, true);
        this._onKeyUp = (event) => this._handle(event, false);
        this._onBlur = () => this._pressed.clear();
        if (target) {
            target.addEventListener('keydown', this._onKeyDown);
            target.addEventListener('keyup', this._onKeyUp);
            target.addEventListener('blur', this._onBlur);
        }
    }

    _handle(event, isDown) {
        const code = KEY_ALIASES[event.code] ?? event.code;
        if (isDown) this._pressed.add(code);
        else this._pressed.delete(code);
    }

    // Permite simular una tecla desde controles en pantalla.
    setVirtual(code, isDown) {
        if (isDown) this._pressed.add(code);
        else this._pressed.delete(code);
    }

    isPressed(code) {
        return this._pressed.has(code);
    }

    any(...codes) {
        for (const code of codes) {
            if (this._pressed.has(code)) return true;
        }
        return false;
    }

    dispose() {
        if (this._target) {
            this._target.removeEventListener('keydown', this._onKeyDown);
            this._target.removeEventListener('keyup', this._onKeyUp);
            this._target.removeEventListener('blur', this._onBlur);
        }
        this._pressed.clear();
    }
}
