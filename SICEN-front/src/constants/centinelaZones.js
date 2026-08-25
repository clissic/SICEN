/**
 * Zonas operativas de El Centinela (polígonos [lat, lon] WGS84).
 * El orden de vértices debe recorrer el borde sin cruzarse.
 */
export const CENTINELA_ZONES = [
  {
    id: "zona-alijo-alfa",
    name: 'Zona de Alijo "Alfa"',
    color: "#c4b5fd",
    borderColor: "#8b5cf6",
    positions: [
      [-35.108333, -55.616667],
      [-35.108333, -55.75],
      [-35.158333, -55.75],
      [-35.158333, -55.616667],
    ],
  },
  {
    id: "zona-alijo-delta",
    name: 'Zona de Alijo "Delta"',
    color: "#c4b5fd",
    borderColor: "#8b5cf6",
    positions: [
      [-35.066667, -55.183333],
      [-35.066667, -55.266667],
      [-35.1, -55.266667],
      [-35.1, -55.183333],
    ],
  },
  {
    id: "zona-fondeo-servicios",
    name: "Zona de Fondeo y Servicios",
    color: "#c4b5fd",
    borderColor: "#8b5cf6",
    positions: [
      [-35.031944, -56.067222],
      [-35.045833, -55.984444],
      [-35.054167, -55.984444],
      [-35.081944, -56.067222],
    ],
  },
  {
    id: "zona-espera-fondeo-oeste",
    name: "Zona de Espera y Fondeo Oeste",
    color: "#c4b5fd",
    borderColor: "#8b5cf6",
    positions: [
      [-35.175, -55.6],
      [-35.175, -55.428333],
      [-35.275, -55.428333],
      [-35.275, -55.6],
    ],
  },
  {
    id: "zona-espera-fondeo-este",
    name: "Zona de Espera y Fondeo Este",
    color: "#c4b5fd",
    borderColor: "#8b5cf6",
    positions: [
      [-35.118333, -55.366667],
      [-35.118333, -55.168333],
      [-35.201667, -55.283333],
      [-35.201667, -55.366667],
    ],
  },
  {
    id: "zona-sts-hidrocarburos",
    name: "Zona de Transferencia de Hidrocarburos (STS)",
    color: "#c4b5fd",
    borderColor: "#8b5cf6",
    positions: [
      [-35.058333, -54.283333],
      [-34.891667, -53.783333],
      [-35.016667, -53.816667],
      [-35.116667, -53.833333],
      [-35.183333, -54.283333],
    ],
  },
];
