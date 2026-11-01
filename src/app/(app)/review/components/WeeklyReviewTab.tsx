"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, EmptyState, Field, Modal, Textarea } from "@/components/ui";
import type { WeeklyReview } from "@/lib/types";
import { getMondayOfWeek } from "@/lib/date";
import { Plus, Pencil } from "lucide-react";

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
  const [modalOpen, setModalOpen] = useState(false);
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
        .from("weekly_reviews")
        .upsert(
          {
            ...payload,
            user_id: user.id,
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
              setSelectedWeekStart(getMondayOfWeek(new Date(`${e.target.value}T00:00:00`)));
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
