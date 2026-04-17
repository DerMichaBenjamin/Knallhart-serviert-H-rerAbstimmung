import Link from "next/link";
import {
  buildResults,
  formatDateTime,
  getCurrentRound,
  getLastRounds,
  getVotesForRound,
  nowLocalInputValue,
  statusClass,
  statusLabel,
} from "@/lib/releaseVoting";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReleaseVotingAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";

  const currentRound = await getCurrentRound();
  const lastRounds = await getLastRounds(20);
  const currentVotes = currentRound ? await getVotesForRound(currentRound.id) : [];
  const currentSongs = Array.isArray(currentRound?.songs_json) ? currentRound!.songs_json : [];
  const results = currentRound ? buildResults(currentSongs, currentVotes) : [];

  return (
    <main className="space-y-6">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-zinc-100 px-4 py-1 text-sm font-medium text-zinc-700">
              Admin-Dashboard
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 md:text-5xl">
              Release-Voting verwalten
            </h1>
            <p className="mt-3 max-w-3xl text-zinc-600">
              Runde anlegen, live schalten, Ergebnisse prüfen und den direkten Link zur
              jeweiligen Umfrage öffnen.
            </p>
          </div>

          <div className="grid min-w-[220px] gap-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Aktuelle Runde</div>
              <div className="mt-1 font-semibold text-zinc-900">
                {currentRound?.title ?? "Keine aktive Runde"}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Abgegebene Stimmen</div>
              <div className="mt-1 text-2xl font-bold text-zinc-900">{currentVotes.length}</div>
            </div>
          </div>
        </div>

        {success && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            {decodeURIComponent(success)}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {decodeURIComponent(error)}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm text-zinc-500">Status</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">
              {currentRound ? statusLabel(currentRound.status) : "—"}
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm text-zinc-500">Songs</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">{currentSongs.length}</div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm text-zinc-500">Start</div>
            <div className="mt-2 text-base font-semibold text-zinc-900">
              {formatDateTime(currentRound?.start_at)}
            </div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="text-sm text-zinc-500">Ende</div>
            <div className="mt-2 text-base font-semibold text-zinc-900">
              {formatDateTime(currentRound?.end_at)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Neue Runde anlegen
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Format für die Songliste: pro Zeile <strong>Songtitel – Interpret</strong>. Wenn du
            den Status direkt auf <strong>Live</strong> setzt, wird diese Runde sofort öffentlich
            live angezeigt.
          </p>

          <form action="/api/release-voting/admin/create-round" method="post" className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Titel der Runde</label>
              <input
                name="title"
                required
                defaultValue={`Neue Songs der Woche ${new Date().toLocaleDateString("de-DE")}`}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-[2fr,1fr]">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Slug / URL-Kürzel</label>
                <input
                  name="slug"
                  required
                  placeholder="neue-songs-25-04-2026"
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Platzanzahl</label>
                <input
                  name="places_count"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={12}
                  required
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Beschreibung</label>
              <input
                name="description"
                defaultValue="Wähle deine Top 12 der Woche."
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Status</label>
                <select
                  name="status"
                  defaultValue="live"
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
                >
                  <option value="live">Live</option>
                  <option value="draft">Entwurf</option>
                  <option value="ended">Beendet</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Start</label>
                <input
                  name="start_at"
                  type="datetime-local"
                  defaultValue={nowLocalInputValue(0)}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Ende</label>
                <input
                  name="end_at"
                  type="datetime-local"
                  defaultValue={nowLocalInputValue(14)}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700">Songliste</label>
              <textarea
                name="songlist"
                required
                rows={16}
                placeholder={`Songtitel – Interpret\nSongtitel – Interpret\nSongtitel – Interpret`}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-zinc-950"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800"
            >
              Neue Runde anlegen
            </button>
          </form>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">Erstellte Umfragen</h2>
            <Link
              href="/release-voting"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Aktuelle Umfrage öffnen
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {lastRounds.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-zinc-500">
                Noch keine Runden vorhanden.
              </div>
            )}

            {lastRounds.map((round) => (
              <div key={round.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-zinc-900">{round.title}</h3>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(round.status)}`}
                      >
                        {statusLabel(round.status)}
                      </span>
                      {round.is_current && (
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                          Aktuelle Runde
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-sm text-zinc-500">Slug: {round.slug}</div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Start: {formatDateTime(round.start_at)} · Ende: {formatDateTime(round.end_at)}
                    </div>
                    <div className="mt-2 break-all text-sm">
                      <span className="font-medium text-zinc-700">Link:</span>{" "}
                      <Link
                        href={`/release-voting/${round.slug}`}
                        className="text-blue-700 underline underline-offset-2"
                      >
                        /release-voting/{round.slug}
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Link
                      href={`/release-voting/${round.slug}`}
                      className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                    >
                      Umfrage öffnen
                    </Link>

                    <form action="/api/release-voting/admin/set-current" method="post">
                      <input type="hidden" name="round_id" value={round.id} />
                      <input type="hidden" name="round_slug" value={round.slug} />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                      >
                        Aktivieren
                      </button>
                    </form>

                    <form action="/api/release-voting/admin/end-round" method="post">
                      <input type="hidden" name="round_id" value={round.id} />
                      <input type="hidden" name="round_slug" value={round.slug} />
                      <button
                        type="submit"
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Beenden
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Live-Ranking der aktuellen Runde
        </h2>

        {!currentRound && (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center text-zinc-500">
            Es gibt aktuell keine Runde.
          </div>
        )}

        {currentRound && (
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
                  <tr key={row.song} className="border-b border-zinc-100 align-top">
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
        )}
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Letzte abgegebene Stimmen
        </h2>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">Name</th>
                <th className="pb-3 pr-4 font-medium">E-Mail</th>
                <th className="pb-3 pr-4 font-medium">Instagram</th>
                <th className="pb-3 pr-4 font-medium">Zeitpunkt</th>
              </tr>
            </thead>
            <tbody>
              {currentVotes.map((vote) => (
                <tr key={vote.id} className="border-b border-zinc-100">
                  <td className="py-4 pr-4 text-zinc-900">{vote.voter_name || "—"}</td>
                  <td className="py-4 pr-4 text-zinc-700">{vote.voter_email}</td>
                  <td className="py-4 pr-4 text-zinc-700">{vote.voter_instagram || "—"}</td>
                  <td className="py-4 pr-4 text-zinc-700">{formatDateTime(vote.created_at)}</td>
                </tr>
              ))}

              {currentVotes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-zinc-500">
                    Noch keine Stimmen vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
