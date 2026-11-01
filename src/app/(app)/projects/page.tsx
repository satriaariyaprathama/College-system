"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  Project,
  ProjectStatus,
  PortfolioStatus,
  Task,
  ProjectUpdate,
} from "@/lib/types";
import { sanitizeUrl } from "@/lib/utils";
import { formatLocalDateKey } from "@/lib/date";
import { Plus, Pencil, Trash2, Link as LinkIcon, X, FolderKanban, GraduationCap, Star } from "lucide-react";
import SelfLearningTab from "./components/SelfLearningTab";
import PortfolioShowcaseTab from "./components/PortfolioShowcaseTab";

const STATUSES: {
  id: ProjectStatus;
  label: string;
  color: "zinc" | "indigo" | "amber" | "emerald";
}[] = [
  { id: "idea", label: "Idea", color: "zinc" },
  { id: "planned", label: "Planned", color: "amber" },
  { id: "in_progress", label: "In Progress", color: "indigo" },
  { id: "completed", label: "Completed", color: "emerald" },
  { id: "archived", label: "Archived", color: "zinc" },
];

const emptyForm = {
  id: "" as string | null,
  name: "",
  category: "",
  description: "",
  status: "idea" as ProjectStatus,
  start_date: "",
  target_date: "",
  related_skill: "",
  related_course: "",
  link: "",
  notes: "",
  portfolio_status: "no" as PortfolioStatus,
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400 py-6">Memuat modul Projects...</p>}>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "projects" | "learning" | "portfolio") || "projects";

  const { currentSemesterId } = useSemesters();
  const [activeTab, setActiveTab] = useState<"projects" | "learning" | "portfolio">(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as "projects" | "learning" | "portfolio";
    if (tabParam && (tabParam === "projects" || tabParam === "learning" || tabParam === "portfolio")) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [items, setItems] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [updateDate, setUpdateDate] = useState(() =>
    formatLocalDateKey(new Date())
  );
  const [updateContent, setUpdateContent] = useState("");

  async function load() {
    setLoading(true);

    let projectQuery = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    let taskQuery = supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (currentSemesterId) {
      projectQuery = projectQuery.eq("semester_id", currentSemesterId);
      taskQuery = taskQuery.eq("semester_id", currentSemesterId);
    }

    const [{ data: projectData }, { data: taskData }] = await Promise.all([
      projectQuery,
      taskQuery,
    ]);

    setItems((projectData as Project[]) ?? []);
    setTasks((taskData as Task[]) ?? []);
    setLoading(false);
  }

  async function loadUpdates(projectId: string) {
    const { data } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .order("update_date", { ascending: false })
      .order("created_at", { ascending: false });

    setUpdates((data as ProjectUpdate[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const filtered = statusFilter
    ? items.filter((item) => item.status === statusFilter)
    : items;

  function getProjectTasks(projectId: string) {
    return tasks.filter((task) => task.project_id === projectId);
  }

  function getProgress(projectId: string) {
    const related = getProjectTasks(projectId);
    const total = related.length;
    const done = related.filter((task) => task.status === "done").length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, percent };
  }

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setForm({
      id: project.id,
      name: project.name,
      category: project.category ?? "",
      description: project.description ?? "",
      status: project.status,
      start_date: project.start_date ?? "",
      target_date: project.target_date ?? "",
      related_skill: project.related_skill ?? "",
      related_course: project.related_course ?? "",
      link: project.link ?? "",
      notes: project.notes ?? "",
      portfolio_status: project.portfolio_status,
    });

    setModalOpen(true);
  }

  async function openDetail(project: Project) {
    setSelectedProject(project);
    setUpdates([]);
    setUpdateContent("");
    setUpdateDate(formatLocalDateKey(new Date()));
    setDetailOpen(true);
    await loadUpdates(project.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      name: form.name,
      category: form.category || null,
      description: form.description || null,
      status: form.status,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      related_skill: form.related_skill || null,
      related_course: form.related_course || null,
      link: form.link || null,
      notes: form.notes || null,
      portfolio_status: form.portfolio_status,
      semester_id: currentSemesterId,
    };

    if (form.id) {
      const { error } = await supabase.from("projects").update(payload).eq("id", form.id);
      if (error) {
        alert(`Gagal memperbarui project: ${error.message}`);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }

      const { error } = await supabase.from("projects").insert({
        ...payload,
        user_id: user.id,
      });

      if (error) {
        alert(`Gagal menambahkan project: ${error.message}`);
        return;
      }
    }

    setModalOpen(false);
    load();
  }

  async function addUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProject || !updateContent.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Sesi login berakhir. Silakan login kembali.");
      return;
    }

    const { error } = await supabase.from("project_updates").insert({
      user_id: user.id,
      project_id: selectedProject.id,
      update_date: updateDate,
      content: updateContent.trim(),
    });

    if (error) {
      alert(`Gagal menambahkan update: ${error.message}`);
      return;
    }

    setUpdateContent("");
    await loadUpdates(selectedProject.id);
  }

  async function deleteUpdate(id: string) {
    const { error } = await supabase.from("project_updates").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus update: ${error.message}`);
      return;
    }

    if (selectedProject) {
      await loadUpdates(selectedProject.id);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus project ini?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus project: ${error.message}`);
      return;
    }

    if (selectedProject?.id === id) {
      setSelectedProject(null);
      setDetailOpen(false);
    }

    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
        <div>
          <PageHeader
            title="Projects, Skills & Portfolio"
            description="Manajemen proyek kuliah, skill self-learning, dan etalase karya portofolio."
          />
        </div>

        {activeTab === "projects" && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus size={15} /> Project Baru
          </Button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex w-fit rounded-lg bg-zinc-100 p-1 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab("projects")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            activeTab === "projects"
              ? "bg-white text-zinc-900 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <FolderKanban size={15} />
          Semua Proyek
        </button>
        <button
          onClick={() => setActiveTab("learning")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            activeTab === "learning"
              ? "bg-white text-zinc-900 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <GraduationCap size={15} />
          Self-Learning & Skills
        </button>
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            activeTab === "portfolio"
              ? "bg-white text-zinc-900 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Star size={15} className="text-amber-500" />
          Portfolio Showcase
        </button>
      </div>

      {activeTab === "learning" && <SelfLearningTab />}
      {activeTab === "portfolio" && <PortfolioShowcaseTab />}

      {activeTab === "projects" && (
        <>
          <div className="mb-4">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="!w-auto"
            >
              <option value="">Semua Status</option>
              {STATUSES.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-zinc-400">Memuat...</p>
          ) : filtered.length === 0 ? (
            <EmptyState text="Belum ada project." />
          ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((project) => {
            const status = STATUSES.find(
              (item) => item.id === project.status
            )!;
            const progress = getProgress(project.id);

            return (
              <Card key={project.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => openDetail(project)}
                      className="truncate text-left text-sm font-medium text-zinc-900 hover:text-indigo-600"
                    >
                      {project.name}
                    </button>

                    <p className="text-xs text-zinc-500">
                      {project.category || "-"}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openEdit(project)}
                      className="text-zinc-400 hover:text-zinc-700"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={() => remove(project.id)}
                      className="text-zinc-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {project.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600">
                    {project.description}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge color={status.color}>{status.label}</Badge>

                  {project.portfolio_status !== "no" && (
                    <Badge
                      color={
                        project.portfolio_status === "yes"
                          ? "emerald"
                          : "amber"
                      }
                    >
                      portfolio: {project.portfolio_status}
                    </Badge>
                  )}

                  {project.link && sanitizeUrl(project.link) && (
                    <a
                      href={sanitizeUrl(project.link)!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                    >
                      <LinkIcon size={11} /> link
                    </a>
                  )}
                </div>

                <button
                  onClick={() => openDetail(project)}
                  className="mt-3 w-full rounded-lg bg-zinc-50 px-3 py-2 text-left hover:bg-zinc-100"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-600">
                      Task Progress
                    </span>

                    <span className="text-zinc-500">
                      {progress.total === 0
                        ? "Belum ada task"
                        : progress.done +
                          " / " +
                          progress.total +
                          " selesai — " +
                          progress.percent +
                          "%"}
                    </span>
                  </div>

                  {progress.total > 0 && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: progress.percent + "%" }}
                      />
                    </div>
                  )}
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedProject?.name ?? "Project"}
      >
        {selectedProject && (
          <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  color={
                    STATUSES.find(
                      (status) => status.id === selectedProject.status
                    )?.color ?? "zinc"
                  }
                >
                  {STATUSES.find(
                    (status) => status.id === selectedProject.status
                  )?.label ?? selectedProject.status}
                </Badge>

                {selectedProject.category && (
                  <span className="text-xs text-zinc-500">
                    {selectedProject.category}
                  </span>
                )}
              </div>

              {selectedProject.description && (
                <p className="mt-2 text-sm text-zinc-600">
                  {selectedProject.description}
                </p>
              )}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                Related Tasks
              </h3>

              {(() => {
                const related = getProjectTasks(selectedProject.id);
                const progress = getProgress(selectedProject.id);

                if (related.length === 0) {
                  return (
                    <p className="text-xs text-zinc-400">
                      Belum ada task yang terhubung ke project ini.
                    </p>
                  );
                }

                return (
                  <div>
                    <div className="mb-2 text-xs text-zinc-500">
                      {progress.done} / {progress.total} task selesai —{" "}
                      {progress.percent}%
                    </div>

                    <div className="space-y-1.5">
                      {related.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2"
                        >
                          <span
                            className={
                              task.status === "done"
                                ? "text-xs text-zinc-400 line-through"
                                : "text-xs text-zinc-700"
                            }
                          >
                            {task.title}
                          </span>

                          <Badge
                            color={
                              task.status === "done" ? "emerald" : "zinc"
                            }
                          >
                            {task.status === "done"
                              ? "Done"
                              : task.status.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                Project Update Log
              </h3>

              <form onSubmit={addUpdate} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="date"
                    value={updateDate}
                    onChange={(e) => setUpdateDate(e.target.value)}
                  />

                  <div className="col-span-2">
                    <Input
                      value={updateContent}
                      onChange={(e) => setUpdateContent(e.target.value)}
                      placeholder="Contoh: UMKM sudah dipilih dan owner sudah dihubungi"
                    />
                  </div>
                </div>

                <Button type="submit">Tambah Update</Button>
              </form>

              <div className="mt-3 space-y-2">
                {updates.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Belum ada update project.
                  </p>
                ) : (
                  updates.map((update) => (
                    <div
                      key={update.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-[11px] font-medium text-zinc-400">
                          {new Date(
                            update.update_date + "T00:00:00"
                          ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>

                        <p className="mt-0.5 text-xs text-zinc-700">
                          {update.content}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteUpdate(update.id)}
                        className="shrink-0 text-zinc-300 hover:text-red-500"
                        title="Hapus update"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Project" : "Project Baru"}
      >
        <form
          onSubmit={save}
          className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
        >
          <Field label="Nama Project">
            <Input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                placeholder="Kuliah / Personal / Community"
              />
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as ProjectStatus,
                  })
                }
              >
                {STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </Field>

            <Field label="Target Date">
              <Input
                type="date"
                value={form.target_date}
                onChange={(e) =>
                  setForm({ ...form, target_date: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Related Skill">
              <Input
                value={form.related_skill}
                onChange={(e) =>
                  setForm({ ...form, related_skill: e.target.value })
                }
              />
            </Field>

            <Field label="Related Course">
              <Input
                value={form.related_course}
                onChange={(e) =>
                  setForm({ ...form, related_course: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Link / Files">
            <Input
              value={form.link}
              onChange={(e) =>
                setForm({ ...form, link: e.target.value })
              }
              placeholder="https://..."
            />
          </Field>

          <Field label="Notes">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value })
              }
            />
          </Field>

          <Field label="Portfolio Status">
            <Select
              value={form.portfolio_status}
              onChange={(e) =>
                setForm({
                  ...form,
                  portfolio_status: e.target.value as PortfolioStatus,
                })
              }
            >
              <option value="no">No</option>
              <option value="maybe">Maybe</option>
              <option value="yes">Yes</option>
            </Select>
          </Field>

          <div className="flex justify-between pt-2">
            {form.id ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  remove(form.id!);
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
        </>
      )}
    </div>
  );
}