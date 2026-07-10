"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ToggleLeft, ToggleRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ── Question types ── */
type Question = {
  id: string;
  order: number;
  stage: number;
  content: string;
  isActive: boolean;
  isReverseScored: boolean;
  module: string;
  dimension: string;
  system: string;
};

/* ── Threshold types ── */
type Threshold = {
  level: string;
  minValue: number;
  maxValue: number;
};

const DEFAULT_THRESHOLDS: Threshold[] = [
  { level: "弱", minValue: 0, maxValue: 50 },
  { level: "中", minValue: 51, maxValue: 72 },
  { level: "强", minValue: 73, maxValue: 100 },
];

/* ── Tab definitions ── */
const TABS = [
  { key: "questions", label: "题库" },
  { key: "thresholds", label: "阈值配置" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ════════════════════════════════════════════
   Questions Tab
   ════════════════════════════════════════════ */
function QuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [version, setVersion] = useState<{ id: string; version: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/questions");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setVersion(data.version);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleToggleActive = async (q: Question) => {
    try {
      await fetch(`/api/admin/questions/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      await fetchQuestions();
    } catch {}
  };

  const handleSaveContent = async (q: Question) => {
    try {
      await fetch(`/api/admin/questions/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      setEditingId(null);
      await fetchQuestions();
    } catch {}
  };

  const filtered = questions.filter(
    (q) =>
      !search ||
      q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.module.includes(search) ||
      q.system.includes(search)
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {version ? `版本 v${version.version}` : "未创建题库"} · {questions.length} 题
      </p>

      <Input
        placeholder="搜索题目内容、模块、系统..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 max-w-sm rounded-lg"
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-12 px-4 py-3 text-left font-medium text-muted-foreground">#</th>
              <th className="w-16 px-4 py-3 text-left font-medium text-muted-foreground">阶段</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">题目内容</th>
              <th className="w-24 px-4 py-3 text-left font-medium text-muted-foreground">系统</th>
              <th className="w-24 px-4 py-3 text-left font-medium text-muted-foreground">维度</th>
              <th className="w-24 px-4 py-3 text-left font-medium text-muted-foreground">模块</th>
              <th className="w-16 px-4 py-3 text-left font-medium text-muted-foreground">计分</th>
              <th className="w-16 px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="w-16 px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">{questions.length === 0 ? "题库为空" : "无匹配结果"}</td></tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className={`border-b border-border ${q.isActive ? "hover:bg-secondary/30" : "opacity-50"}`}>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{q.order}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{q.stage === 1 ? "动力" : q.stage === 2 ? "能力" : "毅力"}</span>
                  </td>
                  <td className="max-w-md px-4 py-3">
                    {editingId === q.id ? (
                      <div className="flex gap-2">
                        <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} className="h-8 text-sm" />
                        <Button size="sm" onClick={() => handleSaveContent(q)} className="h-8 rounded text-xs">保存</Button>
                      </div>
                    ) : (
                      <p className="cursor-pointer truncate text-foreground" onClick={() => { setEditingId(q.id); setEditContent(q.content); }} title={q.content}>
                        {q.content.length > 50 ? q.content.slice(0, 50) + "..." : q.content}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{q.system}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{q.dimension}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{q.module}</td>
                  <td className="px-4 py-3">
                    {q.isReverseScored ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">反向</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">正向</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(q)}>
                      {q.isActive ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Thresholds Tab
   ════════════════════════════════════════════ */
function ThresholdsTab() {
  const [thresholds, setThresholds] = useState<Threshold[]>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchThresholds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/thresholds");
      if (res.ok) {
        const data = await res.json();
        if (data.thresholds && data.thresholds.length > 0) {
          setThresholds(
            data.thresholds.map((t: Record<string, unknown>) => ({
              level: t.level as string,
              minValue: t.minValue as number,
              maxValue: t.maxValue as number,
            }))
          );
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchThresholds(); }, [fetchThresholds]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thresholds }),
      });
      if (res.ok) setSaved(true);
    } catch {}
    setSaving(false);
  };

  const updateThreshold = (index: number, field: keyof Threshold, value: string | number) => {
    setThresholds((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setSaved(false);
  };

  if (loading) return <p className="text-muted-foreground">加载中...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">配置强/中/弱的分数范围。修改阈值不会自动覆盖历史报告。</p>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-2 rounded-lg bg-primary text-primary-foreground hover:brightness-95"
        >
          <Save className="h-4 w-4" />
          保存配置
        </Button>
      </div>

      {saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">配置已保存</p>
      )}

      <div className="max-w-lg space-y-4">
        {thresholds.map((t, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
            <div className="w-16">
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                t.level === "强" ? "bg-emerald-100 text-emerald-700"
                  : t.level === "弱" ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
              }`}>{t.level}</span>
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">最低分</label>
                <input
                  type="number" min={0} max={100}
                  value={t.minValue}
                  onChange={(e) => updateThreshold(i, "minValue", parseInt(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                />
              </div>
              <span className="mt-5 text-muted-foreground">—</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">最高分</label>
                <input
                  type="number" min={0} max={100}
                  value={t.maxValue}
                  onChange={(e) => updateThreshold(i, "maxValue", parseInt(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scoring reference */}
      <section className="max-w-lg space-y-3">
        <h2 className="text-lg font-medium text-foreground">计分规则参考</h2>
        <div className="rounded-xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">正向题:</strong> 总是=100, 经常=90, 偶尔=30, 极少=0</p>
          <p className="mt-2"><strong className="text-foreground">反向题:</strong> 总是=0, 经常=30, 偶尔=90, 极少=100</p>
          <p className="mt-2"><strong className="text-foreground">不了解:</strong> 不计分</p>
          <p className="mt-3">模块得分 = 模块内题目均分 → 维度得分 = 3模块均分 → 系统得分 = 3维度均分</p>
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════
   Main Page
   ════════════════════════════════════════════ */
export default function QuestionsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("questions");

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">题库管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            题目管理与计分阈值配置
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeTab === "questions") {
              window.dispatchEvent(new CustomEvent("refresh-questions"));
            }
          }}
          className="gap-2 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-t-lg border-b-2 px-4 py-3 text-sm transition-colors ${
              activeTab === tab.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "questions" && <QuestionsTab />}
      {activeTab === "thresholds" && <ThresholdsTab />}
    </div>
  );
}
