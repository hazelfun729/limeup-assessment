"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── Stage data ──
export const STAGE_TRANSITIONS = [
  {
    stage: 1,
    guidance: "测评看看孩子为什么而学",
    questions: [
      "为什么孩子越来越不想学习？",
      "为什么一催就学，不催就停？",
      "为什么总说\u201C我不想学\u201D？",
      "为什么总是三分钟热度？",
      "为什么奖励越来越没用？",
      "为什么一遇到困难就放弃？",
      "为什么越来越没有学习兴趣？",
      "为什么学习总靠别人提醒？",
      "为什么目标总坚持不了？",
      "为什么孩子知道学习重要，却还是不愿意开始？",
    ],
  },
  {
    stage: 2,
    guidance: "测评看看孩子学习能力的边界在哪里",
    questions: [
      "为什么孩子很努力却没效果？",
      "为什么上课听懂了，考试却不会？",
      "为什么一换题就不会？",
      "为什么总是粗心、马虎？",
      "为什么背过很快就忘？",
      "为什么学了很多，却不会用？",
      "为什么成绩总是不稳定？",
      "为什么总觉得时间不够？",
      "为什么遇到难题就没有思路？",
      "为什么孩子真正的潜力没有发挥出来？",
    ],
  },
  {
    stage: 3,
    guidance: "测评了解孩子为什么无法持续学习",
    questions: [
      "为什么知道，却做不到？",
      "为什么计划总坚持不了？",
      "为什么拖延越来越严重？",
      "为什么总要最后一刻才开始？",
      "为什么手机总能打断学习？",
      "为什么遇到困难就想放弃？",
      "为什么总是半途而废？",
      "为什么努力了一段时间又回到原点？",
      "为什么同样的问题总是一再出现？",
      "为什么孩子始终没有形成自主学习？",
    ],
  },
];

// ── Types ──
interface FloatingQuestion {
  id: number;
  text: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  fontSize: number; // px
  birthTime: number; // ms timestamp
  usedIndex: number; // index into questions pool
}

interface Props {
  stage: number; // 1, 2, or 3
  onComplete: () => void;
}

const FADE_IN = 400;
const STAY = 1600;
const FADE_OUT = 400;
const LIFETIME = FADE_IN + STAY + FADE_OUT; // 2400ms
const MAX_VISIBLE = 5;
const MIN_VISIBLE = 3;
const EXIT_DURATION = 500;
const GUIDANCE_STAY = 800;

// Margins (percentage from edges)
const MARGIN_X = 12;
const MARGIN_Y = 12;

function getOpacity(elapsed: number): number {
  if (elapsed < FADE_IN) return elapsed / FADE_IN;
  if (elapsed < FADE_IN + STAY) return 1;
  if (elapsed < LIFETIME) return 1 - (elapsed - FADE_IN - STAY) / FADE_OUT;
  return 0;
}

function getDisplayOpacity(rawOpacity: number): number {
  // Map raw opacity to display tiers: 100%, 70%, 35%
  if (rawOpacity >= 0.9) return 1;
  if (rawOpacity >= 0.4) return 0.7;
  return 0.35;
}

function randomFontSize(): number {
  return 28 + Math.random() * 4; // 28-32
}

function randomPosition(
  existing: FloatingQuestion[],
  isFirst: boolean
): { x: number; y: number } {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    let x: number, y: number;
    if (isFirst) {
      // First question: upper-center
      x = 35 + Math.random() * 30; // 35-65%
      y = 18 + Math.random() * 15; // 18-33%
    } else {
      x = MARGIN_X + Math.random() * (100 - 2 * MARGIN_X);
      y = MARGIN_Y + Math.random() * (100 - 2 * MARGIN_Y);
    }
    // Check overlap with existing (minimum distance ~18%)
    const tooClose = existing.some((q) => {
      const dx = Math.abs(q.x - x);
      const dy = Math.abs(q.y - y);
      return dx < 18 && dy < 10;
    });
    if (!tooClose) return { x, y };
  }
  // Fallback: just pick any position
  return {
    x: MARGIN_X + Math.random() * (100 - 2 * MARGIN_X),
    y: MARGIN_Y + Math.random() * (100 - 2 * MARGIN_Y),
  };
}

function pickRandomQuestion(
  pool: string[],
  usedIndices: Set<number>
): { text: string; index: number } {
  const available: number[] = [];
  for (let i = 0; i < pool.length; i++) {
    if (!usedIndices.has(i)) available.push(i);
  }
  if (available.length === 0) {
    // Reset: all used, start over
    const idx = Math.floor(Math.random() * pool.length);
    return { text: pool[idx], index: idx };
  }
  const idx = available[Math.floor(Math.random() * available.length)];
  return { text: pool[idx], index: idx };
}

