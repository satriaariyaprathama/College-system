"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Semester } from "@/lib/types";

interface SemesterCtx {
  semesters: Semester[];
  currentSemesterId: string | null;
  setCurrentSemesterId: (id: string | null) => void;
  currentSemester: Semester | null;
  refresh: () => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<SemesterCtx | null>(null);

export function SemesterProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [currentSemesterId, setCurrentSemesterIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("semesters")
      .select("*")
      .order("academic_year", { ascending: true })
      .order("semester_number", { ascending: true });
    if (error) {
      console.error("Gagal memuat data semester:", error);
    }
    const list = (data as Semester[]) ?? [];
    setSemesters(list);

    setCurrentSemesterIdState((prev) => {
      if (prev && list.some((s) => s.id === prev)) return prev;
      const stored = typeof window !== "undefined" ? localStorage.getItem("current_semester_id") : null;
      if (stored && list.some((s) => s.id === stored)) return stored;
      const current = list.find((s) => s.is_current);
      return current?.id ?? list[list.length - 1]?.id ?? null;
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function setCurrentSemesterId(id: string | null) {
    setCurrentSemesterIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("current_semester_id", id);
      else localStorage.removeItem("current_semester_id");
    }
  }

  const currentSemester = semesters.find((s) => s.id === currentSemesterId) ?? null;

  return (
    <Ctx.Provider value={{ semesters, currentSemesterId, setCurrentSemesterId, currentSemester, refresh, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSemesters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSemesters must be used within SemesterProvider");
  return ctx;
}
