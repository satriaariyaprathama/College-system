"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import type { Task, TaskStatus, TaskSource, Priority, Project } from "@/lib/types";
import { Plus, Pencil, Trash2, List, Kanban, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const SOURCE_LABEL: Record<TaskSource, string> = { elearning: "E-Learning", dosen: "Dosen", personal: "Personal" };
const PRIORITY_COLOR: Record<Priority, "zinc" | "amber" | "red"> = { low: "zinc", medium: "amber", high: "red" };

const emptyForm = {
  id: "" as string | null,
  title: "",
  source: "personal" as TaskSource,
  course: "",
  due_date: "",
  status: "inbox" as TaskStatus,
  priority: "medium" as Priority,
  description: "",
  link: "",
  project_id: "",
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isPastDeadline(t: Task) {
  return !!t.due_date && new Date(t.due_date) < startOfToday();
}

export default function TasksPage() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [showDone, setShowDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  async function load() {
    setLoading(true);

    let taskQuery = supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });

    let projectQuery = supabase
      .from("projects")
      .select("*")
      .order("name", { ascending: true });

    if (currentSemesterId) {
      taskQuery = taskQuery.eq("semester_id", currentSemesterId);
      projectQuery = projectQuery.eq("semester_id", currentSemesterId);
    }

    const [{ data: taskData }, { data: projectData }] = await Promise.all([
      taskQuery,
      projectQuery,
    ]);

    setTasks((taskData as Task[]) ?? []);
    setProjects((projectData as Project[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const courses = useMemo(() => {
    return Array.from(
      new Set(
        tasks
          .map((t) => t.course?.trim())
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "done" && !showDone) return false;

      if (statusFilter && t.status !== statusFilter) return false;
      if (courseFilter && t.course !== courseFilter) return false;

      return true;
    });
  }, [tasks, statusFilter, courseFilter, showDone]);

  const calendarTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        t.status === "done" && !showDone
      ) {
        return false;
      }

      if (statusFilter && t.status !== statusFilter) return false;
      if (courseFilter && t.course !== courseFilter) return false;

      return true;
    });
  }, [tasks, statusFilter, courseFilter, showDone]);

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(t: Task) {
    setForm({
      id: t.id,
      title: t.title,
      source: t.source,
      course: t.course ?? "",
      due_date: t.due_date ? t.due_date.slice(0, 16) : "",
      status: t.status,
      priority: t.priority,
      description: t.description ?? "",
      link: t.link ?? "",
      project_id: t.project_id ?? "",
    });
    setModalOpen(true);
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      source: form.source,
      course: form.course || null,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      status: form.status,
      priority: form.priority,
      description: form.description || null,
      link: form.link || null,
      project_id: form.project_id || null,
      semester_id: currentSemesterId,
      completed_at: form.status === "done" ? new Date().toISOString() : null,
    };
    if (form.id) {
      await supabase.from("tasks").update(payload).eq("id", form.id);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("tasks").insert({ ...payload, user_id: userData.user!.id });
    }
    setModalOpen(false);
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Hapus task ini?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    load();
  }

  async function quickStatus(id: string, status: TaskStatus) {
    await supabase
      .from("tasks")
      .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
      .eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Task Management"
        description="Semua kewajiban: E-Learning, dosen, dan inisiatif pribadi."
        action={
          <Button onClick={openCreate}>
            <Plus size={15} /> Task Baru
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-zinc-100 p-1 text-xs">
          {[
            { id: "list", icon: List },
            { id: "kanban", icon: Kanban },
            { id: "calendar", icon: CalendarDays },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id as typeof view)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 font-medium capitalize ${
                view === v.id ? "bg-white shadow-sm" : "text-zinc-500"
              }`}
            >
              <v.icon size={14} /> {v.id}
            </button>
          ))}
        </div>

        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
          <option value="">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </Select>

        <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="!w-auto">
          <option value="">Semua Mata Kuliah</option>
          {courses.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </Select>

        <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          Tampilkan Done
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : view === "list" ? (
        <ListView tasks={filtered} projects={projects} onEdit={openEdit} onDelete={deleteTask} onStatus={quickStatus} />
      ) : view === "kanban" ? (
        <KanbanView tasks={filtered} projects={projects} onEdit={openEdit} onStatus={quickStatus} />
      ) : (
        <CalendarView tasks={calendarTasks} month={month} setMonth={setMonth} onEdit={openEdit} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Task" : "Task Baru"}>
        <form onSubmit={saveTask} className="space-y-3">
          <Field label="Nama Task">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source">
              <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as TaskSource })}>
                <option value="elearning">E-Learning</option>
                <option value="dosen">Dosen</option>
                <option value="personal">Personal</option>
              </Select>
            </Field>
            <Field label="Mata Kuliah (opsional)">
              <Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            </Field>
          </div>
          <Field label="Project (opsional)">
            <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">Tidak terkait project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <Input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description / Notes">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Link / Attachment">
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
          </Field>
          <div className="flex justify-between pt-2">
            {form.id ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  deleteTask(form.id!);
                  setModalOpen(false);
                }}
              >
                <Trash2 size={14} /> Hapus
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(t: Task) {
  return !!t.due_date && t.status !== "done" && new Date(t.due_date) < new Date();
}

function ListView({
  tasks,
  projects,
  onEdit,
  onDelete,
  onStatus,
}: {
  tasks: Task[];
  projects: Project[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, s: TaskStatus) => void;
}) {
  if (tasks.length === 0) return <EmptyState text="Belum ada task." />;
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-zinc-900">{t.title}</p>
              <Badge color={PRIORITY_COLOR[t.priority]}>{t.priority}</Badge>
              {isOverdue(t) && <Badge color="red">overdue</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {SOURCE_LABEL[t.source]}
              {t.course ? ` • ${t.course}` : ""} • {fmtDate(t.due_date)}
            </p>
            {t.project_id && (
              <p className="mt-0.5 text-xs text-indigo-600">
                Project: {projects.find((p) => p.id === t.project_id)?.name ?? "Project tidak ditemukan"}
              </p>
            )}
            {t.description && (
              <p className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap">
                {t.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select value={t.status} onChange={(e) => onStatus(t.id, e.target.value as TaskStatus)} className="!w-auto text-xs">
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
            <button onClick={() => onEdit(t)} className="text-zinc-400 hover:text-zinc-700">
              <Pencil size={15} />
            </button>
            <button onClick={() => onDelete(t.id)} className="text-zinc-400 hover:text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function KanbanView({
  tasks,
  onEdit,
  onStatus,
}: {
  tasks: Task[];
  projects: Project[];
  onEdit: (t: Task) => void;
  onStatus: (id: string, s: TaskStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
      {STATUSES.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {col.label} <span className="text-zinc-400">({items.length})</span>
            </p>
            <div className="space-y-2">
              {items.map((t) => (
                <Card key={t.id} className="cursor-pointer !p-3" >
                  <div onClick={() => onEdit(t)}>
                    <p className="text-sm font-medium text-zinc-900">{t.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{t.course || SOURCE_LABEL[t.source]}</p>
                    <p className="mt-1 text-xs text-zinc-400">{fmtDate(t.due_date)}</p>
                    {t.description && (
                      <p className="mt-1 text-xs text-zinc-500 whitespace-pre-wrap">
                        {t.description}
                      </p>
                    )}
                  </div>
                  {col.id !== "done" && (
                    <div className="mt-2 flex justify-end">
                      <button
                        className="text-xs text-indigo-600 hover:underline"
                        onClick={() => {
                          const next = STATUSES[STATUSES.findIndex((s) => s.id === col.id) + 1];
                          if (next) onStatus(t.id, next.id);
                        }}
                      >
                        Pindah 
                      </button>
                    </div>
                  )}
                </Card>
              ))}
              {items.length === 0 && <p className="rounded-lg border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-300">kosong</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({
  tasks,
  month,
  setMonth,
  onEdit,
}: {
  tasks: Task[];
  month: Date;
  setMonth: (d: Date) => void;
  onEdit: (t: Task) => void;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const byDay: Record<number, Task[]> = {};
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const d = new Date(t.due_date);
    if (d.getFullYear() === year && d.getMonth() === m) {
      byDay[d.getDate()] = byDay[d.getDate()] || [];
      byDay[d.getDate()].push(t);
    }
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setMonth(new Date(year, m - 1, 1))} className="rounded-lg p-1.5 hover:bg-zinc-100">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
        <button onClick={() => setMonth(new Date(year, m + 1, 1))} className="rounded-lg p-1.5 hover:bg-zinc-100">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-400">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div key={i} className={`min-h-16 rounded-lg border p-1 text-xs ${day ? "border-zinc-200 bg-white" : "border-transparent"}`}>
            {day && (
              <>
                <p className="mb-0.5 font-medium text-zinc-400">{day}</p>
                <div className="space-y-0.5">
                  {(byDay[day] ?? []).slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onEdit(t)}
                      className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] ${
                        t.status === "done"
                          ? "bg-zinc-100 text-zinc-500"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {t.status === "done" ? "✓ Selesai • " : ""}{t.title}
                    </button>
                  ))}
                  {(byDay[day]?.length ?? 0) > 3 && <p className="text-[10px] text-zinc-400">+{byDay[day].length - 3} lagi</p>}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

















