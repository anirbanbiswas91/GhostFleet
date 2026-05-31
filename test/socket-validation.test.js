import test from 'node:test';
import assert from 'node:assert/strict';
import { io as ioClient } from 'socket.io-client';

process.env.GHOSTFLEET_TURN_TIMEOUT_MS = '30000';
process.env.GHOSTFLEET_DISCONNECT_GRACE_MS = '30000';

const { server } = await import('../server/index.js');

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

function waitForErrorCode(socket, expectedCode, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('error:message', onEvent);
      reject(new Error(`Timed out waiting for error ${expectedCode}`));
    }, timeoutMs);
    const onEvent = payload => {
      if (payload.code !== expectedCode) return;
      clearTimeout(timer);
      socket.off('error:message', onEvent);
      resolve(payload);
    };
    socket.on('error:message', onEvent);
  });
}

const VALID_FLEET = [
  { id: 0, orient: 'h', cells: [0, 1, 2, 3, 4] },
  { id: 1, orient: 'h', cells: [8, 9, 10, 11] },
  { id: 2, orient: 'h', cells: [16, 17, 18] },
  { id: 3, orient: 'h', cells: [24, 25, 26] },
  { id: 4, orient: 'h', cells: [32, 33] }
];
// Battleship overlaps the Carrier on cell 4.
const OVERLAPPING_FLEET = [
  { id: 0, orient: 'h', cells: [0, 1, 2, 3, 4] },
  { id: 1, orient: 'h', cells: [4, 5, 6, 7] },
  { id: 2, orient: 'h', cells: [16, 17, 18] },
  { id: 3, orient: 'h', cells: [24, 25, 26] },
  { id: 4, orient: 'h', cells: [32, 33] }
];

test.before(async () => {
  await new Promise(resolve => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
});

test('join_room with a malformed room code emits invalid_room_code', async () => {
  const socket = await connect('inv-code');
  try {
    const err = waitForErrorCode(socket, 'invalid_room_code');
    socket.emit('join_room', { roomId: '!!bad', clientId: 'inv-code', playerName: 'X' });
    const payload = await err;
    assert.equal(payload.code, 'invalid_room_code');
    assert.equal(typeof payload.message, 'string');
  } finally {
    socket.disconnect();
  }
});

test('join_room without a clientId emits missing_client_id', async () => {
  const socket = await connect('no-client');
  try {
    const err = waitForErrorCode(socket, 'missing_client_id');
    socket.emit('join_room', { roomId: 'ABCDEF', clientId: '', playerName: 'X' });
    await err;
  } finally {
    socket.disconnect();
  }
});

test('join_room with a valid-but-nonexistent code fails safely', async () => {
  const socket = await connect('ghost-room');
  try {
    const err = waitForErrorCode(socket, 'ROOM_NOT_FOUND');
    socket.emit('join_room', { roomId: 'ZZZZZZ', clientId: 'ghost-room', playerName: 'X' });
    await err;
  } finally {
    socket.disconnect();
  }
});

test('fleet:submit with an overlapping fleet emits invalid_fleet', async () => {
  const host = await connect('bad-fleet-host');
  const guest = await connect('bad-fleet-guest');
  try {
    const created = once(host, 'room_created');
    host.emit('create_room', { clientId: 'bad-fleet-host', playerName: 'Host', gridSize: 8 });
    const room = await created;

    const hostPlacement = once(host, 'match:startPlacement');
    guest.emit('join_room', { roomId: room.roomId, clientId: 'bad-fleet-guest', playerName: 'Guest' });
    await hostPlacement;

    const err = waitForErrorCode(host, 'invalid_fleet');
    host.emit('fleet:submit', { code: room.roomId, clientId: 'bad-fleet-host', fleet: OVERLAPPING_FLEET });
    const payload = await err;
    assert.equal(payload.code, 'invalid_fleet');

    // A valid fleet from the same player is still accepted afterwards.
    const accepted = once(host, 'room:update');
    host.emit('fleet:submit', { code: room.roomId, clientId: 'bad-fleet-host', fleet: VALID_FLEET });
    await accepted;
  } finally {
    host.disconnect();
    guest.disconnect();
  }
});
