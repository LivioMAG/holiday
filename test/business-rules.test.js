import test from 'node:test'
import assert from 'node:assert/strict'
import { addCheckin, createInitialState, createMemoryDraftFromBucket, getCheckinStatus, openReveal, saveMemory, updateBucketStatus } from '../src/services/between-us-store.js'

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
  const item = updateBucketStatus(state, 'bucket-1', 'erlebt')
  assert.equal(item.status, 'erlebt')
  const draft = createMemoryDraftFromBucket(item, '2026-06-22')
  assert.equal(draft.bucketItemId, 'bucket-1')
  assert.equal(draft.title, item.title)
})
