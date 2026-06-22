import test from 'node:test'
import assert from 'node:assert/strict'
import { loadSupabaseConfig, normalizeSupabaseConfig } from '../src/services/supabase-client.js'

test('normalizes a complete Supabase JSON config', () => {
  const config = normalizeSupabaseConfig({
    supabaseUrl: ' https://demo.supabase.co ',
    supabaseAnonKey: ' anon-key ',
  })

  assert.equal(config.supabaseUrl, 'https://demo.supabase.co')
  assert.equal(config.supabaseAnonKey, 'anon-key')
  assert.equal(config.isConfigured, true)
})

test('marks missing Supabase credentials as not configured', () => {
  const config = normalizeSupabaseConfig({ supabaseUrl: '', supabaseAnonKey: '' })

  assert.equal(config.isConfigured, false)
  assert.match(config.message, /supabase-config\.json/)
})

test('loads Supabase config from the JSON path', async () => {
  const config = await loadSupabaseConfig(async (url) => {
    assert.equal(url, 'config/supabase-config.json')
    return {
      ok: true,
      async json() {
        return {
          supabaseUrl: 'https://example.supabase.co',
          supabaseAnonKey: 'public-anon-key',
        }
      },
    }
  })

  assert.equal(config.isConfigured, true)
})
