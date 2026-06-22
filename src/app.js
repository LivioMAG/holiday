import { formatLongDate, formatMonth, localDateKey } from './utils/date-utils.js'
import { createSupabaseClient } from './services/supabase-client.js'
import { addCheckin, bucketCategories, bucketStatuses, createLocalAccount, createMemoryDraftFromBucket, createRoom, deleteBucketItem, deleteMemory, deleteRoom, getCheckinStatus, hasRoom, isHost, joinRoom, leaveRoom, loadState, moods, openReveal, persistState, saveBucketItem, saveMemory, signInLocal, signOutLocal, updateBucketStatus } from './services/between-us-store.js'

const app = document.querySelector('#app')
let state = loadState()
let modal = ''
let toast = ''
let bucketFilter = 'alle'
let onboardingStep = 0
let supabaseStatus = { isConfigured: false, message: 'Supabase wird geprüft.' }
const onboarding = [
  ['Euer privater Raum.', 'Ein Ort für tägliche Nähe, schöne Erinnerungen und gemeinsame Wünsche.'],
  ['Paar verbinden', 'Erstellt einen privaten Paarraum oder gebt einen Einladungscode ein.'],
  ['Das tägliche Ritual', 'Beantwortet jeden Tag eine Frage. Eure Antworten werden sichtbar, sobald ihr beide geantwortet habt.'],
  ['Ein Moment pro Tag', 'Nicht alles. Nur das, was bleiben soll.'],
  ['Gemeinsame Wünsche', 'Sammelt Dates, Reisen, Rituale und Ziele, die ihr gemeinsam erleben möchtet.'],
]

function commit(message) { persistState(state); toast = message || ''; render(); if (toast) setTimeout(() => { toast = ''; render() }, 2600) }
function esc(value='') { return String(value).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])) }
function viewTitle() { return state.activeView === 'today' ? 'Heute' : state.activeView === 'memories' ? 'Memorys' : 'Bucketlist' }

async function initSupabase() {
  const { client, config } = await createSupabaseClient()
  window.betweenUsSupabase = client
  supabaseStatus = { isConfigured: Boolean(client), message: config.message }
  if (client) {
    const { data } = await client.auth.getSession()
    const user = data.session?.user
    if (user) state.auth = { user: { id: user.id, email: user.email, name: user.email?.split('@')[0] || 'Du' } }
  }
  render()
}

function render() {
  app.dataset.theme = state.theme
  app.innerHTML = !state.auth?.user ? authView() : !hasRoom(state) ? roomGateView() : shell()
  bind()
}

function shell() { return `<main class="screen"><div class="topbar"><div><div class="eyebrow">Between Us · ${isHost(state) ? 'Host' : 'Member'}</div><h2>${viewTitle()}</h2><small>${esc(state.auth.user.email)} · Code ${esc(state.pair.inviteCode)}</small></div><button class="btn ghost" data-action="theme" aria-label="Theme wechseln">${state.theme === 'dark' ? 'Hell' : 'Dunkel'}</button></div>${roomPanel()}${state.activeView === 'today' ? todayView() : state.activeView === 'memories' ? memoriesView() : bucketView()}</main>${nav()}${modal}${toast ? `<div class="toast" role="status">${toast}</div>` : ''}` }

function authView() {
  return `<main class="screen stack auth-screen"><div class="hero-orb" aria-hidden="true"></div><section class="card stack"><div class="eyebrow">Login erforderlich</div><h1>Willkommen bei Between Us</h1><p>Melde dich mit E-Mail und Passwort an. Beide Partner brauchen einen eigenen Account, bevor ihr euch über einen Raum verbinden könnt.</p><form class="stack" id="auth-form"><label class="field">E-Mail<input name="email" type="email" autocomplete="email" required placeholder="du@example.com" /></label><label class="field">Passwort<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="Mindestens 6 Zeichen" /></label><div class="grid2"><button class="btn secondary" name="mode" value="signup">Account erstellen</button><button class="btn" name="mode" value="signin">Einloggen</button></div></form><small>${esc(supabaseStatus.message)}</small></section>${toast ? `<div class="toast" role="status">${toast}</div>` : ''}</main>`
}

