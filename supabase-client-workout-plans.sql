create table if not exists public.client_workout_plans (
  client_id uuid primary key references auth.users(id) on delete cascade,
  assigned_program_id text not null default 'custom-workout-plan',
  focus text not null default 'Custom workout plan',
  start_date date not null default current_date,
  weekly_schedule text[] not null default '{}',
  trainer_notes text not null default '',
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_workout_plans enable row level security;

drop policy if exists "Clients and trainers can read workout plans" on public.client_workout_plans;
create policy "Clients and trainers can read workout plans"
on public.client_workout_plans
for select
to authenticated
using (
  auth.uid() = client_id
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer')
);

drop policy if exists "Trainers can manage workout plans" on public.client_workout_plans;
create policy "Trainers can manage workout plans"
on public.client_workout_plans
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer'))
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer'));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'client_workout_plans'
    ) then
    alter publication supabase_realtime add table public.client_workout_plans;
  end if;
end $$;

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_notes_client_id_created_at_idx
on public.client_notes (client_id, created_at desc);

alter table public.client_notes enable row level security;

drop policy if exists "Clients and trainers can read notes" on public.client_notes;
create policy "Clients and trainers can read notes"
on public.client_notes
for select
to authenticated
using (
  auth.uid() = client_id
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer')
);

drop policy if exists "Trainers can add notes" on public.client_notes;
create policy "Trainers can add notes"
on public.client_notes
for insert
to authenticated
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer'));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'client_notes'
    ) then
    alter publication supabase_realtime add table public.client_notes;
  end if;
end $$;

create table if not exists public.client_meal_plans (
  client_id uuid primary key references auth.users(id) on delete cascade,
  focus text not null default 'Custom nutrition plan',
  start_date date not null default current_date,
  trainer_notes text not null default '',
  days jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_meal_plans enable row level security;

drop policy if exists "Clients and trainers can read meal plans" on public.client_meal_plans;
create policy "Clients and trainers can read meal plans"
on public.client_meal_plans
for select
to authenticated
using (
  auth.uid() = client_id
  or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer')
);

drop policy if exists "Trainers can manage meal plans" on public.client_meal_plans;
create policy "Trainers can manage meal plans"
on public.client_meal_plans
for all
to authenticated
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer'))
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role') in ('admin', 'trainer'));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'client_meal_plans'
    ) then
    alter publication supabase_realtime add table public.client_meal_plans;
  end if;
end $$;
