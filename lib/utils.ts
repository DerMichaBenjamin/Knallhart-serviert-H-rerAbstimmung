import { DEFAULT_RANKING_SIZE } from '@/lib/config';
import type { PollRecord, PollStatus, ResolvedPollStatus } from '@/lib/types';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function pointsForRank(rank: number, rankingSize = DEFAULT_RANKING_SIZE) {
  return rankingSize + 1 - rank;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function splitSongLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const separators = [' – ', ' - ', ' — '];
  for (const separator of separators) {
    const index = trimmed.indexOf(separator);
    if (index > 0) {
      const title = trimmed.slice(0, index).trim();
      const artist = trimmed.slice(index + separator.length).trim();
      if (title && artist) {
        return { title, artist };
      }
    }
  }

  return { title: trimmed, artist: 'Unbekannt' };
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatForDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function toIsoOrNull(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function pollStatusLabel(status: PollStatus | ResolvedPollStatus) {
  switch (status) {
    case 'draft':
      return 'Entwurf';
    case 'scheduled':
      return 'Geplant';
    case 'live':
      return 'Live';
    case 'ended':
      return 'Beendet';
    default:
      return status;
  }
}

export function resolvePollStatus(poll: Pick<PollRecord, 'status' | 'starts_at' | 'ends_at'>): ResolvedPollStatus {
  if (poll.status === 'draft') return 'draft';
  if (poll.status === 'ended') return 'ended';

  const now = Date.now();
  const startsAt = poll.starts_at ? new Date(poll.starts_at).getTime() : null;
  const endsAt = poll.ends_at ? new Date(poll.ends_at).getTime() : null;

  if (startsAt && now < startsAt) return 'scheduled';
  if (endsAt && now >= endsAt) return 'ended';
  return 'live';
}
