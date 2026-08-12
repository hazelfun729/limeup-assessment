"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  STAGES,
  TOTAL_QUESTIONS,
  ANSWER_OPTIONS,
  QUESTIONS_PER_STAGE,
  getStage,
  PLACEHOLDER_QUESTIONS,
  type AnswerValue,
} from "@/lib/assessment-constants";

type Answers = Record<number, AnswerValue>;

const STORAGE_KEY_PREFIX = "assessment_answers_";
const SAVE_DEBOUNCE_MS = 2000;

type FetchedQuestion = { order: number; stage: number; content: string };

export default function AssessmentQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [currentQ, setCurrentQ] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});
  const [questions, setQuestions] = useState<FetchedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStageComplete, setShowStageComplete] = useState(false);
  const [completedStage, setCompletedStage] = useState(0);
  const [skipping, setSkipping] = useState(false);
  const [whiteMask, setWhiteMask] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + assessmentId);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed.answers || {});
        setCurrentQ(parsed.currentQ || 1);
      } catch {}
    }

    fetch(`/api/assessment/${assessmentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.questions?.length) setQuestions(data.questions);
        if (data?.answers && Object.keys(data.answers).length > 0 && !saved) {
          setAnswers(data.answers);
          if (data.currentQuestion) setCurrentQ(data.currentQuestion);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessmentId]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + assessmentId,
      JSON.stringify({ answers, currentQ })
    );
  }, [answers, currentQ, assessmentId]);

  // Check if user is already logged in
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setIsUserLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  const saveToApi = useCallback(
    (a: Answers, q: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/assessment/${assessmentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: a, currentQuestion: q }),
          });
        } catch {}
      }, SAVE_DEBOUNCE_MS);
    },
    [assessmentId]
  );

  useEffect(() => {
    if (Object.keys(answers).length > 0) saveToApi(answers, currentQ);
  }, [answers, currentQ, saveToApi]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const answerCount = Object.keys(answers).length;
  const hasProgress = answerCount > 0;
  const isComplete = answerCount >= TOTAL_QUESTIONS;
  useEffect(() => {
    if (!hasProgress || isComplete) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [hasProgress, isComplete]);

  // ── ALL hooks above ──

  const stage = getStage(currentQ);
  const stageIndex = stage.id - 1;
  const questionInStage = currentQ - STAGES[stageIndex].questionRange[0] + 1;

  const handleAnswer = useCallback(
    (value: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [currentQ]: value }));
      setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS) {
          const nextQ = currentQ + 1;
          const ns = getStage(nextQ);
          if (ns.id !== stage.id) {
            setCompletedStage(stage.id);
            setShowStageComplete(true);
          } else {
            setCurrentQ(nextQ);
          }
        } else {
          setCompletedStage(3);
          setShowStageComplete(true);
        }
      }, 400);
    },
    [currentQ, stage.id]
  );

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">{"\u52A0\u8F7D\u6D4B\u8BC4\u4E2D..."}</p>
      </main>
    );
  }

  const handleStageContinue = () => {
    setWhiteMask(true);
    setTimeout(() => {
      setShowStageComplete(false);
      if (completedStage < 3) {
        router.push(`/transition?stage=${completedStage + 1}&assessmentId=${assessmentId}`);
      } else {
        // Save final answers
        fetch(`/api/assessment/${assessmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, currentQuestion: currentQ }),
        }).catch(() => {});

        if (isUserLoggedIn) {
          // Already logged in: link assessment to user, then go to profile
          fetch("/api/assessment/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assessmentId }),
          }).catch(() => {});
          router.push(`/profile/${assessmentId}`);
        } else {
          router.push(`/register?assessmentId=${assessmentId}`);
        }
      }
    }, 300);
  };

  const handlePrev = () => { if (currentQ > 1) setCurrentQ(currentQ - 1); };
  const handleNext = () => {
    if (currentQ < TOTAL_QUESTIONS) {
      const nextQ = currentQ + 1;
      const ns = getStage(nextQ);
      if (ns.id !== stage.id) {
        setCompletedStage(stage.id);
        setShowStageComplete(true);
      } else {
        setCurrentQ(nextQ);
      }
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    try {
      const res = await fetch("/api/assessment/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipProfile: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (isUserLoggedIn) {
          fetch("/api/assessment/link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assessmentId: data.assessmentId }),
          }).catch(() => {});
          router.push(`/profile/${data.assessmentId}`);
        } else {
          router.push(`/register?assessmentId=${data.assessmentId}`);
        }
      } else { setSkipping(false); }
    } catch { setSkipping(false); }
  };

  const isAnswered = !!answers[currentQ];
  const progress = Math.round((answerCount / TOTAL_QUESTIONS) * 100);

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {/* White mask — covers page before navigating to transition */}
      <div
        className="pointer-events-none fixed inset-0 z-[60] bg-white"
        style={{
          opacity: whiteMask ? 1 : 0,
          transition: "opacity 300ms ease-out",
        }}
      />

      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{stage.name}</span>
              <span className="tabular-nums text-muted-foreground">{currentQ} / {TOTAL_QUESTIONS}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

      {showStageComplete && (
        <div className="overlay-fade-in fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
            </div>
            <p className="text-lg font-medium leading-relaxed text-foreground">
              {STAGES[completedStage - 1].completedFeedback}
            </p>
            <button onClick={handleStageContinue} className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:brightness-95">
              {completedStage < 3 ? "\u7EE7\u7EED" : "\u67E5\u770B\u6210\u957F\u753B\u50CF"}
            </button>
          </div>
        </div>
      )}

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div key={currentQ} className="question-slide-in w-full max-w-xl">
          <p className="mb-3 text-sm text-muted-foreground">
            {"\u7B2C"}{stage.id}{"\u9636\u6BB5"} {"\u00B7"} {"\u7B2C"}{questionInStage}{"\u9898"} / {QUESTIONS_PER_STAGE[stageIndex]}{"\u9898"}
          </p>
          <h2 className="mb-8 text-lg font-medium leading-relaxed text-foreground md:text-xl">
            {questions.length > 0 ? questions[currentQ - 1]?.content : PLACEHOLDER_QUESTIONS[currentQ - 1]?.content}
          </h2>
          <div className="space-y-3">
            {ANSWER_OPTIONS.map((option) => {
              const sel = answers[currentQ] === option.value;
              return (
                <button key={option.value} onClick={() => handleAnswer(option.value)}
                  className={`w-full rounded-xl border px-5 py-4 text-left text-sm transition-all md:text-base ${sel ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <button onClick={handlePrev} disabled={currentQ <= 1}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />{"\u4E0A\u4E00\u9898"}
          </button>
          <button onClick={handleNext} disabled={!isAnswered || currentQ >= TOTAL_QUESTIONS}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-40">
            {currentQ >= TOTAL_QUESTIONS ? "\u5B8C\u6210\u6D4B\u8BC4" : "\u4E0B\u4E00\u9898"}<ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="pb-4 text-center">
          {hasProgress && !isComplete && answerCount >= 5 && (
            <p className="mb-2 text-xs text-muted-foreground/70">
              {"\u5173\u95ED\u9875\u9762\u524D\u8FDB\u5EA6\u4F1A\u81EA\u52A8\u4FDD\u5B58\u3002"}
              {!isUserLoggedIn && (
                <Link href={`/register?assessmentId=${assessmentId}`} className="ml-1 text-primary underline-offset-2 hover:underline">
                  {"\u6CE8\u518C\u4EE5\u6C38\u4E45\u4FDD\u5B58"}
                </Link>
              )}
            </p>
          )}
          <button onClick={handleSkip} disabled={skipping}
            className="text-xs text-muted-foreground/50 underline-offset-2 hover:text-muted-foreground hover:underline disabled:opacity-50">
            {skipping ? "\u8DF3\u8FC7\u4E2D..." : "\u8DF3\u8FC7\u6D4B\u8BC4\uFF08\u6D4B\u8BD5\u7528\uFF09"}
          </button>
        </div>
      </footer>
    </main>
  );
}
