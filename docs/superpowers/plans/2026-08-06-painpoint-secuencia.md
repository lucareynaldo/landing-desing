# Card de painpoint con secuencia scrubeada — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `PainPoint.astro` por una card full-bleed al estilo readymag cuyo media es una secuencia de cuadros dibujada en canvas, con el progreso atado al scroll o al hover, configurable por instancia sin editar el componente.

**Architecture:** La matemática del progreso vive en un módulo `.mjs` puro y testeado con `node --test`. `SecuenciaScrub.astro` descubre los cuadros en build con `import.meta.glob`, los optimiza con `getImage()`, los precarga en orden y los dibuja en un `<canvas>` desde un único `requestAnimationFrame` compartido. `PainPoint.astro` es sólo el envase (fondo, proporción, posición del texto). `PainPoints.astro` es la sección y los datos.

**Tech Stack:** Astro 7 (SSG), Tailwind v4, `astro:assets` + sharp, `node --test` (sin dependencias de testing), Lenis para el scroll suave.

**Spec:** `docs/superpowers/specs/2026-08-06-painpoint-secuencia-design.md`

## Global Constraints

- Comentarios y nombres de variables **en español**, sin tildes en identificadores, siguiendo el estilo del repo (ver `QueHacemos.astro`, `PainPoint.astro`). Los comentarios explican *por qué*, no *qué*.
- El repo **no tiene framework de testing**. No se agrega ninguno. Lo único automatizable es la matemática pura → `node --test`, que viene con Node. Todo lo demás se verifica con `astro build`, `astro check` y comprobaciones en navegador con aserciones escritas, no con "mirá si se ve bien".
- Node `>=22.12.0` (declarado en `package.json:engines`; la máquina corre v24.7.0).
- El servidor de desarrollo se levanta en background: `astro dev --background`, y se maneja con `astro dev stop|status|logs` (regla de `CLAUDE.md`).
- `tsconfig.json` extiende `astro/tsconfigs/strict` e incluye `**/*`, así que `scripts/` y `test/` también pasan por `astro check`. Los `.mjs` llevan tipos por JSDoc.
- Los colores de la card son colores libres, **no tokens del tema**: `global.css:70-75` documenta que las paletas que viven en componentes no se invierten en modo oscuro.
- Ancho de salida de los cuadros: **1400 px** si `ancho="completo"`, **760 px** si `ancho="medio"`.
- Rango recomendado de cuadros por secuencia: **24–40**.
- Commits al final de cada tarea, en español, sin `--no-verify`.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/scripts/scrub.mjs` | **Crear.** Matemática pura: progreso por scroll, avance por hover, índice de cuadro. Sin DOM. |
| `test/scrub.test.mjs` | **Crear.** Tests de `node --test` sobre lo anterior. |
| `scripts/generar-secuencia-placeholder.mjs` | **Crear.** Genera la secuencia placeholder con sharp. Documentación ejecutable del formato. |
| `src/media/painpoints/feed/*.webp` | **Crear (generados).** 40 cuadros. Territorio del diseñador. |
| `src/components/SecuenciaScrub.astro` | **Crear.** Descubrimiento + optimización + precarga + canvas + motor. |
| `src/components/PainPoint.astro` | **Reescribir.** Envase: fondo, proporción, posición del texto. |
| `src/components/PainPoints.astro` | **Modificar.** Grilla bento y datos nuevos. |
| `package.json` | **Modificar.** `sharp` en devDependencies; scripts `test` y `placeholder`. |

---

### Task 1: Matemática del scrub

Es la única lógica del sistema que se puede testear sin navegador, así que va aparte del componente y se testea de verdad.

**Files:**
- Create: `src/scripts/scrub.mjs`
- Create: `test/scrub.test.mjs`
- Modify: `package.json` (agregar script `test`)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `sujetar(v: number) => number` — recorta a 0..1
  - `progresoScrub(top: number, vh: number, entrada: number, salida: number) => number` — 0..1
  - `cuadroDe(p: number, n: number) => number` — índice entero en 0..n-1
  - `avanzarHover(p: number, dt: number, duracion: number, direccion: 1 | -1) => number` — 0..1

- [ ] **Step 1: Escribir el test que falla**

Crear `test/scrub.test.mjs`:

```js
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
```

- [ ] **Step 2: Agregar el script `test` a `package.json`**

En el objeto `scripts`, después de `"astro": "astro"`, agregar:

```json
    "test": "node --test test/"
```

(Recordá la coma al final de la línea anterior.)

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../src/scripts/scrub.mjs'`

- [ ] **Step 4: Escribir la implementación**

Crear `src/scripts/scrub.mjs`:

```js
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
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test`
Expected: PASS — 8 tests, 0 fallos.

Si `progresoScrub` falla en el caso del punto medio, revisá que estés usando `casi` y no `assert.equal`: es error de redondeo binario, no un bug de la función.

- [ ] **Step 6: Verificar que el chequeo de tipos sigue limpio**

Run: `npx astro check`
Expected: 0 errors. (`astro/tsconfigs/strict` trae `allowJs`, así que los JSDoc de `.mjs` se chequean.)

- [ ] **Step 7: Commit**

```bash
git add src/scripts/scrub.mjs test/scrub.test.mjs package.json
git commit -m "Matematica del scrub, con tests de node:test"
```

---

### Task 2: Generador de la secuencia placeholder

Sin assets la sección queda rota. Este script produce una secuencia real y además le documenta al diseñador, de forma ejecutable, qué formato se espera.

**Files:**
- Create: `scripts/generar-secuencia-placeholder.mjs`
- Create (generados): `src/media/painpoints/feed/0001.webp` … `0040.webp`
- Modify: `package.json` (dependencia `sharp`, script `placeholder`)

**Interfaces:**
- Consumes: nada.
- Produces: la carpeta `src/media/painpoints/feed/` con 40 archivos `NNNN.webp` de 1400×875 px. La Task 3 los consume por `import.meta.glob`.

- [ ] **Step 1: Declarar sharp como dependencia explícita**

`sharp` ya está en el árbol como dependencia de Astro, pero apoyarse en una transitiva es frágil.

Run: `npm i -D sharp`
Expected: `package.json` gana `sharp` en `devDependencies`.

- [ ] **Step 2: Agregar el script `placeholder` a `package.json`**

En `scripts`:

```json
    "placeholder": "node scripts/generar-secuencia-placeholder.mjs"
```

- [ ] **Step 3: Escribir el generador**

Crear `scripts/generar-secuencia-placeholder.mjs`:

```js
// Genera la secuencia placeholder del painpoint "feed": nueve piezas que pasan
// de un feed sin sistema -colores sin relacion, todo torcido- a un feed con
// sistema -dos neutros y un acento, alineado-.
//
// Es un placeholder, pero tambien es documentacion ejecutable del formato que
// espera SecuenciaScrub: NNNN.webp numerados desde 0001, ordenados por nombre.
// Cuando el disenador entregue los cuadros reales, vacia la carpeta y los tira
// adentro. Este script no se vuelve a correr.
//
// Uso:
//   node scripts/generar-secuencia-placeholder.mjs [carpeta] [--force]
//
// Se niega a escribir sobre una carpeta que ya tiene contenido salvo que se
// pase --force, para no pisarle los assets al disenador.

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const CUADROS = 40;
const ANCHO = 1400;
const ALTO = 875;
const FONDO = "#000000";

// Feed sin sistema: nueve colores que no se hablan entre si.
const ANTES = [
  "#ff2d55", "#00c2a8", "#ffcc00",
  "#7b2fff", "#ff7a00", "#0066ff",
  "#12d18e", "#ff4dd2", "#c9c9c9",
];

// El mismo feed con sistema: dos neutros y un acento, rotando. Los neutros son
// claros porque la card es negra; con los #282828 del componente viejo no se
// veria nada.
const DESPUES = [
  "#e7e7e7", "#8800ff", "#f4f4f4",
  "#8800ff", "#f4f4f4", "#e7e7e7",
  "#f4f4f4", "#e7e7e7", "#8800ff",
];

// Desorden inicial: rotacion en grados y desplazamiento en px por pieza.
const ROT = [-6, 4, -3, 7, -5, 2, -7, 5, -2];
const JIT = [
  [-14, 9], [11, -7], [-8, -12],
  [13, 10], [-10, -9], [7, 12],
  [-12, -8], [9, 11], [-6, -10],
];

const LADO = 660; // lado del cuadrado que forma la grilla
const HUECO = 18;
const CELDA = (LADO - 2 * HUECO) / 3;
const X0 = (ANCHO - LADO) / 2;
const Y0 = (ALTO - LADO) / 2;

/** @param {number} t @returns {number} */
const suavizar = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Las nueve piezas no arrancan juntas: cada una entra 0.045 despues que la
 * anterior. La ola es lo que hace que se lea como que algo se ordena, y no
 * como un crossfade.
 * @param {number} e progreso global 0..1
 * @param {number} i indice de pieza 0..8
 * @returns {number} progreso local 0..1
 */
