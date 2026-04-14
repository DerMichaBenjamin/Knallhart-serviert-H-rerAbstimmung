'use client';

import { useEffect, useState } from 'react';
import type { AdminOverview, PollStatus } from '@/lib/types';
import { formatDateTime, formatForDateTimeInput, pollStatusLabel } from '@/lib/utils';

const DEFAULT_SONGS = `Ich könnte dich schöner saufen – Andreas Maintz
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
Schnaps an der Theke – DC#Mark`;

export function AdminDashboard({ initialOverview }: { initialOverview: AdminOverview }) {
  const [overview, setOverview] = useState(initialOverview);
  const [title, setTitle] = useState('Neue Songs der Woche');
  const [slug, setSlug] = useState('neue-songs-der-woche');
  const [rankingSize, setRankingSize] = useState(String(overview.activePoll?.rankingSize ?? 12));
  const [description, setDescription] = useState('Wähle deine Top 12 der Woche.');
  const [songsText, setSongsText] = useState(DEFAULT_SONGS);
  const [newStatus, setNewStatus] = useState<PollStatus>('live');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<PollStatus>('live');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');

  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingCurrent, setUpdatingCurrent] = useState(false);

  useEffect(() => {
    if (!overview.activePoll) return;
    setEditTitle(overview.activePoll.title);
    setEditDescription(overview.activePoll.description || '');
    setEditStatus(overview.activePoll.status);
    setEditStartsAt(formatForDateTimeInput(overview.activePoll.startsAt));
    setEditEndsAt(formatForDateTimeInput(overview.activePoll.endsAt));
  }, [overview.activePoll]);

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
          status: newStatus,
          startsAt: newStartsAt || null,
          endsAt: newEndsAt || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus({ type: 'error', text: result.message || 'Abstimmung konnte nicht angelegt werden.' });
        return;
      }

      setStatus({ type: 'success', text: 'Neue Abstimmungsrunde wurde angelegt.' });
      await refreshOverview();
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Unbekannter Fehler.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateCurrent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setUpdatingCurrent(true);
    try {
      const response = await fetch('/api/admin/poll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          status: editStatus,
          startsAt: editStartsAt || null,
          endsAt: editEndsAt || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus({ type: 'error', text: result.message || 'Aktuelle Runde konnte nicht aktualisiert werden.' });
        return;
      }
      setStatus({ type: 'success', text: 'Aktuelle Runde wurde aktualisiert.' });
      await refreshOverview();
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Unbekannter Fehler.' });
    } finally {
      setUpdatingCurrent(false);
    }
  }

  async function handleStatusAction(nextStatus: PollStatus) {
    setStatus(null);
    setUpdatingCurrent(true);
    try {
      const response = await fetch('/api/admin/poll', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setStatus', status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus({ type: 'error', text: result.message || 'Status konnte nicht geändert werden.' });
        return;
      }
      setStatus({ type: 'success', text: `Runde ist jetzt ${pollStatusLabel(nextStatus).toLowerCase()}.` });
      await refreshOverview();
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Unbekannter Fehler.' });
    } finally {
      setUpdatingCurrent(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <main className="page-shell stack-lg">
      <section className="toolbar hero-toolbar">
        <div className="brand-inline">
          <img src="/logo-knallhart-serviert.jpg" alt="Knallhart serviert" className="brand-logo brand-logo-small" />
          <div className="stack-sm">
            <span className="badge">Admin-Dashboard</span>
            <h1 className="heading-xl">Release-Voting verwalten</h1>
            <p className="muted">Hier legst du neue Runden an, planst Zeiträume, beendest Runden manuell und siehst die laufenden Ergebnisse.</p>
          </div>
        </div>
        <div className="inline">
          {overview.activePoll ? (
            <a className="button secondary" href="/api/admin/export">CSV exportieren</a>
          ) : null}
          <button className="button secondary" type="button" onClick={handleLogout}>Ausloggen</button>
        </div>
      </section>

      {status ? <div className={`alert ${status.type}`}>{status.text}</div> : null}

      <section className="grid-4">
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Aktuelle Runde</span><strong>{overview.activePoll?.title ?? '—'}</strong></div></div>
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Status</span><strong>{overview.activePoll ? pollStatusLabel(overview.activePoll.resolvedStatus) : '—'}</strong></div></div>
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Abgegebene Stimmen</span><strong>{overview.voteCount}</strong></div></div>
        <div className="card"><div className="card-body-lg kpi"><span className="muted small">Songs in aktueller Runde</span><strong>{overview.activePoll?.songs.length ?? 0}</strong></div></div>
      </section>

      {overview.activePoll ? (
        <section className="grid-2">
          <article className="card">
            <div className="card-body-lg stack-md">
              <h2 className="heading-lg">Aktuelle Runde steuern</h2>
              <p className="muted small">Titel, Beschreibung, Zeitraum und Status kannst du ändern. Die Songliste einer laufenden Runde wird bewusst nicht live bearbeitet, damit die Abstimmung fair bleibt.</p>
              <form className="stack-md" onSubmit={handleUpdateCurrent}>
                <label className="field">
                  <span className="label">Titel</span>
                  <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="label">Beschreibung</span>
                  <input className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </label>
                <div className="grid-3 compact-grid">
                  <label className="field">
                    <span className="label">Status</span>
                    <select className="select" value={editStatus} onChange={(e) => setEditStatus(e.target.value as PollStatus)}>
                      <option value="draft">Entwurf</option>
                      <option value="scheduled">Geplant</option>
                      <option value="live">Live</option>
                      <option value="ended">Beendet</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Start</span>
                    <input className="input" type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                  </label>
                  <label className="field">
                    <span className="label">Ende</span>
                    <input className="input" type="datetime-local" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
                  </label>
                </div>
                <div className="inline">
                  <button className="button" type="submit" disabled={updatingCurrent}>{updatingCurrent ? 'Speichert ...' : 'Änderungen speichern'}</button>
                  <button className="button secondary" type="button" disabled={updatingCurrent} onClick={() => handleStatusAction('live')}>Jetzt starten</button>
                  <button className="button secondary" type="button" disabled={updatingCurrent} onClick={() => handleStatusAction('ended')}>Jetzt beenden</button>
                </div>
              </form>
            </div>
          </article>

          <article className="card">
            <div className="card-body-lg stack-md">
              <h2 className="heading-lg">Aktuelle Zeitsteuerung</h2>
              <div className="info-box stack-sm">
                <div><strong>Status:</strong> {pollStatusLabel(overview.activePoll.resolvedStatus)}</div>
                <div><strong>Start:</strong> {overview.activePoll.startsAt ? formatDateTime(overview.activePoll.startsAt) : 'nicht gesetzt'}</div>
                <div><strong>Ende:</strong> {overview.activePoll.endsAt ? formatDateTime(overview.activePoll.endsAt) : 'nicht gesetzt'}</div>
                <div><strong>Hinweis:</strong> Wenn Start oder Ende gesetzt sind, steuert die App die Sichtbarkeit automatisch mit. Ein manueller Statuswechsel überschreibt das zusätzlich.</div>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      <section className="grid-2">
        <article className="card">
          <div className="card-body-lg stack-md">
            <h2 className="heading-lg">Neue Abstimmungsrunde anlegen</h2>
            <p className="muted small">Format für die Songliste: pro Zeile <strong>Songtitel – Interpret</strong>. Neue Runden werden automatisch zur aktuellen Runde.</p>
            <form className="stack-md" onSubmit={handleCreatePoll}>
              <label className="field">
                <span className="label">Titel der Runde</span>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </label>

              <div className="grid-2 form-grid-mixed">
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

              <div className="grid-3 compact-grid">
                <label className="field">
                  <span className="label">Status</span>
                  <select className="select" value={newStatus} onChange={(e) => setNewStatus(e.target.value as PollStatus)}>
                    <option value="draft">Entwurf</option>
                    <option value="scheduled">Geplant</option>
                    <option value="live">Live</option>
                    <option value="ended">Beendet</option>
                  </select>
                </label>
                <label className="field">
                  <span className="label">Start</span>
                  <input className="input" type="datetime-local" value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} />
                </label>
                <label className="field">
                  <span className="label">Ende</span>
                  <input className="input" type="datetime-local" value={newEndsAt} onChange={(e) => setNewEndsAt(e.target.value)} />
                </label>
              </div>

              <label className="field">
                <span className="label">Songliste</span>
                <textarea className="textarea" value={songsText} onChange={(e) => setSongsText(e.target.value)} required />
              </label>

              <button className="button" type="submit" disabled={saving}>{saving ? 'Speichert ...' : 'Neue Runde anlegen'}</button>
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
                    <th>Status</th>
                    <th>Start</th>
                    <th>Ende</th>
                    <th>Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentPolls.map((poll) => (
                    <tr key={poll.id}>
                      <td>{poll.title}<div className="small muted">{poll.slug}</div></td>
                      <td>{pollStatusLabel(poll.resolvedStatus)}</td>
                      <td>{poll.startsAt ? formatDateTime(poll.startsAt) : '—'}</td>
                      <td>{poll.endsAt ? formatDateTime(poll.endsAt) : '—'}</td>
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
            <h2 className="heading-lg">Ergebnisse der aktuellen Runde</h2>
            {overview.activePoll ? <span className="badge">{overview.activePoll.slug}</span> : null}
          </div>

          {!overview.activePoll ? (
            <div className="empty-state"><div>Es gibt noch keine aktuelle Runde.</div></div>
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
                  <tr><td colSpan={3}>Noch keine Stimmen vorhanden.</td></tr>
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
