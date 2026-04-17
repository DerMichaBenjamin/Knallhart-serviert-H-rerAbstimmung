import { getSupabaseAdmin } from "./supabaseAdmin";

export type RoundStatus = "draft" | "live" | "ended";

export type RoundRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: RoundStatus;
  start_at: string | null;
  end_at: string | null;
  places_count: number;
  is_current: boolean;
  songs_json: string[] | null;
  created_at: string;
  updated_at: string;
  ended_at: string | null;
};

export type VoteItem = {
  rank: number;
  points: number;
  song: string;
};

export type VoteRow = {
  id: string;
  round_id: string;
  voter_name: string | null;
  voter_email: string;
  voter_email_norm: string;
  voter_instagram: string | null;
  ranking_json: VoteItem[] | null;
  created_at: string;
};

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function parseSonglist(raw: string) {
  const seen = new Set<string>();

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildRankingFromSelections(selections: string[], placesCount: number): VoteItem[] {
  return selections.map((song, index) => ({
    rank: index + 1,
    points: placesCount - index,
    song,
  }));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = value.replace(" ", "T").slice(0, 16);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return value;
  const [, yyyy, mm, dd, hh, min] = match;
  return `${dd}.${mm}.${yyyy}, ${hh}:${min}`;
}

export function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(" ", "T").slice(0, 16);
}

export function statusLabel(status: RoundStatus) {
  if (status === "live") return "Live";
  if (status === "ended") return "Beendet";
  return "Entwurf";
}

export function statusClass(status: RoundStatus) {
  if (status === "live") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "ended") return "border-zinc-200 bg-zinc-100 text-zinc-700";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function nowLocalInputValue(offsetHours = 0) {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export async function getCurrentRound() {
  const supabase = getSupabaseAdmin();

  const { data: current } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (current) return current as RoundRow;

  const { data: latestLive } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .eq("status", "live")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (latestLive as RoundRow | null) ?? null;
}

export async function getRoundBySlug(slug: string) {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  return (data as RoundRow | null) ?? null;
}

export async function getLastRounds(limit = 20) {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("release_voting_rounds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as RoundRow[];
}

export async function getVotesForRound(roundId: string) {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("release_voting_votes")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", { ascending: false });

  return (data ?? []) as VoteRow[];
}

export function buildResults(songs: string[], votes: VoteRow[]) {
  const map = new Map<string, { song: string; totalPoints: number; voteCount: number; averagePoints: number }>();

  for (const song of songs) {
    map.set(song, {
      song,
      totalPoints: 0,
      voteCount: 0,
      averagePoints: 0,
    });
  }

  for (const vote of votes) {
    const ranking = Array.isArray(vote.ranking_json) ? vote.ranking_json : [];
    for (const item of ranking) {
      const song = typeof item?.song === "string" ? item.song.trim() : "";
      const points = Number(item?.points ?? 0);

      if (!song || !map.has(song) || !Number.isFinite(points)) continue;

      const entry = map.get(song)!;
      entry.totalPoints += points;
      entry.voteCount += 1;
    }
  }

  return Array.from(map.values())
    .map((entry) => ({
      ...entry,
      averagePoints: entry.voteCount > 0 ? Number((entry.totalPoints / entry.voteCount).toFixed(2)) : 0,
    }))
    .sort((a, b) => {
      if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.song.localeCompare(b.song, "de");
    })
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}
