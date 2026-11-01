"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Button, Card, EmptyState, Field, Modal, Textarea } from "@/components/ui";
import type { SemesterReview } from "@/lib/types";
import { Plus, Pencil } from "lucide-react";

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

export default function SemesterReviewTab() {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        .from("semester_reviews")
        .upsert(
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
