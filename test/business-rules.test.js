import test from 'node:test'
import assert from 'node:assert/strict'
import { addCheckin, createInitialState, createMemoryDraftFromBucket, getCheckinStatus, openReveal, saveBucketItem, saveMemory, updateBucketStatus } from '../src/services/between-us-store.js'

test('Check-in Antworten bleiben verborgen bis beide geantwortet haben', () => {
  const state = createInitialState('2026-06-22')
  addCheckin(state, { userId: 'me', mood: 'ruhig', text: 'Ich bin dankbar für unsere Geduld.' })
  const waiting = getCheckinStatus(state)
  assert.equal(Boolean(waiting.me), true)
  assert.equal(waiting.bothAnswered, false)
  assert.equal(waiting.revealOpen, false)
  assert.throws(() => openReveal(state), /sobald ihr beide/)
})

test('Reveal öffnet erst nach zwei Antworten', () => {
  const state = createInitialState('2026-06-22')
  addCheckin(state, { userId: 'me', mood: 'ruhig', text: 'Danke.' })
  addCheckin(state, { userId: 'partner', mood: 'dankbar', text: 'Ich auch.' })
  const revealed = openReveal(state)
  assert.equal(revealed.bothAnswered, true)
  assert.equal(revealed.revealOpen, true)
})

test('Pro lokalem Kalendertag ist nur ein Memory erlaubt', () => {
  const state = createInitialState('2026-06-22')
  saveMemory(state, { date: '2026-06-22', title: 'Erster Moment', text: 'Bleibt.' })
  assert.throws(() => saveMemory(state, { date: '2026-06-22', title: 'Zweiter Moment', text: 'Zu viel.' }), /bereits/)
})

test('Bucketlist Statuswechsel und Umwandlung in Memory', () => {
  const state = createInitialState('2026-06-22')
  const saved = saveBucketItem(state, { title: 'Frühstück im Park', description: 'Decke und Kaffee.', category: 'Dates', status: 'geplant' })
  const item = updateBucketStatus(state, saved.id, 'erlebt')
  assert.equal(item.status, 'erlebt')
  const draft = createMemoryDraftFromBucket(item, '2026-06-22')
  assert.equal(draft.bucketItemId, saved.id)
  assert.equal(draft.title, item.title)
})

import { createLocalAccount, createRoom, deleteRoom, hasRoom, isHost, joinRoom, leaveRoom } from '../src/services/between-us-store.js'

test('Ein Account kann nur einen Raum erstellen', () => {
  const state = createInitialState('2026-06-22')
  createLocalAccount(state, { email: 'host@example.com', password: 'secret1' })
  const room = createRoom(state, '123456')
  assert.equal(room.inviteCode, '123456')
  assert.equal(isHost(state), true)
  assert.throws(() => createRoom(state, '654321'), /nur einen Raum/)
})

test('Beitritt verlangt sechsstelligen Code und blockiert zweite Verbindung', () => {
  const state = createInitialState('2026-06-22')
  createLocalAccount(state, { email: 'member@example.com', password: 'secret1' })
  assert.throws(() => joinRoom(state, 'ABC'), /sechsstelligen/)
  joinRoom(state, '654321')
  assert.equal(hasRoom(state), true)
  assert.equal(isHost(state), false)
  assert.throws(() => joinRoom(state, '123456'), /nur mit einem Partner/)
})

test('Member können austreten, Host kann Raum löschen', () => {
  const memberState = createInitialState('2026-06-22')
  createLocalAccount(memberState, { email: 'member@example.com', password: 'secret1' })
  joinRoom(memberState, '654321')
  leaveRoom(memberState)
  assert.equal(hasRoom(memberState), false)

  const hostState = createInitialState('2026-06-22')
  createLocalAccount(hostState, { email: 'host@example.com', password: 'secret1' })
  createRoom(hostState, '123456')
  deleteRoom(hostState)
  assert.equal(hasRoom(hostState), false)
})
