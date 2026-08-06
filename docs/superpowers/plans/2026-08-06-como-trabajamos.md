# Sección "Cómo trabajamos" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar al final de la home una sección que muestre el proceso del estudio como un camino serpenteado de diez etapas que se dibuja siguiendo el scroll.

**Architecture:** Grid de CSS puro, sin SVG y sin medir el DOM. El trazado 3-3-3-1 está armado para que cada bajada arranque debajo del último nodo de su fila, así ningún giro ocurre en el aire y no hay codos que dibujar. El JS escribe una sola variable (`--p`, de 0 a 1) en la sección; cada uno de los 20 elementos de la cadena lleva su índice `--i` y calcula solo cuánto le toca dibujarse.

**Tech Stack:** Astro 7, Tailwind 4, TypeScript. Sin dependencias nuevas.

Spec: `docs/superpowers/specs/2026-08-06-como-trabajamos-design.md`

## Global Constraints

- **No hay framework de tests en el proyecto.** El ciclo rojo-verde de cada tarea corre contra invariantes estructurales del HTML compilado, con `node -e` sobre `dist/index.html`. No agregar vitest, playwright ni ningún runner: está fuera de alcance.
- **Gates que tienen que pasar en toda tarea:** `npx astro build` y `npx astro check` (hoy: 0 errores, 0 warnings, 0 hints en 19 archivos — no se admite regresión).
- **Comentarios en español y sin acentos**, como el resto del código. Explican POR QUÉ, no QUÉ.
- **Mobile-first**: el estilo base es la columna única; el grid serpenteado va dentro de `@media (min-width: 768px)`.
- **Largo de la cadena: 20.** 10 nodos (índices pares 0–18), 9 vértices (impares 1–17), bloque de contacto (19). Si este número cambia hay que cambiarlo también en `--n-cadena`.
- **El orden del DOM es el orden del camino.** En móvil es lo único que ordena la sección.
- Los tokens salen de `src/styles/global.css`: `--color-ink-strong`, `--color-ink-muted`, `--color-surface-3`, `--ease-out`, `--duration-base`.
- Commits en español, en el estilo del historial: una línea de asunto declarativa, cuerpo que explica el porqué, y el trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

## Estructura de archivos

| archivo | responsabilidad |
|---|---|
| `src/data/proceso.ts` | las diez etapas, en orden. Nada de layout. |
| `src/data/estudio.ts` | el mail del estudio, compartido entre footer y bloque de contacto. |
| `src/components/ProcesoNodo.astro` | una caja. Se pinta según su progreso. No sabe que hay un camino. |
| `src/components/ProcesoVertice.astro` | un tramo de línea. Exporta el tipo `Direccion`. |
| `src/components/ComoTrabajamos.astro` | la sección: header, grid, cadena, bloque de contacto, script del scrub. Único que conoce la forma del camino. |
| `src/components/SiteFooter.astro` | modificar: importa `EMAIL` en vez de declararlo. |
| `src/pages/index.astro` | modificar: monta la sección después de `<Clientes />`. |

---

### Task 1: Datos

**Files:**
- Create: `src/data/proceso.ts`
- Create: `src/data/estudio.ts`
- Modify: `src/components/SiteFooter.astro:10` (la línea `const EMAIL = ...`)

**Interfaces:**
- Consumes: nada.
- Produces: `Etapa { n: string; nombre: string }` y `PROCESO: Etapa[]` (10 elementos) desde `src/data/proceso.ts`. `EMAIL: string` desde `src/data/estudio.ts`.

- [ ] **Step 1: Escribir la verificación**

Guardar como `scripts/verificar-proceso.mjs`:

