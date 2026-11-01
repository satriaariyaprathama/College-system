"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Card, EmptyState, Select } from "@/components/ui";
import type { Project, Semester } from "@/lib/types";
import { sanitizeUrl } from "@/lib/utils";
import { Link as LinkIcon, Star } from "lucide-react";

export default function PortfolioShowcaseTab() {
  const supabase = createClient();
  const [items, setItems] = useState<Project[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [filter, setFilter] = useState<"yes" | "maybe" | "all">("yes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: projects }, { data: sems }] = await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .neq("portfolio_status", "no")
          .order("created_at", { ascending: false }),
        supabase.from("semesters").select("*"),
      ]);
      setItems((projects as Project[]) ?? []);
      setSemesters((sems as Semester[]) ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((p) =>
    filter === "all" ? true : p.portfolio_status === filter
  );

  function semesterLabel(id: string | null) {
    const s = semesters.find((x) => x.id === id);
    if (!s) return "-";
    return s.label || `${s.academic_year} · Smt ${s.semester_number}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Star className="text-amber-500" size={17} />
          <p className="text-xs font-semibold text-zinc-700">
            Koleksi karya terbaik yang ditandai layak showcase untuk portofolio magang & karir.
          </p>
        </div>

        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="!w-auto"
        >
          <option value="yes">Status: Portfolio Yes</option>
          <option value="maybe">Status: Maybe</option>
          <option value="all">Semua Koleksi</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 py-8 text-center">Memuat portfolio showcase...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Belum ada karya portfolio. Tandai status portfolio sebagai 'Yes' atau 'Maybe' pada tab Semua Proyek." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const safeLink = sanitizeUrl(p.link);
            return (
              <Card key={p.id} className="flex flex-col justify-between border-t-2 border-indigo-500">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-bold text-zinc-900">{p.name}</p>
                    <Badge color={p.portfolio_status === "yes" ? "emerald" : "amber"}>
                      {p.portfolio_status === "yes" ? "Showcase Ready" : "Draft Portfolio"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium">{semesterLabel(p.semester_id)}</p>
                  {p.description && (
                    <p className="mt-2 text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.related_skill && <Badge>{p.related_skill}</Badge>}
                    {p.category && <Badge color="zinc">{p.category}</Badge>}
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-400">Status: {p.status}</span>
                  {safeLink && (
                    <a
                      href={safeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline text-xs"
                    >
                      <LinkIcon size={12} /> Buka Link
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
