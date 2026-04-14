import { getActivePoll } from '@/lib/db';
import { APP_NAME } from '@/lib/config';
import { VotingApp } from '@/components/VotingApp';
import { formatDateTime, pollStatusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const poll = await getActivePoll();

  const headline = !poll
    ? `${APP_NAME} – noch keine aktuelle Runde`
    : poll.title;

  const subline = !poll
    ? 'Im Admin-Bereich wurde noch keine aktuelle Abstimmung angelegt.'
    : poll.description || `Wähle genau ${poll.rankingSize} Songs aus und ordne sie von Platz 1 bis ${poll.rankingSize}.`;

  return (
    <main className="page-shell stack-lg">
      <section className="card hero-card">
        <div className="card-body-lg hero-grid">
          <div className="brand-wrap">
            <img src="/logo-knallhart-serviert.jpg" alt="Knallhart serviert Mallorca Podcast" className="brand-logo" />
          </div>
          <div className="stack-md">
            <span className="badge">Publikums-Voting</span>
            <div className="stack-sm">
              <h1 className="heading-xl">{headline}</h1>
              <p className="muted">{subline}</p>
            </div>
            <div className="inline wrap-meta">
              {poll ? <span className="badge">Status: {pollStatusLabel(poll.resolvedStatus)}</span> : null}
              {poll?.startsAt ? <span className="badge">Start: {formatDateTime(poll.startsAt)}</span> : null}
              {poll?.endsAt ? <span className="badge">Ende: {formatDateTime(poll.endsAt)}</span> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <article className="card">
          <div className="card-body-lg stack-md">
            <h2 className="heading-lg">So funktioniert es</h2>
            <div className="info-box small muted">
              Platz 1 erhält die meisten Punkte, der letzte Platz noch 1 Punkt. Die App lässt nur eine vollständige Top-Liste zu. Pro E-Mail zählt nur eine Stimme pro Runde.
            </div>
          </div>
        </article>

        <aside className="card">
          <div className="card-body-lg stack-md">
            <h2 className="heading-lg">Admin</h2>
            <div className="small muted">Admin-Zugang: <a className="notice-link" href="/admin">/admin</a></div>
          </div>
        </aside>
      </section>

      {!poll ? (
        <section className="card">
          <div className="card-body-lg">
            <div className="empty-state">
              <div>
                <h2 className="heading-lg">Keine aktuelle Abstimmung</h2>
                <p>Lege zuerst im Admin-Dashboard eine Runde an.</p>
              </div>
            </div>
          </div>
        </section>
      ) : poll.resolvedStatus !== 'live' ? (
        <section className="card">
          <div className="card-body-lg stack-md">
            <div className="empty-state status-state">
              <div>
                <h2 className="heading-lg">{poll.resolvedStatus === 'scheduled' ? 'Die Abstimmung startet bald.' : poll.resolvedStatus === 'ended' ? 'Diese Abstimmung ist beendet.' : 'Diese Runde ist noch nicht freigegeben.'}</h2>
                <p>
                  {poll.resolvedStatus === 'scheduled'
                    ? poll.startsAt
                      ? `Das Voting beginnt am ${formatDateTime(poll.startsAt)}.`
                      : 'Die Runde ist geplant, aber noch nicht freigegeben.'
                    : poll.resolvedStatus === 'ended'
                    ? poll.endsAt
                      ? `Das Voting wurde am ${formatDateTime(poll.endsAt)} beendet.`
                      : 'Das Voting ist geschlossen.'
                    : 'Der Admin hat diese Runde noch nicht veröffentlicht.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <VotingApp poll={poll} />
      )}
    </main>
  );
}