```js
// Verificacion estructural de la seccion "Como trabajamos".
// No hay framework de tests en el proyecto: esto corre contra el HTML
// compilado y falla con exit 1 si algun invariante se rompe.
import { readFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const fallos = [];
const chequear = (ok, mensaje) => { if (!ok) fallos.push(mensaje); };

const soloTarea1 = process.argv.includes("--tarea1");

// --- Datos ---
const etapas = ["Presupuestacion", "Descubrimiento", "Analisis", "Estrategia",
  "Rutas visuales", "Diseno", "Presentacion", "Aplicaciones", "Manualizacion",
  "Entrega final"];

if (!soloTarea1) {
  for (const e of etapas) {
    // se compara sin acentos: el HTML los trae como caracteres UTF-8
    const suelto = e.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const presente = html.normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(suelto);
    chequear(presente, `falta la etapa "${e}"`);
  }

  const indices = [...html.matchAll(/--i:\s*(\d+)/g)].map((m) => Number(m[1]));
  chequear(indices.length === 20, `esperaba 20 elementos en la cadena, hay ${indices.length}`);
  chequear(
    indices.every((v, i) => v === i),
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
```

- [ ] **Step 2: Correrla para verificar que falla**

```bash
npx astro build && node scripts/verificar-proceso.mjs
```

Esperado: `FALLA` listando las diez etapas faltantes, 0 elementos en la cadena, 0 nodos, 0 vértices y el ancla faltante.

- [ ] **Step 3: Crear `src/data/proceso.ts`**

```ts
// Las diez etapas del proceso del estudio, en orden de recorrido.
//
// Las filas de la serpentina ([3, 3, 3, 1]) NO viven aca: son layout, y las
// resuelve ComoTrabajamos.astro. Agregar o sacar una etapa no deberia obligar
// a editar dos archivos.

export interface Etapa {
  /** Ordinal de dos digitos. Se muestra: la fila del medio del camino se lee
   *  de derecha a izquierda, y sin el numero escrito el zigzag confunde. */
  n: string;
  nombre: string;
}

export const PROCESO: Etapa[] = [
  { n: "01", nombre: "Presupuestación" },
  { n: "02", nombre: "Descubrimiento" },
  { n: "03", nombre: "Análisis" },
  { n: "04", nombre: "Estrategia" },
  { n: "05", nombre: "Rutas visuales" },
  { n: "06", nombre: "Diseño" },
  { n: "07", nombre: "Presentación" },
  { n: "08", nombre: "Aplicaciones" },
  { n: "09", nombre: "Manualización" },
  { n: "10", nombre: "Entrega final" },
];
```

- [ ] **Step 4: Crear `src/data/estudio.ts`**

```ts
// TODO placeholder: reemplazar por los datos reales del estudio.
//
// El mail vivia adentro de SiteFooter.astro, pero lo necesitan dos
// componentes y desde un .astro no se puede importar una constante del
// frontmatter de otro. Tenerlo escrito en dos archivos es pedir que queden
// desincronizados el dia que llegue el mail de verdad.
export const EMAIL = "hola@estudio.com";
```

- [ ] **Step 5: Modificar `src/components/SiteFooter.astro`**

Borrar la línea `const EMAIL = "hola@estudio.com";` del frontmatter y agregar arriba de las constantes que quedan:

```ts
import { EMAIL } from "../data/estudio";
```

Las otras tres constantes (`SOCIAL`, `CITY`, `UPDATED`) se quedan donde están: solo las usa el footer, y moverlas sería mover por mover.

- [ ] **Step 6: Verificar que no se rompió el footer**

```bash
npx astro build && npx astro check && node scripts/verificar-proceso.mjs --tarea1
```

Esperado: build limpio, `0 errors, 0 warnings, 0 hints`, y `OK`.

Confirmar además que el mail sigue apareciendo tres veces en el footer compilado:

```bash
node -e "const h=require('fs').readFileSync('dist/index.html','utf8');console.log((h.match(/hola@estudio\.com/g)||[]).length)"
```

Esperado: `3`.

- [ ] **Step 7: Commit**

