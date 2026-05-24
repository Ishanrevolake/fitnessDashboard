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
