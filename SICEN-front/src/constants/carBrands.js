/** Valor especial para "Otra" — el usuario aclara la marca en el campo Modelo. */
export const OTHER_CAR_BRAND = "Otra";

/** Catálogo de marcas de vehículos terrestres disponibles en plaza. */
export const CAR_BRANDS = Object.freeze([
  "Audi",
  "Avatr",
  "BAIC",
  "BAW",
  "BMW",
  "BYD",
  "Changan",
  "Chery",
  "Chevrolet",
  "Citroën",
  "CUPRA",
  "Deepal",
  "Denza",
  "DFSK",
  "Dongfeng",
  "DS Automobiles",
  "Fangchengbao",
  "Ferrari",
  "Fiat",
  "Ford",
  "Foton",
  "GAC Aion",
  "Geely",
  "GWM",
  "Honda",
  "Hongqi",
  "Hyundai",
  "Isuzu",
  "JAC Motors",
  "Jaecoo",
  "Jaguar",
  "Jeep",
  "Jetour",
  "JMC",
  "KGM",
  "Kia",
  "Land Rover",
  "Leapmotor",
  "Lexus",
  "Li Auto",
  "Lifan",
  "Maserati",
  "Maxus",
  "Mazda",
  "Mercedes-Benz",
  "MG Motor",
  "MINI",
  "Mitsubishi",
  "Nio",
  "Nissan",
  "Omoda",
  "Peugeot",
  "Porsche",
  "RAM",
  "Renault",
  "Riddara",
  "SEAT",
  "SsangYong",
  "Subaru",
  "Suzuki",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Voyah",
  "Xpeng",
  "Yangwang",
  "Zeekr",
]);

/**
 * Normaliza texto para búsqueda: elimina diacríticos y pasa a minúsculas.
 * Útil para que "citroen" matchee "Citroën".
 */
export function normalizeForSearch(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
