# Sección "Cómo trabajamos"

Fecha: 2026-08-06

Sección nueva al final de la home, después de `Clientes`: el proceso del estudio
como un camino serpenteado de diez etapas que se dibuja con el scroll.

## Qué se muestra

Las diez etapas del proceso, y nada más:

```
01 Presupuestación   02 Descubrimiento   03 Análisis        04 Estrategia
05 Rutas visuales    06 Diseño           07 Presentación    08 Aplicaciones
09 Manualización     10 Entrega final
```

El diagrama de referencia del cliente traía además límites de revisión, en qué
puntos participa el cliente y unos hitos marcados en verde. Queda todo afuera:
es letra chica de un documento interno y compite con la animación, que es lo que
esta sección tiene que hacer bien.

Cada nodo muestra el ordinal y el nombre. El ordinal no es decoración: la fila
del medio se lee de derecha a izquierda, y con el orden escrito el zigzag no
confunde.

## Trazado

Cuatro filas: 3, 3, 3 y 1. Grid de 5 columnas × 7 filas — las columnas y filas
impares son nodos, las pares son el aire donde viven los vértices.

```
col:   1     3     5
r1:  [01]──[02]──[03]
r2                  │
r3:  [06]──[05]──[04]
r4    │
r5:  [07]──[08]──[09]
r6                  │
r7:  [  contacto ][10]
```

**Cada bajada arranca justo debajo del último nodo de su fila.** Esta es la
propiedad que sostiene toda la implementación: ningún giro ocurre en el aire,
los tres tramos verticales entran y salen de un nodo. Sin ella habría codos que
dibujar, y con codos hace falta un SVG con geometría medida del DOM.

`10 Entrega final` queda sola en la última fila. Se lee como destino y no como
una etapa más.

### Colocación

| elemento | col | fila |
|---|---|---|
| nodo 01 | 1 | 1 |
| nodo 02 | 3 | 1 |
| nodo 03 | 5 | 1 |
| nodo 04 | 5 | 3 |
| nodo 05 | 3 | 3 |
| nodo 06 | 1 | 3 |
| nodo 07 | 1 | 5 |
| nodo 08 | 3 | 5 |
| nodo 09 | 5 | 5 |
| nodo 10 | 5 | 7 |
| bloque contacto | 1 / span 3 | 7 |

Vértices: derecha en (2,1) y (4,1); abajo en (5,2); izquierda en (4,3) y (2,3);
abajo en (1,4); derecha en (2,5) y (4,5); abajo en (5,6).

## Arquitectura

### `src/data/proceso.ts`

```ts
export interface Etapa {
  n: string;      // "01"
  nombre: string; // "Presupuestación"
}
export const PROCESO: Etapa[];
```

Las filas (`[3, 3, 3, 1]`) **no** van acá: son layout, y las deriva el
componente de sección. Agregar o sacar una etapa no debe obligar a editar dos
lugares.

### `src/components/ProcesoNodo.astro`

Una caja. Props: `n`, `nombre`, `indice` (posición en la cadena), `col`, `fila`.
No sabe que existe un camino: solo se pinta más o menos encendido según su
progreso.

### `src/components/ProcesoVertice.astro`

Un tramo de línea. Props: `indice`, `direccion` (`derecha` | `izquierda` |
`abajo`), `col`, `fila`. Tampoco sabe nada del resto.

### `src/components/ComoTrabajamos.astro`

La sección: header, grid, intercalado de nodos y vértices, bloque de contacto y
el script del scrub. Es el único que conoce la forma del camino.

### `src/pages/index.astro`

Se monta después de `<Clientes />`.

## Animación

### El único trabajo del JS

Escribir `--p` (0 a 1) en la sección según su posición en el viewport. Handler
de scroll rateado a un frame con `requestAnimationFrame` e `IntersectionObserver`
para no calcular cuando la sección no se ve. Es el mecanismo que ya corre en
`PainPoint.astro`; se sigue ese patrón en lugar de inventar uno nuevo.

