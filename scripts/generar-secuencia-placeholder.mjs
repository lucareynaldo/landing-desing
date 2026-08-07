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
  const c = (x, y) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
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

  /** @type {string[]} */
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
