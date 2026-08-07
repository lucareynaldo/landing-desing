// Genera las secuencias placeholder de los painpoints. Cada receta es un asset
// de prueba con su propia proporcion, fondo y zona de texto libre, elegidas para
// cubrir una combinacion distinta de props de PainPoint.
//
// Son placeholders, pero tambien son documentacion ejecutable del formato que
// espera SecuenciaScrub: NNNN.webp numerados desde 0001, ordenados por nombre.
// Cuando el disenador entregue los cuadros reales, vacia la carpeta y los tira
// adentro. Este script no se vuelve a correr para esa secuencia.
//
// Uso:
//   node scripts/generar-secuencia-placeholder.mjs [receta] [--force]
//   node scripts/generar-secuencia-placeholder.mjs --todas [--force]
//
// Se niega a escribir sobre una carpeta que ya tiene contenido salvo que se
// pase --force, para no pisarle los assets al disenador.

import { Buffer } from "node:buffer";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

// ---------------------------------------------------------------------------
// Utilidades compartidas
// ---------------------------------------------------------------------------

/** @param {number} t @returns {number} */
const suavizar = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** @param {number} t @returns {number} */
const recortar = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * Las piezas no arrancan juntas: cada una entra `paso` despues que la anterior.
 * La ola es lo que hace que se lea como que algo se ordena, y no como un
 * crossfade.
 * @param {number} e progreso global 0..1
 * @param {number} i indice de pieza
 * @param {number} total cuantas piezas hay
 * @param {number} paso desfasaje entre piezas, en unidades de progreso
 * @returns {number} progreso local 0..1
 */
function escalonar(e, i, total, paso) {
  const util = 1 - (total - 1) * paso;
  return recortar((e - i * paso) / util);
}

/**
 * Azar determinista. Con Math.random() cada corrida escupiria bytes distintos y
 * el diff del repo seria ruido puro.
 * @param {number} semilla
 * @returns {number} 0..1
 */
