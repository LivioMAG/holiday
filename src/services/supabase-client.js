import { memorySupabase } from './memory-supabase.js';

const CONFIG_PATH = 'config/supabase-config.json';
let activeClient = null;

function hasSupabaseFactory() {
  return typeof globalThis.window?.supabase?.createClient === 'function';
}

function hasConfig(config) {
  return Boolean(config?.url && config?.anonKey);
}

export async function loadSupabaseConfig(path = CONFIG_PATH) {
  if (!globalThis.fetch) return null;

  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) return null;
    const config = await response.json();
    return hasConfig(config) ? config : null;
  } catch {
    return null;
  }
}

export async function initializeSupabaseClient() {
  if (globalThis.window?.supabaseClient) {
    activeClient = globalThis.window.supabaseClient;
    return activeClient;
  }

  const config = await loadSupabaseConfig();
  if (config && hasSupabaseFactory()) {
    activeClient = globalThis.window.supabase.createClient(config.url, config.anonKey);
    globalThis.window.supabaseClient = activeClient;
    return activeClient;
  }

  activeClient = memorySupabase;
  return activeClient;
}

export function getSupabaseClient() {
  return globalThis.window?.supabaseClient || activeClient || memorySupabase;
}
