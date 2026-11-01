"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, Field, Modal, Textarea } from "@/components/ui";
import type { MonthlyReview } from "@/lib/types";
import { getMonthStart, formatMonthLabel } from "@/lib/date";
import {
  Plus,
  Pencil,
  BookOpen,
  AlertTriangle,
  Target,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";

const emptyMonthly = {
  id: "" as string | null,
  month_start: getMonthStart(new Date()),
  academic_done: "",
  academic_pending: "",
  academic_unclear: "",
  learning_summary: "",
  project_progress: "",
  problems: "",
  improvements: "",
  next_focus: "",
};

export default function MonthlyReviewTab() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<MonthlyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyMonthly);

  const [selectedMonthStart, setSelectedMonthStart] = useState(() =>
    getMonthStart(new Date())
  );

  const selectedYear = Number(selectedMonthStart.slice(0, 4));
  const selectedMonth = Number(selectedMonthStart.slice(5, 7));

  const monthOptions = [
    { value: 1, label: "Januari" },
    { value: 2, label: "Februari" },
    { value: 3, label: "Maret" },
    { value: 4, label: "April" },
    { value: 5, label: "Mei" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "Agustus" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Desember" },
  ];

  const yearOptions = Array.from(
    { length: 7 },
    (_, index) => new Date().getFullYear() - 3 + index
  );

  const selectedReview = items.find(
    (item) => item.month_start === selectedMonthStart
  );

  async function load() {
    setLoading(true);

    let query = supabase
      .from("monthly_reviews")
      .select("*")
      .order("month_start", { ascending: false });

    if (currentSemesterId) {
      query = query.eq("semester_id", currentSemesterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Gagal memuat Monthly Review:", error);
      alert(`Gagal memuat Monthly Review: ${error.message}`);
      setItems([]);
    } else {
      setItems((data as MonthlyReview[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  function openCreate() {
    setForm({
      ...emptyMonthly,
      month_start: selectedMonthStart,
    });
    setModalOpen(true);
  }

  function openEdit(item: MonthlyReview) {
    setForm({
      id: item.id,
      month_start: item.month_start,
      academic_done: item.academic_done ?? "",
      academic_pending: item.academic_pending ?? "",
      academic_unclear: item.academic_unclear ?? "",
      learning_summary: item.learning_summary ?? "",
      project_progress: item.project_progress ?? "",
      problems: item.problems ?? "",
      improvements: item.improvements ?? "",
      next_focus: item.next_focus ?? "",
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
        .from("monthly_reviews")
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

      const result = await supabase.from("monthly_reviews").upsert(
        {
          ...payload,
          user_id: user.id,
        },
        { onConflict: "user_id,month_start" }
      );

      error = result.error;
    }

    if (error) {
      console.error("Gagal menyimpan Monthly Review:", error);
      alert(`Gagal menyimpan Monthly Review: ${error.message}`);
      return;
    }

    setModalOpen(false);
    await load();
  }

  const currentMonthLabel = formatMonthLabel(selectedMonthStart);

  return (
    <div className="space-y-6">
      {/* 1. Header Horisontal (Pilih Bulan + Tombol Review) */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-zinc-700">
            Pilih Bulan Evaluasi
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const month = Number(e.target.value);
                setSelectedMonthStart(
                  `${selectedYear}-${String(month).padStart(2, "0")}-01`
                );
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden"
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => {
                const year = Number(e.target.value);
                setSelectedMonthStart(
                  `${year}-${String(selectedMonth).padStart(2, "0")}-01`
                );
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 shadow-2xs focus:border-indigo-500 focus:outline-hidden"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={openCreate} className="shrink-0">
          <Plus size={15} /> Review Bulan Ini
        </Button>
      </div>

      {/* 2. Open Debrief Board / Empty State */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-6">Memuat review bulanan...</p>
      ) : !selectedReview ? (
        /* Empty State Mengajak */
        <Card className="!p-8 text-center border-dashed border-2 border-zinc-200 bg-zinc-50/50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
            <Calendar size={22} />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">
            Bulan {currentMonthLabel} belum dievaluasi
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
            Luangkan waktu sejenak untuk meninjau capaian sebulan, mengidentifikasi
            kendala perkuliahan, dan mengunci komitmen serta fokus bulan berikutnya.
          </p>
          <div className="mt-4">
            <Button onClick={openCreate}>
              <Sparkles size={14} /> Buat Review Sekarang
            </Button>
          </div>
        </Card>
      ) : (
        /* Open Debrief Board Bulanan Lengkap */
        <Card className="!p-6 space-y-6 border-zinc-200 bg-white shadow-xs">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={13} /> Evaluasi Bulanan Selesai
                </span>
                <span className="text-xs text-zinc-400">•</span>
                <span className="text-xs text-zinc-500 font-medium">
                  Periode: {currentMonthLabel}
                </span>
              </div>
              <h2 className="mt-1 text-base font-bold text-zinc-900">
                Laporan Refleksi Bulanan: {currentMonthLabel}
              </h2>
            </div>

            <Button
              variant="secondary"
              onClick={() => openEdit(selectedReview)}
              className="shrink-0 !text-xs !py-1.5"
            >
              <Pencil size={13} /> Edit Review Bulanan
            </Button>
          </div>

          {/* 3 Bagian Terstruktur Bulanan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bagian 1: Capaian Akademik Sebulan */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-indigo-800">
                <BookOpen size={18} className="shrink-0 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Capaian Akademik Sebulan
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-700 block mb-0.5">
                    Hasil & Pemahaman Materi:
                  </span>
                  <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {selectedReview.academic_done || (
                      <span className="text-zinc-400 italic">
                        Belum dicatat.
                      </span>
                    )}
                  </p>
                </div>

                {selectedReview.learning_summary && (
                  <div className="pt-2 border-t border-indigo-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Ringkasan Belajar Mandiri:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedReview.learning_summary}
                    </p>
                  </div>
                )}

                {selectedReview.project_progress && (
                  <div className="pt-2 border-t border-indigo-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Progres Proyek / Portofolio:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedReview.project_progress}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 2: Evaluasi Kendala & Peningkatan */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertTriangle size={18} className="shrink-0 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Kendala & Perbaikan Diri
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-700 block mb-0.5">
                    Hambatan & Kendala:
                  </span>
                  <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {selectedReview.problems || (
                      <span className="text-zinc-400 italic">
                        Tidak ada hambatan signifikan.
                      </span>
                    )}
                  </p>
                </div>

                {selectedReview.improvements && (
                  <div className="pt-2 border-t border-amber-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Rencana Solusi & Perbaikan:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedReview.improvements}
                    </p>
                  </div>
                )}

                {selectedReview.academic_unclear && (
                  <div className="pt-2 border-t border-amber-100/60">
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Materi Belum Terkuasai:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedReview.academic_unclear}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bagian 3: Komitmen & Fokus Bulan Depan */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <Target size={18} className="shrink-0 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Komitmen & Fokus Depan
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-zinc-700 block mb-0.5">
                    Target Utama Bulan Berikutnya:
                  </span>
                  <p className="text-zinc-800 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedReview.next_focus || (
                      <span className="text-zinc-400 italic">
                        Belum menentukan target.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Modal Form: Alur Terstruktur Bulanan */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Evaluasi Bulanan (Monthly Review)"
      >
        <form
          onSubmit={save}
          className="max-h-[75vh] space-y-4 overflow-y-auto pr-1"
        >
          <Field label="Bulan Evaluasi">
            <input
              type="month"
              value={form.month_start.slice(0, 7)}
              onChange={(e) =>
                setForm({
                  ...form,
                  month_start: `${e.target.value}-01`,
                })
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </Field>

          {/* FASE 1: Capaian Akademik Sebulan */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                1
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Capaian Akademik Sebulan
              </p>
            </div>

            <Field label="Pencapaian Kuliah & Materi yang Berhasil Dikuasai">
              <Textarea
                rows={3}
                value={form.academic_done}
                onChange={(e) =>
                  setForm({ ...form, academic_done: e.target.value })
                }
                placeholder="Materi yang sudah tuntas, kuis/UTS yang terlampaui..."
              />
            </Field>

            <Field label="Ringkasan Belajar Mandiri & Skill Baru">
              <Textarea
                rows={2}
                value={form.learning_summary}
                onChange={(e) =>
                  setForm({ ...form, learning_summary: e.target.value })
                }
                placeholder="Teknologi baru yang dipelajari, sertifikasi, buku yang dibaca..."
              />
            </Field>

            <Field label="Progres Proyek / Portofolio">
              <Textarea
                rows={2}
                value={form.project_progress}
                onChange={(e) =>
                  setForm({ ...form, project_progress: e.target.value })
                }
                placeholder="Fitur atau repositori yang berhasil diselesaikan..."
              />
            </Field>
          </div>

          {/* FASE 2: Hambatan & Perbaikan */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-bold text-white">
                2
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Evaluasi Hambatan & Solusi
              </p>
            </div>

            <Field label="Kendala & Masalah yang Dihadapi">
              <Textarea
                rows={2}
                value={form.problems}
                onChange={(e) =>
                  setForm({ ...form, problems: e.target.value })
                }
                placeholder="Manajemen waktu, materi dosen yang terlalu cepat, prokrastinasi..."
              />
            </Field>

            <Field label="Langkah Perbaikan / Strategi Pemecahan">
              <Textarea
                rows={2}
                value={form.improvements}
                onChange={(e) =>
                  setForm({ ...form, improvements: e.target.value })
                }
                placeholder="Solusi konkret: belajar kelompok, tanya asdos, blok fokus pagi hari..."
              />
            </Field>

            <Field label="Materi yang Masih Belum Jelas (Opsional)">
              <Textarea
                rows={2}
                value={form.academic_unclear}
                onChange={(e) =>
                  setForm({ ...form, academic_unclear: e.target.value })
                }
                placeholder="Konsep yang perlu di-review ulang..."
              />
            </Field>
          </div>

          {/* FASE 3: Komitmen Bulan Depan */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                3
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Komitmen & Fokus Bulan Depan
              </p>
            </div>

            <Field label="Target Kunci & Fokus Prioritas Bulan Depan">
              <Textarea
                rows={3}
                value={form.next_focus}
                onChange={(e) =>
                  setForm({ ...form, next_focus: e.target.value })
                }
                placeholder="Target nilai UTS/UAS, menyelesaikan mini project, bimbingan DPA..."
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
            <Button type="submit">Simpan Review Bulanan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
