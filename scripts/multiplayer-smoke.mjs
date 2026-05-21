import { spawn } from 'node:child_process';
import http from 'node:http';
import { io } from 'socket.io-client';

const PORT = 3137;
const URL = `http://127.0.0.1:${PORT}`;
const SHIP_CELLS = [
  { id: 0, orient: 'h', cells: [0, 1, 2, 3, 4] },
  { id: 1, orient: 'h', cells: [8, 9, 10, 11] },
  { id: 2, orient: 'h', cells: [16, 17, 18] },
  { id: 3, orient: 'h', cells: [24, 25, 26] },
  { id: 4, orient: 'h', cells: [32, 33] }
];
const ALL_SHIP_CELLS = SHIP_CELLS.flatMap(ship => ship.cells);
const SAFE_MISS_CELLS = [63, 62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForHttp(path) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      http.get(`${URL}${path}`, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else retry();
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - started > 8000) reject(new Error(`Timed out waiting for ${path}`));
      else setTimeout(tick, 150);
    };
    tick();
  });
}

function once(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = payload => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, onEvent);
  });
}

function connectClient(clientId) {
  const socket = io(URL, { reconnection: false, timeout: 4000 });
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  }).then(socket => {
    socket.clientId = clientId;
    return socket;
  });
}

function emit(socket, event, payload = {}) {
  socket.emit(event, { ...payload, clientId: socket.clientId, code: socket.roomCode || payload.code, playerIndex: socket.playerIndex });
}

async function fireAndWait(shooter, targetIdx) {
  const shotPromise = once(shooter, 'shot:result');
  emit(shooter, 'shot:fire', { idx: targetIdx });
  return shotPromise;
}

async function waitTurn(socket, slot, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`Timed out waiting for turn ${slot}`);
    const snapshot = await once(socket, 'turn:update', remaining);
    if (snapshot.turnSlot === slot) return snapshot;
  }
}

async function waitTimeout(socket, expectedSlot, expectedStreak, timeoutMs = 6000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`Timed out waiting for slot ${expectedSlot} timeout streak ${expectedStreak}`);
    const payload = await once(socket, 'turn_timeout', remaining);
    if (payload.previousTurnSlot === expectedSlot && payload.timeoutStreak === expectedStreak) return payload;
  }
}

