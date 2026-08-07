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

## Reglas del asset

- Los cuadros se ordenan **por nombre de archivo**, y el orden es lexicográfico.
  El zero-padding es obligatorio: con `1.webp`, `2.webp`, `10.webp` el 10 se
  cuela antes del 2.
- **Un solo formato por carpeta.** Si conviven `0001.png` y `0001.webp`, los dos
  entran y ese cuadro sale duplicado.
- **Sin subcarpetas.** La búsqueda es de un nivel: `feed/v2/0001.webp` no se
  encuentra.
- Formatos aceptados: `.webp` `.png` `.jpg` `.jpeg` `.avif`. Astro los reencodea
  a WebP en build, al ancho que corresponda según el `ancho` de la card
  (1400 px si es `completo`, 760 px si es `medio`), así que podés exportar sin
  comprimir.
- **24 a 40 cuadros.** Con 40 cuadros scrubeados a lo largo de una pantalla de
  scroll ya se lee continuo; más cuadros agregan peso sin agregar suavidad.
- El **easing va horneado en la secuencia**, no en el código. El componente
  avanza lineal a propósito, para no pisarte el timing.

### Exportá a la proporción de la card

El canvas dibuja con `object-fit: cover`, así que un asset con otra proporción
se recorta por los bordes. Las proporciones por defecto salen de `ancho`:

| `ancho` | proporción | tamaño sugerido |
|---|---|---|
| `completo` | 2/1 | 1400 × 700 |
| `medio` | 1/1 | 760 × 760 |

Si pasás `proporcion` explícita, exportá a esa.

### Dejá libre la zona del texto

**El componente no pone ningún velo ni degradado detrás del título.** Es
deliberado: readymag tampoco, y un velo automático le arruinaría la
composición a un asset bien hecho. La contrapartida es que un asset con una
zona clara justo debajo del texto lo vuelve ilegible, y nada te va a avisar.

Componé el asset dejando despejada la columna que use la card:

```
columna="izq"                    columna="der"
┌─────────────────────────┐      ┌─────────────────────────┐
│ TÍTULO      ░░░░░░░░░░░ │      │ ░░░░░░░░░░░      TÍTULO │
│             ░░ arte ░░░ │      │ ░░░ arte ░░             │
│ párrafo     ░░░░░░░░░░░ │      │ ░░░░░░░░░░░     párrafo │
└─────────────────────────┘      └─────────────────────────┘
   ↑ dejar limpio                                ↑ dejar limpio
```

El placeholder de `feed/` está compuesto así y sirve de referencia: la grilla
arranca al 50% del ancho.

**En una card `medio` la columna libre casi no existe.** Medido en navegador:
la card queda de ~644 px y el titular (`max-w: 15ch`) más el párrafo
(`max-w: 46ch`) se comen casi todo el ancho útil, así que dejar «media card
limpia» no alcanza. Lo que sí queda libre siempre es la **banda del medio**,
porque la card es `justify-between`: título arriba, párrafo abajo, y el centro
vacío. Componé el arte de las cards `medio` entre el 33 % y el 68 % del alto.

```
ancho="medio"
┌───────────────────┐
│ TÍTULO            │  ← ocupado
├───────────────────┤
│ ░░░░ arte ░░░░░░░ │  ← 33%–68%: libre
├───────────────────┤
│ párrafo           │  ← ocupado
└───────────────────┘
```

Con `columna="centro"` pasa lo mismo pero es lo único que sirve: el título cae
arriba al medio y el párrafo abajo al medio, así que el arte tiene que vivir en
la franja horizontal del centro y no subir ni bajar de ahí.

### El `fondo` de la card queda tapado

Si el asset es opaco y llena la card, `fondo` sólo se ve en los milisegundos
previos a que cargue el poster. Elegilo igual al color de fondo del asset para
que no haya un salto. `tinta` sí importa siempre: es el color del texto.

### El último cuadro es el poster

Es lo que se ve sin JS y con `prefers-reduced-motion` — en ese caso la
secuencia **no se descarga**, sólo el poster. Que el último cuadro se sostenga
solo como imagen fija.

## Varias cards a la vez

Una carpeta por card, y **todas empiezan en `0001`**. No hace falta prefijar ni
inventar nombres únicos:

```
src/media/painpoints/
  feed/          → secuencia="feed"          0001.webp … 0040.webp
  presupuesto/   → secuencia="presupuesto"   0001.webp … 0032.webp
```

No chocan: el filtro es por carpeta con barra final (así que ni `feed` y `feed2`
se pisan), Astro le pone hash de contenido y de transformación a cada archivo de
salida, y cada card lee sus propias URLs.

Si dos carpetas tuvieran cuadros byte a byte idénticos y las dos cards usaran el
mismo `ancho`, Astro los deduplica en un solo archivo. No es un problema: las
secuencias siguen siendo independientes en cantidad y orden.

## Placeholders

Las cuatro carpetas que hay hoy son placeholders generados por
`scripts/generar-secuencia-placeholder.mjs`, una receta por carpeta. Existen
para poder probar el componente sin assets reales, y cada una cubre una
combinación distinta de props:

| carpeta | tamaño | cuadros | para probar |
|---|---|---|---|
| `feed` | 1400 × 700 (2/1) | 40 | `ancho="completo"` `columna="izq"` `modo="scrub"` |
| `ruido` | 760 × 760 (1/1) | 28 | `ancho="medio"` `tinta="oscura"` sobre fondo claro |
| `tiempo` | 760 × 760 (1/1) | 28 | `columna="der"` `modo="hover"` |
| `escala` | 1400 × 600 (7/3) | 32 | `columna="centro"` + `proporcion` explícita |

```
npm run placeholder                  # sólo feed
npm run placeholder -- --todas       # las cuatro
npm run placeholder -- ruido --force # una, pisando lo que haya
```

Se ven todas juntas en `/prueba-painpoints`, que es la página banco de pruebas.
Esa página es andamiaje y **no** forma parte del sitio: se borra sola con
`rm src/pages/prueba-painpoints.astro`.

Cuando lleguen los cuadros reales de una card: vaciá su carpeta y tiralos
adentro. El script no hace falta más para esa secuencia (y se niega a pisar una
carpeta con contenido salvo que le pases `--force`). Las carpetas placeholder
que no se usen se borran enteras.

Carpeta vacía o inexistente rompe el build con un mensaje que la nombra.

## Cómo se instancia una card

Todo esto se configura desde `src/components/PainPoints.astro`, sin tocar
`PainPoint.astro`:

```astro
<PainPoint
  titulo="..."
  texto="..."
  secuencia="feed"
  eyebrow="El feed"      {/* opcional */}
  columna="izq"          {/* izq | der | centro     default: izq      */}
  modo="scrub"           {/* scrub | hover          default: scrub    */}
  fondo="#000000"
  tinta="clara"          {/* clara | oscura         default: clara    */}
  ancho="completo"       {/* completo | medio       default: completo */}
  proporcion="2/1"       {/* default: 2/1 o 1/1 segun `ancho`         */}
  scrub={{ entrada: 0.9, salida: 0.15 }}
  hover={{ duracion: 800 }}
/>
```

`scrub.entrada` / `scrub.salida` se leen así: *p=0 cuando el borde superior de
la card está al 90 % del alto del viewport; p=1 cuando llegó al 15 %*. Bajar
`salida` alarga la animación; subir `entrada` la arranca antes.

`ancho="completo"` ocupa las dos columnas de la grilla; dos cards seguidas con
`ancho="medio"` quedan una al lado de la otra.
