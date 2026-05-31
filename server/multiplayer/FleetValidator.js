// Fleet/ship placement validation. Pure: depends only on ship definitions.
import { SHIPS, shipDefinition } from './ships.js';

export function validateFleet(rawFleet, boardSize) {
  if (!Array.isArray(rawFleet)) return { ok: false, error: 'Fleet payload is missing.' };
  if (rawFleet.length !== SHIPS.length) return { ok: false, error: 'Place every ship before readying up.' };
  const occupied = new Set();
  const seen = new Set();
  const ships = [];
  for (const item of rawFleet) {
    const def = shipDefinition(item && item.id);
    if (!def || seen.has(def.id)) return { ok: false, error: 'Fleet contains an unknown or duplicate ship.' };
    const cells = Array.isArray(item.cells) ? item.cells.map(Number) : [];
    const orient = item.orient === 'v' ? 'v' : 'h';
    if (cells.length !== def.len) return { ok: false, error: `${def.name} has the wrong length.` };
    if (cells.some(idx => !Number.isInteger(idx) || idx < 0 || idx >= boardSize * boardSize)) {
      return { ok: false, error: `${def.name} is outside the board.` };
    }
    const rows = cells.map(idx => Math.floor(idx / boardSize));
    const cols = cells.map(idx => idx % boardSize);
    const sorted = [...cells].sort((a, b) => a - b);
    const isHorizontal = rows.every(row => row === rows[0]) && sorted.every((idx, index) => index === 0 || idx === sorted[index - 1] + 1);
    const isVertical = cols.every(col => col === cols[0]) && sorted.every((idx, index) => index === 0 || idx === sorted[index - 1] + boardSize);
    if ((orient === 'h' && !isHorizontal) || (orient === 'v' && !isVertical)) {
      return { ok: false, error: `${def.name} is not placed in a straight line.` };
    }
    for (const idx of cells) {
      if (occupied.has(idx)) return { ok: false, error: 'Ships cannot overlap.' };
      occupied.add(idx);
    }
    seen.add(def.id);
    ships.push({ ...def, orient, cells: sorted, hits: new Set(), sunk: false });
  }
  return { ok: true, board: { ships } };
}
