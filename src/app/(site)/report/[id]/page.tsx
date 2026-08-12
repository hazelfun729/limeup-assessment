"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

// ==========================================
// Types
// ==========================================

type SystemScoreEntry = { score: number; level: string };
type DimensionScoreEntry = { score: number; level: string; name: string };
type ModuleScoreEntry = { score: number; level: string; name: string };

type ReportData = {
  handbook: {
    id: string;
    contentHtml: string | null;
    aiRawOutput: string | null;
    status: string;
    version: number;
    createdAt: string;
  };
  assessment: {
    id?: string;
    studentName?: string | null;
    parentName?: string | null;
    studentGender?: string | null;
    grade?: string | null;
    startedAt?: string;
  };
  profile: {
    learningMode: string;
    learningModeName?: string | null;
    learningModeEmoji?: string | null;
    systemScores: Record<string, SystemScoreEntry>;
    dimensionScores: Record<string, DimensionScoreEntry>;
    moduleScores: Record<string, ModuleScoreEntry>;
    strengths: Array<{ code: string; score: number }> | null;
    weaknesses: Array<{ code: string; score: number }> | null;
    growthFocus?: string | null;
    growthFocusDetail?: string | null;
    summary?: string | null;
  } | null;
};

type ParsedSection = {
  id: string;
  title: string;
  content: string;
  chapterNum: number | null;
};

// ==========================================
// Constants
// ==========================================

const SYSTEM_INFO: Record<
  string,
  { name: string; icon: string; dimensions: string[] }
> = {
  motivation: {
    name: "学习动力",
    icon: "🎯",
    dimensions: ["DR_INNER", "DR_CONF", "DR_START"],
  },
  ability: {
    name: "学习能力",
    icon: "🧠",
    dimensions: ["AB_PLAN", "AB_THINK", "AB_REFLECT"],
  },
  perseverance: {
    name: "学习毅力",
    icon: "💪",
    dimensions: ["PE_DURABLE", "PE_EMOTION", "PE_RESILIENCE"],
  },
};

const SYSTEM_ORDER = ["motivation", "ability", "perseverance"] as const;

const MODULE_DIM_MAP: Record<string, string> = {
  M_AUTONOMY: "DR_INNER",
  M_MEANING: "DR_INNER",
  M_INTEREST: "DR_INNER",
  M_WORTH: "DR_CONF",
  M_EFFICACY: "DR_CONF",
  M_BELONGING: "DR_CONF",
  M_AWARENESS: "DR_START",
  M_SAFETY: "DR_START",
  M_LAUNCH: "DR_START",
  M_GOAL: "AB_PLAN",
  M_STRATEGY: "AB_PLAN",
  M_TIME: "AB_PLAN",
  M_MEMORY: "AB_THINK",
  M_ANALYSIS: "AB_THINK",
  M_TRANSFER: "AB_THINK",
  M_MONITOR: "AB_REFLECT",
  M_ROOTCAUSE: "AB_REFLECT",
  M_PROCESS: "AB_REFLECT",
  M_BRAIN: "PE_DURABLE",
  M_FOCUS: "PE_DURABLE",
  M_SELFBOOST: "PE_DURABLE",
  M_EMOTION_ID: "PE_EMOTION",
  M_NEG_SOOthe: "PE_EMOTION",
  M_POS_SPARK: "PE_EMOTION",
  M_GROWTH: "PE_RESILIENCE",
  M_FLEXIBILITY: "PE_RESILIENCE",
  M_TOUGHNESS: "PE_RESILIENCE",
};

// ==========================================
// Helper Functions
// ==========================================

function decodeEntities(str: string): string {
  let result = str;
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  return result;
}

