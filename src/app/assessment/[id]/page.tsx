"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

  // Ref for debounced API save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved progress from localStorage + fetch questions from API
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + assessmentId);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed.answers || {});
        setCurrentQ(parsed.currentQ || 1);
      } catch {
        // ignore parse errors
      }
    }

    // Fetch assessment data with question text from API
    fetch(`/api/assessment/${assessmentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.questions?.length) {
          setQuestions(data.questions);
        }
        // Also restore saved answers from server if localStorage was empty
        if (data?.answers && Object.keys(data.answers).length > 0 && !saved) {
          setAnswers(data.answers);
          if (data.currentQuestion) setCurrentQ(data.currentQuestion);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessmentId]);

  // Save progress to localStorage on every change
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + assessmentId,
      JSON.stringify({ answers, currentQ })
    );
  }, [answers, currentQ, assessmentId]);

  // Debounced save to API
  const saveToApi = useCallback(
    (answersToSave: Answers, currentQuestion: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/assessment/${assessmentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              answers: answersToSave,
              currentQuestion,
            }),
          });
        } catch {
          // Silent fail — localStorage is the primary save
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [assessmentId]
  );

  // Trigger API save when answers change
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      saveToApi(answers, currentQ);
    }
  }, [answers, currentQ, saveToApi]);

  // Flush save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── ALL hooks above this line (React rules of hooks) ──

  // Derived values (safe to compute even during loading)
  const stage = getStage(currentQ);
  const stageIndex = stage.id - 1;
  const stageQuestionStart = STAGES[stageIndex].questionRange[0];
  const questionInStage = currentQ - stageQuestionStart + 1;

  const handleAnswer = useCallback(
    (value: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [currentQ]: value }));

      // Auto-advance after a short delay
      setTimeout(() => {
        if (currentQ < TOTAL_QUESTIONS) {
          const nextQ = currentQ + 1;
          const nextStage = getStage(nextQ);
          if (nextStage.id !== stage.id) {
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

  // Flush answers to API before navigating away
  const flushAndNavigate = useCallback(
    async (target: string) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      try {
        await fetch(`/api/assessment/${assessmentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, currentQuestion: currentQ }),
        });
      } catch {
        // Continue even if API save fails
      }
      router.push(target);
    },
    [assessmentId, answers, currentQ, router]
  );

  // ── Early return AFTER all hooks ──

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">加载测评中...</p>
      </main>
    );
  }

  const handleStageContinue = () => {
    setShowStageComplete(false);
    if (completedStage < 3) {
      setCurrentQ(STAGES[completedStage].questionRange[0]);
    } else {
      // All done — flush and redirect to registration
      flushAndNavigate(`/register?assessmentId=${assessmentId}`);
    }
  };

  const handlePrev = () => {
    if (currentQ > 1) setCurrentQ(currentQ - 1);
  };

  const handleNext = () => {
    if (currentQ < TOTAL_QUESTIONS) {
      const nextQ = currentQ + 1;
      const nextStage = getStage(nextQ);
      if (nextStage.id !== stage.id) {
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
        router.push(`/register?assessmentId=${data.assessmentId}`);
      } else {
        setSkipping(false);
      }
    } catch {
      setSkipping(false);
    }
  };

  const isAnswered = !!answers[currentQ];
  const progress = Math.round(
    (Object.keys(answers).length / TOTAL_QUESTIONS) * 100
  );

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {/* Progress header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{stage.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {currentQ} / {TOTAL_QUESTIONS}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Stage complete overlay */}
      <AnimatePresence>
        {showStageComplete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-w-sm text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
              </div>
              <p className="text-lg font-medium leading-relaxed text-foreground">
                {STAGES[completedStage - 1].completedFeedback}
              </p>
              <Button
                onClick={handleStageContinue}
                className="mt-8 rounded-full bg-primary px-8 text-primary-foreground hover:brightness-95"
              >
                {completedStage < 3 ? "继续" : "查看成长画像"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            className="w-full max-w-xl"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Stage label */}
            <p className="mb-3 text-sm text-muted-foreground">
              第{stage.id}阶段 · 第{questionInStage}题 / {QUESTIONS_PER_STAGE[stageIndex]}题
            </p>

            {/* Question text */}
            <h2 className="mb-8 text-lg font-medium leading-relaxed text-foreground md:text-xl">
              {questions.length > 0
                ? questions[currentQ - 1]?.content
                : PLACEHOLDER_QUESTIONS[currentQ - 1]?.content}
            </h2>

            {/* Answer options */}
            <div className="space-y-3">
              {ANSWER_OPTIONS.map((option) => {
                const isSelected = answers[currentQ] === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`w-full rounded-xl border px-5 py-4 text-left text-sm transition-all md:text-base ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Navigation */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrev}
            disabled={currentQ <= 1}
            className="gap-1 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            上一题
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNext}
            disabled={!isAnswered || currentQ >= TOTAL_QUESTIONS}
            className="gap-1 text-muted-foreground"
          >
            {currentQ >= TOTAL_QUESTIONS ? "完成测评" : "下一题"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="pb-4 text-center">
          <button
            onClick={handleSkip}
            disabled={skipping}
            className="text-xs text-muted-foreground/50 underline-offset-2 hover:text-muted-foreground hover:underline disabled:opacity-50"
          >
            {skipping ? "跳过中..." : "跳过测评（测试用）"}
          </button>
        </div>
      </footer>
    </main>
  );
}