function escalonar(e, i) {
  const paso = 0.045;
  const util = 1 - 8 * paso;
  const local = (e - i * paso) / util;
  return local < 0 ? 0 : local > 1 ? 1 : local;
}

/** @param {string} hex @returns {[number, number, number]} */
function aRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** @param {string} a @param {string} b @param {number} t @returns {string} */
function mezclar(a, b, t) {
  const [r1, g1, b1] = aRgb(a);
  const [r2, g2, b2] = aRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}

/** @param {number} e progreso global 0..1 @returns {string} */
function svgDe(e) {
  const partes = [`<rect width="${ANCHO}" height="${ALTO}" fill="${FONDO}"/>`];
  for (let i = 0; i < 9; i++) {
    const t = suavizar(escalonar(e, i));
    const col = i % 3;
    const fila = Math.floor(i / 3);
    const cx = X0 + col * (CELDA + HUECO) + CELDA / 2 + JIT[i][0] * (1 - t);
    const cy = Y0 + fila * (CELDA + HUECO) + CELDA / 2 + JIT[i][1] * (1 - t);
    const rot = (ROT[i] * (1 - t)).toFixed(2);
    const esc = (0.9 + 0.1 * t).toFixed(4);
    const color = mezclar(ANTES[i], DESPUES[i], t);
    partes.push(
      `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${rot}) scale(${esc})">` +
        `<rect x="${(-CELDA / 2).toFixed(2)}" y="${(-CELDA / 2).toFixed(2)}" ` +
        `width="${CELDA.toFixed(2)}" height="${CELDA.toFixed(2)}" rx="20" fill="${color}"/>` +
        `</g>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}">${partes.join("")}</svg>`;
}

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes("--force");
  const carpeta = args.find((a) => !a.startsWith("--")) ?? "feed";
  const destino = path.join(RAIZ, "src", "media", "painpoints", carpeta);

  let existentes = [];
  try {
    existentes = await readdir(destino);
  } catch {
    // la carpeta no existe todavia, que es el caso normal
  }

  if (existentes.length > 0 && !forzar) {
    console.error(
      `${path.relative(RAIZ, destino)} ya tiene ${existentes.length} archivo(s).\n` +
        `Si son los cuadros del disenador NO los pises. Para sobrescribir igual: --force`,
    );
    process.exitCode = 1;
    return;
  }

  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });

  for (let n = 0; n < CUADROS; n++) {
    const e = CUADROS > 1 ? n / (CUADROS - 1) : 1;
    const nombre = `${String(n + 1).padStart(4, "0")}.webp`;
    const buffer = await sharp(Buffer.from(svgDe(e)))
      .webp({ quality: 82 })
      .toBuffer();
    await writeFile(path.join(destino, nombre), buffer);
  }

  console.log(`${CUADROS} cuadros de ${ANCHO}x${ALTO} en ${path.relative(RAIZ, destino)}`);
}

