/**
 * SSE fan-out para posicionamiento de movimientos deportivos SICEN.
 */

const sseClients = new Set();

function str(v) {
  return String(v ?? "").trim();
}

function userUnit(user) {
  return str(user?.unit).toUpperCase();
}

function movementUnits(movement) {
  const origin = str(movement?.originUnit).toUpperCase();
  const dest = str(movement?.destinationUnit).toUpperCase();
  const transit = Array.isArray(movement?.informedUnits)
    ? movement.informedUnits.map((u) => str(u).toUpperCase()).filter(Boolean)
    : [];
  return { origin, dest, transit };
}

export function userCanViewMovementTracking(movement, user) {
  if (!movement || !user) return false;
  const unit = userUnit(user);
  if (unit) {
    const { origin, dest, transit } = movementUnits(movement);
    if (unit === origin || unit === dest || transit.includes(unit)) {
      return true;
    }
  }
  if (str(user?.role) === "skipper" && movement._skipperCanView) {
    return true;
  }
  return false;
}

function writeEvent(res, event, data) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    /* cliente desconectado */
  }
}

function broadcast(event, payload, filterFn) {
  for (const client of sseClients) {
    if (filterFn && !filterFn(client, payload)) continue;
    writeEvent(client.res, event, payload);
  }
}

export function broadcastPositionUpdate(payload) {
  broadcast("position", payload, (client, data) =>
    userCanViewMovementTracking(data.movement, client.user)
  );
}

export function broadcastTrackingState(payload) {
  broadcast("tracking_state", payload, (client, data) =>
    userCanViewMovementTracking(data.movement, client.user)
  );
}

export function broadcastTrackingAlert(payload) {
  broadcast("alert", payload, (client, data) =>
    userCanViewMovementTracking(data.movement, client.user)
  );
}

/**
 * @param {import('express').Response} res
 * @param {{ user: object, snapshot: object[] }} ctx
 * @returns {() => void}
 */
export function subscribeTrackingSse(res, { user, snapshot = [] } = {}) {
  const client = { res, user };
  sseClients.add(client);

  writeEvent(res, "status", {
    connected: true,
    clientCount: sseClients.size,
    source: "sportMovementTracking",
  });
  writeEvent(res, "snapshot", snapshot);

  return () => {
    sseClients.delete(client);
  };
}

export function getTrackingStreamStatus() {
  return {
    connected: true,
    clientCount: sseClients.size,
    source: "sportMovementTracking",
  };
}
