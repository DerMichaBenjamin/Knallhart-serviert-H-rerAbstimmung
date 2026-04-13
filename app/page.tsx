import { getActivePoll } from '@/lib/db';
import { APP_NAME } from '@/lib/config';
import { VotingApp } from '@/components/VotingApp';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const poll = await getActivePoll();

  return (
    <main className="page-shell stack-lg">
      <section className="grid-2">
        <article className="card">
          <div className="card-body-lg stack-md">
            <span className="badge">Publikums-Voting</span>
            <div className="stack-sm">
              <h1 className="heading-xl">{poll ? poll.title : `${APP_NAME} – noch keine aktive Runde`}</h1>
              <p className="muted">
                {poll
                  ? poll.description ||
                    `Wähle genau ${poll.rankingSize} Songs aus und ordne sie von Platz 1 bis ${poll.rankingSize}.`
                  : 'Im Admin-Bereich wurde noch keine aktive Abstimmung angelegt.'}
              </p>
            </div>
          </div>
        </article>

        <aside className="card">
          <div className="card-body-lg stack-sm">
            <h2 className="heading-lg">So funktioniert es</h2>
            <div className="info-box small muted">
              Platz 1 erhält die meisten Punkte, der letzte Platz noch 1 Punkt. Die App lässt nur eine vollständige Top-Liste zu.
            </div>
            <div className="small muted">
              Admin-Zugang: <a className="notice-link" href="/admin">/admin</a>
            </div>
          </div>
        </aside>
      </section>

      {poll ? (
        <VotingApp poll={poll} />
      ) : (
        <section className="card">
          <div className="card-body-lg">
            <div className="empty-state">
              <div>
                <h2 className="heading-lg">Keine aktive Abstimmung</h2>
                <p>Lege zuerst im Admin-Dashboard eine neue Runde mit Songs an.</p>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
