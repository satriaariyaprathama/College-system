-- College System Schema Patch V3

-- 1. Alter lecture_notes
alter table public.lecture_notes
  add column if not exists project_id uuid references public.projects(id) on delete set null;

-- 2. Create monthly_plans
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

-- 3. Create semester_plans
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

-- 4. Create monthly_reviews
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

-- 5. Row Level Security
alter table public.monthly_plans enable row level security;
alter table public.semester_plans enable row level security;
alter table public.monthly_reviews enable row level security;

drop policy if exists "own monthly_plans" on public.monthly_plans;
create policy "own monthly_plans" on public.monthly_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own semester_plans" on public.semester_plans;
create policy "own semester_plans" on public.semester_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own monthly_reviews" on public.monthly_reviews;
create policy "own monthly_reviews" on public.monthly_reviews
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Performance Indexes
create index if not exists idx_tasks_user_semester on public.tasks (user_id, semester_id);
create index if not exists idx_tasks_due_date on public.tasks (due_date);
create index if not exists idx_lecture_notes_user_semester on public.lecture_notes (user_id, semester_id);
create index if not exists idx_projects_user_semester on public.projects (user_id, semester_id);
create index if not exists idx_learning_items_user_id on public.learning_items (user_id);
create index if not exists idx_academic_events_user_date on public.academic_events (user_id, start_date);
create index if not exists idx_semesters_user_id on public.semesters (user_id);
