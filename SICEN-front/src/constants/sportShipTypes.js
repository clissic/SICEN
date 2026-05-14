/**
 * Tipos de embarcación deportiva (desplegable si vesselType = Deportivo).
 */
const RAW_SPORT_SHIP_TYPES = `
Aliscafo deportivo (Sport Hydrofoil)
Balsa deportiva (Recreational Raft)
Bote inflable (Inflatable Boat)
Bote semirrígido (Rigid Inflatable Boat - RIB)
Bowrider (Bowrider)
Canoa (Canoe)
Casa flotante (Houseboat)
Catamarán a vela (Sailing Catamaran)
Catamarán deportivo (Sport Catamaran)
Dinghy (Dinghy)
Drakkar recreativo (Recreational Longboat Replica)
Embarcación anfibia recreativa (Recreational Amphibious Craft)
Embarcación de esquí acuático (Water Ski Boat)
Embarcación de wakeboard (Wakeboard Boat)
Embarcación de wakesurf (Wakesurf Boat)
Embarcación foil eléctrica (Electric Foil Boat)
Embarcación offshore (Offshore Powerboat)
Goleta deportiva (Recreational Schooner)
Gomon (Inflatable Dinghy)
Hovercraft recreativo (Recreational Hovercraft)
Jet boat (Jet Boat)
Jet ski (Personal Watercraft - PWC)
Kayak (Kayak)
Lancha cabinada (Cabin Cruiser)
Lancha crucero (Cruiser Boat)
Lancha deportiva (Speedboat)
Lancha open (Open Boat)
Lancha rápida (Fast Boat)
Lancha rígida (Hard Boat)
Lancha Zodiac (Zodiac Boat)
Mini submarino recreativo (Recreational Mini Submarine)
Motovelero (Motorsailer)
Multicasco deportivo (Sport Multihull)
Optimist (Optimist Dinghy)
Paddleboard (Stand Up Paddle Board - SUP)
Pedalón (Pedal Boat)
Pesquero deportivo (Sport Fishing Boat)
Pontón recreativo (Pontoon Boat)
Racer offshore (Offshore Racing Boat)
Regatero (Racing Sailboat)
Remero olímpico (Olympic Rowing Shell)
Runabout (Runabout Boat)
Superyate (Superyacht)
Tabla a vela (Windsurf Board)
Trimarán deportivo (Sport Trimaran)
Velero (Sailboat)
Velero de crucero (Cruising Sailboat)
Velero de regata (Racing Sailboat)
Velero escuela (Training Sailboat)
Velero oceánico (Ocean-going Sailboat)
Velero trailerable (Trailer Sailer)
Yate (Yacht)
Yate a motor (Motor Yacht)
Yate de expedición (Expedition Yacht)
Yate de lujo (Luxury Yacht)
Yate explorer (Explorer Yacht)
Yate flybridge (Flybridge Yacht)
Yate sport (Sport Yacht)
Yawl (Yawl Sailboat)
Zodiac (Zodiac Inflatable Boat)
Otro
`;

function parseLines(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

export const SPORT_SHIP_TYPE_OPTIONS = parseLines(RAW_SPORT_SHIP_TYPES);
