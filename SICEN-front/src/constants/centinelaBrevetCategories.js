import { BREVET_B_STRIP_POSITIONS } from "./data/brevetBStripPolygon.js";

/**
 * Categorías de brevets deportivos en El Centinela.
 * `infoOnly`: no pinta área; al clickear solo muestra un aviso.
 * `infoText`: Swal / popup al clickear la categoría (o su zona).
 * Categoría B: unión de círculos 15 MN (puntos 1–219).
 * Categoría C: círculo por puerto (`portPicker`); catálogo en sportPorts.js.
 */
export const CENTINELA_BREVET_CATEGORIES = [
  {
    id: "brevet-a",
    name: "Categoría A",
    positions: [],
    infoOnly: true,
    infoText:
      "La categoría A de brevet deportivo autoriza a navegar sin límite de distancia por lo que no se marcará ningún área en la interfaz del mapa.",
  },
  {
    id: "brevet-b",
    name: "Categoría B",
    color: "#67e8f9",
    borderColor: "#0891b2",
    positions: BREVET_B_STRIP_POSITIONS,
    infoText:
      "Habilitada para navegar en el Río de la Plata y una franja costera oceánica de 15 millas de ancho hasta la desembocadura del Arroyo Chuy.",
  },
  {
    id: "brevet-c",
    name: "Categoría C",
    color: "#86efac",
    borderColor: "#16a34a",
    positions: [],
    portPicker: true,
    infoText:
      "Habilitada para navegar dentro de un radio de 15 millas del Puerto de Despacho en el Río de La Plata inferior y Océano Atlántico. En el Río de La Plata superior y el Río Uruguay dicho radio será de 20'.",
  },
  {
    id: "brevet-d",
    name: "Categoría D",
    positions: [],
    infoText:
      "Habilitada para navegar dentro de un radio de 5 millas del Puerto de Despacho en el Río de La Plata y Océano Atlántico. En el Río Uruguay, Ríos y Lagunas interiores dicho radio será de 10'.",
  },
];

export const CENTINELA_BREVET_MAP_CATEGORIES =
  CENTINELA_BREVET_CATEGORIES.filter((c) => !c.infoOnly);
