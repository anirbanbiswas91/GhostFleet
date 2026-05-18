import { randomBytes } from 'node:crypto';
import { Server } from 'socket.io';

const SHIPS = [
  { id: 0, name: 'Carrier', short: 'CV', cls: 'cv', len: 5 },
  { id: 1, name: 'Battleship', short: 'BB', cls: 'bb', len: 4 },
  { id: 2, name: 'Cruiser', short: 'CA', cls: 'ca', len: 3 },
  { id: 3, name: 'Submarine', short: 'SS', cls: 'ss', len: 3 },
  { id: 4, name: 'Destroyer', short: 'DD', cls: 'dd', len: 2 }
];

const ROOM_TTL_MS = 30 * 60 * 1000;
const DISCONNECT_GRACE_MS = 90 * 1000;
const ENDED_ROOM_GRACE_MS = 60 * 1000;
const EXPIRED_ROOM_TTL_MS = 10 * 60 * 1000;
const TURN_TIMEOUT_MS = positiveIntEnv('GHOSTFLEET_TURN_TIMEOUT_MS', 120 * 1000);
const TIMEOUT_FORFEIT_LIMIT = 3;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PHASES = new Set(['waiting', 'placing', 'battle', 'ended']);
const rooms = new Map();
const expiredRooms = new Map();

function positiveIntEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function makeRoomCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Unable to allocate room code');
}

function normalizeRoomCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return code.length === 6 && [...code].every(char => ROOM_CODE_ALPHABET.includes(char)) ? code : '';
}

function roomUrl(code) {
  return `/room/${code}`;
}

function tombstoneRoom(code, reason = 'expired') {
  if (!code) return;
  expiredRooms.set(code, { reason, expiresAt: Date.now() + EXPIRED_ROOM_TTL_MS });
}

function roomExpired(code) {
  const entry = expiredRooms.get(code);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) {
    expiredRooms.delete(code);
    return false;
  }
  return true;
}

function makeId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

function cleanName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 18);
  return name || 'Captain';
}

function normalizeBoardSize(value) {
  const size = Number(value);
  return [8, 10, 12].includes(size) ? size : 8;
}

function normalizeClientId(payload) {
  const id = String(payload && payload.clientId || '').trim().slice(0, 80);
  return id || '';
}

function shipDefinition(id) {
  return SHIPS.find(ship => ship.id === Number(id));
}

function cellCoord(idx, size) {
  return String.fromCharCode(65 + (idx % size)) + (Math.floor(idx / size) + 1);
}

function opponentSlot(slot) {
  return slot === 0 ? 1 : 0;
}

function connectedPlayers(room) {
  return room.players.filter(Boolean);
}

function activeSlots(room) {
  return room.players.map((player, slot) => (player ? slot : -1)).filter(slot => slot >= 0);
}

function publicPlayer(player, slot) {
  if (!player) {
    return {
      id: null,
      playerIndex: slot,
      displayName: `Player ${slot + 1}`,
      connected: false,
      lobbyReady: false,
      placementDone: false,
      rematchRequested: false,
      fleetReady: false,
      shots: [],
      hits: [],
      misses: [],
      sunkCount: 0,
      timeoutStreak: 0
    };
  }
  return {
    id: player.id,
    playerIndex: slot,
    displayName: player.displayName,
    connected: player.connected,
    lobbyReady: player.placementDone,
    placementDone: player.placementDone,
    rematchRequested: player.rematchRequested,
    fleetReady: !!player.board,
    shots: Array.from(player.shots),
    hits: Array.from(player.hits),
    misses: Array.from(player.misses),
    sunkCount: player.board ? player.board.ships.filter(ship => ship.sunk).length : 0,
    timeoutStreak: player.timeoutStreak || 0
  };
}

function sanitizeShip(ship, revealCells = false) {
  return {
    id: ship.id,
    name: ship.name,
    short: ship.short,
    cls: ship.cls,
    len: ship.len,
    orient: ship.orient,
    sunk: ship.sunk,
    cells: revealCells ? [...ship.cells] : [],
    hits: [...ship.hits]
  };
}

