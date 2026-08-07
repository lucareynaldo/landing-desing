# Card de painpoint con secuencia scrubeada

Fecha: 2026-08-06

Rehace `PainPoint.astro` tomando como referencia las cards de la sección
"Design and launch outstanding websites" de readymag.com. El objetivo del
rediseño no es sólo estético: es que el diseñador pueda montar cards nuevas
—con su propia animación, su propio color y su propia composición— **sin editar
el código del componente**, sólo instanciándolo y llenando una carpeta.

## La referencia, auditada

Auditoría hecha sobre readymag.com el 2026-08-06. Lo que se midió, no lo que se
supone:

**Anatomía de la card.** Rectángulo con radio grande (~24–28 px), color de fondo
sólido y propio de cada card (negro, naranja, verde inglés, violeta, gris claro),
sin borde. El media es **full-bleed**: ocupa la card de borde a borde, por debajo
del texto — no es una columna al lado del texto. El texto vive encima, en dos
bloques anclados: título arriba, párrafo abajo, y en el medio el hueco donde
respira la animación.

**La posición del texto es un parámetro.** "Attract with interactivity" y
"Streamline teamwork" lo tienen a la izquierda; "Expand functionality to
infinity" en la columna derecha; "Enjoy easy workflow" en un panel derecho. Es
un molde con un parámetro, no cuatro maquetados distintos.

**La animación está atada al scroll, no a un reloj.** En "Attract with
interactivity" dos capturas consecutivas al mismo `scrollY` salen idénticas
píxel a píxel, y a `scrollY` 1150 / 1260 / 1500 el media está en tres estados
distintos y crecientes. No es autoplay ni loop temporizado: el progreso es
función de la posición de la card en el viewport. (Hay un `<video loop muted>`
en la página, pero pertenece a otra card y quedó en `currentTime 0` durante todo
el recorrido.)

Ese mecanismo —progreso 0→1 en función del scroll— ya existe en el
`PainPoint.astro` actual. Lo que cambia es el envase y de dónde sale el media.

## Decisiones tomadas

| Decisión | Elegido | Descartado |
|---|---|---|
| Contenido del media | Un asset temporal (secuencia de cuadros) que el scroll scrubea | Dos imágenes con transición CSS |
| Formato del asset | Secuencia de cuadros dibujada en `<canvas>` | `<video>` scrubeado con `currentTime` |
| Disparadores | `scrub` (default) y `hover` | Play-una-vez, loop continuo |
| Posición del texto | Columna (izq/der/centro), título arriba y párrafo abajo | Anclas libres en grilla 3×3 |

### Por qué secuencia y no `<video>`

Fijar `currentTime` obliga al navegador a hacer *seek*, y un mp4 normal sólo
puede saltar a keyframes (uno cada ~2 s): el scrub sale escalonado y con lag. La
solución —encodear con `-g 1`, todos los cuadros como keyframe— infla el archivo
hasta pesar prácticamente lo mismo que la secuencia, porque es una secuencia de
cuadros dentro de un contenedor. Sumado a que iOS Safari exige `muted playsinline`
y se pone caprichoso con seeks precisos si el video nunca se reprodujo, el camino
del video obliga a pasarle al diseñador una receta de encode que, si no sigue
exacto, rompe el efecto de un modo difícil de diagnosticar.

La secuencia es exacta, reversible cuadro a cuadro e idéntica en todos los
navegadores. Es la técnica de las páginas de producto de Apple. El costo es peso
—ver "Peso" más abajo— y que hay que precargar con antelación en vez de al
entrar en viewport.

## Arquitectura

Cuatro piezas, cada una con un único trabajo:

| Pieza | Trabajo | Depende de |
|---|---|---|
| `src/media/painpoints/<slug>/` | Los cuadros. Territorio del diseñador. | nada |
| `SecuenciaScrub.astro` | Descubre, optimiza y precarga los cuadros; convierte progreso 0→1 en un cuadro dibujado. Dueño del motor. | nada |
| `PainPoint.astro` | El envase: fondo, radio, proporción, y dónde cae el texto. | `SecuenciaScrub` |
| `PainPoints.astro` | La sección: encabezado, grilla bento, datos. | `PainPoint` |

El corte está donde importa: **el motor de animación no sabe nada de
painpoints**. `SecuenciaScrub` es "dibujame esta carpeta de cuadros según el
scroll", y sirve en cualquier otra sección sin tocarlo.

El script va inline en `SecuenciaScrub.astro`, como ya hacen `QueHacemos.astro` y
el `PainPoint` actual: Astro lo iza y lo ejecuta una sola vez aunque haya seis
instancias, y adentro hace `querySelectorAll` de todas. Sin `src/lib/`, sin
romper la convención del repo.

### Build

