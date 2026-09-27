"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import type { LearningItem, LearningStatus } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

const STATUSES: { id: LearningStatus; label: string; color: "zinc" | "indigo" | "amber" | "emerald" }[] = [
  { id: "planned", label: "Planned", color: "zinc" },
  { id: "learning", label: "Learning", color: "indigo" },
  { id: "paused", label: "Paused", color: "amber" },
  { id: "completed", label: "Completed", color: "emerald" },
];

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

export default function LearningPage() {
  const supabase = createClient();
  const [items, setItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("learning_items").select("*").order("created_at", { ascending: false });
    setItems((data as LearningItem[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
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
      skill_topic: form.skill_topic,
      goal: form.goal || null,
      reason: form.reason || null,
      status: form.status,
      progress: Number(form.progress) || 0,
      resources: form.resources || null,
      notes: form.notes || null,
      start_date: form.start_date || null,
      target_date: form.target_date || null,
      completed_date: form.status === "completed" ? new Date().toISOString().slice(0, 10) : null,
    };
    if (form.id) {
      await supabase.from("learning_items").update(payload).eq("id", form.id);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("learning_items").insert({ ...payload, user_id: userData.user!.id });
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus item ini?")) return;
    await supabase.from("learning_items").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <PageHeader
        title="Self-Learning"
        description="Apa yang sedang dipelajari, mengapa, dan bagaimana perkembangannya."
        action={
          <Button onClick={openCreate}>
            <Plus size={15} /> Learning Baru
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
        <EmptyState text="Belum ada self-learning item." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((i) => {
            const s = STATUSES.find((x) => x.id === i.status)!;
            return (
              <Card key={i.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{i.skill_topic}</p>
                    {i.goal && <p className="text-xs text-zinc-500">{i.goal}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openEdit(i)} className="text-zinc-400 hover:text-zinc-700">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => remove(i.id)} className="text-zinc-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge color={s.color}>{s.label}</Badge>
                  <div className="h-1.5 flex-1 rounded-full bg-zinc-100">
                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${i.progress}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400">{i.progress}%</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Learning" : "Learning Baru"}>
        <form onSubmit={save} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <Field label="Skill / Topic">
            <Input value={form.skill_topic} onChange={(e) => setForm({ ...form, skill_topic: e.target.value })} required />
          </Field>
          <Field label="Goal">
            <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </Field>
          <Field label="Reason / Purpose">
            <Textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
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
            <Field label="Progress (%)">
              <Input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
            </Field>
          </div>
          <Field label="Resources">
            <Textarea rows={2} value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} placeholder="Link kursus, buku, dsb." />
          </Field>
          <Field label="Notes">
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label="Target Date">
              <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </Field>
          </div>
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
