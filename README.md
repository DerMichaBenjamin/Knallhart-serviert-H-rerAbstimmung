# Release Voting App

Eine kleine Web-App für ein Publikums-Voting mit Top-Liste per Drag-and-drop.

## Was die App kann

- Nutzer ziehen Songs in eine persönliche Top-Liste.
- Die Reihenfolge bestimmt die Punkte.
- Pro E-Mail ist nur **eine Stimme pro Runde** erlaubt.
- Admin-Dashboard zum Anlegen neuer Runden.
- Live-Auswertung im Admin-Bereich.
- CSV-Export der aktuellen Ergebnisse.

## Technik

- **Next.js App Router**
- **Supabase Postgres** als Datenbank
- **Vercel** für das Hosting

---

## Anleitung für Nicht-Programmierer

### 1. Supabase-Konto anlegen

1. Gehe zu Supabase und lege ein Projekt an.
2. Warte, bis das Projekt fertig erstellt ist.
3. Öffne im Projekt den **SQL Editor**.
4. Kopiere den Inhalt aus `supabase/schema.sql` hinein.
5. Führe das SQL-Skript aus.

Danach existieren die Tabellen für Abstimmungen, Songs und Stimmen.

### 2. Die wichtigen Schlüssel kopieren

Du brauchst später:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Diese findest du in deinem Supabase-Projekt bei den API-/Projekt-Einstellungen.

**Wichtig:** Der Service-Role-Key gehört **nur** in die Server-Umgebungsvariablen. Niemals öffentlich posten.

### 3. GitHub-Repository anlegen

1. Lege bei GitHub ein neues leeres Repository an.
2. Lade den kompletten Inhalt dieses Ordners dort hoch.

Der einfachste Weg:
- Ordner lokal entpacken
- GitHub Desktop installieren
- Repository klonen
- Dateien hineinkopieren
- Commit + Push

### 4. Vercel-Projekt anlegen

1. Gehe zu Vercel.
2. Klicke auf **Add New Project**.
3. Verbinde dein GitHub-Konto.
4. Wähle das eben erstellte Repository aus.
5. Vor dem Deploy unter **Environment Variables** diese Werte anlegen:

- `NEXT_PUBLIC_APP_URL` → später deine Vercel-URL oder erstmal `http://localhost:3000`
- `SUPABASE_URL` → aus Supabase
- `SUPABASE_SERVICE_ROLE_KEY` → aus Supabase
- `ADMIN_PASSWORD` → dein gewünschtes Admin-Passwort

6. Danach auf **Deploy** klicken.

### 5. Nach dem ersten Deploy

- Öffne die Vercel-URL der App.
- Die Startseite ist das Nutzer-Voting.
- Der Admin-Bereich liegt unter:

`/admin`

Dort loggst du dich mit `ADMIN_PASSWORD` ein.

### 6. Eine neue Voting-Runde anlegen

Im Admin-Dashboard:

1. Titel eingeben
2. Slug eingeben (z. B. `kw16-2026`)
3. Platzanzahl eingeben, z. B. `12`
4. Songliste einfügen, **eine Zeile pro Song**

Format:

```text
Ich könnte dich schöner saufen – Andreas Maintz
Bodenlos – Jenny Wendelberger
Geld ist nur Papier – Minnie Rock
```

Dann auf **Runde aktivieren** klicken.

Ab jetzt sehen Nutzer auf der Startseite genau diese Runde.

### 7. Ergebnisse ansehen

Im Admin-Dashboard siehst du:

- aktuelle Punkte je Song
- Anzahl der Nennungen
- Anzahl der Platz-1-Stimmen
- durchschnittlichen Platz
- letzte abgegebene Stimmen

Mit **CSV exportieren** kannst du die aktuelle Auswertung herunterladen.

---

## Lokal starten (optional)

Wenn du oder jemand aus deinem Umfeld die App lokal testen will:

```bash
npm install
npm run dev
```

Dann läuft die App unter `http://localhost:3000`.

Vorher `.env.example` in `.env.local` kopieren und ausfüllen.

---

## Wichtige Hinweise

- Diese Version nutzt einen **einfachen Admin-Passwort-Login per Cookie**. Für dein Projekt ist das praktisch, aber nicht enterprise-tauglich.
- Wenn du später mehrere Admins, Benutzerkonten oder feinere Rechte brauchst, solltest du auf echte Auth umstellen.
- Stimmen werden serverseitig gespeichert. Nutzer sprechen **nicht direkt** mit Supabase, sondern nur mit den Next.js-API-Routen.
- Für jede neue oder geänderte Umgebungsvariable musst du in Vercel neu deployen.

---

## Struktur des Projekts

- `app/` → Seiten und API-Routen
- `components/` → React-Komponenten
- `lib/` → Datenbank- und Auth-Helfer
- `supabase/schema.sql` → Datenbank-Schema

