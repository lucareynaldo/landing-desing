# Auditoría de las webs de referencia

Fecha: 2026-08-05. Valores extraídos del build servido en producción, no estimados a ojo.

---

## Resumen por sitio

| Sitio | Stack | Source maps | Qué se puede sacar |
|---|---|---|---|
| **readymag.com** | Builder propio de Readymag | No | Solo valores visuales. El DOM es output de builder |
| **sethlukin.com** | Framer + Motion + Lenis | **Sí, con fuente original** | Mecanismos completos y valores exactos |
| **teamworkgraph.com** | Vite + React (monorepo Atlassian) | **Sí, 3.635 archivos** | Mecanismo de animación vía CSS keyframes |
| **recent.design** | Vite + React + Tailwind | No | Pendiente (fase 2) |

---

## 1. readymag.com

### Naturaleza del sitio
No es código escrito a mano. Es output del builder de Readymag:

- Widgets en `position: absolute` con clases `rmwidget`
- Motor de scroll propietario: `.content-scroll-wrapper`, `.animation-container`
- **Canvas de diseño fijo de 1024px escalado al viewport** (a 1512px de ancho el factor es ×1.477)

**Consecuencia:** de este sitio no se copia código. Se copian valores y composición. El escalado por canvas fijo además es una mala práctica para un sitio hecho a mano (accesibilidad, responsive real) y no debe replicarse.

### Tipografía
- **Display:** fundidora **Optimo** (Suiza) — la tabla de nombres del WOFF está ofuscada, pero sobrevivió el campo de fabricante. Casi con certeza **Theinhardt**. Licencia comercial.
- **Secundaria:** **Graphik** (Commercial Type). Licencia comercial.
- **Acento:** Ohno Casual (Medium)

Rasgos medidos, que son lo verdaderamente replicable:

| Rol | Tamaño (canvas) | Line-height | Letter-spacing | En em |
|---|---|---|---|---|
| Display XL | 80px | 40px | −4.2px | **−0.0525em** |
| Display | 40px | 40px | −2px | **−0.05em** |
| Cuerpo grande | 18px | 33px | −0.8 a −1.2px | ≈ −0.05em |
| Cuerpo | 16px | 20px | −0.1px | ≈ −0.006em |
| Micro | 12px | 12px | −0.08px | — |

**La firma tipográfica de readymag:** tracking muy cerrado (≈ **−0.05em**) y `line-height: 1.0` en display. Eso es lo que hay que copiar, no la fuente.

### Paleta
| Hex | Uso | Frecuencia |
|---|---|---|
| `#282828` | Texto principal | 1029 |
| `#FFFFFF` | Fondo | 173 |
| `#000000` | Titulares | 89 |
| `#8800FF` | Acento violeta | 8 |
| `#FF5000` | Acento naranja (CTA) | 3 |
| `#808080` `#444444` | Grises secundarios | 23 |
| `#E7E7E7` `#F4F4F4` | Superficies | 9 |

Nota: el texto por defecto es `#282828`, **no negro puro**. Detalle chico con mucho impacto.

### Hero
Tres filas horizontales de screenshots + titular y botón debajo. Las filas son tiras de 2978px y 3299px de ancho. El movimiento lo maneja el motor propietario (`animation-container`), no CSS ni WAAPI — no hay nada que extraer. Un marquee se reescribe en ~20 líneas.

Hover sobre las imágenes: `transition: filter 100ms ease`.

---

## 2. sethlukin.com

Framer. Los source maps exponen los componentes originales con comentarios.

### Librerías confirmadas
- **Motion** (`motion.mjs`)
- **Lenis** `@studio-freight/lenis@1.0.29` → `new Lenis({ duration: 1.0 })`
- **Unicorn Studio** — el efecto de partículas punteadas (los "peces"). Herramienta no-code de WebGL, no es código propio
- Componente `Clock.js` — el reloj en vivo del footer
- Scrollbar nativa oculta por completo

### Tipografía
**PP Neue Montreal** (Pangram Pangram), variantes Bold y TT Bold. Licencia comercial.

| Rol | Tamaño | Line-height | Letter-spacing | Ratio lh |
|---|---|---|---|---|
| Display línea 1 | 202.79px | 162.24px | −4.06px | **0.80** |
| Display línea 2 | 168.68px | 134.94px | −3.37px | **0.80** |
| Botones | 40.48px | 48.58px | −0.2px | 1.20 |
| Metadata esquinas | 20px | 24px | −1px | 1.20 |

Todo en `text-transform: uppercase`, blanco sobre negro.

**Los ratios que importan:** `line-height = 0.8 × font-size` y `letter-spacing = −0.02em` en display. Las dos líneas tienen tamaños distintos (ratio 0.83) para que ambas queden al ancho completo.

