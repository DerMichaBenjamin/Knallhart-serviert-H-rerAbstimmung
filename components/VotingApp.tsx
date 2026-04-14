'use client';

import { useMemo, useState } from 'react';
import type { PublicPoll } from '@/lib/types';

export function VotingApp({ poll }: { poll: PublicPoll }) {
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [search, setSearch] = useState('');
  const [rankedIds, setRankedIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragState, setDragState] = useState<{ id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const songMap = useMemo(() => Object.fromEntries(poll.songs.map((song) => [song.id, song])), [poll.songs]);

  const availableSongs = poll.songs.filter((song) => {
    if (rankedIds.includes(song.id)) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${song.title} ${song.artist}`.toLowerCase().includes(q);
  });

  const rankedSongs = rankedIds.map((id) => songMap[id]).filter(Boolean);
  const totalPoints = rankedIds.reduce((sum, _id, index) => sum + (poll.rankingSize - index), 0);
  const maxTotalPoints = (poll.rankingSize * (poll.rankingSize + 1)) / 2;

  function addSong(songId: string) {
    setMessage(null);
    if (rankedIds.includes(songId)) return;
    if (rankedIds.length >= poll.rankingSize) {
      setMessage({ type: 'error', text: `Du kannst maximal ${poll.rankingSize} Songs auswählen.` });
      return;
    }
    setRankedIds((prev) => [...prev, songId]);
  }

  function removeSong(songId: string) {
    setMessage(null);
    setRankedIds((prev) => prev.filter((id) => id !== songId));
  }

  function moveSong(songId: string, direction: -1 | 1) {
    setRankedIds((prev) => {
      const index = prev.indexOf(songId);
      const newIndex = index + direction;
      if (index === -1 || newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  }

  function insertIntoRanked(songId: string, index: number | null) {
    setRankedIds((prev) => {
      const withoutSong = prev.filter((id) => id !== songId);
      const targetIndex = index == null ? withoutSong.length : Math.max(0, Math.min(index, withoutSong.length));
      if (withoutSong.length >= poll.rankingSize && !prev.includes(songId)) {
        setMessage({ type: 'error', text: `Deine Top ${poll.rankingSize} ist bereits voll.` });
        return prev;
      }
      const next = [...withoutSong];
      next.splice(targetIndex, 0, songId);
      return next.slice(0, poll.rankingSize);
    });
  }

  function onDragStart(songId: string) {
    setDragState({ id: songId });
    setDropTarget(null);
  }

  function onDropIntoRanked(index: number | null) {
    if (!dragState) return;
    insertIntoRanked(dragState.id, index);
    setDragState(null);
    setDropTarget(null);
  }

  async function handleSubmit() {
    setMessage(null);

    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Bitte gib deine E-Mail-Adresse ein.' });
      return;
    }
    if (rankedIds.length !== poll.rankingSize) {
      setMessage({ type: 'error', text: `Bitte wähle genau ${poll.rankingSize} Songs aus.` });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollSlug: poll.slug,
          email,
          instagram,
          ranking: rankedIds,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: result.message || 'Die Abstimmung konnte nicht gespeichert werden.' });
        return;
      }

      setMessage({ type: 'success', text: result.message || 'Deine Stimme wurde gespeichert.' });
      setRankedIds([]);
      setEmail('');
      setInstagram('');
      setSearch('');
    } catch {
      setMessage({ type: 'error', text: 'Netzwerkfehler. Bitte versuche es erneut.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="stack-lg">
      <section className="grid-2">
        <article className="card">
          <div className="card-body-lg stack-md">
            <div className="grid-2 form-grid-2">
              <label className="field">
                <span className="label">E-Mail-Adresse</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
                <span className="small muted">Eine E-Mail kann pro Runde nur einmal abstimmen.</span>
              </label>

              <label className="field">
                <span className="label">Instagram-Name (optional)</span>
                <input
                  className="input"
                  value={instagram}
                  onChange={(event) => setInstagram(event.target.value)}
                  placeholder="@deinname"
                />
              </label>
            </div>

            {message ? <div className={`alert ${message.type}`}>{message.text}</div> : null}
          </div>
        </article>

        <aside className="card">
          <div className="card-body-lg stack-md">
            <div className="grid-3">
              <div className="kpi"><span className="muted small">Verfügbare Songs</span><strong>{poll.songs.length}</strong></div>
              <div className="kpi"><span className="muted small">Ausgewählt</span><strong>{rankedIds.length} / {poll.rankingSize}</strong></div>
              <div className="kpi"><span className="muted small">Verteilte Punkte</span><strong>{totalPoints} / {maxTotalPoints}</strong></div>
            </div>
            <div className="info-box small muted">
              Du kannst Songs per Drag-and-drop in die rechte Liste ziehen oder den Button „+“ benutzen. In der Top-Liste kannst du Songs per Drag-and-drop neu sortieren.
            </div>
          </div>
        </aside>
      </section>

      <section className="grid-main">
        <article className="card">
          <div className="card-body-lg stack-md">
            <div className="toolbar">
              <h2 className="heading-lg">Alle Songs</h2>
              <span className="badge">{availableSongs.length} verfügbar</span>
            </div>

            <label className="field">
              <span className="label">Suche</span>
              <input
                className="input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Titel oder Interpret suchen"
              />
            </label>

            <div className="song-panel">
              <div className="song-list">
                {availableSongs.map((song) => (
                  <div
                    key={song.id}
                    className={`song-card ${dragState?.id === song.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={() => onDragStart(song.id)}
                    onDragEnd={() => {
                      setDragState(null);
                      setDropTarget(null);
                    }}
                  >
                    <div className="song-meta">
                      <div className="song-title">{song.title}</div>
                      <div className="song-artist">{song.artist}</div>
                    </div>
                    <div className="song-actions">
                      <button type="button" className="icon-button" onClick={() => addSong(song.id)}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <div className="card-body-lg stack-md">
            <div className="toolbar">
              <h2 className="heading-lg">Deine Top {poll.rankingSize}</h2>
              <span className="badge">Reihenfolge = Punkte</span>
            </div>

            <div
              className={`drop-slot ${dropTarget === 'end' ? 'over' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget('end');
              }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(event) => {
                event.preventDefault();
                onDropIntoRanked(null);
              }}
            >
              {rankedSongs.length === 0 ? (
                <div className="empty-state">
                  <div>
                    <h3 className="heading-md">Noch keine Songs ausgewählt</h3>
                    <p>Ziehe Songs hier hinein oder nutze links den Plus-Button.</p>
                  </div>
                </div>
              ) : (
                <div className="song-list" style={{ maxHeight: 'none' }}>
                  {rankedSongs.map((song, index) => (
                    <div key={`${song.id}-${index}`} className="stack-sm">
                      <div
                        className={`drop-slot ${dropTarget === `slot-${index}` ? 'over' : ''}`}
                        style={{ minHeight: '20px' }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDropTarget(`slot-${index}`);
                        }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={(event) => {
                          event.preventDefault();
                          onDropIntoRanked(index);
                        }}
                      />
                      <div
                        className={`song-card ${dragState?.id === song.id ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => onDragStart(song.id)}
                        onDragEnd={() => {
                          setDragState(null);
                          setDropTarget(null);
                        }}
                      >
                        <div className="song-rank">{index + 1}<small>{poll.rankingSize - index}P</small></div>
                        <div className="song-meta">
                          <div className="song-title">{song.title}</div>
                          <div className="song-artist">{song.artist}</div>
                        </div>
                        <div className="song-actions">
                          <button type="button" className="icon-button" onClick={() => moveSong(song.id, -1)}>↑</button>
                          <button type="button" className="icon-button" onClick={() => moveSong(song.id, 1)}>↓</button>
                          <button type="button" className="icon-button" onClick={() => removeSong(song.id)}>×</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="toolbar">
              <div className="small muted">Nur mit genau {poll.rankingSize} Songs ist die Abstimmung gültig.</div>
              <div className="inline">
                <button type="button" className="button secondary" onClick={() => setRankedIds([])}>Zurücksetzen</button>
                <button type="button" className="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Speichert ...' : 'Abstimmen'}
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}
