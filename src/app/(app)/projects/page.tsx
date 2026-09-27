"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import type { Project, ProjectStatus, PortfolioStatus } from "@/lib/types";
import { Plus, Pencil, Trash2, Link as LinkIcon } from "lucide-react";

const STATUSES: { id: ProjectStatus; label: string; color: "zinc" | "indigo" | "amber" | "emerald" }[] = [
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
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (currentSemesterId) query = query.eq("semester_id", currentSemesterId);
    const { data } = await query;
    setItems((data as Project[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const filtered = statusFilter ? items.filter((i) => i.status === statusFilter) : items;

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(p: Project) {
    setForm({
      id: p.id,
      name: p.name,
      category: p.category ?? "",
      description: p.description ?? "",
      status: p.status,
      start_date: p.start_date ?? "",
      target_date: p.target_date ?? "",
      related_skill: p.related_skill ?? "",
      related_course: p.related_course ?? "",
      link: p.link ?? "",
      notes: p.notes ?? "",
      portfolio_status: p.portfolio_status,
    });
    setModalOpen(true);
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
      await supabase.from("projects").update(payload).eq("id", form.id);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("projects").insert({ ...payload, user_id: userData.user!.id });
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus project ini?")) return;
    await supabase.from("projects").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Semua project dari kuliah, self-learning, personal, maupun komunitas."
        action={
          <Button onClick={openCreate}>
            <Plus size={15} /> Project Baru
          </Button>
        }
      />

      <div className="mb-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
          <option value="">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
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
          {filtered.map((p) => {
            const s = STATUSES.find((x) => x.id === p.status)!;
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-500">{p.category || "-"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openEdit(p)} className="text-zinc-400 hover:text-zinc-700">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => remove(p.id)} className="text-zinc-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {p.description && <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600">{p.description}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge color={s.color}>{s.label}</Badge>
                  {p.portfolio_status !== "no" && (
                    <Badge color={p.portfolio_status === "yes" ? "emerald" : "amber"}>portfolio: {p.portfolio_status}</Badge>
                  )}
                  {p.link && (
                    <a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                      <LinkIcon size={11} /> link
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Project" : "Project Baru"}>
        <form onSubmit={save} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <Field label="Nama Project">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kuliah / Personal / Community" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label="Target Date">
              <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Related Skill">
              <Input value={form.related_skill} onChange={(e) => setForm({ ...form, related_skill: e.target.value })} />
            </Field>
            <Field label="Related Course">
              <Input value={form.related_course} onChange={(e) => setForm({ ...form, related_course: e.target.value })} />
            </Field>
          </div>
          <Field label="Link / Files">
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Field label="Portfolio Status">
            <Select value={form.portfolio_status} onChange={(e) => setForm({ ...form, portfolio_status: e.target.value as PortfolioStatus })}>
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
    </div>
  );
}
