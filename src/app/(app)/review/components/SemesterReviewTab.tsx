"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, Field, Modal, Textarea } from "@/components/ui";
import type { SemesterReview, Course } from "@/lib/types";
import {
  Plus,
  Pencil,
  GraduationCap,
  Award,
  Rocket,
  Lightbulb,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const emptySemester = {
  id: "" as string | null,
  academic_progress: "",
  skill_growth: "",
  self_learning: "",
  project_summary: "",
  portfolio_summary: "",
  problems: "",
  improvements: "",
  next_focus: "",
};

// Target SKS standar Sarjana (144 SKS)
const STANDARD_SEMESTER_SKS: Record<number, number> = {
  1: 20,
  2: 20,
  3: 20,
  4: 20,
  5: 20,
  6: 20,
  7: 14,
  8: 10,
};

export default function SemesterReviewTab() {
  const supabase = createClient();
  const { currentSemesterId, currentSemester } = useSemesters();
  const [items, setItems] = useState<SemesterReview[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptySemester);

  async function load() {
    setLoading(true);

    let reviewQuery = supabase
      .from("semester_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    let courseQuery = supabase
      .from("courses")
      .select("*");

    if (currentSemesterId) {
      reviewQuery = reviewQuery.eq("semester_id", currentSemesterId);
      courseQuery = courseQuery.eq("semester_id", currentSemesterId);
    }

    const [{ data: reviewData }, { data: courseData }] = await Promise.all([
      reviewQuery,
      courseQuery,
    ]);

    setItems((reviewData as SemesterReview[]) ?? []);
    setCourses((courseData as Course[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const currentSksTotal = courses.reduce(
    (sum, c) => sum + (c.credits || 0),
    0
  );

  const currentReview = items.find(
    (r) => r.semester_id === currentSemesterId
  );

  const activeSmtNumber = currentSemester?.semester_number ?? 1;

  function openForCurrent() {
    if (currentReview) {
      setForm({
        id: currentReview.id,
        academic_progress: currentReview.academic_progress ?? "",
        skill_growth: currentReview.skill_growth ?? "",
        self_learning: currentReview.self_learning ?? "",
        project_summary: currentReview.project_summary ?? "",
        portfolio_summary: currentReview.portfolio_summary ?? "",
        problems: currentReview.problems ?? "",
        improvements: currentReview.improvements ?? "",
        next_focus: currentReview.next_focus ?? "",
      });
    } else {
      setForm(emptySemester);
    }

    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    if (!currentSemesterId) {
      alert("Pilih semester terlebih dahulu di sidebar.");
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
        .from("semester_reviews")
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

      const result = await supabase.from("semester_reviews").upsert(
        {
          ...payload,
          user_id: user.id,
        },
        { onConflict: "user_id,semester_id" }
      );

      error = result.error;
    }

    if (error) {
      console.error("Gagal menyimpan Semester Review:", error);
      alert(`Gagal menyimpan Semester Review: ${error.message}`);
      return;
    }

    setModalOpen(false);
    await load();
  }

  // Hitung kumulatif target SKS per semester
  function getCumulativeSks(smtNum: number) {
    let total = 0;
    for (let i = 1; i <= smtNum; i++) {
      total += STANDARD_SEMESTER_SKS[i] || 20;
    }
    return Math.min(144, total);
  }

  return (
    <div className="space-y-8">
      {/* 1. Academic Graduation Roadmap (Grid 8 Semester Sarjana) */}
      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-zinc-900">
                Academic Graduation Roadmap (8 Semester Sarjana S1)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Peta jalan kelulusan 144 SKS: memantau beban studi semester aktif
              dan proyeksi semester masa depan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600">
              Target Sarjana: 144 SKS
            </span>
          </div>
        </div>

        {/* Grid 8 Kartu Semester */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const isActive = num === activeSmtNumber;
            const isPast = num < activeSmtNumber;
            const smtSks = isActive
              ? currentSksTotal > 0
                ? currentSksTotal
                : STANDARD_SEMESTER_SKS[num]
              : STANDARD_SEMESTER_SKS[num];
            const cumulative = getCumulativeSks(num);

            return (
              <div
                key={num}
                className={`relative flex flex-col justify-between rounded-xl border p-3 transition ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20 shadow-xs"
                    : isPast
                    ? "border-emerald-200 bg-emerald-50/20 text-zinc-700"
                    : "border-zinc-200 bg-white text-zinc-500 opacity-80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-black uppercase text-zinc-800">
                      Smt {num}
                    </span>
                    {isActive ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                        Aktif
                      </span>
                    ) : isPast ? (
                      <span className="inline-flex items-center rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-semibold text-emerald-800">
                        Selesai
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded bg-zinc-100 px-1 py-0.2 text-[9px] font-medium text-zinc-500">
                        Rencana
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-lg font-black tracking-tight text-zinc-900 leading-none">
                      {smtSks}{" "}
                      <span className="text-[10px] font-normal text-zinc-500">
                        SKS
                      </span>
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Kumulatif: {cumulative}/144
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-1.5 border-t border-zinc-100/80">
                  <span className="text-[9px] font-medium text-zinc-400">
                    {num <= 2
                      ? "Fondasi"
                      : num <= 4
                      ? "Inti Jurusan"
                      : num <= 6
                      ? "Peminatan"
                      : "Skripsi & KP"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Rich Semester Retrospective Display / Empty State */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-zinc-900">
                Retrospektif & Refleksi Semester Aktif
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Evaluasi komprehensif pencapaian akademik, kemajuan skill, portofolio,
              dan solusi peningkatan kualitas belajar.
            </p>
          </div>

          <Button
            onClick={openForCurrent}
            disabled={!currentSemesterId}
            className="shrink-0"
          >
            <Plus size={15} />{" "}
            {currentReview ? "Edit Review Semester" : "Review Semester Ini"}
          </Button>
        </div>

        {!currentSemesterId ? (
          <p className="text-xs text-amber-600">
            Pilih semester spesifik di header/sidebar untuk melihat dan mengisi review.
          </p>
        ) : loading ? (
          <p className="text-sm text-zinc-400 py-6">Memuat review semester...</p>
        ) : !currentReview ? (
          /* Empty State Mengajak */
          <Card className="!p-8 text-center border-dashed border-2 border-zinc-200 bg-zinc-50/50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-3">
              <Award size={22} />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">
              Semester ini belum dievaluasi
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
              Lakukan evaluasi akhir semester untuk mengarsipkan capaian IPK,
              pertumbuhan portofolio, dan strategi perbaikan semester berikutnya.
            </p>
            <div className="mt-4">
              <Button onClick={openForCurrent}>
                <Sparkles size={14} /> Buat Review Semester Sekarang
              </Button>
            </div>
          </Card>
        ) : (
          /* Rich Semester Retrospective Display Card */
          <Card className="!p-6 space-y-6 border-zinc-200 bg-white shadow-xs">
            {/* Header Retrospektif */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={13} /> Retrospektif Tersimpan
                  </span>
                  <Badge color="indigo">Target: 4.00 IPK</Badge>
                  <span className="text-xs font-semibold text-zinc-600">
                    {currentSksTotal} SKS Aktif
                  </span>
                </div>
                <h2 className="mt-1.5 text-base font-bold text-zinc-900">
                  Laporan Retrospektif:{" "}
                  {currentSemester?.label ||
                    `${currentSemester?.academic_year} · Smt ${currentSemester?.semester_number}`}
                </h2>
              </div>

              <Button
                variant="secondary"
                onClick={openForCurrent}
                className="shrink-0 !text-xs !py-1.5"
              >
                <Pencil size={13} /> Edit Review Semester
              </Button>
            </div>

            {/* Tiga Pilar Evaluasi Semester */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Pilar 1: Capaian Akademik */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-indigo-800">
                  <GraduationCap size={18} className="shrink-0 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Capaian Akademik
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Perkembangan & Nilai Akademik:
                    </span>
                    <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {currentReview.academic_progress || (
                        <span className="text-zinc-400 italic">
                          Belum dicatat.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pilar 2: Skill & Proyek Portofolio */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Rocket size={18} className="shrink-0 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Skill & Proyek Portofolio
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Pertumbuhan Skill Mandiri:
                    </span>
                    <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {currentReview.skill_growth ||
                        currentReview.self_learning || (
                          <span className="text-zinc-400 italic">
                            Belum dicatat.
                          </span>
                        )}
                    </p>
                  </div>

                  {(currentReview.project_summary ||
                    currentReview.portfolio_summary) && (
                    <div className="pt-2 border-t border-emerald-100/60">
                      <span className="font-semibold text-zinc-700 block mb-0.5">
                        Ringkasan Portofolio & Proyek:
                      </span>
                      <p className="text-zinc-600 whitespace-pre-wrap">
                        {currentReview.project_summary ||
                          currentReview.portfolio_summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pilar 3: Evaluasi, Solusi & Komitmen */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <Lightbulb size={18} className="shrink-0 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Evaluasi & Rencana Solusi
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-700 block mb-0.5">
                      Hambatan yang Dihadapi:
                    </span>
                    <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {currentReview.problems || (
                        <span className="text-zinc-400 italic">
                          Tidak ada hambatan fatal.
                        </span>
                      )}
                    </p>
                  </div>

                  {currentReview.improvements && (
                    <div className="pt-2 border-t border-amber-100/60">
                      <span className="font-semibold text-zinc-700 block mb-0.5">
                        Poin Perbaikan Diri:
                      </span>
                      <p className="text-zinc-600 whitespace-pre-wrap">
                        {currentReview.improvements}
                      </p>
                    </div>
                  )}

                  {currentReview.next_focus && (
                    <div className="pt-2 border-t border-amber-100/60">
                      <span className="font-semibold text-zinc-700 block mb-0.5">
                        Target Semester Berikutnya:
                      </span>
                      <p className="text-zinc-800 font-medium whitespace-pre-wrap">
                        {currentReview.next_focus}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}
      </section>

      {/* 3. Modal Form: Retrospektif Semester Terstruktur */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Retrospektif Semester"
      >
        <form
          onSubmit={save}
          className="max-h-[75vh] space-y-4 overflow-y-auto pr-1"
        >
          {/* PILAR 1: Akademik */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                1
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Capaian & Evaluasi Akademik
              </p>
            </div>

            <Field label="Perkembangan Nilai & Pemahaman Mata Kuliah">
              <Textarea
                rows={3}
                value={form.academic_progress}
                onChange={(e) =>
                  setForm({ ...form, academic_progress: e.target.value })
                }
                placeholder="Rangkuman hasil belajar seluruh mata kuliah, capaian target IPK..."
              />
            </Field>
          </div>

          {/* PILAR 2: Skill & Proyek Portofolio */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                2
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Pertumbuhan Skill & Portofolio
              </p>
            </div>

            <Field label="Skill & Keahlian Baru yang Dikuasai">
              <Textarea
                rows={2}
                value={form.skill_growth}
                onChange={(e) =>
                  setForm({ ...form, skill_growth: e.target.value })
                }
                placeholder="Framework baru, metodologi, sertifikasi, atau bahasa pemrograman..."
              />
            </Field>

            <Field label="Proyek & Karya Portofolio yang Diselesaikan">
              <Textarea
                rows={2}
                value={form.project_summary}
                onChange={(e) =>
                  setForm({ ...form, project_summary: e.target.value })
                }
                placeholder="Karya proyek kuliah/mandiri yang layak dipajang di portofolio..."
              />
            </Field>
          </div>

          {/* PILAR 3: Evaluasi & Komitmen */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-bold text-white">
                3
              </span>
              <p className="text-xs font-bold uppercase tracking-wider">
                Evaluasi, Solusi & Target Semester Depan
              </p>
            </div>

            <Field label="Masalah & Hambatan yang Muncul Sepanjang Semester">
              <Textarea
                rows={2}
                value={form.problems}
                onChange={(e) =>
                  setForm({ ...form, problems: e.target.value })
                }
                placeholder="Manajemen waktu, kendala tim, pemahaman teori dasar..."
              />
            </Field>

            <Field label="Perbaikan yang Harus Diterapkan">
              <Textarea
                rows={2}
                value={form.improvements}
                onChange={(e) =>
                  setForm({ ...form, improvements: e.target.value })
                }
                placeholder="Strategi belajar baru, disiplin presensi, cicil tugas lebih awal..."
              />
            </Field>

            <Field label="Target Kunci Semester Depan">
              <Textarea
                rows={2}
                value={form.next_focus}
                onChange={(e) =>
                  setForm({ ...form, next_focus: e.target.value })
                }
                placeholder="Target SKS, mata kuliah pilihan yang diincar, proyek magang/KP..."
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
            <Button type="submit">Simpan Review Semester</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