function sanitizeBoardForOwner(player) {
  if (!player || !player.board) return { ships: [], shots: [], hits: [], misses: [] };
  return {
    ships: player.board.ships.map(ship => sanitizeShip(ship, true)),
    shots: Array.from(player.shots),
    hits: Array.from(player.hits),
    misses: Array.from(player.misses)
  };
}

function sanitizeBoardForOpponent(player, room) {
  if (!player || !player.board) return { ships: [], shots: [], hits: [], misses: [] };
  const revealAll = room.phase === 'ended';
  return {
    ships: player.board.ships
      .filter(ship => revealAll || ship.sunk)
      .map(ship => sanitizeShip(ship, true)),
    shots: Array.from(player.shots),
    hits: Array.from(player.hits),
    misses: Array.from(player.misses)
  };
}

function playerSnapshot(room, slot) {
  const viewer = room.players[slot] || null;
  const otherSlot = opponentSlot(slot);
  const opponent = room.players[otherSlot] || null;
  const winner = room.winnerSlot !== null && room.winnerSlot !== undefined ? room.players[room.winnerSlot] : null;
  const youBoard = sanitizeBoardForOwner(viewer);
  const opponentBoard = sanitizeBoardForOpponent(opponent, room);
  return {
    code: room.code,
    roomId: room.code,
    roomUrl: roomUrl(room.code),
    phase: room.phase,
    boardSize: room.boardSize,
    gridSize: room.boardSize,
    turn: room.turn !== null && room.players[room.turn] ? room.players[room.turn].id : null,
    turnSlot: room.turn,
    turnDeadlineAt: room.turnDeadlineAt || null,
    turnDurationMs: TURN_TIMEOUT_MS,
    winner: winner ? winner.id : null,
    winnerSlot: room.winnerSlot,
    winnerId: room.winnerSlot,
    winnerName: winner ? winner.displayName : '',
    reason: room.endReason || '',
    endReason: room.endReason || '',
    consecutiveTimeouts: viewer ? viewer.timeoutStreak || 0 : 0,
    playerIndex: slot,
    opponentName: opponent ? opponent.displayName : '',
    yourBoard: youBoard,
    opponentBoard,
    you: viewer ? {
      ...publicPlayer(viewer, slot),
      ships: youBoard.ships
    } : null,
    opponent: opponent ? {
      ...publicPlayer(opponent, otherSlot),
      ships: opponentBoard.ships
    } : null,
    players: room.players.map((player, index) => publicPlayer(player, index)),
    battleLog: room.battleLog.slice(-50)
  };
}

function emitToSlot(room, slot, event, payload = {}) {
  const player = room.players[slot];
  if (!player || !player.socketId) return false;
  room.io.to(player.socketId).emit(event, payload);
  return true;
}

function emitSnapshotToSlot(room, slot, event = 'room:update') {
  return emitToSlot(room, slot, event, playerSnapshot(room, slot));
}

function emitRoom(room, event = 'room:update') {
  activeSlots(room).forEach(slot => emitSnapshotToSlot(room, slot, event));
}

function emitResync(room, slot) {
  emitSnapshotToSlot(room, slot, 'resync');
}

function emitResyncToRoom(room) {
  activeSlots(room).forEach(slot => emitResync(room, slot));
}

function fail(socket, message, code = 'invalid_request') {
  socket.emit('error:message', { code, message });
}

