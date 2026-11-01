"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui";
import WeeklyReviewTab from "./components/WeeklyReviewTab";
import MonthlyReviewTab from "./components/MonthlyReviewTab";
import SemesterReviewTab from "./components/SemesterReviewTab";

export default function ReviewPage() {
  const [tab, setTab] = useState<"weekly" | "monthly" | "semester">("weekly");

  return (
    <div>
      <PageHeader
        title="Review"
        description="Evaluasi mingguan, bulanan, dan akhir semester."
      />

      <div className="mb-5 flex w-fit rounded-lg bg-zinc-100 p-1 text-sm">
        {(["weekly", "monthly", "semester"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 font-medium capitalize transition ${
              tab === t ? "bg-white shadow-sm" : "text-zinc-500"
            }`}
          >
            {t === "weekly"
              ? "Weekly Review"
              : t === "monthly"
                ? "Monthly Review"
                : "Semester Review"}
          </button>
        ))}
      </div>

      {tab === "weekly" ? (
        <WeeklyReviewTab />
      ) : tab === "monthly" ? (
        <MonthlyReviewTab />
      ) : (
        <SemesterReviewTab />
      )}
    </div>
  );
}
