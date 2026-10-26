"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Assessment entry point.
 * Calls POST /api/assessment to create a DB record, then redirects to the question page.
 */
export default function AssessmentStartPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function createAssessment() {
      try {
        let key = sessionStorage.getItem("assessment_start_key");
        if (!key) {
          key = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
          sessionStorage.setItem("assessment_start_key", key);
        }
        const res = await fetch("/api/assessment", { method: "POST", headers: { "Idempotency-Key": key } });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "创建测评失败");
        }
        const { id } = await res.json();
        if (!cancelled) router.replace(`/transition?stage=1&assessmentId=${id}`);
      } catch (err) {
        console.error("Failed to create assessment:", err);
        setError(err instanceof Error ? err.message : "创建测评失败，请稍后重试");
      }
    }
    createAssessment();
    return () => { cancelled = true; };
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground"
          >
            重试
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <p className="text-muted-foreground">正在创建测评...</p>
    </main>
  );
}
