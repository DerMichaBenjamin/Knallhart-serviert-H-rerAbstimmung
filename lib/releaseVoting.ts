export type RoundStatus = 'draft' | 'live' | 'ended'

export type RoundRow = {
  id: string
  title: string
  slug: string
  description: string | null
  status: RoundStatus
  start_at: string
  end_at: string
  places_count: number
  is_current: boolean
  songs_json: string[] | null
  created_at: string
  updated_at: string
  ended_at: string | null
}

export type VoteItem = {
  song?: string
  points?: number
}

export type VoteRow = {
  id: string
  round_id: string
  juror_name: string
  juror_email: string | null
  juror_instagram: string | null
  ranking_json: VoteItem[] | null
  created_at: string
  updated_at: string
}

export const POINTS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export function parseSonglist(raw: string) {
  const seen = new Set<string>()

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

export function statusLabel(status: RoundStatus) {
  if (status === 'live') return 'Live'
  if (status === 'ended') return 'Beendet'
  return 'Entwurf'
}

export function statusClass(status: RoundStatus) {
  if (status === 'live') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'ended') return 'bg-zinc-100 text-zinc-700 border-zinc-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

export function buildResults(songs: string[], votes: VoteRow[]) {
  const map = new Map<
    string,
    { song: string; totalPoints: number; voteCount: number; averagePoints: number }
  >()

  for (const song of songs) {
    map.set(song, {
      song,
      totalPoints: 0,
      voteCount: 0,
      averagePoints: 0,
    })
  }

  for (const vote of votes) {
    const ranking = Array.isArray(vote.ranking_json) ? vote.ranking_json : []

    for (const item of ranking) {
      const song = typeof item?.song === 'string' ? item.song.trim() : ''
      const points = Number(item?.points ?? 0)

      if (!song || !map.has(song) || !Number.isFinite(points)) continue

      const entry = map.get(song)!
      entry.totalPoints += points
      entry.voteCount += 1
    }
  }

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      averagePoints:
        entry.voteCount > 0 ? Number((entry.totalPoints / entry.voteCount).toFixed(2)) : 0,
    }))
    .sort((a, b) => {
      if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount
      return a.song.localeCompare(b.song, 'de')
    })
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }))
}
