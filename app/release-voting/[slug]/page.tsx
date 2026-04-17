import Link from "next/link";
import PublicVotingForm from "@/components/release-voting/PublicVotingForm";
import {
  buildResults,
  formatDateTime,
  getRoundBySlug,
  getVotesForRound,
  statusClass,
  statusLabel,
} from "@/lib/releaseVoting";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReleaseVotingSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const round = await getRoundBySlug(slug);

  if (!round) {
    return (
      <main className="min-h-screen bg-zinc-100 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-950">
            Umfrage nicht gefunden
          </h1>
          <p className="mt-4 text-zinc-600">
            Für diesen Link wurde keine Runde gefunden.
          </p>
          <Link
            href="/release-voting"
            className="mt-6 inline-flex rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
          >
            Zur aktuellen Umfrage
          </Link>
        </div>
      </main>
    );
  }

  const votes = await getVotesForRound(round.id);
  const songs = Array.isArray(round.songs_json) ? round.songs_json : [];
  const results = buildResults(songs, votes);

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-zinc-100 px-4 py-1 text-sm font-medium text-zinc-700">
                Einzelne Umfrage
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 md:text-5xl">
                {round.title}
              </h1>
              {round.description && (
                <p className="mt-4 max-w-3xl text-lg text-zinc-600">{round.description}</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-medium ${statusClass(round.status)}`}>
                  Status: {statusLabel(round.status)}
                </span>
                <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
                  Start: {formatDateTime(round.start_at)}
                </span>
                <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700">
                  Ende: {formatDateTime(round.end_at)}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="text-sm text-zinc-500">Slug</div>
              <div className="mt-1 text-sm font-semibold text-zinc-900">{round.slug}</div>
              <div className="mt-4 text-sm text-zinc-500">Stimmen</div>
              <div className="mt-1 text-3xl font-bold text-zinc-950">{votes.length}</div>

              <Link
                href="/release-voting"
                className="mt-6 inline-flex rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
              >
                Zur aktuellen Umfrage
              </Link>
            </div>
          </div>
        </section>

        {round.status === "live" ? (
          <PublicVotingForm
            roundId={round.id}
            roundSlug={round.slug}
            placesCount={round.places_count}
            songs={songs}
          />
        ) : (
          <section className="rounded-[32px] border border-zinc-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Diese Umfrage ist aktuell nicht live.
            </h2>
            <p className="mt-3 text-zinc-600">
              Status: {statusLabel(round.status)}
            </p>
          </section>
        )}

        <section className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Ranking
          </h2>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-zinc-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">#</th>
                  <th className="pb-3 pr-4 font-medium">Song</th>
                  <th className="pb-3 pr-4 font-medium">Ø Punkte</th>
                  <th className="pb-3 pr-4 font-medium">Gesamt</th>
                  <th className="pb-3 pr-4 font-medium">Wertungen</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.song} className="border-b border-zinc-100">
                    <td className="py-4 pr-4 font-semibold text-zinc-900">{row.rank}</td>
                    <td className="py-4 pr-4 text-zinc-900">{row.song}</td>
                    <td className="py-4 pr-4 text-zinc-700">{row.averagePoints.toFixed(2)}</td>
                    <td className="py-4 pr-4 text-zinc-700">{row.totalPoints}</td>
                    <td className="py-4 pr-4 text-zinc-700">{row.voteCount}</td>
                  </tr>
                ))}

                {results.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-zinc-500">
                      Noch keine Stimmen vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
