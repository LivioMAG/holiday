import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, deleteRoom, generateInviteCode, joinRoom, leaveRoom, normalizeInviteCode } from '../src/services/room-service.js';

function store() { return { users: [{ id: 'u1', email: 'a@b.de' }, { id: 'u2', email: 'b@b.de' }, { id: 'u3', email: 'c@b.de' }], rooms: [] }; }

test('normalizes invite codes and generates unique codes', () => {
  assert.equal(normalizeInviteCode(' ab c12 '), 'ABC12');
  assert.notEqual(generateInviteCode(new Set(['AAAAAA'])), 'AAAAAA');
});

test('creates room and assigns owner', async () => {
  const data = store(); const room = await createRoom('u1', 'Euer Raum', data);
  assert.equal(room.members.length, 1); assert.equal(data.users[0].room_role, 'owner'); assert.ok(room.invite_code);
});

test('joins valid room and prevents invalid, duplicate and full joins', async () => {
  const data = store(); const room = await createRoom('u1', 'Euer Raum', data);
  await assert.rejects(() => joinRoom('u2', 'NOPE', data), /ungültig/);
  await joinRoom('u2', ` ${room.invite_code.slice(0, 3)} ${room.invite_code.slice(3)} `, data);
  assert.equal(data.users[1].room_role, 'member');
  await assert.rejects(() => joinRoom('u3', room.invite_code, data), /vollständig/);
  await assert.rejects(() => createRoom('u2', 'Neu', data), /bereits in einem Raum/);
});

test('member leaves without deleting shared room', async () => {
  const data = store(); const room = await createRoom('u1', 'Euer Raum', data); await joinRoom('u2', room.invite_code, data);
  await leaveRoom('u2', data);
  assert.equal(data.users[1].room_id, null); assert.equal(data.rooms[0].status, 'active'); assert.deepEqual(data.rooms[0].members, ['u1']);
});

test('only owner deletes and deleted room cannot be joined', async () => {
  const data = store(); const room = await createRoom('u1', 'Euer Raum', data); await joinRoom('u2', room.invite_code, data);
  await assert.rejects(() => deleteRoom('u2', data), /Nur Owner/);
  await deleteRoom('u1', data);
  assert.equal(data.rooms[0].status, 'deleted'); assert.equal(data.users[0].room_id, null); assert.equal(data.users[1].room_id, null);
  await assert.rejects(() => joinRoom('u3', room.invite_code, data), /nicht mehr verfügbar/);
});
