import { DEFAULT_RANKING_SIZE } from '@/lib/config';
import { createSupabaseAdmin } from '@/lib/supabase-admin';
import type {
  AdminOverview,
  AdminResultsRow,
  PollRecord,
  PublicPoll,
  SongRecord,
  VoteEntryRecord,
  VoteRecord,
} from '@/lib/types';
import { normalizeEmail, pointsForRank, slugify, splitSongLine } from '@/lib/utils';

async function getSongsForPoll(pollId: string) {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('poll_id', pollId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as SongRecord[];
}

export async function getActivePoll(): Promise<PublicPoll | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const songs = await getSongsForPoll(data.id);
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    rankingSize: data.ranking_size,
    songs: songs.map((song) => ({ id: song.id, title: song.title, artist: song.artist })),
  };
}

export async function getPollBySlug(slug: string): Promise<(PollRecord & { songs: SongRecord[] }) | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const songs = await getSongsForPoll(data.id);
  return { ...(data as PollRecord), songs };
}

export async function submitVote(input: {
  pollSlug: string;
  email: string;
  instagram?: string;
  ranking: string[];
}) {
  const poll = await getPollBySlug(input.pollSlug);
  if (!poll || !poll.is_active) {
    return { ok: false as const, status: 404, message: 'Aktive Abstimmung nicht gefunden.' };
  }

  const ranking = input.ranking.map((id) => id.trim()).filter(Boolean);
  const uniqueIds = new Set(ranking);
  if (ranking.length !== poll.ranking_size || uniqueIds.size !== poll.ranking_size) {
    return {
      ok: false as const,
      status: 400,
      message: `Bitte genau ${poll.ranking_size} verschiedene Songs auswählen.`,
    };
  }

  const validSongIds = new Set(poll.songs.map((song) => song.id));
  if (ranking.some((songId) => !validSongIds.has(songId))) {
    return { ok: false as const, status: 400, message: 'Mindestens ein Song gehört nicht zu dieser Abstimmung.' };
  }

  const normalized = normalizeEmail(input.email);
  const supabase = createSupabaseAdmin();

  const { data: vote, error: voteError } = await supabase
    .from('votes')
    .insert({
      poll_id: poll.id,
      email: input.email.trim(),
      normalized_email: normalized,
      instagram: input.instagram?.trim() || null,
    })
    .select('*')
    .single();

  if (voteError) {
    const isDuplicate = voteError.code === '23505' || (typeof voteError.message === 'string' && voteError.message.includes('votes_poll_id_normalized_email_key'));
    return {
      ok: false as const,
      status: isDuplicate ? 409 : 500,
      message: isDuplicate ? 'Mit dieser E-Mail wurde für diese Runde bereits abgestimmt.' : 'Die Stimme konnte nicht gespeichert werden.',
    };
  }

  const entries = ranking.map((songId, index) => ({
    vote_id: vote.id,
    song_id: songId,
    rank: index + 1,
    points: pointsForRank(index + 1, poll.ranking_size),
  }));

  const { error: entriesError } = await supabase.from('vote_entries').insert(entries);
  if (entriesError) {
    await supabase.from('votes').delete().eq('id', vote.id);
    return { ok: false as const, status: 500, message: 'Die Platzierungen konnten nicht gespeichert werden.' };
  }

  return { ok: true as const, status: 200, message: 'Stimme erfolgreich gespeichert.' };
}