await main();
```

- [ ] **Step 4: Generar los cuadros**

Run: `npm run placeholder`
Expected: `40 cuadros de 1400x875 en src/media/painpoints/feed`

- [ ] **Step 5: Verificar el resultado**

Run:

```bash
ls src/media/painpoints/feed | head -3
ls src/media/painpoints/feed | wc -l
du -sh src/media/painpoints/feed
```

Expected: `0001.webp` / `0002.webp` / `0003.webp`, cuenta `40`, y un peso total de unos pocos cientos de KB (son formas planas, comprimen muy bien; el número de la tabla del spec es para contenido fotográfico).

- [ ] **Step 6: Verificar que el primero y el último son distintos**

Run:

```bash
node -e "const{statSync}=require('fs');const a=statSync('src/media/painpoints/feed/0001.webp').size,b=statSync('src/media/painpoints/feed/0040.webp').size;console.log(a,b,a!==b?'OK: distintos':'FALLA: identicos')"
```

Expected: dos tamaños distintos y `OK: distintos`. Si salen idénticos, la interpolación no está corriendo.

- [ ] **Step 7: Verificar la protección contra sobrescritura**

Run: `npm run placeholder`
Expected: FALLA con `ya tiene 40 archivo(s)` y código de salida 1. Es el comportamiento buscado: el script no le pisa los assets al diseñador.

- [ ] **Step 8: Commit**

```bash
git add scripts/generar-secuencia-placeholder.mjs src/media/painpoints/feed package.json package-lock.json
git commit -m "Generador de la secuencia placeholder del feed"
```

---

### Task 3: SecuenciaScrub.astro

El motor. No sabe nada de painpoints: recibe el nombre de una carpeta y un modo, y dibuja.

**Files:**
- Create: `src/components/SecuenciaScrub.astro`

**Interfaces:**
- Consumes: `src/scripts/scrub.mjs` (`progresoScrub`, `cuadroDe`, `avanzarHover`); la carpeta `src/media/painpoints/<secuencia>/`.
- Produces: componente Astro con estas props —
  `secuencia: string`, `alt: string`, `modo?: "scrub" | "hover"` (default `"scrub"`), `ancho?: number` (default `1400`), `entrada?: number` (default `0.9`), `salida?: number` (default `0.15`), `duracion?: number` (default `800`), `class?: string`.

- [ ] **Step 1: Escribir el componente**

Crear `src/components/SecuenciaScrub.astro`:

```astro
---
// Dibuja una secuencia de cuadros en un canvas, con el progreso atado al scroll
// o al hover. No sabe nada de painpoints: recibe el nombre de una carpeta.
//
// Por que una secuencia de cuadros y no un <video> scrubeado: fijar currentTime
// obliga a hacer seek, y un mp4 normal solo salta a keyframes (uno cada ~2s),
// asi que el scrub sale escalonado. Encodear con todos los cuadros como
// keyframe lo arregla, pero infla el archivo hasta pesar lo mismo que la
// secuencia -es una secuencia dentro de un contenedor- y encima hay que
// explicarle la receta de encode a quien entregue el asset.

import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

interface Props {
  /** Nombre de la carpeta en src/media/painpoints/ */
  secuencia: string;
  alt: string;
  modo?: "scrub" | "hover";
  /** Ancho de salida de los cuadros, en px */
  ancho?: number;
  /** p=0 cuando el borde superior de la card esta a `entrada` del alto del viewport */
  entrada?: number;
  /** p=1 cuando llego a `salida` */
  salida?: number;
  /** ms del recorrido completo en modo hover */
  duracion?: number;
  class?: string;
}

const {
  secuencia,
  alt,
  modo = "scrub",
  ancho = 1400,
  entrada = 0.9,
  salida = 0.15,
  duracion = 800,
  class: clase,
} = Astro.props;

// El patron del glob tiene que ser un literal: Vite lo analiza estaticamente y
// no acepta una variable. Por eso se traen TODAS las secuencias y se filtra
// despues por prefijo. Es trabajo de build, no de runtime.
const TODOS = import.meta.glob<{ default: ImageMetadata }>(
  "/src/media/painpoints/*/*.{webp,png,jpg,jpeg,avif}",
  { eager: true },
);

const prefijo = `/src/media/painpoints/${secuencia}/`;
const rutas = Object.keys(TODOS)
  .filter((r) => r.startsWith(prefijo))
  .sort();

if (rutas.length === 0) {
  throw new Error(
    `SecuenciaScrub: no hay cuadros en src/media/painpoints/${secuencia}/.\n` +
      `Se esperan archivos numerados y ordenables por nombre: 0001.webp, 0002.webp, ...\n` +
      `Formatos aceptados: .webp .png .jpg .jpeg .avif`,
  );
}

// El alto se deriva del primer cuadro en vez de leerse del resultado de
// getImage(): asi el markup no depende de la forma de ese objeto.
const origen = TODOS[rutas[0]].default;
const anchoSalida = Math.min(ancho, origen.width);
const altoSalida = Math.round((origen.height / origen.width) * anchoSalida);

const optimizados = await Promise.all(
  rutas.map((r) =>
    getImage({ src: TODOS[r].default, format: "webp", width: anchoSalida }),
  ),
);
const urls = optimizados.map((o) => o.src);

