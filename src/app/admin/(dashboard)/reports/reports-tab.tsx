"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Mail, Sparkles, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Report types ── */
type Report = {
  id: string;
  assessmentId: string;
  userEmail: string;
  studentName: string | null;
  learningMode: string | null;
  growthFocus: string | null;
  status: string;
  jobIssue?: string | null;
  createdAt: string;
  sentAt: string | null;
};

const REPORT_STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "AWAITING_PAYMENT", label: "支付待确认" },
  { value: "ANALYZING", label: "分析中" },
  { value: "REVIEWING", label: "待审核" },
  { value: "SENDING", label: "发送中" },
  { value: "SENT", label: "已发送" },
  { value: "FAILED", label: "失败" },
];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  AWAITING_PAYMENT: { label: "支付待确认", cls: "bg-orange-100 text-orange-700" },
  ANALYZING: { label: "分析中", cls: "bg-blue-100 text-blue-700" },
  REVIEWING: { label: "待审核", cls: "bg-amber-100 text-amber-700" },
  NEEDS_MANUAL_REVIEW: { label: "需人工处理", cls: "bg-red-100 text-red-700" },
  SENDING: { label: "发送中", cls: "bg-blue-100 text-blue-700" },
  SENT: { label: "已发送", cls: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "失败", cls: "bg-red-100 text-red-700" },
};

/* ════════════════════════════════════════════
   Reports Tab (with batch email sending)
   ════════════════════════════════════════════ */
