"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  FolderKanban,
  ClipboardList,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Compass,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSemesters } from "@/components/SemesterContext";

// 5 Pilar Utama Navigasi
const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "Academics", icon: GraduationCap },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/review", label: "Review & DPA", icon: ClipboardList },
];

// 4 Tab Esensial untuk Bottom Bar Ponsel
const MOBILE_BOTTOM_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/academics", label: "Academics", icon: GraduationCap },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/review", label: "Review", icon: ClipboardList },
];

const PORTAL_LINKS = [
  { href: "https://portal.uad.ac.id", label: "Portal UAD" },
  { href: "https://simeru.uad.ac.id", label: "SIMERU UAD" },
  { href: "https://elearning.uad.ac.id", label: "E-Learning UAD" },
];

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
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white px-3 py-4 md:flex">
        <div className="mb-4 px-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm text-xs">
              KH
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-zinc-900 leading-none">
                Kuliah Hub
              </p>
              <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
                Academic Flight Deck
              </p>
            </div>
          </div>
        </div>

        <SemesterSelect
          semesters={semesters}
          value={currentSemesterId}
          onChange={setCurrentSemesterId}
        />

        {/* 5 Pilar Navigasi */}
        <nav className="mt-4 flex-1 space-y-1">
          {MAIN_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-indigo-50 text-indigo-700 shadow-xs font-semibold"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon size={17} className={active ? "text-indigo-600" : "text-zinc-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Portal Kampus UAD Integration */}
        <div className="border-t border-zinc-100 pt-3 pb-2">
          <div className="mb-1.5 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            <Compass size={12} />
            <span>Portal Kampus</span>
          </div>
          <div className="space-y-0.5">
            {PORTAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600"
              >
                <span>{link.label}</span>
                <ExternalLink size={12} className="text-zinc-300" />
              </a>
            ))}
          </div>
        </div>

        {/* Settings & Logout */}
        <div className="space-y-0.5 border-t border-zinc-100 pt-2">
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
              pathname === "/settings"
                ? "bg-indigo-50 text-indigo-700 font-semibold"
                : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Settings size={16} />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 font-bold text-white text-[10px]">
            KH
          </span>
          <p className="text-sm font-bold text-zinc-900">Kuliah Hub</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label="Menu"
          className="rounded-lg p-1.5 hover:bg-zinc-100 text-zinc-700"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer (Menu Samping) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-72 space-y-4 bg-white p-5 pt-16 shadow-xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4 overflow-y-auto">
              <SemesterSelect
                semesters={semesters}
                value={currentSemesterId}
                onChange={setCurrentSemesterId}
              />

              <div>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Menu Utama
                </p>
                <div className="space-y-1">
                  {MAIN_NAV.map((item) => {
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${
                          active
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-zinc-700 hover:bg-zinc-100"
                        }`}
                      >
                        <Icon size={17} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-3">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Compass size={12} /> Portal Kampus UAD
                </p>
                <div className="space-y-0.5">
                  {PORTAL_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                    >
                      <span>{link.label}</span>
                      <ExternalLink size={12} className="text-zinc-400" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 space-y-1">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                <Settings size={17} />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1 px-4 pb-20 pt-16 md:px-8 md:py-8 md:pb-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav: 4 essential tabs + Menu */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 py-1">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 text-[10px] font-medium transition ${
                  active ? "text-indigo-600 font-semibold" : "text-zinc-500"
                }`}
              >
                <Icon size={18} />
                <span className="mt-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 text-[10px] font-medium text-zinc-500 hover:text-zinc-900"
          >
            <Menu size={18} />
            <span className="mt-0.5">Lainnya</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function SemesterSelect({
  semesters,
  value,
  onChange,
}: {
  semesters: {
    id: string;
    academic_year: string;
    semester_number: number;
    label: string | null;
  }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs focus:border-indigo-500 focus:outline-hidden"
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
