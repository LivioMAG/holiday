import { getSession, logoutUser } from './services/auth-service.js';
import { initializeSupabaseClient } from './services/supabase-client.js';
import { renderAuth } from './modules/auth/auth-screens.js';
import { renderRoomChoice, renderRoomManagement } from './modules/rooms/room-screens.js';
import { getActiveRoomForUser } from './services/room-service.js';
import { getMemoryStore } from './services/memory-supabase.js';

const app = document.getElementById('app');
function renderLoading() { app.innerHTML = '<section class="card stack"><h1>Holiday</h1><p>Wir bereiten deinen privaten Bereich vor …</p></section>'; }
function currentUser(session) { const store = getMemoryStore(); return store.users.find((user) => user.id === session?.user?.id) || session?.user || null; }
export async function renderApp() {
  renderLoading();
  const session = await getSession();
  const user = currentUser(session);
  if (!user) { renderAuth(app, renderApp); return; }
  const store = getMemoryStore();
  const room = getActiveRoomForUser(user.id, store);
  if (!room) { renderRoomChoice(app, user, renderApp); return; }
  const partner = store.users.find((item) => item.room_id === room.id && item.id !== user.id);
  renderRoomManagement(app, user, room, partner, renderApp);
  app.querySelector('#logout')?.addEventListener('click', async () => { await logoutUser(); await initializeSupabaseClient().then(renderApp); });
}
initializeSupabaseClient().then(renderApp);
