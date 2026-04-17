KURZANLEITUNG

1) Diese 4 Dateien/Ordner in dein Projekt kopieren und vorhandene Dateien ersetzen:
- app/admin/release-voting/page.tsx
- app/release-voting/page.tsx
- lib/supabaseAdmin.ts
- lib/releaseVoting.ts

2) Die Datei supabase_release_voting.sql in Supabase im SQL Editor komplett ausführen.

3) Die Datei .env.local.example kopieren, in .env.local umbenennen und deine echten Supabase-Werte eintragen.

4) Einmal im Projekt ausführen:
npm install @supabase/supabase-js

5) Danach neu starten / neu deployen.

SEITEN
- Admin: /admin/release-voting
- Public Voting: /release-voting
