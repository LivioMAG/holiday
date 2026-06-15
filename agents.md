# Repo-Hinweise für Agents

## Zweck dieser Datei

Diese Datei beschreibt die technischen Rahmenbedingungen, Zielstruktur und Entwicklungsregeln für Agents und Mitwirkende in diesem Repository.

Das Ziel ist, die bestehende Web-App schrittweise wartbarer zu machen, ohne unnötig neue Framework-Abhängigkeiten einzuführen. Änderungen sollen klein, nachvollziehbar und kompatibel mit der bestehenden Vanilla-JavaScript-App bleiben.

---

## Technologie-Stack

* Dieses Repository ist eine klassische Web-App mit **HTML**, **CSS** und **Vanilla JavaScript**.
* Es werden **keine Frontend-Frameworks** wie React, Vue, Angular, Svelte oder Next.js verwendet.
* Externe Browser-Bibliotheken werden direkt über CDN eingebunden, z. B.:

  * Supabase JS
  * jsPDF
  * jsPDF AutoTable
* Persistenz und Authentifizierung laufen über **Supabase**.
* Datenbankänderungen liegen als SQL-Dateien im Repository.
* Supabase Edge Functions werden, falls vorhanden oder neu erstellt, in **TypeScript** geschrieben und separat unter `supabase/functions/` abgelegt.

---

## Aktueller Projektzuschnitt

Die App enthält derzeit mehrere Bereiche in einer statischen Oberfläche:

* Login und Authentifizierung.
* Wochenrapport-Übersicht mit PDF-Export.
* Ferien- und Absenz-Verwaltung.
* Projekt-/Auftragsverwaltung.
* Dispo-/Planungsansichten.
* Einstellungen und administrative Stammdaten.
* Supabase-Schema als konsolidiertes Stamm-SQL.
* Optional serverseitige Supabase Edge Functions für Logik, die nicht direkt im Browser laufen soll.

---

## Zielstruktur für eine saubere Weiterentwicklung

Die App kann weiterhin ohne Framework betrieben werden. Für bessere Wartbarkeit soll sie langfristig in diese Struktur überführt werden:

