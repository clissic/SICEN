const DB_NAME = "sicen-sport-position-queue";
const STORE_NAME = "pending";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("movementId", "movementId", { unique: false });
        store.createIndex("clientRecordedAt", "clientRecordedAt", {
          unique: false,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * @param {string} movementId
 * @param {object} payload
 */
export async function enqueueSportPosition(movementId, payload) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add({
    movementId: String(movementId),
    payload,
    clientRecordedAt: new Date().toISOString(),
  });
  await txDone(tx);
  db.close();
}

export async function listQueuedSportPositions(movementId) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const all = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  const mid = String(movementId);
  return all
    .filter((row) => String(row.movementId) === mid)
    .sort((a, b) =>
      String(a.clientRecordedAt).localeCompare(String(b.clientRecordedAt))
    );
}

export async function removeQueuedSportPosition(id) {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  await txDone(tx);
  db.close();
}

export async function clearQueuedSportPositions(movementId) {
  const rows = await listQueuedSportPositions(movementId);
  for (const row of rows) {
    await removeQueuedSportPosition(row.id);
  }
}
