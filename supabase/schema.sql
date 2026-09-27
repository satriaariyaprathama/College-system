-- Personal College Management System — Supabase schema
-- Run this in Supabase SQL editor once, on a fresh project.

create extension if not exists "uuid-ossp";

-- ========== PROFILES ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  university text default 'Universitas Ahmad Dahlan',
  created_at timestamptz default now()
);

-- ========== SEMESTERS ==========
create table if not exists public.semesters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  academic_year text not null,        -- e.g. "2026/2027"
  semester_number int not null,       -- 1..8
  label text,                         -- optional custom label
  is_current boolean default false,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- ========== TASKS ==========
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  title text not null,
  source text not null default 'personal' check (source in ('elearning','dosen','personal')),
  course text,
  due_date timestamptz,
  status text not null default 'inbox' check (status in ('inbox','planned','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  description text,
  link text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- ========== LECTURE NOTES ==========
create table if not exists public.lecture_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  course text not null,
  meeting_number int,
  note_date date,
  topic text,
  key_concepts text,
  notes text,
  unclear_points text,
  conclusion text,
  link text,
  created_at timestamptz default now()
);

-- ========== SELF LEARNING ==========
create table if not exists public.learning_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_topic text not null,
  goal text,
  reason text,
  status text not null default 'planned' check (status in ('planned','learning','paused','completed')),
  progress int default 0 check (progress between 0 and 100),
  resources text,
  notes text,
  related_project_id uuid,
  start_date date,
  target_date date,
  completed_date date,
  created_at timestamptz default now()
);

-- ========== PROJECTS ==========
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  name text not null,
  category text,
  description text,
  status text not null default 'idea' check (status in ('idea','planned','in_progress','completed','archived')),
  start_date date,
  target_date date,
  related_skill text,
  related_course text,
  related_learning_id uuid references public.learning_items(id) on delete set null,
  link text,
  notes text,
  portfolio_status text not null default 'no' check (portfolio_status in ('no','maybe','yes')),
  created_at timestamptz default now()
);

alter table public.learning_items
  add constraint learning_items_related_project_fk
  foreign key (related_project_id) references public.projects(id) on delete set null;

-- ========== ACADEMIC TIMELINE ==========
create table if not exists public.academic_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  name text not null,
  type text not null,       -- UTS, UAS, KRS, Pembayaran, Libur, Administratif, Lainnya
  start_date date not null,
  end_date date,
  notes text,
  source_link text,
  created_at timestamptz default now()
);

-- ========== WEEKLY REVIEW ==========
create table if not exists public.weekly_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  week_start date not null,
  academic_done text,
  academic_pending text,
  academic_unclear text,
  task_open text,
  task_next_deadline text,
  learning_what text,
  learning_progress text,
  project_progress text,
  project_blocked text,
  next_priorities text,
  next_improve text,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

-- ========== SEMESTER REVIEW ==========
create table if not exists public.semester_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  academic_progress text,
  skill_growth text,
  self_learning text,
  project_summary text,
  portfolio_summary text,
  problems text,
  improvements text,
  next_focus text,
  created_at timestamptz default now(),
  unique (user_id, semester_id)
);

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.tasks enable row level security;
alter table public.lecture_notes enable row level security;
alter table public.learning_items enable row level security;
alter table public.projects enable row level security;
alter table public.academic_events enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.semester_reviews enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own semesters" on public.semesters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lecture_notes" on public.lecture_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own learning_items" on public.learning_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own academic_events" on public.academic_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own weekly_reviews" on public.weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own semester_reviews" on public.semester_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
