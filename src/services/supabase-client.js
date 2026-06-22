const configPath = 'config/supabase-config.json'

export async function loadSupabaseConfig(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    return emptyConfig('Fetch API is not available in this environment.')
  }

  try {
    const response = await fetchImpl(configPath, { cache: 'no-store' })
    if (!response.ok) return emptyConfig(`Supabase config not found at ${configPath}.`)

    const config = await response.json()
    return normalizeSupabaseConfig(config)
  } catch (error) {
    return emptyConfig(error instanceof Error ? error.message : 'Supabase config could not be loaded.')
  }
}

export function normalizeSupabaseConfig(config) {
  const supabaseUrl = typeof config?.supabaseUrl === 'string' ? config.supabaseUrl.trim() : ''
  const supabaseAnonKey = typeof config?.supabaseAnonKey === 'string' ? config.supabaseAnonKey.trim() : ''
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

  return {
    supabaseUrl,
    supabaseAnonKey,
    isConfigured,
    message: isConfigured
      ? 'Supabase configuration loaded.'
      : 'Supabase URL and anon key must be set in config/supabase-config.json.',
  }
}

export async function createSupabaseClient(fetchImpl = globalThis.fetch) {
  const config = await loadSupabaseConfig(fetchImpl)
  const factory = globalThis.supabase?.createClient

  if (!config.isConfigured || typeof factory !== 'function') {
    return { client: null, config }
  }

  return {
    client: factory(config.supabaseUrl, config.supabaseAnonKey),
    config,
  }
}

function emptyConfig(message) {
  return {
    supabaseUrl: '',
    supabaseAnonKey: '',
    isConfigured: false,
    message,
  }
}