```bash
git add src/data/proceso.ts src/data/estudio.ts src/components/SiteFooter.astro scripts/verificar-proceso.mjs
git commit -F - <<'EOF'
Datos del proceso y el mail del estudio en un solo lugar

Las diez etapas salen a src/data como el resto de los datos del sitio. El mail
sale de SiteFooter porque ahora lo necesita tambien el bloque de contacto de la
seccion nueva, y desde un .astro no se puede importar una constante del
frontmatter de otro: o se duplica el string o se extrae.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: ProcesoNodo

**Files:**
- Create: `src/components/ProcesoNodo.astro`

**Interfaces:**
- Consumes: nada de tareas anteriores (recibe todo por props).
- Produces: componente con `Props { n: string; nombre: string; indice: number; col: number; fila: number }`. Renderiza un `<li class="proceso-celda proceso-nodo">` con `--i`, `--col` y `--fila` inline. Depende de que un ancestro defina `--local`; sin eso queda apagado, que es el estado por defecto correcto.

- [ ] **Step 1: Crear el componente**

```astro
---
// Una etapa del camino. No sabe que existe un camino: solo se pinta mas o
// menos encendida segun --local, que le llega heredada desde la seccion.

interface Props {
  n: string;
  nombre: string;
  /** Posicion en la cadena de 20 elementos: define cuando le toca encenderse. */
  indice: number;
  /** Celda del grid en desktop. En movil no se usa: cae por orden del DOM. */
  col: number;
  fila: number;
}

const { n, nombre, indice, col, fila } = Astro.props;
---

<li
  class="proceso-celda proceso-nodo"
  style={`--i:${indice}; --col:${col}; --fila:${fila};`}
>
  <span class="proceso-n type-meta">{n}</span>
  <span class="proceso-nombre type-display">{nombre}</span>
</li>

<style>
  .proceso-nodo {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.9rem 1.1rem;
    border: 1px solid;
    border-radius: 0.75rem;
    background: var(--color-surface);
    list-style: none;

    /* Tres veces mas rapido que su tramo de la cadena. A la velocidad del
       tramo el nodo se va tiñendo despacio y se lee como una mancha que
       crece; asi se enciende con decision, que es lo que tiene que comunicar
       una etapa que se activa. */
    --encendido: clamp(0, calc(var(--local, 0) * 3), 1);

    border-color: color-mix(
      in srgb,
      var(--color-surface-3),
      var(--color-ink-strong) calc(var(--encendido) * 100%)
    );
  }

  .proceso-n {
    color: color-mix(
      in srgb,
      var(--color-surface-3),
      var(--color-ink-muted) calc(var(--encendido) * 100%)
    );
  }

  .proceso-nombre {
    font-size: clamp(0.95rem, 1.25vw, 1.2rem);
    color: color-mix(
      in srgb,
      var(--color-ink-muted),
      var(--color-ink-strong) calc(var(--encendido) * 100%)
    );
  }
</style>
```

- [ ] **Step 2: Verificar que compila**

```bash
npx astro build && npx astro check
```

Esperado: build limpio y `0 errors, 0 warnings, 0 hints`. El componente todavía no lo usa nadie, así que no aparece en el HTML: es correcto.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProcesoNodo.astro
git commit -F - <<'EOF'
Componente de nodo del camino del proceso

Se pinta segun --local, que hereda de la seccion. La rampa del encendido va
tres veces mas rapida que su tramo de la cadena: a la velocidad del tramo el
nodo se tiñe despacio y se lee como una mancha creciendo, no como una etapa
que se activa.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: ProcesoVertice

**Files:**
- Create: `src/components/ProcesoVertice.astro`

**Interfaces:**
- Consumes: nada.
- Produces: `export type Direccion = "derecha" | "izquierda" | "abajo"` y un componente con `Props { indice: number; direccion: Direccion; col: number; fila: number }`. Se importa con `import ProcesoVertice, { type Direccion } from "./ProcesoVertice.astro";` — el mismo patrón que ya usa `StackLogo.astro` con `TamanoLogo`.

- [ ] **Step 1: Crear el componente**

```astro
---
// Un tramo de linea entre dos nodos.
//
// La linea es un ::before y no el <li> mismo, para poder centrarla en la celda
// sin tocar la caja que ocupa en el grid.
//
// La direccion decide el eje del scale y, sobre todo, el transform-origin: el
// tramo tiene que crecer desde el lado por el que ENTRA la linea. Los de la
// fila del medio, que va de derecha a izquierda, crecen desde la derecha.

