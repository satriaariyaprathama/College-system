"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import type { Task, LearningItem, Project } from "@/lib/types";
import {
  CheckSquare,
  NotebookPen,
  GraduationCap,
  FolderKanban,
  Star,
  CalendarClock,
  ClipboardList,
  AlertCircle,
} from "lucide-react";

const QUICK_ACCESS = [
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notes", label: "Lecture Notes", icon: NotebookPen },
  { href: "/learning", label: "Self-Learning", icon: GraduationCap },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/portfolio", label: "Portfolio", icon: Star },
  { href: "/timeline", label: "Academic Timeline", icon: CalendarClock },
  { href: "/review", label: "Weekly Review", icon: ClipboardList },
];

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}
function endOfWeek() {
  const s = startOfWeek();
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return e;
}

export default function DashboardPage() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [learning, setLearning] = useState<LearningItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userData.user!.id).single();
      setName(profile?.full_name?.split(" ")[0] ?? "");

      let taskQuery = supabase.from("tasks").select("*").neq("status", "done").order("due_date", { ascending: true, nullsFirst: false });
      let learningQuery = supabase.from("learning_items").select("*").eq("status", "learning");
      let projectQuery = supabase.from("projects").select("*").eq("status", "in_progress");

      if (currentSemesterId) {
        taskQuery = taskQuery.eq("semester_id", currentSemesterId);
        projectQuery = projectQuery.eq("semester_id", currentSemesterId);
      }

      const [{ data: t }, { data: l }, { data: p }] = await Promise.all([taskQuery, learningQuery, projectQuery]);
      setTasks((t as Task[]) ?? []);
      setLearning((l as LearningItem[]) ?? []);
      setProjects((p as Project[]) ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const now = new Date();
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < now);
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const thisWeek = tasks.filter((t) => t.due_date && new Date(t.due_date) >= weekStart && new Date(t.due_date) < weekEnd);
  const upcoming = tasks.filter((t) => !overdue.includes(t)).slice(0, 6);

  return (
    <div>
      <PageHeader title={name ? `Halo, ${name}` : "Dashboard"} description="Apa yang perlu diperhatikan sekarang." />

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Active Tasks" value={tasks.length} />
            <StatCard label="Overdue" value={overdue.length} alert={overdue.length > 0} />
            <StatCard label="Active Learning" value={learning.length} />
            <StatCard label="Active Projects" value={projects.length} />
          </div>

          <section>
            <SectionTitle title="Today / Current" href="/tasks" />
            {overdue.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {overdue.map((t) => (
                  <TaskRow key={t.id} task={t} overdue />
                ))}
              </div>
            )}
            {upcoming.length === 0 && overdue.length === 0 ? (
              <EmptyState text="Tidak ada task yang butuh perhatian. 🎉" />
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle title={`This Week (${thisWeek.length})`} href="/tasks" />
            {thisWeek.length === 0 ? (
              <EmptyState text="Tidak ada deadline minggu ini." />
            ) : (
              <div className="space-y-1.5">
                {thisWeek.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            )}

            {learning.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {learning.map((l) => (
                  <Badge key={l.id} color="indigo">
                    {l.skill_topic} · {l.progress}%
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle title="Projects Berjalan" href="/projects" />
            {projects.length === 0 ? (
              <EmptyState text="Tidak ada project yang sedang berjalan." />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {projects.map((p) => (
                  <Card key={p.id} className="!p-3">
                    <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.category || "-"}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="mb-2 text-sm font-semibold text-zinc-900">Quick Access</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {QUICK_ACCESS.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-3 text-center text-xs font-medium text-zinc-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
                >
                  <q.icon size={18} />
                  {q.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <Card className="!p-3">
      <p className={`text-2xl font-semibold ${alert && value > 0 ? "text-red-600" : "text-zinc-900"}`}>{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </Card>
  );
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <Link href={href} className="text-xs text-indigo-600 hover:underline">
        Lihat semua
      </Link>
    </div>
  );
}

function TaskRow({ task, overdue }: { task: Task; overdue?: boolean }) {
  return (
    <Card className="flex items-center justify-between gap-3 !p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900">{task.title}</p>
        <p className="text-xs text-zinc-500">
          {task.course ?? "-"} {task.due_date ? `· ${new Date(task.due_date).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
      </div>
      {overdue ? (
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle size={13} /> overdue
        </span>
      ) : (
        <Badge color={task.priority === "high" ? "red" : task.priority === "medium" ? "amber" : "zinc"}>{task.priority}</Badge>
      )}
    </Card>
  );
}
