"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY_PREFIX = "assessment_answers_";
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type SavedAssessment = {
  id: string;
  answeredCount: number;
  totalQuestions: number;
};

export function AssessmentEntry() {
  const [saved, setSaved] = useState<SavedAssessment | null>(null);

  useEffect(() => {
    let best: SavedAssessment | null = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;

      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}");
        const answerCount = data.answers ? Object.keys(data.answers).length : 0;
        if (answerCount === 0) continue;

        const id = key.replace(STORAGE_KEY_PREFIX, "");
        if (!best || answerCount > best.answeredCount) {
          best = { id, answeredCount: answerCount, totalQuestions: 66 };
        }
      } catch {
        // skip corrupted entries
      }
    }

    setSaved(best);
  }, []);

  const progress = saved
    ? Math.round((saved.answeredCount / saved.totalQuestions) * 100)
    : 0;

  return (
    <div className="hero-fade-up mt-10 flex flex-col items-center gap-3" style={{ animationDelay: "0.3s" }}>
      <Link
        href="/assessment"
        className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-95 active:scale-[0.98]"
      >
        开始测评
      </Link>

      {saved && (
        <Link
          href={`/assessment/${saved.id}`}
          className="group inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
        >
          <span>继续未完成的测评</span>
          <span className="text-xs text-muted-foreground/60">
            ({progress}%)
          </span>
        </Link>
      )}
    </div>
  );
}