function roomGateView() {
  return `<main class="screen stack"><div class="topbar"><div><div class="eyebrow">Leere Oberfläche</div><h2>Raum erstellen oder beitreten</h2><small>${esc(state.auth.user.email)}</small></div><button class="btn ghost" data-action="logout">Logout</button></div><section class="card stack"><h2>Neuen Paarraum erstellen</h2><p>Du wirst Host. Du kannst den Raum später löschen und bist die Person, die später bezahlt.</p><button class="btn" data-action="create-room">Raum erstellen</button></section><section class="card stack"><h2>Raum beitreten</h2><p>Gib den sechsstelligen Einladungscode deines Partners ein. Du kannst nur einem Raum beitreten.</p><form class="stack" id="join-room-form"><label class="field">Einladungscode<input name="inviteCode" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" placeholder="123456" required /></label><button class="btn secondary">Beitreten</button></form></section>${toast ? `<div class="toast" role="status">${toast}</div>` : ''}</main>`
}

function roomPanel() {
  return `<section class="card stack room-panel"><div><div class="eyebrow">Euer Raum</div><h3>Einladungscode: ${esc(state.pair.inviteCode)}</h3><p>${isHost(state) ? 'Du bist Host. Teile den Code mit deinem Partner oder lösche den Raum bei Bedarf.' : 'Du bist Member. Du kannst die Verbindung jederzeit verlassen.'}</p></div><div class="chips"><button class="chip" data-action="copy-code">Code kopieren</button><button class="chip" data-action="leave-room">Trennen</button>${isHost(state) ? `<button class="chip danger-chip" data-action="delete-room">Raum löschen</button>` : ''}<button class="chip" data-action="logout">Logout</button></div></section>`
}

function nav() { return `<nav class="bottom-nav" aria-label="Hauptnavigation">${[['today','Heute','◐'],['memories','Memorys','◇'],['bucket','Bucketlist','＋']].map(([id,label,icon]) => `<button class="nav-item ${state.activeView===id?'active':''}" data-view="${id}"><span aria-hidden="true">${icon}</span><span>${label}</span></button>`).join('')}</nav>` }

function onboardingView() { const [title,text] = onboarding[onboardingStep]; return `<main class="screen stack"><div class="hero-orb" aria-hidden="true"></div><section class="card stack"><div class="eyebrow">Schritt ${onboardingStep+1} von ${onboarding.length}</div><h1>${title}</h1><p>${text}</p>${onboardingStep===1 ? `<div class="card"><strong>Einladungscode</strong><h2>${state.pair.inviteCode}</h2><label class="field">Code eingeben<input id="invite" placeholder="z. B. US-4287" /></label></div>`:''}<div class="grid2"><button class="btn secondary" data-action="skip">Überspringen</button><button class="btn" data-action="next-onboarding">${onboardingStep===0?'Gemeinsam starten':onboardingStep===onboarding.length-1?'Zum Check-in':'Weiter'}</button></div></section></main>` }