function azar(semilla) {
  const x = Math.sin(semilla * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
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

// Nueve colores que no se hablan entre si. Los reusan varias recetas como
// estado "sin sistema".
const CAOS = [
  "#ff2d55", "#00c2a8", "#ffcc00",
  "#7b2fff", "#ff7a00", "#0066ff",
  "#12d18e", "#ff4dd2", "#c9c9c9",
];

// ---------------------------------------------------------------------------
// feed — 2/1, card `ancho="completo"`, texto a la izquierda, scrub
//
// Nueve piezas que pasan de un feed sin sistema -colores sin relacion, todo
// torcido- a un feed con sistema -dos neutros y un acento, alineado-.
// ---------------------------------------------------------------------------

function recetaFeed() {
  const ANCHO = 1400;
  const ALTO = 700;
  const FONDO = "#000000";

  // El mismo feed con sistema: dos neutros y un acento, rotando. Los neutros
  // son claros porque la card es negra.
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

  // La grilla NO va centrada: va corrida a la derecha, dejando libre el 50% de
  // la izquierda. Es donde cae el texto con `columna="izq"`, y el componente no
  // pone ningun velo detras del titulo -igual que readymag-. Componer el asset
  // respetando la zona del texto es parte del trabajo del asset, no del codigo.
  const LADO = 560; // lado del cuadrado que forma la grilla
  const HUECO = 18;
  const CELDA = (LADO - 2 * HUECO) / 3;
  const MARGEN_DER = 90;
  const X0 = ANCHO - LADO - MARGEN_DER;
  const Y0 = (ALTO - LADO) / 2;

  return {
    ancho: ANCHO,
    alto: ALTO,
    cuadros: 40,
    zonaLibre: "mitad izquierda",
    prueba: 'ancho="completo" columna="izq" modo="scrub" tinta="clara"',
    /** @param {number} e */
    svg(e) {
      const partes = [`<rect width="${ANCHO}" height="${ALTO}" fill="${FONDO}"/>`];
      for (let i = 0; i < 9; i++) {
        const t = suavizar(escalonar(e, i, 9, 0.045));
        const col = i % 3;
        const fila = Math.floor(i / 3);
        const cx = X0 + col * (CELDA + HUECO) + CELDA / 2 + JIT[i][0] * (1 - t);
        const cy = Y0 + fila * (CELDA + HUECO) + CELDA / 2 + JIT[i][1] * (1 - t);
        const rot = (ROT[i] * (1 - t)).toFixed(2);
        const esc = (0.9 + 0.1 * t).toFixed(4);
        const color = mezclar(CAOS[i], DESPUES[i], t);
        partes.push(
          `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${rot}) scale(${esc})">` +
            `<rect x="${(-CELDA / 2).toFixed(2)}" y="${(-CELDA / 2).toFixed(2)}" ` +
            `width="${CELDA.toFixed(2)}" height="${CELDA.toFixed(2)}" rx="20" fill="${color}"/>` +
            `</g>`,
        );
      }
      return partes.join("");
    },
  };
}

// ---------------------------------------------------------------------------
// ruido — 1/1, card `ancho="medio"`, fondo claro, tinta oscura, scrub
//
// Siete barras de largo arbitrario y colores que pelean, que se alinean por el
// borde derecho y adoptan una escala de largos deliberada.
//
// La zona libre de una card `medio` NO es media card: el titular (15ch) y el
// parrafo (46ch) se comen casi todo el ancho util. Lo que queda libre de verdad
// es la BANDA DEL MEDIO, porque la card es `justify-between`: titulo arriba,
// parrafo abajo, y el medio vacio. Por eso el arte vive entre el 33% y el 68%
// del alto.
// ---------------------------------------------------------------------------

function recetaRuido() {
  const ANCHO = 760;
  const ALTO = 760;
  const FONDO = "#f4f4f4";

  const BARRAS = 7;
  const GRUESO = 26;
  const HUECO = 14;
  const DER = 682; // borde derecho al que se alinean todas
  const ALTO_BLOQUE = BARRAS * GRUESO + (BARRAS - 1) * HUECO;
  const Y0 = (ALTO - ALTO_BLOQUE) / 2;

  // Escala final de largos: un ritmo, no siete valores iguales.
  const LARGOS = [330, 250, 330, 190, 290, 250, 190];

  // Dos neutros y un acento, sobre fondo claro: los neutros tienen que ser
  // oscuros o no se ve nada.
  const DESPUES = ["#1a1a1a", "#8800ff", "#1a1a1a", "#cfcfcf", "#8800ff", "#1a1a1a", "#cfcfcf"];

  return {
    ancho: ANCHO,
    alto: ALTO,
    cuadros: 28,
    zonaLibre: "banda del medio (33%–68% del alto)",
    prueba: 'ancho="medio" columna="izq" modo="scrub" tinta="oscura" fondo claro',
    /** @param {number} e */
    svg(e) {
      const partes = [`<rect width="${ANCHO}" height="${ALTO}" fill="${FONDO}"/>`];
      for (let i = 0; i < BARRAS; i++) {
        const t = suavizar(escalonar(e, i, BARRAS, 0.06));
        const largoIni = 110 + azar(i + 1) * 240;
        const largo = largoIni + (LARGOS[i] - largoIni) * t;
        const rot = ((azar(i + 11) * 10 - 5) * (1 - t)).toFixed(2);
        const dx = (azar(i + 21) * 90 - 45) * (1 - t);
        const dy = (azar(i + 31) * 26 - 13) * (1 - t);
        const cx = DER - largo / 2 + dx;
        const cy = Y0 + i * (GRUESO + HUECO) + GRUESO / 2 + dy;
        const color = mezclar(CAOS[i], DESPUES[i], t);
        partes.push(
          `<g transform="translate(${cx.toFixed(2)} ${cy.toFixed(2)}) rotate(${rot})">` +
            `<rect x="${(-largo / 2).toFixed(2)}" y="${(-GRUESO / 2).toFixed(2)}" ` +
            `width="${largo.toFixed(2)}" height="${GRUESO}" rx="${GRUESO / 2}" fill="${color}"/>` +
            `</g>`,
        );
      }
      return partes.join("");
    },
  };
}

// ---------------------------------------------------------------------------
// tiempo — 1/1, card `ancho="medio"`, texto a la derecha, modo hover
//
// Un anillo que se llena y doce marcas que pasan de espaciadas al azar a
// espaciadas parejo. Pensado para `modo="hover"`: la animacion tiene que leerse
// igual de bien yendo para adelante que para atras, y un anillo que se llena y
// se vacia cumple. Una secuencia con un "antes feo / despues lindo" muy
// narrativo, en cambio, queda rara al revertirse.
//
// El arte se apoya a la izquierda porque la card usa `columna="der"`.
// ---------------------------------------------------------------------------

function recetaTiempo() {
  const ANCHO = 760;
  const ALTO = 760;
  const FONDO = "#101010";

  const CX = 268;
  const CY = 380;
  const R = 148;
  const CIRC = 2 * Math.PI * R;
  const MARCAS = 12;

  return {
    ancho: ANCHO,
    alto: ALTO,
    cuadros: 28,
    zonaLibre: "banda del medio, mitad derecha",
    prueba: 'ancho="medio" columna="der" modo="hover" tinta="clara"',
    /** @param {number} e */
    svg(e) {
      const t = suavizar(e);
      const partes = [
        `<rect width="${ANCHO}" height="${ALTO}" fill="${FONDO}"/>`,
        // Riel: el recorrido completo, siempre visible.
        `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#262626" stroke-width="16"/>`,
      ];

      // El arco se dibuja con dasharray y no con un path <arc>: asi no hay que
      // manejar el caso degenerado de 0 grados ni el de 360.
      const largo = (CIRC * t).toFixed(2);
      partes.push(
        `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#8800ff" ` +
          `stroke-width="16" stroke-linecap="round" ` +
          `stroke-dasharray="${largo} ${CIRC.toFixed(2)}" ` +
          `transform="rotate(-90 ${CX} ${CY})"/>`,
      );

      for (let i = 0; i < MARCAS; i++) {
        const parejo = (i / MARCAS) * 360;
        const torcido = parejo + (azar(i + 41) * 26 - 13);
        const ang = ((torcido + (parejo - torcido) * t) - 90) * (Math.PI / 180);
        const r0 = R + 30;
        const r1 = r0 + 12 + azar(i + 51) * 16 * (1 - t);
        const color = mezclar("#3a3a3a", i % 3 === 0 ? "#f4f4f4" : "#6e6e6e", t);
        partes.push(
          `<line x1="${(CX + Math.cos(ang) * r0).toFixed(2)}" y1="${(CY + Math.sin(ang) * r0).toFixed(2)}" ` +
            `x2="${(CX + Math.cos(ang) * r1).toFixed(2)}" y2="${(CY + Math.sin(ang) * r1).toFixed(2)}" ` +
            `stroke="${color}" stroke-width="5" stroke-linecap="round"/>`,
        );
      }

      // Punto central: da un ancla fija para que el ojo mida el barrido.
      partes.push(`<circle cx="${CX}" cy="${CY}" r="${(6 + 10 * t).toFixed(2)}" fill="#f4f4f4"/>`);
      return partes.join("");
    },
  };
}

// ---------------------------------------------------------------------------
// escala — 7/3, card `ancho="completo"` con `proporcion` explicita, texto
// centrado, scrub
//
// Veinticuatro barras verticales que pasan de alturas al azar a una onda
// deliberada. Con `columna="centro"` el titulo cae arriba al medio y el parrafo
// abajo al medio, asi que lo libre es la franja horizontal del centro: el arte
// cruza la card a lo ancho y no sube ni baja de esa franja.
//
// La proporcion 7/3 no es un default del componente: existe para probar que
// pasarle `proporcion` a la card y exportar el asset a esa misma proporcion da
// un encuadre sin recorte.
// ---------------------------------------------------------------------------

function recetaEscala() {
  const ANCHO = 1400;
  const ALTO = 600;
  const FONDO = "#0a0a0a";

  const BARRAS = 24;
  const GRUESO = 30;
  const HUECO = 18;
  const BLOQUE = BARRAS * GRUESO + (BARRAS - 1) * HUECO;
  const X0 = (ANCHO - BLOQUE) / 2;
  const CY = ALTO / 2;

  return {
    ancho: ANCHO,
    alto: ALTO,
    cuadros: 32,
    zonaLibre: "franja de arriba y franja de abajo (arte solo en el centro)",
    prueba: 'ancho="completo" proporcion="7/3" columna="centro" modo="scrub"',
    /** @param {number} e */
    svg(e) {
      const partes = [`<rect width="${ANCHO}" height="${ALTO}" fill="${FONDO}"/>`];
      for (let i = 0; i < BARRAS; i++) {
        const t = suavizar(escalonar(e, i, BARRAS, 0.018));
        const altoIni = 40 + azar(i + 61) * 190;
        // Onda final: dos ciclos a lo ancho de la card.
        const altoFin = 60 + 150 * (0.5 + 0.5 * Math.sin((i / BARRAS) * Math.PI * 4));
        const h = altoIni + (altoFin - altoIni) * t;
        const dx = (azar(i + 71) * 22 - 11) * (1 - t);
        const x = X0 + i * (GRUESO + HUECO) + dx;
        const color = mezclar(CAOS[i % CAOS.length], i % 6 === 3 ? "#8800ff" : "#e7e7e7", t);
        partes.push(
          `<rect x="${x.toFixed(2)}" y="${(CY - h / 2).toFixed(2)}" ` +
            `width="${GRUESO}" height="${h.toFixed(2)}" rx="${GRUESO / 2}" fill="${color}"/>`,
        );
      }
      return partes.join("");
    },
  };
}

// ---------------------------------------------------------------------------

/** @type {Record<string, () => {ancho:number, alto:number, cuadros:number, zonaLibre:string, prueba:string, svg:(e:number)=>string}>} */
const RECETAS = {
  feed: recetaFeed,
  ruido: recetaRuido,
  tiempo: recetaTiempo,
  escala: recetaEscala,
};

/**
 * @param {string} nombre
 * @param {boolean} forzar
 * @returns {Promise<boolean>} si escribio
 */
async function generar(nombre, forzar) {
  const receta = RECETAS[nombre]();
  const destino = path.join(RAIZ, "src", "media", "painpoints", nombre);
  const relativo = path.relative(RAIZ, destino);

  /** @type {string[]} */
  let existentes = [];
  try {
    existentes = await readdir(destino);
  } catch {
    // la carpeta no existe todavia, que es el caso normal
  }

  if (existentes.length > 0 && !forzar) {
    console.error(
      `${relativo} ya tiene ${existentes.length} archivo(s).\n` +
        `Si son los cuadros del disenador NO los pises. Para sobrescribir igual: --force`,
    );
    return false;
  }

  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });

  for (let n = 0; n < receta.cuadros; n++) {
    const e = receta.cuadros > 1 ? n / (receta.cuadros - 1) : 1;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${receta.ancho}" height="${receta.alto}">` +
      receta.svg(e) +
      `</svg>`;
    const buffer = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
    await writeFile(path.join(destino, `${String(n + 1).padStart(4, "0")}.webp`), buffer);
  }

  console.log(
    `${receta.cuadros} cuadros de ${receta.ancho}x${receta.alto} en ${relativo}  —  ${receta.prueba}`,
  );
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes("--force");
  const todas = args.includes("--todas");
  const pedidas = args.filter((a) => !a.startsWith("--"));

  const nombres = todas ? Object.keys(RECETAS) : pedidas.length ? pedidas : ["feed"];

  const desconocida = nombres.find((n) => !(n in RECETAS));
  if (desconocida) {
    console.error(
      `No hay receta "${desconocida}". Disponibles: ${Object.keys(RECETAS).join(", ")}\n` +
        `Para generarlas todas: --todas`,
    );
    process.exitCode = 1;
    return;
  }

  let fallo = false;
  for (const nombre of nombres) {
    const ok = await generar(nombre, forzar);
    if (!ok) fallo = true;
  }
  if (fallo) process.exitCode = 1;
}

await main();