`import.meta.glob` descubre los cuadros en el frontmatter, `getImage()` los
reencodea a WebP, y `define:vars` pasa el array de URLs al script del cliente.
Todo API estable de Astro.

El ancho de salida se deriva de `ancho`, no es fijo: **1400 px** para
`completo` (el ancho máximo del contenedor de la sección) y **760 px** para
`medio`. Generar 1400 px para una card que nunca se dibuja más ancha que ~680
CSS px sería tirar más de la mitad del peso a la basura.

Si la carpeta no existe o está vacía, el frontmatter hace `throw new Error()`
nombrando la ruta faltante. Astro corta el build con ese mensaje.

### Peso

Es el costo real de esta decisión y conviene tenerlo escrito:

| Cuadros | `ancho="medio"` (760 px) | `ancho="completo"` (1400 px) |
|---|---|---|
| 24 | ~0,5 MB | ~1,4 MB |
| 40 | ~0,8 MB | ~2,3 MB |
| 60 | ~1,2 MB | ~3,5 MB |

Estimado sobre WebP q75 con contenido fotográfico; contenido plano (UI, formas,
color liso) comprime bastante mejor. Recomendación para el diseñador: **24–40
cuadros**. Una secuencia de 40 cuadros que se scrubea a lo largo de una pantalla
de scroll ya se lee continua; más cuadros agregan peso sin agregar suavidad
perceptible.

Mitiga que la descarga arranca 1,5 pantallas antes, que no compite con el
render inicial, y que con `prefers-reduced-motion` no se descarga nada.

## API pública

Lo único que el diseñador escribe:

```astro
<PainPoint
  titulo="Cada publicación parece de una marca distinta"
  texto="No es falta de ideas, es falta de sistema. Definimos una paleta, una
         retícula y una jerarquía tipográfica, y de golpe las mismas
         publicaciones se leen como una sola voz."
  secuencia="feed"
  columna="izq"
  modo="scrub"
  fondo="#000000"
  tinta="clara"
  ancho="completo"
  proporcion="16/10"
/>
```

| Prop | Tipo | Default | Qué hace |
|---|---|---|---|
| `titulo` | `string` | — | Bloque de arriba. `type-display`. |
| `texto` | `string` | — | Bloque de abajo. `type-body`. |
| `secuencia` | `string` | — | Nombre de la carpeta en `src/media/painpoints/`. |
| `eyebrow` | `string?` | — | Opcional. Existe hoy (`"El feed"`); readymag no lo usa. |
| `columna` | `'izq' \| 'der' \| 'centro'` | `'izq'` | En qué columna cae el bloque de texto. |
| `modo` | `'scrub' \| 'hover'` | `'scrub'` | Quién escribe el progreso. |
| `fondo` | `string` | `'#000000'` | Color de fondo de la card. |
| `tinta` | `'clara' \| 'oscura'` | `'clara'` | Color del texto sobre el media. |
| `ancho` | `'completo' \| 'medio'` | `'completo'` | Celda en la grilla bento. |
| `proporcion` | `string` | `'16/10'` | `aspect-ratio` de la card. |
| `scrub` | `{ entrada?, salida? }` | `{ 0.9, 0.15 }` | Ventana del scrub, en alturas de viewport. |
| `hover` | `{ duracion? }` | `{ 800 }` | ms de ida; la vuelta usa la misma. |

`entrada`/`salida` se leen como: *p=0 cuando el borde superior de la card está al
90 % de la altura del viewport; p=1 cuando llegó al 15 %*. Bajar `salida` alarga
la animación; subir `entrada` la arranca antes.

`fondo` es un color libre y no un token del tema a propósito: `global.css:70-75`
ya documenta que las paletas que viven en los componentes no se invierten en modo
oscuro porque están elegidas como color, no como contraste. La card conserva su
fondo en los dos modos.

## Contrato con el diseñador

Una carpeta, un naming, nada más:

```
src/media/painpoints/feed/
  0001.webp
  0002.webp
  …
  0040.webp
```

- Ordena por nombre de archivo: el zero-padding es lo único que importa.
- Acepta `.webp`, `.png`, `.jpg`, `.avif`. Astro los reencodea a WebP al ancho
  que corresponda en build, así que puede exportar PNG sin comprimir y el sitio
  igual sirve algo liviano.
- La cantidad de cuadros se infiere del contenido de la carpeta. No hay prop
  `cuadros` que mantener sincronizada. 24–40 cuadros es el rango recomendado.
- Carpeta ausente o vacía → **el build falla con un mensaje que nombra la
  carpeta faltante**. Ni silencio ni placeholder fantasma.

## El motor

Un solo `requestAnimationFrame` compartido por todas las cards. Un
`IntersectionObserver` decide quién está vivo; el loop corre sólo mientras haya
al menos una card en pantalla.

