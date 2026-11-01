"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, EmptyState, Field, Input, Modal, Textarea } from "@/components/ui";
import type { LectureNote, Course } from "@/lib/types";
import { Plus, Pencil, Trash2, Search, BookOpen, ExternalLink } from "lucide-react";
import { sanitizeUrl } from "@/lib/utils";

const emptyForm = {
  id: "" as string | null,
  course: "",
  course_id: "" as string | null,
  meeting_number: "",
  note_date: "",
  topic: "",
  key_concepts: "",
  notes: "",
  unclear_points: "",
  conclusion: "",
  link: "",
};

export default function AcademicNotesTab({ courses }: { courses: Course[] }) {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<LectureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("lecture_notes")
      .select("*")
      .order("note_date", { ascending: false, nullsFirst: false });

    if (currentSemesterId) {
      query = query.eq("semester_id", currentSemesterId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error loading notes:", error);
      alert(`Gagal memuat catatan: ${error.message}`);
      setItems([]);
    } else {
      setItems((data as LectureNote[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return items.filter((n) => {
      if (selectedCourseFilter && n.course_id !== selectedCourseFilter && n.course !== selectedCourseFilter) {
        return false;
      }
      return (
        n.course.toLowerCase().includes(term) ||
        (n.topic ?? "").toLowerCase().includes(term) ||
        (n.notes ?? "").toLowerCase().includes(term) ||
        (n.key_concepts ?? "").toLowerCase().includes(term)
      );
    });
  }, [items, q, selectedCourseFilter]);

  function openCreate() {
    const defaultCourse = courses[0];
    setForm({
      ...emptyForm,
      course: defaultCourse?.name ?? "",
      course_id: defaultCourse?.id ?? null,
      note_date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  }

  function openEdit(n: LectureNote) {
    setForm({
      id: n.id,
      course: n.course,
      course_id: n.course_id ?? null,
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
      course: form.course.trim(),
      course_id: form.course_id || null,
      meeting_number: form.meeting_number ? Number(form.meeting_number) : null,
      note_date: form.note_date || null,
      topic: form.topic ? form.topic.trim() : null,
      key_concepts: form.key_concepts ? form.key_concepts.trim() : null,
      notes: form.notes ? form.notes.trim() : null,
      unclear_points: form.unclear_points ? form.unclear_points.trim() : null,
      conclusion: form.conclusion ? form.conclusion.trim() : null,
      link: form.link ? form.link.trim() : null,
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari konsep, topik, materi..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          {courses.length > 0 && (
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-700"
            >
              <option value="">Semua Mata Kuliah</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || "No Code"})
                </option>
              ))}
            </select>
          )}
        </div>

        <Button onClick={openCreate} className="shrink-0">
          <Plus size={15} /> Buat Catatan Kuliah
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 py-6 text-center">Memuat catatan...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Belum ada catatan kuliah. Rangkum konsep kunci per pertemuan untuk memperkuat retensi belajar." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((n) => {
            const courseObj = courses.find((c) => c.id === n.course_id);
            const safeLink = sanitizeUrl(n.link);

            return (
              <Card key={n.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-2.5 mb-2.5">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        <BookOpen size={12} />
                        {courseObj?.name ?? n.course}
                      </span>
                      {n.meeting_number && (
                        <span className="ml-2 text-xs font-medium text-zinc-500">
                          Pertemuan ke-{n.meeting_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(n)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(n.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {n.topic && (
                    <h4 className="text-sm font-semibold text-zinc-900 mb-1.5">
                      {n.topic}
                    </h4>
                  )}

                  {n.key_concepts && (
                    <div className="mb-2 rounded-md bg-zinc-50 p-2 text-xs text-zinc-700 border border-zinc-100">
                      <p className="font-semibold text-zinc-800 text-[11px] mb-0.5">Konsep Kunci:</p>
                      <p className="line-clamp-3 whitespace-pre-wrap">{n.key_concepts}</p>
                    </div>
                  )}

                  {n.notes && (
                    <p className="text-xs text-zinc-600 line-clamp-4 whitespace-pre-wrap mb-2">
                      {n.notes}
                    </p>
                  )}

                  {n.unclear_points && (
                    <div className="mt-2 rounded-md bg-amber-50/70 p-2 text-xs text-amber-900 border border-amber-200/50">
                      <span className="font-semibold text-[11px]">Belum Paham: </span>
                      <span className="line-clamp-2">{n.unclear_points}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px] text-zinc-400">
                  <span>{n.note_date ?? "Tanpa tanggal"}</span>
                  {safeLink && (
                    <a
                      href={safeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                    >
                      <ExternalLink size={12} /> Materi / Tautan
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Form Catatan Kuliah */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Catatan Kuliah" : "Catatan Kuliah Baru"}>
        <form onSubmit={save} className="max-h-[75vh] space-y-3.5 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mata Kuliah">
              {courses.length > 0 ? (
                <select
                  value={form.course_id ?? ""}
                  onChange={(e) => {
                    const cid = e.target.value;
                    const c = courses.find((x) => x.id === cid);
                    setForm({
                      ...form,
                      course_id: cid || null,
                      course: c ? c.name : form.course,
                    });
                  }}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Pilih Mata Kuliah...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || "Tanpa Kode"})
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  required
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                  placeholder="Nama Mata Kuliah"
                />
              )}
            </Field>

            <Field label="Pertemuan Ke-">
              <Input
                type="number"
                min="1"
                max="20"
                value={form.meeting_number}
                onChange={(e) => setForm({ ...form, meeting_number: e.target.value })}
                placeholder="1..14"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal Pertemuan">
              <Input
                type="date"
                value={form.note_date}
                onChange={(e) => setForm({ ...form, note_date: e.target.value })}
              />
            </Field>
            <Field label="Topik / Pembahasan">
              <Input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="Topik perkuliahan hari ini"
              />
            </Field>
          </div>

          <Field label="Konsep Kunci / Pemahaman Pribadi">
            <Textarea
              rows={3}
              value={form.key_concepts}
              onChange={(e) => setForm({ ...form, key_concepts: e.target.value })}
              placeholder="Intisari atau konsep terpenting yang dipahami..."
            />
          </Field>

          <Field label="Catatan Lengkap & Ringkasan">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Rangkuman detail pembahasan..."
            />
          </Field>

          <Field label="Hal yang Belum Dipahami (Actionable Doubt)">
            <Input
              value={form.unclear_points}
              onChange={(e) => setForm({ ...form, unclear_points: e.target.value })}
              placeholder="Poin yang perlu ditanyakan ke dosen atau teman..."
            />
          </Field>

          <Field label="Kesimpulan Singkat">
            <Input
              value={form.conclusion}
              onChange={(e) => setForm({ ...form, conclusion: e.target.value })}
              placeholder="Takeaway atau benang merah pertemuan ini"
            />
          </Field>

          <Field label="Tautan Pendukung / Slide / LMS">
            <Input
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Catatan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
