// Generador pseudoaleatorio determinista (LCG) compartido por los constructores
// de NPC y fauna, para que el mundo se genere igual en cada carga.
// Semilla inicial 1; fórmula (seed * 9301 + 49297) % 233280.

let seed = 1;

export function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

export function pick(array) {
    return array[Math.floor(rand() * array.length)];
}
