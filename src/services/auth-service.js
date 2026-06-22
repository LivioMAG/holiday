import { getSupabaseClient } from './supabase-client.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateRegistration({ firstName, lastName, email, password }) {
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) throw new Error('Bitte fülle alle Felder aus.');
  if (!emailPattern.test(email.trim())) throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.');
  if (password.length < 8) throw new Error('Bitte wähle ein Passwort mit mindestens 8 Zeichen.');
}
export function validateLogin({ email, password }) {
  if (!email?.trim() || !password) throw new Error('Bitte gib E-Mail-Adresse und Passwort ein.');
  if (!emailPattern.test(email.trim())) throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.');
}
function profileFromRegistration(user, payload) {
  return {
    id: user.id,
    email: payload.email.trim().toLowerCase(),
    first_name: payload.firstName.trim(),
    last_name: payload.lastName.trim(),
    room_id: null,
    room_role: null,
  };
}
export async function upsertProfile(profile) {
  const supabase = getSupabaseClient();
  if (typeof supabase.from !== 'function') return profile;
  const { data, error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' }).select().single();
  if (error) throw new Error(error.message || 'Das Profil konnte nicht in Supabase gespeichert werden.');
  return data;
}
export async function getProfile(userId) {
  const supabase = getSupabaseClient();
  if (!userId || typeof supabase.from !== 'function') return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message || 'Das Profil konnte nicht aus Supabase geladen werden.');
  return data;
}
export async function registerUser(payload) {
  validateRegistration(payload);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({ email: payload.email.trim().toLowerCase(), password: payload.password, options: { data: { firstName: payload.firstName.trim(), lastName: payload.lastName.trim() } } });
  if (error) throw new Error(error.message || 'Die Registrierung hat leider nicht geklappt.');
  if (data?.user) await upsertProfile(profileFromRegistration(data.user, payload));
  return data;
}
export async function loginUser(payload) {
  validateLogin(payload);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: payload.email.trim().toLowerCase(), password: payload.password });
  if (error) throw new Error(error.message || 'Der Login hat leider nicht geklappt.');
  return data;
}
export async function logoutUser() { const { error } = await getSupabaseClient().auth.signOut(); if (error) throw error; }
export async function getSession() { const { data, error } = await getSupabaseClient().auth.getSession(); if (error) throw error; return data.session; }
