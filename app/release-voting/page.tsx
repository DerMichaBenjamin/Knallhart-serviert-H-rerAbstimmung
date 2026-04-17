import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import {
  POINTS,
  RoundRow,
  VoteItem,
  VoteRow,
  buildResults,
  formatDateTime,
} from '@/lib/releaseVoting'

export default async function ReleaseVotingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const params = await Promise.resolve(searchParams ?? {})
  const ok = typeof params.ok === 'string' ? params.ok : ''
  const errorMessage = typeof params.error === 'string' ? params.error : ''

  async function submitVoteAction(formData: FormData) {
    'use server'

    const supabase = getSupabaseAdmin()
    const roundId = String(formData.get('round_id') ?? '').trim()
    const jurorName = String(formData.get('juror_name') ?? '').trim()
    const jurorEmail = String(formData.get('juror_email') ?? '').trim()
    const jurorInstagram = String(formData.get('juror_instagram') ?? '').trim()

    if (!roundId) redirect('/release-voting?error=Keine%20aktive%20Runde%20gefunden.')
    if (!jurorName) redirect('/release-voting?error=Bitte%20deinen%20Namen%20eingeben.')

    const ranking: VoteItem[] = []
    const selectedSongs = new Set<string>()

    for (let i = 0; i < POINTS.length; i += 1) {
      const points = POINTS[i]
      const song = String(formData.get(`song_${points}`) ?? '').trim()

      if (!song) {
        redirect(`/release-voting?error=${encodeURIComponent(`Bitte einen Song für ${points} Punkte auswählen.`)}`)
      }

      if (selectedSongs.has(song)) {
        redirect('/release-voting?error=Jeder%20Song%20darf%20nur%20einmal%20gewählt%20werden.')
      }

      selectedSongs.add(song)
      ranking.push({ song, points })
    }

    const payload = {
      round_id: roundId,
      juror_name: jurorName,
      juror_email: jurorEmail || null,
      juror_instagram: jurorInstagram || null,
      ranking_json: ranking,
    }

    const { error } = await supabase
      .from('release_voting_votes')
      .upsert(payload, { onConflict: 'round_id,juror_name' })

    if (error) {
      redirect(`/release-voting?error=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/release-voting')
    revalidatePath('/admin/release-voting')
    redirect('/release-voting?ok=saved')
  }

  const supabase = getSupabaseAdmin()

  const { data: currentRoundRaw, error: currentRoundError } = await supabase
    .from('release_voting_rounds')
    .select('*')
    .eq('is_current', true)
    .maybeSingle()

  if (currentRoundError) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          Fehler beim Laden der aktuellen Runde: {currentRoundError.message}
        </div>
      </main>
    )
  }

  const currentRound = (currentRoundRaw ?? null) as RoundRow | null

  let votes: VoteRow[] = []
  if (currentRound) {
    const { data: votesRaw } = await supabase
      .from('release_voting_votes')
      .select('*')
      .eq('round_id', currentRound.id)
      .order('created_at', { ascending: false })

    votes = (votesRaw ?? []) as VoteRow[]
  }

  const songs = Array.isArray(currentRound?.songs_json) ? currentRound.songs_json : []
  const results = currentRound ? buildResults(songs, votes) : []

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="text-sm font-medium text-zinc-500">Public Voting</div>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-zinc-900">Neue Songs der Woche</h1>
          <p className="mt-3 text-zinc-600">Vergib 12 bis 1 Punkte. Jeder Song darf nur einmal vorkommen.</p>
        </div>

        {ok === 'saved' && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Deine Wertung wurde gespeichert. Wenn du denselben Namen nochmal verwendest, wird deine alte Wertung überschrieben.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {decodeURIComponent(errorMessage)}
          </div>
        )}

        {!currentRound && (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-zinc-600">Aktuell gibt es keine laufende Abstimmungsrunde.</div>
          </section>
        )}

        {currentRound && (
          <>
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-zinc-500">Aktuelle Runde</div>
                  <div className="mt-1 text-xl font-semibold text-zinc-900">{currentRound.title}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Ende</div>
                  <div className="mt-1 text-xl font-semibold text-zinc-900">{formatDateTime(currentRound.end_at)}</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Bisherige Stimmen</div>
                  <div className="mt-1 text-xl font-semibold text-zinc-900">{votes.length}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-zinc-900">Deine Wertung</h2>
              <form action={submitVoteAction} className="mt-6 space-y-5">
                <input type="hidden" name="round_id" value={currentRound.id} />

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">Name</label>
                    <input
                      name="juror_name"
                      required
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">E-Mail</label>
                    <input
                      name="juror_email"
                      type="email"
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">Instagram</label>
                    <input
                      name="juror_instagram"
                      className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {POINTS.map((points) => (
                    <div key={points} className="grid gap-3 md:grid-cols-[110px,1fr] md:items-center">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center font-semibold text-zinc-900">
                        {points} Punkte
                      </div>
                      <select
                        name={`song_${points}`}
                        required
                        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                      >
                        <option value="">Song auswählen</option>
                        {songs.map((song) => (
                          <option key={`${points}-${song}`} value={song}>
                            {song}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <button type="submit" className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800">
                  Wertung speichern
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-zinc-900">Live-Ranking</h2>
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
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
