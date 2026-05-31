import test from 'node:test';
import assert from 'node:assert/strict';
import { __testing } from '../server/multiplayer.js';

const {
  normalizeRoomCode,
  cleanName,
  normalizeBoardSize,
  cellCoord,
  opponentSlot,
  shipDefinition,
  validateFleet,
  resolveShot
} = __testing;

// A valid 8x8 fleet (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2).
const VALID_FLEET = [
  { id: 0, orient: 'h', cells: [0, 1, 2, 3, 4] },
  { id: 1, orient: 'h', cells: [8, 9, 10, 11] },
  { id: 2, orient: 'h', cells: [16, 17, 18] },
  { id: 3, orient: 'h', cells: [24, 25, 26] },
  { id: 4, orient: 'h', cells: [32, 33] }
];
const ALL_SHIP_CELLS = VALID_FLEET.flatMap(ship => ship.cells);

function makeBattleRoom() {
  const targetBoard = validateFleet(VALID_FLEET, 8).board;
  return {
    code: 'TEST01',
    boardSize: 8,
    battleLog: [],
    players: [
      { id: 'p0', displayName: 'A', shots: new Set(), hits: new Set(), misses: new Set(), board: null },
      { id: 'p1', displayName: 'B', shots: new Set(), hits: new Set(), misses: new Set(), board: targetBoard }
    ]
  };
}

test('normalizeRoomCode uppercases valid codes and rejects invalid ones', () => {
  assert.equal(normalizeRoomCode('abcdef'), 'ABCDEF');
  assert.equal(normalizeRoomCode('  abcdef  '), 'ABCDEF');
  assert.equal(normalizeRoomCode('abc'), '', 'too short');
  assert.equal(normalizeRoomCode('ABCDEI'), '', 'contains excluded letter I');
  assert.equal(normalizeRoomCode(null), '');
});

test('cleanName sanitizes display names', () => {
  assert.equal(cleanName('Smoke A!!'), 'SmokeA');
  assert.equal(cleanName('verylongname123'), 'verylong', 'capped at 8 chars');
  assert.equal(cleanName('<script>'), 'script', 'HTML stripped');
  assert.equal(cleanName(''), 'Captain', 'fallback when empty');
});

test('normalizeBoardSize only allows 8, 10, 12', () => {
  assert.equal(normalizeBoardSize(8), 8);
  assert.equal(normalizeBoardSize('12'), 12);
  assert.equal(normalizeBoardSize(7), 8, 'invalid size falls back to 8');
  assert.equal(normalizeBoardSize(undefined), 8);
});

test('cellCoord maps board indices to coordinates', () => {
  assert.equal(cellCoord(0, 8), 'A1');
  assert.equal(cellCoord(7, 8), 'H1');
  assert.equal(cellCoord(8, 8), 'A2');
});

test('opponentSlot flips between the two slots', () => {
  assert.equal(opponentSlot(0), 1);
  assert.equal(opponentSlot(1), 0);
});

test('shipDefinition returns ship metadata by id', () => {
  assert.equal(shipDefinition(0).len, 5, 'Carrier length');
  assert.equal(shipDefinition(4).len, 2, 'Destroyer length');
  assert.equal(shipDefinition(99), undefined, 'unknown id');
});

test('validateFleet accepts a well-formed fleet', () => {
  const result = validateFleet(VALID_FLEET, 8);
  assert.equal(result.ok, true);
  assert.equal(result.board.ships.length, 5);
});

test('validateFleet rejects malformed fleets', () => {
  assert.equal(validateFleet(null, 8).ok, false, 'missing payload');
  assert.equal(validateFleet(VALID_FLEET.slice(0, 4), 8).ok, false, 'missing a ship');

  const overlap = VALID_FLEET.map(ship => ({ ...ship }));
  overlap[1] = { id: 1, orient: 'h', cells: [4, 5, 6, 7] }; // shares cell 4 with the Carrier
  assert.equal(validateFleet(overlap, 8).ok, false, 'overlapping ships');

  const offBoard = VALID_FLEET.map(ship => ({ ...ship }));
  offBoard[4] = { id: 4, orient: 'h', cells: [63, 64] }; // 64 is off an 8x8 board
  assert.equal(validateFleet(offBoard, 8).ok, false, 'ship off the board');

  const wrongLength = VALID_FLEET.map(ship => ({ ...ship }));
  wrongLength[4] = { id: 4, orient: 'h', cells: [40, 41, 42] }; // Destroyer must be length 2
  assert.equal(validateFleet(wrongLength, 8).ok, false, 'wrong ship length');

  const notStraight = VALID_FLEET.map(ship => ({ ...ship }));
  notStraight[2] = { id: 2, orient: 'h', cells: [16, 17, 25] }; // not contiguous/straight
  assert.equal(validateFleet(notStraight, 8).ok, false, 'ship not in a straight line');
});

test('resolveShot reports miss, hit, sunk, and win', () => {
  const room = makeBattleRoom();

  const miss = resolveShot(room, 0, 63); // empty cell
  assert.equal(miss.ok, true);
  assert.equal(miss.result, 'miss');
  assert.equal(miss.won, false);

  const hit = resolveShot(room, 0, 0); // Carrier cell
  assert.equal(hit.result, 'hit');

  resolveShot(room, 0, 32); // Destroyer cell 1
  const sunk = resolveShot(room, 0, 33); // Destroyer cell 2 -> sinks it
  assert.equal(sunk.result, 'sunk');
  assert.equal(sunk.sunkShip.name, 'Destroyer');
});

test('resolveShot rejects duplicate and out-of-board shots', () => {
  const room = makeBattleRoom();
  resolveShot(room, 0, 0);
  assert.equal(resolveShot(room, 0, 0).ok, false, 'duplicate cell');
  assert.equal(resolveShot(room, 0, 999).ok, false, 'out of board');
});

test('resolveShot detects a full win when every ship is sunk', () => {
  const room = makeBattleRoom();
  let lastResult;
  for (const cell of ALL_SHIP_CELLS) {
    lastResult = resolveShot(room, 0, cell);
    assert.equal(lastResult.ok, true);
  }
  assert.equal(lastResult.won, true, 'sinking every ship should win');
  assert.equal(lastResult.result, 'sunk');
});
