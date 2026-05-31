// Pure input-normalization and coordinate helpers. No shared mutable state.

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function cellCoord(idx, size) {
  return String.fromCharCode(65 + (idx % size)) + (Math.floor(idx / size) + 1);
}

export function opponentSlot(slot) {
  return slot === 0 ? 1 : 0;
}

export function normalizeRoomCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return code.length === 6 && [...code].every(char => ROOM_CODE_ALPHABET.includes(char)) ? code : '';
}

export function roomUrl(code) {
  return `/room/${code}`;
}

export function cleanName(value) {
  const name = String(value || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  return name || 'Captain';
}

export function normalizeBoardSize(value) {
  const size = Number(value);
  return [8, 10, 12].includes(size) ? size : 8;
}

export function normalizeClientId(payload) {
  const id = String(payload && payload.clientId || '').trim().slice(0, 80);
  return id || '';
}

export function normalizeToken(payload) {
  const token = String(payload && payload.token || '').trim().slice(0, 80);
  return token || '';
}

export function playerTokenMatches(player, payload) {
  return !!player && !!player.token && normalizeToken(payload) === player.token;
}