export type Direccion = "derecha" | "izquierda" | "abajo";

interface Props {
  /** Posicion en la cadena de 20 elementos. */
  indice: number;
  direccion: Direccion;
  /** Celda del grid en desktop. En movil no se usa. */
  col: number;
  fila: number;
}

const { indice, direccion, col, fila } = Astro.props;
---

<li
  class="proceso-celda proceso-vertice"
  data-direccion={direccion}
  style={`--i:${indice}; --col:${col}; --fila:${fila};`}
  aria-hidden="true"
>
</li>

<style>
  .proceso-vertice {
    position: relative;
    min-height: 2rem;
    list-style: none;
  }

  /* Base = movil: en una sola columna TODOS los tramos son verticales,
     incluidos los que en desktop van de costado. */
  .proceso-vertice::before {
    content: "";
    position: absolute;
    background: var(--color-ink-strong);
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    scale: 1 var(--local, 0);
    transform-origin: center top;
  }

  @media (min-width: 768px) {
    .proceso-vertice[data-direccion="derecha"]::before,
    .proceso-vertice[data-direccion="izquierda"]::before {
      top: 50%;
      bottom: auto;
      left: 0;
      right: 0;
      width: auto;
      height: 1px;
      scale: var(--local, 0) 1;
    }

    .proceso-vertice[data-direccion="derecha"]::before {
      transform-origin: left center;
    }

    .proceso-vertice[data-direccion="izquierda"]::before {
      transform-origin: right center;
    }
  }
</style>
```

- [ ] **Step 2: Verificar que compila**

```bash
npx astro build && npx astro check
```

Esperado: build limpio y `0 errors, 0 warnings, 0 hints`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProcesoVertice.astro
git commit -F - <<'EOF'
Componente de vertice del camino del proceso

El transform-origin sale de la direccion, no del eje: el tramo tiene que crecer
desde el lado por el que entra la linea, asi que los de la fila que va de
derecha a izquierda crecen desde la derecha. Con origin fijo la linea se
dibujaria hacia atras en esa fila.

En movil todos los tramos son verticales, que es el estilo base; los
horizontales son la excepcion y viven en la media query.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: La sección, estática

Todo el layout, con `--p` clavado en 1 para poder revisar el dibujo terminado. La animación entra en la Task 5.

**Files:**
- Create: `src/components/ComoTrabajamos.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `PROCESO`, `Etapa` de `src/data/proceso.ts`; `EMAIL` de `src/data/estudio.ts`; `ProcesoNodo`; `ProcesoVertice` y `Direccion`.
- Produces: `<section id="como-trabajamos" data-proceso>` con `--p` y `--n-cadena` definidas, y un `#contacto` al que resuelven los "Hablemos" del header y del hero.

- [ ] **Step 1: Correr la verificación para confirmar que falla**

```bash
npx astro build && node scripts/verificar-proceso.mjs
```

Esperado: `FALLA` con las diez etapas faltantes, 0 elementos en la cadena, 0 nodos, 0 vértices y el ancla faltante.

- [ ] **Step 2: Crear `src/components/ComoTrabajamos.astro`**

