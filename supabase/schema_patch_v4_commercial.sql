-- ==============================================================================
-- College System (Kuliah Hub) — Schema Patch V4 (Commercial-Grade Architecture)
-- ==============================================================================

-- 1. Master Mata Kuliah & SIMERU Schedule
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

-- 2. Alter tasks: add course_id & submission_state
alter table public.tasks
  add column if not exists course_id uuid references public.courses(id) on delete set null;

alter table public.tasks
  add column if not exists submission_state text not null default 'not_started'
  check (submission_state in ('not_started','drafting','ready_to_upload','submitted'));

-- 3. Alter lecture_notes: add course_id
alter table public.lecture_notes
  add column if not exists course_id uuid references public.courses(id) on delete set null;

-- 4. Bimbingan DPA UAD (3x Per Semester Milestone)
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

-- 5. Row Level Security
alter table public.courses enable row level security;
alter table public.dpa_guidance enable row level security;

drop policy if exists "own courses" on public.courses;
create policy "own courses" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own dpa_guidance" on public.dpa_guidance;
create policy "own dpa_guidance" on public.dpa_guidance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Performance Indexes
create index if not exists idx_courses_user_semester on public.courses (user_id, semester_id);
create index if not exists idx_tasks_course_id on public.tasks (course_id);
create index if not exists idx_lecture_notes_course_id on public.lecture_notes (course_id);
create index if not exists idx_dpa_guidance_user_semester on public.dpa_guidance (user_id, semester_id);
