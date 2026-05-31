// Lightweight input validation helpers for Express routes.
//
// The Socket.IO layer already validates its own payloads inside
// server/multiplayer.js (normalizeRoomCode, cleanName, normalizeBoardSize,
// validateFleet, resolveShot, plus per-event phase/turn checks and rate
// limiting). These helpers cover the remaining HTTP route inputs.
import { listTiers } from './tier-configs.js';

// True only for an exact, known tier name. Guards against unknown values and
// dangerous object keys like "__proto__" / "constructor" (which are not own
// enumerable keys returned by listTiers()).
export function isKnownTier(value) {
  return typeof value === 'string' && listTiers().includes(value);
}
