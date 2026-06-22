import { localDateKey } from '../utils/date-utils.js'

export const moods = ['verbunden', 'dankbar', 'ruhig', 'glücklich', 'müde', 'gestresst', 'unsicher', 'nachdenklich']
export const bucketCategories = ['Dates', 'Reisen', 'Abenteuer', 'Alltag', 'Rituale', 'Zuhause', 'Romantik', 'Wachstum', 'besondere Anlässe']
export const bucketStatuses = ['Wunsch', 'geplant', 'erlebt']

const storageKey = 'between-us-demo-state-v1'

export function createInitialState(today = localDateKey()) {
  return {
    onboarded: false,
    activeView: 'today',
    theme: 'light',
    pair: { id: 'pair-demo', inviteCode: 'US-4287', streak: 6 },
    users: [
      { id: 'me', name: 'Du' },
      { id: 'partner', name: 'Partnerperson' },
    ],
    dailyQuestion: {
      date: today,
      text: 'Wofür bist du heute in unserer Beziehung dankbar?',
    },
    checkins: [],
    memories: [
      {
        id: 'mem-1',
        date: '2026-06-20',
        title: 'Unser Spaziergang am Abend',
        text: 'Wir sind ohne Ziel losgelaufen und haben unterwegs wieder richtig gut geredet.',
        mood: 'ruhig',
        image: '',
        bucketItemId: 'bucket-2',
      },
      {
        id: 'mem-2',
        date: '2026-06-18',
        title: 'Das schöne Gespräch beim Essen',
        text: 'Nicht jeder Tag muss perfekt sein. Heute war es gut, dass wir zugehört haben.',
        mood: 'verbunden',
        image: '',
        bucketItemId: '',
      },
    ],
    bucketItems: [
      {
        id: 'bucket-1',
        title: 'Frühstück im Park',
        description: 'Thermoskanne, Decke, Lieblingsbrötchen und eine Stunde nur für uns.',
        category: 'Dates',
        status: 'geplant',
        targetDate: '2026-06-28',
        place: 'Stadtpark',
        createdAt: '2026-06-10',
      },
      {
        id: 'bucket-2',
        title: 'Abendspaziergang ohne Handy',
        description: 'Ein kleines Ritual für ruhigere Wochen.',
        category: 'Rituale',
        status: 'erlebt',
        targetDate: '',
        place: 'Zuhause',
        createdAt: '2026-06-05',
      },
    ],
    reactions: {},
  }
}

export function getCheckinStatus(state, date = state.dailyQuestion.date) {
  const answers = state.checkins.filter((item) => item.date === date)
  const me = answers.find((item) => item.userId === 'me')
  const partner = answers.find((item) => item.userId === 'partner')
  const bothAnswered = Boolean(me && partner)
  return { me, partner, bothAnswered, revealOpen: bothAnswered && answers.some((item) => item.revealed) }
}

export function addCheckin(state, { userId = 'me', mood, text, date = state.dailyQuestion.date }) {
  if (!text || !text.trim()) throw new Error('Bitte schreibe ein paar Worte für euren Check-in.')
  if (state.checkins.some((item) => item.userId === userId && item.date === date)) {
    throw new Error('Für heute wurde bereits eine Antwort gespeichert.')
  }
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
  } else {
    state.memories.unshift({ ...clean, id: cryptoId('memory') })
  }
  return clean
}

export function deleteMemory(state, id) {
  state.memories = state.memories.filter((item) => item.id !== id)
}

export function saveBucketItem(state, item) {
  const clean = { ...item, title: item.title?.trim(), description: item.description?.trim() }
  if (!clean.title) throw new Error('Bitte gib dem Wunsch einen Titel.')
  if (!bucketStatuses.includes(clean.status)) clean.status = 'Wunsch'
  if (!bucketCategories.includes(clean.category)) clean.category = 'Dates'
  if (clean.id) {
    const index = state.bucketItems.findIndex((entry) => entry.id === clean.id)
    if (index >= 0) state.bucketItems[index] = clean
  } else {
    state.bucketItems.unshift({ ...clean, id: cryptoId('bucket'), createdAt: localDateKey() })
  }
  return clean
}

export function updateBucketStatus(state, id, status) {
  if (!bucketStatuses.includes(status)) throw new Error('Unbekannter Status.')
  const item = state.bucketItems.find((entry) => entry.id === id)
  if (!item) throw new Error('Wunsch nicht gefunden.')
  item.status = status
  return item
}

export function deleteBucketItem(state, id) {
  state.bucketItems = state.bucketItems.filter((item) => item.id !== id)
}

export function createMemoryDraftFromBucket(item, date = localDateKey()) {
  if (item.status !== 'erlebt') throw new Error('Nur erlebte Wünsche können zu einem Memory werden.')
  return {
    date,
    title: item.title,
    text: item.description || 'Aus einem gemeinsamen Wunsch ist heute eine Erinnerung geworden.',
    mood: 'verbunden',
    image: '',
    bucketItemId: item.id,
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : createInitialState()
  } catch {
    return createInitialState()
  }
}

export function persistState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state))
}

function cryptoId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
