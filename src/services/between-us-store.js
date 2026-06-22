import { localDateKey } from '../utils/date-utils.js'

export const moods = ['verbunden', 'dankbar', 'ruhig', 'glücklich', 'müde', 'gestresst', 'unsicher', 'nachdenklich']
export const bucketCategories = ['Dates', 'Reisen', 'Abenteuer', 'Alltag', 'Rituale', 'Zuhause', 'Romantik', 'Wachstum', 'besondere Anlässe']
export const bucketStatuses = ['Wunsch', 'geplant', 'erlebt']

const storageKey = 'between-us-demo-state-v2'

export function createInviteCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function createInitialState(today = localDateKey()) {
  return {
    onboarded: true,
    activeView: 'today',
    theme: 'light',
    auth: { user: null },
    pair: null,
    users: [],
    dailyQuestion: {
      date: today,
      text: 'Wofür bist du heute in unserer Beziehung dankbar?',
    },
    checkins: [],
    memories: [],
    bucketItems: [],
    reactions: {},
  }
}

export function requireSignedIn(state) {
  if (!state.auth?.user?.id) throw new Error('Bitte melde dich zuerst an.')
  return state.auth.user
}

export function hasRoom(state) {
  return Boolean(state.pair?.id)
}

export function createLocalAccount(state, { email, password }) {
  const cleanEmail = normalizeEmail(email)
  validatePassword(password)
  state.auth = { user: { id: `user-${cleanEmail}`, email: cleanEmail, name: cleanEmail.split('@')[0] } }
  return state.auth.user
}

export function signInLocal(state, { email, password }) {
  return createLocalAccount(state, { email, password })
}

export function signOutLocal(state) {
  state.auth = { user: null }
}

export function createRoom(state, inviteCode = createInviteCode()) {
  const user = requireSignedIn(state)
  ensureNoRoom(state)
  state.pair = {
    id: cryptoId('room'),
    inviteCode,
    hostUserId: user.id,
    createdAt: new Date().toISOString(),
  }
  state.users = [{ id: user.id, email: user.email, role: 'host', name: 'Du' }]
  return state.pair
}

export function joinRoom(state, inviteCode) {
  const user = requireSignedIn(state)
  ensureNoRoom(state)
  const code = normalizeInviteCode(inviteCode)
  state.pair = {
    id: `joined-${code}`,
    inviteCode: code,
    hostUserId: 'host',
    createdAt: new Date().toISOString(),
  }
  state.users = [
    { id: 'host', email: '', role: 'host', name: 'Host' },
    { id: user.id, email: user.email, role: 'member', name: 'Du' },
  ]
  return state.pair
}

export function leaveRoom(state) {
  requireSignedIn(state)
  state.pair = null
  state.users = []
  state.checkins = []
  state.memories = []
  state.bucketItems = []
  state.reactions = {}
}

export function deleteRoom(state) {
  const user = requireSignedIn(state)
  if (!state.pair) throw new Error('Es gibt keinen Raum.')
  if (state.pair.hostUserId !== user.id) throw new Error('Nur der Host kann den Raum löschen.')
  leaveRoom(state)
}

export function isHost(state) {
  return Boolean(state.auth?.user?.id && state.pair?.hostUserId === state.auth.user.id)
}

export function normalizeInviteCode(value) {
  const code = String(value || '').replace(/\D/g, '').slice(0, 6)
  if (!/^\d{6}$/.test(code)) throw new Error('Bitte gib einen sechsstelligen Einladungscode ein.')
  return code
}

export function getCheckinStatus(state, date = state.dailyQuestion.date) {
  const meId = state.auth?.user?.id || 'me'
  const partnerId = state.users.find((item) => item.id !== meId)?.id || 'partner'
  const answers = state.checkins.filter((item) => item.date === date)
  const me = answers.find((item) => item.userId === meId || item.userId === 'me')
  const partner = answers.find((item) => item.userId === partnerId || item.userId === 'partner')
  const bothAnswered = Boolean(me && partner)
  return { me, partner, bothAnswered, revealOpen: bothAnswered && answers.some((item) => item.revealed) }
}