```
loop:
  para cada card viva:
    p = modo === 'scrub'  ?  clamp01((entrada − rect.top/vh) / (entrada − salida))
                          :  p += (dt / duracion) × dirección
    cuadro = round(p × (N−1))
    si cambió el cuadro → drawImage
```

**rAF permanente en vez de listener de `scroll`.** El sitio usa Lenis. Un
listener de scroll sólo se entera cuando el navegador emite un evento nativo;
Lenis interpola posiciones *entre* esos eventos, así que la animación queda un
escalón atrás del contenido que la rodea. Leer `getBoundingClientRect()` cada
frame es inmune a eso y cuesta una lectura de layout por card visible. Es también
por lo que el scrub actual (`PainPoint.astro:126-131`, que escucha `scroll`)
puede verse desfasado.

El loop sólo lee layout y escribe al canvas. Un `drawImage` no invalida layout,
así que no hay thrash.

**Sin easing en modo hover.** El timing ya está horneado en la secuencia por el
diseñador; superponerle una curva le pisa la intención. Avance lineal, y
`duracion` sólo escala la velocidad. En puntero grueso no hay hover: un tap
invierte la dirección.

## Dibujo y precarga

- `<canvas>` con backing store del tamaño del cuadro y `object-fit: cover` en
  CSS, así una `proporcion` de card que no coincida con la del asset recorta en
  vez de deformar.
- Un `drawImage` sólo cuando cambia el índice de cuadro. Con 40 cuadros a 60 fps
  la mayoría de los frames no dibujan nada.
- Un segundo `IntersectionObserver` con `rootMargin: '150% 0px'` arranca la
  descarga ~1,5 pantallas antes. Los cuadros se piden **en orden y con
  concurrencia tope 6**, para que los primeros —los que se ven primero— lleguen
  primero.
- Mientras carga se dibuja `min(cuadroDeseado, últimoCargado)`: la animación se
  pone al día sola en vez de mostrar un hueco.

## Degradación

Un `<img>` real detrás del canvas con el **último** cuadro, `loading="lazy"`. Es
lo que ve quien tiene JS desactivado, quien pide `prefers-reduced-motion`, y todo
el mundo durante los ms previos al primer cuadro. El último y no el primero
porque en un painpoint el "después" es el argumento: si la animación nunca corre,
lo que tiene que quedar en pantalla es la resolución y no el problema.

Con `prefers-reduced-motion: reduce` el motor **no se instancia y los cuadros no
se descargan**: se ahorra ~1 MB y queda el poster. Es la degradación más honesta
y encima la más rápida.

## Placeholder mientras no haya assets

Hoy el antes/después son nueve divs de colores generados con CSS
(`PainPoint.astro:30-47`). Con este diseño esos divs desaparecen, y sin nada en
su lugar la sección queda rota hasta que el diseñador entregue.

`scripts/generar-secuencia-placeholder.mjs` genera los 40 WebP interpolando el
feed roto hacia el feed con sistema, con los mismos colores que hoy están
hardcodeados en `PainPoints.astro:13-23`. Usa `sharp` para rasterizar SVG; hoy
está en el árbol como dependencia de Astro, así que se declara explícita en
`devDependencies` en vez de depender de una transitiva.

El diseñador vacía la carpeta, tira sus cuadros, y el script queda como
documentación ejecutable del formato esperado.

## Sección

`PainPoints.astro` pasa de `flex-col` a grilla bento: `grid-cols-1
md:grid-cols-2 gap-8`, y `ancho="completo"` es `md:col-span-2`. Es lo que permite
alternar cards a ancho completo con pares a media caña, como en la referencia.

El array de datos de la sección deja de llevar `before`/`after` (los nueve
colores) y pasa a llevar `secuencia`, `fondo`, `tinta`, `columna`, `ancho`.

## Verificación

1. `astro build` pasa — y falla con mensaje claro si se borra
   `src/media/painpoints/feed/`.
2. Dev server + navegador: cuatro posiciones de scroll dan cuatro cuadros
   distintos, y dos capturas al mismo `scrollY` salen idénticas. Es el mismo
   criterio con el que se verificó readymag.
3. Una instancia de prueba en `modo="hover"` avanza al entrar el puntero y
   vuelve al salir.
4. Reduced-motion forzado: se ve el poster y en Network **no aparece ningún
   cuadro**.
5. Modo oscuro: la card conserva su fondo propio.

## Fuera de alcance

- Los otros modos de disparo (play-una-vez, loop continuo). El motor los admite
  sin refactor, pero hoy no hay caso de uso.
- Un renderer de `<video>` intercambiable. El motor de progreso queda aislado
  para que se pueda enchufar más adelante, pero no se implementa.
- Anclas libres de texto en grilla 3×3.
- Rediseñar las otras secciones de la home.
