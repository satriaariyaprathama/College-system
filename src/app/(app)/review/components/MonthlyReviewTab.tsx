"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, EmptyState, Field, Modal, Textarea } from "@/components/ui";
import type { MonthlyReview } from "@/lib/types";
import { getMonthStart, formatMonthLabel } from "@/lib/date";
import { Plus, Pencil } from "lucide-react";

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
      const { data: { user }, error: userError } =
        await supabase.auth.getUser();

      if (userError || !user) {
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
                    {formatMonthLabel(item.month_start)}
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