Mapeo de partida, a ajustar a ojo:

```
p = (vh * 0.8 - r.top) / (r.height * 0.75)
```

acotado a [0, 1]. `--p` vale 0 cuando el borde superior de la sección cruza el
80% de la altura del viewport, y llega a 1 con la sección casi entera a la vista.

### Todo lo demás lo hace el CSS

La cadena tiene **20 elementos**: 10 nodos, 9 vértices y el bloque de contacto,
en ese orden. Cada uno lleva su índice inline (`--i`, de 0 a 19) y calcula solo
cuánto le toca dibujarse:

```css
--local: clamp(0, calc(var(--p, 0) * 20 - var(--i)), 1);
```

**Vértices.** Se dibujan con `scale` sobre un solo eje, y el `transform-origin`
es el lado por el que entra la línea:

| dirección | scale | transform-origin |
|---|---|---|
| derecha | `var(--local) 1` | `left center` |
| izquierda | `var(--local) 1` | `right center` |
| abajo | `1 var(--local)` | `center top` |

**Nodos.** Aparecen: opacidad de 0 a 1 y escala de 0.94 a 1. La rampa va al
doble de velocidad que su tramo (`clamp(0, paso * 2, 1)`), así el nodo termina
de entrar en la primera mitad y recién después arranca el vértice que sale de
él. Ese hueco es lo que hace que se lean como pasos sueltos.

> Revisión posterior a la primera implementación. El diseño original decía que
> los nodos se **teñían** de gris a tinta, con las diez cajas visibles desde el
> principio. No funcionaba: con las diez a la vista no se leía un recorrido, se
> leía una grilla que cambiaba de tono. Un nodo que todavía no llegó no tiene
> que estar ahí.

**Color.** Cada etapa tiene su color (`PALETA` en `ComoTrabajamos.astro`), y el
tramo que sale de un nodo lleva el mismo, así el color se arrastra detrás del
frente y la etapa siguiente entra con uno nuevo.

El color no se acumula: **viaja**. Cada elemento se apaga a `--color-ink-strong`
tres eslabones después de llegar, vía `--estela`. Sin eso, al final del scroll
habría diez colores prendidos a la vez y la sección se comería al resto de la
página. Es el mismo criterio que el rotador de "Qué hacemos", que también cicla
colores de a uno.

Los diez van de frío a cálido — el recorrido sube de temperatura hacia la
entrega — y abren y cierran en el violeta de la marca. El nodo recién llegado
suma un lavado del 8% de su color en el fondo, para tener cuerpo y no solo un
borde de color.

Los vértices son de 2px y no de 1: a un pixel el color casi no se ve y el tramo
queda como una línea gris con una idea de color.

**Bloque de contacto.** Índice 19, así que se enciende último, después de que la
línea llegó a `Entrega final`. Tratamiento distinto al de un nodo porque es un
llamado a la acción, no una etapa: opacidad de 0 a 1 y 8px de subida.

Ningún nodo se enciende del todo antes de que el vértice que lo alimenta esté
completo, porque los índices son consecutivos. El orden de lectura y el orden de
la animación son el mismo, por construcción.

## Responsive

Cada elemento lleva su celda como variables inline (`--col`, `--fila`), y el CSS
las aplica **solo** dentro de `@media (min-width: 768px)`:

```css
@media (min-width: 768px) {
  .proceso-item { grid-column: var(--col); grid-row: var(--fila); }
}
```

Debajo de `md` esa regla no existe: los 20 elementos caen en una sola columna por
orden del DOM, y los vértices pasan todos a verticales cambiando el eje del
`scale`. Mismos elementos, mismos índices, mismo script — no hay un segundo
dibujo que mantener sincronizado.

Por eso **el orden del DOM tiene que ser el orden del camino**, y lo es.

## Bloque de contacto

Ocupa las columnas 1–3 de la fila 7, al lado de `Entrega final`.