```text
/
├── index.html                         # Einstiegspunkt der Haupt-App
├── README.md                          # Projektübersicht, Setup und Deployment
├── AGENTS.md                          # Hinweise für Agents und Mitwirkende
├── package.json                       # Optionale Scripts für Linting/Formatierung/Checks
├── assets/
│   ├── icons/                         # SVG-/PNG-Icons
│   ├── images/                        # Statische Bilder und UI-Grafiken
│   └── fonts/                         # Lokale Fonts, falls CDN ersetzt wird
├── config/
│   ├── supabase-config.example.json   # Beispielkonfiguration ohne Secrets
│   ├── supabase-config.json           # Lokale/produktive Supabase-Konfiguration; nicht mit Secrets committen
│   ├── app-settings.json              # App-weite UI-/Business-Konfiguration
│   └── navigation.json                # Seiten, Labels, Rollen und Menüeinträge
├── src/
│   ├── app.js                         # App-Bootstrap und globale Initialisierung
│   ├── state.js                       # Zentraler Client-State
│   ├── constants.js                   # Rollen, Labels, Statuswerte und Defaults
│   ├── services/
│   │   ├── supabase-client.js         # Supabase-Client und Konfigurationsladung
│   │   ├── auth-service.js            # Login, Logout, Session-Handling
│   │   ├── reports-service.js         # Wochenrapport-Datenzugriff
│   │   ├── absences-service.js        # Ferien-/Absenz-Datenzugriff
│   │   ├── projects-service.js        # Projekt-/Auftrags-Datenzugriff
│   │   ├── dispo-service.js           # Dispo-Datenzugriff
│   │   └── functions-service.js       # Aufrufe an Supabase Edge Functions
│   ├── modules/
│   │   ├── login/                     # Login-Screen und Login-Events
│   │   ├── reports/                   # Wochenrapport-UI, Filter, Export
│   │   ├── absences/                  # Ferien-/Absenz-UI
│   │   ├── projects/                  # Projektliste, Projektformular, Projektaktionen
│   │   ├── dispo/                     # Dispo-Planer und Dispo-Modale
│   │   └── settings/                  # Benutzer, Feiertage, Schulferien, Admin-Screens
│   ├── ui/
│   │   ├── modals.js                  # Wiederverwendbare Modal-Helfer
│   │   ├── tables.js                  # Tabellen-/Pagination-Helfer
│   │   ├── alerts.js                  # Alert- und Statusmeldungen
│   │   └── navigation.js              # Seitenwechsel und aktive Navigation
│   └── utils/
│       ├── date-utils.js              # Kalenderwochen, Datumsformatierung, Arbeitszeit
│       ├── format-utils.js            # Währung, Stunden, Textformatierung
│       ├── pdf-utils.js               # Gemeinsame PDF-Helfer
│       └── dom-utils.js               # DOM-, Escape- und Event-Helfer
├── styles/
│   ├── base.css                       # Reset, Variablen, Typografie
│   ├── layout.css                     # App-Shell, Sidebar, Content-Flächen
│   ├── components.css                 # Buttons, Badges, Panels, Modale, Tabellen
│   └── pages/
│       ├── login.css
│       ├── reports.css
│       ├── projects.css
│       ├── dispo.css
│       └── settings.css
├── supabase/
│   ├── schema.sql                     # Vollständiges konsolidiertes Stamm-SQL
│   └── functions/                     # Supabase Edge Functions in TypeScript
│       ├── _shared/                   # Gemeinsame Helper für Edge Functions
│       │   ├── cors.ts                # CORS-Header und Preflight-Handling
│       │   ├── auth.ts                # Auth-/JWT-Helfer für Functions
│       │   ├── response.ts            # Einheitliche JSON-/Fehlerantworten
│       │   └── supabase.ts            # Server-/Service-Client-Helfer
│       ├── example-function/
│       │   └── index.ts               # Einstiegspunkt einer Edge Function
│       └── another-function/
│           └── index.ts               # Einstiegspunkt einer weiteren Edge Function
└── docs/
    ├── architecture.md                # Architekturentscheidungen und Modulgrenzen
    ├── deployment.md                  # Hosting, Supabase-Setup und Umgebungen
    ├── data-model.md                  # Tabellen, Beziehungen und RLS-Notizen
    └── edge-functions.md              # Zweck, Aufbau und Deployment der Edge Functions
```

---

## Strukturregeln für Frontend-Code

* Neue UI-Logik soll nach Möglichkeit in passende Module unter `src/modules/` statt in eine große Sammeldatei verschoben werden.
* Wiederverwendbare DOM-, Formatierungs-, Datums- und PDF-Helfer gehören nach `src/utils/` oder `src/ui/`.
* Supabase-Zugriffe sollen in `src/services/` gekapselt werden, damit UI-Code nicht direkt überall Queries enthält.
* Aufrufe an Supabase Edge Functions gehören clientseitig bevorzugt in `src/services/functions-service.js`.
* Konfigurierbare Werte sollen bevorzugt in JSON-Dateien unter `config/` liegen.
* Statische Bilder, Icons und Fonts gehören nach `assets/`.
* CSS soll schrittweise aus großen Einzeldateien in folgende Dateien aufgeteilt werden:

  * `styles/base.css`
  * `styles/layout.css`
  * `styles/components.css`
  * seitenbezogene Dateien unter `styles/pages/`
* Datenbankschema-Änderungen gehören in das konsolidierte Stamm-SQL `supabase/schema.sql`.

---

## Strukturregeln für Supabase Edge Functions

Supabase Edge Functions sind serverseitige Funktionen und sollen klar vom Browser-Frontend getrennt bleiben.

* Alle Supabase Edge Functions gehören nach `supabase/functions/`.
* Jede Edge Function erhält einen eigenen Unterordner.
* Der Einstiegspunkt jeder Function ist eine `index.ts`.
* Edge Functions werden in **TypeScript** geschrieben.
* Gemeinsam genutzte Function-Helfer gehören nach `supabase/functions/_shared/`.
* In `_shared/` können z. B. folgende Helfer liegen:

  * `cors.ts` für CORS-Header und Preflight-Requests.
  * `auth.ts` für Authentifizierung und JWT-Prüfung.
  * `response.ts` für einheitliche JSON- und Fehlerantworten.
  * `supabase.ts` für serverseitige Supabase-Clients.