export function addCheckin(state, { userId = state.auth?.user?.id || 'me', mood, text, date = state.dailyQuestion.date }) {
  if (!text || !text.trim()) throw new Error('Bitte schreibe ein paar Worte für euren Check-in.')
  if (state.checkins.some((item) => item.userId === userId && item.date === date)) throw new Error('Für heute wurde bereits eine Antwort gespeichert.')
  state.checkins.push({ id: cryptoId('checkin'), userId, date, mood, text: text.trim(), revealed: false })
  return getCheckinStatus(state, date)
}

export function openReveal(state, date = state.dailyQuestion.date) {
  const status = getCheckinStatus(state, date)
  if (!status.bothAnswered) throw new Error('Eure Antworten werden sichtbar, sobald ihr beide geantwortet habt.')
  state.checkins.filter((item) => item.date === date).forEach((item) => { item.revealed = true })
  return getCheckinStatus(state, date)
}

export function saveMemory(state, memory) {
  const date = memory.date || localDateKey()
  const existing = state.memories.find((item) => item.date === date && item.id !== memory.id)
  if (existing) throw new Error('Für diesen Tag gibt es bereits ein gemeinsames Memory.')
  const clean = { ...memory, date, title: memory.title?.trim(), text: memory.text?.trim() }
  if (!clean.title) throw new Error('Bitte gib eurem Memory einen Titel.')
  if (!clean.text) throw new Error('Bitte ergänze einen kurzen Text.')
  if (clean.id) {
    const index = state.memories.findIndex((item) => item.id === clean.id)
    if (index >= 0) state.memories[index] = clean
    else state.memories.unshift(clean)
  } else state.memories.unshift({ ...clean, id: cryptoId('memory') })
  return clean
}

export function deleteMemory(state, id) { state.memories = state.memories.filter((item) => item.id !== id) }
export function saveBucketItem(state, item) { const clean = { ...item, title: item.title?.trim(), description: item.description?.trim() }; if (!clean.title) throw new Error('Bitte gib dem Wunsch einen Titel.'); if (!bucketStatuses.includes(clean.status)) clean.status = 'Wunsch'; if (!bucketCategories.includes(clean.category)) clean.category = 'Dates'; if (clean.id) { const index = state.bucketItems.findIndex((entry) => entry.id === clean.id); if (index >= 0) state.bucketItems[index] = clean; return clean } const created = { ...clean, id: cryptoId('bucket'), createdAt: localDateKey() }; state.bucketItems.unshift(created); return created }
export function updateBucketStatus(state, id, status) { if (!bucketStatuses.includes(status)) throw new Error('Unbekannter Status.'); const item = state.bucketItems.find((entry) => entry.id === id); if (!item) throw new Error('Wunsch nicht gefunden.'); item.status = status; return item }
export function deleteBucketItem(state, id) { state.bucketItems = state.bucketItems.filter((item) => item.id !== id) }
export function createMemoryDraftFromBucket(item, date = localDateKey()) { if (item.status !== 'erlebt') throw new Error('Nur erlebte Wünsche können zu einem Memory werden.'); return { date, title: item.title, text: item.description || 'Aus einem gemeinsamen Wunsch ist heute eine Erinnerung geworden.', mood: 'verbunden', image: '', bucketItemId: item.id } }

export function loadState() { try { const raw = localStorage.getItem(storageKey); return raw ? { ...createInitialState(), ...JSON.parse(raw) } : createInitialState() } catch { return createInitialState() } }
export function persistState(state) { localStorage.setItem(storageKey, JSON.stringify(state)) }

function ensureNoRoom(state) { if (state.pair?.id) throw new Error('Du kannst nur mit einem Partner verbunden sein und nur einen Raum nutzen.') }
function normalizeEmail(email) { const clean = String(email || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('Bitte gib eine gültige E-Mail-Adresse ein.'); return clean }
function validatePassword(password) { if (String(password || '').length < 6) throw new Error('Das Passwort muss mindestens 6 Zeichen lang sein.') }
function cryptoId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}` }
