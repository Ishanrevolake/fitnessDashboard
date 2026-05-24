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