// El poster es el ULTIMO cuadro, no el primero: es lo que se ve sin JS y con
// prefers-reduced-motion, y en un painpoint lo que tiene que quedar en pantalla
// si la animacion nunca corre es la resolucion, no el problema.
const poster = urls[urls.length - 1];
---

<div
  class:list={["secuencia", clase]}
  data-secuencia
  data-modo={modo}
  data-entrada={entrada}
  data-salida={salida}
  data-duracion={duracion}
>
  <img
    class="secuencia-capa"
    src={poster}
    width={anchoSalida}
    height={altoSalida}
    alt={alt}
    loading="lazy"
    decoding="async"
  />
  <canvas
    class="secuencia-capa secuencia-lienzo"
    width={anchoSalida}
    height={altoSalida}
    aria-hidden="true"
    data-lienzo></canvas>
  {/*
    Las URLs viajan en un <script type="application/json"> y no por define:vars
    a proposito: define:vars fuerza is:inline, y con eso el motor entero se
    duplicaria una vez por instancia en vez de bundlearse una sola vez.
  */}
  <script type="application/json" data-cuadros set:html={JSON.stringify(urls)} />
</div>

<style>
  .secuencia {
    position: relative;
    overflow: hidden;
  }
  .secuencia-capa {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    /* cover y no fill: si la proporcion de la card no coincide con la del
       asset, se recorta en vez de deformarse. Aplica a <canvas> igual que a
       <img>: los dos son elementos reemplazados. */
    object-fit: cover;
  }
  .secuencia-lienzo {
    opacity: 0;
    transition: opacity var(--duration-base) var(--ease-out);
  }
  .secuencia-lienzo[data-listo] {
    opacity: 1;
  }
</style>

<script>
  import { avanzarHover, cuadroDe, progresoScrub } from "../scripts/scrub.mjs";

  // Astro iza este script y lo ejecuta UNA sola vez, aunque haya seis
  // instancias del componente en la pagina. De ahi el querySelectorAll.
  (() => {
    const raices = document.querySelectorAll<HTMLElement>("[data-secuencia]");
    if (!raices.length) return;

    // Con reduced-motion no se instancia el motor Y NO SE DESCARGA NINGUN
    // CUADRO. Se ahorra el peso entero de las secuencias y queda el poster,
    // que es el ultimo cuadro. Es la degradacion mas honesta y la mas rapida.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raices.forEach((r) => r.querySelector("[data-lienzo]")?.remove());
      return;
    }

    interface Instancia {
      raiz: HTMLElement;
      lienzo: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      urls: string[];
      imgs: (HTMLImageElement | null)[];
      listos: boolean[];
      /** cuantos cuadros consecutivos desde 0 ya resolvieron */
      tope: number;
      modo: "scrub" | "hover";
      entrada: number;
      salida: number;
      duracion: number;
      p: number;
      dir: 1 | -1;
      ultimo: number;
      pidiendo: boolean;
    }

    const instancias: Instancia[] = [];

    raices.forEach((raiz) => {
      const lienzo = raiz.querySelector<HTMLCanvasElement>("[data-lienzo]");
      const datos = raiz.querySelector<HTMLScriptElement>("[data-cuadros]");
      const ctx = lienzo?.getContext("2d");
      if (!lienzo || !datos || !ctx) return;

      let urls: string[];
      try {
        urls = JSON.parse(datos.textContent || "[]");
      } catch {
        return;
      }
      if (!urls.length) return;

      const inst: Instancia = {
        raiz,
        lienzo,
        ctx,
        urls,
        imgs: new Array(urls.length).fill(null),
        listos: new Array(urls.length).fill(false),
        tope: 0,
        modo: raiz.dataset.modo === "hover" ? "hover" : "scrub",
        entrada: Number(raiz.dataset.entrada ?? 0.9),
        salida: Number(raiz.dataset.salida ?? 0.15),
        duracion: Number(raiz.dataset.duracion ?? 800),
        p: 0,
        dir: -1,
        ultimo: -1,
        pidiendo: false,
      };
      instancias.push(inst);

      if (inst.modo === "hover") {
        if (matchMedia("(pointer: fine)").matches) {
          raiz.addEventListener("pointerenter", () => (inst.dir = 1));
          raiz.addEventListener("pointerleave", () => (inst.dir = -1));
        } else {
          // En tactil no hay hover: un tap invierte la direccion.
          raiz.addEventListener("pointerdown", () => {
            inst.dir = inst.dir > 0 ? -1 : 1;
          });
        }
      }
    });

    if (!instancias.length) return;

    // --- Precarga -------------------------------------------------------
    // En orden y con concurrencia tope, para que los primeros cuadros -que son
    // los que se ven primero- lleguen primero. Con 40 requests disparados de
    // una, el navegador los sirve en cualquier orden y la animacion se queda
    // esperando el cuadro 3 mientras ya tiene el 37.
    const CONCURRENCIA = 6;

    function precargar(inst: Instancia) {
      if (inst.pidiendo) return;
      inst.pidiendo = true;

      let siguiente = 0;
      let activos = 0;

      const avanzarTope = () => {
        while (inst.tope < inst.listos.length && inst.listos[inst.tope]) {
          inst.tope++;
        }
      };

      const bombear = () => {
        while (activos < CONCURRENCIA && siguiente < inst.urls.length) {
          const i = siguiente++;
          activos++;
          const img = new Image();
          img.decoding = "async";
          const resolver = () => {
            activos--;
            inst.imgs[i] = img.naturalWidth > 0 ? img : null;
            inst.listos[i] = true;
            avanzarTope();
            bombear();
          };
          img.onload = resolver;
          img.onerror = resolver;
          img.src = inst.urls[i];
        }
      };

      bombear();
    }

    // --- Dibujo ---------------------------------------------------------
    function dibujar(inst: Instancia, idx: number) {
      // Un cuadro que fallo al cargar se salta hacia atras hasta el ultimo
      // bueno, para no dejar el canvas en blanco por un 404 suelto.
      let i = idx;
      while (i >= 0 && !inst.imgs[i]) i--;
      const img = i >= 0 ? inst.imgs[i] : null;
      if (!img) return;

      inst.ctx.drawImage(img, 0, 0, inst.lienzo.width, inst.lienzo.height);
      inst.ultimo = idx;
      if (!inst.lienzo.hasAttribute("data-listo")) {
        inst.lienzo.setAttribute("data-listo", "");
      }
    }

    // --- Loop -----------------------------------------------------------
    // Un solo rAF para todas las instancias, y corre solo mientras haya alguna
    // en pantalla.
    //
    // rAF permanente en vez de un listener de scroll porque el sitio usa Lenis:
    // un listener solo se entera cuando el navegador emite un scroll nativo, y
    // Lenis interpola posiciones ENTRE esos eventos, asi que la animacion
    // quedaria un escalon atras del contenido que la rodea. Leer
    // getBoundingClientRect() por frame es inmune a eso.
    const vivas = new Set<Instancia>();
    let corriendo = false;
    let previo = 0;

    function frame(t: number) {
      const dt = previo ? Math.min(64, t - previo) : 16;
      previo = t;
      const vh = window.innerHeight;

      vivas.forEach((inst) => {
        if (inst.modo === "scrub") {
          const top = inst.raiz.getBoundingClientRect().top;
          inst.p = progresoScrub(top, vh, inst.entrada, inst.salida);
        } else {
          inst.p = avanzarHover(inst.p, dt, inst.duracion, inst.dir);
        }

        const deseado = cuadroDe(inst.p, inst.urls.length);
        // Mientras la precarga va por la mitad se dibuja el ultimo cuadro
        // disponible: la animacion se pone al dia sola en vez de mostrar un
        // hueco.
        const idx = inst.tope > 0 ? Math.min(deseado, inst.tope - 1) : -1;
        if (idx >= 0 && idx !== inst.ultimo) dibujar(inst, idx);
      });

      if (vivas.size) {
        requestAnimationFrame(frame);
      } else {
        corriendo = false;
        previo = 0;
      }
    }

    function arrancar() {
      if (corriendo) return;
      corriendo = true;
      requestAnimationFrame(frame);
    }

    const porRaiz = new Map(instancias.map((i) => [i.raiz, i]));

    // La descarga arranca ~1,5 pantallas antes de que la card entre, asi que
    // para cuando se ve ya hay cuadros. No compite con el render inicial.
    const ioCarga = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          if (!e.isIntersecting) return;
          const inst = porRaiz.get(e.target as HTMLElement);
          if (inst) precargar(inst);
          ioCarga.unobserve(e.target);
        });
      },
      { rootMargin: "150% 0px" },
    );

    const ioVivas = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => {
          const inst = porRaiz.get(e.target as HTMLElement);
          if (!inst) return;
          if (e.isIntersecting) vivas.add(inst);
          else vivas.delete(inst);
        });
        if (vivas.size) arrancar();
      },
      { rootMargin: "10% 0px" },
    );

    instancias.forEach((inst) => {
      ioCarga.observe(inst.raiz);
      ioVivas.observe(inst.raiz);
    });
  })();
