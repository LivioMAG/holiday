# Deployment und Supabase-Konfiguration

## Lokale Supabase-Zugangsdaten

1. Kopiere `config/supabase-config.example.json` nach `config/supabase-config.json`.
2. Trage die Projekt-URL als `supabaseUrl` ein.
3. Trage ausschließlich den öffentlichen Supabase `anon` Key als `supabaseAnonKey` ein.

`config/supabase-config.json` ist in `.gitignore` eingetragen, damit keine lokalen Zugangsdaten versehentlich committet werden. Service-Role-Keys dürfen nicht im Frontend verwendet werden.
