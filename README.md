# Release Voting App

Deploybare Next.js-App für ein Song-Ranking mit Drag-and-drop, Supabase-Speicherung, Admin-Bereich, Zeitsteuerung und Logo.

## Neu in dieser Version

- Start- und Endzeit pro Runde
- Status pro Runde: Entwurf, Geplant, Live, Beendet
- manuelles Starten und Beenden im Admin
- öffentliches Logo im Header
- bestehende Live-Runden können in Titel, Beschreibung und Zeitraum angepasst werden
- Songliste einer laufenden Runde wird bewusst nicht live bearbeitet, damit das Voting fair bleibt

## Benötigte Umgebungsvariablen

- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`

## Neue Datenbank

Wenn du die Datenbank neu anlegst, führe in Supabase die Datei `supabase/schema.sql` aus.

## Bestehende Datenbank aktualisieren

Wenn die App schon läuft, führe stattdessen in Supabase die Datei `supabase/update_v2.sql` aus.

## Logo

Das Logo liegt als `public/logo-knallhart-serviert.jpg` im Projekt. Wenn du es austauschen willst, ersetze einfach diese Datei.

## Lokaler Start

```bash
npm install
npm run dev
```

## Deploy

- Repo zu GitHub hochladen
- Projekt in Vercel importieren oder bestehenden Build neu deployen
- Umgebungsvariablen setzen
- bei bestehender Datenbank `update_v2.sql` ausführen
- danach Vercel neu deployen
