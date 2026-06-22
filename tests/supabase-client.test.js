import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeSupabaseClient, loadSupabaseConfig } from '../src/services/supabase-client.js';
import { memorySupabase } from '../src/services/memory-supabase.js';

test('loads Supabase credentials from JSON config', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, async json() { return { url: 'https://example.supabase.co', anonKey: 'public-anon-key' }; } });
  const config = await loadSupabaseConfig();
  assert.deepEqual(config, { url: 'https://example.supabase.co', anonKey: 'public-anon-key' });
  globalThis.fetch = originalFetch;
});

test('initializes Supabase client from JSON config when browser factory exists', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const createdClient = { from: 'supabase' };
  globalThis.fetch = async () => ({ ok: true, async json() { return { url: 'https://example.supabase.co', anonKey: 'public-anon-key' }; } });
  globalThis.window = { supabase: { createClient(url, anonKey) { assert.equal(url, 'https://example.supabase.co'); assert.equal(anonKey, 'public-anon-key'); return createdClient; } } };
  assert.equal(await initializeSupabaseClient(), createdClient);
  assert.equal(globalThis.window.supabaseClient, createdClient);
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});

test('falls back to memory client when config is missing', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.fetch = async () => ({ ok: false });
  globalThis.window = {};
  assert.equal(await initializeSupabaseClient(), memorySupabase);
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
});
