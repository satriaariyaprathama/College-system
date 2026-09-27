"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  NotebookPen,
  GraduationCap,
  FolderKanban,
  Star,
  CalendarClock,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notes", label: "Lecture Notes", icon: NotebookPen },
  { href: "/learning", label: "Self-Learning", icon: GraduationCap },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/portfolio", label: "Portfolio", icon: Star },
  { href: "/timeline", label: "Timeline", icon: CalendarClock },
  { href: "/review", label: "Review", icon: ClipboardList },
];

const MOBILE_NAV = [NAV[0], NAV[1], NAV[3], NAV[4], NAV[7]];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { semesters, currentSemesterId, setCurrentSemesterId } = useSemesters();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-4 md:flex">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold tracking-tight">Kuliah Hub</p>
          <p className="text-xs text-zinc-400">Personal College System</p>
        </div>

        <SemesterSelect semesters={semesters} value={currentSemesterId} onChange={setCurrentSemesterId} />

        <nav className="mt-4 flex-1 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  active ? "bg-indigo-50 text-indigo-600" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-0.5 border-t border-zinc-100 pt-2">
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              pathname === "/settings" ? "bg-indigo-50 text-indigo-600" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Settings size={16} />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <p className="text-sm font-semibold">Kuliah Hub</p>
        <button onClick={() => setMobileMenuOpen((v) => !v)} aria-label="Menu">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-64 space-y-1 bg-white p-4 pt-16 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <SemesterSelect semesters={semesters} value={currentSemesterId} onChange={setCurrentSemesterId} />
            <div className="mt-3 space-y-0.5">
              {[...NAV, { href: "/settings", label: "Settings", icon: Settings }].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1 px-4 pb-20 pt-16 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? "text-indigo-600" : "text-zinc-500"
              }`}
            >
              <Icon size={18} />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SemesterSelect({
  semesters,
  value,
  onChange,
}: {
  semesters: { id: string; academic_year: string; semester_number: number; label: string | null }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700"
    >
      <option value="">Semua Semester</option>
      {semesters.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label || `${s.academic_year} · Smt ${s.semester_number}`}
        </option>
      ))}
    </select>
  );
}