</script>
```

- [ ] **Step 2: Verificar tipos**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 3: Verificar que el build no se rompió**

Run: `npx astro build`
Expected: build exitoso.

> **Este paso es sólo una comprobación de no-regresión.** En este punto nadie instancia `SecuenciaScrub`, así que Astro ni lo incluye en el build: no se resuelve el glob, no corre `getImage()` y el `throw` de la carpeta faltante no se ejecuta. Las verificaciones reales del componente —cuadros emitidos en `dist/_astro`, build roto si falta la carpeta, dibujo en el canvas— viven en la Task 5, que es donde el componente empieza a estar en la página. No las adelantes acá: pasarían por el motivo equivocado.

- [ ] **Step 4: Commit**

```bash
git add src/components/SecuenciaScrub.astro
git commit -m "SecuenciaScrub: canvas con secuencia de cuadros scrubeada por scroll o hover"
```

---

### Task 4: PainPoint.astro

El envase. Todo lo visual y ninguna lógica de animación.

**Files:**
- Modify (reescritura completa): `src/components/PainPoint.astro`

**Interfaces:**
- Consumes: `SecuenciaScrub.astro` con las props de la Task 3.
- Produces: componente Astro con estas props —
  `titulo: string`, `texto: string`, `secuencia: string`, `eyebrow?: string`, `columna?: "izq" | "der" | "centro"` (default `"izq"`), `modo?: "scrub" | "hover"` (default `"scrub"`), `fondo?: string` (default `"#000000"`), `tinta?: "clara" | "oscura"` (default `"clara"`), `ancho?: "completo" | "medio"` (default `"completo"`), `proporcion?: string` (default `"16/10"`), `scrub?: { entrada?: number; salida?: number }`, `hover?: { duracion?: number }`.

  Las props `eyebrow`, `pain`, `solution`, `before` y `after` del componente viejo **dejan de existir**. La Task 5 actualiza al único consumidor.

- [ ] **Step 1: Reescribir el componente**

Reemplazar el contenido completo de `src/components/PainPoint.astro`:

```astro
---
// Card de painpoint, con el molde de las cards de readymag.com: fondo solido
// propio, media full-bleed por debajo del texto, y el texto en dos bloques
// anclados -titulo arriba, parrafo abajo- dentro de una columna que se elige
// por prop.
//
// La animacion no vive aca: la card solo dice que carpeta de cuadros mostrar y
// bajo que condiciones. El motor esta en SecuenciaScrub.