Lleva `id="contacto"`. Hoy `#contacto` no existe en ninguna página, así que los
dos botones "Hablemos" — el de `SiteHeader.astro:46` y el de `Hero.astro:41` —
apuntan a un ancla vacía y no hacen nada. Este bloque los arregla sin inventar
una sección aparte.

Contenido: un titular corto y el mail como link. Sin formulario: el footer ya
resuelve el contacto con `mailto:` y duplicarlo sería peor.

El mail sale de la constante `EMAIL` que hoy vive en `SiteFooter.astro`, donde
está marcada como placeholder pendiente de los datos reales del estudio. Para no
tener el mismo dato escrito en dos archivos, se mueve a `src/data/estudio.ts` y
los dos componentes lo importan de ahí.

## Accesibilidad

Un lector de pantalla tiene que anunciar diez pasos en orden aunque visualmente
zigzagueen. Eso pide un `<ol>` con un `<li>` por nodo. Pero el bloque de contacto
es una celda más del mismo grid y **no** es un paso del proceso: meterlo adentro
del `<ol>` lo haría anunciar once.

Estructura, entonces:

```html
<div class="proceso">            <!-- el grid -->
  <ol style="display: contents"> <!-- no genera caja: sus hijos son celdas -->
    <li>…nodo 01…</li>
    <li aria-hidden="true">…vértice…</li>
    …
  </ol>
  <div id="contacto">…</div>     <!-- celda del grid, fuera de la lista -->
</div>
```

`display: contents` hace que el `<ol>` no genere caja propia, así que sus `<li>`
se vuelven celdas del grid de afuera mientras el elemento conserva su semántica
de lista. Hubo un bug en el que esto borraba las semánticas de lista, corregido
hace varias versiones en los tres motores; el sitio ya depende de CSS más
reciente que eso (`overflow-clip-margin`, `color-mix`).

Los vértices van con `aria-hidden` para no ensuciar la cuenta.

Con `prefers-reduced-motion: reduce` no se registra el listener de scroll: `--p`
queda en 1 por CSS y la sección se ve terminada desde el principio.

## Decisiones tomadas a propósito

**Sin sonido.** Diez sonidos disparándose durante un scroll sería ruido, y el
audio del sitio responde solo a acciones deliberadas — un click, un agarre —
nunca al scroll.

**Sin SVG y sin medir el DOM.** Se evaluaron dos alternativas: grid + SVG
superpuesto con la geometría medida del DOM (permite curvas, pero exige medir al
cargar y en cada resize), y todo dentro de un SVG con `viewBox` (cero medición,
pero el texto en SVG es incómodo, el móvil necesita un segundo dibujo y un grafo
en SVG no es una lista de pasos para un lector de pantalla). El trazado sin codos
hace innecesarias a las dos. Costo aceptado: las esquinas quedan a 90° y no se
pueden curvar, lo que coincide con el diagrama de referencia.

**Sin item en el nav.** Agregar "Cómo trabajamos" al header es una línea en
`SiteHeader.astro`, pero es tocar otro componente y queda fuera de este alcance.

## Copy

Propuesta, para reescribir:

- Eyebrow: `Cómo trabajamos`
- Titular: `Diez pasos. Ninguna sorpresa en el medio.`
- Contacto: `¿Empezamos por el 01?` + el mail

## Criterios de aceptación

1. Las diez etapas se leen en orden con el trazado de 3-3-3-1 en pantallas `md` y
   más grandes, y en una sola columna debajo de eso.
2. El camino se dibuja y se desdibuja siguiendo la posición del scroll, no como
   trigger de una sola vez.
3. En cualquier punto del recorrido, ningún nodo está encendido si el vértice
   que lo alimenta no terminó de dibujarse. Se verifica parando el scroll en
   varios puntos y mirando el frente del trazo.
4. Con `prefers-reduced-motion` la sección se ve completa y no se registra
   ningún listener de scroll.
5. Un lector de pantalla anuncia una lista de diez elementos, sin los vértices.
6. `#contacto` resuelve: los botones "Hablemos" del header y del hero llegan al
   bloque nuevo.
7. `npx astro build` pasa limpio.
