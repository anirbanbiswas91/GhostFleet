import test from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';

// Configure generous timers BEFORE importing the server so the multiplayer
// module reads them at load time and turns don't expire mid-test.
process.env.GHOSTFLEET_TURN_TIMEOUT_MS = '30000';
process.env.GHOSTFLEET_DISCONNECT_GRACE_MS = '30000';

const { server } = await import('../server/index.js');

// A valid 8x8 fleet shared by both players.
const FLEET = [
  { id: 0, orient: 'h', cells: [0, 1, 2, 3, 4] },
  { id: 1, orient: 'h', cells: [8, 9, 10, 11] },
  { id: 2, orient: 'h', cells: [16, 17, 18] },
  { id: 3, orient: 'h', cells: [24, 25, 26] },
  { id: 4, orient: 'h', cells: [32, 33] }
];

let baseUrl;

function connect(clientId) {
  const socket = ioClient(baseUrl, { reconnection: false, timeout: 4000 });
  socket.clientId = clientId;
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
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

function emit(socket, event, payload = {}) {
  socket.emit(event, {
    ...payload,
    clientId: socket.clientId,
    code: socket.roomCode || payload.code,
    playerIndex: socket.playerIndex
  });
}

test.before(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
});

test('multiplayer smoke: create, join, place fleets, start battle, fire shots', async () => {
  const host = await connect('test-host');
  const guest = await connect('test-guest');

  try {
    // 1. Create room
    const created = once(host, 'room_created');
    emit(host, 'create_room', { playerName: 'Host', gridSize: 8 });
    const room = await created;
    host.roomCode = room.roomId;
    host.playerIndex = room.playerIndex;
    assert.match(room.roomId, /^[A-HJ-NP-Z2-9]{6}$/, 'room code should be a 6-char uppercase code');
    assert.equal(host.playerIndex, 0, 'host occupies slot 0');

    // 2. Join room -> both move to placement
    const hostPlacement = once(host, 'match:startPlacement');
    const guestPlacement = once(guest, 'match:startPlacement');
    const joined = once(guest, 'joined_room');
    emit(guest, 'join_room', { roomId: room.roomId, playerName: 'Guest' });
    const guestJoin = await joined;
    guest.roomCode = guestJoin.roomId;
    guest.playerIndex = guestJoin.playerIndex;
    assert.equal(guest.playerIndex, 1, 'guest occupies slot 1');
    await Promise.all([hostPlacement, guestPlacement]);

    // 3. Submit fleets -> battle starts
    const hostBattle = once(host, 'match:startBattle');
    const guestBattle = once(guest, 'match:startBattle');
    emit(host, 'fleet:submit', { fleet: FLEET });
    emit(guest, 'fleet:submit', { fleet: FLEET });
    const battle = await hostBattle;
    await guestBattle;
    assert.equal(battle.turnSlot, 0, 'slot 0 starts the battle');

    // 4. Reject an out-of-turn shot from the guest
    const wrongTurn = once(guest, 'error:message');
    emit(guest, 'shot:fire', { idx: 0 });
    const wrong = await wrongTurn;
    assert.equal(wrong.code, 'not_your_turn', 'out-of-turn shot is rejected');

    // 5. Host fires one valid shot
    const shotResult = once(host, 'shot:result');
    emit(host, 'shot:fire', { idx: 63 });
    const result = await shotResult;
    assert.ok(result.shot, 'shot result includes a shot payload');
    assert.equal(typeof result.shot.hit, 'boolean', 'shot result reports hit/miss');
  } finally {
    host.disconnect();
    guest.disconnect();
  }
});
