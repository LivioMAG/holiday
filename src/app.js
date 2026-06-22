import { getProfile, getSession, logoutUser } from './services/auth-service.js';
import { initializeSupabaseClient } from './services/supabase-client.js';
import { renderAuth } from './modules/auth/auth-screens.js';
import { renderRoomChoice, renderRoomManagement } from './modules/rooms/room-screens.js';
import { getActiveRoomForUser, getRoomPartner } from './services/room-service.js';
import { getMemoryStore } from './services/memory-supabase.js';

const app = document.getElementById('app');
function renderLoading() { app.innerHTML = '<section class="card stack"><h1>Holiday</h1><p>Wir bereiten deinen privaten Bereich vor …</p></section>'; }
async function currentUser(session) { const store = getMemoryStore(); const memoryUser = store.users.find((user) => user.id === session?.user?.id); if (memoryUser) return memoryUser; return (await getProfile(session?.user?.id)) || session?.user || null; }
export async function renderApp() {
  renderLoading();
  const session = await getSession();
  const user = await currentUser(session);
  if (!user) { renderAuth(app, renderApp); return; }
  const room = await getActiveRoomForUser(user.id, null);
  if (!room) { renderRoomChoice(app, user, renderApp); return; }
  const partner = await getRoomPartner(user.id, room.id);
  renderRoomManagement(app, user, room, partner, renderApp);
  app.querySelector('#logout')?.addEventListener('click', async () => { await logoutUser(); await initializeSupabaseClient().then(renderApp); });
}
initializeSupabaseClient().then(renderApp);
