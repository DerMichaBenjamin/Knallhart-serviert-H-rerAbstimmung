import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import {
  RoundRow,
  VoteRow,
  buildResults,
  formatDateTime,
  normalizeSlug,
  parseSonglist,
  statusClass,
  statusLabel,
} from '@/lib/releaseVoting'

export default async function ReleaseVotingAdminPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const params = await Promise.resolve(searchParams ?? {})
  const ok = typeof params.ok === 'string' ? params.ok : ''
  const errorMessage = typeof params.error === 'string' ? params.error : ''

  async function createRoundAction(formData: FormData) {
    'use server'

    const supabase = getSupabaseAdmin()

    try {
      const title = String(formData.get('title') ?? '').trim()
      const slugInput = String(formData.get('slug') ?? '').trim()
      const description = String(formData.get('description') ?? '').trim()
      const status = String(formData.get('status') ?? 'live').trim() as 'draft' | 'live' | 'ended'
      const startAt = String(formData.get('start_at') ?? '').trim()
      const endAt = String(formData.get('end_at') ?? '').trim()
      const placesCount = Number(formData.get('places_count') ?? 12)
      const songlistRaw = String(formData.get('songlist') ?? '')

      const slug = normalizeSlug(slugInput || title)
      const songs = parseSonglist(songlistRaw)

      if (!title) redirect('/admin/release-voting?error=Bitte%20einen%20Titel%20eingeben.')
      if (!slug) redirect('/admin/release-voting?error=Bitte%20einen%20gültigen%20Slug%20eingeben.')
      if (!startAt || !endAt) redirect('/admin/release-voting?error=Bitte%20Start%20und%20Ende%20ausfüllen.')
      if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
        redirect('/admin/release-voting?error=Das%20Ende%20muss%20nach%20dem%20Start%20liegen.')
      }
      if (!Number.isInteger(placesCount) || placesCount < 1 || placesCount > 50) {
        redirect('/admin/release-voting?error=Die%20Platzanzahl%20muss%20zwischen%201%20und%2050%20liegen.')
      }
      if (songs.length === 0) redirect('/admin/release-voting?error=Bitte%20mindestens%20einen%20Song%20eintragen.')
      if (songs.length < placesCount) {
        redirect(
          `/admin/release-voting?error=${encodeURIComponent(
            `Es sind nur ${songs.length} Songs eingetragen, aber ${placesCount} Plätze ausgewählt.`,
          )}`,
        )
      }

      const { data: slugExists, error: slugCheckError } = await supabase
        .from('release_voting_rounds')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      if (slugCheckError) {
        redirect(`/admin/release-voting?error=${encodeURIComponent(slugCheckError.message)}`)
      }

      if (slugExists) {
        redirect(
          `/admin/release-voting?error=${encodeURIComponent(
            'Dieser Slug existiert schon. Bitte ein anderes URL-Kürzel verwenden.',
          )}`,
        )
      }

      if (status === 'live') {
        const { error: unsetCurrentError } = await supabase
          .from('release_voting_rounds')
          .update({ is_current: false })
          .eq('is_current', true)

        if (unsetCurrentError) {
          redirect(`/admin/release-voting?error=${encodeURIComponent(unsetCurrentError.message)}`)
        }
      }

      const payload = {
        title,
        slug,
        description: description || null,
        status,
        start_at: startAt,
        end_at: endAt,
        places_count: placesCount,
        is_current: status === 'live',
        songs_json: songs,
        ended_at: status === 'ended' ? new Date().toISOString() : null,
      }

      const { error: insertError } = await supabase.from('release_voting_rounds').insert(payload)

      if (insertError) {
        redirect(`/admin/release-voting?error=${encodeURIComponent(insertError.message)}`)
      }

      revalidatePath('/admin/release-voting')
      revalidatePath('/release-voting')
      redirect('/admin/release-voting?ok=created')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Anlegen.'
      redirect(`/admin/release-voting?error=${encodeURIComponent(message)}`)
    }
  }

  async function endRoundAction(formData: FormData) {
    'use server'

    const supabase = getSupabaseAdmin()
    const roundId = String(formData.get('round_id') ?? '').trim()

    if (!roundId) redirect('/admin/release-voting?error=Keine%20Runde%20übergeben.')

    const { error } = await supabase
      .from('release_voting_rounds')
      .update({
        status: 'ended',
        is_current: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', roundId)

    if (error) redirect(`/admin/release-voting?error=${encodeURIComponent(error.message)}`)

    revalidatePath('/admin/release-voting')
    revalidatePath('/release-voting')
    redirect('/admin/release-voting?ok=ended')
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
        <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          Fehler beim Laden der Runden: {currentRoundError.message}
        </div>
      </main>
    )
  }

  const currentRound = (currentRoundRaw ?? null) as RoundRow | null

  const { data: lastRoundsRaw } = await supabase
    .from('release_voting_rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const lastRounds = (lastRoundsRaw ?? []) as RoundRow[]

  let currentVotes: VoteRow[] = []
  if (currentRound) {
    const { data: votesRaw } = await supabase
      .from('release_voting_votes')
      .select('*')
      .eq('round_id', currentRound.id)
      .order('created_at', { ascending: false })

    currentVotes = (votesRaw ?? []) as VoteRow[]
  }

  const currentSongs = Array.isArray(currentRound?.songs_json) ? currentRound.songs_json : []
  const results = currentRound ? buildResults(currentSongs, currentVotes) : []

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="text-sm font-medium text-zinc-500">Admin</div>
          <h1 className="mt-1 text-4xl font-bold tracking-tight text-zinc-900">Release-Voting verwalten</h1>
        </div>

        {ok === 'created' && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Neue Abstimmungsrunde wurde angelegt.
          </div>
        )}

        {ok === 'ended' && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            Die aktuelle Runde wurde beendet.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {decodeURIComponent(errorMessage)}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Aktuelle Runde</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">{currentRound?.title ?? '—'}</div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Status</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">{currentRound ? statusLabel(currentRound.status) : '—'}</div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Abgegebene Stimmen</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">{currentVotes.length}</div>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Songs</div>
            <div className="mt-2 text-xl font-semibold text-zinc-900">{currentSongs.length}</div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-zinc-900">Neue Runde anlegen</h2>
            <form action={createRoundAction} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Titel</label>
                <input
                  name="title"
                  required
                  defaultValue={`Neue Songs der Woche ${new Date().toLocaleDateString('de-DE')}`}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-[2fr,1fr]">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Slug / URL-Kürzel</label>
                  <input
                    name="slug"
                    required
                    placeholder="neue-songs-17-04-2026"
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Plätze</label>
                  <input
                    name="places_count"
                    type="number"
                    min={1}
                    max={50}
                    defaultValue={12}
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Beschreibung</label>
                <input
                  name="description"
                  defaultValue="Wähle deine Top 12 der Woche."
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Status</label>
                  <select
                    name="status"
                    defaultValue="live"
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
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
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">Ende</label>
                  <input
                    name="end_at"
                    type="datetime-local"
                    required
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">Songliste</label>
                <textarea
                  name="songlist"
                  required
                  rows={14}
                  placeholder={`Songtitel – Interpret\nSongtitel – Interpret\nSongtitel – Interpret`}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                />
              </div>

              <button type="submit" className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 font-semibold text-white transition hover:bg-zinc-800">
                Neue Runde anlegen
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-zinc-900">Letzte Runden</h2>
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 text-zinc-500">
                    <tr>
                      <th className="pb-3 pr-4 font-medium">Titel</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastRounds.map((round) => (
                      <tr key={round.id} className="border-b border-zinc-100 align-top">
                        <td className="py-4 pr-4">
                          <div className="font-medium text-zinc-900">{round.title}</div>
                          <div className="text-xs text-zinc-500">{round.slug}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(round.status)}`}>
                            {statusLabel(round.status)}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-zinc-700">{formatDateTime(round.start_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {currentRound && (
                <form action={endRoundAction} className="mt-6">
                  <input type="hidden" name="round_id" value={currentRound.id} />
                  <button type="submit" className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-300 px-5 py-3 font-semibold text-zinc-900 transition hover:bg-zinc-50">
                    Aktuelle Runde beenden
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-zinc-900">Live-Ranking</h2>
          {!currentRound && <div className="mt-6 text-zinc-500">Es gibt noch keine aktuelle Runde.</div>}
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
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
