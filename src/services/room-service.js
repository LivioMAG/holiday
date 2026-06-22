import { getMemoryStore } from './memory-supabase.js';
import { getSupabaseClient } from './supabase-client.js';

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
function isSupabaseClient() { return typeof getSupabaseClient().from === 'function'; }
function dbError(error, fallback) { if (error) throw new Error(error.message || fallback); }
function memberIds(room) { return room.room_memberships?.filter((item) => item.active).map((item) => item.user_id) || room.members || []; }
function withMembers(room) { return room ? { ...room, members: memberIds(room) } : null; }

export async function getProfileForUser(userId) {
  if (!isSupabaseClient()) return getCurrentUser(storeFallback(), userId);
  const { data, error } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).maybeSingle();
  dbError(error, 'Dein Profil konnte nicht geladen werden.');
  if (!data) throw new Error('Bitte melde dich erneut an.');
  return data;
}

export async function getActiveRoomForUser(userId, externalStore = getWritableStore() || storeFallback()) {
  if (!isSupabaseClient() || externalStore) {
    const user = externalStore.users.find((item) => item.id === userId);
    if (!user?.room_id) return null;
    return externalStore.rooms.find((room) => room.id === user.room_id && room.status === 'active') || null;
  }
  const { data: profile, error: profileError } = await getSupabaseClient().from('profiles').select('room_id').eq('id', userId).maybeSingle();
  dbError(profileError, 'Dein Profil konnte nicht geladen werden.');
  if (!profile?.room_id) return null;
  const { data, error } = await getSupabaseClient().from('rooms').select('*, room_memberships(user_id, active)').eq('id', profile.room_id).eq('status', 'active').maybeSingle();
  dbError(error, 'Der Raum konnte nicht geladen werden.');
  return withMembers(data);
}

async function createRoomInSupabase(userId, name) {
  if (await getActiveRoomForUser(userId, null)) throw new Error('Du bist bereits in einem Raum. Verlasse zuerst deinen aktuellen Raum, um einem anderen Raum beizutreten oder einen neuen Raum zu erstellen.');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: room, error } = await getSupabaseClient().from('rooms').insert({ name, invite_code: inviteCode, owner_id: userId }).select().single();
    if (error?.code === '23505') continue;
    dbError(error, 'Der Raum konnte nicht in Supabase erstellt werden.');
    const { error: membershipError } = await getSupabaseClient().from('room_memberships').insert({ room_id: room.id, user_id: userId, role: 'owner' });
    dbError(membershipError, 'Die Mitgliedschaft konnte nicht in Supabase gespeichert werden.');
    const { error: profileError } = await getSupabaseClient().from('profiles').update({ room_id: room.id, room_role: 'owner', updated_at: now() }).eq('id', userId);
    dbError(profileError, 'Dein Profil konnte nicht aktualisiert werden.');
    return { ...room, members: [userId] };
  }
  throw new Error('Es konnte kein eindeutiger Einladungscode erstellt werden.');
}

export async function getRoomPartner(userId, roomId) {
  if (!roomId) return null;
  if (!isSupabaseClient()) {
    return storeFallback().users.find((item) => item.room_id === roomId && item.id !== userId) || null;
  }
  const { data, error } = await getSupabaseClient().from('profiles').select('*').eq('room_id', roomId).neq('id', userId).maybeSingle();
  dbError(error, 'Die Partnerperson konnte nicht geladen werden.');
  return data;
}

export async function createRoom(userId, name = 'Euer Raum', externalStore = getWritableStore()) {
  if (isSupabaseClient() && !externalStore) return createRoomInSupabase(userId, name);
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const user = getCurrentUser(store, userId);
  if (await getActiveRoomForUser(userId, store)) throw new Error('Du bist bereits in einem Raum. Verlasse zuerst deinen aktuellen Raum, um einem anderen Raum beizutreten oder einen neuen Raum zu erstellen.');
  const inviteCode = generateInviteCode(new Set(store.rooms.map((room) => room.invite_code)));
  const room = { id: id(), name, invite_code: inviteCode, owner_id: userId, members: [userId], status: 'active', created_at: now(), updated_at: now() };
  store.rooms.push(room); user.room_id = room.id; user.room_role = 'owner'; user.updated_at = now(); return room;
}

