"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select } from "@/components/ui";
import type { Course } from "@/lib/types";
import {
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  GraduationCap,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { sanitizeUrl } from "@/lib/utils";
import AcademicNotesTab from "./components/AcademicNotesTab";

const DAYS: { id: number; label: string }[] = [
  { id: 1, label: "Senin" },
  { id: 2, label: "Selasa" },
  { id: 3, label: "Rabu" },
  { id: 4, label: "Kamis" },
  { id: 5, label: "Jumat" },
  { id: 6, label: "Sabtu" },
  { id: 7, label: "Minggu" },
];

const COLORS = [
  { id: "indigo", label: "Indigo", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { id: "amber", label: "Amber", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { id: "rose", label: "Rose", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  { id: "sky", label: "Sky", bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  { id: "purple", label: "Purple", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
];

const emptyCourseForm = {
  id: "" as string | null,
  name: "",
  code: "",
  credits: "3",
  lecturer: "",
  day_of_week: "1",
  start_time: "08:00",
  end_time: "09:40",
  room: "",
  color: "indigo",
  elearning_url: "",
  whatsapp_group_url: "",
  total_meetings: "14",
  absent_count: "0",
  target_grade: "A",
};

export default function AcademicsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400 py-6">Memuat modul Academics...</p>}>
      <AcademicsContent />
    </Suspense>
  );
}

function AcademicsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as "courses" | "attendance" | "notes") || "courses";

  const { currentSemesterId } = useSemesters();
  const [tab, setTab] = useState<"courses" | "attendance" | "notes">(initialTab);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyCourseForm);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as "courses" | "attendance" | "notes";
    if (tabParam && (tabParam === "courses" || tabParam === "attendance" || tabParam === "notes")) {
      setTab(tabParam);
    }
  }, [searchParams]);

  async function loadCourses() {
    setLoading(true);
    let query = supabase
      .from("courses")
      .select("*")
      .order("day_of_week", { ascending: true, nullsFirst: false });

    if (currentSemesterId) {
      query = query.eq("semester_id", currentSemesterId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Gagal memuat mata kuliah:", error);
      alert(`Gagal memuat mata kuliah: ${error.message}`);
      setCourses([]);
    } else {
      setCourses((data as Course[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  const totalSks = useMemo(
    () => courses.reduce((acc, c) => acc + (c.credits || 0), 0),
    [courses]
  );

  function openCreateCourse() {
    setForm(emptyCourseForm);
    setModalOpen(true);
  }

  function openEditCourse(c: Course) {
    setForm({
      id: c.id,
      name: c.name,
      code: c.code ?? "",
      credits: (c.credits ?? 3).toString(),
      lecturer: c.lecturer ?? "",
      day_of_week: (c.day_of_week ?? 1).toString(),
      start_time: c.start_time ? c.start_time.slice(0, 5) : "",
      end_time: c.end_time ? c.end_time.slice(0, 5) : "",
      room: c.room ?? "",
      color: c.color || "indigo",
      elearning_url: c.elearning_url ?? "",
      whatsapp_group_url: c.whatsapp_group_url ?? "",
      total_meetings: (c.total_meetings ?? 14).toString(),
      absent_count: (c.absent_count ?? 0).toString(),
      target_grade: c.target_grade || "A",
    });
    setModalOpen(true);
  }

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSemesterId) {
      alert("Pilih semester aktif terlebih dahulu di sidebar.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      credits: Number(form.credits) || 3,
      lecturer: form.lecturer.trim() || null,
      day_of_week: Number(form.day_of_week) || 1,
      start_time: form.start_time ? `${form.start_time}:00` : null,
      end_time: form.end_time ? `${form.end_time}:00` : null,
      room: form.room.trim() || null,
      color: form.color || "indigo",
      elearning_url: form.elearning_url.trim() || null,
      whatsapp_group_url: form.whatsapp_group_url.trim() || null,
      total_meetings: Number(form.total_meetings) || 14,
      absent_count: Number(form.absent_count) || 0,
      target_grade: form.target_grade.trim() || "A",
      semester_id: currentSemesterId,
    };

    if (form.id) {
      const { error } = await supabase.from("courses").update(payload).eq("id", form.id);
      if (error) {
        alert(`Gagal memperbarui mata kuliah: ${error.message}`);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }
      const { error } = await supabase.from("courses").insert({ ...payload, user_id: user.id });
      if (error) {
        alert(`Gagal menambahkan mata kuliah: ${error.message}`);
        return;
      }
    }

    setModalOpen(false);
    loadCourses();
  }

  async function removeCourse(id: string) {
    if (!confirm("Hapus mata kuliah ini? Data tugas dan catatan terkait akan dilepas dari matkul ini.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus mata kuliah: ${error.message}`);
      return;
    }
    loadCourses();
  }

  async function changeAbsent(courseId: string, currentCount: number, delta: number) {
    const nextCount = Math.max(0, currentCount + delta);
    const { error } = await supabase
      .from("courses")
      .update({ absent_count: nextCount })
      .eq("id", courseId);

    if (error) {
      alert(`Gagal memperbarui presensi: ${error.message}`);
      return;
    }

    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, absent_count: nextCount } : c))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-4">
        <div>
          <PageHeader
            title="Academics & SIMERU"
            description="Jadwal perkuliahan resmi, kendali presensi 75% UAD, dan rangkuman materi kuliah."
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
            <GraduationCap size={15} />
            <span>{totalSks} Total SKS Aktif</span>
          </div>
          {tab === "courses" && (
            <Button onClick={openCreateCourse}>
              <Plus size={15} /> Tambah Mata Kuliah
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex w-fit rounded-lg bg-zinc-100 p-1 text-xs sm:text-sm font-medium">
        <button
          onClick={() => setTab("courses")}
          className={`rounded-md px-3.5 py-1.5 transition ${
            tab === "courses" ? "bg-white text-zinc-900 shadow-xs font-semibold" : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Jadwal & Mata Kuliah
        </button>
        <button
          onClick={() => setTab("attendance")}
          className={`rounded-md px-3.5 py-1.5 transition flex items-center gap-1.5 ${
            tab === "attendance" ? "bg-white text-zinc-900 shadow-xs font-semibold" : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <ShieldAlert size={14} className="text-amber-500" />
          Radar Presensi 75%
        </button>
        <button
          onClick={() => setTab("notes")}
          className={`rounded-md px-3.5 py-1.5 transition flex items-center gap-1.5 ${
            tab === "notes" ? "bg-white text-zinc-900 shadow-xs font-semibold" : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <BookOpen size={14} />
          Catatan Kuliah
        </button>
      </div>

      {/* TAB 1: COURSES & SCHEDULE */}
      {tab === "courses" && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Memuat daftar mata kuliah...</p>
          ) : courses.length === 0 ? (
            <EmptyState text="Belum ada mata kuliah yang terdaftar. Tambahkan mata kuliah semester ini sesuai KRS/SIMERU." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => {
                const dayObj = DAYS.find((d) => d.id === course.day_of_week);
                const colorObj = COLORS.find((c) => c.id === course.color) || COLORS[0];
                const safeElearning = sanitizeUrl(course.elearning_url) || "https://elearning.uad.ac.id";
                const safeWa = sanitizeUrl(course.whatsapp_group_url);
                const maxAbsent = Math.floor((course.total_meetings || 14) * 0.25);
                const remaining = maxAbsent - (course.absent_count || 0);

                return (
                  <Card key={course.id} className="flex flex-col justify-between border-t-4 hover:shadow-md transition">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${colorObj.bg} ${colorObj.text}`}>
                            {course.credits} SKS
                          </span>
                          {course.code && (
                            <span className="text-[11px] font-mono text-zinc-400 uppercase">
                              {course.code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditCourse(course)}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                            title="Edit Mata Kuliah"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeCourse(course.id)}
                            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                            title="Hapus Mata Kuliah"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-zinc-900 leading-snug mb-1">
                        {course.name}
                      </h3>

                      <div className="space-y-1 text-xs text-zinc-500 mb-3">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-zinc-400 shrink-0" />
                          <span className="truncate">{course.lecturer || "Dosen belum ditentukan"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-zinc-400 shrink-0" />
                          <span>{dayObj ? dayObj.label : "Jadwal belum diatur"}</span>
                          {course.start_time && (
                            <span className="flex items-center gap-1 text-zinc-700 font-medium">
                              <Clock size={11} className="ml-1 text-zinc-400" />
                              {course.start_time.slice(0, 5)} - {course.end_time ? course.end_time.slice(0, 5) : "?"}
                            </span>
                          )}
                        </div>
                        {course.room && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-zinc-400 shrink-0" />
                            <span className="truncate">{course.room}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-3 mt-1 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500 text-[11px]">Presensi (Maks {maxAbsent}x):</span>
                        <span
                          className={`font-semibold text-[11px] ${
                            remaining < 0
                              ? "text-red-600"
                              : remaining === 0
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          {course.absent_count}x Alfa ({remaining <= 0 ? "Kritis" : `Sisa ${remaining}x`})
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={safeElearning}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-center text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition inline-flex items-center justify-center gap-1"
                        >
                          <ExternalLink size={12} /> E-Learning
                        </a>
                        {safeWa && (
                          <a
                            href={safeWa}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-center text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition inline-flex items-center justify-center gap-1"
                            title="Grup WhatsApp Kelas"
                          >
                            <MessageCircle size={13} /> WA
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE 75% RADAR */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Standar Ambang Presensi 75% UAD
                </h3>
                <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
                  Berdasarkan regulasi akademik, mahasiswa wajib memenuhi minimal 75% kehadiran untuk berhak mengikuti Ujian Akhir Semester (UAS). Pada standar 14 pertemuan tatap muka, batas toleransi izin/sakit/alfa maksimal adalah <strong>3 pertemuan</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const maxAbsent = Math.floor((c.total_meetings || 14) * 0.25);
              const remaining = maxAbsent - (c.absent_count || 0);
              const isDanger = remaining < 0;
              const isWarning = remaining === 0 || remaining === 1;

              return (
                <Card key={c.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-zinc-900">{c.name}</p>
                      <p className="text-[11px] text-zinc-400">{c.credits} SKS • {c.lecturer || "Dosen"}</p>
                    </div>

                    <Badge color={isDanger ? "red" : isWarning ? "amber" : "emerald"}>
                      {isDanger ? "Cekal UAS" : isWarning ? `Waspada (${remaining} sisa)` : "Aman"}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-medium">
                      <span className="text-zinc-500">
                        Absen Terpakai: {c.absent_count} / {maxAbsent} kali
                      </span>
                      <span className={isDanger ? "text-red-600 font-bold" : "text-zinc-600"}>
                        {Math.max(0, Math.round(((c.total_meetings - c.absent_count) / c.total_meetings) * 100))}% Kehadiran
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full transition-all ${
                          isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (c.absent_count / maxAbsent) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
                    <span className="text-zinc-400 text-[11px]">Catat Alfa/Izin:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => changeAbsent(c.id, c.absent_count, -1)}
                        disabled={c.absent_count <= 0}
                        className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 disabled:opacity-40"
                      >
                        -1
                      </button>
                      <span className="w-5 text-center font-bold text-zinc-800 text-xs">
                        {c.absent_count}
                      </span>
                      <button
                        onClick={() => changeAbsent(c.id, c.absent_count, 1)}
                        className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold text-white hover:bg-zinc-900"
                      >
                        +1
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: NOTES INTEGRATION */}
      {tab === "notes" && <AcademicNotesTab courses={courses} />}

      {/* MODAL TAMBAH / EDIT MATA KULIAH */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? "Edit Mata Kuliah" : "Tambah Mata Kuliah Baru"}
      >
        <form onSubmit={saveCourse} className="max-h-[75vh] space-y-3.5 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field label="Nama Mata Kuliah">
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rekayasa Perangkat Lunak"
                />
              </Field>
            </div>
            <div>
              <Field label="Kode Matkul">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="TIF101"
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Field label="Bobot SKS">
                <Input
                  type="number"
                  min="1"
                  max="6"
                  required
                  value={form.credits}
                  onChange={(e) => setForm({ ...form, credits: e.target.value })}
                />
              </Field>
            </div>
            <div>
              <Field label="Target Nilai">
                <Select
                  value={form.target_grade}
                  onChange={(e) => setForm({ ...form, target_grade: e.target.value })}
                >
                  <option value="A">A (4.00)</option>
                  <option value="A-">A- (3.75)</option>
                  <option value="B+">B+ (3.25)</option>
                  <option value="B">B (3.00)</option>
                </Select>
              </Field>
            </div>
            <div>
              <Field label="Warna Identitas">
                <Select
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                >
                  {COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <Field label="Dosen Pengampu">
            <Input
              value={form.lecturer}
              onChange={(e) => setForm({ ...form, lecturer: e.target.value })}
              placeholder="Nama dosen dan gelar"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Field label="Hari Kuliah">
                <Select
                  value={form.day_of_week}
                  onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                >
                  {DAYS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div>
              <Field label="Jam Mulai">
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </Field>
            </div>
            <div>
              <Field label="Jam Selesai">
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ruang Kuliah / Lab">
              <Input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="Kampus 4, Lab RPL 3.02"
              />
            </Field>
            <Field label="Jumlah Alfa Saat Ini">
              <Input
                type="number"
                min="0"
                max="14"
                value={form.absent_count}
                onChange={(e) => setForm({ ...form, absent_count: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Link E-Learning Moodle">
            <Input
              value={form.elearning_url}
              onChange={(e) => setForm({ ...form, elearning_url: e.target.value })}
              placeholder="https://elearning.uad.ac.id/course/view.php?id=..."
            />
          </Field>

          <Field label="Link Grup WhatsApp Kelas">
            <Input
              value={form.whatsapp_group_url}
              onChange={(e) => setForm({ ...form, whatsapp_group_url: e.target.value })}
              placeholder="https://chat.whatsapp.com/..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Mata Kuliah
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
