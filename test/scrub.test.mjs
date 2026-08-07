import test from "node:test";
import assert from "node:assert/strict";
import {
  sujetar,
  progresoScrub,
  cuadroDe,
  avanzarHover,
} from "../src/scripts/scrub.mjs";

// Comparador con tolerancia. Varios de estos valores salen de dividir decimales
// que no son exactos en binario -0.9 - 0.525 no da 0.375 clavado-, asi que un
// assert.equal fallaria por un error de redondeo y no por un bug.
/** @param {number} a @param {number} b @param {string} [msg] */
const casi = (a, b, msg) =>
  assert.ok(Math.abs(a - b) < 1e-9, msg ?? `${a} != ${b}`);

test("sujetar recorta a 0..1", () => {
  assert.equal(sujetar(-3), 0);
  assert.equal(sujetar(0.42), 0.42);
  assert.equal(sujetar(9), 1);
  assert.equal(sujetar(0), 0);
  // NaN cae del lado seguro
  assert.equal(sujetar(NaN), 0);
});

test("progresoScrub mapea la ventana entrada->salida a 0..1", () => {
  const vh = 1000;
  const entrada = 0.9;
  const salida = 0.15;
  // borde superior justo en `entrada`: la card recien entra, nada corrio
  casi(progresoScrub(900, vh, entrada, salida), 0);
  // borde superior en `salida`: la animacion termino
  casi(progresoScrub(150, vh, entrada, salida), 1);
  // punto medio exacto de la ventana
  casi(progresoScrub(525, vh, entrada, salida), 0.5);
  // y es monotono decreciente en `top`
  assert.ok(
    progresoScrub(700, vh, entrada, salida) < progresoScrub(400, vh, entrada, salida),
  );
});

test("progresoScrub sujeta fuera de la ventana", () => {
  const vh = 1000;
  // todavia mas abajo que `entrada`
  assert.equal(progresoScrub(1200, vh, 0.9, 0.15), 0);
  // ya paso por arriba de `salida`, incluso con top negativo
  assert.equal(progresoScrub(-400, vh, 0.9, 0.15), 1);
});

test("progresoScrub no divide por cero", () => {
  // viewport de alto 0 (puede pasar en el primer frame de un tab oculto)
  assert.equal(progresoScrub(500, 0, 0.9, 0.15), 0);
  // ventana degenerada: entrada == salida
  assert.equal(progresoScrub(900, 1000, 0.5, 0.5), 0);
  assert.equal(progresoScrub(400, 1000, 0.5, 0.5), 1);
});

test("cuadroDe reparte el progreso entre los cuadros disponibles", () => {
  assert.equal(cuadroDe(0, 40), 0);
  assert.equal(cuadroDe(1, 40), 39);
  assert.equal(cuadroDe(0.5, 41), 20);
  // fuera de rango se sujeta antes de escalar
  assert.equal(cuadroDe(-2, 40), 0);
  assert.equal(cuadroDe(7, 40), 39);
});

test("cuadroDe sobrevive a una secuencia vacia", () => {
  assert.equal(cuadroDe(0.5, 0), 0);
  assert.equal(cuadroDe(0.5, 1), 0);
});

test("avanzarHover es lineal y reversible", () => {
  // medio recorrido en la mitad de la duracion
  casi(avanzarHover(0, 400, 800, 1), 0.5);
  // y vuelve por el mismo camino
  casi(avanzarHover(0.5, 400, 800, -1), 0);
  // lineal: dos pasos de dt dan lo mismo que uno de 2*dt
  casi(
    avanzarHover(avanzarHover(0, 100, 800, 1), 100, 800, 1),
    avanzarHover(0, 200, 800, 1),
  );
});

test("avanzarHover sujeta en los extremos", () => {
  assert.equal(avanzarHover(0.9, 400, 800, 1), 1);
  assert.equal(avanzarHover(0.1, 400, 800, -1), 0);
  // duracion 0: salto instantaneo al extremo que corresponda
  assert.equal(avanzarHover(0.3, 16, 0, 1), 1);
  assert.equal(avanzarHover(0.3, 16, 0, -1), 0);
});
