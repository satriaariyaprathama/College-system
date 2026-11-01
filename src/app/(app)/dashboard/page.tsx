"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { Task, Course, LectureNote, DpaGuidance, SubmissionState } from "@/lib/types";
import { computeAcademicHeuristic } from "@/lib/heuristic";
import { sanitizeUrl } from "@/lib/utils";
import { addDays, subDays, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  GraduationCap,
  MapPin,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const SUBMISSION_OPTIONS: { id: SubmissionState; label: string; color: string }[] = [
  { id: "not_started", label: "Belum Dikerjakan", color: "bg-zinc-100 text-zinc-700" },
  { id: "drafting", label: "Drafting", color: "bg-blue-50 text-blue-700" },
  { id: "ready_to_upload", label: "Siap Upload", color: "bg-amber-50 text-amber-700 font-semibold" },
  { id: "submitted", label: "Submitted ✓", color: "bg-emerald-50 text-emerald-700 font-semibold" },
];

const DEFAULT_DPA_TOPICS = [
  "Pertemuan 1: Perwalian KRS Awal Semester",
  "Pertemuan 2: Evaluasi Tengah Semester (UTS)",
  "Pertemuan 3: Evaluasi Akhir & Rencana SKS Berikutnya",
];

function getDatabaseDayOfWeek(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

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

export default function DashboardPage() {
  const supabase = createClient();
  const { currentSemesterId, currentSemester } = useSemesters();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [dpaGuidances, setDpaGuidances] = useState<DpaGuidance[]>([]);
  const [roadmapSks, setRoadmapSks] = useState<Record<number, number>>(DEFAULT_SEMESTER_SKS);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState<Date>(() => new Date());

  async function loadDashboardData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const saved = localStorage.getItem(`kh_roadmap_sks_${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.sks) setRoadmapSks(parsed.sks);
      }
    } catch {
      // ignore
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    if (profileErr && profileErr.code !== "PGRST116") {
      console.error("Gagal memuat profil dashboard:", profileErr);
    }
    setName(profile?.full_name?.split(" ")[0] ?? "");

    let taskQuery = supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    let courseQuery = supabase
      .from("courses")
      .select("*")
      .order("start_time", { ascending: true, nullsFirst: false });
    let noteQuery = supabase
      .from("lecture_notes")
      .select("*")
      .order("note_date", { ascending: false });
    let dpaQuery = supabase
      .from("dpa_guidance")
      .select("*")
      .order("meeting_number", { ascending: true });

    if (currentSemesterId) {
      taskQuery = taskQuery.eq("semester_id", currentSemesterId);
      courseQuery = courseQuery.eq("semester_id", currentSemesterId);
      noteQuery = noteQuery.eq("semester_id", currentSemesterId);
      dpaQuery = dpaQuery.eq("semester_id", currentSemesterId);
    }

    const [
      { data: t, error: tErr },
      { data: c, error: cErr },
      { data: n, error: nErr },
      { data: dpa, error: dpaErr },
    ] = await Promise.all([
      taskQuery,
      courseQuery,
      noteQuery,
      dpaQuery,
    ]);

    if (tErr) console.error("Gagal memuat tugas dashboard:", tErr);
    if (cErr) console.error("Gagal memuat mata kuliah dashboard:", cErr);
    if (nErr) console.error("Gagal memuat catatan kuliah dashboard:", nErr);
    if (dpaErr) console.error("Gagal memuat bimbingan DPA dashboard:", dpaErr);

    setTasks((t as Task[]) ?? []);
    setCourses((c as Course[]) ?? []);
    setNotes((n as LectureNote[]) ?? []);
    setDpaGuidances((dpa as DpaGuidance[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  // Compute Heuristic based on snapshot date
  const heuristic = useMemo(() => {
    return computeAcademicHeuristic({
      tasks,
      courses,
      notes,
      dpaGuidances,
      targetDate,
    });
  }, [tasks, courses, notes, dpaGuidances, targetDate]);

  // Critical tasks radar: overdue OR due within 48h OR elearning unsubmitted
  const criticalTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.status === "done") return false;
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        const isPast = due < targetDate;
        const diffHours = (due.getTime() - targetDate.getTime()) / (1000 * 60 * 60);
        const isNear = diffHours >= 0 && diffHours <= 48;
        const isElearningPending = t.source === "elearning" && t.submission_state !== "submitted";
        return isPast || isNear || isElearningPending;
      })
      .slice(0, 6);
  }, [tasks, targetDate]);

  // Courses today
  const targetDay = getDatabaseDayOfWeek(targetDate);
  const classesToday = useMemo(() => {
    return courses.filter((c) => c.day_of_week === targetDay);
  }, [courses, targetDay]);

  // Attendance danger / warnings
  const attendanceAlerts = useMemo(() => {
    return courses.filter((c) => {
      const maxAbsent = Math.floor((c.total_meetings || 14) * 0.25);
      const remaining = maxAbsent - (c.absent_count || 0);
      return remaining <= 1;
    });
  }, [courses]);

  async function updateSubmissionState(taskId: string, submission_state: SubmissionState) {
    const { error } = await supabase
      .from("tasks")
      .update({ submission_state })
      .eq("id", taskId);

    if (error) {
      alert(`Gagal memperbarui status pengumpulan: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, submission_state } : t))
    );
  }

  async function toggleTaskDone(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "done" ? "inbox" : "done";
    const { error } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        completed_at: nextStatus === "done" ? new Date().toISOString() : null,
      })
      .eq("id", taskId);

    if (error) {
      alert(`Gagal memperbarui status task: ${error.message}`);
      return;
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: nextStatus as Task["status"],
              completed_at: nextStatus === "done" ? new Date().toISOString() : null,
            }
          : t
      )
    );
  }

  async function toggleDpaMeeting(meetingNumber: number, currentCompleted: boolean) {
    if (!currentSemesterId) return;

    const existing = dpaGuidances.find((d) => d.meeting_number === meetingNumber);
    const nextState = !currentCompleted;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (existing) {
      const { error } = await supabase
        .from("dpa_guidance")
        .update({ is_completed: nextState })
        .eq("id", existing.id);

      if (error) {
        alert(`Gagal memperbarui DPA: ${error.message}`);
        return;
      }

      setDpaGuidances((prev) =>
        prev.map((d) => (d.meeting_number === meetingNumber ? { ...d, is_completed: nextState } : d))
      );
    } else {
      const { error, data } = await supabase
        .from("dpa_guidance")
        .insert({
          user_id: user.id,
          semester_id: currentSemesterId,
          meeting_number: meetingNumber,
          topic: DEFAULT_DPA_TOPICS[meetingNumber - 1],
          is_completed: nextState,
          guidance_date: new Date().toISOString().slice(0, 10),
        })
        .select()
        .single();

      if (error) {
        alert(`Gagal menyimpan milestone DPA: ${error.message}`);
        return;
      }

      if (data) {
        setDpaGuidances((prev) => [...prev, data as DpaGuidance]);
      }
    }
  }

  const activeSmtNumber = currentSemester?.semester_number ?? 1;
  const hasActiveCourses = courses.length > 0;
  const displayedSks = hasActiveCourses
    ? heuristic.metrics.totalActiveSks
    : (roadmapSks[activeSmtNumber] || DEFAULT_SEMESTER_SKS[activeSmtNumber] || 20);

  const isToday =
    format(targetDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      {/* Top Header & Flight Deck Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Flight Deck
            </span>
            <span className="text-xs text-zinc-400">
              {currentSemester
                ? `${currentSemester.academic_year} · Semester ${currentSemester.semester_number}`
                : "Semua Semester"}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 mt-1">
            {name ? `Selamat Datang, ${name}` : "Academic Command Center"}
          </h1>
        </div>

        {/* Time-Travel Stepper Controls */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xs">
          <button
            onClick={() => setTargetDate((prev) => subDays(prev, 1))}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
            title="Hari Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="px-2 text-center min-w-[130px]">
            <p className="text-[11px] font-bold text-zinc-900 leading-tight">
              {format(targetDate, "EEEE, d MMM yyyy", { locale: idLocale })}
            </p>
            <p className="text-[10px] text-zinc-400">
              {isToday ? "Snapshot Hari Ini" : "Simulasi Tanggal"}
            </p>
          </div>

          <button
            onClick={() => setTargetDate((prev) => addDays(prev, 1))}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
            title="Hari Berikutnya"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button
              onClick={() => setTargetDate(new Date())}
              className="ml-1 flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 transition"
              title="Reset ke Hari Ini"
            >
              <RotateCcw size={11} />
              Hari Ini
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 py-12 text-center">Menyiapkan telemetri akademik...</p>
      ) : (
        /* HUD GRID 12-KOLOM (8 Kolom Kiri + 4 Kolom Kanan) */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* ============================================================== */}
          {/* KOLOM KIRI (8 COL): HEURISTIK INTERAKTIF & RADAR TUGAS KRITIS  */}
          {/* ============================================================== */}
          <div className="space-y-6 lg:col-span-8">
            {/* 1. MESIN EVALUASI HEURISTIK INTERAKTIF */}
            <Card className="!p-5 bg-gradient-to-br from-white via-zinc-50/50 to-indigo-50/20 border-zinc-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-zinc-200/70 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-600 text-white text-[10px] font-bold">
                      <Sparkles size={11} />
                    </span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
                      Evaluasi Kesehatan Akademik (Heuristic Engine)
                    </h2>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    Analisis risiko presensi 75%, ketepatan deadline tugas, dan telemetri akademik real-time.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-3xl font-black tracking-tight text-zinc-900 leading-none">
                      {heuristic.score}
                      <span className="text-xs font-normal text-zinc-400 ml-0.5">/100</span>
                    </div>
                    <Badge
                      className="mt-1"
                      color={
                        heuristic.status === "optimal"
                          ? "emerald"
                          : heuristic.status === "attention"
                          ? "amber"
                          : "red"
                      }
                    >
                      {heuristic.status === "optimal"
                        ? "Zona Optimal"
                        : heuristic.status === "attention"
                        ? "Butuh Perhatian"
                        : "Kondisi Kritis"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Diagnosis & Preskripsi Tindakan */}
              <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-3.5 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <Compass className="text-indigo-600 shrink-0 mt-0.5" size={17} />
                  <div>
                    <p className="text-xs font-bold text-zinc-900">
                      Rekomendasi Preskriptif Tindakan:
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-700 leading-relaxed font-medium">
                      {heuristic.prescription}
                    </p>
                  </div>
                </div>
              </div>

              {/* Evidence Telemetry (Bukti Alasan Skor) */}
              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Dasar Evaluasi & Bukti Telemetri ({heuristic.evidence.length} Catatan):
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {heuristic.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-2.5 text-xs transition ${
                        ev.severity === "danger"
                          ? "border-red-200 bg-red-50/70 text-red-900"
                          : ev.severity === "warning"
                          ? "border-amber-200 bg-amber-50/70 text-amber-900"
                          : "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-[11px] mb-0.5">
                        {ev.severity === "danger" && <AlertCircle size={13} className="text-red-600" />}
                        {ev.severity === "warning" && <AlertTriangle size={13} className="text-amber-600" />}
                        {ev.severity === "positive" && <CheckCircle2 size={13} className="text-emerald-600" />}
                        <span>{ev.title}</span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-snug">{ev.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Key Metrics Strip */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-zinc-200/70 pt-3 text-center">
                <div className="rounded-lg bg-zinc-50 p-2">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase">Tugas Aktif</p>
                  <p className="text-base font-bold text-zinc-800">{heuristic.metrics.activeTasks}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-2">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase">Terlambat</p>
                  <p className={`text-base font-bold ${heuristic.metrics.overdueTasks > 0 ? "text-red-600" : "text-zinc-800"}`}>
                    {heuristic.metrics.overdueTasks}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-2">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase">Alert Presensi</p>
                  <p className={`text-base font-bold ${heuristic.metrics.attendanceAlerts > 0 ? "text-amber-600" : "text-zinc-800"}`}>
                    {heuristic.metrics.attendanceAlerts}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-2">
                  <p className="text-[10px] text-zinc-400 font-medium uppercase">Pending Upload</p>
                  <p className={`text-base font-bold ${heuristic.metrics.pendingUploads > 0 ? "text-indigo-600" : "text-zinc-800"}`}>
                    {heuristic.metrics.pendingUploads}
                  </p>
                </div>
              </div>
            </Card>

            {/* 2. RADAR TUGAS KRITIS & E-LEARNING SUBMISSION ALERT */}
            <Card className="!p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <Clock size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 leading-none">
                      Radar Tugas Kritis & E-Learning Submission
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Tugas mendekati batas upload 48 jam & belum berstatus submitted.
                    </p>
                  </div>
                </div>

                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Buka Tasks <ArrowRight size={13} />
                </Link>
              </div>

              {criticalTasks.length === 0 ? (
                <EmptyState text="Tidak ada tugas kritis atau deadline mendesak saat ini. Semua terkendali dengan baik!" />
              ) : (
                <div className="space-y-2.5">
                  {criticalTasks.map((task) => {
                    const isDuePast = task.due_date ? new Date(task.due_date) < targetDate : false;
                    const courseObj = courses.find((c) => c.id === task.course_id);

                    return (
                      <div
                        key={task.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition ${
                          isDuePast
                            ? "border-red-200 bg-red-50/40"
                            : task.source === "elearning" && task.submission_state !== "submitted"
                            ? "border-amber-200 bg-amber-50/30"
                            : "border-zinc-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            onClick={() => toggleTaskDone(task.id, task.status)}
                            className="mt-0.5 text-zinc-300 hover:text-emerald-600 transition"
                            title="Tandai Selesai"
                          >
                            <CheckCircle2 size={18} />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-xs font-bold text-zinc-900 truncate">
                                {task.title}
                              </p>
                              <Badge color={task.priority === "high" ? "red" : task.priority === "medium" ? "amber" : "zinc"}>
                                {task.priority}
                              </Badge>
                              {task.source === "elearning" && (
                                <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700">
                                  LMS E-Learning
                                </span>
                              )}
                              {isDuePast && (
                                <Badge color="red">Overdue</Badge>
                              )}
                            </div>

                            <p className="mt-1 text-[11px] text-zinc-500">
                              {courseObj?.name ?? task.course ?? "Mata Kuliah Umum"} • Deadline:{" "}
                              <span className="font-medium text-zinc-800">
                                {task.due_date
                                  ? format(new Date(task.due_date), "d MMM yyyy, HH:mm", { locale: idLocale })
                                  : "Tanpa deadline"}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Submission State Quick Action */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <select
                            value={task.submission_state || "not_started"}
                            onChange={(e) =>
                              updateSubmissionState(task.id, e.target.value as SubmissionState)
                            }
                            className={`rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-semibold shadow-2xs focus:outline-hidden ${
                              task.submission_state === "submitted"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : task.submission_state === "ready_to_upload"
                                ? "bg-amber-50 text-amber-700 border-amber-300 animate-pulse"
                                : "bg-zinc-50 text-zinc-700"
                            }`}
                          >
                            {SUBMISSION_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          {courseObj?.elearning_url && (
                            <a
                              href={sanitizeUrl(courseObj.elearning_url) || "https://elearning.uad.ac.id"}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100 transition"
                              title="Buka Halaman Upload E-Learning"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* ============================================================== */}
          {/* KOLOM KANAN (4 COL): CONTEXT HUD, SIMERU & DPA RADAR            */}
          {/* ============================================================== */}
          <div className="space-y-6 lg:col-span-4">
            {/* 1. SIMERU HUD - JADWAL KELAS HARI INI */}
            <Card className="!p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Jadwal Hari Ini (SIMERU)
                  </h3>
                </div>
                <Link
                  href="/academics"
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Lihat Semua
                </Link>
              </div>

              {classesToday.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 text-center">
                  <p className="text-xs font-bold text-zinc-700">Libur Kuliah Hari Ini ☕</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Tidak ada jadwal kelas. Waktu optimal untuk mencicil project atau self-learning.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {classesToday.map((c) => {
                    const safeElearning = sanitizeUrl(c.elearning_url) || "https://elearning.uad.ac.id";
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-zinc-200 bg-white p-3 hover:border-indigo-200 transition"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <p className="text-xs font-bold text-zinc-900 leading-snug">
                            {c.name}
                          </p>
                          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 shrink-0">
                            {c.credits} SKS
                          </span>
                        </div>

                        <div className="space-y-0.5 text-[11px] text-zinc-500 mb-2">
                          <p className="flex items-center gap-1">
                            <Clock size={12} className="text-zinc-400" />
                            {c.start_time?.slice(0, 5)} - {c.end_time?.slice(0, 5)}
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin size={12} className="text-zinc-400" />
                            <span className="truncate">{c.room || "Ruang belum ditentukan"}</span>
                          </p>
                        </div>

                        <a
                          href={safeElearning}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full rounded-md bg-zinc-50 py-1 text-center text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1 transition"
                        >
                          <ExternalLink size={11} /> Masuk E-Learning
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 2. ATTENDANCE ALERT BOX (75% UAD) */}
            <Card className="!p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={16} className="text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Radar Presensi 75%
                  </h3>
                </div>
                <Link
                  href="/academics?tab=attendance"
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Kelola
                </Link>
              </div>

              {attendanceAlerts.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 p-2.5 text-xs text-emerald-800 border border-emerald-200/50">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <p className="text-[11px] font-medium leading-snug">
                    Seluruh mata kuliah berada dalam zona aman presensi (&gt;= 75%).
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendanceAlerts.map((c) => {
                    const maxAbsent = Math.floor((c.total_meetings || 14) * 0.25);
                    const remaining = maxAbsent - c.absent_count;
                    const isDanger = remaining < 0;

                    return (
                      <div
                        key={c.id}
                        className={`rounded-lg border p-2 text-xs flex items-center justify-between gap-2 ${
                          isDanger
                            ? "border-red-200 bg-red-50 text-red-900"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-[11px] truncate">{c.name}</p>
                          <p className="text-[10px] opacity-80">
                            {c.absent_count}/{maxAbsent} alfa terpakai
                          </p>
                        </div>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                            isDanger ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                          }`}
                        >
                          {isDanger ? "Cekal UAS" : `Sisa ${remaining}x`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* 3. MILESTONE BIMBINGAN DPA (3X PER SEMESTER) */}
            <Card className="!p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <GraduationCap size={16} className="text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                    Bimbingan DPA (Target 3x)
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-zinc-500">
                  {dpaGuidances.filter((d) => d.is_completed).length}/3 Selesai
                </span>
              </div>

              <div className="space-y-2">
                {[1, 2, 3].map((num) => {
                  const record = dpaGuidances.find((d) => d.meeting_number === num);
                  const isDone = record?.is_completed ?? false;

                  return (
                    <div
                      key={num}
                      onClick={() => toggleDpaMeeting(num, isDone)}
                      className={`flex items-start gap-2.5 rounded-lg border p-2 cursor-pointer transition ${
                        isDone
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-950"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-indigo-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1 text-xs">
                        <p className={`font-semibold text-[11px] ${isDone ? "line-through opacity-80" : ""}`}>
                          {DEFAULT_DPA_TOPICS[num - 1]}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {record?.guidance_date
                            ? format(new Date(record.guidance_date), "d MMM yyyy", { locale: idLocale })
                            : "Belum terjadwal"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* FULL-WIDTH EXECUTIVE ACADEMIC BANNER */}
      {!loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-white shadow-sm space-y-4">
          {/* Baris Atas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <GraduationCap size={18} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Beban Studi & Target Kelulusan Sarjana
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Peta jalan akumulasi SKS menuju target kelulusan 144 SKS Sarjana S1
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 border border-zinc-700">
                {currentSemester?.label ||
                  `${currentSemester?.academic_year || "2026/2027"} · Semester ${currentSemester?.semester_number || 1}`}
              </span>
              <span className="rounded-full bg-indigo-900/60 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-700/50">
                Target: 4.00 IPK
              </span>
            </div>
          </div>

          {/* Baris Bawah (Grid 4 Kolom Metrik Horizontal) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Metrik 1: SKS Aktif Semester */}
            <div className="rounded-xl bg-zinc-800/60 p-3.5 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                {hasActiveCourses ? "SKS Aktif Semester" : "Target Rencana SKS"}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {displayedSks}
                </span>
                <span className="text-xs text-zinc-400">SKS</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {hasActiveCourses
                  ? `Beban Ideal Semester ${activeSmtNumber}`
                  : `Target Rencana Semester ${activeSmtNumber}`}
              </p>
            </div>

            {/* Metrik 2: Mata Kuliah */}
            <div className="rounded-xl bg-zinc-800/60 p-3.5 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Mata Kuliah Aktif
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {courses.length}
                </span>
                <span className="text-xs text-zinc-400">Mata Kuliah</span>
              </div>
              {hasActiveCourses ? (
                <p className="mt-1 text-[11px] text-zinc-400">
                  Terjadwal di SIMERU UAD
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-zinc-400 flex items-center gap-1">
                  <span>0 Matkul (Belum Terdata)</span>
                  <Link
                    href="/academics"
                    className="text-indigo-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                  >
                    + Daftarkan di Academics <ArrowRight size={10} />
                  </Link>
                </p>
              )}
            </div>

            {/* Metrik 3: Catatan Kuliah */}
            <div className="rounded-xl bg-zinc-800/60 p-3.5 border border-zinc-800/80">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                Catatan Kuliah
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">
                  {notes.length}
                </span>
                <span className="text-xs text-zinc-400">Catatan</span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Retensi materi perkuliahan
              </p>
            </div>

            {/* Metrik 4: Progres Kelulusan S1 */}
            <div className="rounded-xl bg-zinc-800/60 p-3.5 border border-zinc-800/80 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                  Progres Sarjana S1
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-zinc-300">
                    {Math.min(144, displayedSks)} / 144 SKS
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    {Math.min(100, Math.round((displayedSks / 144) * 100))}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, Math.round((displayedSks / 144) * 100)))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
