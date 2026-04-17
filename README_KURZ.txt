RELEASE VOTING BUNDLE V3

WAS DU MACHEN SOLLST
1) Dieses ZIP entpacken.
2) Die enthaltenen Ordner/Dateien in dein Next.js-Projekt kopieren und vorhandene Dateien ersetzen.
3) Die Datei supabase_release_voting.sql komplett in Supabase im SQL Editor ausführen.
4) Die Datei .env.local.example in .env.local umbenennen.
5) In .env.local deine zwei echten Supabase-Werte eintragen:
   NEXT_PUBLIC_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=DEIN_SERVICE_ROLE_KEY
6) Einmal im Projektordner ausführen:
   npm install @supabase/supabase-js
7) Danach neu starten oder neu deployen.

WELCHE SEITEN DU DANN HAST
- Admin: /admin/release-voting
- Aktuelle Umfrage: /release-voting
- Einzelne Umfrage: /release-voting/[slug]

WICHTIG
- Admin und öffentliche Seite nutzen jetzt dieselbe Status-Logik.
- Wenn eine Runde im Admin auf "Live" angelegt oder auf "Aktivieren" gesetzt wird,
  wird sie öffentlich sofort als live behandelt.
- Die öffentliche Seite prüft NICHT mehr extra, ob Start/Ende "schon erreicht" sind,
  weil genau das vorher zu dem Geplant/Live-Widerspruch geführt hat.
- Die Datumsfelder dienen jetzt vor allem zur Anzeige und Planung im Admin.

DATEIEN IN DIESEM PAKET
- app/admin/layout.tsx
- app/admin/release-voting/page.tsx
- app/release-voting/page.tsx
- app/release-voting/[slug]/page.tsx
- app/api/release-voting/admin/create-round/route.ts
- app/api/release-voting/admin/end-round/route.ts
- app/api/release-voting/admin/set-current/route.ts
- app/api/release-voting/submit/route.ts
- components/release-voting/PublicVotingForm.tsx
- lib/supabaseAdmin.ts
- lib/releaseVoting.ts
- supabase_release_voting.sql
- .env.local.example
