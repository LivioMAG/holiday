# Supabase-Konfiguration

Lege für die lokale App eine Datei `config/supabase-config.json` an. Diese Datei ist absichtlich in `.gitignore` eingetragen und darf keine Service-Role-Keys enthalten.

```json
{
  "supabaseUrl": "https://your-project-ref.supabase.co",
  "supabaseAnonKey": "your-public-anon-key"
}
```

Verwende im Frontend ausschließlich den öffentlichen `anon` Key. Service-Role-Keys gehören nie in diese Datei und dürfen nur serverseitig eingesetzt werden.