```astro
---
import { PROCESO, type Etapa } from "../data/proceso";
import { EMAIL } from "../data/estudio";
import ProcesoNodo from "./ProcesoNodo.astro";
import ProcesoVertice, { type Direccion } from "./ProcesoVertice.astro";

// El proceso como camino serpenteado. Cuatro filas: 3, 3, 3 y 1.
//
// La forma no es decorativa, decide la implementacion entera: CADA BAJADA
// ARRANCA DEBAJO DEL ULTIMO NODO DE SU FILA, asi que ningun giro ocurre en el
// aire y los tres tramos verticales entran y salen de un nodo. Sin esa
// propiedad habria codos que dibujar, y un codo obliga a un SVG con geometria
// medida del DOM. Con ella alcanzan diez cajas y nueve rectas en un grid.
//
//   col:   1     3     5
//   r1:  [01]──[02]──[03]
//   r2                  |
//   r3:  [06]──[05]──[04]
//   r4    |
//   r5:  [07]──[08]──[09]
//   r6                  |
//   r7:  [ contacto ][10]
//
// El grid es de 5 columnas x 7 filas: impares para los nodos, pares para el
// aire donde viven los vertices.

interface Celda {
  col: number;
  fila: number;
}

const NODOS: Celda[] = [
  { col: 1, fila: 1 }, { col: 3, fila: 1 }, { col: 5, fila: 1 }, // 01 02 03
  { col: 5, fila: 3 }, { col: 3, fila: 3 }, { col: 1, fila: 3 }, // 04 05 06
  { col: 1, fila: 5 }, { col: 3, fila: 5 }, { col: 5, fila: 5 }, // 07 08 09
  { col: 5, fila: 7 },                                           // 10
];

const VERTICES: (Celda & { direccion: Direccion })[] = [
  { col: 2, fila: 1, direccion: "derecha" },
  { col: 4, fila: 1, direccion: "derecha" },
  { col: 5, fila: 2, direccion: "abajo" },
  { col: 4, fila: 3, direccion: "izquierda" },
  { col: 2, fila: 3, direccion: "izquierda" },
  { col: 1, fila: 4, direccion: "abajo" },
  { col: 2, fila: 5, direccion: "derecha" },
  { col: 4, fila: 5, direccion: "derecha" },
  { col: 5, fila: 6, direccion: "abajo" },
];

type EnCadena =
  | { tipo: "nodo"; etapa: Etapa; indice: number; col: number; fila: number }
  | { tipo: "vertice"; direccion: Direccion; indice: number; col: number; fila: number };

// El orden de este array ES el orden del DOM, el de la animacion y, en movil,
// el de lectura. Por eso se arma una sola vez y no se deriva en dos lados.
// Nodo i -> indice 2i, vertice i -> indice 2i+1, contacto -> 19.
const CADENA: EnCadena[] = PROCESO.flatMap((etapa, i) => {
  const nodo: EnCadena = { tipo: "nodo", etapa, indice: i * 2, ...NODOS[i] };
  const v = VERTICES[i];
  if (!v) return [nodo];
  const vertice: EnCadena = { tipo: "vertice", indice: i * 2 + 1, ...v };
  return [nodo, vertice];
});
---

<section
  id="como-trabajamos"
  class="mx-auto w-full max-w-[1400px] px-6 pb-24 pt-24 md:px-10 md:pb-32 md:pt-32"
  data-proceso
>
  <header class="mb-14 md:mb-20">
    <p class="type-meta text-ink-muted">Cómo trabajamos</p>
    <h2 class="type-display mt-4 max-w-[20ch] text-[clamp(1.75rem,4vw,3.25rem)] text-ink-strong">
      Diez pasos. Ninguna sorpresa en el medio.
    </h2>
  </header>

  <div class="proceso-grid">
    {/*
      display:contents en la lista: el <ol> no genera caja propia, asi que sus
      <li> se vuelven celdas del grid de afuera y la lista conserva su
      semantica. Hace falta porque el bloque de contacto es una celda mas del
      mismo grid pero NO es un paso del proceso: adentro del <ol> un lector de
      pantalla anunciaria once.
    */}
    <ol class="proceso-lista">
      {
        CADENA.map((c) =>
          c.tipo === "nodo" ? (
            <ProcesoNodo
              n={c.etapa.n}
              nombre={c.etapa.nombre}
              indice={c.indice}
              col={c.col}
              fila={c.fila}
            />
          ) : (
            <ProcesoVertice
              indice={c.indice}
              direccion={c.direccion}
              col={c.col}
              fila={c.fila}
            />
          ),
        )
      }
    </ol>

    {/*
      Ultimo eslabon de la cadena: se enciende recien despues de que la linea
      llego a "Entrega final". El camino te lleva hasta aca y recien entonces
      aparece la invitacion.

      Lleva id="contacto" porque los "Hablemos" del header y del hero apuntaban
      a un ancla que no existia en ninguna pagina.
    */}
    <div id="contacto" class="proceso-celda proceso-contacto" style="--i:19;">
      <p class="type-display text-[clamp(1.25rem,2vw,1.75rem)] text-ink-strong">
        ¿Empezamos por el 01?
      </p>
      <a
        href={`mailto:${EMAIL}`}
        class="type-body mt-2 inline-block text-lg text-ink-soft underline decoration-ink-muted underline-offset-4 transition-colors duration-(--duration-base) ease-(--ease-inout) hover:text-ink-strong hover:decoration-ink-strong"
      >
        {EMAIL}
      </a>
    </div>
  </div>
</section>

<style>
  .proceso-grid {
    /* Provisorio: en la Task 5 pasa a 0 y lo maneja el scroll. Clavado en 1
       para poder revisar el dibujo terminado. */
    --p: 1;
    --n-cadena: 20;

    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .proceso-lista {
    /* No genera caja: sus hijos son celdas del grid de arriba. */
    display: contents;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* El tramo que le toca a cada elemento de la cadena. Vive en :global porque
     los nodos y los vertices son otros componentes y quedan fuera del scope de
     este archivo. */
  :global(.proceso-celda) {
    --local: clamp(0, calc(var(--p, 0) * var(--n-cadena) - var(--i)), 1);
  }

  .proceso-contacto {
    margin-top: 1.5rem;
  }

  @media (min-width: 768px) {
    .proceso-grid {
      grid-template-columns:
        minmax(0, 1fr) 2.5rem minmax(0, 1fr) 2.5rem minmax(0, 1fr);
      grid-template-rows: auto 2.5rem auto 2.5rem auto 2.5rem auto;
    }

    /* La colocacion va por variables inline y se aplica SOLO aca. Debajo de md
       la regla no existe y los 20 elementos caen en una columna por orden del
       DOM: mismos elementos, mismos indices, mismo script, sin un segundo
       dibujo que mantener sincronizado. */
    :global(.proceso-nodo),
    :global(.proceso-vertice) {
      grid-column: var(--col);
      grid-row: var(--fila);
    }

    .proceso-contacto {
      grid-column: 1 / span 3;
      grid-row: 7;
      margin-top: 0;
      align-self: center;
    }
  }
</style>
```

