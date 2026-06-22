const store = { users: [], rooms: [], session: null };
globalThis.__HOLIDAY_MEMORY_STORE__ = store;
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const now = () => new Date().toISOString();
const uuid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
export function resetMemoryStore() { store.users = []; store.rooms = []; store.session = null; }
export function getMemoryStore() { return clone(store); }
export const memorySupabase = {
  auth: {
    async signUp({ email, password, options }) {
      if (store.users.some((user) => user.email === email.toLowerCase())) return { data: null, error: { message: 'Diese E-Mail-Adresse ist bereits registriert.' } };
      const user = { id: uuid(), email: email.toLowerCase(), password, first_name: options?.data?.firstName, last_name: options?.data?.lastName, room_id: null, room_role: null, created_at: now(), updated_at: now() };
      store.users.push(user); store.session = { user: clone(user) }; return { data: { user: clone(user), session: clone(store.session) }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const user = store.users.find((item) => item.email === email.toLowerCase() && item.password === password);
      if (!user) return { data: null, error: { message: 'E-Mail-Adresse oder Passwort stimmt nicht.' } };
      store.session = { user: clone(user) }; return { data: { user: clone(user), session: clone(store.session) }, error: null };
    },
    async signOut() { store.session = null; return { error: null }; },
    async getSession() { return { data: { session: clone(store.session) }, error: null }; },
    onAuthStateChange(callback) { callback(store.session ? 'SIGNED_IN' : 'SIGNED_OUT', clone(store.session)); return { data: { subscription: { unsubscribe() {} } } }; }
  }
};
