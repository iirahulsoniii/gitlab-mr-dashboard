/**
 * Persistent Server-Side Storage Client
 * Connects frontend state directly to local disk persistence (via db-backend/data/dashboard_storage.json).
 * Automatically handles offline fallback and debounced disk synchronization.
 */

let saveDebounceTimer = null;
let pendingSavePayload = {};

/**
 * Fetch all persistent data stored on local disk.
 * Returns null if backend is offline.
 */
export async function fetchServerStorage() {
  try {
    const res = await fetch('/db-api/storage', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      return data && typeof data === 'object' ? data : {};
    }
  } catch (err) {
    console.warn('[Storage] Backend persistence not reachable, using localStorage fallback:', err);
  }
  return null;
}

/**
 * Immediately save/update data keys to local disk.
 */
export async function saveServerStorage(payload) {
  if (!payload || typeof payload !== 'object') return false;

  try {
    const res = await fetch('/db-api/storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return true;
    }
  } catch (err) {
    console.warn('[Storage] Auto-save to disk failed (backend may be restarting):', err);
  }
  return false;
}

/**
 * Debounced save to avoid excessive disk I/O when user is typing or making multiple changes.
 */
export function debouncedSaveServerStorage(payload, delayMs = 600) {
  pendingSavePayload = { ...pendingSavePayload, ...payload };

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(() => {
    const toSave = { ...pendingSavePayload };
    pendingSavePayload = {};
    saveServerStorage(toSave);
  }, delayMs);
}
