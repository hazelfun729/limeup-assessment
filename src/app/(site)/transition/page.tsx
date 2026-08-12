"use client";

import { Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StageTransition } from "@/components/stage-transition";
import { STAGES } from "@/lib/assessment-constants";

function TransitionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stage = Number(searchParams.get("stage")) || 1;
  const assessmentId = searchParams.get("assessmentId") || "";
  const handled = useRef(false);

  const onComplete = () => {
    if (handled.current) return;
    handled.current = true;
    const startQ = STAGES[stage - 1]?.questionRange[0] || 1;
    const key = "assessment_answers_" + assessmentId;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      saved.currentQ = startQ;
      localStorage.setItem(key, JSON.stringify(saved));
    } catch {}
    router.replace("/assessment/" + assessmentId);
  };

  if (!assessmentId) {
    router.replace("/assessment");
    return null;
  }

  return <StageTransition stage={stage} onComplete={onComplete} />;
}

export default function TransitionPage() {
  return (
    <main className="relative min-h-dvh">
      <Suspense>
        <TransitionContent />
      </Suspense>
    </main>
  );
}
