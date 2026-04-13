import { DEFAULT_RANKING_SIZE } from '@/lib/config';

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
    .replace(/[\u0300-\u036f]/g, '')
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