* Secrets und produktive Zugangsdaten dürfen nicht im Repository liegen.
* Secrets für Edge Functions müssen über Supabase Secrets bzw. Umgebungsvariablen verwaltet werden.
* Edge Functions dürfen keine UI-Logik enthalten.
* UI-Code darf keine serverseitige Geschäftslogik duplizieren, wenn diese bereits in einer Edge Function abgebildet ist.
* Datenbankstrukturen, Tabellen, Policies und RLS-Änderungen bleiben weiterhin in `supabase/schema.sql`.

---

## Wann eine Edge Function verwendet werden soll

Eine Supabase Edge Function ist sinnvoll, wenn Logik nicht direkt im Browser laufen sollte.

Geeignete Fälle:

* Operationen mit geheimen API-Schlüsseln.
* Serverseitige Validierung oder Berechnung.
* PDF-, Export- oder Report-Logik, die später nicht mehr rein im Browser laufen soll.
* Integrationen mit externen APIs.
* Webhooks.
* Automatisierte Berechnungen oder Statusänderungen.
* Geschäftslogik, die nicht manipulierbar im Client liegen soll.
* Aktionen, die erhöhte Rechte benötigen, z. B. über einen Service-Role-Key.

Nicht geeignete Fälle:

* Reine DOM-Manipulation.
* Anzeigen und Ausblenden von UI-Elementen.
* Clientseitige Filter, Sortierungen oder Formatierungen.
* Kleine Hilfsfunktionen, die nur für Darstellung im Browser benötigt werden.

---

## Namenskonventionen für Edge Functions

Edge-Function-Ordner sollen sprechend und kebab-case geschrieben werden.

Beispiele:

```text
supabase/functions/generate-weekly-report/index.ts
supabase/functions/send-absence-notification/index.ts
supabase/functions/recalculate-project-status/index.ts
supabase/functions/import-holidays/index.ts
```

Regeln:

* Ordnernamen in `kebab-case`.
* Keine generischen Namen wie `function1`, `api`, `test` oder `handler`.
* Der Name soll die fachliche Aktion beschreiben.
* Gemeinsame Helfer nicht in einzelne Function-Ordner kopieren, sondern nach `_shared/` auslagern.

---

## Beispielstruktur einer Edge Function

```text
supabase/functions/generate-weekly-report/
└── index.ts
```

Beispielhafter Aufbau:

```ts
import { corsHeaders } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const payload = await req.json()

    // Fachliche Logik hier ausführen.
    // Daten validieren.
    // Supabase-Zugriffe über gemeinsame Helper kapseln.
    // Ergebnis zurückgeben.

    return jsonResponse({
      success: true,
      data: payload,
    })
  } catch (error) {
    return errorResponse('Unexpected function error', 500, error)
  }
})
```

---

## Clientseitiger Aufruf einer Edge Function

Clientseitige Aufrufe sollen nicht direkt quer durch die UI verteilt werden. Stattdessen sollen sie über `src/services/functions-service.js` gekapselt werden.

Beispiel:

```js
export async function invokeGenerateWeeklyReport(payload) {
  const { data, error } = await window.supabaseClient.functions.invoke(
    'generate-weekly-report',
    {
      body: payload,
    }
  )

  if (error) {
    throw error
  }

  return data
}
```

UI-Module rufen dann nur noch den Service auf:

```js
import { invokeGenerateWeeklyReport } from '../../services/functions-service.js'

async function handleGenerateReportClick(reportId) {
  try {
    const result = await invokeGenerateWeeklyReport({ reportId })
    // UI aktualisieren
  } catch (error) {
    // Fehlermeldung anzeigen
  }
}
```

---

## Entwicklungsleitlinien

* Keine Framework-Abhängigkeiten einführen, solange nicht ausdrücklich gewünscht.
* Keine Secrets oder produktiven Zugangsdaten committen.
* Bestehende Vanilla-JS-Patterns respektieren.
* Kleine, nachvollziehbare Funktionen bevorzugen.
* Vor Änderungen prüfen, ob eine Funktion bereits in `script.js`, `src/` oder `supabase/schema.sql` existiert.
* Vor dem Erstellen einer neuen Edge Function prüfen, ob die Logik wirklich serverseitig laufen muss.
* Wiederverwendbare Logik nicht duplizieren, sondern in passende Helper auslagern.
* Änderungen an sichtbarer UI sollten nach Möglichkeit manuell im Browser geprüft werden.
* Änderungen an Edge Functions sollten lokal oder in einer geeigneten Supabase-Umgebung getestet werden.
* Datenbankänderungen müssen mit bestehenden RLS-Policies, Rollen und Zugriffsregeln abgeglichen werden.

