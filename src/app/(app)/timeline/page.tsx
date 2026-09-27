"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import type { AcademicEvent } from "@/lib/types";
import { Plus, Pencil, Trash2 } from "lucide-react";

const TYPES = ["UTS", "UAS", "KRS", "Pembayaran", "Libur", "Administratif", "Lainnya"];

const emptyForm = {
  id: "" as string | null,
  name: "",
  type: "Lainnya",
  start_date: "",
  end_date: "",
  notes: "",
  source_link: "",
};

export default function TimelinePage() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    let query = supabase.from("academic_events").select("*").order("start_date", { ascending: true });
    if (currentSemesterId) query = query.eq("semester_id", currentSemesterId);
    const { data } = await query;
    setItems((data as AcademicEvent[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(ev: AcademicEvent) {
    setForm({
      id: ev.id,
      name: ev.name,
      type: ev.type,
      start_date: ev.start_date,
      end_date: ev.end_date ?? "",
      notes: ev.notes ?? "",
      source_link: ev.source_link ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      type: form.type,
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
      source_link: form.source_link || null,
      semester_id: currentSemesterId,
    };
    if (form.id) {
      await supabase.from("academic_events").update(payload).eq("id", form.id);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("academic_events").insert({ ...payload, user_id: userData.user!.id });
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus event ini?")) return;
    await supabase.from("academic_events").delete().eq("id", id);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Academic Timeline"
        description="Milestone akademik penting — bukan jadwal kuliah harian."
        action={
          <Button onClick={openCreate}>
            <Plus size={15} /> Event Baru
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : items.length === 0 ? (
        <EmptyState text="Belum ada milestone akademik." />
      ) : (
        <div className="relative space-y-2 border-l-2 border-zinc-100 pl-5">
          {items.map((ev) => {
            const past = ev.end_date ? ev.end_date < today : ev.start_date < today;
            return (
              <div key={ev.id} className="relative">
                <span
                  className={`absolute -left-[27px] top-3 h-2.5 w-2.5 rounded-full border-2 border-white ${
                    past ? "bg-zinc-300" : "bg-indigo-500"
                  }`}
                />
                <Card className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900">{ev.name}</p>
                      <Badge color={past ? "zinc" : "indigo"}>{ev.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {ev.start_date}
                      {ev.end_date ? ` — ${ev.end_date}` : ""}
                    </p>
                    {ev.notes && <p className="mt-1 text-xs text-zinc-600">{ev.notes}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openEdit(ev)} className="text-zinc-400 hover:text-zinc-700">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => remove(ev.id)} className="text-zinc-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Event" : "Event Baru"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Nama Event">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </Field>
            <Field label="End Date (opsional)">
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Field label="Source / Link">
            <Input value={form.source_link} onChange={(e) => setForm({ ...form, source_link: e.target.value })} placeholder="https://..." />
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
