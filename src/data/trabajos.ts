// Fuente unica de los trabajos. La consumen el carrusel del hero, la vista
// detalle y (mas adelante) la pagina de portfolio.
//
// `tono` es el placeholder hasta que el disenador entregue los assets. Cuando
// lleguen se agrega `media` y el resto del codigo no cambia: los componentes
// ya preguntan por `media ?? tono`.

export interface Trabajo {
  slug: string;
  cliente: string;
  titulo: string;
  categoria: string;
  descripcion: string;
  anio: string;
  servicios: string[];
  /** Color placeholder. Se va cuando exista `media`. */
  tono: string;
  /** Ruta al asset. Hoy placeholder; lo reemplaza el del disenador. */
  media?: string;
  /** Proporcion en la grilla del portfolio. El hero fuerza 16/10 igual
   *  para todos, pero la masonry necesita variacion para tener sentido. */
  aspecto: string;
}

export const TRABAJOS: Trabajo[] = [
  {
    slug: "cafe-mora",
    cliente: "Café Mora",
    titulo: "Una tostaduría que dejó de parecer cinco",
    categoria: "Identidad",
    descripcion:
      "Tenían tres logos conviviendo y ninguno ganaba. Definimos una marca, una paleta corta y un sistema de etiquetas que escala a toda la línea sin rediseñar nada.",
    anio: "2026",
    servicios: ["Identidad", "Packaging", "Editorial"],
    tono: "#e7e7e7",
    media: "/placeholders/cafe-mora.jpg",
    aspecto: "4/5",
  },
  {
    slug: "lume",
    cliente: "Lume",
    titulo: "Packaging que se lee a tres metros",
    categoria: "Packaging",
    descripcion:
      "El producto competía en góndola contra marcas con diez veces su presupuesto. Resolvimos por contraste y jerarquía, no por ruido.",
    anio: "2026",
    servicios: ["Packaging", "Dirección de arte"],
    tono: "#282828",
    media: "/placeholders/lume.jpg",
    aspecto: "1/1",
  },
  {
    slug: "estudio-vera",
    cliente: "Estudio Vera",
    titulo: "Un feed que por fin parece de una sola marca",
    categoria: "Redes",
    descripcion:
      "Publicaban seguido y bien, pero cada pieza salía de una plantilla distinta. Armamos una retícula y cuatro formatos fijos.",
    anio: "2025",
    servicios: ["Redes sociales", "Sistemas de diseño"],
    tono: "#8800ff",
    media: "/placeholders/estudio-vera.jpg",
    aspecto: "4/5",
  },
  {
    slug: "norte",
    cliente: "Norte",
    titulo: "Marca de una constructora que no quería parecer una",
    categoria: "Identidad",
    descripcion:
      "Rubro saturado de azules y grises. Fuimos por una tipografía con carácter y una paleta cálida que nadie más estaba usando.",
    anio: "2025",
    servicios: ["Identidad", "Web"],
    tono: "#f4f4f4",
    media: "/placeholders/norte.jpg",
    aspecto: "16/10",
  },
  {
    slug: "rama",
    cliente: "Rama",
    titulo: "Editorial independiente, sistema de colección",
    categoria: "Editorial",
    descripcion:
      "Doce títulos que tenían que verse de la misma familia sin repetirse. Una grilla, una tipografía y un color por año.",
    anio: "2025",
    servicios: ["Editorial", "Dirección de arte"],
    tono: "#444444",
    media: "/placeholders/rama.jpg",
    aspecto: "3/4",
  },
  {
    slug: "solaz",
    cliente: "Solaz",
    titulo: "Rebrand sin tirar a la basura lo que ya funcionaba",
    categoria: "Rebrand",
    descripcion:
      "Tenían reconocimiento en su ciudad. El trabajo fue depurar, no reemplazar: misma silueta, todo lo demás ordenado.",
    anio: "2025",
    servicios: ["Identidad", "Sistemas de diseño"],
    tono: "#ff5000",
    media: "/placeholders/solaz.jpg",
    aspecto: "1/1",
  },
  {
    slug: "ancla",
    cliente: "Ancla",
    titulo: "Design system para un equipo de tres",
    categoria: "Sistema",
    descripcion:
      "No necesitaban cien componentes: necesitaban veinte bien definidos y una regla clara de cuándo usar cada uno.",
    anio: "2025",
    servicios: ["Sistemas de diseño", "UX/UI"],
    tono: "#e7e7e7",
    media: "/placeholders/ancla.jpg",
    aspecto: "16/10",
  },
  {
    slug: "bruma",
    cliente: "Bruma",
    titulo: "Campaña de lanzamiento en seis formatos",
    categoria: "Campaña",
    descripcion:
      "De la vía pública al story vertical sin que ninguna pieza pareciera un recorte de otra.",
    anio: "2025",
    servicios: ["Dirección de arte", "Redes sociales"],
    tono: "#282828",
    media: "/placeholders/bruma.jpg",
    aspecto: "4/5",
  },
  {
    slug: "tinta",
    cliente: "Tinta",
    titulo: "Identidad para un estudio de tatuajes",
    categoria: "Identidad",
    descripcion:
      "El desafío era no caer en el cliché del rubro. Salimos por el lado tipográfico y funcionó.",
    anio: "2024",
    servicios: ["Identidad", "Redes sociales"],
    tono: "#f4f4f4",
    media: "/placeholders/tinta.jpg",
    aspecto: "3/4",
  },
  {
    slug: "ruta",
    cliente: "Ruta",
    titulo: "Señalética para un parque de 40 hectáreas",
    categoria: "Señalética",
    descripcion:
      "Un sistema que tiene que leerse caminando, en bici y desde un auto. Tres jerarquías, un solo lenguaje.",
    anio: "2024",
    servicios: ["Señalética", "Sistemas de diseño"],
    tono: "#8800ff",
    media: "/placeholders/ruta.jpg",
    aspecto: "16/10",
  },
  {
    slug: "pauna",
    cliente: "Pauna",
    titulo: "Marca de cosmética sin el rosa de siempre",
    categoria: "Identidad",
    descripcion:
      "Querían hablarle a un público que ya estaba cansado del lenguaje del rubro. Bajamos el volumen y subimos la precisión.",
    anio: "2024",
    servicios: ["Identidad", "Packaging"],
    tono: "#444444",
    media: "/placeholders/pauna.jpg",
    aspecto: "1/1",
  },
  {
    slug: "cardume",
    cliente: "Cardume",
    titulo: "Sitio que carga rápido y se ve caro",
    categoria: "Web",
    descripcion:
      "No hay contradicción entre las dos cosas: hay decisiones de peso de imagen y de tipografía que se toman temprano.",
    anio: "2024",
    servicios: ["Web", "UX/UI"],
    tono: "#f4f4f4",
    media: "/placeholders/cardume.jpg",
    aspecto: "16/10",
  },
  {
    slug: "sal",
    cliente: "Sal",
    titulo: "Packaging de una línea que creció a doce SKU",
    categoria: "Packaging",
    descripcion:
      "El sistema original aguantaba cuatro productos. Lo rehicimos para que aguante los que vengan.",
    anio: "2024",
    servicios: ["Packaging", "Sistemas de diseño"],
    tono: "#ff5000",
    media: "/placeholders/sal.jpg",
    aspecto: "4/5",
  },
  {
    slug: "vidrio",
    cliente: "Vidrio",
    titulo: "Identidad para una galería de arte",
    categoria: "Identidad",
    descripcion:
      "La marca tenía que desaparecer detrás de las obras y aparecer solo cuando hacía falta. Ese es todo el trabajo.",
    anio: "2024",
    servicios: ["Identidad", "Editorial"],
    tono: "#e7e7e7",
    media: "/placeholders/vidrio.jpg",
    aspecto: "3/4",
  },
  {
    slug: "once",
    cliente: "Once",
    titulo: "Revista trimestral, cuatro números al año",
    categoria: "Editorial",
    descripcion:
      "Una grilla que soporta desde una nota de dos páginas hasta un ensayo fotográfico de veinte.",
    anio: "2023",
    servicios: ["Editorial", "Dirección de arte"],
    tono: "#282828",
    media: "/placeholders/once.jpg",
    aspecto: "1/1",
  },
];

/** Reparte los trabajos en las tres filas del marquee del hero. */
export function filasDelHero(): Trabajo[][] {
  const filas: Trabajo[][] = [[], [], []];
  TRABAJOS.forEach((t, i) => filas[i % 3].push(t));
  return filas;
}