function validateFleet(rawFleet, boardSize) {
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

function createPlayer(socket, slot, clientId, displayName, token = '') {
  return {
    id: makeId('p'),
    token: token || makeId('tok'),
    clientId,
    slot,
    socketId: socket.id,
    displayName: cleanName(displayName),
    connected: true,
    placementDone: false,
    rematchRequested: false,
    board: null,
    shots: new Set(),
    hits: new Set(),
    misses: new Set(),
    timeoutStreak: 0
  };
}

function bindSocketToPlayer(room, socket, slot) {
  const player = room.players[slot];
  if (!player) return null;
  const wasDisconnected = !player.connected;
  player.socketId = socket.id;
  player.connected = true;
  if (room.clientMap) {
    room.clientMap[player.clientId] = { slot, socketId: socket.id, name: player.displayName };
  }
  socket.data.roomCode = room.code;
  socket.data.playerIndex = slot;
  socket.data.clientId = player.clientId;
  socket.join(room.code);
  clearDisconnectTimer(room, slot);
  if (wasDisconnected) {
    emitToSlot(room, opponentSlot(slot), 'opponent_reconnected', {
      playerIndex: slot,
      name: player.displayName,
      msg: `${player.displayName} reconnected.`
    });
  }
  if (room.turnTimerPaused && room.turn === slot) {
    scheduleTurnTimer(room, room.pausedTurnRemainingMs || TURN_TIMEOUT_MS);
  }
  return player;
}

function findSlotByClientId(room, clientId) {
  return room.players.findIndex(player => player && player.clientId === clientId);
}

function findSlotBySocket(room, socket) {
  const slot = Number(socket.data.playerIndex);
  if (Number.isInteger(slot) && slot >= 0 && slot <= 1) {
    const player = room.players[slot];
    if (player && player.socketId === socket.id) return slot;
  }
  return room.players.findIndex(player => player && player.socketId === socket.id);
}

function findRoomAndSlot(socket, payload = {}) {
  const code = normalizeRoomCode(payload.roomId || payload.code || socket.data.roomCode || '');
  const room = rooms.get(code);
  if (!room) return { room: null, slot: -1 };
  let slot = findSlotBySocket(room, socket);
  if (slot < 0) {
    const clientId = normalizeClientId(payload) || socket.data.clientId || '';
    slot = findSlotByClientId(room, clientId);
    if (slot >= 0) bindSocketToPlayer(room, socket, slot);
  }
  return { room, slot };
}

function addPlayerToSlot(room, socket, slot, clientId, displayName) {
  const player = createPlayer(socket, slot, clientId, displayName);
  room.players[slot] = player;
  if (room.clientMap) {
    room.clientMap[clientId] = { slot, socketId: socket.id, name: player.displayName };
  }
  bindSocketToPlayer(room, socket, slot);
  return player;
}

function clearDisconnectTimer(room, slot) {
  if (room.disconnectTimers[slot]) {
    clearTimeout(room.disconnectTimers[slot]);
    room.disconnectTimers[slot] = null;
  }
}

function clearTurnTimer(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  room.turnDeadlineAt = null;
}

function scheduleEndedCleanup(room) {
  if (room.endCleanupTimer) clearTimeout(room.endCleanupTimer);
  room.endCleanupTimer = setTimeout(() => {
    const current = rooms.get(room.code);
    if (current && current.phase === 'ended') {
      tombstoneRoom(room.code, current.endReason || 'ended');
      rooms.delete(room.code);
    }
  }, ENDED_ROOM_GRACE_MS);
  room.endCleanupTimer.unref?.();
}

function scheduleTurnTimer(room, durationMs = TURN_TIMEOUT_MS) {
  clearTurnTimer(room);
  if (room.phase !== 'battle' || (room.turn !== 0 && room.turn !== 1)) return;
  room.turnTimerPaused = false;
  room.pausedTurnRemainingMs = null;
  room.turnDeadlineAt = Date.now() + durationMs;
  room.turnTimer = setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current || current.phase !== 'battle') return;
    const previousTurn = current.turn;
    const timedOutPlayer = current.players[previousTurn];
    if (timedOutPlayer) timedOutPlayer.timeoutStreak = (timedOutPlayer.timeoutStreak || 0) + 1;
    const nextTurn = opponentSlot(previousTurn);
    if (current.players[nextTurn]) current.players[nextTurn].timeoutStreak = 0;
    current.updatedAt = Date.now();
    if ((timedOutPlayer && timedOutPlayer.timeoutStreak >= TIMEOUT_FORFEIT_LIMIT)) {
      finishMatch(current, nextTurn, 'timeout_surrender');
      validateRoomState(current);
      return;
    }
    current.turn = nextTurn;
    scheduleTurnTimer(current);
    const nextPlayer = current.players[current.turn];
    activeSlots(current).forEach(slot => {
      emitToSlot(current, slot, 'turn_timeout', {
        previousTurnSlot: previousTurn,
        timedOutSlot: previousTurn,
        turnSlot: current.turn,
        playerName: nextPlayer ? nextPlayer.displayName : `Player ${current.turn + 1}`,
        timeoutStreak: timedOutPlayer ? timedOutPlayer.timeoutStreak : 0,
        consecutiveCount: timedOutPlayer ? timedOutPlayer.timeoutStreak : 0,
        timeoutsRemaining: timedOutPlayer ? Math.max(0, TIMEOUT_FORFEIT_LIMIT - timedOutPlayer.timeoutStreak) : TIMEOUT_FORFEIT_LIMIT,
        remainingAllowed: timedOutPlayer ? Math.max(0, TIMEOUT_FORFEIT_LIMIT - timedOutPlayer.timeoutStreak) : TIMEOUT_FORFEIT_LIMIT,
        msg: timedOutPlayer
          ? `${timedOutPlayer.displayName} ran out of time. Command passes to the other captain.`
          : 'Turn timed out. Command passes to the other captain.'
      });
      emitSnapshotToSlot(current, slot, 'turn:update');
    });
    validateRoomState(current);
  }, durationMs);
  room.turnTimer.unref?.();
}

