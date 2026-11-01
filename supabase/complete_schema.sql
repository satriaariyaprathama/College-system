-- Personal College Management System (Kuliah Hub) — Complete Master Schema
-- Idempotent schema definition for fresh database initialization or migration.

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

-- ========== COURSES (Master Mata Kuliah & SIMERU) ==========
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete cascade,
  name text not null,
  code text,                            -- e.g. "TIF101"
  credits int not null default 3,       -- Bobot SKS
  lecturer text,
  day_of_week int check (day_of_week between 1 and 7), -- 1=Senin, 7=Minggu
  start_time time,
  end_time time,
  room text,                            -- e.g. "Kampus 4, Lab 3.02"
  color text default 'indigo',
  elearning_url text,                   -- Deep link ke Moodle LMS UAD
  whatsapp_group_url text,              -- Link grup WA kelas
  total_meetings int not null default 14,
  absent_count int not null default 0,  -- Kuota absen (maks 3 untuk 75%)
  target_grade text default 'A',
  created_at timestamptz default now()
);

-- ========== DPA GUIDANCE (3x Per Semester Milestone) ==========
create table if not exists public.dpa_guidance (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  meeting_number int not null check (meeting_number between 1 and 3),
  guidance_date date,
  topic text,                           -- e.g. "Perwalian KRS Awal Semester"
  notes text,
  is_completed boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, semester_id, meeting_number)
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

-- Circular reference resolution for learning_items -> projects
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'learning_items_related_project_fk'
  ) then
    alter table public.learning_items
      add constraint learning_items_related_project_fk
      foreign key (related_project_id) references public.projects(id) on delete set null;
  end if;
end $$;

-- ========== TASKS ==========
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  source text not null default 'personal' check (source in ('elearning','dosen','personal')),
  course text,
  due_date timestamptz,
  status text not null default 'inbox' check (status in ('inbox','planned','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  submission_state text not null default 'not_started' check (submission_state in ('not_started','drafting','ready_to_upload','submitted')),
  description text,
  link text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Backward compatibility for existing tables
alter table public.tasks
  add column if not exists course_id uuid references public.courses(id) on delete set null;

alter table public.tasks
  add column if not exists submission_state text not null default 'not_started'
  check (submission_state in ('not_started','drafting','ready_to_upload','submitted'));

-- ========== PROJECT UPDATES ==========
create table if not exists public.project_updates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  update_date date not null default current_date,
  content text not null,
  created_at timestamptz default now()
);

-- ========== LECTURE NOTES ==========
create table if not exists public.lecture_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
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

-- Backward compatibility for existing tables
alter table public.lecture_notes
  add column if not exists course_id uuid references public.courses(id) on delete set null;

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

-- ========== MONTHLY PLANS ==========
create table if not exists public.monthly_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  month_start date not null,
  focus text,
  academic_goals text,
  project_goals text,
  priorities text,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, month_start)
);

-- ========== SEMESTER PLANS ==========
create table if not exists public.semester_plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  focus text,
  academic_goals text,
  project_goals text,
  learning_goals text,
  priorities text,
  notes text,
  created_at timestamptz default now(),
  unique (user_id, semester_id)
);

-- ========== WEEKLY REVIEWS ==========
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

-- ========== MONTHLY REVIEWS ==========
create table if not exists public.monthly_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_id uuid references public.semesters(id) on delete set null,
  month_start date not null,
  academic_done text,
  academic_pending text,
  academic_unclear text,
  learning_summary text,
  project_progress text,
  problems text,
  improvements text,
  next_focus text,
  created_at timestamptz default now(),
  unique (user_id, month_start)
);

-- ========== SEMESTER REVIEWS ==========
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
alter table public.courses enable row level security;
alter table public.dpa_guidance enable row level security;
alter table public.learning_items enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.project_updates enable row level security;
alter table public.lecture_notes enable row level security;
alter table public.academic_events enable row level security;
alter table public.monthly_plans enable row level security;
alter table public.semester_plans enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.monthly_reviews enable row level security;
alter table public.semester_reviews enable row level security;

-- Policies
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own semesters" on public.semesters;
create policy "own semesters" on public.semesters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own courses" on public.courses;
create policy "own courses" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own dpa_guidance" on public.dpa_guidance;
create policy "own dpa_guidance" on public.dpa_guidance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own learning_items" on public.learning_items;
create policy "own learning_items" on public.learning_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own project_updates" on public.project_updates;
create policy "own project_updates" on public.project_updates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own lecture_notes" on public.lecture_notes;
create policy "own lecture_notes" on public.lecture_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own academic_events" on public.academic_events;
create policy "own academic_events" on public.academic_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own monthly_plans" on public.monthly_plans;
create policy "own monthly_plans" on public.monthly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own semester_plans" on public.semester_plans;
create policy "own semester_plans" on public.semester_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own weekly_reviews" on public.weekly_reviews;
create policy "own weekly_reviews" on public.weekly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own monthly_reviews" on public.monthly_reviews;
create policy "own monthly_reviews" on public.monthly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own semester_reviews" on public.semester_reviews;
create policy "own semester_reviews" on public.semester_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== INDEXES ==========
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists idx_tasks_user_semester on public.tasks (user_id, semester_id);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_tasks_course_id on public.tasks (course_id);
create index if not exists idx_courses_user_semester on public.courses (user_id, semester_id);
create index if not exists idx_dpa_guidance_user_semester on public.dpa_guidance (user_id, semester_id);
create index if not exists project_updates_project_id_date_idx on public.project_updates (project_id, update_date desc);
create index if not exists idx_lecture_notes_user_semester on public.lecture_notes (user_id, semester_id);
create index if not exists idx_lecture_notes_course_id on public.lecture_notes (course_id);
create index if not exists idx_projects_user_semester on public.projects (user_id, semester_id);
create index if not exists idx_learning_items_user_id on public.learning_items (user_id);
create index if not exists idx_academic_events_user_date on public.academic_events (user_id, start_date);
create index if not exists idx_semesters_user_id on public.semesters (user_id);

-- ========== FUNCTIONS & TRIGGERS ==========
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
