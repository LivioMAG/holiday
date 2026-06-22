import { getMemoryStore } from './memory-supabase.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const normalizeInviteCode = (code) => String(code || '').trim().toUpperCase().replace(/\s+/g, '');
export function generateInviteCode(existingCodes = new Set()) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!existingCodes.has(code)) return code;
  }
  throw new Error('Es konnte kein eindeutiger Einladungscode erstellt werden.');
}
const now = () => new Date().toISOString();
const id = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
function getWritableStore() { return globalThis.__HOLIDAY_MEMORY_STORE__ || null; }
function storeFallback() { return getMemoryStore(); }
function getCurrentUser(store, userId) { const user = store.users.find((item) => item.id === userId); if (!user) throw new Error('Bitte melde dich erneut an.'); return user; }
export function getActiveRoomForUser(userId, externalStore = getWritableStore() || storeFallback()) {
  const user = externalStore.users.find((item) => item.id === userId);
  if (!user?.room_id) return null;
  return externalStore.rooms.find((room) => room.id === user.room_id && room.status === 'active') || null;
}
export async function createRoom(userId, name = 'Euer Raum', externalStore = getWritableStore()) {
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const user = getCurrentUser(store, userId);
  if (getActiveRoomForUser(userId, store)) throw new Error('Du bist bereits in einem Raum. Verlasse zuerst deinen aktuellen Raum, um einem anderen Raum beizutreten oder einen neuen Raum zu erstellen.');
  const inviteCode = generateInviteCode(new Set(store.rooms.map((room) => room.invite_code)));
  const room = { id: id(), name, invite_code: inviteCode, owner_id: userId, members: [userId], status: 'active', created_at: now(), updated_at: now() };
  store.rooms.push(room); user.room_id = room.id; user.room_role = 'owner'; user.updated_at = now(); return room;
}
export async function joinRoom(userId, rawCode, externalStore = getWritableStore()) {
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const user = getCurrentUser(store, userId);
  if (getActiveRoomForUser(userId, store)) throw new Error('Du bist bereits in einem Raum. Verlasse zuerst deinen aktuellen Raum, um einem anderen Raum beizutreten oder einen neuen Raum zu erstellen.');
  const code = normalizeInviteCode(rawCode);
  const room = store.rooms.find((item) => item.invite_code === code);
  if (!room) throw new Error('Dieser Einladungscode ist ungültig.');
  if (room.status !== 'active') throw new Error('Dieser Raum ist nicht mehr verfügbar.');
  if (room.members.includes(userId)) throw new Error('Du bist bereits Mitglied dieses Raumes.');
  if (room.members.length >= 2) throw new Error('Dieser Raum ist bereits vollständig.');
  room.members.push(userId); room.updated_at = now(); user.room_id = room.id; user.room_role = 'member'; user.updated_at = now(); return room;
}
export async function leaveRoom(userId, externalStore = getWritableStore()) {
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const user = getCurrentUser(store, userId); const room = getActiveRoomForUser(userId, store);
  if (!room) throw new Error('Du bist aktuell in keinem Raum.');
  if (user.room_role === 'owner') throw new Error('Owner können den Raum im MVP nicht verlassen. Bitte lösche den Raum, wenn er nicht mehr genutzt werden soll.');
  room.members = room.members.filter((memberId) => memberId !== userId); room.updated_at = now(); user.room_id = null; user.room_role = null; user.updated_at = now(); return true;
}
export async function deleteRoom(userId, externalStore = getWritableStore()) {
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const room = getActiveRoomForUser(userId, store);
  if (!room) throw new Error('Du bist aktuell in keinem Raum.');
  if (room.owner_id !== userId) throw new Error('Nur Owner dürfen einen Raum löschen.');
  room.status = 'deleted'; room.updated_at = now();
  store.users.filter((user) => user.room_id === room.id).forEach((user) => { user.room_id = null; user.room_role = null; user.updated_at = now(); });
  room.members = []; return true;
}
