// Shot resolution: hit/miss/sunk and win detection. Operates on the room
// passed in (mutating the shooter's shot sets and the target's ships); it does
// not touch any shared module state.
import { sanitizeShip } from './ships.js';
import { cellCoord, opponentSlot } from './helpers.js';

export function resolveShot(room, shooterSlot, idx) {
  const shooter = room.players[shooterSlot];
  const targetSlot = opponentSlot(shooterSlot);
  const target = room.players[targetSlot];
  if (!target || !target.board) return { ok: false, error: 'Opponent is not ready.' };
  const cell = Number(idx);
  if (!Number.isInteger(cell) || cell < 0 || cell >= room.boardSize * room.boardSize) {
    return { ok: false, error: 'Shot is outside the board.' };
  }
  if (shooter.shots.has(cell)) return { ok: false, error: 'That cell has already been fired on.' };
  shooter.shots.add(cell);
  const ship = target.board.ships.find(candidate => candidate.cells.includes(cell));
  let result = 'miss';
  let sunkShip = null;
  if (ship) {
    result = 'hit';
    shooter.hits.add(cell);
    ship.hits.add(cell);
    if (ship.hits.size === ship.len) {
      ship.sunk = true;
      result = 'sunk';
      sunkShip = sanitizeShip(ship, true);
    }
  } else {
    shooter.misses.add(cell);
  }
  const won = target.board.ships.every(candidate => candidate.sunk);
  const entry = {
    turn: room.battleLog.length + 1,
    actorId: shooter.id,
    actorSlot: shooterSlot,
    actorName: shooter.displayName,
    targetId: target.id,
    targetSlot,
    idx: cell,
    coord: cellCoord(cell, room.boardSize),
    result,
    shipName: sunkShip ? sunkShip.name : ''
  };
  room.battleLog.push(entry);
  room.updatedAt = Date.now();
  return { ok: true, shooter, shooterSlot, target, targetSlot, entry, result, sunkShip, won };
}
