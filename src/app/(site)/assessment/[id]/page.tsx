"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import {
  STAGES,
  TOTAL_QUESTIONS,
  ANSWER_OPTIONS,
  QUESTIONS_PER_STAGE,
  getStage,
  type AnswerValue,
} from "@/lib/assessment-constants";

type Answers = Record<number, AnswerValue>;

const STORAGE_KEY_PREFIX = "assessment_answers_";
const SAVE_DEBOUNCE_MS = 500;

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const requestChain = useRef(Promise.resolve());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [whiteMask, setWhiteMask] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/assessment/${assessmentId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "无法读取测评");
        if (cancelled) return;
        if (data.status === "COMPLETED") { router.replace(`/profile/${assessmentId}`); return; }
        let draft;
        try { draft = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFIX + assessmentId) || "null"); } catch { /* ignore damaged cache */ }
        const recoverDraft = draft?.pending && draft.updatedAt > data.savedAt;
        const restoredAnswers = recoverDraft ? { ...data.answers, ...draft.answers } : data.answers || {};
        const restoredQuestion = recoverDraft ? draft.currentQ : data.currentQuestion;
        setQuestions(data.questions);
        setAnswers(restoredAnswers);
        setCurrentQ(Math.min(TOTAL_QUESTIONS, Math.max(1, restoredQuestion || 1)));
        setLoading(false);
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : "读取失败"); setLoading(false); }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [assessmentId, router]);

  useEffect(() => {
    if (loading || !questions.length) return;
    localStorage.setItem(STORAGE_KEY_PREFIX + assessmentId, JSON.stringify({ answers, currentQ, updatedAt: Date.now(), pending: true }));
  }, [answers, currentQ, assessmentId, loading, questions.length]);

  // Check if user is already logged in
  useEffect(() => {
    fetch("/api/admin/account").then(res => { if (res.ok) setIsAdmin(true); }).catch(() => {});
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setIsUserLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((a: Answers, q: number) => {
    const next = requestChain.current.catch(() => {}).then(async () => {
      const res = await fetch(`/api/assessment/${assessmentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: a, currentQuestion: q }), keepalive: true });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      try {
        const key = STORAGE_KEY_PREFIX + assessmentId;
        const draft = JSON.parse(localStorage.getItem(key) || "null");
        if (draft && draft.currentQ === q && JSON.stringify(draft.answers) === JSON.stringify(a)) localStorage.setItem(key, JSON.stringify({ ...draft, pending: false }));
      } catch { /* storage may be disabled */ }
    });
    requestChain.current = next;
    return next;
  }, [assessmentId]);

  useEffect(() => {
    if (loading || !Object.keys(answers).length) return;
    saveTimerRef.current = setTimeout(() => {
      persist(answers, currentQ).then(() => setError(null)).catch(err => setError(err.message));
    }, SAVE_DEBOUNCE_MS);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [answers, currentQ, persist, loading]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

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
      if (advancing || submitting) return;
      setAdvancing(true);
      setAnswers((prev) => ({ ...prev, [currentQ]: value }));
      advanceTimer.current = setTimeout(() => {
        setAdvancing(false);
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
    [currentQ, stage.id, advancing, submitting]
  );

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">{"\u52A0\u8F7D\u6D4B\u8BC4\u4E2D..."}</p>
      </main>
    );
  }

  const handleStageContinue = async () => {
    if (submitting) return;
    const [first, last] = STAGES[completedStage - 1].questionRange;
    if (Array.from({ length: last - first + 1 }, (_, i) => answers[first + i]).every(answer => answer === "UNKNOWN")) {
      setError("这一阶段全部选择了“不了解”，暂时无法形成画像。请返回检查，补充你能观察到的表现。");
      return;
    }
    setSubmitting(true);
    setError(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      const nextQ = completedStage < 3 ? STAGES[completedStage].questionRange[0] : currentQ;
      await persist(answers, nextQ);
      if (completedStage < 3) {
        setWhiteMask(true);
        router.push(`/transition?stage=${completedStage + 1}&assessmentId=${assessmentId}`);
      } else {
        if (isUserLoggedIn) {
          const res = await fetch("/api/assessment/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId }) });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "提交失败");
        }
        sessionStorage.removeItem("assessment_start_key");
        localStorage.removeItem(STORAGE_KEY_PREFIX + assessmentId);
        router.push(isUserLoggedIn ? `/profile/${assessmentId}` : `/register?assessmentId=${assessmentId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试");
      setSubmitting(false);
    }
  };

  const fillTestStage = async () => {
    if (!isAdmin || submitting || advancing) return;
    setSubmitting(true);
    setError(null);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      const res = await fetch(`/api/assessment/${assessmentId}/test-mode`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "无法启用测试模式");
      const filled = { ...answers };
      const [start, end] = stage.questionRange;
      for (let q = start; q <= end; q++) filled[q] ??= ANSWER_OPTIONS[(q - 1) % 4].value;
      await persist(filled, end);
      setAnswers(filled);
      setCurrentQ(end);
      setCompletedStage(stage.id);
      setShowStageComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "测试答案保存失败");
    } finally { setSubmitting(false); }
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

  if (!questions.length) return <main className="p-10 text-center"><p role="alert">{error || "暂时无法加载测评"}</p><Link onClick={() => sessionStorage.removeItem("assessment_start_key")} href="/assessment">重新开始测评</Link></main>;

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

      {error && !showStageComplete && <p role="alert" className="p-3 text-center text-red-600">{error}</p>}
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

      {isAdmin && !showStageComplete && (
        <aside className="mx-auto w-full max-w-2xl rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">管理员前台测试</p>
          <p className="mt-1 text-muted-foreground">填充本阶段未答题，保留已有答案。使用后此测评会标记为测试记录，后续继续正常流程。</p>
          <button onClick={fillTestStage} disabled={submitting || advancing} className="mt-3 rounded-full bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50">
            {submitting ? "正在保存…" : "填充本阶段测试答案并继续"}
          </button>
        </aside>
      )}

      {showStageComplete && (
        <div className="overlay-fade-in fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Check className="h-8 w-8 text-primary" strokeWidth={2.5} />
            </div>
            <p className="text-lg font-medium leading-relaxed text-foreground">
              {STAGES[completedStage - 1].completedFeedback}
            </p>
            {error && <p role="alert" className="text-red-600">{error}</p>}
            <button onClick={handleStageContinue} disabled={submitting} className="mt-8 inline-flex h-11 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition-all hover:brightness-95">
              {completedStage < 3 ? "\u7EE7\u7EED" : "\u67E5\u770B\u6210\u957F\u753B\u50CF"}
            </button>
            <button disabled={submitting} onClick={() => { setShowStageComplete(false); setCurrentQ(STAGES[completedStage - 1].questionRange[0]); setError(null); }} className="mt-4 block w-full text-sm text-muted-foreground">返回检查本阶段答案</button>
          </div>
        </div>
      )}

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div key={currentQ} className="question-slide-in w-full max-w-xl">
          <p className="mb-3 text-sm text-muted-foreground">
            {"\u7B2C"}{stage.id}{"\u9636\u6BB5"} {"\u00B7"} {"\u7B2C"}{questionInStage}{"\u9898"} / {QUESTIONS_PER_STAGE[stageIndex]}{"\u9898"}
          </p>
          <h2 className="mb-8 text-lg font-medium leading-relaxed text-foreground md:text-xl">
            {questions[currentQ - 1]?.content}
          </h2>
          <div className="space-y-3">
            {ANSWER_OPTIONS.map((option) => {
              const sel = answers[currentQ] === option.value;
              return (
                <button key={option.value} disabled={advancing || submitting} onClick={() => handleAnswer(option.value)}
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
          <button onClick={handlePrev} disabled={currentQ <= 1 || advancing || submitting}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />{"\u4E0A\u4E00\u9898"}
          </button>
          <button onClick={handleNext} disabled={!isAnswered || currentQ >= TOTAL_QUESTIONS || advancing || submitting}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-40">
            {currentQ >= TOTAL_QUESTIONS ? "\u5B8C\u6210\u6D4B\u8BC4" : "\u4E0B\u4E00\u9898"}<ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="pb-4 text-center">
          {hasProgress && !isComplete && answerCount >= 5 && (
            <p className="mb-2 text-xs text-muted-foreground/70">
              {"\u5173\u95ED\u9875\u9762\u524D\u8FDB\u5EA6\u4F1A\u81EA\u52A8\u4FDD\u5B58\u3002"}

            </p>
          )}

        </div>
      </footer>
    </main>
  );
}
