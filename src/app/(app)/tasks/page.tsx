"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import type {
  Task,
  TaskStatus,
  TaskSource,
  Priority,
  Project,
  Course,
  SubmissionState,
} from "@/lib/types";
import { formatMonthLabel, isPastDeadline } from "@/lib/date";
import {
  Plus,
  Pencil,
  Trash2,
  List,
  Kanban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UploadCloud,
} from "lucide-react";

const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const SOURCE_LABEL: Record<TaskSource, string> = {
  elearning: "E-Learning",
  dosen: "Dosen",
  personal: "Personal",
};

const PRIORITY_COLOR: Record<Priority, "zinc" | "amber" | "red"> = {
  low: "zinc",
  medium: "amber",
  high: "red",
};

const SUBMISSION_CONFIG: Record<
  SubmissionState,
  { label: string; color: "zinc" | "amber" | "indigo" | "emerald" }
> = {
  not_started: { label: "Belum Mulai", color: "zinc" },
  drafting: { label: "Drafting", color: "amber" },
  ready_to_upload: { label: "Siap Upload", color: "indigo" },
  submitted: { label: "Submitted", color: "emerald" },
};

const emptyForm = {
  id: "" as string | null,
  title: "",
  source: "personal" as TaskSource,
  course: "",
  course_id: "" as string | null,
  submission_state: "not_started" as SubmissionState,
  due_date: "",
  status: "inbox" as TaskStatus,
  priority: "medium" as Priority,
  description: "",
  link: "",
  project_id: "",
};

