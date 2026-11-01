"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/components/ui";
import type { AcademicEvent, DpaGuidance } from "@/lib/types";
import { formatLocalDateKey, formatMonthLabel } from "@/lib/date";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarCheck2,
  Calendar as CalendarIcon,
  Link as LinkIcon,
  FileCheck,
} from "lucide-react";

const TYPES = [
  "Semua",
  "UTS",
  "UAS",
  "KRS",
  "Pembayaran",
  "Libur",
  "Administratif",
  "Lainnya",
];

const DEFAULT_DPA_TOPICS: Record<number, string> = {
  1: "Perwalian KRS & Rencana Studi Awal Semester",
  2: "Evaluasi Tengah Semester (Pasca-UTS) & Target SKS",
  3: "Evaluasi Akhir Semester, Hasil UAS & Refleksi IPK",
};

const emptyEventForm = {
  id: "" as string | null,
  name: "",
  type: "Lainnya",
  start_date: "",
  end_date: "",
  notes: "",
  source_link: "",
};

function AcademicCalendar({
  items,
  month,
  setMonth,
}: {
  items: AcademicEvent[];
  month: Date;
  setMonth: (date: Date) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function dateKey(day: number) {
    const m = String(monthIndex + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  }

  function hasEvent(day: number) {
    const key = dateKey(day);
    return items.some((event) => {
      const start = event.start_date;
      const end = event.end_date ?? event.start_date;
      return key >= start && key <= end;
    });
  }

  const todayKey = formatLocalDateKey(new Date());

  return (
    <Card className="!p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
          className="rounded-lg p-1.5 hover:bg-zinc-100"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft size={17} />
        </button>

        <p className="text-sm font-semibold text-zinc-900">
          {formatMonthLabel(month)}
        </p>

        <button
          onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
          className="rounded-lg p-1.5 hover:bg-zinc-100"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-400">
        {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={index} className="min-h-10 rounded-lg" />;
          }

          const event = hasEvent(day);
          const isToday = dateKey(day) === todayKey;

          return (
            <div
              key={day}
              className={`flex min-h-10 flex-col items-center justify-center rounded-lg border text-xs ${
                isToday
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-zinc-100 bg-white"
              }`}
            >
              <span
                className={`font-medium ${
                  isToday ? "text-indigo-700" : "text-zinc-700"
                }`}
              >
                {day}
              </span>

              {event && (
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
        Ada milestone akademik
      </div>
    </Card>
  );
}

export default function CalendarDpaTab() {
  const supabase = createClient();
  const { currentSemesterId } = useSemesters();

  // DPA Guidance state
  const [dpaList, setDpaList] = useState<DpaGuidance[]>([]);
  const [dpaModalOpen, setDpaModalOpen] = useState(false);
  const [editingDpa, setEditingDpa] = useState<{
    meeting_number: number;
    guidance_date: string;
    topic: string;
    notes: string;
    is_completed: boolean;
  }>({
    meeting_number: 1,
    guidance_date: "",
    topic: "",
    notes: "",
    is_completed: false,
  });

  // Academic Timeline state
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  async function loadData() {
    setLoading(true);

    let eventQuery = supabase
      .from("academic_events")
      .select("*")
      .order("start_date", { ascending: true });

    let dpaQuery = supabase
      .from("dpa_guidance")
      .select("*")
      .order("meeting_number", { ascending: true });

    if (currentSemesterId) {
      eventQuery = eventQuery.eq("semester_id", currentSemesterId);
      dpaQuery = dpaQuery.eq("semester_id", currentSemesterId);
    }

    const [{ data: eventData, error: eventErr }, { data: dpaData, error: dpaErr }] = await Promise.all([
      eventQuery,
      dpaQuery,
    ]);

    if (eventErr) console.error("Gagal memuat academic events:", eventErr);
    if (dpaErr) console.error("Gagal memuat DPA guidance:", dpaErr);

    setEvents((eventData as AcademicEvent[]) ?? []);
    setDpaList((dpaData as DpaGuidance[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSemesterId]);

  // DPA handlers
  async function toggleDpaComplete(meetingNumber: number) {
    if (!currentSemesterId) {
      alert("Pilih semester aktif terlebih dahulu di header.");
      return;
    }

    const existing = dpaList.find((d) => d.meeting_number === meetingNumber);
    const newCompleted = !existing?.is_completed;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("Sesi login berakhir. Silakan login kembali.");
      return;
    }

    const { error } = await supabase.from("dpa_guidance").upsert(
      {
        user_id: user.id,
        semester_id: currentSemesterId,
        meeting_number: meetingNumber,
        topic: existing?.topic || DEFAULT_DPA_TOPICS[meetingNumber],
        guidance_date:
          existing?.guidance_date || formatLocalDateKey(new Date()),
        notes: existing?.notes || null,
        is_completed: newCompleted,
      },
      { onConflict: "user_id,semester_id,meeting_number" }
    );

    if (error) {
      alert(`Gagal memperbarui status DPA: ${error.message}`);
      return;
    }

    loadData();
  }

  function openEditDpa(meetingNumber: number) {
    const existing = dpaList.find((d) => d.meeting_number === meetingNumber);
    setEditingDpa({
      meeting_number: meetingNumber,
      guidance_date: existing?.guidance_date ?? formatLocalDateKey(new Date()),
      topic: existing?.topic ?? DEFAULT_DPA_TOPICS[meetingNumber],
      notes: existing?.notes ?? "",
      is_completed: existing?.is_completed ?? false,
    });
    setDpaModalOpen(true);
  }

  async function saveDpa(e: React.FormEvent) {
    e.preventDefault();
    if (!currentSemesterId) {
      alert("Pilih semester aktif terlebih dahulu.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      alert("Sesi login berakhir. Silakan login kembali.");
      return;
    }

    const { error } = await supabase.from("dpa_guidance").upsert(
      {
        user_id: user.id,
        semester_id: currentSemesterId,
        meeting_number: editingDpa.meeting_number,
        topic: editingDpa.topic.trim(),
        guidance_date: editingDpa.guidance_date || null,
        notes: editingDpa.notes.trim() || null,
        is_completed: editingDpa.is_completed,
      },
      { onConflict: "user_id,semester_id,meeting_number" }
    );

    if (error) {
      alert(`Gagal menyimpan bimbingan DPA: ${error.message}`);
      return;
    }

    setDpaModalOpen(false);
    loadData();
  }

  // Academic Events handlers
  function openCreateEvent() {
    setEventForm(emptyEventForm);
    setEventModalOpen(true);
  }

  function openEditEvent(ev: AcademicEvent) {
    setEventForm({
      id: ev.id,
      name: ev.name,
      type: ev.type,
      start_date: ev.start_date,
      end_date: ev.end_date ?? "",
      notes: ev.notes ?? "",
      source_link: ev.source_link ?? "",
    });
    setEventModalOpen(true);
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: eventForm.name,
      type: eventForm.type,
      start_date: eventForm.start_date,
      end_date: eventForm.end_date || null,
      notes: eventForm.notes || null,
      source_link: eventForm.source_link || null,
      semester_id: currentSemesterId,
    };

    if (eventForm.id) {
      const { error } = await supabase
        .from("academic_events")
        .update(payload)
        .eq("id", eventForm.id);
      if (error) {
        alert(`Gagal memperbarui event: ${error.message}`);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Sesi login berakhir. Silakan login kembali.");
        return;
      }
      const { error } = await supabase
        .from("academic_events")
        .insert({ ...payload, user_id: user.id });
      if (error) {
        alert(`Gagal menambahkan event: ${error.message}`);
        return;
      }
    }

    setEventModalOpen(false);
    loadData();
  }

  async function removeEvent(id: string) {
    if (!confirm("Hapus milestone akademik ini?")) return;
    const { error } = await supabase
      .from("academic_events")
      .delete()
      .eq("id", id);
    if (error) {
      alert(`Gagal menghapus event: ${error.message}`);
      return;
    }
    loadData();
  }

  const today = formatLocalDateKey(new Date());

  const completedDpaCount = dpaList.filter((d) => d.is_completed).length;

  const filteredEvents =
    typeFilter === "Semua"
      ? events
      : events.filter((ev) => ev.type === typeFilter);

  return (
    <div className="space-y-8">
      {/* SECTION 1: 3x DPA Guidance Tracker */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-zinc-900">
                Milestone Bimbingan DPA (Dosen Pembimbing Akademik)
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Standar perwalian UAD mewajibkan 3 kali tatap muka per semester:
              Awal Semester (KRS), Tengah Semester (UTS), dan Pasca-UAS.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700">
              Progress: {completedDpaCount} / 3 Selesai
            </span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200">
              <div
                className={`h-full transition-all ${
                  completedDpaCount === 3 ? "bg-emerald-500" : "bg-indigo-600"
                }`}
                style={{
                  width: `${Math.round((completedDpaCount / 3) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((num) => {
            const dpa = dpaList.find((d) => d.meeting_number === num);
            const isDone = dpa?.is_completed ?? false;
            const topic = dpa?.topic || DEFAULT_DPA_TOPICS[num];

            return (
              <Card
                key={num}
                className={`flex flex-col justify-between transition border-2 ${
                  isDone
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-800">
                      Bimbingan #{num}
                    </span>
                    <button
                      onClick={() => toggleDpaComplete(num)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition ${
                        isDone
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      <CheckCircle2 size={13} />
                      {isDone ? "Selesai" : "Tandai Selesai"}
                    </button>
                  </div>

                  <h3 className="mt-2 text-sm font-semibold text-zinc-900 leading-snug">
                    {topic}
                  </h3>

                  <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                    <CalendarIcon size={13} className="text-zinc-400" />
                    <span>
                      {dpa?.guidance_date
                        ? new Date(
                            `${dpa.guidance_date}T00:00:00`
                          ).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Tanggal belum dicatat"}
                    </span>
                  </div>

                  {dpa?.notes && (
                    <div className="mt-2.5 rounded-md bg-zinc-50 p-2 border border-zinc-100 text-xs text-zinc-600">
                      <span className="font-semibold text-zinc-700 block mb-0.5">
                        Catatan Dosen:
                      </span>
                      <p className="line-clamp-3">{dpa.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={() => openEditDpa(num)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                  >
                    <Pencil size={12} /> Edit Detail & Catatan
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Academic Timeline & Events */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="text-indigo-600" size={20} />
              <h2 className="text-base font-bold text-zinc-900">
                Kalender & Milestone Akademik Semester
              </h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Jadwal UTS, UAS, KRS, pembayaran SPP, dan hari libur resmi UAD.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="!w-auto !text-xs !py-1.5"
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "Semua" ? "Semua Tipe" : t}
                </option>
              ))}
            </Select>

            <Button onClick={openCreateEvent} className="!text-xs !py-1.5">
              <Plus size={14} /> Milestone Baru
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400">Memuat milestone akademik...</p>
        ) : events.length === 0 ? (
          <EmptyState text="Belum ada milestone akademik pada semester ini." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <AcademicCalendar
                items={events}
                month={calendarMonth}
                setMonth={setCalendarMonth}
              />
            </div>

            <div className="lg:col-span-7">
              <div className="relative space-y-2.5 border-l-2 border-zinc-100 pl-4">
                {filteredEvents.map((ev) => {
                  const past = ev.end_date
                    ? ev.end_date < today
                    : ev.start_date < today;

                  return (
                    <div key={ev.id} className="relative">
                      <span
                        className={`absolute -left-[23px] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                          past ? "bg-zinc-300" : "bg-indigo-600"
                        }`}
                      />
                      <Card className="flex items-start justify-between gap-3 !p-3.5 hover:border-zinc-300 transition">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900">
                              {ev.name}
                            </p>
                            <Badge color={past ? "zinc" : "indigo"}>
                              {ev.type}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-zinc-500 flex items-center gap-1.5">
                            <CalendarIcon size={12} className="text-zinc-400" />
                            {ev.start_date}
                            {ev.end_date ? ` s.d. ${ev.end_date}` : ""}
                          </p>
                          {ev.notes && (
                            <p className="mt-1.5 text-xs text-zinc-600">
                              {ev.notes}
                            </p>
                          )}
                          {ev.source_link && (
                            <a
                              href={ev.source_link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                            >
                              <LinkIcon size={11} /> Sumber / Pengumuman Resmi
                            </a>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          <button
                            onClick={() => openEditEvent(ev)}
                            className="p-1 text-zinc-400 hover:text-zinc-700"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => removeEvent(ev.id)}
                            className="p-1 text-zinc-400 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* DPA Edit Modal */}
      <Modal
        open={dpaModalOpen}
        onClose={() => setDpaModalOpen(false)}
        title={`Bimbingan DPA #${editingDpa.meeting_number}`}
      >
        <form onSubmit={saveDpa} className="space-y-3">
          <Field label="Topik Bimbingan">
            <Input
              value={editingDpa.topic}
              onChange={(e) =>
                setEditingDpa({ ...editingDpa, topic: e.target.value })
              }
              placeholder="Contoh: Perwalian KRS Awal Semester"
              required
            />
          </Field>

          <Field label="Tanggal Bimbingan">
            <Input
              type="date"
              value={editingDpa.guidance_date}
              onChange={(e) =>
                setEditingDpa({ ...editingDpa, guidance_date: e.target.value })
              }
            />
          </Field>

          <Field label="Catatan / Masukan Dosen Pembimbing (DPA)">
            <Textarea
              rows={4}
              value={editingDpa.notes}
              onChange={(e) =>
                setEditingDpa({ ...editingDpa, notes: e.target.value })
              }
              placeholder="Saran DPA mengenai mata kuliah pilihan, target IPK, atau kendala belajar..."
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="dpa_completed_check"
              checked={editingDpa.is_completed}
              onChange={(e) =>
                setEditingDpa({
                  ...editingDpa,
                  is_completed: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="dpa_completed_check"
              className="text-xs font-medium text-zinc-800"
            >
              Tandai bimbingan ini telah selesai dilaksanakan
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDpaModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit">
              <FileCheck size={14} /> Simpan Bimbingan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Event Add/Edit Modal */}
      <Modal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title={eventForm.id ? "Edit Milestone Akademik" : "Milestone Baru"}
      >
        <form onSubmit={saveEvent} className="space-y-3">
          <Field label="Nama Event / Milestone">
            <Input
              value={eventForm.name}
              onChange={(e) =>
                setEventForm({ ...eventForm, name: e.target.value })
              }
              placeholder="Contoh: Ujian Tengah Semester (UTS)"
              required
            />
          </Field>

          <Field label="Tipe">
            <Select
              value={eventForm.type}
              onChange={(e) =>
                setEventForm({ ...eventForm, type: e.target.value })
              }
            >
              {TYPES.filter((t) => t !== "Semua").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Mulai">
              <Input
                type="date"
                value={eventForm.start_date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, start_date: e.target.value })
                }
                required
              />
            </Field>

            <Field label="Tanggal Selesai (Opsional)">
              <Input
                type="date"
                value={eventForm.end_date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, end_date: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Catatan / Keterangan">
            <Textarea
              rows={2}
              value={eventForm.notes}
              onChange={(e) =>
                setEventForm({ ...eventForm, notes: e.target.value })
              }
              placeholder="Syarat presensi minimal, berkas yang harus disiapkan..."
            />
          </Field>

          <Field label="Link Sumber / Pengumuman Resmi">
            <Input
              value={eventForm.source_link}
              onChange={(e) =>
                setEventForm({ ...eventForm, source_link: e.target.value })
              }
              placeholder="https://..."
            />
          </Field>

          <div className="flex justify-between pt-2">
            {eventForm.id ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  removeEvent(eventForm.id!);
                  setEventModalOpen(false);
                }}
              >
                <Trash2 size={14} /> Hapus
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit">Simpan Milestone</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
