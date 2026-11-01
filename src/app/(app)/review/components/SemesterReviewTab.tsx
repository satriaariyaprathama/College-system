"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, Field, Modal, Textarea, Input } from "@/components/ui";
import type { SemesterReview, SemesterPlan, Course } from "@/lib/types";
import {
  Pencil,
  GraduationCap,
  Award,
  Rocket,
  Lightbulb,
  CheckCircle2,
  Sparkles,
  Compass,
  BookOpen,
  Wrench,
  ShieldCheck,
  Settings2,
} from "lucide-react";

// Target SKS default Sarjana (144 SKS)
const DEFAULT_SEMESTER_SKS: Record<number, number> = {
  1: 20,
  2: 20,
  3: 20,
  4: 20,
  5: 20,
  6: 20,
  7: 14,
  8: 10,
};

const emptySemesterReview: SemesterReview = {
  id: "",
  user_id: "",
  semester_id: "",
  academic_progress: "",
  skill_growth: "",
  self_learning: "",
  project_summary: "",
  portfolio_summary: "",
  problems: "",
  improvements: "",
  next_focus: "",
  created_at: "",
};

const emptySemesterPlan: SemesterPlan = {
  semester_id: "",
  focus: "",
  academic_goals: "",
  learning_goals: "",
  project_goals: "",
  priorities: "",
  notes: "",
};

