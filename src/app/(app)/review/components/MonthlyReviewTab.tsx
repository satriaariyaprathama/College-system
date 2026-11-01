"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, Field, Modal, Textarea, Input } from "@/components/ui";
import type { MonthlyPlan, MonthlyReview } from "@/lib/types";
import { getMonthStart, formatMonthLabel } from "@/lib/date";
import {
  Pencil,
  BookOpen,
  AlertTriangle,
  Target,
  ClipboardList,
  Sparkles,
  Compass,
  Rocket,
} from "lucide-react";

const emptyMonthlyPlan: MonthlyPlan = {
  semester_id: null,
  month_start: getMonthStart(new Date()),
  focus: "",
  academic_goals: "",
  project_goals: "",
  priorities: "",
  notes: "",
};

const emptyMonthlyReview: MonthlyReview = {
  id: "",
  semester_id: null,
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

  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [reviews, setReviews] = useState<MonthlyReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Dua modal terpisah
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const [planForm, setPlanForm] = useState(emptyMonthlyPlan);
  const [reviewForm, setReviewForm] = useState(emptyMonthlyReview);

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

  const selectedPlan = plans.find(
    (item) => item.month_start === selectedMonthStart
  );

  const selectedReview = reviews.find(
    (item) => item.month_start === selectedMonthStart
  );

  async function load() {
    setLoading(true);

    let planQuery = supabase
      .from("monthly_plans")
      .select("*")
      .order("month_start", { ascending: false });

    let reviewQuery = supabase
      .from("monthly_reviews")
      .select("*")
      .order("month_start", { ascending: false });

    if (currentSemesterId) {
      planQuery = planQuery.eq("semester_id", currentSemesterId);
      reviewQuery = reviewQuery.eq("semester_id", currentSemesterId);
    }

    const [{ data: planData, error: planError }, { data: reviewData, error: reviewError }] =
      await Promise.all([planQuery, reviewQuery]);

    if (planError) {
      console.error("Gagal memuat Monthly Plan:", planError);
    }
    if (reviewError) {
      console.error("Gagal memuat Monthly Review:", reviewError);
    }

    setPlans((planData as MonthlyPlan[]) ?? []);
    setReviews((reviewData as MonthlyReview[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  function openPlanModal() {
    setPlanForm({
      id: selectedPlan?.id,
      semester_id: currentSemesterId,
      month_start: selectedMonthStart,
      focus: selectedPlan?.focus ?? "",
      academic_goals: selectedPlan?.academic_goals ?? "",
      project_goals: selectedPlan?.project_goals ?? "",
      priorities: selectedPlan?.priorities ?? "",
      notes: selectedPlan?.notes ?? "",
    });
    setPlanModalOpen(true);
  }

  function openReviewModal() {
    setReviewForm({
      id: selectedReview?.id ?? "",
      semester_id: currentSemesterId,
      month_start: selectedMonthStart,
      academic_done: selectedReview?.academic_done ?? "",
      academic_pending: selectedReview?.academic_pending ?? "",
      academic_unclear: selectedReview?.academic_unclear ?? "",
      learning_summary: selectedReview?.learning_summary ?? "",
      project_progress: selectedReview?.project_progress ?? "",
      problems: selectedReview?.problems ?? "",
      improvements: selectedReview?.improvements ?? "",
      next_focus: selectedReview?.next_focus ?? "",
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
      month_start: selectedMonthStart,
      focus: planForm.focus?.trim() || null,
      academic_goals: planForm.academic_goals?.trim() || null,
      project_goals: planForm.project_goals?.trim() || null,
      priorities: planForm.priorities?.trim() || null,
      notes: planForm.notes?.trim() || null,
    };

    const { error } = await supabase.from("monthly_plans").upsert(payload, {
      onConflict: "user_id,month_start",
    });

    if (error) {
      alert(`Gagal menyimpan Rencana Bulanan: ${error.message}`);
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
      month_start: selectedMonthStart,
      academic_done: reviewForm.academic_done?.trim() || null,
      academic_pending: reviewForm.academic_pending?.trim() || null,
      academic_unclear: reviewForm.academic_unclear?.trim() || null,
      learning_summary: reviewForm.learning_summary?.trim() || null,
      project_progress: reviewForm.project_progress?.trim() || null,
      problems: reviewForm.problems?.trim() || null,
      improvements: reviewForm.improvements?.trim() || null,
      next_focus: reviewForm.next_focus?.trim() || null,
    };

    const { error } = await supabase.from("monthly_reviews").upsert(payload, {
      onConflict: "user_id,month_start",
    });

    if (error) {
      alert(`Gagal menyimpan Evaluasi Bulanan: ${error.message}`);
      return;
    }

    setReviewModalOpen(false);
    await load();
  }

  const currentMonthLabel = formatMonthLabel(selectedMonthStart);

  // Cek keberadaan konten spesifik (Content-Driven)
  const hasFocus = Boolean(selectedPlan?.focus?.trim());
  const hasAcademicGoals = Boolean(selectedPlan?.academic_goals?.trim());
  const hasProjectGoals = Boolean(selectedPlan?.project_goals?.trim());
  const hasPriorities = Boolean(selectedPlan?.priorities?.trim());
  const hasPlan = hasFocus || hasAcademicGoals || hasProjectGoals || hasPriorities;

  const hasAcademicDone = Boolean(
    selectedReview?.academic_done?.trim() ||
      selectedReview?.learning_summary?.trim() ||
      selectedReview?.project_progress?.trim()
  );
  const hasProblems = Boolean(
    selectedReview?.problems?.trim() ||
      selectedReview?.improvements?.trim() ||
      selectedReview?.academic_unclear?.trim()
  );
  const hasNextFocus = Boolean(selectedReview?.next_focus?.trim());
  const hasReview = hasAcademicDone || hasProblems || hasNextFocus;

  return (
    <div className="space-y-6">
      {/* 1. Header Horisontal: Pilih Bulan + Dua Tombol Aksi Berdampingan */}
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={openPlanModal}
            className="!text-xs !py-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Target size={14} className="text-indigo-600" /> Atur Target Bulan
          </Button>

          <Button
            onClick={openReviewModal}
            className="!text-xs !py-1.5"
          >
            <ClipboardList size={14} /> Tulis Review Bulan
          </Button>
        </div>
      </div>

      <div className="text-xs text-zinc-500 font-medium">
        Periode Bulan: <span className="text-zinc-800 font-semibold">{currentMonthLabel}</span>
      </div>

      {/* 2. DUAL-PANEL LAYOUT (Berdampingan: Monthly Plan Kiri vs Monthly Review Kanan) */}
      {loading ? (
        <p className="text-sm text-zinc-400 py-6">Memuat data bulanan...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* ======================================================== */}
          {/* PANEL KIRI: 🎯 Monthly Plan (Target Bulan Ini)            */}
          {/* ======================================================== */}
          <Card className="!p-5 space-y-3.5 border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Target size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Monthly Plan (Target Bulan Ini)
                  </h3>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Disusun pada awal bulan
                  </span>
                </div>
              </div>

              {hasPlan && (
                <button
                  onClick={openPlanModal}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
                  title="Edit Target Plan"
                >
                  <Pencil size={12} /> Edit Target
                </button>
              )}
            </div>

            {!hasPlan ? (
              /* Compact Adaptive Empty State */
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700">
                  <Target size={15} className="text-indigo-600" />
                  <span>Belum ada target untuk {currentMonthLabel}</span>
                </div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Tetapkan fokus utama, target mata kuliah, dan milestone proyek sebulan ke depan.
                </p>
                <div>
                  <Button
                    variant="secondary"
                    onClick={openPlanModal}
                    className="!text-xs !py-1"
                  >
                    <Sparkles size={12} /> + Buat Target Bulan Ini
                  </Button>
                </div>
              </div>
            ) : (
              /* Content-Driven Plan Display (Only Render Non-Empty Sections) */
              <div className="space-y-3 text-xs">
                {/* 1. Fokus Utama */}
                {hasFocus && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                      <Compass size={14} className="text-indigo-600 shrink-0" />
                      <span>Fokus Utama Bulan Ini</span>
                    </div>
                    <p className="text-zinc-900 font-bold text-sm leading-snug">
                      {selectedPlan?.focus}
                    </p>
                  </div>
                )}

                {/* 2. Target Akademik & Kuliah */}
                {hasAcademicGoals && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs">
                      <BookOpen size={14} className="text-zinc-600 shrink-0" />
                      <span>Target Akademik & Kuliah</span>
                    </div>
                    <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {selectedPlan?.academic_goals}
                    </p>
                  </div>
                )}

                {/* 3. Target Proyek & Skill */}
                {hasProjectGoals && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs">
                      <Rocket size={14} className="text-zinc-600 shrink-0" />
                      <span>Target Proyek & Skill</span>
                    </div>
                    <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {selectedPlan?.project_goals}
                    </p>
                  </div>
                )}

                {/* 4. Prioritas Bulanan */}
                {hasPriorities && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-3.5 space-y-1">
                    <span className="font-semibold text-zinc-700 block">
                      Prioritas & Catatan:
                    </span>
                    <p className="text-zinc-600 whitespace-pre-wrap">
                      {selectedPlan?.priorities}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ======================================================== */}
          {/* PANEL KANAN: 📋 Monthly Review (Evaluasi Hasil Bulan)      */}
          {/* ======================================================== */}
          <Card className="!p-5 space-y-3.5 border-zinc-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                  <ClipboardList size={16} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Monthly Review (Evaluasi Akhir Bulan)
                  </h3>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Disusun pada akhir bulan
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
                  <ClipboardList size={15} className="text-emerald-600" />
                  <span>Review bulan {currentMonthLabel} belum ditulis</span>
                </div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Bandingkan realisasi pencapaian Anda dengan target di sebelah kiri.
                </p>
                <div>
                  <Button onClick={openReviewModal} className="!text-xs !py-1">
                    <Sparkles size={12} /> + Tulis Review Bulan Ini
                  </Button>
                </div>
              </div>
            ) : (
              /* Content-Driven Review Display (Only Render Non-Empty Sections) */
              <div className="space-y-3 text-xs">
                {/* 1. Capaian Akademik Sebulan */}
                {hasAcademicDone && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                      <BookOpen size={14} className="text-emerald-600 shrink-0" />
                      <span>Capaian Kuliah & Belajar Mandiri</span>
                    </div>
                    {selectedReview?.academic_done && (
                      <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {selectedReview.academic_done}
                      </p>
                    )}
                    {selectedReview?.learning_summary && (
                      <p className="text-[11px] text-zinc-600 pt-1 border-t border-emerald-100">
                        Skill: {selectedReview.learning_summary}
                      </p>
                    )}
                    {selectedReview?.project_progress && (
                      <p className="text-[11px] text-zinc-600 pt-1 border-t border-emerald-100">
                        Proyek: {selectedReview.project_progress}
                      </p>
                    )}
                  </div>
                )}

                {/* 2. Hambatan & Masalah */}
                {hasProblems && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <span>Kendala & Poin Perbaikan</span>
                    </div>
                    {selectedReview?.problems && (
                      <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {selectedReview.problems}
                      </p>
                    )}
                    {selectedReview?.improvements && (
                      <p className="text-[11px] text-zinc-600 pt-1 border-t border-amber-100">
                        Solusi: {selectedReview.improvements}
                      </p>
                    )}
                    {selectedReview?.academic_unclear && (
                      <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-100">
                        Materi belum paham: {selectedReview.academic_unclear}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Fokus Bulan Depan */}
                {hasNextFocus && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
                      <Target size={14} className="text-indigo-600 shrink-0" />
                      <span>Komitmen & Fokus Bulan Depan</span>
                    </div>
                    <p className="text-zinc-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedReview?.next_focus}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ATUR TARGET BULAN (MONTHLY PLAN)                 */}
      {/* ======================================================== */}
      <Modal
        open={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Atur Target Bulan (Monthly Plan)"
      >
        <form onSubmit={savePlan} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Fokus Utama Bulan Ini">
            <Input
              value={planForm.focus ?? ""}
              onChange={(e) =>
                setPlanForm({ ...planForm, focus: e.target.value })
              }
              placeholder="Contoh: Menguasai SQL Kompleks & Selesaikan Proyek Web"
              required
            />
          </Field>

          <Field label="Target Akademik & Kuliah">
            <Textarea
              rows={3}
              value={planForm.academic_goals ?? ""}
              onChange={(e) =>
                setPlanForm({ ...planForm, academic_goals: e.target.value })
              }
              placeholder="Target nilai kuis, persiapan UTS/UAS, kehadiran 100%..."
            />
          </Field>

          <Field label="Target Proyek & Skill Portofolio">
            <Textarea
              rows={2}
              value={planForm.project_goals ?? ""}
              onChange={(e) =>
                setPlanForm({ ...planForm, project_goals: e.target.value })
              }
              placeholder="Fitur aplikasi yang diselesaikan, teknologi baru yang dipelajari..."
            />
          </Field>

          <Field label="Prioritas & Langkah Penting">
            <Textarea
              rows={2}
              value={planForm.priorities ?? ""}
              onChange={(e) =>
                setPlanForm({ ...planForm, priorities: e.target.value })
              }
              placeholder="Daftar prioritas utama bulan ini..."
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
      {/* MODAL 2: TULIS REVIEW BULAN (MONTHLY REVIEW)              */}
      {/* ======================================================== */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Tulis Evaluasi Bulanan (Monthly Review)"
      >
        <form onSubmit={saveReview} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Pencapaian Kuliah & Materi yang Berhasil Dikuasai">
            <Textarea
              rows={3}
              value={reviewForm.academic_done ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, academic_done: e.target.value })
              }
              placeholder="Materi yang sudah tuntas, kuis/UTS yang terlampaui..."
              required
            />
          </Field>

          <Field label="Ringkasan Belajar Mandiri & Proyek">
            <Textarea
              rows={2}
              value={reviewForm.learning_summary ?? ""}
              onChange={(e) =>
                setReviewForm({
                  ...reviewForm,
                  learning_summary: e.target.value,
                })
              }
              placeholder="Skill baru yang dikuasai, repositori/proyek yang rampung..."
            />
          </Field>

          <Field label="Kendala & Hambatan yang Dihadapi">
            <Textarea
              rows={2}
              value={reviewForm.problems ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, problems: e.target.value })
              }
              placeholder="Masalah manajemen waktu, materi yang sulit dipahami..."
            />
          </Field>

          <Field label="Langkah Solusi / Perbaikan Diri">
            <Textarea
              rows={2}
              value={reviewForm.improvements ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, improvements: e.target.value })
              }
              placeholder="Strategi pemecahan masalah yang akan diterapkan..."
            />
          </Field>

          <Field label="Komitmen & Target Kunci Bulan Depan">
            <Textarea
              rows={2}
              value={reviewForm.next_focus ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, next_focus: e.target.value })
              }
              placeholder="Fokus utama bulan berikutnya..."
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
              <ClipboardList size={14} /> Simpan Review Bulanan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