async function main() {
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), GHOSTFLEET_FREE_ONLY: 'true', GHOSTFLEET_TURN_TIMEOUT_MS: '1500' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => process.stdout.write(chunk));
  server.stderr.on('data', chunk => process.stderr.write(chunk));
  try {
    await waitForHttp('/healthz');
    const p1 = await connectClient('smoke-client-a');
    const p2 = await connectClient('smoke-client-b');

    const p1Joined = once(p1, 'room_created');
    emit(p1, 'create_room', { playerName: 'Smoke A', gridSize: 8 });
    const join1 = await p1Joined;
    p1.roomCode = join1.roomId;
    p1.playerIndex = join1.playerIndex;
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(join1.roomId) || join1.roomUrl !== `/room/${join1.roomId}`) {
      throw new Error('Expected uppercase Teams-style room URL.');
    }
    if (!join1.snapshot || join1.snapshot.you.displayName !== 'SmokeA') {
      throw new Error('Expected host player name to be sanitized.');
    }

    const p1Placement = once(p1, 'match:startPlacement');
    const p2Placement = once(p2, 'match:startPlacement');
    const p2Joined = once(p2, 'joined_room');
    emit(p2, 'join_room', { roomId: join1.roomId, playerName: 'Smoke B' });
    const join2 = await p2Joined;
    p2.roomCode = join2.roomId;
    p2.playerIndex = join2.playerIndex;
    if (!join2.snapshot || join2.snapshot.you.displayName !== 'SmokeB') {
      throw new Error('Expected joiner player name to be sanitized.');
    }
    await Promise.all([p1Placement, p2Placement]);
    if (p1.playerIndex !== 0 || p2.playerIndex !== 1) throw new Error('Expected fixed slots 0 and 1.');

    const p1Battle = once(p1, 'match:startBattle');
    const p2Battle = once(p2, 'match:startBattle');
    const opponentReady = once(p2, 'opponent_placement_done');
    emit(p1, 'fleet:submit', { fleet: SHIP_CELLS });
    const duplicateFleet = once(p1, 'error:message');
    emit(p1, 'fleet:submit', { fleet: SHIP_CELLS });
    const duplicateFleetError = await duplicateFleet;
    if (duplicateFleetError.code !== 'fleet_already_submitted') throw new Error('Expected duplicate fleet submit rejection.');
    await opponentReady;
    emit(p2, 'fleet:submit', { fleet: SHIP_CELLS });
    const battle = await p1Battle;
    await p2Battle;
    if (battle.turnSlot !== 0) throw new Error('Expected slot 0 to start.');
    if (!battle.turnDeadlineAt || battle.turnDurationMs !== 1500) throw new Error('Expected battle snapshot to include turn deadline.');

    const wrongTurn = once(p2, 'error:message');
    emit(p2, 'shot:fire', { idx: 0 });
    const wrong = await wrongTurn;
    if (wrong.code !== 'not_your_turn') throw new Error('Expected not_your_turn rejection.');

    const p2TurnAfterMiss = waitTurn(p2, 1);
    const miss = await fireAndWait(p1, 63);
    if (miss.shot.hit) throw new Error('Expected first smoke shot to miss.');
    await p2TurnAfterMiss;

    const p1TurnAfterHit = waitTurn(p1, 0);
    const hit = await fireAndWait(p2, 0);
    if (!hit.shot.hit) throw new Error('Expected second smoke shot to hit.');
    await p1TurnAfterHit;

    p1.disconnect();
    await wait(200);
    const p1r = await connectClient('smoke-client-a');
    p1r.roomCode = join1.roomId;
    p1r.playerIndex = 0;
    const resync = once(p1r, 'resync');
    emit(p1r, 'reconnect_room', { roomId: join1.roomId });
    const restored = await resync;
    if (restored.playerIndex !== 0 || restored.phase !== 'battle') throw new Error('Expected reconnect resync for slot 0 in battle.');

    const p2TurnAfterReconnectShot = waitTurn(p2, 1);
    const passTurn = await fireAndWait(p1r, 62);
    if (passTurn.shot.hit) throw new Error('Expected reconnect smoke shot to miss.');
    await p2TurnAfterReconnectShot;

    const duplicate = once(p2, 'error:message');
    emit(p2, 'shot:fire', { idx: 0 });
    const duplicateError = await duplicate;
    if (duplicateError.code !== 'invalid_shot') throw new Error('Expected duplicate shot rejection.');

    const p1TurnBeforeWinRun = waitTurn(p1r, 0);
    const p2Pass = await fireAndWait(p2, 63);
    if (p2Pass.shot.hit) throw new Error('Expected post-duplicate pass shot to miss.');
    await p1TurnBeforeWinRun;

    const gameOver1 = once(p1r, 'match:end', 30000).catch(error => ({ error }));
    const gameOver2 = once(p2, 'match:end', 30000).catch(error => ({ error }));
    let missCursor = 1;
    for (const target of ALL_SHIP_CELLS) {
      const p2TurnNext = waitTurn(p2, 1, 5000).catch(() => null);
      const result = await fireAndWait(p1r, target);
      if (!result.shot.hit) throw new Error(`Expected winning sequence shot ${target} to hit.`);
      if (result.snapshot && result.snapshot.phase === 'ended') {
        const ended = await gameOver1;
        const peerEnd = await gameOver2;
        if (ended.error) throw ended.error;
        if (peerEnd.error) throw peerEnd.error;
        if (ended.winnerSlot !== 0 || peerEnd.winnerSlot !== 0) throw new Error('Expected slot 0 to win.');
        break;
      }
      if (!(await p2TurnNext)) throw new Error('Expected turn to pass to slot 1 during win run.');
      const missCell = SAFE_MISS_CELLS[missCursor++];
      const p1TurnNext = waitTurn(p1r, 0);
      const pass = await fireAndWait(p2, missCell);
      if (pass.shot.hit) throw new Error(`Expected pass shot ${missCell} to miss.`);
      await p1TurnNext;
    }

    const noEarlyRematchPlacement = once(p1r, 'match:startPlacement', 300).then(() => true).catch(() => false);
    const rematchVoteUpdate = once(p1r, 'room:update');
    emit(p1r, 'match:rematch');
    const voted = await rematchVoteUpdate;
    if (voted.phase !== 'ended' || !voted.you.rematchRequested) throw new Error('Expected first rematch vote to wait in ended phase.');
    if (await noEarlyRematchPlacement) throw new Error('Rematch should not start until both players vote.');

    const p1RematchPlacement = once(p1r, 'match:startPlacement');
    const p2RematchPlacement = once(p2, 'match:startPlacement');
    emit(p2, 'match:rematch');
    const [rematchP1, rematchP2] = await Promise.all([p1RematchPlacement, p2RematchPlacement]);
    if (rematchP1.roomId !== join1.roomId || rematchP2.roomId !== join1.roomId) throw new Error('Expected rematch to reuse the same room.');
    if (rematchP1.boardSize !== 8 || rematchP2.boardSize !== 8) throw new Error('Expected rematch to preserve board size.');
    if (rematchP1.phase !== 'placing' || rematchP2.phase !== 'placing') throw new Error('Expected rematch to return both players to placement.');
    if (rematchP1.you.rematchRequested || rematchP2.you.rematchRequested) throw new Error('Expected rematch flags to reset for fresh placement.');

    const rematchBattle1 = once(p1r, 'match:startBattle');
    const rematchBattle2 = once(p2, 'match:startBattle');
    emit(p1r, 'fleet:submit', { fleet: SHIP_CELLS });
    emit(p2, 'fleet:submit', { fleet: SHIP_CELLS });
    const [freshBattle1, freshBattle2] = await Promise.all([rematchBattle1, rematchBattle2]);
    if (freshBattle1.roomId !== join1.roomId || freshBattle2.roomId !== join1.roomId) throw new Error('Expected fresh battle to stay in the same room.');
    if (freshBattle1.boardSize !== 8 || freshBattle2.boardSize !== 8) throw new Error('Expected fresh battle to keep rematch board size.');
    p1r.disconnect();
    p2.disconnect();

    const exitA = await connectClient('smoke-exit-a');
    const exitB = await connectClient('smoke-exit-b');
    const cancelA = await connectClient('smoke-cancel-a');
    const cancelJoined = once(cancelA, 'room_created');
    emit(cancelA, 'create_room', { playerName: 'Cancel A', gridSize: 8 });
    const cancelRoom = await cancelJoined;
    cancelA.roomCode = cancelRoom.roomId;
    cancelA.playerIndex = 0;
    const cancelled = once(cancelA, 'room_expired');
    emit(cancelA, 'cancel_room', { roomId: cancelRoom.roomId });
    await cancelled;
    const cancelB = await connectClient('smoke-cancel-b');
    const cancelExpired = once(cancelB, 'room_expired');
    emit(cancelB, 'join_room', { roomId: cancelRoom.roomId, playerName: 'Late Cancel' });
    await cancelExpired;
    cancelA.disconnect();
    cancelB.disconnect();

    const sizeA = await connectClient('smoke-size-a');
    const sizeB = await connectClient('smoke-size-b');
    const sizeCreated = once(sizeA, 'room_created');
    emit(sizeA, 'create_room', { playerName: 'Size A', gridSize: 12 });
    const sizeRoom = await sizeCreated;
    sizeA.roomCode = sizeRoom.roomId;
    sizeA.playerIndex = sizeRoom.playerIndex;
    if (!sizeRoom.snapshot || sizeRoom.snapshot.boardSize !== 12) throw new Error('Expected host-created 12x12 room.');
    const sizeAPlacement = once(sizeA, 'match:startPlacement');
    const sizeBPlacement = once(sizeB, 'match:startPlacement');
    const sizeJoined = once(sizeB, 'joined_room');
    emit(sizeB, 'join_room', { roomId: sizeRoom.roomId, playerName: 'Size B' });
    const sizeJoin = await sizeJoined;
    sizeB.roomCode = sizeJoin.roomId;
    sizeB.playerIndex = sizeJoin.playerIndex;
    if (!sizeJoin.snapshot || sizeJoin.snapshot.boardSize !== 12) throw new Error('Expected joiner to inherit 12x12 room.');
    await Promise.all([sizeAPlacement, sizeBPlacement]);
    sizeA.disconnect();
    sizeB.disconnect();

    const exitJoined = once(exitA, 'room_created');
    emit(exitA, 'create_room', { playerName: 'Exit A', gridSize: 8 });
    const exitRoom = await exitJoined;
    exitA.roomCode = exitRoom.roomId;
    exitA.playerIndex = exitRoom.playerIndex;
    const exitPlacementA = once(exitA, 'match:startPlacement');
    const exitPlacementB = once(exitB, 'match:startPlacement');
    const exitBJoined = once(exitB, 'joined_room');
    emit(exitB, 'join_room', { roomId: exitRoom.roomId, playerName: 'Exit B' });
    const exitJoinB = await exitBJoined;
    exitB.roomCode = exitJoinB.roomId;
    exitB.playerIndex = exitJoinB.playerIndex;
    await Promise.all([exitPlacementA, exitPlacementB]);
    const exitWin = once(exitB, 'match:end');
    emit(exitA, 'room:leave');
    const exitEnd = await exitWin;
    if (exitEnd.winnerSlot !== 1 || exitEnd.endReason !== 'opponent_left') throw new Error('Expected room leave to award opponent_left win.');
    const exitRematchRejected = once(exitB, 'error:message');
    emit(exitB, 'match:rematch');
    const exitRematchError = await exitRematchRejected;
    if (exitRematchError.code !== 'rematch_unavailable') throw new Error('Expected opponent_left rematch rejection.');

    const alternateA = await connectClient('smoke-alt-timeout-a');
    const alternateB = await connectClient('smoke-alt-timeout-b');
    const alternateJoined = once(alternateA, 'room_created');
    emit(alternateA, 'create_room', { playerName: 'Alt A', gridSize: 8 });
    const alternateRoom = await alternateJoined;
    alternateA.roomCode = alternateRoom.roomId;
    alternateA.playerIndex = alternateRoom.playerIndex;
    const alternatePlacementA = once(alternateA, 'match:startPlacement');
    const alternatePlacementB = once(alternateB, 'match:startPlacement');
    const alternateBJoined = once(alternateB, 'joined_room');
    emit(alternateB, 'join_room', { roomId: alternateRoom.roomId, playerName: 'Alt B' });
    const alternateJoinB = await alternateBJoined;
    alternateB.roomCode = alternateJoinB.roomId;
    alternateB.playerIndex = alternateJoinB.playerIndex;
    await Promise.all([alternatePlacementA, alternatePlacementB]);
    const alternateBattle = once(alternateA, 'match:startBattle');
    emit(alternateA, 'fleet:submit', { fleet: SHIP_CELLS });
    emit(alternateB, 'fleet:submit', { fleet: SHIP_CELLS });
    await alternateBattle;
    const alternateTimeouts = [
      { listener: alternateB, timedOutSlot: 0, streak: 1 },
      { listener: alternateA, timedOutSlot: 1, streak: 1 },
      { listener: alternateB, timedOutSlot: 0, streak: 2 },
      { listener: alternateA, timedOutSlot: 1, streak: 2 }
    ];
    for (const expected of alternateTimeouts) {
      await waitTimeout(expected.listener, expected.timedOutSlot, expected.streak);
    }
    alternateA.disconnect();
    alternateB.disconnect();

    const timerA = await connectClient('smoke-timer-a');
    const timerB = await connectClient('smoke-timer-b');
    const timerJoined = once(timerA, 'room_created');
    emit(timerA, 'create_room', { playerName: 'Timer A', gridSize: 8 });
    const timerRoom = await timerJoined;
    timerA.roomCode = timerRoom.roomId;
    timerA.playerIndex = timerRoom.playerIndex;
    const timerPlacementA = once(timerA, 'match:startPlacement');
    const timerPlacementB = once(timerB, 'match:startPlacement');
    const timerBJoined = once(timerB, 'joined_room');
    emit(timerB, 'join_room', { roomId: timerRoom.roomId, playerName: 'Timer B' });
    const timerJoinB = await timerBJoined;
    timerB.roomCode = timerJoinB.roomId;
    timerB.playerIndex = timerJoinB.playerIndex;
    await Promise.all([timerPlacementA, timerPlacementB]);
    const timerBattle = once(timerA, 'match:startBattle');
    emit(timerA, 'fleet:submit', { fleet: SHIP_CELLS });
    emit(timerB, 'fleet:submit', { fleet: SHIP_CELLS });
    await timerBattle;
    for (let streak = 1; streak <= 2; streak += 1) {
      const timedOut = await once(timerB, 'turn_timeout', 4000);
      if (timedOut.previousTurnSlot !== 0 || timedOut.timeoutStreak !== streak) throw new Error(`Expected timeout streak ${streak} for slot 0.`);
      if (timedOut.turnSlot !== 1) throw new Error('Expected timeout to pass turn to slot 1.');
      const wrongAfterTimeout = once(timerA, 'error:message');
      emit(timerA, 'shot:fire', { idx: SAFE_MISS_CELLS[streak + 8] });
      const wrongAfterTimeoutError = await wrongAfterTimeout;
      if (wrongAfterTimeoutError.code !== 'not_your_turn') throw new Error('Expected timed-out player to lose the turn.');
      const nextForA = waitTurn(timerA, 0, 5000);
      const pass = await fireAndWait(timerB, SAFE_MISS_CELLS[streak]);
      if (pass.shot.hit) throw new Error('Expected timer pass shot to miss.');
      await nextForA;
    }
    const timeoutEndA = once(timerA, 'match:end', 5000);
    const timeoutEndB = once(timerB, 'match:end', 5000);
    const endedA = await timeoutEndA;
    const endedB = await timeoutEndB;
    if (endedA.winnerSlot !== 1 || endedB.winnerSlot !== 1 || endedA.endReason !== 'timeout_surrender') {
      throw new Error('Expected three consecutive timeouts to forfeit slot 0.');
    }

    [p1r, p2, exitA, exitB, timerA, timerB].forEach(socket => socket.disconnect());
  } finally {
    server.kill();
  }
}

main().then(() => {
  console.log('Multiplayer smoke passed');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
