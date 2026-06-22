import { createRoom, deleteRoom, joinRoom, leaveRoom } from '../../services/room-service.js';
import { escapeHtml, formData, showError } from '../../ui/dom.js';

export function renderRoomChoice(app, user, refresh) {
  app.innerHTML = `<section class="card stack"><h1>Euer Raum wartet.</h1><p>Erstelle einen neuen privaten Raum oder tritt per Code dem Raum deiner Partnerperson bei.</p><div class="actions"><button id="create" class="button-primary">Raum erstellen</button><button id="join" class="button-secondary">Per Code beitreten</button></div><div id="room-flow"></div></section>`;
  app.querySelector('#create').onclick = () => renderCreate(app.querySelector('#room-flow'), user, refresh);
  app.querySelector('#join').onclick = () => renderJoin(app.querySelector('#room-flow'), user, refresh);
}
function renderCreate(target, user, refresh) {
  target.innerHTML = `<div class="card stack"><h2>Erstelle euren Raum.</h2><p>Du wirst Owner dieses Raumes und kannst deine Partnerperson per Code einladen.</p><div data-error></div><button class="button-primary">Raum erstellen</button></div>`;
  target.querySelector('button').onclick = async () => { const error = target.querySelector('[data-error]'); try { const room = await createRoom(user.id); target.innerHTML = `<div class="card stack"><h2>Euer Einladungscode</h2><p>Teile diesen Code mit deiner Partnerperson.</p><strong class="code">${escapeHtml(room.invite_code)}</strong><div class="actions"><button class="button-primary" id="share">Code teilen</button><button class="button-secondary" id="next">Weiter</button></div></div>`; target.querySelector('#share').onclick = () => navigator.share?.({ text: room.invite_code }) || navigator.clipboard?.writeText(room.invite_code); target.querySelector('#next').onclick = refresh; } catch (err) { showError(error, err.message); } };
}
function renderJoin(target, user, refresh) {
  target.innerHTML = `<form class="card stack"><h2>Tritt einem Raum bei.</h2><p>Gib den Einladungscode ein, den du von deiner Partnerperson erhalten hast.</p><label>Einladungscode<input name="code" placeholder="Code eingeben" /></label><div data-error></div><button class="button-primary">Raum beitreten</button></form>`;
  target.querySelector('form').onsubmit = async (event) => { event.preventDefault(); const error = target.querySelector('[data-error]'); try { await joinRoom(user.id, formData(event.currentTarget).code); target.innerHTML = '<div class="alert success">Du bist diesem Raum beigetreten.</div>'; await refresh(); } catch (err) { showError(error, err.message); } };
}
export function renderRoomManagement(app, user, room, partner, refresh) {
  const role = user.room_role === 'owner' ? 'Owner' : 'Mitglied';
  app.innerHTML = `<section class="card stack"><h1>${escapeHtml(room.name || 'Euer Raum')}</h1><p>Verwaltet euren gemeinsamen privaten Bereich.</p><div class="grid"><div><span class="meta">Deine Rolle</span><h2>${role}</h2></div><div><span class="meta">Einladungscode</span><h2>${escapeHtml(room.invite_code)}</h2></div><div><span class="meta">Partnerperson</span><h2>${partner ? escapeHtml(`${partner.first_name || ''} ${partner.last_name || ''}`.trim()) : 'Noch offen'}</h2></div></div><div data-error></div><div class="actions">${user.room_role === 'member' ? '<button id="leave" class="button-secondary">Raum verlassen</button>' : ''}${user.room_role === 'owner' ? '<button id="delete" class="button-danger">Raum löschen</button>' : ''}<button id="logout" class="button-secondary">Logout</button></div></section>`;
  app.querySelector('#leave')?.addEventListener('click', async () => { if (confirm('Möchtest du diesen Raum wirklich verlassen?')) { try { await leaveRoom(user.id); await refresh(); } catch (err) { showError(app.querySelector('[data-error]'), err.message); } } });
  app.querySelector('#delete')?.addEventListener('click', async () => { if (confirm('Möchtest du diesen Raum wirklich löschen? Alle gemeinsamen Inhalte gehen verloren.')) { try { await deleteRoom(user.id); await refresh(); } catch (err) { showError(app.querySelector('[data-error]'), err.message); } } });
}
