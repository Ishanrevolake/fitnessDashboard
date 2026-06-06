create extension if not exists "pgcrypto";

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  category text not null default 'Education',
  cover_image_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx on public.blog_posts (status);
create index if not exists blog_posts_updated_at_idx on public.blog_posts (updated_at desc);

alter table public.blog_posts enable row level security;

drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
  on public.blog_posts
  for select
  using (status = 'published');

drop policy if exists "Service role can manage blog posts" on public.blog_posts;
create policy "Service role can manage blog posts"
  on public.blog_posts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
