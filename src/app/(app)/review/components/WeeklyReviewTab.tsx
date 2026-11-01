"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, Field, Modal, Textarea } from "@/components/ui";
import type { WeeklyReview } from "@/lib/types";
import { getMondayOfWeek } from "@/lib/date";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Plus,
  Pencil,
  Trophy,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

const emptyWeekly = {
  id: "" as string | null,
  week_start: getMondayOfWeek(new Date()),
  academic_done: "",
  academic_pending: "",
  academic_unclear: "",
  task_open: "",
  task_next_deadline: "",
  learning_what: "",
  learning_progress: "",
  project_progress: "",
  project_blocked: "",
  next_priorities: "",
  next_improve: "",
};

export default function WeeklyReviewTab() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyWeekly);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    getMondayOfWeek(new Date())
  );

  const selectedWeek = items.find(
    (item) => item.week_start === selectedWeekStart
  );

  async function load() {
    setLoading(true);

    let query = supabase
      .from("weekly_reviews")
      .select("*")
      .order("week_start", { ascending: false });

    if (currentSemesterId) {
      query = query.eq("semester_id", currentSemesterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Gagal memuat Weekly Review:", error);
      alert(`Gagal memuat Weekly Review: ${error.message}`);
      setItems([]);
    } else {
      setItems((data as WeeklyReview[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  function openCreate() {
    setForm({ ...emptyWeekly, week_start: selectedWeekStart });
    setModalOpen(true);
  }

  function openEdit(w: WeeklyReview) {
    setForm({
      id: w.id,
      week_start: w.week_start,
      academic_done: w.academic_done ?? "",
      academic_pending: w.academic_pending ?? "",
      academic_unclear: w.academic_unclear ?? "",
      task_open: w.task_open ?? "",
      task_next_deadline: w.task_next_deadline ?? "",
      learning_what: w.learning_what ?? "",
      learning_progress: w.learning_progress ?? "",
      project_progress: w.project_progress ?? "",
      project_blocked: w.project_blocked ?? "",
      next_priorities: w.next_priorities ?? "",
      next_improve: w.next_improve ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    if (!currentSemesterId) {
      alert("Pilih semester terlebih dahulu di sidebar/header.");
      return;
    }

    const payload = {
      ...form,
      semester_id: currentSemesterId,
    };

    delete (payload as Record<string, unknown>).id;

    let error = null;

    if (form.id) {
      const result = await supabase
        .from("weekly_reviews")
        .update(payload)
        .eq("id", form.id);

      error = result.error;
    } else {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert(
          `Gagal mendapatkan user: ${
            userError?.message ?? "User tidak ditemukan."
          }`
        );
        return;
      }

      const result = await supabase.from("weekly_reviews").upsert(
        {
          ...payload,
          user_id: user.id,
        },
        { onConflict: "user_id,week_start" }
      );

      error = result.error;
    }

    if (error) {
      console.error("Gagal menyimpan Weekly Review:", error);
      alert(`Gagal menyimpan Weekly Review: ${error.message}`);
      return;
    }

    setModalOpen(false);
    await load();
  }

  // Format tanggal display
  const weekDateObj = new Date(`${selectedWeekStart}T00:00:00`);
  const formattedWeekLabel = !isNaN(weekDateObj.getTime())
    ? format(weekDateObj, "EEEE, d MMMM yyyy", { locale: idLocale })
    : selectedWeekStart;

  return (
    <div className="space-y-6">
      {/* 1. Perataan Horizontal Header (Pilih Minggu + Tombol Aksi) */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-700">
            Pilih Minggu Evaluasi
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedWeekStart}
              onChange={(e) => {
                if (!e.target.value) return;
                setSelectedWeekStart(
                  getMondayOfWeek(new Date(`${e.target.value}T00:00:00`))
                );
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden"
            />
            <span className="hidden sm:inline text-xs text-zinc-400">
              (Senin: {selectedWeekStart})
            </span>
          </div>
        </div>

        <Button onClick={openCreate} className="shrink-0">
          <Plus size={15} /> Review Minggu Ini
        </Button>
      </div>

      {/* 2. Open Debrief Board / Empty State */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-6">Memuat review mingguan...</p>
      ) : !selectedWeek ? (
        /* Desain Empty State Mengajak */
        <Card className="!p-8 text-center border-dashed border-2 border-zinc-200 bg-zinc-50/50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <Clock size={22} />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">
            Minggu ini belum dievaluasi
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
            Luangkan 5 menit untuk mencatat keberhasilan belajar, mengurai
            hambatan materi, dan mengunci top prioritas minggu depan.
          </p>
          <div className="mt-4">
            <Button onClick={openCreate}>
              <Sparkles size={14} /> Buat Review Sekarang
            </Button>
          </div>
        </Card>
      ) : (
        /* Open Debrief Board: Presentasi Lengkap 3 Bagian */
        <Card className="!p-6 space-y-6 border-zinc-200 bg-white shadow-xs">
          {/* Header Kartu Review */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={13} /> Review Tersimpan
                </span>
                <span className="text-xs text-zinc-400">•</span>
                <span className="text-xs text-zinc-500 font-medium">
                  Minggu dimulai: {selectedWeek.week_start}
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold text-zinc-900 capitalize">
                Laporan Refleksi: {formattedWeekLabel}
              </h2>
            </div>

            <Button
              variant="secondary"
              onClick={() => openEdit(selectedWeek)}
              className="shrink-0 !text-xs !py-1.5"
            >
              <Pencil size={13} /> Edit Review
            </Button>
          </div>

          {/* 3 Bagian Terstruktur Open Debrief Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bagian 1: Capaian & Keberhasilan */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <Trophy size={18} className="shrink-0 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Capaian & Keberhasilan
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-700 block mb-0.5">
                    Tugas & Materi yang Tuntas:
                  </span>
                  <p className="text-zinc-600 whitespace-pre-wrap leading-relaxed">
                    {selectedWeek.academic_done || (
                      <span className="text-zinc-400 italic">
                        Tidak ada catatan capaian.
                      </span>
                    )}
                  </p>
                </div>

                {selectedWeek.project_progress && (
                  <div className="pt-2 border-t border-emerald-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Progres Proyek:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedWeek.project_progress}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 2: Hambatan & Titik Bingung */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Hambatan & Titik Bingung
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-700 block mb-0.5">
                    Materi Belum Dipahami:
                  </span>
                  <p className="text-zinc-600 whitespace-pre-wrap leading-relaxed">
                    {selectedWeek.academic_unclear || (
                      <span className="text-zinc-400 italic">
                        Semua materi teratasi dengan baik.
                      </span>
                    )}
                  </p>
                </div>

                {selectedWeek.academic_pending && (
                  <div className="pt-2 border-t border-amber-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Tugas / Hal Tertunda:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedWeek.academic_pending}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 3: Kompas & Prioritas Minggu Depan */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-800">
                <Compass size={18} className="shrink-0 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Kompas & Prioritas Depan
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-700 block mb-0.5">
                    Top Prioritas Minggu Depan:
                  </span>
                  <p className="text-zinc-800 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedWeek.next_priorities || (
                      <span className="text-zinc-400 italic">
                        Belum menentukan prioritas.
                      </span>
                    )}
                  </p>
                </div>

                {selectedWeek.next_improve && (
                  <div className="pt-2 border-t border-indigo-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Rencana Perbaikan Diri:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedWeek.next_improve}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Modal Form: Alur Refleksi Alami 3-Fase */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Refleksi Mingguan (Weekly Debrief)"
      >
        <form
          onSubmit={save}
          className="max-h-[75vh] space-y-5 overflow-y-auto pr-1"
        >
          {/* Pemilihan Tanggal Minggu */}
          <Field label="Minggu Mulai (Setiap Hari Senin)">
            <input
              type="date"
              value={form.week_start}
              onChange={(e) =>
                setForm({ ...form, week_start: e.target.value })
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </Field>

          {/* FASE 1: Kemenangan & Capaian */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                1
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Fase 1: Kemenangan & Capaian Minggu Ini
              </p>
            </div>
            <p className="text-[11px] text-zinc-500">
              Apa saja tugas yang berhasil diselesaikan, kuis yang terlewati,
              dan konsep materi perkuliahan yang berhasil dikuasai?
            </p>

            <Field label="Tugas Tuntas & Materi yang Dikuasai">
              <Textarea
                rows={3}
                value={form.academic_done}
                onChange={(e) =>
                  setForm({ ...form, academic_done: e.target.value })
                }
                placeholder="Contoh: Tugas Praktikum Basis Data tuntas, materi Normalisasi 3NF sudah paham..."
              />
            </Field>

            <Field label="Progres Belajar Mandiri / Proyek (Opsional)">
              <Textarea
                rows={2}
                value={form.project_progress}
                onChange={(e) =>
                  setForm({ ...form, project_progress: e.target.value })
                }
                placeholder="Contoh: Menyelesaikan slicing UI halaman dashboard portofolio..."
              />
            </Field>
          </div>

          {/* FASE 2: Hambatan & Titik Bingung */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-bold text-white">
                2
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Fase 2: Hambatan & Titik Bingung
              </p>
            </div>
            <p className="text-[11px] text-zinc-500">
              Materi apa yang membingungkan atau butuh bantuan asdos/dosen, serta
              tugas apa yang masih tertunda?
            </p>

            <Field label="Materi Belum Dipahami / Perlu Konsultasi">
              <Textarea
                rows={2}
                value={form.academic_unclear}
                onChange={(e) =>
                  setForm({ ...form, academic_unclear: e.target.value })
                }
                placeholder="Contoh: Rumus query rekursif SQL dan implementasi B-Tree indeks..."
              />
            </Field>

            <Field label="Tugas Tertunda / Hal yang Menghambat">
              <Textarea
                rows={2}
                value={form.academic_pending}
                onChange={(e) =>
                  setForm({ ...form, academic_pending: e.target.value })
                }
                placeholder="Contoh: Proposal proyek web masih macet di pencarian referensi UMKM..."
              />
            </Field>
          </div>

          {/* FASE 3: Kompas & Top 3 Prioritas Minggu Depan */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                3
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Fase 3: Kompas & Prioritas Minggu Depan
              </p>
            </div>
            <p className="text-[11px] text-zinc-500">
              Kunci 3 hal paling penting yang wajib selesai di minggu depan dan
              kebiasaan belajar yang ingin diperbaiki.
            </p>

            <Field label="Top Prioritas Minggu Depan">
              <Textarea
                rows={3}
                value={form.next_priorities}
                onChange={(e) =>
                  setForm({ ...form, next_priorities: e.target.value })
                }
                placeholder="1. Selesaikan draf laporan praktikum sebelum Kamis&#10;2. Bimbingan perwalian DPA awal semester&#10;3. Review materi kalkulus bab turunan parsial"
              />
            </Field>

            <Field label="Hal yang Perlu Ditingkatkan / Komitmen Diri">
              <Textarea
                rows={2}
                value={form.next_improve}
                onChange={(e) =>
                  setForm({ ...form, next_improve: e.target.value })
                }
                placeholder="Contoh: Jangan menunda submit E-Learning hingga jam 23.00 malam..."
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">Simpan Review Mingguan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
