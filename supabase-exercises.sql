create extension if not exists "pgcrypto";

create table if not exists public.exercises (
  id text primary key,
  name text not null,
  category text not null check (category in ('Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Glutes', 'Core', 'Cardio', 'Mobility')),
  equipment text not null,
  primary_muscles text not null,
  secondary_muscles text not null,
  level text not null default 'Intermediate' check (level in ('Beginner', 'Intermediate', 'Advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exercises_category_idx on public.exercises (category);
create index if not exists exercises_name_idx on public.exercises (name);

alter table public.exercises enable row level security;

drop policy if exists "Public can read exercises" on public.exercises;
create policy "Public can read exercises"
  on public.exercises
  for select
  using (true);

drop policy if exists "Service role can manage exercises" on public.exercises;
create policy "Service role can manage exercises"
  on public.exercises
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
