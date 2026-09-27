"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) setError(error.message);
      else setNotice("Akun dibuat. Silakan cek email untuk verifikasi, lalu login.");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Kuliah Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Personal College Management System</p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex rounded-lg bg-zinc-100 p-1 text-sm">
            <button
              className={`flex-1 rounded-md py-1.5 font-medium transition ${
                mode === "login" ? "bg-white shadow-sm" : "text-zinc-500"
              }`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 font-medium transition ${
                mode === "signup" ? "bg-white shadow-sm" : "text-zinc-500"
              }`}
              onClick={() => setMode("signup")}
              type="button"
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Nama Lengkap</label>
                <input
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Email</label>
              <input
                type="email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600">Password</label>
              <input
                type="password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {notice && <p className="text-xs text-emerald-600">{notice}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Memproses..." : mode === "login" ? "Login" : "Buat Akun"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Aplikasi pribadi untuk mengatur kuliah di UAD.
        </p>
      </div>
    </div>
  );
}
