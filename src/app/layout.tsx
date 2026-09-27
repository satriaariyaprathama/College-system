import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kuliah Hub — Personal College Management",
  description: "Sistem manajemen kuliah pribadi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
