"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, EmptyState, Field, Modal, PageHeader, Textarea } from "@/components/ui";
import type { WeeklyReview, SemesterReview } from "@/lib/types";
import { Plus, Pencil } from "lucide-react";

type MonthlyReview = {
  id: string;
  semester_id: string | null;
  month_start: string;
  academic_done: string | null;
  academic_pending: string | null;
  academic_unclear: string | null;
  learning_summary: string | null;
  project_progress: string | null;
  problems: string | null;
  improvements: string | null;
  next_focus: string | null;
};

function localDateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function mondayOf(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);

  date.setDate(diff);

  return localDateKey(date);
}

function monthStartOf(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

const emptyWeekly = {
  id: "" as string | null,
  week_start: mondayOf(new Date()),
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

const emptyMonthly = {
  id: "" as string | null,
  month_start: monthStartOf(new Date()),
  academic_done: "",
  academic_pending: "",
  academic_unclear: "",
  learning_summary: "",
  project_progress: "",
  problems: "",
  improvements: "",
  next_focus: "",
};

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

export default function ReviewPage() {
  const [tab, setTab] = useState<"weekly" | "monthly" | "semester">("weekly");

  return (
    <div>
      <PageHeader
        title="Review"
        description="Evaluasi mingguan, bulanan, dan akhir semester."
      />

      <div className="mb-5 flex w-fit rounded-lg bg-zinc-100 p-1 text-sm">
        {(["weekly", "monthly", "semester"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? "bg-white shadow-sm" : "text-zinc-500"
            }`}
          >
            {t === "weekly"
              ? "Weekly Review"
              : t === "monthly"
                ? "Monthly Review"
                : "Semester Review"}
          </button>
        ))}
      </div>

      {tab === "weekly" ? (
        <WeeklyTab />
      ) : tab === "monthly" ? (
        <MonthlyTab />
      ) : (
        <SemesterTab />
      )}
    </div>
  );
}

function WeeklyTab() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<WeeklyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyWeekly);
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    mondayOf(new Date())
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
        .from("weekly_reviews")
        .update(payload)
        .eq("id", form.id);

      error = result.error;
    } else {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        alert(
          `Gagal mendapatkan user: ${
            userError?.message ?? "User tidak ditemukan."
          }`
        );
        return;
      }

      const result = await supabase
        .from("weekly_reviews")
        .upsert(
          {
            ...payload,
            user_id: userData.user.id,
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

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={openCreate}>
          <Plus size={15} /> Review Minggu Ini
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-medium text-zinc-700">
            Pilih minggu
          </p>
          <input
            type="date"
            value={selectedWeekStart}
            onChange={(e) => {
              if (!e.target.value) return;
              setSelectedWeekStart(mondayOf(new Date(`${e.target.value}T00:00:00`)));
            }}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-400">
            Minggu dimulai setiap Senin.
          </p>
        </div>


      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : !selectedWeek ? (
        <EmptyState text="Belum ada weekly review untuk minggu ini." />
      ) : (
        <div className="space-y-2">
          {[selectedWeek].map((w) => (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    Minggu {w.week_start}
                  </p>
                  {w.next_priorities && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Prioritas: {w.next_priorities}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openEdit(w)}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Weekly Review"
      >
        <form
          onSubmit={save}
          className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        >
          <Field label="Minggu Mulai (Senin)">
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

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Academic
          </p>

          <Field label="Apa yang selesai?">
            <Textarea
              rows={2}
              value={form.academic_done}
              onChange={(e) =>
                setForm({ ...form, academic_done: e.target.value })
              }
            />
          </Field>

          <Field label="Apa yang tertunda?">
            <Textarea
              rows={2}
              value={form.academic_pending}
              onChange={(e) =>
                setForm({ ...form, academic_pending: e.target.value })
              }
            />
          </Field>

          <Field label="Apa yang belum dipahami?">
            <Textarea
              rows={2}
              value={form.academic_unclear}
              onChange={(e) =>
                setForm({ ...form, academic_unclear: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Task
          </p>

          <Field label="Task yang masih terbuka">
            <Textarea
              rows={2}
              value={form.task_open}
              onChange={(e) =>
                setForm({ ...form, task_open: e.target.value })
              }
            />
          </Field>

          <Field label="Deadline terdekat">
            <Textarea
              rows={1}
              value={form.task_next_deadline}
              onChange={(e) =>
                setForm({ ...form, task_next_deadline: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Self-Learning
          </p>

          <Field label="Apa yang dipelajari?">
            <Textarea
              rows={2}
              value={form.learning_what}
              onChange={(e) =>
                setForm({ ...form, learning_what: e.target.value })
              }
            />
          </Field>

          <Field label="Apakah ada progress?">
            <Textarea
              rows={2}
              value={form.learning_progress}
              onChange={(e) =>
                setForm({ ...form, learning_progress: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Project
          </p>

          <Field label="Project apa yang progress?">
            <Textarea
              rows={2}
              value={form.project_progress}
              onChange={(e) =>
                setForm({ ...form, project_progress: e.target.value })
              }
            />
          </Field>

          <Field label="Apa yang terhambat?">
            <Textarea
              rows={2}
              value={form.project_blocked}
              onChange={(e) =>
                setForm({ ...form, project_blocked: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Next Week
          </p>

          <Field label="Prioritas minggu depan">
            <Textarea
              rows={2}
              value={form.next_priorities}
              onChange={(e) =>
                setForm({ ...form, next_priorities: e.target.value })
              }
            />
          </Field>

          <Field label="Hal yang perlu diperbaiki">
            <Textarea
              rows={2}
              value={form.next_improve}
              onChange={(e) =>
                setForm({ ...form, next_improve: e.target.value })
              }
            />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MonthlyTab() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();
  const [items, setItems] = useState<MonthlyReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyMonthly);

  const [selectedMonthStart, setSelectedMonthStart] = useState(() =>
    monthStartOf(new Date())
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
        .from("monthly_reviews")
        .update(payload)
        .eq("id", form.id);

      error = result.error;
    } else {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        alert(
          `Gagal mendapatkan user: ${
            userError?.message ?? "User tidak ditemukan."
          }`
        );
        return;
      }

      const result = await supabase
        .from("monthly_reviews")
        .upsert(
          {
            ...payload,
            user_id: userData.user.id,
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-sm font-medium text-zinc-700">
            Pilih bulan
          </p>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const month = Number(e.target.value);
                setSelectedMonthStart(
                  `${selectedYear}-${String(month).padStart(2, "0")}-01`
                );
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
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
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={openCreate}>
          <Plus size={15} /> Review Bulan Ini
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : !selectedReview ? (
        <EmptyState text="Belum ada monthly review untuk bulan ini." />
      ) : (
        <div className="space-y-2">
          {[selectedReview].map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {monthLabel(item.month_start)}
                  </p>

                  {item.next_focus && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Fokus berikutnya: {item.next_focus}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => openEdit(item)}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Monthly Review"
      >
        <form
          onSubmit={save}
          className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        >
          <Field label="Bulan">
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

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Academic
          </p>

          <Field label="Apa yang tercapai?">
            <Textarea
              rows={2}
              value={form.academic_done}
              onChange={(e) =>
                setForm({ ...form, academic_done: e.target.value })
              }
            />
          </Field>

          <Field label="Apa yang tertunda?">
            <Textarea
              rows={2}
              value={form.academic_pending}
              onChange={(e) =>
                setForm({ ...form, academic_pending: e.target.value })
              }
            />
          </Field>

          <Field label="Apa yang belum dipahami?">
            <Textarea
              rows={2}
              value={form.academic_unclear}
              onChange={(e) =>
                setForm({ ...form, academic_unclear: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Learning
          </p>

          <Field label="Pembelajaran bulan ini">
            <Textarea
              rows={2}
              value={form.learning_summary}
              onChange={(e) =>
                setForm({ ...form, learning_summary: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Project
          </p>

          <Field label="Progress project">
            <Textarea
              rows={2}
              value={form.project_progress}
              onChange={(e) =>
                setForm({ ...form, project_progress: e.target.value })
              }
            />
          </Field>

          <Field label="Masalah atau hambatan">
            <Textarea
              rows={2}
              value={form.problems}
              onChange={(e) =>
                setForm({ ...form, problems: e.target.value })
              }
            />
          </Field>

          <Field label="Hal yang perlu diperbaiki">
            <Textarea
              rows={2}
              value={form.improvements}
              onChange={(e) =>
                setForm({ ...form, improvements: e.target.value })
              }
            />
          </Field>

          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Next Month
          </p>

          <Field label="Fokus bulan berikutnya">
            <Textarea
              rows={2}
              value={form.next_focus}
              onChange={(e) =>
                setForm({ ...form, next_focus: e.target.value })
              }
            />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function SemesterTab() {
  const supabase = createClient();
  const { semesters, currentSemesterId } = useSemesters();
  const [items, setItems] = useState<SemesterReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptySemester);

  async function load() {
    setLoading(true);

    let query = supabase
      .from("semester_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentSemesterId) {
      query = query.eq("semester_id", currentSemesterId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Gagal memuat Semester Review:", error);
      alert(`Gagal memuat Semester Review: ${error.message}`);
      setItems([]);
    } else {
      setItems((data as SemesterReview[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [currentSemesterId]);

  function semesterLabel(id: string) {
    const s = semesters.find((x) => x.id === id);
    return s
      ? s.label || `${s.academic_year} · Smt ${s.semester_number}`
      : "-";
  }

  function openForCurrent() {
    const existing = items.find((r) => r.semester_id === currentSemesterId);

    if (existing) {
      setForm({
        id: existing.id,
        academic_progress: existing.academic_progress ?? "",
        skill_growth: existing.skill_growth ?? "",
        self_learning: existing.self_learning ?? "",
        project_summary: existing.project_summary ?? "",
        portfolio_summary: existing.portfolio_summary ?? "",
        problems: existing.problems ?? "",
        improvements: existing.improvements ?? "",
        next_focus: existing.next_focus ?? "",
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
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        alert(
          `Gagal mendapatkan user: ${
            userError?.message ?? "User tidak ditemukan."
          }`
        );
        return;
      }

      const result = await supabase
        .from("semester_reviews")
        .upsert(
          {
            ...payload,
            user_id: userData.user.id,
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

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button onClick={openForCurrent} disabled={!currentSemesterId}>
          <Plus size={15} /> Review Semester Ini
        </Button>
      </div>

      {!currentSemesterId && (
        <p className="mb-3 text-xs text-amber-600">
          Pilih semester spesifik di sidebar untuk mengisi review semester.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : items.length === 0 ? (
        <EmptyState text="Belum ada semester review." />
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {semesterLabel(r.semester_id)}
                  </p>

                  {r.next_focus && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Fokus berikutnya: {r.next_focus}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setForm({
                      id: r.id,
                      academic_progress: r.academic_progress ?? "",
                      skill_growth: r.skill_growth ?? "",
                      self_learning: r.self_learning ?? "",
                      project_summary: r.project_summary ?? "",
                      portfolio_summary: r.portfolio_summary ?? "",
                      problems: r.problems ?? "",
                      improvements: r.improvements ?? "",
                      next_focus: r.next_focus ?? "",
                    });
                    setModalOpen(true);
                  }}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Semester Review"
      >
        <form
          onSubmit={save}
          className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
        >
          <Field label="Perkembangan Akademik">
            <Textarea
              rows={2}
              value={form.academic_progress}
              onChange={(e) =>
                setForm({ ...form, academic_progress: e.target.value })
              }
            />
          </Field>

          <Field label="Skill yang Berkembang">
            <Textarea
              rows={2}
              value={form.skill_growth}
              onChange={(e) =>
                setForm({ ...form, skill_growth: e.target.value })
              }
            />
          </Field>

          <Field label="Self-Learning">
            <Textarea
              rows={2}
              value={form.self_learning}
              onChange={(e) =>
                setForm({ ...form, self_learning: e.target.value })
              }
            />
          </Field>

          <Field label="Ringkasan Project">
            <Textarea
              rows={2}
              value={form.project_summary}
              onChange={(e) =>
                setForm({ ...form, project_summary: e.target.value })
              }
            />
          </Field>

          <Field label="Ringkasan Portfolio">
            <Textarea
              rows={2}
              value={form.portfolio_summary}
              onChange={(e) =>
                setForm({ ...form, portfolio_summary: e.target.value })
              }
            />
          </Field>

          <Field label="Masalah yang Muncul">
            <Textarea
              rows={2}
              value={form.problems}
              onChange={(e) =>
                setForm({ ...form, problems: e.target.value })
              }
            />
          </Field>

          <Field label="Hal yang Perlu Diperbaiki">
            <Textarea
              rows={2}
              value={form.improvements}
              onChange={(e) =>
                setForm({ ...form, improvements: e.target.value })
              }
            />
          </Field>

          <Field label="Fokus Semester Berikutnya">
            <Textarea
              rows={2}
              value={form.next_focus}
              onChange={(e) =>
                setForm({ ...form, next_focus: e.target.value })
              }
            />
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
