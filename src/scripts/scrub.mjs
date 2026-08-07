// Matematica pura del scrub.
//
// Vive aparte del componente por una sola razon: es lo unico de este sistema
// que se puede verificar sin navegador. El resto -precarga, canvas, observers-
// no tiene forma honesta de testearse en este repo, asi que se verifica a mano.
// Nada de este archivo toca el DOM.

/**
 * Recorta un valor al rango 0..1.
 * @param {number} v
 * @returns {number}
 */
export function sujetar(v) {
  if (!(v > 0)) return 0; // atrapa NaN ademas de los negativos
  return v > 1 ? 1 : v;
}

/**
 * Progreso 0..1 de una card segun donde este su borde superior en el viewport.
 *
 * `entrada` y `salida` se expresan en alturas de viewport: p=0 cuando el borde
 * superior esta a `entrada` de la altura, p=1 cuando llego a `salida`. Como se
 * avanza bajando, entrada > salida.
 *
 * @param {number} top     rect.top de la card, en px
 * @param {number} vh      alto del viewport, en px
 * @param {number} entrada 0..1
 * @param {number} salida  0..1
 * @returns {number} 0..1
 */
export function progresoScrub(top, vh, entrada, salida) {
  if (!(vh > 0)) return 0;
  const rango = entrada - salida;
  // Ventana degenerada o invertida: se degrada a un umbral duro en vez de
  // devolver Infinity o NaN.
  if (!(rango > 0)) return top / vh <= salida ? 1 : 0;
  return sujetar((entrada - top / vh) / rango);
}

/**
 * Indice de cuadro para un progreso dado.
 * @param {number} p progreso 0..1
 * @param {number} n cantidad de cuadros
 * @returns {number}
 */
export function cuadroDe(p, n) {
  if (!(n > 1)) return 0;
  return Math.round(sujetar(p) * (n - 1));
}

/**
 * Avance lineal del modo hover.
 *
 * Sin easing a proposito: el timing ya viene horneado en la secuencia por el
 * disenador, y superponerle una curva le pisa la intencion. `duracion` solo
 * escala la velocidad.
 *
 * @param {number} p         progreso actual 0..1
 * @param {number} dt        ms transcurridos en este frame
 * @param {number} duracion  ms del recorrido completo
 * @param {1 | -1} direccion
 * @returns {number} 0..1
 */
export function avanzarHover(p, dt, duracion, direccion) {
  if (!(duracion > 0)) return direccion > 0 ? 1 : 0;
  return sujetar(p + (dt / duracion) * direccion);
}