import SecuenciaScrub from "./SecuenciaScrub.astro";

interface Props {
  titulo: string;
  texto: string;
  /** Carpeta de cuadros en src/media/painpoints/ */
  secuencia: string;
  eyebrow?: string;
  columna?: "izq" | "der" | "centro";
  modo?: "scrub" | "hover";
  /** Color de fondo de la card. Color libre, no token: ver global.css:70-75 */
  fondo?: string;
  tinta?: "clara" | "oscura";
  ancho?: "completo" | "medio";
  /** aspect-ratio de la card, de md para arriba */
  proporcion?: string;
  scrub?: { entrada?: number; salida?: number };
  hover?: { duracion?: number };
}

const {
  titulo,
  texto,
  secuencia,
  eyebrow,
  columna = "izq",
  modo = "scrub",
  fondo = "#000000",
  tinta = "clara",
  ancho = "completo",
  proporcion = "16/10",
  scrub = {},
  hover = {},
} = Astro.props;

const { entrada = 0.9, salida = 0.15 } = scrub;
const { duracion = 800 } = hover;

// El ancho de salida de los cuadros sale de la celda que ocupa la card. Generar
// 1400px para una card que nunca se dibuja mas ancha que ~680 CSS px seria
// tirar mas de la mitad del peso a la basura.
const anchoCuadro = ancho === "completo" ? 1400 : 760;

// La columna se resuelve con margenes automaticos y no con un grid de 12: son
// tres casos, y `mr-auto` se lee mejor que `col-start-1 col-span-5`.
const COLUMNA = {
  izq: "mr-auto text-left",
  der: "ml-auto text-right",
  centro: "mx-auto text-center",
} as const;
---

{/*
  `isolate` mas `-z-10` en el media es lo que deja el canvas por encima del
  fondo de la card pero por debajo del texto, sin sacarlo de la card: dentro de
  un contexto de apilamiento, los hijos con z negativo pintan despues del fondo
  del propio elemento.

  En movil se abandona el aspect-ratio y manda min-height: con la card angosta,
  un aspect-ratio fijo mas cuatro lineas de parrafo desborda.
*/}
<article
  class:list={[
    "painpoint relative isolate flex min-h-[28rem] flex-col justify-between overflow-hidden rounded-[2rem] p-7",
    "md:min-h-0 md:rounded-[2.5rem] md:p-10 md:[aspect-ratio:var(--proporcion)] lg:p-12",
    ancho === "completo" && "md:col-span-2",
    tinta === "clara" ? "text-white" : "text-ink-strong",
  ]}
  style={`background:${fondo}; --proporcion:${proporcion};`}
>
  <SecuenciaScrub
    secuencia={secuencia}
    alt={titulo}
    modo={modo}
    ancho={anchoCuadro}
    entrada={entrada}
    salida={salida}
    duracion={duracion}
    class="absolute inset-0 -z-10"
  />

  <header class:list={["max-w-[24ch]", COLUMNA[columna]]}>
    {eyebrow && <p class="type-meta opacity-70">{eyebrow}</p>}
    {/*
      El max-width va en el h3 y no en el header: la unidad `ch` se resuelve
      contra el font-size del PROPIO elemento, y en el header (16px heredados)
      daria una columna mucho mas angosta que la que se ve escrita.
    */}
    <h3
      class:list={[
        "type-display max-w-[16ch] text-[clamp(1.75rem,3.6vw,3.25rem)]",
        columna === "der" && "ml-auto",
        columna === "centro" && "mx-auto",
        eyebrow && "mt-3",
      ]}
    >
      {titulo}
    </h3>
  </header>

  <p class:list={["type-body mt-8 max-w-[46ch] text-base md:text-lg", COLUMNA[columna]]}>
    {texto}
  </p>
</article>
```

- [ ] **Step 2: Verificar tipos**

Run: `npx astro check`
Expected: **errores esperados** en `PainPoints.astro`, que todavía le pasa `pain`, `solution`, `before` y `after`. Eso confirma que el contrato viejo murió. Los arregla la Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/components/PainPoint.astro
git commit -m "PainPoint: envase full-bleed con posicion de texto configurable"
```

---

### Task 5: Sección, grilla bento y verificación end-to-end

**Files:**
- Modify: `src/components/PainPoints.astro`

**Interfaces:**
- Consumes: `PainPoint.astro` con las props de la Task 4.
- Produces: nada que consuman otras tareas. Es la hoja del árbol.

- [ ] **Step 1: Reescribir la sección**

Reemplazar el contenido completo de `src/components/PainPoints.astro`:

```astro
---
import PainPoint from "./PainPoint.astro";

// Agregar un dolor es sumar un objeto a este array y una carpeta de cuadros en
// src/media/painpoints/. La card ya es generica: nada de lo de abajo pide tocar
// PainPoint.astro.
//
// `ancho: "completo"` ocupa las dos columnas; dos dolores seguidos con
// `ancho: "medio"` quedan uno al lado del otro, que es el ritmo bento de la
// referencia.
const dolores = [
  {
    eyebrow: "El feed",
    titulo: "Cada publicación parece de una marca distinta",
    texto:
      "No es falta de ideas, es falta de sistema. Definimos una paleta, una retícula y una jerarquía tipográfica, y de golpe las mismas publicaciones se leen como una sola voz.",
    secuencia: "feed",
    fondo: "#000000",
    tinta: "clara" as const,
    columna: "izq" as const,
    ancho: "completo" as const,
    proporcion: "16/10",
  },
];
---

<section id="dolores" class="mx-auto max-w-[1400px] px-6 py-24 md:px-10 md:py-36">
  {/*
    El max-width va en el h2, NO en el header: la unidad `ch` se resuelve
    contra el font-size del propio elemento. En el header (16px heredados)
    24ch daban ~190px y estrangulaban el titular contra el borde izquierdo,
    dejando medio ancho de pagina vacio.
  */}
  <header>
    <p class="type-meta text-ink-muted">Probablemente te suene</p>
    <h2 class="type-display mt-4 max-w-[18ch] text-[clamp(2rem,5vw,4rem)] text-ink-strong">
      No es que diseñes mal. Es que nadie puso las reglas.
    </h2>
  </header>

  <div class="mt-14 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-2 md:gap-8">
    {dolores.map((d) => <PainPoint {...d} />)}
  </div>
</section>
```

