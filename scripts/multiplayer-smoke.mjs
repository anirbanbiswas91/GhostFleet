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

async function main() {
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), GHOSTFLEET_FREE_ONLY: 'true' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => process.stdout.write(chunk));
  server.stderr.on('data', chunk => process.stderr.write(chunk));
  try {
    await waitForHttp('/healthz');
    const p1 = await connectClient('smoke-client-a');
    const p2 = await connectClient('smoke-client-b');

    const p1Joined = once(p1, 'room:joined');
    emit(p1, 'room:create', { displayName: 'Smoke A', boardSize: 8 });
    const join1 = await p1Joined;
    p1.roomCode = join1.code;
    p1.playerIndex = join1.playerIndex;

    const p1Placement = once(p1, 'match:startPlacement');
    const p2Placement = once(p2, 'match:startPlacement');
    const p2Joined = once(p2, 'room:joined');
    emit(p2, 'room:join', { code: join1.code, displayName: 'Smoke B' });
    const join2 = await p2Joined;
    p2.roomCode = join2.code;
    p2.playerIndex = join2.playerIndex;
    await Promise.all([p1Placement, p2Placement]);
    if (p1.playerIndex !== 0 || p2.playerIndex !== 1) throw new Error('Expected fixed slots 0 and 1.');

    const p1Battle = once(p1, 'match:startBattle');
    const p2Battle = once(p2, 'match:startBattle');
    emit(p1, 'fleet:submit', { fleet: SHIP_CELLS });
    await once(p2, 'opponent_placement_done');
    emit(p2, 'fleet:submit', { fleet: SHIP_CELLS });
    const battle = await p1Battle;
    await p2Battle;
    if (battle.turnSlot !== 0) throw new Error('Expected slot 0 to start.');

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
    p1r.roomCode = join1.code;
    p1r.playerIndex = 0;
    const resync = once(p1r, 'resync');
    emit(p1r, 'match:rejoin', { code: join1.code });
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

    [p1r, p2].forEach(socket => socket.disconnect());
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
