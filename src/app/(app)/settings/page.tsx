"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import { Badge, Button, Card, Field, Input, Modal, PageHeader } from "@/components/ui";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

const emptyForm = {
  id: "" as string | null,
  academic_year: "",
  semester_number: "1",
  label: "",
  is_current: false,
  start_date: "",
  end_date: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { semesters, refresh, setCurrentSemesterId } = useSemesters();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(s: (typeof semesters)[number]) {
    setForm({
      id: s.id,
      academic_year: s.academic_year,
      semester_number: s.semester_number.toString(),
      label: s.label ?? "",
      is_current: s.is_current,
      start_date: s.start_date ?? "",
      end_date: s.end_date ?? "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      academic_year: form.academic_year,
      semester_number: Number(form.semester_number),
      label: form.label || null,
      is_current: form.is_current,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    if (form.is_current) {
      const { error: resetCurrentError } = await supabase
        .from("semesters")
        .update({ is_current: false })
        .neq("id", form.id || "00000000-0000-0000-0000-000000000000");
      if (resetCurrentError) {
        alert(`Gagal mereset status semester aktif: ${resetCurrentError.message}`);
        return;
      }
    }

    if (form.id) {
      const { error } = await supabase.from("semesters").update(payload).eq("id", form.id);
      if (error) {
        alert(`Gagal memperbarui semester: ${error.message}`);
        return;
      }
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }
      const { error } = await supabase.from("semesters").insert({ ...payload, user_id: user.id });
      if (error) {
        alert(`Gagal menambahkan semester: ${error.message}`);
        return;
      }
    }
    setModalOpen(false);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Hapus semester ini? Data terkait (task, notes, dsb) tidak ikut terhapus tetapi akan lepas dari semester ini.")) return;
    const { error } = await supabase.from("semesters").delete().eq("id", id);
    if (error) {
      alert(`Gagal menghapus semester: ${error.message}`);
      return;
    }
    refresh();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div>
      <PageHeader title="Settings" description="Kelola akun dan daftar semester." />

      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Akun</p>
        <p className="mt-1 text-sm text-zinc-700">{email}</p>
        <Button variant="secondary" className="mt-3" onClick={handleLogout}>
          Logout
        </Button>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Semester</p>
        <Button onClick={openCreate}>
          <Plus size={15} /> Tambah Semester
        </Button>
      </div>

      <div className="space-y-2">
        {semesters.map((s) => (
          <Card key={s.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {s.is_current && <Star size={14} className="text-amber-500" fill="currentColor" />}
              <div>
                <p className="text-sm font-medium text-zinc-900">{s.label || `${s.academic_year} · Semester ${s.semester_number}`}</p>
                <p className="text-xs text-zinc-500">
                  {s.start_date ?? "?"} — {s.end_date ?? "?"}
                </p>
              </div>
              {s.is_current && <Badge color="indigo">current</Badge>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setCurrentSemesterId(s.id);
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                Pilih
              </button>
              <button onClick={() => openEdit(s)} className="text-zinc-400 hover:text-zinc-700">
                <Pencil size={15} />
              </button>
              <button onClick={() => remove(s.id)} className="text-zinc-400 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            </div>
          </Card>
        ))}
        {semesters.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-400">
            Belum ada semester. Tambahkan semester pertama Anda, mis. &quot;2026/2027 — Semester 1&quot;.
          </p>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "Edit Semester" : "Semester Baru"}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Academic Year">
              <Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2026/2027" required />
            </Field>
            <Field label="Semester Ke-">
              <Input
                type="number"
                min={1}
                max={14}
                value={form.semester_number}
                onChange={(e) => setForm({ ...form, semester_number: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="Label (opsional)">
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="mis. Semester 1 - Ganjil" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
            Jadikan semester aktif saat ini
          </label>
          <div className="flex justify-end pt-2">
            <Button type="submit">Simpan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
