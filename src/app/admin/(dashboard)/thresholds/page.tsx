"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function ThresholdsPage() {
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

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

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

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">分值与阈值配置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            配置强/中/弱的分数范围。修改阈值不会自动覆盖历史报告。
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchThresholds}
            className="gap-2 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
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
      </div>

      {saved && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          配置已保存
        </p>
      )}

      {/* Threshold table */}
      <div className="max-w-lg space-y-4">
        {thresholds.map((t, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="w-16">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  t.level === "强"
                    ? "bg-emerald-100 text-emerald-700"
                    : t.level === "弱"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                }`}
              >
                {t.level}
              </span>
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">最低分</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={t.minValue}
                  onChange={(e) => updateThreshold(i, "minValue", parseInt(e.target.value))}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                />
              </div>
              <span className="mt-5 text-muted-foreground">—</span>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">最高分</label>
                <input
                  type="number"
                  min={0}
                  max={100}
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
          <p><strong className="text-foreground">正向题:</strong> 非常符合=100, 比较符合=90, 比较不符合=30, 完全不符合=0</p>
          <p className="mt-2"><strong className="text-foreground">反向题:</strong> 非常符合=0, 比较符合=30, 比较不符合=90, 完全不符合=100</p>
          <p className="mt-2"><strong className="text-foreground">不了解:</strong> 不计分</p>
          <p className="mt-3">模块得分 = 模块内题目均分 → 维度得分 = 3模块均分 → 系统得分 = 3维度均分</p>
        </div>
      </section>
    </div>
  );
}
