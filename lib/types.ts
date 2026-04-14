export type PollStatus = 'draft' | 'scheduled' | 'live' | 'ended';

export type PollRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  ranking_size: number;
  is_active: boolean;
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SongRecord = {
  id: string;
  poll_id: string;
  position: number;
  title: string;
  artist: string;
  created_at: string;
};

export type VoteRecord = {
  id: string;
  poll_id: string;
  email: string;
  normalized_email: string;
  instagram: string | null;
  submitted_at: string;
};

export type VoteEntryRecord = {
  id: string;
  vote_id: string;
  song_id: string;
  rank: number;
  points: number;
  created_at: string;
};

export type ResolvedPollStatus = 'draft' | 'scheduled' | 'live' | 'ended';

export type PublicPoll = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  rankingSize: number;
  status: PollStatus;
  resolvedStatus: ResolvedPollStatus;
  startsAt: string | null;
  endsAt: string | null;
  songs: Array<{
    id: string;
    title: string;
    artist: string;
  }>;
};

export type AdminResultsRow = {
  songId: string;
  title: string;
  artist: string;
  totalPoints: number;
  appearances: number;
  firstPlaces: number;
  averageRank: number | null;
  rankBreakdown: number[];
};

export type AdminOverview = {
  activePoll: PublicPoll | null;
  voteCount: number;
  recentPolls: Array<{
    id: string;
    slug: string;
    title: string;
    rankingSize: number;
    isActive: boolean;
    status: PollStatus;
    resolvedStatus: ResolvedPollStatus;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
  }>;
  recentVotes: Array<{
    email: string;
    instagram: string | null;
    submittedAt: string;
  }>;
  results: AdminResultsRow[];
};
