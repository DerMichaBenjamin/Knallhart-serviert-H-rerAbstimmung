alter table public.polls add column if not exists status text not null default 'live';
alter table public.polls add column if not exists starts_at timestamptz;
alter table public.polls add column if not exists ends_at timestamptz;
alter table public.polls add column if not exists updated_at timestamptz not null default now();

update public.polls
set status = case when is_active then 'live' else 'draft' end
where status is null or status not in ('draft', 'scheduled', 'live', 'ended');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'polls_status_check'
  ) then
    alter table public.polls add constraint polls_status_check check (status in ('draft', 'scheduled', 'live', 'ended'));
  end if;
end $$;