function sanitizeHtml(raw: string): string {
  let html = raw.trim();
  const preMatch = html.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
  if (preMatch) {
    html = decodeEntities(preMatch[1]);
  }
  const fenceMatch = html.match(/^```(?:html|HTML)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) {
    html = fenceMatch[1].trim();
  }
  return html;
}

function parseReportSections(html: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const headingRegex = /<(h[1-3])[^>]*>(.*?)<\/\1>/gi;
  let lastIndex = 0;
  let lastTitle = "";
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    if (lastTitle) {
      sections.push({
        id: sections.length.toString(),
        title: lastTitle,
        content: html.slice(lastIndex, match.index),
        chapterNum: getChapterNumber(lastTitle),
      });
    }
    lastTitle = match[2]
      .replace(/<[^>]+>/g, "")
      .replace(/\*+/g, "")
      .trim();
    lastIndex = match.index + match[0].length;
  }
  if (lastTitle && lastIndex < html.length) {
    sections.push({
      id: sections.length.toString(),
      title: lastTitle,
      content: html.slice(lastIndex),
      chapterNum: getChapterNumber(lastTitle),
    });
  }
  return sections;
}

function shouldSkipSection(title: string): boolean {
  const skipKeywords = [
    "基本信息",
    "学生信息",
    "测评信息",
    "档案信息",
    "成长规划报告",
    "成长导航手册",
    "全景成长规划",
  ];
  return skipKeywords.some((kw) => title.includes(kw));
}

function getChapterNumber(title: string): number | null {
  const cnNums: Record<string, number> = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
  };
  const cnMatch = title.match(/第([一二三四五六七八九十])章/);
  if (cnMatch && cnMatch[1]) return cnNums[cnMatch[1]] ?? null;
  const numMatch = title.match(/第\s*(\d+)\s*章/);
  if (numMatch) return parseInt(numMatch[1], 10);
  const plainMatch = title.match(/^(\d+)[\.\s]/);
  if (plainMatch) return parseInt(plainMatch[1], 10);
  return null;
}

function getFirstSentence(text: string | null | undefined): string {
  if (!text) return "";
  const clean = text.replace(/[<>""]/g, "").trim();
  const sentenceMatch = clean.match(/^(.+?[。！？\n])/);
  return sentenceMatch
    ? sentenceMatch[1]
    : clean.slice(0, 80) + (clean.length > 80 ? "..." : "");
}

function getLevelColor(level: string): string {
  if (level === "强") return "#4a7c00";
  if (level === "中") return "#b45309";
  return "#dc2626";
}

function getLevelBg(level: string): string {
  if (level === "强") return "bg-green-50 text-green-700 border-green-200";
  if (level === "中") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-600 border-red-200";
}

function getSystemTagStyle(level: string): React.CSSProperties {
  if (level === "强") return { background: "#dcfce7", color: "#15803d" };
  if (level === "中") return { background: "#fef3c7", color: "#b45309" };
  return { background: "#fee2e2", color: "#dc2626" };
}

function getBarColor(level: string): string {
  if (level === "强") return "#86b930";
  if (level === "中") return "#f59e0b";
  return "#ef4444";
}

// ==========================================
// Sub-Components
// ==========================================

/* ---------- LevelBadge ---------- */
function LevelBadge({ level }: { level: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getLevelBg(level)}`}
    >
      {level}
    </span>
  );
}