---

## Umgang mit bestehendem Code

Da das Projekt historisch gewachsen ist, kann noch viel Logik in großen Dateien wie `script.js` oder einzelnen CSS-Dateien liegen.

Agents sollen bestehende Logik nicht unkontrolliert ersetzen, sondern schrittweise verbessern:

1. Bestehende Funktion suchen.
2. Zweck und Abhängigkeiten verstehen.
3. Kleine, abgegrenzte Änderung machen.
4. Wiederverwendbare Teile in `src/services/`, `src/utils/`, `src/ui/` oder `src/modules/` verschieben.
5. Bestehendes Verhalten erhalten.
6. Nur dann größere Umstrukturierungen vornehmen, wenn sie ausdrücklich gewünscht sind.

---

## Empfohlene Reihenfolge für Refactorings

1. Bestehende App lauffähig halten.
2. Supabase-Konfiguration nach `config/` und `src/services/supabase-client.js` auslagern.
3. Auth-Logik nach `src/services/auth-service.js` und `src/modules/login/` verschieben.
4. Wiederverwendbare UI-Helfer nach `src/ui/` verschieben.
5. Datums-, Formatierungs- und PDF-Helfer nach `src/utils/` verschieben.
6. Fachliche Datenzugriffe nach `src/services/` verschieben.
7. Große UI-Bereiche nach `src/modules/` aufteilen.
8. CSS schrittweise in `styles/` strukturieren.
9. Falls nötig, serverseitige Geschäftslogik in Supabase Edge Functions unter `supabase/functions/` auslagern.
10. Architektur-, Deployment- und Datenmodell-Notizen unter `docs/` dokumentieren.

---

## Dokumentation

Wichtige Architekturentscheidungen sollen dokumentiert werden.

Empfohlene Dokumente:

* `README.md`
  Projektüberblick, lokale Einrichtung, Deployment und wichtige Befehle.

* `docs/architecture.md`
  Aufbau der App, Modulgrenzen, Datenfluss und technische Entscheidungen.

* `docs/deployment.md`
  Hosting, Supabase-Projekt, Umgebungen, Konfiguration und Deployment.

* `docs/data-model.md`
  Tabellen, Beziehungen, Rollen, RLS-Policies und wichtige Datenbankregeln.

* `docs/edge-functions.md`
  Übersicht über vorhandene Edge Functions, deren Zweck, benötigte Secrets, Eingaben, Ausgaben und Deployment-Hinweise.

---

## Sicherheitsregeln

* Keine Secrets committen.
* Keine Service-Role-Keys im Frontend verwenden.
* Service-Role-Keys dürfen ausschließlich serverseitig verwendet werden, z. B. in Supabase Edge Functions.
* RLS-Policies nicht umgehen, außer es ist fachlich nötig und serverseitig sauber begründet.
* Eingaben aus dem Client immer validieren, besonders in Edge Functions.
* Fehlermeldungen an Benutzer sollen verständlich sein, aber keine sensiblen technischen Details preisgeben.
* Interne Fehlerdetails dürfen geloggt werden, sollen aber nicht ungefiltert an den Client zurückgegeben werden.

---

## Zusammenfassung

Dieses Repository bleibt eine Vanilla-JavaScript-Web-App ohne Frontend-Framework. Die Wartbarkeit soll durch klare Trennung verbessert werden:

* `src/` für Frontend-Logik.
* `src/modules/` für fachliche UI-Bereiche.
* `src/services/` für Datenzugriffe und API-/Function-Aufrufe.
* `src/utils/` und `src/ui/` für wiederverwendbare Helfer.
* `styles/` für strukturierte CSS-Dateien.
* `supabase/schema.sql` für das konsolidierte Datenbankschema.
* `supabase/functions/` für Supabase Edge Functions in TypeScript.
* `docs/` für Architektur-, Deployment- und Datenmodell-Dokumentation.
