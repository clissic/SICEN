export const FINE_ARTICLE_OPTIONS = [
  {
    value:
      "Artículo 44º.- CUMPLIMIENTO DE LAS DISPOSICIONES SOBRE TRANSITO VEHICULAR - 2 U.R.",
    label:
      "Artículo 44º.- CUMPLIMIENTO DE LAS DISPOSICIONES SOBRE TRANSITO VEHICULAR - 2 U.R.",
  },
  {
    value: "Artículo 45º.- VEHICULOS (LITERAL A) - 3 U.R.",
    label: "Artículo 45º.- VEHICULOS (LITERAL A) - 3 U.R.",
  },
  {
    value: "Artículo 45º.- VEHICULOS (LITERAL B) - 3 U.R.",
    label: "Artículo 45º.- VEHICULOS (LITERAL B) - 3 U.R.",
  },
  {
    value: "Artículo 45º.- VEHICULOS (LITERAL C) - 3 U.R.",
    label: "Artículo 45º.- VEHICULOS (LITERAL C) - 3 U.R.",
  },
  {
    value: "Artículo 45º.- VEHICULOS (LITERAL D) - 3 U.R.",
    label: "Artículo 45º.- VEHICULOS (LITERAL D) - 3 U.R.",
  },
  {
    value:
      "Artículo 129º.- PROHIBICION DE CIRCULACION DE VEHICULOS - 3 U.R.",
    label:
      "Artículo 129º.- PROHIBICION DE CIRCULACION DE VEHICULOS - 3 U.R.",
  },
];

/**
 * Catálogo de artículos del Decreto 100/91 aplicables a multas de buques.
 * Las descripciones son resúmenes legibles del artículo y el monto en U.R.
 */
const SHIP_FINE_ARTICLE_LABELS = [
  "Artículo 11º.- Incumplimiento del Código Internacional de Señales - 6 U.R.",
  "Artículo 12º.- Demora en el cumplimiento de una disposición (cambio de amarre, fondeadero, etc.) - 20 U.R.",
  "Artículo 13º.- Prohibiciones de fondeo (en canales o zonas restringidas) - 10 U.R.",
  "Artículo 14º.- Omisión de precauciones para fondear (riesgo de averías a otros buques) - 4 U.R.",
  "Artículo 15º.- Prohibición de amarrarse (sin autorización o en lugares no fijados) - 11 U.R.",
  "Artículo 17º.- Amarrar embarcaciones a boyas o balizas - 11 U.R.",
  "Artículo 18º.- Exceso de velocidad en dársenas (superior a 4 millas/hora) - 12 U.R.",
  "Artículo 19º, inc. a.- Velocidad máxima en canales de acceso (8 millas/hora) - 20 U.R.",
  "Artículo 19º, inc. b.- No conservar el estribor en canales - 20 U.R.",
  "Artículo 20º.- Falta de asistencia de prácticos y remolcador cuando sea obligatorio - 20 U.R.",
  "Artículo 21º.- Entrada a puerto con averías en casco, máquinas o timón sin inspección - 15 U.R.",
  "Artículo 22º.- No varar en el veril ante vía de agua no dominable en canal de acceso - 150 U.R.",
  "Artículo 23º.- Incumplimiento de maniobra de seguridad ante incendio en canal de acceso - 75 U.R.",
  "Artículo 24º.- Incumplimiento de las señales del Semáforo o medios de comunicación - 100 U.R.",
  "Artículo 27º.- Falta de vigilancia del buque o largar cabos sin permiso - 9 U.R.",
  "Artículo 28º.- Interrupción de prioridades de Privilegio de Paquete - 20 U.R.",
  "Artículo 29º.- Incumplimiento del Reglamento de Troja (exceso o mala distribución de carga) - 9 U.R.",
  "Artículo 38º.- Arrojar basura, desperdicios o materiales que ensucien el agua - 15 U.R.",
  "Artículo 39º.- Realización de alije de petróleo, limpieza o achique de sentinas sin autorización - 380 U.R.",
  "Artículo 40º.- Derrame de petróleo o sustancias oleosas (monto base) - 1000 U.R.",
  "Artículo 43º.- Utilización de embarcaciones auxiliares para transporte no autorizado - 6 U.R.",
  "Artículo 46º.- Infracción a normas de transporte de pasajeros - 4 U.R. (más 2 U.R. por cada salvavidas faltante)",
  "Artículo 47º.- Falta de dotación mínima de tripulantes - 4 U.R. (más 2 U.R. por cada tripulante de menos)",
  "Artículo 51º.- Navegar más allá del límite establecido en el certificado de navegabilidad - 6 U.R.",
  "Artículo 52º, inc. a.- Salida a la mar sin el despacho correspondiente - 20 U.R.",
  "Artículo 53º.- Uso de nombre que no corresponde a la embarcación - 50 U.R.",
  "Artículo 54º.- Navegación sin bandera o matrícula - 50 U.R.",
  "Artículo 62º.- Embarque de personal sin título o patente habilitante - 12 U.R.",
  "Artículo 64º.- Sustitución de tripulación titulada por personas sin título - 12 U.R.",
  "Artículo 68º.- Ocultación de transporte de sustancias peligrosas - 300 U.R.",
  "Artículo 70º.- Falsa declaración de sustancias peligrosas (tonelaje o ubicación) - 300 U.R.",
  "Artículo 71º, inc. a.- No tener izado el pabellón uruguayo estando atracado - 10 U.R.",
  "Artículo 83º.- Cambio de destino de la embarcación sin habilitación previa - 1000 U.R.",
  "Artículo 84º.- Navegar sin elementos de seguridad, salvamento o incendio obligatorios - 10 U.R.",
  "Artículo 93º.- Incumplimiento del servicio de escucha permanente en canal 16 - 20 U.R.",
  "Artículo 116º.- Omisión de comunicación de entrada a dique (con 30 días de antelación) - 100 U.R.",
  "Artículo 118º.- Incumplimiento de disposiciones de la Comisión Técnica de Marina Mercante - 100 U.R.",
  "Artículo 119º.- No comunicar averías o accidentes dentro de las 48 horas de arribo - 100 U.R.",
  "Artículo 120º.- Infracción a las disposiciones internacionales o nacionales sobre Líneas de Carga - 200 U.R.",
];

