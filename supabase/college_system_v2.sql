-- College System V2

alter table public.tasks
  add column if not exists project_id uuid
  references public.projects(id)
  on delete set null;

create index if not exists tasks_project_id_idx
  on public.tasks(project_id);

create table if not exists public.project_updates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  update_date date not null default current_date,
  content text not null,
  created_at timestamptz default now()
);

alter table public.project_updates enable row level security;

drop policy if exists "own project_updates" on public.project_updates;

create policy "own project_updates"
  on public.project_updates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists project_updates_project_id_date_idx
  on public.project_updates(project_id, update_date desc);