/* ---------- ProgressBar ---------- */
function ProgressBar({
  score,
  level,
  height = 8,
}: {
  score: number;
  level: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, score));
  const color = getBarColor(level);
  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 200 ${height}`}
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="200" height={height} rx={height / 2} fill="#f3f4f6" />
        <rect
          x="0"
          y="0"
          width={pct * 2}
          height={height}
          rx={height / 2}
          fill={color}
        />
      </svg>
    </div>
  );
}

/* ---------- RadarChart (SVG, pure) ---------- */
function RadarChart({
  scores,
}: {
  scores: { motivation: number; ability: number; perseverance: number };
}) {
  const cx = 150;
  const cy = 140;
  const r = 110;

  const top = { x: cx, y: cy - r };
  const bottomLeft = {
    x: cx - r * Math.sin(Math.PI / 3),
    y: cy + r * Math.cos(Math.PI / 3),
  };
  const bottomRight = {
    x: cx + r * Math.sin(Math.PI / 3),
    y: cy + r * Math.cos(Math.PI / 3),
  };

  function getPoint(
    vertex: { x: number; y: number },
    pct: number
  ): { x: number; y: number } {
    const ratio = pct / 100;
    return {
      x: cx + (vertex.x - cx) * ratio,
      y: cy + (vertex.y - cy) * ratio,
    };
  }

  function polygonPoints(
    v1: { x: number; y: number },
    v2: { x: number; y: number },
    v3: { x: number; y: number },
    pct: number
  ): string {
    const p1 = getPoint(v1, pct);
    const p2 = getPoint(v2, pct);
    const p3 = getPoint(v3, pct);
    return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
  }

  const levels = [25, 50, 75, 100];

  const dM = getPoint(top, scores.motivation);
  const dAb = getPoint(bottomRight, scores.ability);
  const dPe = getPoint(bottomLeft, scores.perseverance);
  const dataPath = `M ${dM.x} ${dM.y} L ${dAb.x} ${dAb.y} L ${dPe.x} ${dPe.y} Z`;

  const labels = [
    { text: "学习动力", x: cx, y: top.y - 18, anchor: "middle" as const },
    {
      text: "学习毅力",
      x: bottomLeft.x - 14,
      y: bottomLeft.y + 24,
      anchor: "end" as const,
    },
    {
      text: "学习能力",
      x: bottomRight.x + 14,
      y: bottomRight.y + 24,
      anchor: "start" as const,
    },
  ];

  return (
    <svg
      viewBox="0 0 300 290"
      width="280"
      height="270"
      className="mx-auto block"
    >
      {/* Grid polygons */}
      {levels.map((lv) => (
        <polygon
          key={lv}
          points={polygonPoints(top, bottomLeft, bottomRight, lv)}
          fill="none"
          stroke="#c6dfa0"
          strokeWidth="0.8"
          strokeDasharray="4 3"
          opacity="0.7"
        />
      ))}

      {/* Axis lines */}
      <line x1={cx} y1={cy} x2={top.x} y2={top.y} stroke="#c6dfa0" strokeWidth="0.8" />
      <line x1={cx} y1={cy} x2={bottomLeft.x} y2={bottomLeft.y} stroke="#c6dfa0" strokeWidth="0.8" />
      <line x1={cx} y1={cy} x2={bottomRight.x} y2={bottomRight.y} stroke="#c6dfa0" strokeWidth="0.8" />

      {/* Data polygon */}
      <path d={dataPath} fill="#d2e659" fillOpacity="0.3" stroke="#6a9b1e" strokeWidth="2" />

      {/* Data points */}
      {[dM, dAb, dPe].map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#6a9b1e" stroke="#fff" strokeWidth="1.5" />
      ))}

      {/* Axis labels */}
      {labels.map((lb) => (
        <text
          key={lb.text}
          x={lb.x}
          y={lb.y}
          textAnchor={lb.anchor}
          className="text-[12px] font-medium"
          fill="#374151"
        >
          {lb.text}
        </text>
      ))}

      {/* Score values at data points */}
      <text x={dM.x + 8} y={dM.y - 6} className="text-[11px] font-semibold" fill="#4a7c00">
        {scores.motivation}
      </text>
      <text x={dAb.x + 8} y={dAb.y + 4} className="text-[11px] font-semibold" fill="#4a7c00">
        {scores.ability}
      </text>
      <text x={dPe.x - 32} y={dPe.y + 4} className="text-[11px] font-semibold" fill="#4a7c00">
        {scores.perseverance}
      </text>
    </svg>
  );
}

/* ---------- ScoreCard ---------- */
function ScoreCard({
  name,
  score,
  level,
}: {
  name: string;
  score: number;
  level: string;
}) {
  const scoreColor = getLevelColor(level);
  return (
    <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm print:break-inside-avoid min-w-[140px]">
      <p className="text-sm text-gray-500 mb-2">{name}</p>
      <div className="flex items-end gap-2 mb-2">
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ color: scoreColor }}
        >
          {score}
        </span>
      </div>
      <LevelBadge level={level} />
    </div>
  );
}

/* ---------- DimensionGroup ---------- */
function DimensionGroup({
  systemKey,
  systemInfo,
  dimensionScores,
}: {
  systemKey: string;
  systemInfo: { name: string; icon: string; dimensions: string[] };
  dimensionScores: Record<string, DimensionScoreEntry>;
}) {
  return (
    <div className="flex-1 min-w-[240px]">
      <h5 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
        <span>{systemInfo.icon}</span>
        {systemInfo.name}系统
      </h5>
      <div className="space-y-3">
        {systemInfo.dimensions.map((dimCode) => {
          const dim = dimensionScores[dimCode];
          if (!dim) return null;
          return (
            <div key={dimCode} className="flex items-center gap-3">
              <span className="w-[72px] shrink-0 text-sm text-gray-700 font-medium">
                {dim.name}
              </span>
              <div className="flex-1">
                <ProgressBar score={dim.score} level={dim.level} height={10} />
              </div>
              <span className="w-8 text-right text-sm font-semibold tabular-nums text-gray-800">
                {dim.score}
              </span>
              <LevelBadge level={dim.level} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- ModuleGroup (collapsible) ---------- */
function ModuleGroup({
  systemKey,
  systemInfo,
  dimensionScores,
  moduleScores,
}: {
  systemKey: string;
  systemInfo: { name: string; icon: string; dimensions: string[] };
  dimensionScores: Record<string, DimensionScoreEntry>;
  moduleScores: Record<string, ModuleScoreEntry>;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const dims = systemInfo.dimensions
    .map((dimCode) => {
      const dim = dimensionScores[dimCode];
      if (!dim) return null;
      const mods = Object.entries(moduleScores).filter(
        ([modCode]) => MODULE_DIM_MAP[modCode] === dimCode
      );
      return { code: dimCode, dim, mods };
    })
    .filter(Boolean) as Array<{
    code: string;
    dim: DimensionScoreEntry;
    mods: Array<[string, ModuleScoreEntry]>;
  }>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden print:break-inside-avoid">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/60 transition-colors no-print"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{systemInfo.icon}</span>
          <span className="text-sm font-semibold text-gray-900">
            {systemInfo.name}
          </span>
          <span className="text-xs text-gray-400">
            {systemInfo.dimensions.length}个维度 · {Object.keys(moduleScores).filter((k) => systemInfo.dimensions.includes(MODULE_DIM_MAP[k] || "")).length}个模块
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {(isOpen ? true : false) && (
        <div className="px-5 pb-5 space-y-5 no-print">
          {dims.map(({ code: dimCode, dim, mods }) => (
            <div key={dimCode}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-sm font-semibold text-gray-800">
                  {dim.name}
                </span>
                <span className="text-xs text-gray-400">{dim.score}分</span>
                <LevelBadge level={dim.level} />
              </div>
              <div className="space-y-2 pl-2">
                {mods.map(([modCode, mod]) => (
                  <div
                    key={modCode}
                    className="flex items-center gap-3"
                  >
                    <span className="w-28 shrink-0 text-xs text-gray-600">
                      {mod.name}
                    </span>
                    <div className="flex-1 max-w-[180px]">
                      <ProgressBar
                        score={mod.score}
                        level={mod.level}
                        height={6}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">
                      {mod.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Print: always expanded */}
      <div className="hidden print:block px-5 pb-5 space-y-5">
        {dims.map(({ code: dimCode, dim, mods }) => (
          <div key={dimCode}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-sm font-semibold text-gray-800">
                {dim.name}
              </span>
              <span className="text-xs text-gray-400">{dim.score}分</span>
              <LevelBadge level={dim.level} />
            </div>
            <div className="space-y-2 pl-2">
              {mods.map(([modCode, mod]) => (
                <div
                  key={modCode}
                  className="flex items-center gap-3"
                >
                  <span className="w-28 shrink-0 text-xs text-gray-600">
                    {mod.name}
                  </span>
                  <div className="flex-1 max-w-[180px]">
                    <ProgressBar
                      score={mod.score}
                      level={mod.level}
                      height={6}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-10 text-right tabular-nums">
                    {mod.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- ChapterSection ---------- */
function ChapterSection({
  title,
  content,
  chapterNum,
  isFirst,
  profile,
}: {
  title: string;
  content: string;
  chapterNum: number | null;
  isFirst: boolean;
  profile: ReportData["profile"];
}) {
  return (
    <section className="mt-14 print:break-before-page">
      {/* Chapter marker */}
      <div className="flex items-center gap-3 mb-6">
        {chapterNum !== null && (
          <div className="w-9 h-9 rounded-full bg-[#6a9b1e] flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
            {chapterNum}
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          {title}
        </h2>
      </div>

      {/* 9 Dimensions (inserted after Chapter 1 heading) */}
      {isFirst && profile?.dimensionScores && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-8 shadow-sm print:break-inside-avoid">
          <h4 className="text-base font-bold text-gray-900 mb-5">
            九大维度测评分析
          </h4>
          <div className="flex gap-8 flex-wrap">
            {SYSTEM_ORDER.map((sysKey) => {
              const info = SYSTEM_INFO[sysKey];
              if (!info) return null;
              return (
                <DimensionGroup
                  key={sysKey}
                  systemKey={sysKey}
                  systemInfo={info}
                  dimensionScores={profile.dimensionScores}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* AI HTML Content */}
      {content.trim() && (
        <div className="max-w-[760px]">
          <div
            className="report-prose text-gray-800 text-[15px]"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </section>
  );
}

/* ---------- HighlightCard ---------- */
function HighlightCard({
  title,
  accentColor,
  icon,
  children,
}: {
  title: string;
  accentColor: "green" | "orange";
  icon: string;
  children: React.ReactNode;
}) {
  const borderClass =
    accentColor === "green" ? "border-l-[#6a9b1e]" : "border-l-amber-500";
  const titleColor =
    accentColor === "green" ? "text-[#4a7c00]" : "text-amber-700";
  return (
    <div
      className={`rounded-xl border border-gray-100 border-l-4 ${borderClass} bg-white p-5 my-5 shadow-sm print:break-inside-avoid`}
    >
      <h4
        className={`text-sm font-bold ${titleColor} mb-2 flex items-center gap-1.5`}
      >
        <span>{icon}</span>
        {title}
      </h4>
      <div className="text-gray-700 text-[15px] leading-[1.8]">{children}</div>
    </div>
  );
}

// ==========================================
// Main Page Component
// ==========================================

export default function ReportPage() {
  const params = useParams();
  const handbookId = params.id as string;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${handbookId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "加载失败" }));
        setError(
          (err as { error?: string }).error || "加载失败"
        );
        return;
      }
      const json: ReportData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络请求失败");
    }
  }, [handbookId]);

  useEffect(() => {
    fetchReport().finally(() => setLoading(false));
  }, [fetchReport]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#6a9b1e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">正在加载成长导航手册...</p>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#fafafa]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            无法加载报告
          </h2>
          <p className="text-gray-500 text-sm">
            {error || "报告不存在或已过期"}
          </p>
        </div>
      </div>
    );
  }

  const { handbook, assessment, profile } = data;
  const html = sanitizeHtml(handbook.contentHtml || handbook.aiRawOutput || "");
  const sections = parseReportSections(html).filter(
    (s) => !shouldSkipSection(s.title)
  );

  // System scores
  const sysScores = profile?.systemScores || {};
  const sysEntries = SYSTEM_ORDER.map((key) => ({
    key,
    name: SYSTEM_INFO[key]?.name || key,
    icon: SYSTEM_INFO[key]?.icon || "",
    score: sysScores[key]?.score ?? 0,
    level: sysScores[key]?.level ?? "中",
  }));

  const studentName = assessment.studentName || "同学";
  const createdDate = new Date(handbook.createdAt).toLocaleDateString(
    "zh-CN",
    { year: "numeric", month: "long", day: "numeric" }
  );

  // Find weakest system for bottleneck card
  let weakestSystem = sysEntries[0];
  for (const s of sysEntries) {
    if (s.score < weakestSystem.score) weakestSystem = s;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />

      <div className="min-h-dvh bg-[#fafafa] print:bg-white">
        {/* ======== Sticky Header ======== */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 no-print">
          <div className="mx-auto max-w-[960px] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#4a7c00] tracking-tight">
                青柠伴学
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">成长导航手册</span>
            </div>
            <button
              onClick={() => window.print()}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              🖨️ 打印 / 下载PDF
            </button>
          </div>
        </header>

        {/* Print-only header */}
        <div className="hidden print:flex print:justify-between print:items-center print:mb-4 print:text-xs print:text-gray-400">
          <span className="font-bold text-[#4a7c00]">
            青柠伴学 · 成长导航手册
          </span>
          <span>
            {studentName} · {createdDate}
          </span>
        </div>

        {/* ======== Main ======== */}
        <main className="mx-auto max-w-[960px] px-6 pb-20">
          {/* ==== 1. User Info Card ==== */}
          <section className="pt-8 print:pt-4">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 print:break-inside-avoid">
              <h3 className="text-sm font-bold text-gray-500 mb-4 tracking-wide">
                用户信息
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
                <div>
                  <span className="text-gray-400">学生姓名</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {assessment.studentName || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">所处年级</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {assessment.grade || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">学生性别</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {assessment.studentGender || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">家长姓名</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {assessment.parentName || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">测评时间</span>
                  <p className="font-semibold text-gray-900 mt-0.5">
                    {assessment.startedAt
                      ? new Date(assessment.startedAt).toLocaleDateString(
                          "zh-CN"
                        )
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==== 2. Learning Type Header ==== */}
          {profile && (
            <section className="mt-8">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xl">🎯</span>
                <span className="text-base font-semibold text-gray-800">
                  学习类型：
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d2e659]/25 border border-[#d2e659]/50 px-4 py-1.5 text-sm font-bold text-[#3d5c00]">
                  <span className="text-lg">
                    {profile.learningModeEmoji || "📊"}
                  </span>
                  {profile.learningModeName || profile.learningMode}
                </span>
              </div>
              {/* System level tags */}
              <div className="flex gap-2.5 mt-3 flex-wrap">
                {sysEntries.map((sys) => (
                  <span
                    key={sys.key}
                    className="inline-block rounded-full px-3.5 py-1 text-xs font-semibold"
                    style={getSystemTagStyle(sys.level)}
                  >
                    {sys.name}：{sys.level}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ==== 3. Radar Chart ==== */}
          {profile && (
            <section className="mt-8">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm print:break-inside-avoid">
                <h4 className="text-base font-bold text-gray-900 mb-4 text-center">
                  三系统评分雷达图
                </h4>
                <RadarChart
                  scores={{
                    motivation: sysScores.motivation?.score ?? 0,
                    ability: sysScores.ability?.score ?? 0,
                    perseverance: sysScores.perseverance?.score ?? 0,
                  }}
                />
              </div>
            </section>
          )}

          {/* ==== 4. Three Score Cards ==== */}
          {profile && (
            <section className="mt-6">
              <div className="flex gap-4 flex-wrap sm:flex-nowrap">
                {sysEntries.map((sys) => (
                  <ScoreCard
                    key={sys.key}
                    name={sys.name}
                    score={sys.score}
                    level={sys.level}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ==== 5. Profile Summary Cards ==== */}
          {profile && (
            <section className="mt-8 space-y-4">
              {/* Learning Type Card */}
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm print:break-inside-avoid">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">✨</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: "#4a7c00" }}
                  >
                    {profile.learningModeName || profile.learningMode}
                  </span>
                  <span className="rounded-full bg-[#d2e659]/20 border border-[#d2e659]/40 px-2.5 py-0.5 text-xs font-semibold text-[#3d5c00]">
                    学习类型
                  </span>
                  {sysEntries.map((sys) => (
                    <span
                      key={sys.key}
                      className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={getSystemTagStyle(sys.level)}
                    >
                      {sys.name}：{sys.level}
                    </span>
                  ))}
                </div>
                {profile.summary && (
                  <p className="text-[15px] text-gray-600 leading-[1.9]">
                    {profile.summary}
                  </p>
                )}
              </div>

              {/* Core Bottleneck Card */}
              <HighlightCard
                title="核心瓶颈"
                accentColor="orange"
                icon="⚠️"
              >
                <p className="font-semibold text-gray-900 mb-1">
                  {weakestSystem.name}系统 — {weakestSystem.level}（
                  {weakestSystem.score}分）
                </p>
                <p className="text-gray-600">
                  {weakestSystem.name}是当前最需要关注的系统维度，建议通过针对性训练提升{weakestSystem.name}水平。
                </p>
              </HighlightCard>

              {/* Positive Feedback / Growth Focus Card */}
              {profile.growthFocus && (
                <HighlightCard
                  title="正向循环建议"
                  accentColor="green"
                  icon="✅"
                >
                  <p className="font-semibold text-gray-900 mb-1">
                    {profile.growthFocus}
                  </p>
                  {profile.growthFocusDetail && (
                    <p className="text-gray-600">
                      {profile.growthFocusDetail}
                    </p>
                  )}
                </HighlightCard>
              )}
            </section>
          )}

          {/* Divider */}
          <hr className="border-gray-100 my-10" />

          {/* ==== 6-7. Chapter Sections (with dimensions) ==== */}
          {sections.map((section, idx) => {
            const isFirstChapter = idx === 0;
            return (
              <ChapterSection
                key={section.id}
                title={section.title}
                content={section.content}
                chapterNum={section.chapterNum}
                isFirst={isFirstChapter && !!profile?.dimensionScores}
                profile={profile}
              />
            );
          })}

          {/* Fallback: render raw HTML if no sections parsed */}
          {sections.length === 0 && html && (
            <section className="mt-8">
              <div className="max-w-[760px]">
                <div
                  className="report-prose text-gray-800 text-[15px]"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </section>
          )}

          {/* Strengths */}
          {profile?.strengths && profile.strengths.length > 0 && (
            <div className="mt-10">
              <HighlightCard
                title="核心优势"
                accentColor="green"
                icon="🏆"
              >
                <div className="space-y-2">
                  {profile.strengths.map((s, i) => {
                    const modName =
                      profile.moduleScores?.[s.code]?.name;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900">
                          {modName || s.code}
                        </span>
                        <span className="text-sm text-[#4a7c00] font-semibold">
                          {s.score}分
                        </span>
                      </div>
                    );
                  })}
                </div>
              </HighlightCard>
            </div>
          )}

          {/* Weaknesses */}
          {profile?.weaknesses && profile.weaknesses.length > 0 && (
            <div className="mt-4">
              <HighlightCard
                title="需要关注的成长空间"
                accentColor="orange"
                icon="📌"
              >
                <div className="space-y-2">
                  {profile.weaknesses.map((s, i) => {
                    const modName =
                      profile.moduleScores?.[s.code]?.name;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900">
                          {modName || s.code}
                        </span>
                        <span className="text-sm text-amber-700 font-semibold">
                          {s.score}分
                        </span>
                      </div>
                    );
                  })}
                </div>
              </HighlightCard>
            </div>
          )}
        </main>

        {/* ======== Footer ======== */}
        <footer className="border-t border-gray-100 bg-white no-print">
          <div className="mx-auto max-w-[960px] px-6 py-6 flex items-center justify-between text-xs text-gray-400">
            <span>青柠伴学 Growth OS</span>
            <span>
              报告ID: {handbook.id.slice(0, 8)}... · 生成于{" "}
              {createdDate}
            </span>
          </div>
        </footer>

        {/* Print footer */}
        <div className="hidden print:block print:text-center print:text-xs print:text-gray-300 print:mt-8 print:pt-4 print:border-t print:border-gray-100">
          <p>
            青柠伴学 · 成长导航手册 · {studentName} ·{" "}
            {handbook.id.slice(0, 8)} · {createdDate}
          </p>
        </div>
      </div>
    </>
  );
}

// ==========================================
// CSS: Print + Prose Styling
// ==========================================

const REPORT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap');

/* ===== Report Prose Styling ===== */
.report-prose {
  max-width: 760px;
}
.report-prose h1 {
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  color: #111827;
  padding-left: 12px;
  border-left: 4px solid #6a9b1e;
}
.report-prose h2 {
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: #111827;
  padding-left: 12px;
  border-left: 4px solid #86b930;
}
.report-prose h3 {
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: #1f2937;
  padding-left: 10px;
  border-left: 3px solid #a3cc52;
}
.report-prose h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.2rem;
  margin-bottom: 0.5rem;
  color: #374151;
}
.report-prose p {
  margin-bottom: 1.2rem;
  line-height: 1.9;
  color: #374151;
}
.report-prose ul, .report-prose ol {
  margin-bottom: 1.2rem;
  padding-left: 1.5rem;
}
.report-prose li {
  margin-bottom: 0.5rem;
  line-height: 1.85;
  color: #374151;
}
.report-prose ul li::marker {
  color: #86b930;
}
.report-prose ol li::marker {
  color: #6a9b1e;
  font-weight: 600;
}
.report-prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2rem 0;
  font-size: 0.9rem;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
.report-prose th, .report-prose td {
  padding: 10px 14px;
  border: 1px solid #e5e7eb;
  text-align: left;
  line-height: 1.6;
}
.report-prose th {
  background: #f8fdf0;
  font-weight: 600;
  color: #374151;
}
.report-prose tr:nth-child(even) td {
  background: #fafafa;
}
.report-prose strong, .report-prose b {
  font-weight: 600;
  color: #111827;
}
.report-prose em, .report-prose i {
  font-style: italic;
  color: #4b5563;
}
.report-prose blockquote {
  border-left: 4px solid #86b930;
  padding: 12px 16px;
  margin: 1.2rem 0;
  background: #f8fdf0;
  border-radius: 0 8px 8px 0;
  color: #4b5563;
  font-style: italic;
}
.report-prose blockquote p {
  margin-bottom: 0.5rem;
}
.report-prose blockquote p:last-child {
  margin-bottom: 0;
}
.report-prose a {
  color: #4a7c00;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.report-prose a:hover {
  color: #3d5c00;
}
.report-prose img {
  max-width: 100%;
  border-radius: 10px;
  margin: 1.2rem 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.report-prose code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.88em;
  color: #374151;
}
.report-prose pre {
  background: #1f2937;
  color: #e5e7eb;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.2rem 0;
  font-size: 0.88rem;
  line-height: 1.6;
}
.report-prose pre code {
  background: transparent;
  padding: 0;
  color: inherit;
}
.report-prose hr {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 2rem 0;
}

/* ===== Screen-only helpers ===== */
.no-print {
  /* visible on screen, hidden when printing */
}

/* ===== Print Styles ===== */
@media print {
  @page {
    size: A4;
    margin: 18mm 14mm;
  }

  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    font-size: 11.5px;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .no-print {
    display: none !important;
  }

  .print\\:break-inside-avoid {
    break-inside: avoid;
  }

  .print\\:break-before-page {
    break-before: page;
  }

  .print\\:pt-4 {
    padding-top: 1rem !important;
  }

  .print\\:bg-white {
    background: white !important;
  }

  .print\\:flex {
    display: flex !important;
  }

  .print\\:block {
    display: block !important;
  }

  .print\\:justify-between {
    justify-content: space-between !important;
  }

  .print\\:items-center {
    align-items: center !important;
  }

  .print\\:mb-4 {
    margin-bottom: 1rem !important;
  }

  .print\\:text-xs {
    font-size: 0.75rem !important;
  }

  .print\\:text-gray-400,
  .print\\:text-gray-300 {
    color: #9ca3af !important;
  }

  .print\\:text-center {
    text-align: center !important;
  }

  .print\\:mt-8 {
    margin-top: 2rem !important;
  }

  .print\\:pt-4 {
    padding-top: 1rem !important;
  }

  .print\\:border-t {
    border-top: 1px solid #f3f4f6 !important;
  }

  /* Force show expanded modules in print */
  .hidden {
    display: revert !important;
  }

  /* Clean up spacing */
  main {
    padding: 0 !important;
  }

  /* Remove sticky positioning */
  header {
    position: static !important;
  }

  /* Ensure radar chart prints well */
  svg {
    max-width: 100%;
  }
}
`;