- [ ] **Step 2: Verificar tipos y build**

Run: `npx astro check && npx astro build`
Expected: 0 errors, build exitoso.

Ahora sí el componente está en la página, así que los cuadros se emiten:

Run: `ls dist/_astro | grep -c '^0[0-9]\{3\}\.'`
Expected: `40`. Los nombres son `0001.<hash>.webp`, con el hash que agrega Astro.

- [ ] **Step 3: Verificar que la carpeta faltante rompe el build**

```bash
mv src/media/painpoints/feed src/media/painpoints/_feed_off
npx astro build ; echo "exit=$?"
mv src/media/painpoints/_feed_off src/media/painpoints/feed
```

Expected: falla con `SecuenciaScrub: no hay cuadros en src/media/painpoints/feed/` y `exit` distinto de 0.

- [ ] **Step 4: Levantar el servidor de desarrollo**

Run: `npx astro dev --background`
Luego: `npx astro dev status` para confirmar el puerto (`package.json` lo fija en `127.0.0.1`).

- [ ] **Step 5: Verificar el scrub en el navegador**

Abrir la home y correr esta comprobación, que es la misma con la que se auditó readymag: **cuatro posiciones de scroll dan cuatro cuadros distintos, y dos lecturas al mismo `scrollY` dan el mismo cuadro.**

El sitio corre Lenis (`Base.astro:96-117`), que anima el scroll en su propio rAF y no expone handle global. Un `scrollTo` directo puede quedar a medio camino, así que el script **lee la posición realmente alcanzada** en vez de asumirla: si Lenis peleó, se ve en los datos y no se confunde con un motor roto.

```js
const raiz = document.querySelector('[data-secuencia]');
const lienzo = raiz.querySelector('[data-lienzo]');
// Firma barata del canvas: se samplea 1 de cada 997 bytes. Alcanza para
// distinguir cuadros sin traer 4 MB de pixeles a JS.
const firma = () => lienzo.getContext('2d')
  .getImageData(0, 0, lienzo.width, lienzo.height)
  .data.reduce((a, b, i) => (i % 997 === 0 ? a + b : a), 0);

const y0 = raiz.getBoundingClientRect().top + scrollY;
const muestras = [];
for (const d of [0, -300, -600, -900]) {
  scrollTo(0, y0 + d);
  await new Promise(r => setTimeout(r, 900)); // Lenis tarda ~1s en asentarse
  muestras.push({ y: Math.round(scrollY), f: firma() });
}
// segunda lectura en la ultima posicion, sin tocar el scroll
await new Promise(r => setTimeout(r, 900));
const repetida = firma();

JSON.stringify({
  posicionesDistintas: new Set(muestras.map(m => m.y)).size,
  cuadrosDistintos: new Set(muestras.map(m => m.f)).size,
  estable: repetida === muestras[3].f,
  muestras,
});
```

Expected: `posicionesDistintas: 4`, `cuadrosDistintos: 4`, `estable: true`.

Cómo leer un fallo:
- `posicionesDistintas < 4` → **el problema es el scroll, no el componente.** Lenis no dejó llegar a las cuatro posiciones. Subí la espera, o hacé el scroll a mano con la rueda entre lecturas.
- `posicionesDistintas: 4` pero `cuadrosDistintos: 1` → el motor no está corriendo, o `tope` sigue en 0 porque no cargó ningún cuadro.
- `estable: false` → algo está animando por tiempo y no por scroll. Revisá que el modo sea `scrub` y que `avanzarHover` no se esté llamando.

- [ ] **Step 6: Verificar la precarga en orden**

En la pestaña Network, filtrando por `.webp`: los cuadros tienen que aparecer **en orden numérico** y **antes** de que la card entre en pantalla (arrancan ~1,5 pantallas antes).

```js
performance.getEntriesByType('resource')
  .filter(e => /\/_?astro\/.*\.webp/.test(e.name))
  .slice(0, 8)
  .map(e => e.name.split('/').pop());
```

Expected: ocho nombres cuyo orden de descarga sigue el orden de los cuadros. No tiene que estar perfectamente ordenado (hay 6 en vuelo a la vez), pero los primeros ocho descargados tienen que ser de los primeros de la secuencia, no de los últimos.

- [ ] **Step 7: Verificar el modo hover**

Agregar temporalmente un segundo dolor al array de `PainPoints.astro`, con `modo: "hover" as const`, `ancho: "medio" as const`, `columna: "der" as const`, `secuencia: "feed"`, `fondo: "#8800ff"` y cualquier `titulo`/`texto`.

Comprobar en el navegador: la card arranca en el cuadro 0, avanza al entrar el puntero y vuelve al salir. Y que con `ancho: "medio"` las dos cards quedan una al lado de la otra de `md` para arriba.

**Después de comprobarlo, sacar el segundo dolor del array.** Es una instancia de prueba, no contenido.

- [ ] **Step 8: Verificar reduced-motion**

En DevTools → Rendering → *Emulate CSS media feature prefers-reduced-motion: reduce*, recargar, y correr:

```js
JSON.stringify({
  lienzos: document.querySelectorAll('[data-lienzo]').length,
  cuadrosDescargados: performance.getEntriesByType('resource')
    .filter(e => /\/_?astro\/.*\.webp/.test(e.name)).length,
});
```