function todayView() { const status = getCheckinStatus(state); const memory = state.memories.find((m) => m.date === localDateKey()); const inspiration = state.bucketItems.find((i) => i.status !== 'erlebt') || state.bucketItems[0]; return `<section class="stack"><p>${formatLongDate(state.dailyQuestion.date)} · Schön, dass ihr euch heute Zeit füreinander nehmt.</p><article class="card stack"><div class="eyebrow">Tagesfrage</div><h2>${state.dailyQuestion.text}</h2>${checkinStatus(status)}${!status.me ? checkinForm() : ''}${status.bothAnswered && !status.revealOpen ? `<button class="btn" data-action="reveal">Gemeinsamen Reveal öffnen</button>` : ''}${status.revealOpen ? revealView(status) : ''}${status.me && !status.partner ? `<button class="btn ghost" data-action="simulate">Demo: Partnerantwort simulieren</button>` : ''}</article><article class="card"><div class="eyebrow">Memory des Tages</div>${memory ? `<h3>${esc(memory.title)}</h3><p>${esc(memory.text)}</p><button class="btn secondary" data-edit-memory="${memory.id}">Öffnen</button>` : `<p>Noch kein Moment gespeichert. Ein Memory pro Tag reicht.</p><button class="btn secondary" data-new-memory="today">Memory anlegen</button>`}</article><article class="card"><div class="eyebrow">Leise Inspiration</div><h3>${esc(inspiration?.title || 'Ein kleiner Wunsch für euch')}</h3><p>Wunsch → Erlebnis → Erinnerung</p></article></section>` }
function checkinStatus(s) { if (!s.me && !s.partner) return `<div class="status-row"><div class="status-pill">Du: offen</div><div class="status-pill">Partnerperson: offen</div></div>`; if (s.me && !s.partner) return `<div class="card">Deine Antwort ist sicher gespeichert. Warte noch auf die Antwort deiner Partnerperson.</div>`; if (!s.me && s.partner) return `<div class="card">Die Antwort deiner Partnerperson ist da. Deine fehlt noch.</div>`; return `<div class="card">Eure Antworten sind da.</div>` }
function checkinForm() { return `<form class="stack" id="checkin-form"><div class="chips">${moods.map((m,i)=>`<button type="button" class="chip ${i===0?'active':''}" data-mood="${m}">${m}</button>`).join('')}</div><input type="hidden" name="mood" value="verbunden" /><label class="field">Deine Antwort<textarea name="text" required placeholder="Ein paar ehrliche Sätze genügen."></textarea></label><button class="btn">Antwort geschützt speichern</button></form>` }
function revealView(s) { return `<div class="grid2"><article class="card"><strong>Du</strong><p>${esc(s.me.text)}</p><small>${esc(s.me.mood)}</small></article><article class="card"><strong>Partnerperson</strong><p>${esc(s.partner.text)}</p><small>${esc(s.partner.mood)}</small></article></div><div class="chips">${['Das bedeutet mir viel','Danke','Umarmung','Lass uns darüber sprechen'].map(r=>`<button class="chip" data-reaction="${r}">${r}</button>`).join('')}</div>` }

function memoriesView() { const groups = [...state.memories].sort((a,b)=>b.date.localeCompare(a.date)).reduce((acc,m)=>{(acc[formatMonth(m.date)] ||= []).push(m); return acc},{}); return `<section class="stack"><button class="btn" data-new-memory="blank">Neues Memory</button>${state.memories.length ? `<div class="timeline">${Object.entries(groups).map(([month,items])=>`<div><div class="month">${month}</div>${items.map(m=>`<article class="card memory-card"><small>${formatLongDate(m.date)}</small><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p><div class="chips"><button class="chip" data-edit-memory="${m.id}">Bearbeiten</button><button class="chip" data-delete-memory="${m.id}">Löschen</button></div></article>`).join('')}</div>`).join('')}</div>` : `<div class="empty"><h3>Noch keine Memorys</h3><p>Speichert einen Moment, der bleiben soll.</p></div>`}</section>` }

function bucketView() { const items = state.bucketItems.filter(i => bucketFilter === 'alle' || i.status === bucketFilter); return `<section class="stack"><div class="segment"><button class="${bucketFilter==='alle'?'active':''}" data-filter="alle">Alle</button>${bucketStatuses.map(s=>`<button class="${bucketFilter===s?'active':''}" data-filter="${s}">${s}</button>`).join('')}</div><button class="btn" data-edit-bucket="new">Wunsch hinzufügen</button>${items.map(i=>`<article class="card stack"><div class="eyebrow">${esc(i.category)} · ${esc(i.status)}</div><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p><div class="chips">${bucketStatuses.map(s=>`<button class="chip ${i.status===s?'active':''}" data-status="${i.id}|${s}">${s}</button>`).join('')}</div><div class="chips"><button class="chip" data-edit-bucket="${i.id}">Bearbeiten</button>${i.status==='erlebt'?`<button class="chip" data-bucket-memory="${i.id}">Memory erstellen</button>`:''}<button class="chip" data-delete-bucket="${i.id}">Löschen</button></div></article>`).join('') || `<div class="empty">Hier ist noch Raum für gemeinsame Wünsche.</div>`}</section>` }