export default function TasksPage() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
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

    let courseQuery = supabase
      .from("courses")
      .select("*")
      .order("name", { ascending: true });

    if (currentSemesterId) {
      taskQuery = taskQuery.eq("semester_id", currentSemesterId);
      projectQuery = projectQuery.eq("semester_id", currentSemesterId);
      courseQuery = courseQuery.eq("semester_id", currentSemesterId);
    }

    const [
      { data: taskData },
      { data: projectData },
      { data: courseData },
    ] = await Promise.all([taskQuery, projectQuery, courseQuery]);

    setTasks((taskData as Task[]) ?? []);
    setProjects((projectData as Project[]) ?? []);
    setCourses((courseData as Course[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const uniqueCourseNames = useMemo(() => {
    const fromCourses = courses.map((c) => c.name.trim());
    const fromTasks = tasks.map((t) => t.course?.trim()).filter(Boolean) as string[];
    return Array.from(new Set([...fromCourses, ...fromTasks])).sort((a, b) =>
      a.localeCompare(b, "id")
    );
  }, [courses, tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "done" && !showDone) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (courseFilter) {
        const matchesName = t.course === courseFilter;
        const matchedCourse = courses.find((c) => c.id === t.course_id);
        const matchesId = matchedCourse?.name === courseFilter;
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, courseFilter, showDone, courses]);

  const calendarTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "done" && !showDone) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (courseFilter) {
        const matchesName = t.course === courseFilter;
        const matchedCourse = courses.find((c) => c.id === t.course_id);
        const matchesId = matchedCourse?.name === courseFilter;
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, courseFilter, showDone, courses]);

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
      course_id: t.course_id ?? "",
      submission_state: t.submission_state ?? "not_started",
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
    const selectedCourseObj = courses.find((c) => c.id === form.course_id);
    const resolvedCourseName = selectedCourseObj
      ? selectedCourseObj.name
      : form.course.trim() || null;

    const payload = {
      title: form.title,
      source: form.source,
      course: resolvedCourseName,
      course_id: form.course_id || null,
      submission_state: form.submission_state,
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
      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", form.id);
      if (error) {
        alert(`Gagal memperbarui task: ${error.message}`);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }
      const { error } = await supabase
        .from("tasks")
        .insert({ ...payload, user_id: user.id });
      if (error) {
        alert(`Gagal menambahkan task: ${error.message}`);
        return;
      }
    }
    setModalOpen(false);
    load();
  }

  async function deleteTask(id: string) {
    if (!confirm("Hapus task ini?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus task: ${error.message}`);
      return;
    }
    load();
  }

  async function quickStatus(id: string, status: TaskStatus) {
    const { error } = await supabase
      .from("tasks")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      alert(`Gagal memperbarui status: ${error.message}`);
      return;
    }
    load();
  }

  async function quickSubmission(id: string, submission_state: SubmissionState) {
    const { error } = await supabase
      .from("tasks")
      .update({ submission_state })
      .eq("id", id);
    if (error) {
      alert(`Gagal memperbarui status submission: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tasks & E-Learning Assignment Flight Deck"
        description="Pelacak tugas kuliah terintegrasi SIMERU, status pengumpulan E-Learning, dan proyek mandiri."
        action={
          <Button onClick={openCreate}>
            <Plus size={15} /> Task Baru
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
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

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="!w-auto !text-xs"
        >
          <option value="">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>

        <Select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="!w-auto !text-xs"
        >
          <option value="">Semua Mata Kuliah</option>
          {uniqueCourseNames.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </Select>

        <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
          />
          Tampilkan Selesai
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 py-6">Memuat task...</p>
      ) : view === "list" ? (
        <ListView
          tasks={filtered}
          projects={projects}
          courses={courses}
          onEdit={openEdit}
          onDelete={deleteTask}
          onStatus={quickStatus}
          onSubmission={quickSubmission}
        />
      ) : view === "kanban" ? (
        <KanbanView
          tasks={filtered}
          projects={projects}
          courses={courses}
          onEdit={openEdit}
          onStatus={quickStatus}
          onSubmission={quickSubmission}
        />
      ) : (
        <CalendarView
          tasks={calendarTasks}
          month={month}
          setMonth={setMonth}
          onEdit={openEdit}
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Task" : "Task Baru"}
      >
        <form onSubmit={saveTask} className="space-y-3">
          <Field label="Judul / Nama Tugas">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Contoh: Tugas 3 - ERD Basis Data Lanjut"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sumber Tugas">
              <Select
                value={form.source}
                onChange={(e) =>
                  setForm({ ...form, source: e.target.value as TaskSource })
                }
              >
                <option value="elearning">E-Learning UAD</option>
                <option value="dosen">Dosen Langsung / Offline</option>
                <option value="personal">Personal / Inisiatif</option>
              </Select>
            </Field>

            <Field label="Status Pengumpulan (Submission)">
              <Select
                value={form.submission_state}
                onChange={(e) =>
                  setForm({
                    ...form,
                    submission_state: e.target.value as SubmissionState,
                  })
                }
              >
                <option value="not_started">Belum Mulai</option>
                <option value="drafting">Drafting (Sedang Dikerjakan)</option>
                <option value="ready_to_upload">Siap Upload File</option>
                <option value="submitted">Submitted (Sudah Diunggah)</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Mata Kuliah (Master SIMERU)">
              <Select
                value={form.course_id ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    course_id: e.target.value || null,
                  })
                }
              >
                <option value="">-- Pilih Mata Kuliah Terdaftar --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ""}
                    {c.name} ({c.credits} SKS)
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Atau Ketik Nama Mata Kuliah / Topik">
              <Input
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                placeholder="Manual jika belum ada di master..."
              />
            </Field>
          </div>

          <Field label="Project (Opsional)">
            <Select
              value={form.project_id}
              onChange={(e) =>
                setForm({ ...form, project_id: e.target.value })
              }
            >
              <option value="">Tidak terkait project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline / Waktu Pengumpulan">
              <Input
                type="datetime-local"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </Field>

            <Field label="Prioritas">
              <Select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as Priority })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>

          <Field label="Status Task">
            <Select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as TaskStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Keterangan / Soal Tugas">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Instruksi tugas, format PDF/ZIP yang diminta..."
            />
          </Field>

          <Field label="Link E-Learning / Dokumen Soal">
            <Input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://elearning.uad.ac.id/mod/assign/view.php?id=..."
            />
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
            <Button type="submit">Simpan Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(t: Task) {
  return t.status !== "done" && isPastDeadline(t.due_date);
}

function ListView({
  tasks,
  projects,
  courses,
  onEdit,
  onDelete,
  onStatus,
  onSubmission,
}: {
  tasks: Task[];
  projects: Project[];
  courses: Course[];
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onStatus: (id: string, s: TaskStatus) => void;
  onSubmission: (id: string, s: SubmissionState) => void;
}) {
  if (tasks.length === 0) return <EmptyState text="Belum ada task." />;

  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const courseObj = courses.find((c) => c.id === t.course_id);
        const courseName = courseObj?.name ?? t.course;
        const subConfig =
          SUBMISSION_CONFIG[t.submission_state ?? "not_started"];

        return (
          <Card
            key={t.id}
            className={`flex flex-wrap items-center justify-between gap-3 border-l-4 ${
              t.status === "done"
                ? "border-l-zinc-300 opacity-75"
                : isOverdue(t)
                ? "border-l-red-500 bg-red-50/10"
                : t.priority === "high"
                ? "border-l-amber-500"
                : "border-l-indigo-500"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`truncate text-sm font-semibold ${
                    t.status === "done"
                      ? "text-zinc-400 line-through"
                      : "text-zinc-900"
                  }`}
                >
                  {t.title}
                </p>
                <Badge color={PRIORITY_COLOR[t.priority]}>{t.priority}</Badge>
                {isOverdue(t) && <Badge color="red">overdue</Badge>}
                <Badge color={subConfig.color}>{subConfig.label}</Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">
                  {SOURCE_LABEL[t.source]}
                </span>
                {courseName && <span>• {courseName}</span>}
                <span>• Deadline: {fmtDate(t.due_date)}</span>
                {courseObj?.elearning_url && (
                  <a
                    href={courseObj.elearning_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                  >
                    <ExternalLink size={11} /> LMS Moodle
                  </a>
                )}
                {t.link && (
                  <a
                    href={t.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-600 hover:underline"
                  >
                    <UploadCloud size={11} /> Link Tugas
                  </a>
                )}
              </div>

              {t.project_id && (
                <p className="mt-0.5 text-xs text-indigo-600 font-medium">
                  Project:{" "}
                  {projects.find((p) => p.id === t.project_id)?.name ??
                    "Project terkait"}
                </p>
              )}

              {t.description && (
                <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                  {t.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Submission switcher quick button */}
              <Select
                value={t.submission_state ?? "not_started"}
                onChange={(e) =>
                  onSubmission(t.id, e.target.value as SubmissionState)
                }
                className="!w-auto !text-xs !py-1"
                title="Status Pengumpulan Tugas"
              >
                <option value="not_started">Belum Mulai</option>
                <option value="drafting">Drafting</option>
                <option value="ready_to_upload">Siap Upload</option>
                <option value="submitted">Submitted</option>
              </Select>

              {/* Status task */}
              <Select
                value={t.status}
                onChange={(e) =>
                  onStatus(t.id, e.target.value as TaskStatus)
                }
                className="!w-auto !text-xs !py-1"
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>

              <button
                onClick={() => onEdit(t)}
                className="p-1 text-zinc-400 hover:text-zinc-700"
                title="Edit Task"
              >
                <Pencil size={15} />
              </button>

              <button
                onClick={() => onDelete(t.id)}
                className="p-1 text-zinc-400 hover:text-red-600"
                title="Hapus Task"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function KanbanView({
  tasks,
  courses,
  onEdit,
  onStatus,
  onSubmission,
}: {
  tasks: Task[];
  projects: Project[];
  courses: Course[];
  onEdit: (t: Task) => void;
  onStatus: (id: string, s: TaskStatus) => void;
  onSubmission: (id: string, s: SubmissionState) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-2 lg:grid-cols-5">
      {STATUSES.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {col.label}{" "}
              <span className="text-zinc-400">({items.length})</span>
            </p>
            <div className="space-y-2">
              {items.map((t) => {
                const courseObj = courses.find((c) => c.id === t.course_id);
                const courseName = courseObj?.name ?? t.course;
                const subConfig =
                  SUBMISSION_CONFIG[t.submission_state ?? "not_started"];

                return (
                  <Card key={t.id} className="cursor-pointer !p-3">
                    <div onClick={() => onEdit(t)}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-semibold text-zinc-900 leading-snug">
                          {t.title}
                        </p>
                        <Badge color={PRIORITY_COLOR[t.priority]}>
                          {t.priority}
                        </Badge>
                      </div>

                      <p className="mt-1 text-xs text-zinc-600 font-medium">
                        {courseName || SOURCE_LABEL[t.source]}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Badge color={subConfig.color}>
                          {subConfig.label}
                        </Badge>
                        {isOverdue(t) && <Badge color="red">Overdue</Badge>}
                      </div>

                      <p className="mt-1.5 text-[11px] text-zinc-400">
                        {fmtDate(t.due_date)}
                      </p>

                      {t.description && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                          {t.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <button
                        className="text-[11px] font-medium text-indigo-600 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextSub: SubmissionState =
                            t.submission_state === "submitted"
                              ? "not_started"
                              : t.submission_state === "ready_to_upload"
                              ? "submitted"
                              : t.submission_state === "drafting"
                              ? "ready_to_upload"
                              : "drafting";
                          onSubmission(t.id, nextSub);
                        }}
                      >
                        Ubah Submit
                      </button>

                      {col.id !== "done" && (
                        <button
                          className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next =
                              STATUSES[
                                STATUSES.findIndex((s) => s.id === col.id) + 1
                              ];
                            if (next) onStatus(t.id, next.id);
                          }}
                        >
                          Pindah →
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-zinc-200 py-4 text-center text-xs text-zinc-300">
                  kosong
                </p>
              )}
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
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

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
        <button
          onClick={() => setMonth(new Date(year, m - 1, 1))}
          className="rounded-lg p-1.5 hover:bg-zinc-100"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium">{formatMonthLabel(month)}</p>
        <button
          onClick={() => setMonth(new Date(year, m + 1, 1))}
          className="rounded-lg p-1.5 hover:bg-zinc-100"
        >
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
          <div
            key={i}
            className={`min-h-16 rounded-lg border p-1 text-xs ${
              day ? "border-zinc-200 bg-white" : "border-transparent"
            }`}
          >
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
                          : "bg-indigo-50 text-indigo-700 font-medium"
                      }`}
                    >
                      {t.status === "done" ? "✓ " : ""}
                      {t.title}
                    </button>
                  ))}
                  {(byDay[day]?.length ?? 0) > 3 && (
                    <p className="text-[10px] text-zinc-400">
                      +{byDay[day].length - 3} lagi
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