export async function createPoll(input: {
  title: string;
  description?: string;
  slug?: string;
  rankingSize?: number;
  songsText: string;
}) {
  const rankingSize = input.rankingSize ?? DEFAULT_RANKING_SIZE;
  const parsedSongs = input.songsText
    .split(/\r?\n/)
    .map(splitSongLine)
    .filter((value): value is { title: string; artist: string } => Boolean(value));

  if (parsedSongs.length < rankingSize) {
    throw new Error(`Du brauchst mindestens ${rankingSize} Songs.`);
  }

  const title = input.title.trim();
  if (!title) throw new Error('Titel der Abstimmung fehlt.');

  const slug = input.slug?.trim() ? slugify(input.slug) : slugify(title);
  if (!slug) throw new Error('Slug konnte nicht erzeugt werden.');

  const supabase = createSupabaseAdmin();

  await supabase.from('polls').update({ is_active: false }).eq('is_active', true);

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      title,
      description: input.description?.trim() || null,
      slug,
      ranking_size: rankingSize,
      is_active: true,
    })
    .select('*')
    .single();

  if (pollError) throw pollError;

  const songs = parsedSongs.map((song, index) => ({
    poll_id: poll.id,
    position: index + 1,
    title: song.title,
    artist: song.artist,
  }));

  const { error: songsError } = await supabase.from('songs').insert(songs);
  if (songsError) {
    await supabase.from('polls').delete().eq('id', poll.id);
    throw songsError;
  }

  return poll as PollRecord;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = createSupabaseAdmin();
  const activePoll = await getActivePoll();

  const { data: recentPollRows, error: recentPollsError } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  if (recentPollsError) throw recentPollsError;

  if (!activePoll) {
    return {
      activePoll: null,
      voteCount: 0,
      recentPolls: (recentPollRows ?? []).map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        rankingSize: row.ranking_size,
        isActive: row.is_active,
        createdAt: row.created_at,
      })),
      recentVotes: [],
      results: [],
    };
  }

  const { data: voteRows, error: voteError } = await supabase
    .from('votes')
    .select('*')
    .eq('poll_id', activePoll.id)
    .order('submitted_at', { ascending: false });
  if (voteError) throw voteError;
  const votes = (voteRows ?? []) as VoteRecord[];

  const voteIds = votes.map((vote) => vote.id);
  let entries: VoteEntryRecord[] = [];
  if (voteIds.length > 0) {
    const { data: entryRows, error: entryError } = await supabase
      .from('vote_entries')
      .select('*')
      .in('vote_id', voteIds);
    if (entryError) throw entryError;
    entries = (entryRows ?? []) as VoteEntryRecord[];
  }

  const resultsBySong = new Map<string, AdminResultsRow>();
  for (const song of activePoll.songs) {
    resultsBySong.set(song.id, {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      totalPoints: 0,
      appearances: 0,
      firstPlaces: 0,
      averageRank: null,
      rankBreakdown: Array.from({ length: activePoll.rankingSize }, () => 0),
    });
  }

  for (const entry of entries) {
    const result = resultsBySong.get(entry.song_id);
    if (!result) continue;
    result.totalPoints += entry.points;
    result.appearances += 1;
    if (entry.rank === 1) result.firstPlaces += 1;
    if (entry.rank >= 1 && entry.rank <= result.rankBreakdown.length) {
      result.rankBreakdown[entry.rank - 1] += 1;
    }
  }

  for (const result of resultsBySong.values()) {
    if (result.appearances > 0) {
      const weightedRankSum = result.rankBreakdown.reduce(
        (sum, count, index) => sum + count * (index + 1),
        0
      );
      result.averageRank = Number((weightedRankSum / result.appearances).toFixed(2));
    }
  }

  const results = Array.from(resultsBySong.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.firstPlaces !== a.firstPlaces) return b.firstPlaces - a.firstPlaces;
    if ((a.averageRank ?? Infinity) !== (b.averageRank ?? Infinity)) {
      return (a.averageRank ?? Infinity) - (b.averageRank ?? Infinity);
    }
    return a.title.localeCompare(b.title, 'de');
  });

  return {
    activePoll,
    voteCount: votes.length,
    recentPolls: (recentPollRows ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      rankingSize: row.ranking_size,
      isActive: row.is_active,
      createdAt: row.created_at,
    })),
    recentVotes: votes.slice(0, 20).map((vote) => ({
      email: vote.email,
      instagram: vote.instagram,
      submittedAt: vote.submitted_at,
    })),
    results,
  };
}

export async function exportActivePollCsv() {
  const overview = await getAdminOverview();
  if (!overview.activePoll) {
    throw new Error('Keine aktive Abstimmung gefunden.');
  }

  const header = ['Platz', 'Song', 'Interpret', 'Punkte', 'Nennungen', 'Platz-1-Stimmen', 'Ø Platz'];
  const rows = overview.results.map((row, index) => [
    String(index + 1),
    row.title,
    row.artist,
    String(row.totalPoints),
    String(row.appearances),
    String(row.firstPlaces),
    row.averageRank == null ? '' : String(row.averageRank),
  ]);

  return [header, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}
