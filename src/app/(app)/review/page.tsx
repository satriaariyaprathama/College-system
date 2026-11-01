"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui";
import WeeklyReviewTab from "./components/WeeklyReviewTab";
import MonthlyReviewTab from "./components/MonthlyReviewTab";
import SemesterReviewTab from "./components/SemesterReviewTab";
import CalendarDpaTab from "./components/CalendarDpaTab";
import { CalendarCheck2, Clock, CalendarDays, Award } from "lucide-react";

type ReviewTab = "weekly" | "monthly" | "semester" | "timeline";

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400 py-6">Memuat modul Review...</p>}>
      <ReviewContent />
    </Suspense>
  );
}

function ReviewContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  
  const initialTab: ReviewTab =
    tabParam === "timeline" || tabParam === "dpa" || tabParam === "calendar"
      ? "timeline"
      : tabParam === "monthly"
      ? "monthly"
      : tabParam === "semester"
      ? "semester"
      : "weekly";

  const [tab, setTab] = useState<ReviewTab>(initialTab);

  useEffect(() => {
    if (tabParam) {
      if (tabParam === "timeline" || tabParam === "dpa" || tabParam === "calendar") {
        setTab("timeline");
      } else if (tabParam === "weekly" || tabParam === "monthly" || tabParam === "semester") {
        setTab(tabParam as ReviewTab);
      }
    }
  }, [tabParam]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan & Review"
        description="Perencanaan target dan evaluasi periodik (mingguan, bulanan, semester), bimbingan DPA, serta timeline akademik."
      />

      <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 text-xs sm:text-sm font-medium w-fit">
        <button
          onClick={() => setTab("weekly")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            tab === "weekly"
              ? "bg-white text-zinc-900 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Clock size={15} />
          Weekly Plan & Review
        </button>

        <button
          onClick={() => setTab("monthly")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            tab === "monthly"
              ? "bg-white text-zinc-900 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <CalendarDays size={15} />
          Monthly Plan & Review
        </button>

        <button
          onClick={() => setTab("semester")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            tab === "semester"
              ? "bg-white text-zinc-900 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Award size={15} />
          Semester & Kompas
        </button>

        <button
          onClick={() => setTab("timeline")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 transition ${
            tab === "timeline"
              ? "bg-white text-indigo-700 shadow-xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <CalendarCheck2 size={15} className="text-indigo-600" />
          Kalender & DPA
        </button>
      </div>

      <div>
        {tab === "weekly" && <WeeklyReviewTab />}
        {tab === "monthly" && <MonthlyReviewTab />}
        {tab === "semester" && <SemesterReviewTab />}
        {tab === "timeline" && <CalendarDpaTab />}
      </div>
    </div>
  );
}
