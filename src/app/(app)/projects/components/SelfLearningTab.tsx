"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import type { LearningItem, LearningStatus } from "@/lib/types";
import { formatLocalDateKey } from "@/lib/date";
import { Plus, Pencil, Trash2 } from "lucide-react";

const STATUSES: { id: LearningStatus; label: string; color: "zinc" | "indigo" | "amber" | "emerald" }[] = [
  { id: "planned", label: "Planned", color: "zinc" },
  { id: "learning", label: "Learning", color: "indigo" },
  { id: "paused", label: "Paused", color: "amber" },
  { id: "completed", label: "Completed", color: "emerald" },
];

function fmtLearningDate(d: string | null) {
  if (!d) return "—";

  return new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const emptyForm = {
  id: "" as string | null,
  skill_topic: "",
  goal: "",
  reason: "",
  status: "planned" as LearningStatus,
  progress: "0",
  resources: "",
  notes: "",
  start_date: "",
  target_date: "",
};

export default function SelfLearningTab() {
  const supabase = createClient();
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("learning_items").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Gagal memuat learning items:", error);
    }
    setItems((data as LearningItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = statusFilter ? items.filter((i) => i.status === statusFilter) : items;

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(i: LearningItem) {
    setForm({
      id: i.id,
      skill_topic: i.skill_topic,
      goal: i.goal ?? "",
      reason: i.reason ?? "",
      status: i.status,
      progress: i.progress.toString(),
      resources: i.resources ?? "",
      notes: i.notes ?? "",
      start_date: i.start_date ?? "",
      target_date: i.target_date ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      skill_topic: form.skill_topic.trim(),
      goal: form.goal ? form.goal.trim() : null,
      reason: form.reason ? form.reason.trim() : null,
      status: form.status,
      progress: Number(form.progress) || 0,
      resources: form.resources ? form.resources.trim() : null,
      notes: form.notes ? form.notes.trim() : null,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      completed_date: form.status === "completed" ? formatLocalDateKey(new Date()) : null,
    };
    if (form.id) {
      const { error } = await supabase.from("learning_items").update(payload).eq("id", form.id);
      if (error) {
        alert(`Gagal memperbarui learning item: ${error.message}`);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }
      const { error } = await supabase.from("learning_items").insert({ ...payload, user_id: user.id });
      if (error) {
        alert(`Gagal menambahkan learning item: ${error.message}`);
        return;
      }
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus item ini?")) return;
    const { error } = await supabase.from("learning_items").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus learning item: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
          <option value="">Semua Status</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>

        <Button onClick={openCreate} className="shrink-0">
          <Plus size={15} /> Learning Item Baru
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 py-8 text-center">Memuat self-learning items...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Belum ada target self-learning. Tentukan skill yang ingin dikuasai di luar kurikulum kelas." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{item.skill_topic}</p>
                  <Badge color={STATUSES.find((s) => s.id === item.status)?.color}>{item.status}</Badge>
                </div>

                {item.goal && <p className="mt-1 text-xs text-zinc-600 line-clamp-2">{item.goal}</p>}
                {item.reason && <p className="mt-1 text-xs italic text-zinc-400">Why: {item.reason}</p>}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
                    <span>Progress</span>
                    <span className="font-semibold text-zinc-700">{item.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-[11px] text-zinc-400">
                  {item.resources && <p className="truncate">Sumber: {item.resources}</p>}
                  <p>Mulai: {fmtLearningDate(item.start_date)} • Target: {fmtLearningDate(item.target_date)}</p>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-1 border-t border-zinc-100 pt-2">
                <button
                  onClick={() => openEdit(item)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Self-Learning Form */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Self-Learning" : "Self-Learning Baru"}>
        <form onSubmit={save} className="max-h-[75vh] space-y-3.5 overflow-y-auto pr-1">
          <Field label="Skill / Topik">
            <Input
              required
              value={form.skill_topic}
              onChange={(e) => setForm({ ...form, skill_topic: e.target.value })}
              placeholder="e.g. Next.js App Router, Docker, Go"
            />
          </Field>
          <Field label="Goal / Target Konkret">
            <Input
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="e.g. Membangun 1 REST API production-ready"
            />
          </Field>
          <Field label="Alasan / Motivasi">
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Dibutuhkan untuk project magang"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LearningStatus })}>
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Progress (${form.progress}%)`}>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => setForm({ ...form, progress: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Resources / Sumber Belajar">
            <Input
              value={form.resources}
              onChange={(e) => setForm({ ...form, resources: e.target.value })}
              placeholder="e.g. Docs resmi, Kursus Udemy"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Mulai">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
            <Field label="Target Selesai">
              <Input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Catatan Tambahan">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Learning
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
