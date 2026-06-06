create extension if not exists "pgcrypto";

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  name text not null,
  text text not null,
  category text not null default 'Fat Loss',
  rating integer not null default 5 check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.testimonials
  add column if not exists category text not null default 'Fat Loss';

create index if not exists testimonials_status_idx on public.testimonials (status);
create index if not exists testimonials_category_idx on public.testimonials (category);
create index if not exists testimonials_created_at_idx on public.testimonials (created_at desc);
create index if not exists testimonials_client_id_idx on public.testimonials (client_id);

alter table public.testimonials enable row level security;

drop policy if exists "Public can read approved testimonials" on public.testimonials;0
create policy "Public can read approved testimonials"
  on public.testimonials
  for select
  using (status = 'approved');

drop policy if exists "Service role can manage testimonials" on public.testimonials;
create policy "Service role can manage testimonials"
  on public.testimonials
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
