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
  Pencil,
  Trophy,
  AlertTriangle,
  Compass,
  Clock,
  Sparkles,
  Target,
  ClipboardList,
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

  // Dua modal terpisah
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

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

  // Open modal plan
  function openPlanModal() {
    setForm({
      id: selectedWeek?.id ?? null,
      week_start: selectedWeekStart,
      academic_done: selectedWeek?.academic_done ?? "",
      academic_pending: selectedWeek?.academic_pending ?? "",
      academic_unclear: selectedWeek?.academic_unclear ?? "",
      task_open: selectedWeek?.task_open ?? "",
      task_next_deadline: selectedWeek?.task_next_deadline ?? "",
      learning_what: selectedWeek?.learning_what ?? "",
      learning_progress: selectedWeek?.learning_progress ?? "",
      project_progress: selectedWeek?.project_progress ?? "",
      project_blocked: selectedWeek?.project_blocked ?? "",
      next_priorities: selectedWeek?.next_priorities ?? "",
      next_improve: selectedWeek?.next_improve ?? "",
    });
    setPlanModalOpen(true);
  }

  // Open modal review
  function openReviewModal() {
    setForm({
      id: selectedWeek?.id ?? null,
      week_start: selectedWeekStart,
      academic_done: selectedWeek?.academic_done ?? "",
      academic_pending: selectedWeek?.academic_pending ?? "",
      academic_unclear: selectedWeek?.academic_unclear ?? "",
      task_open: selectedWeek?.task_open ?? "",
      task_next_deadline: selectedWeek?.task_next_deadline ?? "",
      learning_what: selectedWeek?.learning_what ?? "",
      learning_progress: selectedWeek?.learning_progress ?? "",
      project_progress: selectedWeek?.project_progress ?? "",
      project_blocked: selectedWeek?.project_blocked ?? "",
      next_priorities: selectedWeek?.next_priorities ?? "",
      next_improve: selectedWeek?.next_improve ?? "",
    });
    setReviewModalOpen(true);
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSemesterId) {
      alert("Pilih semester terlebih dahulu di header.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("User tidak ditemukan atau sesi berakhir.");
      return;
    }

    const payload = {
      user_id: user.id,
      semester_id: currentSemesterId,
      week_start: selectedWeekStart,
      next_priorities: form.next_priorities.trim() || null,
      task_open: form.task_open.trim() || null,
      task_next_deadline: form.task_next_deadline.trim() || null,
      learning_what: form.learning_what.trim() || null,
      academic_done: selectedWeek?.academic_done ?? null,
      academic_pending: selectedWeek?.academic_pending ?? null,
      academic_unclear: selectedWeek?.academic_unclear ?? null,
      learning_progress: selectedWeek?.learning_progress ?? null,
      project_progress: selectedWeek?.project_progress ?? null,
      project_blocked: selectedWeek?.project_blocked ?? null,
      next_improve: selectedWeek?.next_improve ?? null,
    };

    const { error } = await supabase.from("weekly_reviews").upsert(payload, {
      onConflict: "user_id,week_start",
    });

    if (error) {
      alert(`Gagal menyimpan Rencana Mingguan: ${error.message}`);
      return;
    }

    setPlanModalOpen(false);
    await load();
  }

  async function saveReview(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSemesterId) {
      alert("Pilih semester terlebih dahulu di header.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("User tidak ditemukan atau sesi berakhir.");
      return;
    }

    const payload = {
      user_id: user.id,
      semester_id: currentSemesterId,
      week_start: selectedWeekStart,
      academic_done: form.academic_done.trim() || null,
      academic_unclear: form.academic_unclear.trim() || null,
      academic_pending: form.academic_pending.trim() || null,
      next_improve: form.next_improve.trim() || null,
      learning_progress: form.learning_progress.trim() || null,
      project_progress: form.project_progress.trim() || null,
      project_blocked: form.project_blocked.trim() || null,
      next_priorities: selectedWeek?.next_priorities ?? null,
      task_open: selectedWeek?.task_open ?? null,
      task_next_deadline: selectedWeek?.task_next_deadline ?? null,
      learning_what: selectedWeek?.learning_what ?? null,
    };

    const { error } = await supabase.from("weekly_reviews").upsert(payload, {
      onConflict: "user_id,week_start",
    });

    if (error) {
      alert(`Gagal menyimpan Review Mingguan: ${error.message}`);
      return;
    }

    setReviewModalOpen(false);
    await load();
  }

  // Format tanggal display
  const weekDateObj = new Date(`${selectedWeekStart}T00:00:00`);
  const formattedWeekLabel = !isNaN(weekDateObj.getTime())
    ? format(weekDateObj, "EEEE, d MMMM yyyy", { locale: idLocale })
    : selectedWeekStart;

  // Cek keberadaan konten spesifik (Content-Driven)
  const hasPriorities = Boolean(selectedWeek?.next_priorities?.trim());
  const hasTasks = Boolean(
    selectedWeek?.task_open?.trim() || selectedWeek?.task_next_deadline?.trim()
  );
  const hasLearning = Boolean(selectedWeek?.learning_what?.trim());
  const hasPlan = hasPriorities || hasTasks || hasLearning;

  const hasAcademicDone = Boolean(
    selectedWeek?.academic_done?.trim() ||
      selectedWeek?.learning_progress?.trim() ||
      selectedWeek?.project_progress?.trim()
  );
  const hasHambatan = Boolean(
    selectedWeek?.academic_unclear?.trim() ||
      selectedWeek?.academic_pending?.trim() ||
      selectedWeek?.project_blocked?.trim()
  );
  const hasImprove = Boolean(selectedWeek?.next_improve?.trim());
  const hasReview = hasAcademicDone || hasHambatan || hasImprove;

  return (
    <div className="space-y-6">
      {/* 1. Header Horisontal: Pilih Minggu + Dua Tombol Aksi Berdampingan */}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={openPlanModal}
            className="!text-xs !py-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Target size={14} className="text-indigo-600" /> Atur Rencana
          </Button>

          <Button
            onClick={openReviewModal}
            className="!text-xs !py-1.5"
          >
            <ClipboardList size={14} /> Tulis Review
          </Button>
        </div>
      </div>

      <div className="text-xs text-zinc-500 font-medium">
        Periode Minggu: <span className="text-zinc-800 font-semibold">{formattedWeekLabel}</span>
      </div>

      {/* 2. DUAL-PANEL LAYOUT (Berdampingan: Plan Kiri vs Review Kanan) */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-6">Memuat data mingguan...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ======================================================== */}
          {/* PANEL KIRI: 🎯 Weekly Plan (Target Awal Minggu - Senin)    */}
          {/* ======================================================== */}
          <Card className="!p-5 space-y-3.5 border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Target size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Weekly Plan (Target Awal Minggu)
                  </h3>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Disusun setiap Senin Pagi
                  </span>
                </div>
              </div>

              {hasPlan && (
                <button
                  onClick={openPlanModal}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                  title="Edit Rencana"
                >
                  <Pencil size={12} /> Edit Plan
                </button>
              )}
            </div>

            {!hasPlan ? (
              /* Compact Adaptive Empty State */
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <Target size={15} className="text-indigo-600" />
                  <span>Belum ada rencana minggu ini</span>
                </div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Kunci target dan prioritas awal minggu agar waktu belajar lebih terarah.
                </p>
                <div>
                  <Button
                    variant="secondary"
                    onClick={openPlanModal}
                    className="!text-xs !py-1"
                  >
                    <Sparkles size={12} /> + Buat Target Minggu Ini
                  </Button>
                </div>
              </div>
            ) : (
              /* Content-Driven Plan Display (Only Render Non-Empty Sections) */
              <div className="space-y-3 text-xs">
                {/* 1. Top Prioritas */}
                {hasPriorities && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                      <Compass size={14} className="text-indigo-600 shrink-0" />
                      <span>Top 3 Prioritas Utama</span>
                    </div>
                    <p className="text-zinc-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedWeek?.next_priorities}
                    </p>
                  </div>
                )}

                {/* 2. Target Tugas & Deadline */}
                {hasTasks && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-1.5">
                    <span className="font-semibold text-zinc-700 block">
                      Target Tugas & Deadline Kunci:
                    </span>
                    {selectedWeek?.task_open && (
                      <p className="text-zinc-600 whitespace-pre-wrap">
                        {selectedWeek.task_open}
                      </p>
                    )}
                    {selectedWeek?.task_next_deadline && (
                      <p className="text-[11px] text-amber-700 font-medium pt-1 border-t border-zinc-200/60">
                        ⏰ Deadline: {selectedWeek.task_next_deadline}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Belajar Mandiri & Materi */}
                {hasLearning && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-1">
                    <span className="font-semibold text-zinc-700 block">
                      Fokus Belajar Mandiri / Materi:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedWeek?.learning_what}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ======================================================== */}
          {/* PANEL KANAN: 📋 Weekly Review (Evaluasi Akhir - Minggu)   */}
          {/* ======================================================== */}
          <Card className="!p-5 space-y-3.5 border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <ClipboardList size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Weekly Review (Evaluasi Akhir Minggu)
                  </h3>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Disusun setiap Minggu Malam
                  </span>
                </div>
              </div>

              {hasReview && (
                <button
                  onClick={openReviewModal}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition"
                  title="Edit Review"
                >
                  <Pencil size={12} /> Edit Review
                </button>
              )}
            </div>

            {!hasReview ? (
              /* Compact Adaptive Empty State */
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <Clock size={15} className="text-emerald-600" />
                  <span>Review belum ditulis</span>
                </div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Bandingkan hasil riil dengan target di sebelah kiri untuk refleksi objektif.
                </p>
                <div>
                  <Button onClick={openReviewModal} className="!text-xs !py-1">
                    <Sparkles size={12} /> + Tulis Review Sekarang
                  </Button>
                </div>
              </div>
            ) : (
              /* Content-Driven Review Display (Only Render Non-Empty Sections) */
              <div className="space-y-3 text-xs">
                {/* 1. Capaian & Keberhasilan */}
                {hasAcademicDone && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <Trophy size={14} className="text-emerald-600 shrink-0" />
                      <span>Capaian & Kemenangan Minggu Ini</span>
                    </div>
                    {selectedWeek?.academic_done && (
                      <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {selectedWeek.academic_done}
                      </p>
                    )}
                    {(selectedWeek?.learning_progress ||
                      selectedWeek?.project_progress) && (
                      <p className="text-[11px] text-zinc-600 pt-1 border-t border-emerald-100">
                        {selectedWeek.learning_progress || selectedWeek.project_progress}
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Hambatan & Titik Bingung */}
                {hasHambatan && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <span>Hambatan & Materi Belum Paham</span>
                    </div>
                    {selectedWeek?.academic_unclear && (
                      <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {selectedWeek.academic_unclear}
                      </p>
                    )}
                    {(selectedWeek?.academic_pending ||
                      selectedWeek?.project_blocked) && (
                      <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-100">
                        Tertunda:{" "}
                        {selectedWeek.academic_pending ||
                          selectedWeek.project_blocked}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Komitmen Perbaikan Diri */}
                {hasImprove && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-1">
                    <span className="font-semibold text-zinc-700 block">
                      Komitmen Perbaikan Diri:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedWeek?.next_improve}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ATUR TARGET MINGGU INI (WEEKLY PLAN)            */}
      {/* ======================================================== */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Atur Target Awal Minggu (Weekly Plan)"
      >
        <form onSubmit={savePlan} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-xs text-indigo-900 border border-indigo-100">
            Tetapkan 3 target kunci dan deadline prioritas di awal minggu agar
            jadwal belajar Anda terstruktur.
          </div>

          <Field label="Top 3 Prioritas Utama Minggu Ini">
            <Textarea
              rows={3}
              value={form.next_priorities}
              onChange={(e) =>
                setForm({ ...form, next_priorities: e.target.value })
              }
              placeholder="1. Selesaikan draf laporan praktikum sebelum Kamis&#10;2. Bimbingan perwalian DPA awal semester&#10;3. Review materi algoritma graph"
              required
            />
          </Field>

          <Field label="Target Tugas & Kewajiban Terbuka">
            <Textarea
              rows={2}
              value={form.task_open}
              onChange={(e) =>
                setForm({ ...form, task_open: e.target.value })
              }
              placeholder="Tugas-tugas apa saja yang wajib dicicil atau dikumpulkan minggu ini..."
            />
          </Field>

          <Field label="Deadline Terdekat (Opsional)">
            <Textarea
              rows={1}
              value={form.task_next_deadline}
              onChange={(e) =>
                setForm({ ...form, task_next_deadline: e.target.value })
              }
              placeholder="Contoh: Rabu 23.59 WIB - Kuis E-Learning"
            />
          </Field>

          <Field label="Fokus Belajar Mandiri / Materi Kuliah">
            <Textarea
              rows={2}
              value={form.learning_what}
              onChange={(e) =>
                setForm({ ...form, learning_what: e.target.value })
              }
              placeholder="Skill atau topik bab yang ingin diperdalam minggu ini..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPlanModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              <Target size={14} /> Simpan Target Plan
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: TULIS REVIEW MINGGU INI (WEEKLY REVIEW)         */}
      {/* ======================================================== */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Tulis Evaluasi Capaian (Weekly Review)"
      >
        <form onSubmit={saveReview} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-900 border border-emerald-100">
            Refleksikan hasil akhir minggu Anda: apa yang berhasil dikuasai, apa yang
            masih bingung, dan evaluasi diri secara jujur.
          </div>

          <Field label="Tugas Tuntas & Materi yang Berhasil Dikuasai">
            <Textarea
              rows={3}
              value={form.academic_done}
              onChange={(e) =>
                setForm({ ...form, academic_done: e.target.value })
              }
              placeholder="Tugas praktikum tuntas, kuis nilai bagus, bab tree sudah paham..."
              required
            />
          </Field>

          <Field label="Materi Belum Dipahami / Titik Bingung">
            <Textarea
              rows={2}
              value={form.academic_unclear}
              onChange={(e) =>
                setForm({ ...form, academic_unclear: e.target.value })
              }
              placeholder="Konsep apa yang masih membingungkan dan butuh ditanyakan ke asdos/dosen..."
            />
          </Field>

          <Field label="Tugas yang Tertunda / Hambatan">
            <Textarea
              rows={2}
              value={form.academic_pending}
              onChange={(e) =>
                setForm({ ...form, academic_pending: e.target.value })
              }
              placeholder="Tugas atau proyek yang belum sempat selesai minggu ini..."
            />
          </Field>

          <Field label="Komitmen Perbaikan Diri Minggu Depan">
            <Textarea
              rows={2}
              value={form.next_improve}
              onChange={(e) =>
                setForm({ ...form, next_improve: e.target.value })
              }
              placeholder="Hal yang ingin diperbaiki: jangan begadang, cicil tugas dari hari Senin..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReviewModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              <ClipboardList size={14} /> Simpan Review Mingguan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