export const SHIP_FINE_ARTICLE_OPTIONS = SHIP_FINE_ARTICLE_LABELS.map(
  (text) => ({ value: text, label: text })
);

/**
 * Catálogo de artículos del Decreto 100/91 aplicables a multas personales
 * (infracciones individuales: zonas de baño, deportes náuticos, buceo, etc.).
 */
const PERSONAL_FINE_ARTICLE_LABELS = [
  "Artículo 128º.- Prohibición de llevar animales de cualquier naturaleza a zonas de baño - 1 U.R.",
  "Artículo 133º.- Práctica de buceo (aficionado o profesional) sin documentación habilitante - 6 U.R.",
  "Artículo 134º.- Realizar trabajos de buceo sin autorización previa de la Autoridad Marítima - 20 U.R.",
  "Artículo 135º.- Incumplimiento de precauciones y normas de seguridad en el buceo - 50 U.R.",
  "Artículo 136º.- Realización de trabajos de buceo correspondientes a categorías superiores - 6 U.R.",
  "Artículo 44º.- Incumplimiento de disposiciones sobre tránsito vehicular en jurisdicción naval - 2 U.R.",
  "Artículo 87º.- No uso de chaleco salvavidas en embarcaciones menores o tablas de windsurf - 2 U.R.",
  "Artículo 122º.- Bañarse en zonas no habilitadas, muelles o áreas con bandera de peligro - 1 U.R.",
  "Artículo 124º.- Práctica de deportes náuticos en áreas no autorizadas o distancias menores a la costa - 20 U.R.",
  "Artículo 125º.- Pesca en zonas de baño fuera de los horarios permitidos - 2 U.R.",
  "Artículo 126º.- Arrojar o abandonar comestibles o residuos en zonas balnearias - 3 U.R.",
  "Artículo 127º.- Encender fuego en zonas balnearias o arboladas de jurisdicción marítima - 5 U.R.",
  "Artículo 129º.- Circulación de vehículos automotores o de tracción a sangre en zonas de baño - 3 U.R.",
  "Artículo 130º.- Juego de pelota en zonas habilitadas para baño (fuera de áreas marcadas) - 1 U.R.",
  "Artículo 131º.- Juego de pelota en el agua - 1 U.R.",
  "Artículo 138º, inc. A.- Usuario de moto acuática/Jet-Sky menor de 15 años - 20 U.R.",
  "Artículo 138º, inc. B.- No uso de chaleco salvavidas en moto acuática - 5 U.R.",
  "Artículo 138º, inc. L.- Falta de habilitación para navegar (motos acuáticas y similares) - 15 U.R.",
];

export const PERSONAL_FINE_ARTICLE_OPTIONS = PERSONAL_FINE_ARTICLE_LABELS.map(
  (text) => ({ value: text, label: text })
);