export async function joinRoom(userId, rawCode, externalStore = getWritableStore()) {
  if (isSupabaseClient() && !externalStore) {
    if (await getActiveRoomForUser(userId, null)) throw new Error('Du bist bereits in einem Raum. Verlasse zuerst deinen aktuellen Raum, um einem anderen Raum beizutreten oder einen neuen Raum zu erstellen.');
    const code = normalizeInviteCode(rawCode);
    const { data: room, error } = await getSupabaseClient().from('rooms').select('*, room_memberships(user_id, active)').eq('invite_code', code).maybeSingle();
    dbError(error, 'Der Raum konnte nicht geladen werden.');
    if (!room) throw new Error('Dieser Einladungscode ist ungültig.');
    if (room.status !== 'active') throw new Error('Dieser Raum ist nicht mehr verfügbar.');
    if (memberIds(room).length >= 2) throw new Error('Dieser Raum ist bereits vollständig.');
    const { error: membershipError } = await getSupabaseClient().from('room_memberships').insert({ room_id: room.id, user_id: userId, role: 'member' });
    dbError(membershipError, 'Die Mitgliedschaft konnte nicht in Supabase gespeichert werden.');
    const { error: profileError } = await getSupabaseClient().from('profiles').update({ room_id: room.id, room_role: 'member', updated_at: now() }).eq('id', userId);
    dbError(profileError, 'Dein Profil konnte nicht aktualisiert werden.');
    return { ...room, members: [...memberIds(room), userId] };
  }
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const user = getCurrentUser(store, userId);
  if (await getActiveRoomForUser(userId, store)) throw new Error('Du bist bereits in einem Raum. Verlasse zuerst deinen aktuellen Raum, um einem anderen Raum beizutreten oder einen neuen Raum zu erstellen.');
  const code = normalizeInviteCode(rawCode);
  const room = store.rooms.find((item) => item.invite_code === code);
  if (!room) throw new Error('Dieser Einladungscode ist ungültig.');
  if (room.status !== 'active') throw new Error('Dieser Raum ist nicht mehr verfügbar.');
  if (room.members.includes(userId)) throw new Error('Du bist bereits Mitglied dieses Raumes.');
  if (room.members.length >= 2) throw new Error('Dieser Raum ist bereits vollständig.');
  room.members.push(userId); room.updated_at = now(); user.room_id = room.id; user.room_role = 'member'; user.updated_at = now(); return room;
}

export async function leaveRoom(userId, externalStore = getWritableStore()) {
  if (isSupabaseClient() && !externalStore) {
    const profile = await getProfileForUser(userId);
    const room = await getActiveRoomForUser(userId, null);
    if (!room) throw new Error('Du bist aktuell in keinem Raum.');
    if (profile.room_role === 'owner') throw new Error('Owner können den Raum im MVP nicht verlassen. Bitte lösche den Raum, wenn er nicht mehr genutzt werden soll.');
    const { error: membershipError } = await getSupabaseClient().from('room_memberships').update({ active: false }).eq('room_id', room.id).eq('user_id', userId);
    dbError(membershipError, 'Die Mitgliedschaft konnte nicht aktualisiert werden.');
    const { error: profileError } = await getSupabaseClient().from('profiles').update({ room_id: null, room_role: null, updated_at: now() }).eq('id', userId);
    dbError(profileError, 'Dein Profil konnte nicht aktualisiert werden.');
    return true;
  }
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const user = getCurrentUser(store, userId); const room = await getActiveRoomForUser(userId, store);
  if (!room) throw new Error('Du bist aktuell in keinem Raum.');
  if (user.room_role === 'owner') throw new Error('Owner können den Raum im MVP nicht verlassen. Bitte lösche den Raum, wenn er nicht mehr genutzt werden soll.');
  room.members = room.members.filter((memberId) => memberId !== userId); room.updated_at = now(); user.room_id = null; user.room_role = null; user.updated_at = now(); return true;
}
export async function deleteRoom(userId, externalStore = getWritableStore()) {
  if (isSupabaseClient() && !externalStore) {
    const room = await getActiveRoomForUser(userId, null);
    if (!room) throw new Error('Du bist aktuell in keinem Raum.');
    if (room.owner_id !== userId) throw new Error('Nur Owner dürfen einen Raum löschen.');
    const { error: roomError } = await getSupabaseClient().from('rooms').update({ status: 'deleted', updated_at: now() }).eq('id', room.id);
    dbError(roomError, 'Der Raum konnte nicht gelöscht werden.');
    const { error: membershipsError } = await getSupabaseClient().from('room_memberships').update({ active: false }).eq('room_id', room.id);
    dbError(membershipsError, 'Die Mitgliedschaften konnten nicht aktualisiert werden.');
    const { error: profilesError } = await getSupabaseClient().from('profiles').update({ room_id: null, room_role: null, updated_at: now() }).eq('room_id', room.id);
    dbError(profilesError, 'Die Profile konnten nicht aktualisiert werden.');
    return true;
  }
  const store = externalStore || (await import('./memory-supabase.js')).getMemoryStore();
  const room = await getActiveRoomForUser(userId, store);
  if (!room) throw new Error('Du bist aktuell in keinem Raum.');
  if (room.owner_id !== userId) throw new Error('Nur Owner dürfen einen Raum löschen.');
  room.status = 'deleted'; room.updated_at = now();
  store.users.filter((user) => user.room_id === room.id).forEach((user) => { user.room_id = null; user.room_role = null; user.updated_at = now(); });
  room.members = []; return true;
}
