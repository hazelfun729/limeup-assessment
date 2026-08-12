"use client";

import { useEffect, useRef, useState } from "react";

// ── Stage data ──
export const STAGE_TRANSITIONS = [
  {
    stage: 1,
    cta: "点击测一下孩子为什么而学",
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
    cta: "点击测一下孩子学习能力的边界",
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
    cta: "测一下孩子为什么无法持续学习",
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

// ── Props ──
interface Props {
  stage: number;
  onComplete: () => void;
}

// ── Timing ──
const SHOW_COUNT = 5;
const FADE_MS = 1000;
const STAY_MS = 2000;
const GAP_MS = 300;

const FONT = '"PingFang SC", -apple-system, "Helvetica Neue", sans-serif';

export function StageTransition({ stage, onComplete }: Props) {
  const data = STAGE_TRANSITIONS[stage - 1];
  const pool = data.questions;

  // Shuffle once on mount
  const orderRef = useRef<number[]>([]);
  if (orderRef.current.length === 0) {
    const indices = pool.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    orderRef.current = indices.slice(0, SHOW_COUNT);
  }

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Pure crossfade animation — loops until user clicks
  useEffect(() => {
    let cancelled = false;

    const showNext = (i: number) => {
      if (cancelled) return;
      if (i >= SHOW_COUNT) {
        setVisible(false);
        timerRef.current = setTimeout(() => {
          if (!cancelled) showNext(0);
        }, FADE_MS + GAP_MS);
        return;
      }
      setIdx(i);
      setVisible(true);
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setVisible(false);
        timerRef.current = setTimeout(() => {
          if (!cancelled) showNext(i + 1);
        }, FADE_MS + GAP_MS);
      }, STAY_MS);
    };

    timerRef.current = setTimeout(() => showNext(0), 400);

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const currentText = pool[orderRef.current[idx]] || "";

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center"
      style={{ background: "#FAFAF9" }}
      onClick={onComplete}
    >
      {/* Question + CTA as one centered block */}
      <div className="flex flex-col items-center" style={{ maxWidth: "72vw" }}>
        {/* Floating question — pure opacity crossfade */}
        <p
          className="pointer-events-none select-none text-center"
          style={{
            fontFamily: FONT,
            fontSize: "19px",
            fontWeight: 300,
            letterSpacing: "0.02em",
            lineHeight: 1.8,
            color: "#6b7280",
            opacity: visible ? 1 : 0,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
          }}
        >
          {currentText}
        </p>

        {/* CTA hint — visual only, full screen is clickable */}
        <div
          className="mt-8 flex items-center gap-2.5"
          style={{ fontFamily: FONT }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0 }}
          >
            <path
              d="M5 3L19 12L12 13L9 20L5 3Z"
              fill="oklch(0.87 0.16 110)"
              stroke="oklch(0.87 0.16 110)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{
              fontSize: "14px",
              fontWeight: 400,
              color: "oklch(0.87 0.16 110)",
              letterSpacing: "0.01em",
            }}
          >
            {data.cta}
          </span>
        </div>
      </div>
    </div>
  );
}
