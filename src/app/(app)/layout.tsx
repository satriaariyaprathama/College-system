import { SemesterProvider } from "@/components/SemesterContext";
import { AppShell } from "@/components/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SemesterProvider>
      <AppShell>{children}</AppShell>
    </SemesterProvider>
  );
}