function pauseTurnTimer(room) {
  if (!room.turnTimer || room.phase !== 'battle') return;
  room.pausedTurnRemainingMs = Math.max(1000, (room.turnDeadlineAt || Date.now()) - Date.now());
  clearTimeout(room.turnTimer);
  room.turnTimer = null;
  room.turnTimerPaused = true;
}

function validateRoomState(room) {
  const problems = [];
  if (!Array.isArray(room.players) || room.players.length !== 2) problems.push('players');
  if (!PHASES.has(room.phase)) problems.push('phase');
  if (room.phase === 'battle' && room.turn !== 0 && room.turn !== 1) problems.push('turn');
  if (room.phase === 'battle' && (!room.players[0] || !room.players[1])) problems.push('players_occupied');
  if (problems.length) {
    console.warn(`[GhostFleet] Room ${room.code} state inconsistency: ${problems.join(', ')}`);
    emitResyncToRoom(room);
    return false;
  }
  return true;
}

function startPlacementIfReady(room) {
  if (room.phase !== 'waiting') return;
  if (!room.players[0] || !room.players[1]) return;
  if (!room.players[0].connected || !room.players[1].connected) return;
  room.phase = 'placing';
  room.updatedAt = Date.now();
  emitRoom(room, 'room_ready');
  emitRoom(room, 'match:startPlacement');
}

function startBattleIfReady(room) {
  if (room.phase !== 'placing') return;
  if (!room.players[0] || !room.players[1]) return;
  if (!room.players.every(player => player && player.placementDone && player.board)) return;
  room.phase = 'battle';
  room.turn = 0;
  room.winnerSlot = null;
  room.endReason = '';
  room.players.forEach(player => {
    if (player) player.timeoutStreak = 0;
  });
  room.updatedAt = Date.now();
  scheduleTurnTimer(room);
  emitRoom(room, 'match:startBattle');
  emitRoom(room, 'turn:update');
}

function resetRoomForRematch(room) {
  clearTurnTimer(room);
  if (room.endCleanupTimer) {
    clearTimeout(room.endCleanupTimer);
    room.endCleanupTimer = null;
  }
  room.phase = 'placing';
  room.turn = null;
  room.winnerSlot = null;
  room.endReason = '';
  room.battleLog = [];
  room.updatedAt = Date.now();
  room.players.forEach(player => {
    if (!player) return;
    player.placementDone = false;
    player.rematchRequested = false;
    player.board = null;
    player.shots = new Set();
    player.hits = new Set();
    player.misses = new Set();
    player.timeoutStreak = 0;
  });
  emitRoom(room, 'match:startPlacement');
}

