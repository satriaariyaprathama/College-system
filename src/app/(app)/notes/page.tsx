"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Textarea } from "@/components/ui";
import type { LectureNote } from "@/lib/types";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

const emptyForm = {
  id: "" as string | null,
  course: "",
  meeting_number: "",
  note_date: "",
  topic: "",
  key_concepts: "",
  notes: "",
  unclear_points: "",
  conclusion: "",
  link: "",
};

export default function NotesPage() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    let query = supabase.from("lecture_notes").select("*").order("note_date", { ascending: false });
    if (currentSemesterId) query = query.eq("semester_id", currentSemesterId);
    const { data } = await query;
    setItems((data as LectureNote[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return items.filter(
      (n) =>
        n.course.toLowerCase().includes(term) ||
        (n.topic ?? "").toLowerCase().includes(term) ||
        (n.notes ?? "").toLowerCase().includes(term)
    );
  }, [items, q]);

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(n: LectureNote) {
    setForm({
      id: n.id,
      course: n.course,
      meeting_number: n.meeting_number?.toString() ?? "",
      note_date: n.note_date ?? "",
      topic: n.topic ?? "",
      key_concepts: n.key_concepts ?? "",
      notes: n.notes ?? "",
      unclear_points: n.unclear_points ?? "",
      conclusion: n.conclusion ?? "",
      link: n.link ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      course: form.course,
      meeting_number: form.meeting_number ? Number(form.meeting_number) : null,
      note_date: form.note_date || null,
      topic: form.topic || null,
      key_concepts: form.key_concepts || null,
      notes: form.notes || null,
      unclear_points: form.unclear_points || null,
      conclusion: form.conclusion || null,
      link: form.link || null,
      semester_id: currentSemesterId,
    };
    if (form.id) {
      const { error } = await supabase.from("lecture_notes").update(payload).eq("id", form.id);
      if (error) {
        alert(`Gagal memperbarui catatan: ${error.message}`);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }
      const { error } = await supabase.from("lecture_notes").insert({ ...payload, user_id: user.id });
      if (error) {
        alert(`Gagal menambahkan catatan: ${error.message}`);
        return;
      }
    }
    setModalOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    const { error } = await supabase.from("lecture_notes").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus catatan: ${error.message}`);
      return;
    }
    load();
  }

  return (
    <div>
      <PageHeader
        title="Lecture Notes / Knowledge"
        description="Pemahaman pribadi dari perkuliahan — bukan salinan materi dosen."
        action={
          <Button onClick={openCreate}>
            <Plus size={15} /> Catatan Baru
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="Cari mata kuliah / topik / isi..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Belum ada catatan." />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {n.course} {n.meeting_number ? `· Pertemuan ${n.meeting_number}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {n.topic || "-"} {n.note_date ? `· ${n.note_date}` : ""}
                  </p>
                  {n.notes && <p className="mt-1.5 line-clamp-2 text-xs text-zinc-600">{n.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(n)} className="text-zinc-400 hover:text-zinc-700">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(n.id)} className="text-zinc-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Catatan" : "Catatan Baru"}>
        <form onSubmit={save} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mata Kuliah">
              <Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required />
            </Field>
            <Field label="Pertemuan ke-">
              <Input type="number" value={form.meeting_number} onChange={(e) => setForm({ ...form, meeting_number: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <Input type="date" value={form.note_date} onChange={(e) => setForm({ ...form, note_date: e.target.value })} />
            </Field>
            <Field label="Topik">
              <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </Field>
          </div>
          <Field label="Konsep Penting">
            <Textarea rows={2} value={form.key_concepts} onChange={(e) => setForm({ ...form, key_concepts: e.target.value })} />
          </Field>
          <Field label="Catatan / Pemahaman Pribadi">
            <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <Field label="Hal yang Belum Dipahami">
            <Textarea rows={2} value={form.unclear_points} onChange={(e) => setForm({ ...form, unclear_points: e.target.value })} />
          </Field>
          <Field label="Kesimpulan">
            <Textarea rows={2} value={form.conclusion} onChange={(e) => setForm({ ...form, conclusion: e.target.value })} />
          </Field>
          <Field label="Attachment / Link">
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
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