function memoryModal(memory = { date: localDateKey(), title:'', text:'', mood:'verbunden', image:'', bucketItemId:'' }) { modal = `<div class="modal"><form class="card stack" id="memory-form"><h2>Memory speichern</h2><input name="id" type="hidden" value="${memory.id||''}" /><label class="field">Datum<input name="date" type="date" value="${memory.date}" /></label><label class="field">Titel<input name="title" value="${esc(memory.title)}" required /></label><label class="field">Was soll bleiben?<textarea name="text" required>${esc(memory.text)}</textarea></label><label class="field">Stimmung<select name="mood">${moods.map(m=>`<option ${memory.mood===m?'selected':''}>${m}</option>`)}</select></label><input name="image" type="hidden" value="${memory.image||''}" /><input name="bucketItemId" type="hidden" value="${memory.bucketItemId||''}" /><div class="grid2"><button class="btn secondary" type="button" data-action="close">Abbrechen</button><button class="btn">Speichern</button></div></form></div>`; render() }
function bucketModal(item = { title:'', description:'', category:'Dates', status:'Wunsch', targetDate:'', place:'' }) { modal = `<div class="modal"><form class="card stack" id="bucket-form"><h2>Gemeinsamer Wunsch</h2><input name="id" type="hidden" value="${item.id||''}" /><label class="field">Titel<input name="title" value="${esc(item.title)}" required /></label><label class="field">Beschreibung<textarea name="description">${esc(item.description)}</textarea></label><label class="field">Kategorie<select name="category">${bucketCategories.map(c=>`<option ${item.category===c?'selected':''}>${c}</option>`)}</select></label><label class="field">Status<select name="status">${bucketStatuses.map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`)}</select></label><label class="field">Zieldatum<input name="targetDate" type="date" value="${item.targetDate||''}" /></label><label class="field">Ort<input name="place" value="${esc(item.place||'')}" /></label><div class="grid2"><button class="btn secondary" type="button" data-action="close">Abbrechen</button><button class="btn">Speichern</button></div></form></div>`; render() }

async function handleAuth(e) {
  e.preventDefault()
  const submitter = e.submitter?.value || 'signin'
  const values = Object.fromEntries(new FormData(e.target))
  try {
    if (window.betweenUsSupabase) {
      const result = submitter === 'signup'
        ? await window.betweenUsSupabase.auth.signUp({ email: values.email, password: values.password })
        : await window.betweenUsSupabase.auth.signInWithPassword({ email: values.email, password: values.password })
      if (result.error) throw result.error
      const user = result.data.user || result.data.session?.user
      state.auth = { user: { id: user.id, email: user.email, name: user.email?.split('@')[0] || 'Du' } }
    } else if (submitter === 'signup') createLocalAccount(state, values)
    else signInLocal(state, values)
    commit(submitter === 'signup' ? 'Account erstellt. Erstelle jetzt einen Raum oder tritt bei.' : 'Du bist eingeloggt.')
  } catch (err) { commit(err.message) }
}

async function handleJoinRoom(e) {
  e.preventDefault()
  const inviteCode = Object.fromEntries(new FormData(e.target)).inviteCode
  try {
    if (window.betweenUsSupabase) {
      const { data, error } = await window.betweenUsSupabase.rpc('between_us_join_room', { join_code: inviteCode })
      if (error) throw error
      state.pair = { id: data.id, inviteCode: data.invite_code, hostUserId: data.host_user_id, createdAt: data.created_at }
      state.users = [{ id: data.host_user_id, role: 'host', name: 'Host' }, { ...state.auth.user, role: 'member', name: 'Du' }]
    } else joinRoom(state, inviteCode)
    commit('Du bist dem Raum beigetreten.')
  } catch (err) { commit(err.message) }
}

function bind() {
  document.querySelector('#auth-form')?.addEventListener('submit', handleAuth)
  document.querySelector('#join-room-form')?.addEventListener('submit', handleJoinRoom)
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.activeView=b.dataset.view; commit()}); document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action)); document.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{b.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('active')); b.classList.add('active'); document.querySelector('[name="mood"]').value=b.dataset.mood}); document.querySelector('#checkin-form')?.addEventListener('submit', e=>{e.preventDefault(); try{addCheckin(state,Object.fromEntries(new FormData(e.target))); commit('Deine Antwort ist sicher gespeichert.')}catch(err){commit(err.message)}}); document.querySelector('#memory-form')?.addEventListener('submit', e=>{e.preventDefault(); try{saveMemory(state,Object.fromEntries(new FormData(e.target))); modal=''; state.activeView='memories'; commit('Euer Moment des Tages ist gespeichert.')}catch(err){commit(err.message)}}); document.querySelector('#bucket-form')?.addEventListener('submit', e=>{e.preventDefault(); try{saveBucketItem(state,Object.fromEntries(new FormData(e.target))); modal=''; commit('Euer Wunsch ist gespeichert.')}catch(err){commit(err.message)}}); document.querySelectorAll('[data-new-memory]').forEach(b=>b.onclick=()=>{const existing=state.memories.find(m=>m.date===localDateKey()); memoryModal(existing || undefined)}); document.querySelectorAll('[data-edit-memory]').forEach(b=>b.onclick=()=>memoryModal(state.memories.find(m=>m.id===b.dataset.editMemory))); document.querySelectorAll('[data-delete-memory]').forEach(b=>b.onclick=()=>{if(confirm('Dieses Memory wirklich löschen?')){deleteMemory(state,b.dataset.deleteMemory);commit('Memory gelöscht.')}}); document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{bucketFilter=b.dataset.filter;render()}); document.querySelectorAll('[data-edit-bucket]').forEach(b=>b.onclick=()=>bucketModal(b.dataset.editBucket==='new'?undefined:state.bucketItems.find(i=>i.id===b.dataset.editBucket))); document.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{const [id,s]=b.dataset.status.split('|'); updateBucketStatus(state,id,s); commit(s==='erlebt'?'Aus Wunsch wird Erlebnis.':'Status aktualisiert.')}); document.querySelectorAll('[data-delete-bucket]').forEach(b=>b.onclick=()=>{if(confirm('Diesen Wunsch wirklich löschen?')){deleteBucketItem(state,b.dataset.deleteBucket);commit('Wunsch gelöscht.')}}); document.querySelectorAll('[data-bucket-memory]').forEach(b=>b.onclick=()=>memoryModal(createMemoryDraftFromBucket(state.bucketItems.find(i=>i.id===b.dataset.bucketMemory)))) }
async function action(a) { try { if(a==='theme'){state.theme=state.theme==='dark'?'light':'dark'; commit()} if(a==='logout'){if(window.betweenUsSupabase) await window.betweenUsSupabase.auth.signOut(); signOutLocal(state); commit('Du bist ausgeloggt.')} if(a==='create-room'){ if(window.betweenUsSupabase){ const { data, error } = await window.betweenUsSupabase.rpc('between_us_create_room'); if(error) throw error; state.pair = { id: data.id, inviteCode: data.invite_code, hostUserId: data.host_user_id, createdAt: data.created_at }; state.users = [{ ...state.auth.user, role: 'host', name: 'Du' }] } else createRoom(state); commit('Raum erstellt. Teile den sechsstelligen Code mit deinem Partner.')} if(a==='copy-code'){navigator.clipboard?.writeText(state.pair.inviteCode); commit('Einladungscode kopiert.')} if(a==='leave-room'){if(confirm('Verbindung wirklich trennen?')){ if(window.betweenUsSupabase){ const { error } = await window.betweenUsSupabase.rpc('between_us_leave_room'); if(error) throw error } leaveRoom(state); commit('Du bist nicht mehr verbunden.')}} if(a==='delete-room'){if(confirm('Raum für beide löschen?')){ if(window.betweenUsSupabase){ const { error } = await window.betweenUsSupabase.rpc('between_us_leave_room'); if(error) throw error } deleteRoom(state); commit('Der Raum wurde gelöscht.')}} if(a==='simulate'){addCheckin(state,{userId:'partner',mood:'dankbar',text:'Ich habe heute gemerkt, wie gut mir deine Ruhe tut.'}); commit('Demo-Partnerantwort ist eingetroffen.')} if(a==='reveal'){openReveal(state); commit('Eure Antworten sind geöffnet.')} if(a==='close'){modal=''; render()} } catch(err) { commit(err.message) } }
render()
initSupabase()