Expected: `lienzos: 0` (el canvas se removió) y `cuadrosDescargados: 1` — sólo el poster. Cualquier número mayor significa que la secuencia se está descargando igual, que es justo lo que esta rama evita.

- [ ] **Step 9: Verificar el modo oscuro**

Tocar el switch del navbar. La card tiene que **conservar su fondo negro** en los dos modos, coherente con lo que ya documenta `global.css:70-75`. El titular de la sección y el eyebrow sí se invierten, porque usan tokens del tema.

- [ ] **Step 10: Bajar el servidor**

Run: `npx astro dev stop`

- [ ] **Step 11: Commit**

```bash
git add src/components/PainPoints.astro
git commit -m "PainPoints: grilla bento y datos de la card con secuencia"
```

---

### Task 6: Limpieza y nota para el diseñador

**Files:**
- Create: `src/media/painpoints/README.md`

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Escribir la nota**

El diseñador trabaja con su propio Claude Code, así que esto no es un tutorial: es el contrato, corto, en el lugar donde va a estar mirando.

Crear `src/media/painpoints/README.md`:

```markdown
# Secuencias de los painpoints

Una carpeta por card. El nombre de la carpeta es lo que se le pasa a la prop
`secuencia` de `PainPoint`.

```
src/media/painpoints/
  feed/          <- secuencia="feed"
    0001.webp
    0002.webp
    ...
```

## Reglas

- Los cuadros se ordenan **por nombre de archivo**. Zero-padding obligatorio.
- Formatos aceptados: `.webp` `.png` `.jpg` `.jpeg` `.avif`. Astro los reencodea
  a WebP en build, al ancho que corresponda según el `ancho` de la card
  (1400 px si es `completo`, 760 px si es `medio`), así que podés exportar sin
  comprimir.
- **24 a 40 cuadros.** Con 40 cuadros scrubeados a lo largo de una pantalla de
  scroll ya se lee continuo; más cuadros agregan peso sin agregar suavidad.
- El **easing va horneado en la secuencia**, no en el código. El componente
  avanza lineal a propósito, para no pisarte el timing.
- El **último cuadro es el poster**: es lo que se ve sin JS y con
  `prefers-reduced-motion`. Que sea un cuadro que se sostenga solo.
- Carpeta vacía o inexistente rompe el build con un mensaje que la nombra.

## Placeholder

`src/media/painpoints/feed/` tiene hoy una secuencia generada por
`scripts/generar-secuencia-placeholder.mjs`. Vaciá la carpeta y tirá los cuadros
reales adentro; el script no hace falta más (y se niega a pisar una carpeta con
contenido salvo que le pases `--force`).

## Cómo se instancia una card

Todo esto se configura desde `src/components/PainPoints.astro`, sin tocar
`PainPoint.astro`:

```astro
<PainPoint
  titulo="..."
  texto="..."
  secuencia="feed"
  columna="izq"          {/* izq | der | centro */}
  modo="scrub"           {/* scrub | hover */}
  fondo="#000000"
  tinta="clara"          {/* clara | oscura */}
  ancho="completo"       {/* completo | medio */}
  proporcion="16/10"
  scrub={{ entrada: 0.9, salida: 0.15 }}
  hover={{ duracion: 800 }}
/>
```

`scrub.entrada` / `scrub.salida` se leen así: *p=0 cuando el borde superior de la
card está al 90 % del alto del viewport; p=1 cuando llegó al 15 %*. Bajar
`salida` alarga la animación; subir `entrada` la arranca antes.
```

- [ ] **Step 2: Verificar que no quedó código muerto del componente viejo**

Run:

```bash
grep -rn "painpoint-after\|painpoint-divider\|data-painpoint\|data-after\|data-divider" src/ || echo "OK: no quedo nada"
```

Expected: `OK: no quedo nada`. Todo eso era del wipe CSS anterior.

- [ ] **Step 3: Verificación final**

Run: `npm test && npx astro check && npx astro build`
Expected: 8 tests pasan, 0 errores de tipos, build exitoso.

- [ ] **Step 4: Commit**

```bash
git add src/media/painpoints/README.md
git commit -m "Nota del contrato de assets para el disenador"
```

---

## Desvíos respecto del spec

Uno solo, y consciente:

- El spec dice que las URLs de los cuadros viajan al cliente por **`define:vars`**. El plan usa un **`<script type="application/json">`** dentro del componente. Motivo: `define:vars` fuerza `is:inline`, y con eso el motor entero —observers, loop, precarga— se duplicaría una vez por instancia en vez de bundlearse una sola vez. El `<script type="application/json">` conserva la propiedad que el spec sí pide (un solo motor izado por Astro) y es lo único que cambia.

## Notas de riesgo

- **`import.meta.glob` con patrón literal.** Vite analiza el patrón estáticamente; no acepta una variable. Por eso `SecuenciaScrub` trae todas las secuencias y filtra por prefijo. El costo es que cada instancia hace `getImage()` sólo sobre sus propias rutas, así que el trabajo de sharp no se duplica.
- **`object-fit` en `<canvas>`.** Funciona porque `<canvas>` es un elemento reemplazado, igual que `<img>`. Si en algún navegador no aplicara, el síntoma sería deformación (no pantalla en blanco) y sólo cuando `proporcion` no coincide con la del asset.
- **Peso.** El placeholder son formas planas y comprime muy bien; una secuencia fotográfica real de 40 cuadros a 1400 px ronda los 2,3 MB. Está en la tabla del spec. Si al llegar los assets reales el número molesta, las palancas son bajar cuadros o pasar la card a `ancho="medio"`.
- **`astro dev --background`** es la regla de `CLAUDE.md`. No levantar el server en foreground.