function startRematchIfReady(room) {
  if (room.phase !== 'ended') return;
  if (!room.players[0] || !room.players[1]) return;
  if (!room.players.every(player => player.connected && player.rematchRequested)) return;
  resetRoomForRematch(room);
}

function resolveShot(room, shooterSlot, idx) {
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

function finishMatch(room, winnerSlot, endReason = 'ships_sunk') {
  clearTurnTimer(room);
  room.phase = 'ended';
  room.turn = null;
  room.winnerSlot = winnerSlot;
  room.endReason = endReason;
  room.updatedAt = Date.now();
  emitRoom(room, 'match:end');
  emitRoom(room, 'game_over');
  scheduleEndedCleanup(room);
}

function disconnectSlot(room, slot, explicit = false) {
  const player = room.players[slot];
  if (!player) return;
  player.connected = false;
  player.socketId = null;
  player.rematchRequested = false;
  if (room.clientMap && room.clientMap[player.clientId]) {
    room.clientMap[player.clientId].socketId = null;
  }
  room.updatedAt = Date.now();
  clearDisconnectTimer(room, slot);
  if (explicit) {
    const other = opponentSlot(slot);
    if ((room.phase === 'placing' || room.phase === 'battle') && room.players[other]) {
      finishMatch(room, other, 'opponent_left');
    } else {
      emitToSlot(room, other, 'opponent_disconnected', {
        playerIndex: slot,
        msg: `${player.displayName} left the room.`
      });
      tombstoneRoom(room.code, 'cancelled');
      rooms.delete(room.code);
    }
    return;
  }
  if (room.phase === 'battle' && room.turn === slot) pauseTurnTimer(room);
  const expiresAt = Date.now() + DISCONNECT_GRACE_MS;
  emitToSlot(room, opponentSlot(slot), 'opponent_temporarily_disconnected', {
    playerIndex: slot,
    name: player.displayName,
    reconnectWindowSeconds: Math.round(DISCONNECT_GRACE_MS / 1000),
    expiresAt,
    msg: `${player.displayName} disconnected. Waiting for reconnect.`
  });
  emitRoom(room);
  room.disconnectTimers[slot] = setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current) return;
    const stale = current.players[slot];
    if (!stale || stale.connected) return;
    const other = opponentSlot(slot);
    if (current.players[other] && !current.players[other].connected && current.disconnectTimers[other]) return;
    if (current.players[other] && current.players[other].connected) {
      emitToSlot(current, other, 'opponent_disconnected', {
        playerIndex: slot,
        msg: `${stale.displayName} disconnected. The room has closed.`
      });
    }
    tombstoneRoom(current.code, connectedPlayers(current).some(candidate => candidate.connected) ? 'opponent_left' : 'both_left');
    rooms.delete(current.code);
  }, DISCONNECT_GRACE_MS);
  room.disconnectTimers[slot].unref?.();
}

function emitRoomLookupFailure(socket, code) {
  if (code && roomExpired(code)) {
    socket.emit('room_expired', {
      roomId: code,
      msg: 'This game has ended. Both players left the room.'
    });
    return;
  }
  fail(socket, 'Room not found or has expired.', 'ROOM_NOT_FOUND');
}

