import { differenceInHours, isBefore, parseISO } from "date-fns";
import type { Task, Course, LectureNote, DpaGuidance } from "@/lib/types";

export interface HeuristicEvidence {
  category: "overdue" | "elearning" | "attendance" | "pacing";
  severity: "danger" | "warning" | "positive";
  title: string;
  description: string;
}

export interface HeuristicReport {
  score: number; // 0 - 100
  status: "optimal" | "attention" | "critical";
  evidence: HeuristicEvidence[];
  prescription: string; // Saran tindakan konkret
  metrics: {
    activeTasks: number;
    overdueTasks: number;
    attendanceAlerts: number;
    pendingUploads: number;
    totalActiveSks: number;
  };
}

interface ComputeHeuristicParams {
  tasks: Task[];
  courses: Course[];
  notes?: LectureNote[];
  dpaGuidances?: DpaGuidance[];
  targetDate?: Date;
}

/**
 * Evaluates the academic health status based on evidence telemetry at targetDate.
 */
export function computeAcademicHeuristic({
  tasks,
  courses,
  notes = [],
  dpaGuidances = [],
  targetDate = new Date(),
}: ComputeHeuristicParams): HeuristicReport {
  let score = 100;
  const evidence: HeuristicEvidence[] = [];

  const totalActiveSks = courses.reduce((acc, c) => acc + (c.credits || 0), 0);

  // 1. Task Overdue Analysis
  const overdueTasks: Task[] = [];
  const activeTasks = tasks.filter((t) => t.status !== "done");

  activeTasks.forEach((t) => {
    if (!t.due_date) return;
    const due = parseISO(t.due_date);
    if (isBefore(due, targetDate)) {
      overdueTasks.push(t);
      const course = courses.find((c) => c.id === t.course_id || c.name === t.course);
      const creditsWeight = course ? Math.max(1, course.credits / 3) : 1;
      const priorityWeight = t.priority === "high" ? 10 : t.priority === "medium" ? 6 : 3;
      const penalty = Math.round(priorityWeight * creditsWeight);

      score -= penalty;

      evidence.push({
        category: "overdue",
        severity: "danger",
        title: `Tugas Terlambat: ${t.title}`,
        description: `Tugas prioritas ${t.priority} (${course?.name ?? t.course ?? "Umum"}) telah melewati deadline (Penalti: -${penalty} poin).`,
      });
    }
  });

  // 2. E-Learning Deadline & Submission Radar (<= 48 Jam)
  let pendingUploads = 0;
  activeTasks.forEach((t) => {
    if (!t.due_date) return;
    const due = parseISO(t.due_date);
    const diffHours = differenceInHours(due, targetDate);

    // If due within next 48 hours and not yet overdue
    if (diffHours >= 0 && diffHours <= 48) {
      const isSubmitted = t.submission_state === "submitted";
      const isReady = t.submission_state === "ready_to_upload";

      if (!isSubmitted) {
        pendingUploads++;
        const isElearning = t.source === "elearning";
        const penalty = isElearning ? (isReady ? 3 : 7) : 4;
        score -= penalty;

        evidence.push({
          category: "elearning",
          severity: isElearning && !isReady ? "danger" : "warning",
          title: `Deadline ${diffHours} Jam: ${t.title}`,
          description: isElearning
            ? `Tugas E-Learning LMS belum berstatus "submitted" (Status saat ini: ${t.submission_state}). Segera unggah sebelum sistem ditutup!`
            : `Tugas "${t.title}" jatuh tempo dalam ${diffHours} jam.`,
        });
      }
    }
  });

  // 3. Attendance Safety 75% UAD Radar
  let attendanceAlerts = 0;
  courses.forEach((c) => {
    const total = c.total_meetings || 14;
    const maxAllowed = Math.floor(total * 0.25); // Biasanya 3 kali untuk 14 pertemuan
    const remaining = maxAllowed - c.absent_count;

    if (remaining < 0) {
      attendanceAlerts++;
      score -= 25;
      evidence.push({
        category: "attendance",
        severity: "danger",
        title: `Kritis Presensi: ${c.name}`,
        description: `Sudah absen ${c.absent_count}/${maxAllowed} kali toleransi. Presensi di bawah 75%, terancam CEKAL UAS!`,
      });
    } else if (remaining === 0) {
      attendanceAlerts++;
      score -= 14;
      evidence.push({
        category: "attendance",
        severity: "danger",
        title: `Batas Maksimal Presensi: ${c.name}`,
        description: `Telah memakai seluruh kuota (${c.absent_count}/${maxAllowed} alfa). Tidak boleh absen lagi sama sekali!`,
      });
    } else if (remaining === 1) {
      attendanceAlerts++;
      score -= 8;
      evidence.push({
        category: "attendance",
        severity: "warning",
        title: `Waspada Kuota Presensi: ${c.name}`,
        description: `Sisa kuota izin/alfa tinggal 1 kali (${c.absent_count}/${maxAllowed} terpakai).`,
      });
    }
  });

  // 4. Knowledge / Pacing Coverage
  if (courses.length > 0) {
    const coursesWithNotes = new Set(
      notes.map((n) => n.course_id || n.course).filter(Boolean)
    );
    const coverageRatio = coursesWithNotes.size / courses.length;

    if (coverageRatio < 0.3) {
      score -= 5;
      evidence.push({
        category: "pacing",
        severity: "warning",
        title: "Dokumentasi Catatan Rendah",
        description: `Baru ${coursesWithNotes.size} dari ${courses.length} mata kuliah yang memiliki catatan rangkuman kuliah.`,
      });
    } else if (coverageRatio >= 0.7) {
      evidence.push({
        category: "pacing",
        severity: "positive",
        title: "Retensi Materi Baik",
        description: `${coursesWithNotes.size}/${courses.length} mata kuliah telah dirangkum dalam Lecture Notes.`,
      });
    }
  }

  // 5. DPA Guidance Milestone
  const completedDpa = dpaGuidances.filter((d) => d.is_completed).length;
  if (dpaGuidances.length > 0 && completedDpa === 0) {
    evidence.push({
      category: "pacing",
      severity: "warning",
      title: "Bimbingan DPA Belum Terlaksana",
      description: "Belum ada record bimbingan DPA yang selesai untuk semester ini (Target 3x bimbingan).",
    });
  }

  // Positive feedback if doing great
  if (overdueTasks.length === 0 && attendanceAlerts === 0 && pendingUploads === 0) {
    evidence.push({
      category: "pacing",
      severity: "positive",
      title: "Sistem Kendali Optimal",
      description: "Tidak ada tugas terlambat, presensi aman di atas batas 75%, dan submission terkontrol.",
    });
  }

  // Clamp score
  const finalScore = Math.max(0, Math.min(100, score));

  // Determine status
  const status: "optimal" | "attention" | "critical" =
    finalScore >= 80 ? "optimal" : finalScore >= 55 ? "attention" : "critical";

  // Formulate Prescription
  let prescription = "Seluruh parameter akademik berada pada zona optimal. Pertahankan konsistensi!";
  if (overdueTasks.length > 0 && attendanceAlerts > 0) {
    prescription = `Fokus darurat: Tuntaskan ${overdueTasks.length} tugas terlambat dan jangan lewatkan kuliah pada mata kuliah yang kuota absennya menipis.`;
  } else if (pendingUploads > 0) {
    prescription = `Prioritaskan ${pendingUploads} tugas yang jatuh tempo dalam <48 jam. Segera selesaikan dan ubah status menjadi "submitted".`;
  } else if (overdueTasks.length > 0) {
    prescription = `Selesaikan backlog ${overdueTasks.length} tugas overdue untuk memulihkan skor kesehatan akademik.`;
  } else if (attendanceAlerts > 0) {
    prescription = "Perhatikan kehadiran kelas minggu ini! Ada mata kuliah dengan kuota presensi kritis (<75%).";
  } else if (finalScore < 80) {
    prescription = "Tingkatkan dokumentasi catatan materi dan pastikan seluruh milestone akademik terjadwal.";
  }

  return {
    score: finalScore,
    status,
    evidence,
    prescription,
    metrics: {
      activeTasks: activeTasks.length,
      overdueTasks: overdueTasks.length,
      attendanceAlerts,
      pendingUploads,
      totalActiveSks,
    },
  };
}
