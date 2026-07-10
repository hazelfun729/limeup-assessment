"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PromptItem = {
  id: string;
  name: string;
  type: string;
  latestVersion: number;
  isActive: boolean;
  description: string | null;
  updatedAt: string;
  versionCount: number;
};

const TYPE_LABELS: Record<string, string> = {
  REPORT_GENERATION: "报告生成",
  AI_CHECK: "AI 检查",
  REPORT_REGENERATION: "报告重新生成",
};

export default function ReportSettingsPage() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">报告设置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            报告格式、排版与提示词管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPrompts}
            className="gap-2 rounded-lg"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
          <Link href="/admin/prompts/new">
            <Button size="sm" className="gap-2 rounded-lg bg-primary text-primary-foreground hover:brightness-95">
              <Plus className="h-4 w-4" />
              新建提示词
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">名称</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">类型</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">最新版本</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">版本数</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">说明</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">更新时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : prompts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  暂无提示词，请点击"新建提示词"创建
                </td>
              </tr>
            ) : (
              prompts.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {TYPE_LABELS[p.type] || p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">v{p.latestVersion}</td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">已启用</span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">未启用</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{p.versionCount}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{p.description || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.updatedAt).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/prompts/${p.id}`} className="text-sm font-medium text-primary hover:underline">
                      编辑 →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
