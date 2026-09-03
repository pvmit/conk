-- Conquest — schemat bazy (wklej w Supabase: SQL Editor → New query → Run)
-- Potem w Database → Replication włącz tabelę `points` dla Realtime,
-- albo zostaw poniższe ALTER PUBLICATION (działa w większości projektów).

create table if not exists public.points (
  point_id text primary key check (point_id in ('A', 'B', 'C')),
  status text not null default 'neutral'
    check (status in ('neutral', 'red', 'blue', 'contested')),
  red_total_time bigint not null default 0,
  blue_total_time bigint not null default 0,
  last_change_timestamp timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.point_events (
  id bigint generated always as identity primary key,
  point_id text not null references public.points (point_id) on delete cascade,
  from_status text,
  to_status text not null,
  red_total_time bigint not null,
  blue_total_time bigint not null,
  created_at timestamptz not null default now()
);

insert into public.points (point_id)
values ('A'), ('B'), ('C')
on conflict (point_id) do nothing;

alter table public.points enable row level security;
alter table public.point_events enable row level security;

drop policy if exists "points_read" on public.points;
drop policy if exists "points_write" on public.points;
drop policy if exists "events_read" on public.point_events;
drop policy if exists "events_write" on public.point_events;

create policy "points_read" on public.points for select using (true);
create policy "points_write" on public.points for all using (true) with check (true);
create policy "events_read" on public.point_events for select using (true);
create policy "events_write" on public.point_events for insert with check (true);

-- Atomowa zmiana statusu: dolicza czas aktualnie kontrolującej drużyny, potem ustawia nowy status.
create or replace function public.set_point_status(p_id text, new_status text)
returns public.points
language plpgsql
as $$
declare
  row public.points;
  elapsed bigint;
begin
  if new_status not in ('neutral', 'red', 'blue', 'contested') then
    raise exception 'invalid status %', new_status;
  end if;

  select * into row from public.points where point_id = p_id for update;
  if not found then
    raise exception 'unknown point %', p_id;
  end if;

  if row.status = new_status then
    return row;
  end if;

  elapsed := greatest(
    0,
    (extract(epoch from (now() - row.last_change_timestamp)) * 1000)::bigint
  );

  if row.status = 'red' then
    row.red_total_time := row.red_total_time + elapsed;
  elsif row.status = 'blue' then
    row.blue_total_time := row.blue_total_time + elapsed;
  end if;

  insert into public.point_events (point_id, from_status, to_status, red_total_time, blue_total_time)
  values (p_id, row.status, new_status, row.red_total_time, row.blue_total_time);

  update public.points
  set
    status = new_status,
    red_total_time = row.red_total_time,
    blue_total_time = row.blue_total_time,
    last_change_timestamp = now(),
    updated_at = now()
  where point_id = p_id
  returning * into row;

  return row;
end;
$$;

create or replace function public.reset_point(p_id text)
returns public.points
language plpgsql
as $$
declare
  row public.points;
begin
  update public.points
  set
    status = 'neutral',
    red_total_time = 0,
    blue_total_time = 0,
    last_change_timestamp = now(),
    updated_at = now()
  where point_id = p_id
  returning * into row;

  if not found then
    raise exception 'unknown point %', p_id;
  end if;

  insert into public.point_events (point_id, from_status, to_status, red_total_time, blue_total_time)
  values (p_id, 'reset', 'neutral', 0, 0);

  return row;
end;
$$;

create or replace function public.reset_game()
returns void
language plpgsql
as $$
begin
  update public.points
  set
    status = 'neutral',
    red_total_time = 0,
    blue_total_time = 0,
    last_change_timestamp = now(),
    updated_at = now()
  where point_id in ('A', 'B', 'C');

  insert into public.point_events (point_id, from_status, to_status, red_total_time, blue_total_time)
  select point_id, 'reset_game', 'neutral', 0, 0 from public.points;
end;
$$;

do $$
begin
  begin
    alter publication supabase_realtime add table public.points;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.points to anon, authenticated;
grant select, insert on public.point_events to anon, authenticated;
grant execute on function public.set_point_status(text, text) to anon, authenticated;
grant execute on function public.reset_point(text) to anon, authenticated;
grant execute on function public.reset_game() to anon, authenticated;
