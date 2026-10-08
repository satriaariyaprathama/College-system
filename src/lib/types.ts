export type TaskSource = "elearning" | "dosen" | "personal";
export type TaskStatus = "inbox" | "planned" | "in_progress" | "review" | "done";
export type Priority = "low" | "medium" | "high";
export type LearningStatus = "planned" | "learning" | "paused" | "completed";
export type ProjectStatus = "idea" | "planned" | "in_progress" | "completed" | "archived";
export type PortfolioStatus = "no" | "maybe" | "yes";

export interface Semester {
  id: string;
  user_id: string;
  academic_year: string;
  semester_number: number;
  label: string | null;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  semester_id: string | null;
  title: string;
  source: TaskSource;
  course: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: Priority;
  description: string | null;
  link: string | null;
  project_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface LectureNote {
  id: string;
  user_id: string;
  semester_id: string | null;
  course: string;
  meeting_number: number | null;
  note_date: string | null;
  topic: string | null;
  key_concepts: string | null;
  notes: string | null;
  unclear_points: string | null;
  conclusion: string | null;
  link: string | null;
  project_id: string | null;
  created_at: string;
}

export interface LearningItem {
  id: string;
  user_id: string;
  skill_topic: string;
  goal: string | null;
  reason: string | null;
  status: LearningStatus;
  progress: number;
  resources: string | null;
  notes: string | null;
  related_project_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  semester_id: string | null;
  name: string;
  category: string | null;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  target_date: string | null;
  related_skill: string | null;
  related_course: string | null;
  related_learning_id: string | null;
  link: string | null;
  notes: string | null;
  portfolio_status: PortfolioStatus;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  user_id: string;
  project_id: string;
  update_date: string;
  content: string;
  created_at: string;
}

export interface AcademicEvent {
  id: string;
  user_id: string;
  semester_id: string | null;
  name: string;
  type: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  source_link: string | null;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  semester_id: string | null;
  week_start: string;
  academic_done: string | null;
  academic_pending: string | null;
  academic_unclear: string | null;
  task_open: string | null;
  task_next_deadline: string | null;
  learning_what: string | null;
  learning_progress: string | null;
  project_progress: string | null;
  project_blocked: string | null;
  next_priorities: string | null;
  next_improve: string | null;
  created_at: string;
}

export interface SemesterReview {
  id: string;
  user_id: string;
  semester_id: string;
  academic_progress: string | null;
  skill_growth: string | null;
  self_learning: string | null;
  project_summary: string | null;
  portfolio_summary: string | null;
  problems: string | null;
  improvements: string | null;
  next_focus: string | null;
  created_at: string;
}