- [ ] **Step 3: Montar la sección en `src/pages/index.astro`**

Agregar el import junto a los otros:

```ts
import ComoTrabajamos from "../components/ComoTrabajamos.astro";
```

y la instancia después de `<Clientes />`:

```astro
  <Clientes />
  <ComoTrabajamos />
```

- [ ] **Step 4: Correr la verificación**

```bash
npx astro build && npx astro check && node scripts/verificar-proceso.mjs
```

Esperado: build limpio, `0 errors, 0 warnings, 0 hints`, y `OK`.

- [ ] **Step 5: Revisar el dibujo en el navegador**

```bash
npx astro dev --background
```

Abrir `http://127.0.0.1:4321/` y confirmar, con `--p` en 1:

1. El camino serpentea 3-3-3-1 y ningún tramo de línea dobla en el aire.
2. Los diez nodos están encendidos: borde y texto en tinta, no en gris.
3. `Entrega final` está sola en la última fila, a la derecha, con el bloque de contacto a su izquierda.
4. Achicando la ventana por debajo de 768px, todo cae en una columna, los diez nodos quedan en orden 01→10 y todos los tramos son verticales.
5. Clickear "Hablemos" en el header baja hasta el bloque de contacto.

- [ ] **Step 6: Commit**

```bash
git add src/components/ComoTrabajamos.astro src/pages/index.astro
git commit -F - <<'EOF'
Seccion "Como trabajamos": el camino, todavia sin animar

Cuatro filas de 3, 3, 3 y 1. La forma no es decorativa: cada bajada arranca
debajo del ultimo nodo de su fila, asi que ningun giro ocurre en el aire y no
hay codos que dibujar. Por eso alcanzan diez cajas y nueve rectas en un grid,
sin SVG y sin medir el DOM.

El <ol> va con display:contents para que sus <li> sean celdas del grid de
afuera sin perder la semantica de lista: el bloque de contacto es una celda mas
pero no es un paso del proceso, y adentro de la lista se anunciarian once.

De paso, #contacto existe por primera vez. Los "Hablemos" del header y del hero
apuntaban a un ancla que no estaba en ninguna pagina.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: El scrub con el scroll

**Files:**
- Modify: `src/components/ComoTrabajamos.astro` (bloque `<style>` y agregar `<script>`)

**Interfaces:**
- Consumes: `<section data-proceso>` y las variables `--p` / `--n-cadena` de la Task 4.
- Produces: nada que consuman otras tareas.

- [ ] **Step 1: Bajar `--p` a 0 y agregar el estado de reduced-motion**

En el `<style>`, reemplazar el bloque provisorio:

```css
  .proceso-grid {
    /* Provisorio: en la Task 5 pasa a 0 y lo maneja el scroll. Clavado en 1
       para poder revisar el dibujo terminado. */
    --p: 1;
    --n-cadena: 20;
```

por:

```css
  .proceso-grid {
    /* Lo escribe el script segun la posicion de la seccion en el viewport. */
    --p: 0;
    --n-cadena: 20;
```

y agregar al final del `<style>`:

```css
  /* Sin animacion, la seccion se ve terminada. El script ni siquiera se
     registra, asi que no hay --p inline que le gane a esta regla. */
  @media (prefers-reduced-motion: reduce) {
    .proceso-grid {
      --p: 1;
    }
  }
```

- [ ] **Step 2: Verificar que ahora el camino está apagado**

```bash
npx astro build
```

Con el dev server corriendo, recargar la página: el camino tiene que estar **invisible** (líneas sin dibujar, nodos en gris claro). Es el fallo esperado antes de escribir el script.

- [ ] **Step 3: Agregar el script**

Al final de `ComoTrabajamos.astro`, después del `<style>`:

```astro
<script>
  // Scrub del camino segun la posicion de la seccion en el viewport.
  //
  // El script hace UNA sola cosa: escribir --p. Todo el dibujo lo resuelve el
  // CSS, donde cada elemento calcula su propio tramo a partir de su --i. Por
  // eso no hay nada que medir ni que rehacer en un resize.
  //
  // Mismo mecanismo que PainPoint.astro: el handler de scroll solo marca
  // sucio y el trabajo va en el frame.
  const seccion = document.querySelector<HTMLElement>("[data-proceso]");

  if (seccion && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const grid = seccion.querySelector<HTMLElement>(".proceso-grid");

    if (grid) {
      let pendiente = false;
      let visible = false;

      const pintar = () => {
        pendiente = false;
        const r = seccion.getBoundingClientRect();
        // 0 cuando el borde superior cruza el 80% de la pantalla; 1 con la
        // seccion casi entera a la vista. El 0.75 deja que el camino termine
        // de dibujarse antes de que la seccion empiece a irse por arriba.
        const bruto = (window.innerHeight * 0.8 - r.top) / (r.height * 0.75);
        grid.style.setProperty("--p", String(Math.min(1, Math.max(0, bruto))));
      };

      const alScrollear = () => {
        if (!pendiente && visible) {
          pendiente = true;
          requestAnimationFrame(pintar);
        }
      };

      const io = new IntersectionObserver(
        (entradas) => {
          visible = entradas[0].isIntersecting;
          if (visible) alScrollear();
        },
        { rootMargin: "10% 0px" },
      );
      io.observe(seccion);

      window.addEventListener("scroll", alScrollear, { passive: true });
      window.addEventListener("resize", alScrollear, { passive: true });
      pintar();
    }
  }
</script>
```

- [ ] **Step 4: Verificar el ciclo completo**

```bash
npx astro build && npx astro check && node scripts/verificar-proceso.mjs
```

Esperado: build limpio, `0 errors, 0 warnings, 0 hints`, y `OK`.

- [ ] **Step 5: Revisar la animación en el navegador**

Recargar `http://127.0.0.1:4321/` y confirmar:

1. Scrolleando hacia la sección, el camino se dibuja desde `01` hacia `10`.
2. Scrolleando para atrás se desdibuja: sigue la posición, no es un trigger de una sola vez.
3. **Criterio 3 de la spec:** parando el scroll en cinco puntos distintos del recorrido, ningún nodo está encendido si el tramo que lo alimenta no terminó de dibujarse. El frente del trazo siempre va adelante del nodo que se enciende.
4. El bloque de contacto aparece último, después de que la línea llegó a `Entrega final`.
5. Con reduced motion activado en el sistema, la sección se ve terminada desde el principio y no pasa nada al scrollear.

Para el punto 5, sin tocar la configuración del sistema, forzarlo desde la consola de DevTools con *Rendering → Emulate CSS prefers-reduced-motion* y recargar.

- [ ] **Step 6: Commit**

```bash
git add src/components/ComoTrabajamos.astro
git commit -F - <<'EOF'
El camino del proceso se dibuja siguiendo el scroll

El script hace una sola cosa: escribir --p en el grid. Todo el dibujo lo
resuelve el CSS, donde cada elemento calcula su tramo a partir de su indice.
Por eso no hay nada que medir ni que rehacer en un resize, que es lo que se
gano al armar el trazado sin codos.

Con prefers-reduced-motion el listener no se registra y --p queda en 1 por CSS,
asi que la seccion se ve terminada en vez de vacia.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

## Self-review

**Cobertura de la spec.** Cada sección de la spec tiene tarea: contenido y datos → Task 1; trazado y tabla de colocación → Task 4; los tres componentes → Tasks 2, 3, 4; animación → Task 5; responsive → Task 4 (la media query es el mecanismo de colocación); bloque de contacto y `id="contacto"` → Task 4; accesibilidad → Task 4 (`display: contents`, `aria-hidden`) y Task 5 (reduced motion); copy → Task 4. Los siete criterios de aceptación se verifican en Task 4 Step 5 (1, 6), Task 5 Step 5 (2, 3, 4), Task 1 y 4 Step 4 (7) — y el criterio 5, el del lector de pantalla, en la revisión abajo.

**Hueco encontrado y tapado:** el criterio 5 de la spec (un lector de pantalla anuncia diez elementos, sin los vértices) no tenía verificación en ninguna tarea. La verificación estructural cuenta nodos y vértices pero no prueba la semántica de lista, que es justo lo que `display: contents` pone en riesgo. Agregado como paso extra en Task 4:

- [ ] **Task 4, Step 5b: Verificar la semántica de lista**

En la consola de DevTools, con la página cargada:

```js
const ol = document.querySelector('.proceso-lista');
console.log('role:', getComputedStyle(ol).display);
console.log('items visibles para AT:', [...ol.children].filter(li => li.getAttribute('aria-hidden') !== 'true').length);
```

Esperado: `display: contents` y `10`.

Después, en el panel *Accessibility* de DevTools, seleccionar el `<ol>` y confirmar que el árbol lo expone como **list** con **10** listitems. Si algún motor lo expusiera como genérico, la salida es sacar el `display: contents` y mover el bloque de contacto fuera del grid, posicionándolo con su propia fila.

**Placeholders:** ninguno. Todos los pasos de código traen el código completo.

**Consistencia de tipos:** `Etapa` se define en Task 1 y se consume en Task 4 con el mismo nombre de campos (`n`, `nombre`). `Direccion` se define y exporta en Task 3 y se importa en Task 4 con `import ProcesoVertice, { type Direccion }`. Los nombres de clase (`proceso-celda`, `proceso-nodo`, `proceso-vertice`, `proceso-grid`, `proceso-lista`, `proceso-contacto`) son los mismos en los cinco archivos y en el script de verificación. Las props de `ProcesoNodo` (`n`, `nombre`, `indice`, `col`, `fila`) y de `ProcesoVertice` (`indice`, `direccion`, `col`, `fila`) coinciden con cómo las llama Task 4. `--n-cadena` vale 20 y la cadena tiene 20 elementos: 10 nodos en índices pares 0–18, 9 vértices en impares 1–17, contacto en 19.
