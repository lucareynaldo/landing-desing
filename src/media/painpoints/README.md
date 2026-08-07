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

- Los cuadros se ordenan **por nombre de archivo**. Zero-padding obligatorio.
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

### El `fondo` de la card queda tapado

Si el asset es opaco y llena la card, `fondo` sólo se ve en los milisegundos
previos a que cargue el poster. Elegilo igual al color de fondo del asset para
que no haya un salto. `tinta` sí importa siempre: es el color del texto.

### El último cuadro es el poster

Es lo que se ve sin JS y con `prefers-reduced-motion` — en ese caso la
secuencia **no se descarga**, sólo el poster. Que el último cuadro se sostenga
solo como imagen fija.

## Placeholder

`feed/` tiene hoy una secuencia generada por
`scripts/generar-secuencia-placeholder.mjs`. Vaciá la carpeta y tirá los
cuadros reales adentro; el script no hace falta más (y se niega a pisar una
carpeta con contenido salvo que le pases `--force`).

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
