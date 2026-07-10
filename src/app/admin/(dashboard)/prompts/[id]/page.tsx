"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Upload, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PromptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  const isNew = promptId === "new";

  const [prompt, setPrompt] = useState<Record<string, unknown> | null>(null);
  const [versions, setVersions] = useState<Record<string, unknown>[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [type, setType] = useState("REPORT_GENERATION");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");

  const fetchPrompt = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/admin/prompts/${promptId}`);
      if (res.ok) {
        const data = await res.json();
        setPrompt(data.prompt);
        setVersions(data.versions || []);
        setUsageCount(data.usageCount || 0);
        setName(data.prompt.name);
        setType(data.prompt.type);
        setContent(data.prompt.content);
        setDescription(data.prompt.description || "");
      }
    } catch {}
    setLoading(false);
  }, [promptId, isNew]);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch("/api/admin/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, type, content, description }),
        });
        if (res.ok) {
          const data = await res.json();
          router.push(`/admin/prompts/${data.prompt.id}`);
          return;
        }
      } else {
        await fetch(`/api/admin/prompts/${promptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, description }),
        });
      }
      await fetchPrompt();
    } catch {}
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!confirm("发布此版本？发布后将用于新生成的报告。")) return;
    try {
      await fetch(`/api/admin/prompts/${promptId}/publish`, { method: "POST" });
      await fetchPrompt();
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/admin/prompts" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {isNew ? "新建 Prompt" : `编辑: ${name}`}
            </h1>
            {!isNew && prompt && (
              <p className="text-xs text-muted-foreground">
                v{prompt.version as number} · 使用次数: {usageCount}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1 rounded-lg"
          >
            <Save className="h-4 w-4" />
            保存
          </Button>
          {!isNew && (
            <Button
              size="sm"
              onClick={handlePublish}
              className="gap-1 rounded-lg bg-primary text-primary-foreground hover:brightness-95"
            >
              <Upload className="h-4 w-4" />
              发布此版本
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {isNew && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">名称</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 报告生成主 Prompt"
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">类型</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                  >
                    <option value="REPORT_GENERATION">报告生成</option>
                    <option value="AI_CHECK">AI 检查</option>
                    <option value="REPORT_REGENERATION">报告重新生成</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">说明</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述此 Prompt 的用途和版本变更内容"
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Prompt 内容
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在此编写 Prompt 内容...&#10;&#10;支持变量占位符:&#10;{{studentName}} {{grade}} {{systemScores}} {{dimensionScores}} {{moduleScores}} {{answers}}"
                className="min-h-[500px] w-full rounded-xl border border-border bg-card p-4 font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
        </main>

        {/* Version history sidebar */}
        {!isNew && (
          <aside className="w-72 shrink-0 overflow-y-auto border-l border-border bg-card p-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              版本历史
            </h3>
            <div className="mt-4 space-y-2">
              {versions.map((v) => (
                <Link
                  key={v.id as string}
                  href={`/admin/prompts/${v.id as string}`}
                  className={`block rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    v.isActive
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">v{v.version as number}</span>
                    {v.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                        当前
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(v.createdAt as string).toLocaleDateString("zh-CN")}
                  </p>
                </Link>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