### Animación de entrada (JSON literal del HTML)
Framer publica sus appear animations como JSON plano. Valores exactos, sin des-minificar:

```js
// Estados iniciales
{ opacity: 0.001 }              // 6 elementos
{ opacity: 0.001, y: 150 }      // 3 elementos

// Las 3 transiciones del sitio entero
{ delay: 1.0, duration: 0.4, ease: [0.44, 0, 0.56, 1],    type: 'tween' }  // ×6
{ delay: 1.2, duration: 0.4, ease: [0.5,  0, 0.88, 0.77], type: 'tween' }  // ×2
{ delay: 1.6, duration: 0.4, ease: [0,  0.72, 0.56, 1],   type: 'tween' }  // ×1
```

Coreografía escalonada en 1.0s → 1.2s → 1.6s, todas de 400ms. Breakpoints: `1200px` / `810px` / mobile.

### Reveal del footer — mecanismo exacto

Verificado en runtime:

```css
/* La lámina de contenido */
.sheet {
  position: relative;
  z-index: 2;
  background: #EEEEEE;   /* no es blanco puro */
  border-radius: 64px;
}

/* El footer, ya presente, esperando debajo */
.footer-layer {
  position: fixed;
  top: 0; bottom: 0;     /* ocupa 100vh */
  z-index: 0;
  background: #000000;
}
```

La altura del documento (5980px) = lámina (4508px) + espacio de revelado (~1472px). CSS puro, sin librería ni scroll listener.

---

## 3. teamworkgraph.com

Vite + React. El source map filtra el monorepo interno de Atlassian (Atlaskit, Relay, analytics): 3.635 archivos de fuente original. **El microsite en sí son solo 8 archivos y no contiene la landing visual**, así que el hallazgo no aporta nada aprovechable — y de todos modos ese código es propietario y depende por completo de su design system.

Lo aprovechable está en el CSS y el DOM, que sí son transparentes.

### El campo de iconos: DOM real, no video ni canvas
- **170 `<img>`**, cada icono es un SVG individual (`google-drive.svg`, `agents-06.svg`…)
- **128 `<line>` SVG** para las conexiones punteadas
- Cero `<canvas>`, cero `<video>`
- Los iconos **no derivan**: animan al entrar y después quedan quietos

### Keyframes propios
```css
@keyframes twgHeroLetterANodeIn {
  0%   { opacity: 0; transform: scale(0.4); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes twgHeroLetterAEdgeDraw    { 100% { stroke-dashoffset: 0; } }
@keyframes twgHeroLetterAOutlineDraw { 100% { stroke-dashoffset: 0; } }
@keyframes twgHeroTypographyScribbleDraw {
  0%   { stroke-dashoffset: 1; }
  100% { stroke-dashoffset: 0; }
}
```

Dos técnicas, ambas triviales:
1. **Nodos:** pop-in con `opacity` + `scale(0.4 → 1)`, escalonado
2. **Conexiones:** line-draw clásico de SVG con `stroke-dashoffset`

Transiciones de UI del sitio: `opacity 400ms ease-out`, `opacity 500ms ease-out`, `visibility 150ms ease-out`.

---

## Inventario de efectos para la fase 1

| # | Efecto | Origen | Técnica | Dificultad |
|---|---|---|---|---|
| 1 | Marquee del hero | readymag | CSS `translateX` + duplicado, o WAAPI | Baja |
| 2 | Hover de imágenes | readymag | `transition: filter 100ms ease` | Trivial |
| 3 | Cards de painpoints | readymag | Layout; antes/después con IntersectionObserver | Media |
| 4 | Campo de iconos | teamworkgraph | `<img>` absolutos + `<line>` SVG | Media |
| 5 | Entrada de iconos | teamworkgraph | `opacity` + `scale(0.4→1)` escalonado | Baja |
| 6 | Líneas que se dibujan | teamworkgraph | `stroke-dashoffset` | Baja |
| 7 | Texto rotativo "HACEMOS" | propio | Swap con Motion | Baja |
| 8 | Reveal del footer | sethlukin | CSS puro: fixed z0 + sheet z2 | **Trivial** |
| 9 | Reloj en vivo | sethlukin | `setInterval` + `toLocaleTimeString` | Trivial |
| 10 | Scroll suave | sethlukin | Lenis, `duration: 1.0` | Trivial |
| 11 | Coreografía de entrada | sethlukin | Motion, delays 1.0/1.2/1.6s, 400ms | Baja |

Nada de la fase 1 requiere WebGL ni des-minificación.

---

## Fuentes: todas las de referencia son comerciales

| Fuente | Fundidora | Sitio |
|---|---|---|
| Theinhardt (probable) | Optimo | readymag |
| Graphik | Commercial Type | readymag |
| PP Neue Montreal | Pangram Pangram | sethlukin |

