create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  ranking_size integer not null default 12 check (ranking_size > 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  position integer not null,
  title text not null,
  artist text not null,
  created_at timestamptz not null default now(),
  unique (poll_id, position)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  instagram text,
  submitted_at timestamptz not null default now(),
  unique (poll_id, normalized_email)
);

create table if not exists public.vote_entries (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references public.votes(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  rank integer not null check (rank > 0),
  points integer not null check (points > 0),
  created_at timestamptz not null default now(),
  unique (vote_id, rank),
  unique (vote_id, song_id)
);

create index if not exists songs_poll_id_idx on public.songs (poll_id, position);
create index if not exists votes_poll_id_idx on public.votes (poll_id, submitted_at desc);
create index if not exists vote_entries_vote_id_idx on public.vote_entries (vote_id);
create index if not exists vote_entries_song_id_idx on public.vote_entries (song_id);

alter table public.polls enable row level security;
alter table public.songs enable row level security;
alter table public.votes enable row level security;
alter table public.vote_entries enable row level security;

comment on table public.polls is 'Release-Voting Runden';
comment on table public.songs is 'Songs pro Runde';
comment on table public.votes is 'Abgegebene Stimmen, eine pro E-Mail und Runde';
comment on table public.vote_entries is 'Platzierungen innerhalb einer Stimme';
