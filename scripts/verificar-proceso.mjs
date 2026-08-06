// Verificacion estructural de la seccion "Como trabajamos".
//
// El proyecto no tiene framework de tests, asi que esto corre contra el HTML
// compilado y sale con codigo 1 si algun invariante se rompe. Chequea lo que
// no se ve en una captura de pantalla: que la cadena tenga el largo correcto,
// que los indices vayan en orden del DOM (de eso depende que en movil se lea
// bien) y que exista el ancla de contacto.
//
// Uso:
//   npx astro build && node scripts/verificar-proceso.mjs
//   node scripts/verificar-proceso.mjs --tarea1   (solo lo de la primera tarea)

import { readFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const fallos = [];
const chequear = (ok, mensaje) => {
  if (!ok) fallos.push(mensaje);
};

const soloTarea1 = process.argv.includes("--tarea1");

// Los nombres viajan con acentos en el HTML; se comparan sin ellos para no
// depender de la forma de normalizacion Unicode que use el compilador.
const sinAcentos = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const ETAPAS = [
  "Presupuestación",
  "Descubrimiento",
  "Análisis",
  "Estrategia",
  "Rutas visuales",
  "Diseño",
  "Presentación",
  "Aplicaciones",
  "Manualización",
  "Entrega final",
];

if (!soloTarea1) {
  const htmlPlano = sinAcentos(html);
  for (const e of ETAPAS) {
    chequear(htmlPlano.includes(sinAcentos(e)), `falta la etapa "${e}"`);
  }

  const indices = [...html.matchAll(/--i:\s*(\d+)/g)].map((m) => Number(m[1]));
  chequear(
    indices.length === 20,
    `esperaba 20 elementos en la cadena, hay ${indices.length}`,
  );
  chequear(
    indices.length === 20 && indices.every((v, i) => v === i),
    `los indices no van de 0 a 19 en orden del DOM: ${indices.join(",")}`,
  );

  const nodos = (html.match(/proceso-nodo/g) ?? []).length;
  const vertices = (html.match(/proceso-vertice/g) ?? []).length;
  chequear(nodos === 10, `esperaba 10 nodos, hay ${nodos}`);
  chequear(vertices === 9, `esperaba 9 vertices, hay ${vertices}`);

  chequear(/id="contacto"/.test(html), "falta el ancla id=contacto");
}

if (fallos.length) {
  console.error("FALLA:\n" + fallos.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log("OK");