Ninguna es gratuita. Como los tokens de readymag son prestados hasta que exista la marca propia, conviene un sustituto libre de grotesca suiza (Inter, Geist o Instrument Sans) aplicando los ratios medidos — tracking −0.05em y line-height 1.0 — que es de donde viene el parecido real.

---

# Auditoría profunda de recent.design (fase 2)

Sin source maps, así que todo lo de abajo sale de inspeccionar el DOM en
runtime y medir frame a frame, no de leer el fuente.

## Stack

Vite + React + Tailwind + **TanStack Router** + **Motion**.

Dos detecciones que necesitaron cuidado:

- El `startViewTransition` que aparece en el bundle **no es código propio**: es
  el soporte integrado de TanStack Router (se delata por `__TSR_key`,
  `defaultViewTransition`, `isViewTransitionTypesSupported`). Y el CSS tiene
  **cero** declaraciones `view-transition-name`, así que la API está
  disponible pero no se usa para el morph.
- Motion no aparece por nombre, pero sí su firma: animaciones WAAPI con
  easing `linear(0 0%, ... 1.0388 49.99%, ... 1 100%)`. Ese sobrepaso de
  1.0388 es un **spring compilado a `linear()`**, que es exactamente lo que
  hace Motion.

## Tokens

| Token | Valor |
|---|---|
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` |
| `--ease-standard` | `cubic-bezier(.2, 0, 0, 1)` |
| `--duration-fast` | `120ms` |
| `--duration-base` | `180ms` |
| `--duration-slow` | `280ms` |

**La fluidez no viene de que sea suave: viene de que es rapidísimo.**
120–280ms contra los 400ms de sethlukin.

## Arquitectura de los dos modos

El hallazgo central: **el grid nunca se desmonta ni se toca**. Medido en
pleno detalle, sigue con `opacity: 1`, `filter: none`, `pointer-events: auto`.

El detalle es una capa `position: fixed` en `z-50` montada encima, que ocupa
desde el borde del sidebar hasta la derecha. Dentro de ella:

- una capa de `backdrop-filter: blur(8px)` con fondo al 70% que desenfoca el
  grid **por detrás** — el desenfoque no se le aplica al grid
- el media del proyecto como elemento absoluto

Consecuencia práctica: la posición de scroll del grid se conserva **gratis**,
sin código de restauración, porque el grid nunca se fue.

## El morph, medido frame a frame

| Frame | Caja del media |
|---|---|
| thumbnail original | `[268, 100, 276, 242]` |
| 0 | `[268, 100, 276, 242]` |
| 6 | `[584, 146, 598, 523]` |
| 12 | `[658, 157, 674, 590]` |
| final | `[656, 156, 672, 588]` |

Arranca **exactamente** en la caja del thumbnail y llega en ~190ms. Es FLIP.

**El detalle que más importa: `transform` vale `none` en todos los frames.**
No animan transform, animan la geometría real (`left/top/width/height`).

Un FLIP con `transform: scale()` deformaría el contenido — estirar un
thumbnail de 276px hasta 672px chupa la imagen. Animando la geometría real,
el `object-cover` del media se recalcula en cada frame y la imagen se ve
correcta todo el tiempo. Pagan layout por frame en un elemento a cambio de
que no haya distorsión. Por eso se ve fluido y no se ve como un zoom.

## Cierre y ruteo

- URL real por proyecto: `/i/<slug>`, vía History API. Compartible, y el
  botón atrás del navegador funciona.
- Al cerrar, el morph corre al revés hasta la caja exacta del thumbnail
  (`[273,100,281,246]` → `[268,99,276,242]`) y recién ahí se desmonta la capa.
- El detalle trae flechas de anterior/siguiente, así que se puede recorrer el
  catálogo sin volver al grid.

## Qué significa para nosotros

Nada de esto necesita WebGL ni des-minificación. Se reproduce con:

1. Grid siempre montado; el detalle como capa `fixed` encima.
2. Desenfoque con `backdrop-filter`, nunca `filter` sobre el grid.
3. FLIP animando geometría real, no transform.
4. Duraciones cortas (180–280ms) con `cubic-bezier(.16, 1, .3, 1)`.
5. Ruta propia por proyecto con History API.

---

## Sobre qué tomamos de estos sitios

Los valores medidos (tamaños, curvas, duraciones, colores) y las técnicas identificadas son terreno normal de ingeniería inversa. Dos cosas quedan fuera:

- El monorepo de Atlassian que quedó expuesto por su source map es código interno propietario. Sirvió para descartar que hubiera algo aprovechable ahí; no se copia.
- Las fuentes comerciales requieren licencia propia.
