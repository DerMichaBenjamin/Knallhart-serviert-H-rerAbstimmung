1. Ersetze diese zwei Dateien in deinem Projekt komplett:
   - app/admin/release-voting/page.tsx
   - app/release-voting/page.tsx

2. Die Dateien in lib/ ebenfalls ersetzen:
   - lib/supabaseAdmin.ts
   - lib/releaseVoting.ts

3. Die SQL-Datei nur einmal in Supabase ausführen, falls noch nicht geschehen.

4. Wenn du Vercel nutzt: neu deployen.

Wichtig:
- Das erste Bundle hatte im Admin einen Redirect-Bug. Dieser ist hier behoben.
- Wenn die öffentliche Seite "Geplant" zeigt, liegt die Startzeit noch in der Zukunft.
- Wenn Admin und öffentliche Seite unterschiedlich aussehen, laufen noch alte und neue Dateien gemischt.
