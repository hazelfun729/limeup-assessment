"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <p className="text-lg font-medium leading-relaxed text-foreground">
          页面加载遇到了问题
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          请尝试刷新页面，或稍后再试。
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-muted-foreground/50">
            Error: {error.digest}
          </p>
        )}
        <button
          onClick={() => {
            console.error("Error details:", error.message, error.stack);
            reset();
          }}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition-all hover:brightness-95"
        >
          重新加载
        </button>
      </div>
    </main>
  );
}