export function StageTransition({ stage, onComplete }: Props) {
  const data = STAGE_TRANSITIONS[stage - 1];
  const [phase, setPhase] = useState<"questions" | "exiting" | "guidance">("questions");
  const [questions, setQuestions] = useState<FloatingQuestion[]>([]);
  const [exitOpacity, setExitOpacity] = useState(1);
  const [guidanceOpacity, setGuidanceOpacity] = useState(0);
  const [clicked, setClicked] = useState(false);

  const nextId = useRef(0);
  const usedIndices = useRef<Set<number>>(new Set());
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);

  // ── Initialize first few questions with staggered birth times ──
  useEffect(() => {
    startTimeRef.current = performance.now();
    const initial: FloatingQuestion[] = [];
    for (let i = 0; i < MAX_VISIBLE; i++) {
      const { text, index } = pickRandomQuestion(data.questions, usedIndices.current);
      usedIndices.current.add(index);
      const pos = randomPosition(initial, i === 0);
      initial.push({
        id: nextId.current++,
        text,
        ...pos,
        fontSize: randomFontSize(),
        // Stagger: first one starts now, others start earlier so they're at different lifecycle points
        birthTime: startTimeRef.current - i * (LIFETIME / MAX_VISIBLE),
        usedIndex: index,
      });
    }
    setQuestions(initial);
  }, [data.questions]);

  // ── Animation loop: replace expired questions ──
  useEffect(() => {
    if (clicked) return;

    let running = true;
    const tick = () => {
      if (!running) return;
      const now = performance.now();

      setQuestions((prev) => {
        let changed = false;
        const next = prev.map((q) => {
          const elapsed = now - q.birthTime;
          if (elapsed >= LIFETIME) {
            changed = true;
            usedIndices.current.delete(q.usedIndex);
            const { text, index } = pickRandomQuestion(data.questions, usedIndices.current);
            usedIndices.current.add(index);
            const others = prev.filter((p) => p.id !== q.id);
            const pos = randomPosition(others, false);
            return {
              id: nextId.current++,
              text,
              ...pos,
              fontSize: randomFontSize(),
              birthTime: now,
              usedIndex: index,
            };
          }
          return q;
        });
        return changed ? next : prev;
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [clicked, data.questions]);

  // ── Click handler ──
  const handleClick = useCallback(() => {
    if (clicked) return;
    setClicked(true);
    cancelAnimationFrame(rafRef.current);
    setPhase("exiting");

    // Fade out all questions over 500ms
    const exitStart = performance.now();
    const exitTick = () => {
      const elapsed = performance.now() - exitStart;
      const progress = Math.min(elapsed / EXIT_DURATION, 1);
      setExitOpacity(1 - progress);
      if (progress < 1) {
        requestAnimationFrame(exitTick);
      } else {
        // Show guidance text
        setPhase("guidance");
        setGuidanceOpacity(0);
        const guideStart = performance.now();
        const guideTick = () => {
          const ge = performance.now() - guideStart;
          const fadeIn = Math.min(ge / 400, 1);
          setGuidanceOpacity(fadeIn);
          if (ge < 400 + GUIDANCE_STAY) {
            requestAnimationFrame(guideTick);
          } else {
            onComplete();
          }
        };
        requestAnimationFrame(guideTick);
      }
    };
    requestAnimationFrame(exitTick);
  }, [clicked, onComplete]);

  // ── Render ──
  const now = performance.now();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "#FAFAF9", cursor: "default" }}
      onClick={handleClick}
    >
      {/* Floating questions */}
      {phase !== "guidance" &&
        questions.map((q) => {
          const elapsed = now - q.birthTime;
          const raw = getOpacity(Math.max(0, elapsed));
          const opacity = phase === "exiting" ? exitOpacity : getDisplayOpacity(raw);
          if (opacity <= 0) return null;
          return (
            <span
              key={q.id}
              className="pointer-events-none absolute select-none"
              style={{
                left: `${q.x}%`,
                top: `${q.y}%`,
                transform: "translate(-50%, -50%)",
                fontSize: `${q.fontSize}px`,
                color: "#374151",
                opacity,
                transition: phase === "exiting" ? `opacity ${EXIT_DURATION}ms ease` : "opacity 200ms ease",
                fontWeight: 400,
                letterSpacing: "-0.01em",
                lineHeight: 1.5,
                whiteSpace: "nowrap",
              }}
            >
              {q.text}
            </span>
          );
        })}

      {/* Guidance text */}
      {phase === "guidance" && (
        <p
          className="pointer-events-none select-none text-center"
          style={{
            fontSize: "22px",
            fontWeight: 500,
            color: "#111827",
            opacity: guidanceOpacity,
            transition: "opacity 400ms ease",
            letterSpacing: "-0.01em",
            lineHeight: 1.6,
            maxWidth: "80vw",
          }}
        >
          {data.guidance}
        </p>
      )}
    </div>
  );
}
