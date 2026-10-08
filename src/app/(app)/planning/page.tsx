"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";

type MonthlyPlan = {
  id?: string;
  semester_id: string | null;
  month_start: string;
  focus: string;
  academic_goals: string;
  project_goals: string;
  priorities: string;
  notes: string;
};

type SemesterPlan = {
  id?: string;
  semester_id: string;
  focus: string;
  academic_goals: string;
  project_goals: string;
  learning_goals: string;
  priorities: string;
  notes: string;
};

export default function PlanningPage() {
  const supabase = createClient();
  const { semesters, currentSemesterId, currentSemester, loading: semesterLoading } = useSemesters();

  const [tab, setTab] = useState<"monthly" | "semester">("monthly");
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSemesterId && currentSemesterId) {
      setSelectedSemesterId(currentSemesterId);
    }
  }, [currentSemesterId, selectedSemesterId]);

  const [monthly, setMonthly] = useState<MonthlyPlan>({
    semester_id: null,
    month_start: "",
    focus: "",
    academic_goals: "",
    project_goals: "",
    priorities: "",
    notes: "",
  });

  const [semester, setSemester] = useState<SemesterPlan>({
    semester_id: "",
    focus: "",
    academic_goals: "",
    project_goals: "",
    learning_goals: "",
    priorities: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [monthStart, setMonthStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });

  const selectedYear = Number(monthStart.slice(0, 4));
  const selectedMonth = Number(monthStart.slice(5, 7));

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

  useEffect(() => {
    setMonthly((prev) => ({
      ...prev,
      semester_id: currentSemesterId,
      month_start: monthStart,
    }));
  }, [currentSemesterId, monthStart]);

  useEffect(() => {
    if (!currentSemesterId) return;

    setSemester((prev) => ({
      ...prev,
      semester_id: currentSemesterId,
    }));
  }, [currentSemesterId]);

  useEffect(() => {
    async function loadPlans() {
      if (!currentSemesterId || !selectedSemesterId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage("");

      const [{ data: monthlyData }, { data: semesterData }] = await Promise.all([
        supabase
          .from("monthly_plans")
          .select("*")
          .eq("semester_id", currentSemesterId)
          .eq("month_start", monthStart)
          .maybeSingle(),

        supabase
          .from("semester_plans")
          .select("*")
          .eq("semester_id", currentSemesterId)
          .maybeSingle(),
      ]);

      if (monthlyData) {
        setMonthly({
          id: monthlyData.id,
          semester_id: monthlyData.semester_id,
          month_start: monthlyData.month_start,
          focus: monthlyData.focus ?? "",
          academic_goals: monthlyData.academic_goals ?? "",
          project_goals: monthlyData.project_goals ?? "",
          priorities: monthlyData.priorities ?? "",
          notes: monthlyData.notes ?? "",
        });
      } else {
        setMonthly({
          semester_id: currentSemesterId,
          month_start: monthStart,
          focus: "",
          academic_goals: "",
          project_goals: "",
          priorities: "",
          notes: "",
        });
      }

      if (semesterData) {
        setSemester({
          id: semesterData.id,
          semester_id: semesterData.semester_id,
          focus: semesterData.focus ?? "",
          academic_goals: semesterData.academic_goals ?? "",
          project_goals: semesterData.project_goals ?? "",
          learning_goals: semesterData.learning_goals ?? "",
          priorities: semesterData.priorities ?? "",
          notes: semesterData.notes ?? "",
        });
      } else {
        setSemester({
          semester_id: currentSemesterId,
          focus: "",
          academic_goals: "",
          project_goals: "",
          learning_goals: "",
          priorities: "",
          notes: "",
        });
      }

      setLoading(false);
    }

    loadPlans();
  }, [currentSemesterId, selectedSemesterId, monthStart, supabase]);

  async function saveMonthly() {
    if (!selectedSemesterId) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("monthly_plans").upsert(
      {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        semester_id: selectedSemesterId,
        month_start: monthStart,
        focus: monthly.focus,
        academic_goals: monthly.academic_goals,
        project_goals: monthly.project_goals,
        priorities: monthly.priorities,
        notes: monthly.notes,
      },
      { onConflict: "user_id,month_start" }
    );

    setSaving(false);

    if (error) {
      setMessage(`Gagal menyimpan: ${error.message}`);
      return;
    }

    setMessage("Monthly Planning tersimpan.");
  }

  async function saveSemester() {
    if (!selectedSemesterId) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("semester_plans").upsert(
      {
        user_id: (await supabase.auth.getUser()).data.user?.id,
        semester_id: selectedSemesterId,
        focus: semester.focus,
        academic_goals: semester.academic_goals,
        project_goals: semester.project_goals,
        learning_goals: semester.learning_goals,
        priorities: semester.priorities,
        notes: semester.notes,
      },
      { onConflict: "user_id,semester_id" }
    );

    setSaving(false);

    if (error) {
      setMessage(`Gagal menyimpan: ${error.message}`);
      return;
    }

    setMessage("Semester Planning tersimpan.");
  }

  if (semesterLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Planning"
          description="Tentukan arah dan target sebelum masuk ke pekerjaan konkret."
        />
        <p className="text-sm text-zinc-500">Loading planning...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning"
        description="Tentukan arah dan target sebelum masuk ke pekerjaan konkret."
      />

      <div className="flex gap-2 overflow-x-auto border-b border-zinc-200">
        <button
          onClick={() => {
            setTab("monthly");
            setMessage("");
          }}
          className={`shrink-0 px-4 py-2 text-sm font-medium ${
            tab === "monthly"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Monthly Planning
        </button>

        <button
          onClick={() => {
            setTab("semester");
            setMessage("");
          }}
          className={`shrink-0 px-4 py-2 text-sm font-medium ${
            tab === "semester"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Semester Planning
        </button>
      </div>

      {tab === "monthly" ? (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Monthly Planning</h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const month = Number(e.target.value);
                    setMonthStart(
                      `${selectedYear}-${String(month).padStart(2, "0")}-01`
                    );
                    setMessage("");
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
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
                    setMonthStart(
                      `${year}-${String(selectedMonth).padStart(2, "0")}-01`
                    );
                    setMessage("");
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <span className="text-sm text-zinc-500">
                  {currentSemester?.label ?? "Semester aktif"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Fokus Bulan</label>
                <textarea
                  value={monthly.focus}
                  onChange={(e) =>
                    setMonthly({ ...monthly, focus: e.target.value })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Target Akademik</label>
                <textarea
                  value={monthly.academic_goals}
                  onChange={(e) =>
                    setMonthly({ ...monthly, academic_goals: e.target.value })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Fokus Project</label>
                <textarea
                  value={monthly.project_goals}
                  onChange={(e) =>
                    setMonthly({ ...monthly, project_goals: e.target.value })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Prioritas Bulan</label>
                <textarea
                  value={monthly.priorities}
                  onChange={(e) =>
                    setMonthly({ ...monthly, priorities: e.target.value })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Catatan</label>
              <textarea
                value={monthly.notes}
                onChange={(e) =>
                  setMonthly({ ...monthly, notes: e.target.value })
                }
                className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveMonthly}
                disabled={saving || !selectedSemesterId}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>

              {message && (
                <span className="text-sm text-zinc-500">{message}</span>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">Semester Planning</h2>

              <div className="mt-2">
                <select
                  value={selectedSemesterId ?? ""}
                  onChange={(e) => {
                    setSelectedSemesterId(e.target.value);
                    setMessage("");
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label || `${s.academic_year} · Smt ${s.semester_number}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Fokus Semester</label>
                <textarea
                  value={semester.focus}
                  onChange={(e) =>
                    setSemester({ ...semester, focus: e.target.value })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Target Akademik</label>
                <textarea
                  value={semester.academic_goals}
                  onChange={(e) =>
                    setSemester({
                      ...semester,
                      academic_goals: e.target.value,
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Target Project</label>
                <textarea
                  value={semester.project_goals}
                  onChange={(e) =>
                    setSemester({
                      ...semester,
                      project_goals: e.target.value,
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Target Pengembangan Pembelajaran</label>
                <textarea
                  value={semester.learning_goals}
                  onChange={(e) =>
                    setSemester({
                      ...semester,
                      learning_goals: e.target.value,
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Prioritas Semester</label>
                <textarea
                  value={semester.priorities}
                  onChange={(e) =>
                    setSemester({
                      ...semester,
                      priorities: e.target.value,
                    })
                  }
                  className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Catatan</label>
              <textarea
                value={semester.notes}
                onChange={(e) =>
                  setSemester({ ...semester, notes: e.target.value })
                }
                className="min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={saveSemester}
                disabled={saving || !selectedSemesterId}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>

              {message && (
                <span className="text-sm text-zinc-500">{message}</span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}









