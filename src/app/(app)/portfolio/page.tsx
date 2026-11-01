"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge, Card, EmptyState, PageHeader, Select } from "@/components/ui";
import type { Project, Semester } from "@/lib/types";
import { sanitizeUrl } from "@/lib/utils";
import { Link as LinkIcon } from "lucide-react";

export default function PortfolioPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Project[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [filter, setFilter] = useState<"yes" | "maybe" | "all">("yes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: projects }, { data: sems }] = await Promise.all([
        supabase.from("projects").select("*").neq("portfolio_status", "no").order("created_at", { ascending: false }),
        supabase.from("semesters").select("*"),
      ]);
      setItems((projects as Project[]) ?? []);
      setSemesters((sems as Semester[]) ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = items.filter((p) => (filter === "all" ? true : p.portfolio_status === filter));

  function semesterLabel(id: string | null) {
    const s = semesters.find((x) => x.id === id);
    if (!s) return "-";
    return s.label || `${s.academic_year} · Smt ${s.semester_number}`;
  }

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Kumpulan hasil kerja yang ditandai layak disimpan, diambil dari Projects."
      />

      <div className="mb-4">
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="!w-auto">
          <option value="yes">Portfolio: Yes</option>
          <option value="maybe">Portfolio: Maybe</option>
          <option value="all">Semua</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Memuat...</p>
      ) : filtered.length === 0 ? (
        <EmptyState text="Belum ada item portfolio. Tandai project sebagai 'Yes' atau 'Maybe' di halaman Projects." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((p) => {
            const safeLink = sanitizeUrl(p.link);
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{p.name}</p>
                  <Badge color={p.portfolio_status === "yes" ? "emerald" : "amber"}>{p.portfolio_status}</Badge>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{semesterLabel(p.semester_id)}</p>
                {p.description && <p className="mt-1.5 line-clamp-3 text-xs text-zinc-600">{p.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.related_skill && <Badge>{p.related_skill}</Badge>}
                  {safeLink && (
                    <a href={safeLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                      <LinkIcon size={11} /> link
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-400">
        Kelola item ini dari{" "}
        <Link href="/projects" className="text-indigo-600 hover:underline">
          halaman Projects
        </Link>
        , dengan mengubah field &quot;Portfolio Status&quot;.
      </p>
    </div>
  );
}
