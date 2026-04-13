'use client';

import { useState } from 'react';
import type { AdminOverview } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';

export function AdminDashboard({ initialOverview }: { initialOverview: AdminOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [title, setTitle] = useState('Neue Songs der Woche');
  const [slug, setSlug] = useState('neue-songs-der-woche');
  const [rankingSize, setRankingSize] = useState(String(overview.activePoll?.rankingSize ?? 12));
  const [description, setDescription] = useState('Wähle deine Top 12 der Woche.');
  const [songsText, setSongsText] = useState(`Ich könnte dich schöner saufen – Andreas Maintz
Bodenlos – Jenny Wendelberger
Geld ist nur Papier – Minnie Rock
Bierzelt Legende – Troglauer
Bei 3 ist hier Malle (11 Jecke) – @47_kö11sch, DJ Aaron
Hola Hola (Der Sohn von Miguel) – Der Zipfelbube, Carolina, Almklausi
Schäferstock – Schäfer Heinrich
K2 – Tream, Blümchen
Offline – Promillebrüder
Blutgruppe Alkohol – Maxi McFly
Scheißegal – Frenzy, Isi Glück
PARTY TRANSFORMER – Die Atzen
NACHTRINKEN – Ikke Hüftgold
Endlich Wieder Ballern – Tobi Torpedo
Blaulicht – Kati Zucker
Drogen, Palmen, Sex & Bier – Tunel, Malleario
Endlich wieder Freitag – Tommy Fieber
Eins ist Fakt (gef*ckt wird nackt) – Sabbotage
Hauch mich mal an – Kikii
Flick Flack Festival remix – Habe Dere & Susi Blau
Wie 007 – Nancy Franck
Die Taube – Manni Manta
Zucchini im Bikini – Marko P
Aj Caramba – Micha Schue
Autopilot – Mallotzi Boys
Malle Hardcore – Goldjungs, DJ Fabi Fiesta
Nur mit Dir – Lollo Promillo
Sonnenbrand & Wodka – DJ Robin, Domy Berger
Stadionverbot – Die Bierfreunde, James Blond, Harry Steil, Der Kevin
Voll kaputt – Volker Putt
Single – LaLa Lacht
Zirkus – Captain Shark
112 – Der Ranger
Eine Nacht am Ballermann – Sebastian Peres
Boarding complete – Nina Reh
Wir sind Fußballer – Markus Becker, Fabio Gandolfo, JannikFreestyle
Rumpunzel – Alman Andi
ICH ZIEHE IHN HÄRTER RAUS WIE DU IHN REINSTECKST – BB Klaus
Verdammt – DJ Ötzi
Dicke Anna – Eliah Sternhardt, NOISETIME, NIKSTER
Zimmermann – Fräulein Süss
SCHLÜSSEL (2K26) – Malle Moritz, DJTB
Galabau – Jan Grün
Partykater – JoePro
Snapchat – Pepe Palme, Der Palatino
All we need is bass – Alex Engel, Ela Zuberi, DJ Spotti, TOBEY NIZE
Liebe auf Mallorca – Olaf Henning
Die Palme steht – Oliver Lemon, Peter Milski
Lawinengefahr – Peter Rüssel
Party Vulkan – Stefan Micha
Nie nüchtern – Kaja - Kanone
Schnaps an der Theke – DC#Mark`);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function refreshOverview() {
    const response = await fetch('/api/admin/results', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Dashboard konnte nicht aktualisiert werden.');
    }
    setOverview(result);
  }

  async function handleCreatePoll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setSaving(true);

    try {
      const response = await fetch('/api/admin/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          rankingSize: Number(rankingSize),
          description,
          songsText,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus({ type: 'error', text: result.message || 'Abstimmung konnte nicht angelegt werden.' });
        return;
      }

      setStatus({ type: 'success', text: 'Neue Abstimmungsrunde wurde angelegt und aktiviert.' });
      await refreshOverview();
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Unbekannter Fehler.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <main className="page-shell stack-lg">
      <section className="toolbar">
        <div className="stack-sm">
          <span className="badge">Admin-Dashboard</span>
          <h1 className="heading-xl">Release-Voting verwalten</h1>
          <p className="muted">Hier legst du neue Runden an und siehst die laufenden Ergebnisse.</p>
        </div>
        <div className="inline">
          {overview.activePoll ? (
            <a className="button secondary" href="/api/admin/export">
              CSV exportieren
            </a>
          ) : null}
          <button className="button secondary" type="button" onClick={handleLogout}>
            Ausloggen
          </button>
        </div>
      </section>

      <section className="grid-3">
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Aktive Runde</span><strong>{overview.activePoll?.title ?? '—'}</strong></div></div>
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Abgegebene Stimmen</span><strong>{overview.voteCount}</strong></div></div>
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Songs in aktiver Runde</span><strong>{overview.activePoll?.songs.length ?? 0}</strong></div></div>
      </section>

      <section className="grid-2">
        <article className="card">
          <div className="card-body-lg stack-md">
            <h2 className="heading-lg">Neue Abstimmungsrunde anlegen</h2>
            <p className="muted small">
              Format für die Songliste: pro Zeile <strong>Songtitel – Interpret</strong>. Sobald du speicherst, wird diese Runde aktiv gesetzt.
            </p>

            {status ? <div className={`alert ${status.type}`}>{status.text}</div> : null}

            <form className="stack-md" onSubmit={handleCreatePoll}>
              <label className="field">
                <span className="label">Titel der Runde</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>

              <div className="grid-2" style={{ gridTemplateColumns: '1fr 220px' }}>
                <label className="field">
                  <span className="label">Slug / URL-Kürzel</span>
                  <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="label">Platzanzahl</span>
                  <input className="input" type="number" min={1} value={rankingSize} onChange={(e) => setRankingSize(e.target.value)} required />
                </label>
              </div>

              <label className="field">
                <span className="label">Beschreibung</span>
                <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>

              <label className="field">
                <span className="label">Songliste</span>
                <textarea className="textarea" value={songsText} onChange={(e) => setSongsText(e.target.value)} required />
              </label>

              <button className="button" type="submit" disabled={saving}>
                {saving ? 'Speichert ...' : 'Runde aktivieren'}
              </button>
            </form>
          </div>
        </article>

        <article className="card">
          <div className="card-body-lg stack-md">
            <h2 className="heading-lg">Letzte Runden</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Titel</th>
                    <th>Slug</th>
                    <th>Plätze</th>
                    <th>Status</th>
                    <th>Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentPolls.map((poll) => (
                    <tr key={poll.id}>
                      <td>{poll.title}</td>
                      <td>{poll.slug}</td>
                      <td>{poll.rankingSize}</td>
                      <td>{poll.isActive ? 'aktiv' : 'archiv'}</td>
                      <td>{formatDateTime(poll.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>

      <section className="card">
        <div className="card-body-lg stack-md">
          <div className="toolbar">
            <h2 className="heading-lg">Ergebnisse der aktiven Runde</h2>
            {overview.activePoll ? <span className="badge">{overview.activePoll.slug}</span> : null}
          </div>

          {!overview.activePoll ? (
            <div className="empty-state"><div>Es gibt noch keine aktive Runde.</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Platz</th>
                    <th>Song</th>
                    <th>Interpret</th>
                    <th>Punkte</th>
                    <th>Nennungen</th>
                    <th>#1</th>
                    <th>Ø Platz</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.results.map((row, index) => (
                    <tr key={row.songId}>
                      <td>{index + 1}</td>
                      <td>{row.title}</td>
                      <td>{row.artist}</td>
                      <td>{row.totalPoints}</td>
                      <td>{row.appearances}</td>
                      <td>{row.firstPlaces}</td>
                      <td>{row.averageRank ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-body-lg stack-md">
          <h2 className="heading-lg">Letzte abgegebene Stimmen</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>E-Mail</th>
                  <th>Instagram</th>
                  <th>Zeitpunkt</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentVotes.length === 0 ? (
                  <tr>
                    <td colSpan={3}>Noch keine Stimmen vorhanden.</td>
                  </tr>
                ) : (
                  overview.recentVotes.map((vote) => (
                    <tr key={`${vote.email}-${vote.submittedAt}`}>
                      <td>{vote.email}</td>
                      <td>{vote.instagram || '—'}</td>
                      <td>{formatDateTime(vote.submittedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
