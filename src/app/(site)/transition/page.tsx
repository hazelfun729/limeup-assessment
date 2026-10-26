"use client";

import Link from "next/link";
import { Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StageTransition } from "@/components/stage-transition";

function TransitionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStage = Number(searchParams.get("stage"));
  const stage = [1, 2, 3].includes(requestedStage) ? requestedStage : 1;
  const assessmentId = searchParams.get("assessmentId") || "";
  const handled = useRef(false);

  const onComplete = () => {
    if (handled.current) return;
    handled.current = true;
    router.replace("/assessment/" + assessmentId);
  };

  if (!assessmentId) {
    return <Link href="/assessment">开始测评</Link>;
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