export default function SemesterReviewTab() {
  const supabase = createClient();
  const { currentSemesterId, currentSemester } = useSemesters();

  const [reviews, setReviews] = useState<SemesterReview[]>([]);
  const [semesterPlan, setSemesterPlan] = useState<SemesterPlan | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  // Modals state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [compassModalOpen, setCompassModalOpen] = useState(false);
  const [simulatorModalOpen, setSimulatorModalOpen] = useState(false);

  // Form states
  const [reviewForm, setReviewForm] = useState(emptySemesterReview);
  const [compassForm, setCompassForm] = useState(emptySemesterPlan);

  // Simulator state: Target SKS per semester (1..8)
  const [customSks, setCustomSks] = useState<Record<number, number>>(DEFAULT_SEMESTER_SKS);
  const [customTargetIpk, setCustomTargetIpk] = useState<Record<number, string>>({});
  const [selectedSimSemester, setSelectedSimSemester] = useState<number>(1);
  const [tempSimSks, setTempSimSks] = useState<number>(20);
  const [tempSimIpk, setTempSimIpk] = useState<string>("3.85");

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
      // Load saved simulator roadmap SKS from localStorage
      try {
        const saved = localStorage.getItem(`kh_roadmap_sks_${user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setCustomSks((prev) => ({ ...prev, ...parsed.sks }));
            if (parsed.ipk) {
              setCustomTargetIpk(parsed.ipk);
            }
          }
        }
      } catch (err) {
        console.error("Gagal membaca roadmap SKS lokal:", err);
      }
    }

    let reviewQuery = supabase
      .from("semester_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    let planQuery = supabase
      .from("semester_plans")
      .select("*");

    let courseQuery = supabase
      .from("courses")
      .select("*");

    if (currentSemesterId) {
      reviewQuery = reviewQuery.eq("semester_id", currentSemesterId);
      planQuery = planQuery.eq("semester_id", currentSemesterId);
      courseQuery = courseQuery.eq("semester_id", currentSemesterId);
    }

    const [
      { data: reviewData },
      { data: planData },
      { data: courseData },
    ] = await Promise.all([reviewQuery, planQuery, courseQuery]);

    setReviews((reviewData as SemesterReview[]) ?? []);
    setSemesterPlan(planData && planData.length > 0 ? (planData[0] as SemesterPlan) : null);
    setCourses((courseData as Course[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const currentSksTotal = courses.reduce(
    (sum, c) => sum + (c.credits || 0),
    0
  );

  const currentReview = reviews.find(
    (r) => r.semester_id === currentSemesterId
  );

  const activeSmtNumber = currentSemester?.semester_number ?? 1;

  // Handler buka modal simulator
  function openSimulator(num: number) {
    setSelectedSimSemester(num);
    setTempSimSks(customSks[num] || DEFAULT_SEMESTER_SKS[num] || 20);
    setTempSimIpk(customTargetIpk[num] || "3.85");
    setSimulatorModalOpen(true);
  }

  // Simpan simulator
  function saveSimulator(e: React.FormEvent) {
    e.preventDefault();
    const updatedSks = {
      ...customSks,
      [selectedSimSemester]: Number(tempSimSks) || 20,
    };
    const updatedIpk = {
      ...customTargetIpk,
      [selectedSimSemester]: tempSimIpk.trim() || "3.85",
    };

    setCustomSks(updatedSks);
    setCustomTargetIpk(updatedIpk);

    if (userId) {
      try {
        localStorage.setItem(
          `kh_roadmap_sks_${userId}`,
          JSON.stringify({ sks: updatedSks, ipk: updatedIpk })
        );
      } catch (err) {
        console.error("Gagal menyimpan roadmap lokal:", err);
      }
    }

    setSimulatorModalOpen(false);
  }

  // Hitung kumulatif target SKS per semester
  function getCumulativeSks(smtNum: number) {
    let total = 0;
    for (let i = 1; i <= smtNum; i++) {
      total += customSks[i] || DEFAULT_SEMESTER_SKS[i] || 20;
    }
    return Math.min(144, total);
  }

  const grandTotalSks = Object.keys(DEFAULT_SEMESTER_SKS).reduce((sum, key) => {
    const k = Number(key);
    return sum + (customSks[k] || DEFAULT_SEMESTER_SKS[k] || 20);
  }, 0);

  // Modal Kompas Semester
  function openCompassModal() {
    setCompassForm({
      semester_id: currentSemesterId ?? "",
      focus: semesterPlan?.focus ?? "",
      academic_goals: semesterPlan?.academic_goals ?? "",
      learning_goals: semesterPlan?.learning_goals ?? "",
      project_goals: semesterPlan?.project_goals ?? "",
      priorities: semesterPlan?.priorities ?? "",
      notes: semesterPlan?.notes ?? "",
    });
    setCompassModalOpen(true);
  }

  async function saveCompass(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSemesterId) {
      alert("Pilih semester aktif terlebih dahulu.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("User tidak ditemukan.");
      return;
    }

    const payload = {
      user_id: user.id,
      semester_id: currentSemesterId,
      focus: compassForm.focus?.trim() || null,
      academic_goals: compassForm.academic_goals?.trim() || null,
      learning_goals: compassForm.learning_goals?.trim() || null,
      project_goals: compassForm.project_goals?.trim() || null,
      priorities: compassForm.priorities?.trim() || null,
      notes: compassForm.notes?.trim() || null,
    };

    const { error } = await supabase.from("semester_plans").upsert(payload, {
      onConflict: "user_id,semester_id",
    });

    if (error) {
      alert(`Gagal menyimpan Kompas Semester: ${error.message}`);
      return;
    }

    setCompassModalOpen(false);
    await loadData();
  }

  // Modal Review Semester
  function openReviewModal() {
    if (currentReview) {
      setReviewForm({
        id: currentReview.id,
        user_id: currentReview.user_id,
        semester_id: currentReview.semester_id,
        academic_progress: currentReview.academic_progress ?? "",
        skill_growth: currentReview.skill_growth ?? "",
        self_learning: currentReview.self_learning ?? "",
        project_summary: currentReview.project_summary ?? "",
        portfolio_summary: currentReview.portfolio_summary ?? "",
        problems: currentReview.problems ?? "",
        improvements: currentReview.improvements ?? "",
        next_focus: currentReview.next_focus ?? "",
        created_at: currentReview.created_at,
      });
    } else {
      setReviewForm(emptySemesterReview);
    }
    setReviewModalOpen(true);
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
      alert("User tidak ditemukan.");
      return;
    }

    const payload = {
      user_id: user.id,
      semester_id: currentSemesterId,
      academic_progress: reviewForm.academic_progress?.trim() || null,
      skill_growth: reviewForm.skill_growth?.trim() || null,
      self_learning: reviewForm.self_learning?.trim() || null,
      project_summary: reviewForm.project_summary?.trim() || null,
      portfolio_summary: reviewForm.portfolio_summary?.trim() || null,
      problems: reviewForm.problems?.trim() || null,
      improvements: reviewForm.improvements?.trim() || null,
      next_focus: reviewForm.next_focus?.trim() || null,
    };

    const { error } = await supabase.from("semester_reviews").upsert(payload, {
      onConflict: "user_id,semester_id",
    });

    if (error) {
      alert(`Gagal menyimpan Review Semester: ${error.message}`);
      return;
    }

    setReviewModalOpen(false);
    await loadData();
  }

  return (
    <div className="space-y-8">
      {/* ======================================================== */}
      {/* 1. VISUAL MIND MAP: KOMPAS SEMESTER (SEMESTER PLAN)      */}
      {/* ======================================================== */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-zinc-900">
                Mind Map Kompas Semester
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Peta kompas penentu arah: fokus inti, target IPK, akselerasi skill,
              dan target karya nyata semester ini.
            </p>
          </div>

          <Button
            onClick={openCompassModal}
            disabled={!currentSemesterId}
            className="shrink-0 !text-xs !py-1.5"
          >
            <Pencil size={13} /> Atur Kompas Semester
          </Button>
        </div>

        {/* Bento / Interactive Mind Map Presentation */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-zinc-50 p-5 shadow-xs">
          {/* CENTER NODE: FOKUS INTI SEMESTER */}
          <div className="mx-auto max-w-xl text-center mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-xs">
              <Sparkles size={12} />
              FOKUS INTI SEMESTER {activeSmtNumber}
            </span>
            <h3 className="mt-2 text-lg sm:text-xl font-black text-zinc-900 tracking-tight leading-snug">
              {semesterPlan?.focus || (
                <span className="text-zinc-400 font-medium italic text-base">
                  &ldquo;Klik &apos;Atur Kompas Semester&apos; untuk menetapkan fokus inti semester ini&rdquo;
                </span>
              )}
            </h3>
            {currentSemester && (
              <p className="text-xs text-zinc-500 mt-1">
                {currentSemester.label ||
                  `${currentSemester.academic_year} · Semester ${currentSemester.semester_number}`}
              </p>
            )}
          </div>

          {/* 4 CABANG SATELIT (BENTO GRID) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cabang 1: Akademik & Target IPK */}
            <div className="rounded-xl border border-blue-200 bg-white/90 p-4 space-y-2 shadow-2xs hover:border-blue-300 transition">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <BookOpen size={14} />
                </span>
                <span>Akademik & Target Nilai (Target 4.00 IPK)</span>
              </div>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {semesterPlan?.academic_goals || (
                  <span className="text-zinc-400 italic">
                    Belum ada target akademik yang ditentukan.
                  </span>
                )}
              </p>
            </div>

            {/* Cabang 2: Skill & Self-Learning */}
            <div className="rounded-xl border border-emerald-200 bg-white/90 p-4 space-y-2 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Wrench size={14} />
                </span>
                <span>Penguasaan Skill & Belajar Mandiri</span>
              </div>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {semesterPlan?.learning_goals || (
                  <span className="text-zinc-400 italic">
                    Belum ada target keahlian baru.
                  </span>
                )}
              </p>
            </div>

            {/* Cabang 3: Karya & Proyek Riil */}
            <div className="rounded-xl border border-amber-200 bg-white/90 p-4 space-y-2 shadow-2xs hover:border-amber-300 transition">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Rocket size={14} />
                </span>
                <span>Karya Portofolio & Proyek Riil</span>
              </div>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {semesterPlan?.project_goals || (
                  <span className="text-zinc-400 italic">
                    Belum ada target proyek portofolio.
                  </span>
                )}
              </p>
            </div>

            {/* Cabang 4: Disiplin, Presensi & DPA */}
            <div className="rounded-xl border border-purple-200 bg-white/90 p-4 space-y-2 shadow-2xs hover:border-purple-300 transition">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <ShieldCheck size={14} />
                </span>
                <span>Disiplin Presensi 75% & Bimbingan DPA</span>
              </div>
              <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {semesterPlan?.priorities || (
                  <span className="text-zinc-400 italic">
                    Komitmen presensi 100% dan 3x bimbingan DPA tepat waktu.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. GRADUATION ROADMAP: 8 SEMESTER SARJANA (INTERAKTIF)   */}
      {/* ======================================================== */}
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
              Klik kartu semester mana pun untuk menyesuaikan rencana beban SKS & target IPK.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md">
              Target Sarjana: {grandTotalSks}/144 SKS
            </span>
          </div>
        </div>

        {/* Grid 8 Kartu Semester Interaktif */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
            const isActive = num === activeSmtNumber;
            const isPast = num < activeSmtNumber;
            const targetSks = customSks[num] || DEFAULT_SEMESTER_SKS[num] || 20;
            const smtSks = isActive && currentSksTotal > 0 ? currentSksTotal : targetSks;
            const cumulative = getCumulativeSks(num);
            const targetIpk = customTargetIpk[num] || "3.85";

            return (
              <div
                key={num}
                onClick={() => openSimulator(num)}
                className={`relative flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition transform hover:-translate-y-0.5 select-none ${
                  isActive
                    ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs"
                    : isPast
                    ? "border-emerald-200 bg-emerald-50/20 text-zinc-700 hover:border-emerald-300"
                    : "border-zinc-200 bg-white text-zinc-500 hover:border-indigo-300"
                }`}
                title="Klik untuk mengubah rencana target SKS semester ini"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11px] font-black uppercase text-zinc-800">
                      Semester {num}
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

                <div className="mt-3 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[9px] text-zinc-400">
                  <span>IPK {targetIpk}</span>
                  <Settings2 size={10} className="text-zinc-400" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. RETROSPEKTIF SEMESTER (SEMESTER REVIEW)                */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-zinc-900">
                Retrospektif & Refleksi Semester
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Evaluasi komprehensif pencapaian akademik, kemajuan skill, portofolio,
              dan solusi peningkatan kualitas belajar.
            </p>
          </div>

          <Button
            onClick={openReviewModal}
            disabled={!currentSemesterId}
            className="shrink-0"
          >
            <Pencil size={14} />{" "}
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
              Semester {activeSmtNumber} belum dievaluasi
            </h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-md mx-auto">
              Lakukan evaluasi akhir semester untuk mengarsipkan capaian IPK,
              pertumbuhan portofolio, dan strategi perbaikan semester berikutnya.
            </p>
            <div className="mt-4">
              <Button onClick={openReviewModal}>
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
                    `${currentSemester?.academic_year} · Semester ${currentSemester?.semester_number}`}
                </h2>
              </div>

              <Button
                variant="secondary"
                onClick={openReviewModal}
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

      {/* ======================================================== */}
      {/* MODAL 1: ATUR KOMPAS SEMESTER (SEMESTER PLAN)            */}
      {/* ======================================================== */}
      <Modal
        open={compassModalOpen}
        onClose={() => setCompassModalOpen(false)}
        title={`Atur Kompas Semester ${activeSmtNumber}`}
      >
        <form onSubmit={saveCompass} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Fokus Inti Semester (Center Node)">
            <Input
              value={compassForm.focus ?? ""}
              onChange={(e) =>
                setCompassForm({ ...compassForm, focus: e.target.value })
              }
              placeholder="Contoh: Menguasai Rekayasa Perangkat Lunak & Riset Magang"
              required
            />
          </Field>

          <Field label="Akademik & Target IPK">
            <Textarea
              rows={2}
              value={compassForm.academic_goals ?? ""}
              onChange={(e) =>
                setCompassForm({ ...compassForm, academic_goals: e.target.value })
              }
              placeholder="Target IPK 4.00, seluruh praktikum nilai A, pemahaman teori kalkulus..."
            />
          </Field>

          <Field label="Skill & Belajar Mandiri (Self-Learning)">
            <Textarea
              rows={2}
              value={compassForm.learning_goals ?? ""}
              onChange={(e) =>
                setCompassForm({ ...compassForm, learning_goals: e.target.value })
              }
              placeholder="Skill baru yang ingin dipelajari di luar perkuliahan (misal: Docker, Go)..."
            />
          </Field>

          <Field label="Karya Portofolio & Proyek Riil">
            <Textarea
              rows={2}
              value={compassForm.project_goals ?? ""}
              onChange={(e) =>
                setCompassForm({ ...compassForm, project_goals: e.target.value })
              }
              placeholder="Aplikasi yang ingin dibangun dan dipublikasikan ke GitHub / portfolio..."
            />
          </Field>

          <Field label="Disiplin, Presensi & Milestone DPA">
            <Textarea
              rows={2}
              value={compassForm.priorities ?? ""}
              onChange={(e) =>
                setCompassForm({ ...compassForm, priorities: e.target.value })
              }
              placeholder="Komitmen hadir 100%, 3x bimbingan DPA, tepat waktu submit E-Learning..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCompassModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              <Compass size={14} /> Simpan Kompas Semester
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: SIMULATOR TARGET SKS PER SEMESTER               */}
      {/* ======================================================== */}
      <Modal
        open={simulatorModalOpen}
        onClose={() => setSimulatorModalOpen(false)}
        title={`Rencana Studi: Semester ${selectedSimSemester}`}
      >
        <form onSubmit={saveSimulator} className="space-y-4">
          <p className="text-xs text-zinc-500">
            Sesuaikan alokasi target beban SKS untuk Semester {selectedSimSemester}.
            Sistem akan menghitung ulang proyeksi kelulusan 144 SKS secara dinamis.
          </p>

          <Field label="Target Beban SKS">
            <Input
              type="number"
              min={1}
              max={24}
              value={tempSimSks}
              onChange={(e) => setTempSimSks(Number(e.target.value))}
              required
            />
          </Field>

          <Field label="Target IPK Semester Ini">
            <Input
              value={tempSimIpk}
              onChange={(e) => setTempSimIpk(e.target.value)}
              placeholder="3.85"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSimulatorModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              <CheckCircle2 size={14} /> Terapkan Simulasi SKS
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: RETROSPEKTIF SEMESTER (SEMESTER REVIEW)         */}
      {/* ======================================================== */}
      <Modal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title={`Retrospektif Semester ${activeSmtNumber}`}
      >
        <form onSubmit={saveReview} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Perkembangan Nilai & Pemahaman Mata Kuliah">
            <Textarea
              rows={3}
              value={reviewForm.academic_progress ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, academic_progress: e.target.value })
              }
              placeholder="Rangkuman hasil belajar seluruh mata kuliah, capaian target IPK..."
              required
            />
          </Field>

          <Field label="Skill & Keahlian Baru yang Dikuasai">
            <Textarea
              rows={2}
              value={reviewForm.skill_growth ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, skill_growth: e.target.value })
              }
              placeholder="Framework baru, metodologi, sertifikasi, atau bahasa pemrograman..."
            />
          </Field>

          <Field label="Proyek & Karya Portofolio yang Diselesaikan">
            <Textarea
              rows={2}
              value={reviewForm.project_summary ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, project_summary: e.target.value })
              }
              placeholder="Karya proyek kuliah/mandiri yang layak dipajang di portofolio..."
            />
          </Field>

          <Field label="Masalah & Hambatan yang Muncul Sepanjang Semester">
            <Textarea
              rows={2}
              value={reviewForm.problems ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, problems: e.target.value })
              }
              placeholder="Manajemen waktu, kendala tim, pemahaman teori dasar..."
            />
          </Field>

          <Field label="Perbaikan yang Harus Diterapkan">
            <Textarea
              rows={2}
              value={reviewForm.improvements ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, improvements: e.target.value })
              }
              placeholder="Strategi belajar baru, disiplin presensi, cicil tugas lebih awal..."
            />
          </Field>

          <Field label="Target Kunci Semester Depan">
            <Textarea
              rows={2}
              value={reviewForm.next_focus ?? ""}
              onChange={(e) =>
                setReviewForm({ ...reviewForm, next_focus: e.target.value })
              }
              placeholder="Target SKS, mata kuliah pilihan yang diincar, proyek magang/KP..."
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
              <Award size={14} /> Simpan Review Semester
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
