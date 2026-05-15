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
const DISCONNECT_GRACE_MS = 2 * 60 * 1000;
const ROOM_CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz';
const rooms = new Map();

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

function makeId(prefix) {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

function cleanName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 18);
  return name || 'Captain';
}

function normalizeBoardSize(value) {
  return Number(value) === 10 ? 10 : 8;
}

function shipDefinition(id) {
  return SHIPS.find(ship => ship.id === Number(id));
}

function cellCoord(idx, size) {
  return String.fromCharCode(65 + (idx % size)) + (Math.floor(idx / size) + 1);
}

function publicPlayer(player) {
  return {
    id: player.id,
    displayName: player.displayName,
    connected: player.connected,
    lobbyReady: player.lobbyReady,
    fleetReady: !!player.board,
    shots: Array.from(player.shots),
    hits: Array.from(player.hits),
    misses: Array.from(player.misses),
    sunkCount: player.board ? player.board.ships.filter(ship => ship.sunk).length : 0
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

function playerSnapshot(room, viewerId) {
  const viewer = room.players.find(player => player.id === viewerId);
  const opponent = room.players.find(player => player.id !== viewerId);
  return {
    code: room.code,
    phase: room.phase,
    boardSize: room.boardSize,
    turn: room.turn,
    winner: room.winner,
    you: viewer ? {
      ...publicPlayer(viewer),
      ships: viewer.board ? viewer.board.ships.map(ship => sanitizeShip(ship, true)) : []
    } : null,
    opponent: opponent ? {
      ...publicPlayer(opponent),
      ships: opponent.board ? opponent.board.ships.filter(ship => ship.sunk || room.phase === 'ended').map(ship => sanitizeShip(ship, true)) : []
    } : null,
    players: room.players.map(publicPlayer),
    battleLog: room.battleLog.slice(-50)
  };
}

function emitRoom(room, event = 'room:update') {
  room.players.forEach(player => {
    if (!player.socketId) return;
    room.io.to(player.socketId).emit(event, playerSnapshot(room, player.id));
  });
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

function addPlayer(room, socket, displayName, existingToken = '') {
  const token = existingToken || makeId('tok');
  const player = {
    id: makeId('p'),
    token,
    socketId: socket.id,
    displayName: cleanName(displayName),
    connected: true,
    lobbyReady: false,
    board: null,
    shots: new Set(),
    hits: new Set(),
    misses: new Set()
  };
  room.players.push(player);
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  socket.data.playerToken = token;
  socket.join(room.code);
  return player;
}

function findPlayer(room, socket) {
  const playerId = socket.data.playerId;
  return room.players.find(player => player.id === playerId) || null;
}

function startPlacementIfReady(room) {
  if (room.phase !== 'lobby') return;
  if (room.players.length !== 2) return;
  if (!room.players.every(player => player.connected)) return;
  room.phase = 'placing';
  room.updatedAt = Date.now();
  emitRoom(room, 'match:startPlacement');
}

function startBattleIfReady(room) {
  if (room.phase !== 'placing') return;
  if (room.players.length !== 2) return;
  if (!room.players.every(player => !!player.board)) return;
  room.phase = 'playing';
  room.turn = room.players[Math.floor(Math.random() * 2)].id;
  room.updatedAt = Date.now();
  emitRoom(room, 'match:startBattle');
}

function resolveShot(room, shooter, idx) {
  const target = room.players.find(player => player.id !== shooter.id);
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
    actorName: shooter.displayName,
    targetId: target.id,
    idx: cell,
    coord: cellCoord(cell, room.boardSize),
    result,
    shipName: sunkShip ? sunkShip.name : ''
  };
  room.battleLog.push(entry);
  room.turn = won ? null : target.id;
  room.phase = won ? 'ended' : 'playing';
  room.winner = won ? shooter.id : null;
  room.updatedAt = Date.now();
  return { ok: true, target, entry, result, sunkShip, won };
}

function attachSocketHandlers(io) {
  io.on('connection', socket => {
    socket.on('room:create', payload => {
      const code = makeRoomCode();
      const room = {
        code,
        io,
        phase: 'lobby',
        boardSize: normalizeBoardSize(payload && payload.boardSize),
        players: [],
        turn: null,
        winner: null,
        battleLog: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      rooms.set(code, room);
      const player = addPlayer(room, socket, payload && payload.displayName);
      socket.emit('room:joined', { code, playerId: player.id, token: player.token, snapshot: playerSnapshot(room, player.id) });
      emitRoom(room);
      startPlacementIfReady(room);
    });

    socket.on('room:join', payload => {
      const code = String(payload && payload.code || '').trim().toLowerCase();
      const room = rooms.get(code);
      if (!room) return fail(socket, 'Room code not found.', 'room_not_found');
      if (room.phase !== 'lobby') return fail(socket, 'That match has already started.', 'room_started');
      if (room.players.length >= 2) return fail(socket, 'That room is full.', 'room_full');
      const player = addPlayer(room, socket, payload && payload.displayName);
      socket.emit('room:joined', { code, playerId: player.id, token: player.token, snapshot: playerSnapshot(room, player.id) });
      emitRoom(room);
      startPlacementIfReady(room);
    });

    socket.on('match:rejoin', payload => {
      const code = String(payload && payload.code || '').trim().toLowerCase();
      const token = String(payload && payload.token || '');
      const room = rooms.get(code);
      if (!room || !token) return fail(socket, 'Could not restore that room.', 'rejoin_failed');
      const player = room.players.find(candidate => candidate.token === token);
      if (!player) return fail(socket, 'Could not restore that player.', 'rejoin_failed');
      player.socketId = socket.id;
      player.connected = true;
      socket.data.roomCode = room.code;
      socket.data.playerId = player.id;
      socket.data.playerToken = token;
      socket.join(room.code);
      socket.emit('room:joined', { code, playerId: player.id, token, snapshot: playerSnapshot(room, player.id) });
      emitRoom(room);
      if (room.phase === 'placing') socket.emit('match:startPlacement', playerSnapshot(room, player.id));
      if (room.phase === 'playing') {
        socket.emit('match:startBattle', playerSnapshot(room, player.id));
        socket.emit('turn:update', playerSnapshot(room, player.id));
      }
      if (room.phase === 'ended') socket.emit('match:end', playerSnapshot(room, player.id));
    });

    socket.on('player:ready', () => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      const player = findPlayer(room, socket);
      if (!player) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'lobby') return;
      player.lobbyReady = true;
      room.updatedAt = Date.now();
      emitRoom(room);
      startPlacementIfReady(room);
    });

    socket.on('fleet:submit', payload => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      const player = findPlayer(room, socket);
      if (!player) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'placing') return fail(socket, 'Fleet cannot be submitted right now.', 'wrong_phase');
      const checked = validateFleet(payload && payload.fleet, room.boardSize);
      if (!checked.ok) return fail(socket, checked.error, 'invalid_fleet');
      player.board = checked.board;
      room.updatedAt = Date.now();
      emitRoom(room);
      startBattleIfReady(room);
    });

    socket.on('shot:fire', payload => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) return fail(socket, 'Room expired.', 'room_missing');
      const shooter = findPlayer(room, socket);
      if (!shooter) return fail(socket, 'Player not found.', 'player_missing');
      if (room.phase !== 'playing') return fail(socket, 'The match is not in battle mode.', 'wrong_phase');
      if (room.turn !== shooter.id) return fail(socket, 'Wait for your turn.', 'not_your_turn');
      const resolved = resolveShot(room, shooter, payload && payload.idx);
      if (!resolved.ok) return fail(socket, resolved.error, 'invalid_shot');
      room.players.forEach(player => {
        if (!player.socketId) return;
        room.io.to(player.socketId).emit('shot:result', {
          snapshot: playerSnapshot(room, player.id),
          shot: {
            ...resolved.entry,
            viewerId: player.id,
            sunkShip: resolved.sunkShip,
            hit: resolved.result === 'hit' || resolved.result === 'sunk',
            sunk: resolved.result === 'sunk'
          }
        });
      });
      if (resolved.won) {
        setTimeout(() => emitRoom(room, 'match:end'), 1200);
      }
    });

    socket.on('room:leave', () => {
      const room = rooms.get(socket.data.roomCode);
      const player = room ? findPlayer(room, socket) : null;
      if (room && player) {
        player.connected = false;
        player.socketId = null;
        room.updatedAt = Date.now();
        emitRoom(room);
      }
      socket.leave(socket.data.roomCode);
      socket.data.roomCode = null;
      socket.data.playerId = null;
    });

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.roomCode);
      const player = room ? findPlayer(room, socket) : null;
      if (!room || !player) return;
      player.connected = false;
      player.socketId = null;
      room.updatedAt = Date.now();
      emitRoom(room);
      setTimeout(() => {
        const currentRoom = rooms.get(room.code);
        if (!currentRoom) return;
        const currentPlayer = currentRoom.players.find(candidate => candidate.id === player.id);
        if (currentPlayer && !currentPlayer.connected) emitRoom(currentRoom);
      }, DISCONNECT_GRACE_MS);
    });
  });
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const connected = room.players.some(player => player.connected);
    const idleTooLong = now - room.updatedAt > ROOM_TTL_MS;
    if (!connected && idleTooLong) rooms.delete(code);
  }
}

export function attachMultiplayer(server) {
  const io = new Server(server, {
    cors: { origin: true },
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
        players: Array.from(rooms.values()).reduce((count, room) => count + room.players.length, 0)
      };
    }
  };
}