function newRoom(io, socket, payload = {}) {
  const clientId = normalizeClientId(payload);
  if (!clientId) return { error: 'missing_client_id', message: 'Missing client session. Refresh GhostFleet and try again.' };
  const code = makeRoomCode();
  const room = {
    code,
    io,
    phase: 'waiting',
    boardSize: normalizeBoardSize(payload.gridSize || payload.boardSize),
    players: [null, null],
    clientMap: {},
    turn: null,
    turnDeadlineAt: null,
    turnTimerPaused: false,
    pausedTurnRemainingMs: null,
    winnerSlot: null,
    endReason: '',
    battleLog: [],
    disconnectTimers: [null, null],
    turnTimer: null,
    endCleanupTimer: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  rooms.set(code, room);
  const player = addPlayerToSlot(room, socket, 0, clientId, payload.playerName || payload.displayName);
  return { room, player, slot: 0, clientId };
}

function emitRoomCreated(socket, room, player, clientId) {
  const snapshot = playerSnapshot(room, 0);
  const payload = {
    roomId: room.code,
    code: room.code,
    roomUrl: roomUrl(room.code),
    playerId: player.id,
    playerIndex: 0,
    token: player.token,
    clientId,
    snapshot
  };
  socket.emit('room_created', payload);
  socket.emit('room:joined', payload);
}

function emitJoined(socket, room, slot, player, clientId) {
  const snapshot = playerSnapshot(room, slot);
  const payload = {
    roomId: room.code,
    code: room.code,
    roomUrl: roomUrl(room.code),
    playerId: player.id,
    playerIndex: slot,
    token: player.token,
    clientId,
    snapshot
  };
  socket.emit('joined_room', payload);
  socket.emit('room:joined', payload);
}

function handleCreateRoom(io, socket, payload = {}) {
  const created = newRoom(io, socket, payload);
  if (created.error) return fail(socket, created.message, created.error);
  emitRoomCreated(socket, created.room, created.player, created.clientId);
  emitRoom(created.room);
  validateRoomState(created.room);
}

function handleJoinRoom(socket, payload = {}) {
  const code = normalizeRoomCode(payload.roomId || payload.code);
  const clientId = normalizeClientId(payload);
  if (!clientId) return fail(socket, 'Missing client session. Refresh GhostFleet and try again.', 'missing_client_id');
  if (!code) return fail(socket, 'Enter a valid 6-character room code.', 'invalid_room_code');
  const room = rooms.get(code);
  if (!room) return emitRoomLookupFailure(socket, code);
  const reconnectSlot = findSlotByClientId(room, clientId);
  if (reconnectSlot >= 0) {
    const player = bindSocketToPlayer(room, socket, reconnectSlot);
    emitJoined(socket, room, reconnectSlot, player, clientId);
    if (room.phase === 'waiting') emitRoom(room);
    else emitResync(room, reconnectSlot);
    validateRoomState(room);
    return;
  }
  if (room.phase !== 'waiting') return fail(socket, 'That match has already started.', 'ROOM_STARTED');
  const slot = room.players.findIndex(player => !player);
  if (slot < 0) return fail(socket, 'That room is full.', 'ROOM_FULL');
  const player = addPlayerToSlot(room, socket, slot, clientId, payload.playerName || payload.displayName);
  emitJoined(socket, room, slot, player, clientId);
  emitRoom(room);
  startPlacementIfReady(room);
  validateRoomState(room);
}

function handleReconnectRoom(socket, payload = {}) {
  const code = normalizeRoomCode(payload.roomId || payload.code);
  const clientId = normalizeClientId(payload);
  if (!clientId) return fail(socket, 'Missing client session. Refresh GhostFleet and try again.', 'missing_client_id');
  if (!code) return fail(socket, 'Enter a valid 6-character room code.', 'invalid_room_code');
  const room = rooms.get(code);
  if (!room) return emitRoomLookupFailure(socket, code);
  const slot = findSlotByClientId(room, clientId);
  if (slot < 0) return handleJoinRoom(socket, payload);
  const player = bindSocketToPlayer(room, socket, slot);
  emitJoined(socket, room, slot, player, clientId);
  emitResync(room, slot);
  validateRoomState(room);
}

function handleCancelRoom(socket, payload = {}) {
  const { room, slot } = findRoomAndSlot(socket, payload);
  if (!room) return emitRoomLookupFailure(socket, normalizeRoomCode(payload.roomId || payload.code));
  if (slot !== 0) return fail(socket, 'Only the room creator can cancel while waiting.', 'cancel_forbidden');
  if (room.phase !== 'waiting') return fail(socket, 'This room has already started.', 'wrong_phase');
  tombstoneRoom(room.code, 'cancelled');
  rooms.delete(room.code);
  socket.emit('room_expired', { roomId: room.code, msg: 'Room cancelled.' });
}

function attachSocketHandlers(io) {
  io.on('connection', socket => {
    // Triggered when a host creates a Teams-style room URL; validates clientId/grid size, creates slot 0, emits room_created and compatibility room:joined.
    socket.on('create_room', payload => {
      handleCreateRoom(io, socket, payload);
    });

    // Triggered when a host creates a room; validates clientId and board size, creates slot 0, emits room:joined and room:update.
    socket.on('room:create', payload => {
      handleCreateRoom(io, socket, payload);
    });

    // Triggered when a guest opens or enters a room URL; validates availability/clientId, joins or reconnects a slot, emits joined_room and compatibility room:joined.
    socket.on('join_room', payload => {
      handleJoinRoom(socket, payload);
    });

    // Triggered when player 2 enters a code; validates room availability and clientId, fills slot 1, emits room:joined and starts placement when ready.
    socket.on('room:join', payload => {
      handleJoinRoom(socket, payload);
    });

    // Triggered by a returning client on /room/:roomId; validates persistent clientId, migrates socket id, emits joined_room and resync.
    socket.on('reconnect_room', payload => {
      handleReconnectRoom(socket, payload);
    });

    // Triggered by stored client identity after reconnect; validates clientId/code, replaces the socket in the existing slot, emits room:joined and resync.
    socket.on('match:rejoin', payload => {
      handleReconnectRoom(socket, payload);
    });

    // Triggered when a host cancels a waiting share link; validates creator/waiting phase, tombstones the room, emits room_expired to caller.
    socket.on('cancel_room', payload => {
      handleCancelRoom(socket, payload);
    });

    // Legacy compatibility: triggered by older clients; validates room/player and marks lobby ready without affecting the auto-start slot flow.
    socket.on('player:ready', payload => {
      const { room, slot } = findRoomAndSlot(socket, payload);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      if (slot < 0) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'waiting') return fail(socket, 'Room readiness is only available before placement.', 'wrong_phase');
      emitRoom(room);
      startPlacementIfReady(room);
    });

    // Triggered when a player confirms fleet placement; validates phase/fleet, marks that slot placed, emits opponent_placement_done and starts battle when both are ready.
    socket.on('fleet:submit', payload => {
      const { room, slot } = findRoomAndSlot(socket, payload);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      if (slot < 0) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'placing') return fail(socket, 'Fleet cannot be submitted right now.', 'wrong_phase');
      if (room.players[slot].placementDone) return fail(socket, 'Your fleet is already submitted for this round.', 'fleet_already_submitted');
      const checked = validateFleet(payload && payload.fleet, room.boardSize);
      if (!checked.ok) return fail(socket, checked.error, 'invalid_fleet');
      const player = room.players[slot];
      player.board = checked.board;
      player.placementDone = true;
      room.updatedAt = Date.now();
      emitSnapshotToSlot(room, slot, 'room:update');
      emitToSlot(room, opponentSlot(slot), 'opponent_placement_done', {
        playerIndex: slot,
        playerName: player.displayName,
        msg: `${player.displayName} is ready.`
      });
      emitSnapshotToSlot(room, opponentSlot(slot), 'room:update');
      startBattleIfReady(room);
      validateRoomState(room);
    });

    // Triggered from the result modal; validates ended phase and records the slot rematch vote, then emits room:update or restarts placement.
    socket.on('match:rematch', payload => {
      const { room, slot } = findRoomAndSlot(socket, payload);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      if (slot < 0) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'ended') return fail(socket, 'Rematch is available after the match ends.', 'wrong_phase');
      room.players[slot].rematchRequested = true;
      room.updatedAt = Date.now();
      emitRoom(room);
      startRematchIfReady(room);
    });

    // Triggered when a player fires; validates phase, slot turn, bounds, duplicate shots, and opponent board, then emits shot:result plus match:end or turn:update.
    socket.on('shot:fire', payload => {
      const { room, slot } = findRoomAndSlot(socket, payload);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      if (slot < 0) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'battle') return fail(socket, 'The match is not in battle mode.', 'wrong_phase');
      if (socket.id !== (room.players[room.turn] && room.players[room.turn].socketId)) return fail(socket, 'Wait for your turn.', 'not_your_turn');
      const resolved = resolveShot(room, slot, payload && payload.idx);
      if (!resolved.ok) return fail(socket, resolved.error, 'invalid_shot');
      clearTurnTimer(room);
      room.players[slot].timeoutStreak = 0;
      if (resolved.won) {
        room.phase = 'ended';
        room.turn = null;
        room.winnerSlot = slot;
        room.endReason = 'ships_sunk';
        room.updatedAt = Date.now();
      } else {
        room.turn = opponentSlot(slot);
        room.updatedAt = Date.now();
      }
      activeSlots(room).forEach(viewerSlot => {
        emitToSlot(room, viewerSlot, 'shot:result', {
          snapshot: playerSnapshot(room, viewerSlot),
          shot: {
            ...resolved.entry,
            viewerSlot,
            viewerId: room.players[viewerSlot].id,
            sunkShip: resolved.sunkShip,
            hit: resolved.result === 'hit' || resolved.result === 'sunk',
            sunk: resolved.result === 'sunk'
          }
        });
      });
      if (resolved.won) {
        emitRoom(room, 'match:end');
        emitRoom(room, 'game_over');
        scheduleEndedCleanup(room);
      } else {
        scheduleTurnTimer(room);
        emitRoom(room, 'turn:update');
      }
      validateRoomState(room);
    });

    // Triggered by explicit Exit Room; validates the socket room and tells the opponent before closing the room.
    socket.on('room:leave', payload => {
      const { room, slot } = findRoomAndSlot(socket, payload);
      if (room && slot >= 0) disconnectSlot(room, slot, true);
      if (socket.data.roomCode) socket.leave(socket.data.roomCode);
      socket.data.roomCode = null;
      socket.data.playerIndex = null;
      socket.data.clientId = null;
    });

    // Triggered when a visible tab/app returns; validates clientId/code and sends a resync for the matched slot.
    socket.on('client_heartbeat', payload => {
      const { room, slot } = findRoomAndSlot(socket, payload);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      if (slot < 0) return fail(socket, 'Player not found.', 'player_missing');
      bindSocketToPlayer(room, socket, slot);
      emitResync(room, slot);
      validateRoomState(room);
    });

    // Triggered by Socket.IO transport loss; validates the stored slot, starts a grace timer, and emits room:update.
    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.roomCode);
      const slot = room ? findSlotBySocket(room, socket) : -1;
      if (!room || slot < 0) return;
      disconnectSlot(room, slot, false);
    });
  });
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const hasConnected = connectedPlayers(room).some(player => player.connected);
    const idleTooLong = now - room.updatedAt > ROOM_TTL_MS;
    if (!hasConnected && idleTooLong) {
      tombstoneRoom(code, 'expired');
      rooms.delete(code);
    }
  }
  for (const [code, entry] of expiredRooms.entries()) {
    if (entry.expiresAt <= now) expiredRooms.delete(code);
  }
}

export function attachMultiplayer(server) {
  const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectionStateRecovery: {
      maxDisconnectionDuration: DISCONNECT_GRACE_MS,
      skipMiddlewares: true
    }
  });
  attachSocketHandlers(io);
  setInterval(cleanupRooms, 60 * 1000).unref();
  return {
    io,
    stats() {
      return {
        rooms: rooms.size,
        expiredRooms: expiredRooms.size,
        players: Array.from(rooms.values()).reduce((count, room) => count + connectedPlayers(room).length, 0)
      };
    }
  };
}