export function ReportsTab() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<string, { status: string; actionId: string }>>(new Map());
  const [batchWorking, setBatchWorking] = useState(false);
  const [downloadingAnswers, setDownloadingAnswers] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ pageSize: "50", status: statusFilter });
      const res = await fetch(`/api/admin/reports?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(res.status === 401 ? "登录状态已失效，请重新登录" : "报告数据暂时无法获取，请检查数据库连接后重试");
      const data = await res.json();
      setReports(data.reports);
      setTotal(data.total);
    } catch (error) {
      setReports([]);
      setTotal(0);
      setLoadError(error instanceof Error && error.name === "TimeoutError"
        ? "数据库连接超时，请稍后重试"
        : error instanceof Error ? error.message : "报告数据暂时无法获取，请重试");
    } finally {
      setLoading(false);
      setSelectedItems(new Map());
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchReports(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchReports]);

  const ACTIONABLE = new Set(["ANALYZING", "REVIEWING", "SENDING"]);
  const actionableReports = reports.filter((r) => ACTIONABLE.has(r.status));
  const selectedCount = selectedItems.size;

  const selectedByStatus: Record<string, string[]> = {};
  for (const [, v] of selectedItems) {
    if (!selectedByStatus[v.status]) selectedByStatus[v.status] = [];
    selectedByStatus[v.status].push(v.actionId);
  }

  const toggleSelect = (r: Report) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.set(r.id, { status: r.status, actionId: r.id });
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCount === actionableReports.length && actionableReports.length > 0) {
      setSelectedItems(new Map());
    } else {
      const next = new Map<string, { status: string; actionId: string }>();
      for (const r of actionableReports) {
        next.set(r.id, { status: r.status, actionId: r.id });
      }
      setSelectedItems(next);
    }
  };

  const allActionableSelected = actionableReports.length > 0 && selectedCount === actionableReports.length;

  /* ── Batch report operations ── */

  const handleBatchGenerate = async () => {
    const ids = selectedByStatus["ANALYZING"];
    if (!ids || ids.length === 0) return;
    if (ids.length > 10) { alert("每次最多生成 10 份，请分批操作。"); return; }
    if (!confirm(`确认为 ${ids.length} 份报告生成 AI 内容？`)) return;
    setBatchWorking(true);
    try {
      const res = await fetch("/api/admin/reports/batch-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookIds: ids }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`新启动 ${data.generated} 份报告${data.alreadyQueued ? `，已在队列 ${data.alreadyQueued} 份` : ""}${data.skipped ? `，已有内容而跳过 ${data.skipped} 份` : ""}${data.failed ? `，失败 ${data.failed} 份` : ""}。可稍后刷新查看状态。`);
        setSelectedItems(new Map());
        await fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || "批量生成失败");
      }
    } catch {
      alert("网络错误");
    }
    setBatchWorking(false);
  };

  const handleBatchApprove = async () => {
    const ids = selectedByStatus["REVIEWING"];
    if (!ids || ids.length === 0) return;
    if (!confirm(`确认审核并向 ${ids.length} 位用户发送完整报告邮件？请先核对每份报告和收件地址。`)) return;
    setBatchWorking(true);
    try {
      const res = await fetch("/api/admin/reports/batch-send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookIds: ids }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "批量发送失败");
      const failed = result.results.filter((item: { success: boolean }) => !item.success);
      alert(`已确认发送 ${result.sent} 份；未成功 ${result.failed} 份。${failed.length ? `\n${failed.slice(0, 5).map((item: { error?: string }) => item.error).join("\n")}` : ""}`);
      setSelectedItems(new Map());
      await fetchReports();
    } catch (error) {
      alert(error instanceof Error ? error.message : "网络错误");
    }
    setBatchWorking(false);
  };

  const handleBatchSend = async () => {
    const ids = selectedByStatus["SENDING"];
    if (!ids || ids.length === 0) return;
    if (!confirm(`确认向 ${ids.length} 位用户发送成长手册邮件？`)) return;
    setBatchWorking(true);
    try {
      const res = await fetch("/api/admin/reports/batch-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookIds: ids }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`发送完成：成功 ${data.sent} 封${data.failed > 0 ? `，失败 ${data.failed} 封。\n${data.results.filter((item: { success: boolean }) => !item.success).slice(0, 5).map((item: { error?: string }) => item.error).join("\n")}` : ""}`);
        setSelectedItems(new Map());
        await fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || "发送失败");
      }
    } catch {
      alert("网络错误");
    }
    setBatchWorking(false);
  };

  /* ── Download handlers ── */
  const getSelectedAssessmentIds = () => {
    return Array.from(selectedItems.keys())
      .map((rowId) => reports.find((r) => r.id === rowId)?.assessmentId)
      .filter((id): id is string => !!id);
  };

  const handleDownloadAnswers = async () => {
    const ids = getSelectedAssessmentIds();
    if (ids.length === 0) return;
    setDownloadingAnswers(true);
    try {
      const res = await fetch("/api/admin/reports/batch-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentIds: ids }),
      });
      if (!res.ok) { alert("导出失败"); setDownloadingAnswers(false); return; }
      const { reports: data } = await res.json();

      const answerLabels: Record<string, string> = {
        ALWAYS: "总是", OFTEN: "经常", SOMETIMES: "偶尔", RARELY: "极少", UNKNOWN: "不了解",
      };
      const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;

      // Collect all unique questions across all students, sorted by order
      const questionMap = new Map<number, { order: number; content: string; system: string; dimension: string; module: string }>();
      for (const r of data) {
        for (const a of r.answers) {
          if (!questionMap.has(a.order)) {
            questionMap.set(a.order, { order: a.order, content: a.content, system: a.system, dimension: a.dimension, module: a.module });
          }
        }
      }
      const questions = Array.from(questionMap.values()).sort((a, b) => a.order - b.order);

      // Build horizontal CSV: columns = questions, rows = metadata + per-student answers/scores
      const rows: string[] = [];

      // Header rows (question metadata)
      rows.push(["题号", ...questions.map((q) => q.order)].join(","));
      rows.push(["题目", ...questions.map((q) => esc(q.content))].join(","));
      rows.push(["系统", ...questions.map((q) => esc(q.system))].join(","));
      rows.push(["维度", ...questions.map((q) => esc(q.dimension))].join(","));
      rows.push(["模块", ...questions.map((q) => esc(q.module))].join(","));

      // Per-student rows
      for (const r of data) {
        const ansMap = new Map<number, { answer: string }>();
        const scoreMap = new Map<number, number | null>();
        for (const a of r.answers) {
          ansMap.set(a.order, a);
          scoreMap.set(a.order, a.score);
        }

        rows.push(["学生", ...questions.map(() => esc(r.studentName))].join(","));
        rows.push(["邮箱", ...questions.map(() => esc(r.email))].join(","));
        rows.push(["答案", ...questions.map((q) => {
          const a = ansMap.get(q.order);
          return esc(a ? (answerLabels[a.answer] || a.answer) : "");
        })].join(","));
        rows.push(["得分", ...questions.map((q) => {
          const s = scoreMap.get(q.order);
          return s != null ? String(s) : "";
        })].join(","));
      }

      const bom = "\uFEFF";
      const blob = new Blob([bom + rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `原答卷_${new Date().toISOString().slice(0, 10)}_${data.length}份.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("下载失败"); }
    setDownloadingAnswers(false);
  };

  const handleDownloadReports = async () => {
    const ids = getSelectedAssessmentIds();
    if (ids.length === 0) return;
    setDownloadingReports(true);
    try {
      const res = await fetch("/api/admin/reports/batch-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentIds: ids }),
      });
      if (!res.ok) { alert("导出失败"); setDownloadingReports(false); return; }
      const { reports } = await res.json();

      for (const r of reports) {
        if (!r.contentHtml) continue;
        const fullHtml = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<title>成长导航手册 - ${r.studentName || r.email}</title>
<style>
body{max-width:760px;margin:40px auto;padding:0 20px;font-family:-apple-system,sans-serif;color:#333;line-height:1.8}
h1{font-size:1.6rem;border-left:4px solid #6a9b1e;padding-left:12px;margin-top:2.5rem}
h2{font-size:1.3rem;border-left:4px solid #86b930;padding-left:12px;margin-top:2rem}
h3{font-size:1.1rem;padding-left:10px;border-left:3px solid #a3cc52;margin-top:1.5rem}
p{margin-bottom:1rem}
ul,ol{padding-left:1.5rem;margin-bottom:1rem}
li{margin-bottom:0.5rem}
table{width:100%;border-collapse:collapse;margin:1rem 0}
th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
th{background:#f8fdf0}
strong{color:#111}
blockquote{border-left:4px solid #86b930;padding:12px 16px;background:#f8fdf0;margin:1rem 0}
@media print{body{margin:0}h1,h2,h3{page-break-after:avoid}}
</style></head><body>
<h1>成长导航手册</h1>
<p><strong>学生：</strong>${r.studentName || "—"} &nbsp; <strong>年级：</strong>${r.grade || "—"} &nbsp; <strong>邮箱：</strong>${r.email}</p>
<hr>
${r.contentHtml}
</body></html>`;
        const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `成长导航手册_${r.studentName || r.email}.html`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch { alert("下载失败"); }
    setDownloadingReports(false);
  };

  const showCheckboxes = actionableReports.length > 0;
  const colCount = showCheckboxes ? 7 : 6;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {REPORT_STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                statusFilter === f.value
                  ? "bg-primary/10 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">已选 {selectedCount} 项</span>
            {(selectedByStatus["ANALYZING"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchGenerate} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />生成中...</> : <><Sparkles className="h-3.5 w-3.5" />批量生成报告 ({selectedByStatus["ANALYZING"].length})</>}
              </Button>
            )}
            {(selectedByStatus["REVIEWING"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchApprove} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />处理中...</> : <><CheckCircle className="h-3.5 w-3.5" />批量审核并发送 ({selectedByStatus["REVIEWING"].length})</>}
              </Button>
            )}
            {(selectedByStatus["SENDING"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchSend} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />发送中...</> : <><Mail className="h-3.5 w-3.5" />批量发送邮件 ({selectedByStatus["SENDING"].length})</>}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownloadAnswers} disabled={downloadingAnswers || downloadingReports}
              className="gap-1.5 rounded-lg">
              {downloadingAnswers ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />导出中...</> : <><Download className="h-3.5 w-3.5" />下载答卷</>}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadReports} disabled={downloadingAnswers || downloadingReports}
              className="gap-1.5 rounded-lg">
              {downloadingReports ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />导出中...</> : <><Download className="h-3.5 w-3.5" />下载报告</>}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {showCheckboxes && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allActionableSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                    title="全选可操作项"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">邮箱</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">学生</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">学习模式</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">创建时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : loadError ? (
              <tr><td colSpan={colCount} className="px-4 py-12 text-center text-destructive">
                {loadError} <button type="button" className="ml-2 underline" onClick={fetchReports}>重新加载</button>
              </td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={colCount} className="px-4 py-12 text-center text-muted-foreground">暂无报告</td></tr>
            ) : (
              reports.map((r) => {
                const badge = r.jobIssue
                  ? { label: r.jobIssue, cls: "bg-red-100 text-red-700" }
                  : STATUS_LABELS[r.status] || { label: r.status, cls: "bg-secondary text-muted-foreground" };
                const canSelect = ACTIONABLE.has(r.status);
                return (
                  <tr key={r.id} className={`border-b border-border hover:bg-secondary/30 ${selectedItems.has(r.id) ? "bg-emerald-50/50" : ""}`}>
                    {showCheckboxes && (
                      <td className="px-4 py-3">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={selectedItems.has(r.id)}
                            onChange={() => toggleSelect(r)}
                            className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                          />
                        ) : (
                          <span />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium">{r.userEmail}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.studentName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.learningMode || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3">
                      {r.status === "AWAITING_PAYMENT" ? (
                        <Link href="/admin/payments" className="text-sm font-medium text-primary hover:underline">
                          核对微信收款 →
                        </Link>
                      ) : (
                        <Link href={`/admin/reports/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                          管理 →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">共 {total} 份报告</p>
        {actionableReports.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {actionableReports.length} 项可操作 · 已选 {selectedCount} 项
          </p>
        )}
      </div>
    </div>
  );
}
