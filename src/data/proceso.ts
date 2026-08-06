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
