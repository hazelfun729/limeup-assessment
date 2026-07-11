"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Check, FileText, Mail, Sparkles, CheckCircle, Download } from "lucide-react";
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
  paymentId: string | null;
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

/* ── Email types ── */
type EmailRecord = {
  id: string;
  to: string;
  type: string;
  subject: string;
  status: string;
  sentAt: string | null;
  failedReason: string | null;
  createdAt: string;
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  VERIFICATION: "验证码",
  HANDBOOK: "成长手册",
  PASSWORD_RESET: "重置密码",
};

const EMAIL_STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待发送" },
  { value: "SENT", label: "已发送" },
  { value: "FAILED", label: "失败" },
];

/* ── Tab definitions ── */
const TABS = [
  { key: "reports", label: "报告管理", icon: FileText },
  { key: "emails", label: "邮件记录", icon: Mail },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ════════════════════════════════════════════
   Reports Tab (with batch email sending)
   ════════════════════════════════════════════ */
function ReportsTab() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Map<string, { status: string; actionId: string }>>(new Map());
  const [batchWorking, setBatchWorking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50", status: statusFilter });
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
    setSelectedItems(new Map());
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const ACTIONABLE = new Set(["AWAITING_PAYMENT", "ANALYZING", "REVIEWING", "SENDING"]);
  const actionableReports = reports.filter((r) => ACTIONABLE.has(r.status));
  const selectedCount = selectedItems.size;

  const selectedByStatus: Record<string, string[]> = {};
  for (const [, v] of selectedItems) {
    if (!selectedByStatus[v.status]) selectedByStatus[v.status] = [];
    selectedByStatus[v.status].push(v.actionId);
  }

  const toggleSelect = (r: Report) => {
    const actionId = r.status === "AWAITING_PAYMENT" ? (r.paymentId || r.id) : r.id;
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.set(r.id, { status: r.status, actionId });
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCount === actionableReports.length && actionableReports.length > 0) {
      setSelectedItems(new Map());
    } else {
      const next = new Map<string, { status: string; actionId: string }>();
      for (const r of actionableReports) {
        const actionId = r.status === "AWAITING_PAYMENT" ? (r.paymentId || r.id) : r.id;
        next.set(r.id, { status: r.status, actionId });
      }
      setSelectedItems(next);
    }
  };

  const allActionableSelected = actionableReports.length > 0 && selectedCount === actionableReports.length;

  /* ── Single payment confirm (for row button) ── */
  const handleConfirmPayment = async (paymentId: string) => {
    if (!confirm("确认该笔支付？确认后将自动生成报告。")) return;
    setConfirmingPayment(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        alert(`支付已确认，报告状态: ${data.reportStatus === "REVIEWING" ? "待审核" : "分析中"}`);
        await fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || "确认失败");
      }
    } catch {
      alert("网络错误");
    }
    setConfirmingPayment(null);
  };

  /* ── Batch operations ── */
  const handleBatchConfirm = async () => {
    const ids = selectedByStatus["AWAITING_PAYMENT"];
    if (!ids || ids.length === 0) return;
    if (!confirm(`确认 ${ids.length} 笔支付？确认后将自动生成报告。`)) return;
    setBatchWorking(true);
    try {
      const res = await fetch("/api/admin/payments/batch-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIds: ids }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`批量确认完成：成功 ${data.confirmed} 笔${data.failed > 0 ? `，失败 ${data.failed} 笔` : ""}`);
        setSelectedItems(new Map());
        await fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || "批量确认失败");
      }
    } catch {
      alert("网络错误");
    }
    setBatchWorking(false);
  };

  const handleBatchGenerate = async () => {
    const ids = selectedByStatus["ANALYZING"];
    if (!ids || ids.length === 0) return;
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
        alert(`批量生成完成：成功 ${data.generated} 份${data.failed > 0 ? `，失败 ${data.failed} 份` : ""}`);
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
    if (!confirm(`确认审核通过 ${ids.length} 份报告？`)) return;
    setBatchWorking(true);
    try {
      const promises = ids.map((id) =>
        fetch(`/api/admin/reports/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SENDING" }),
        })
      );
      const results = await Promise.allSettled(promises);
      const ok = results.filter((r) => r.status === "fulfilled").length;
      alert(`批量审核完成：成功 ${ok} 份${results.length - ok > 0 ? `，失败 ${results.length - ok} 份` : ""}`);
      setSelectedItems(new Map());
      await fetchReports();
    } catch {
      alert("网络错误");
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
        alert(`发送完成：成功 ${data.sent} 封${data.failed > 0 ? `，失败 ${data.failed} 封` : ""}`);
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
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/reports/batch-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentIds: ids }),
      });
      if (!res.ok) { alert("导出失败"); setDownloading(false); return; }
      const { reports } = await res.json();

      // Build CSV
      const rows: string[] = ["学生,邮箱,年级,题号,系统,维度,模块,题目,答案,得分"];
      const answerLabels: Record<string, string> = {
        ALWAYS: "总是", OFTEN: "经常", SOMETIMES: "偶尔", RARELY: "极少", UNKNOWN: "不了解",
      };
      for (const r of reports) {
        for (const a of r.answers) {
          const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
          rows.push([
            esc(r.studentName), esc(r.email), esc(r.grade),
            a.order, esc(a.system), esc(a.dimension), esc(a.module),
            esc(a.content), esc(answerLabels[a.answer] || a.answer), a.score ?? "",
          ].join(","));
        }
      }
      const bom = "\uFEFF";
      const blob = new Blob([bom + rows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `原答卷_${new Date().toISOString().slice(0, 10)}_${reports.length}份.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("下载失败"); }
    setDownloading(false);
  };

  const handleDownloadReports = async () => {
    const ids = getSelectedAssessmentIds();
    if (ids.length === 0) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/reports/batch-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentIds: ids }),
      });
      if (!res.ok) { alert("导出失败"); setDownloading(false); return; }
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
        // Small delay between downloads to avoid browser blocking
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch { alert("下载失败"); }
    setDownloading(false);
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
            {(selectedByStatus["AWAITING_PAYMENT"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchConfirm} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-[#6a9b1e] text-white hover:bg-[#5a8518]">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />处理中...</> : <><Check className="h-3.5 w-3.5" />批量确认支付 ({selectedByStatus["AWAITING_PAYMENT"].length})</>}
              </Button>
            )}
            {(selectedByStatus["ANALYZING"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchGenerate} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />生成中...</> : <><Sparkles className="h-3.5 w-3.5" />批量生成报告 ({selectedByStatus["ANALYZING"].length})</>}
              </Button>
            )}
            {(selectedByStatus["REVIEWING"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchApprove} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />处理中...</> : <><CheckCircle className="h-3.5 w-3.5" />批量审核通过 ({selectedByStatus["REVIEWING"].length})</>}
              </Button>
            )}
            {(selectedByStatus["SENDING"]?.length ?? 0) > 0 && (
              <Button size="sm" onClick={handleBatchSend} disabled={batchWorking}
                className="gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                {batchWorking ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />发送中...</> : <><Mail className="h-3.5 w-3.5" />批量发送邮件 ({selectedByStatus["SENDING"].length})</>}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleDownloadAnswers} disabled={downloading}
              className="gap-1.5 rounded-lg">
              {downloading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />导出中...</> : <><Download className="h-3.5 w-3.5" />下载答卷</>}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadReports} disabled={downloading}
              className="gap-1.5 rounded-lg">
              {downloading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" />导出中...</> : <><Download className="h-3.5 w-3.5" />下载报告</>}
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
            ) : reports.length === 0 ? (
              <tr><td colSpan={colCount} className="px-4 py-12 text-center text-muted-foreground">暂无报告</td></tr>
            ) : (
              reports.map((r) => {
                const badge = STATUS_LABELS[r.status] || { label: r.status, cls: "bg-secondary text-muted-foreground" };
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
                        <button
                          onClick={() => r.paymentId && handleConfirmPayment(r.paymentId)}
                          disabled={confirmingPayment === r.paymentId}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
                        >
                          {confirmingPayment === r.paymentId ? (
                            <><RefreshCw className="h-3 w-3 animate-spin" />确认中...</>
                          ) : (
                            <><Check className="h-3 w-3" />确认支付</>
                          )}
                        </button>
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

/* ════════════════════════════════════════════
   Emails Tab
   ════════════════════════════════════════════ */
function EmailsTab() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50", status: statusFilter });
      const res = await fetch(`/api/admin/emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {EMAIL_STATUS_FILTERS.map((f) => (
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

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">收件人</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">类型</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">主题</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">发送时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">失败原因</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : emails.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">暂无邮件记录</td></tr>
            ) : (
              emails.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{e.to}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{EMAIL_TYPE_LABELS[e.type] || e.type}</span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{e.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.status === "SENT" ? "bg-emerald-100 text-emerald-700"
                        : e.status === "FAILED" ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    }`}>
                      {e.status === "SENT" ? "已发送" : e.status === "FAILED" ? "失败" : "待发送"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.sentAt ? new Date(e.sentAt).toLocaleString("zh-CN") : "—"}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-destructive">{e.failedReason || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">共 {total} 封邮件</p>
    </div>
  );
}

/* ════════════════════════════════════════════
   Main Page with Tabs
   ════════════════════════════════════════════ */
function ReportManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("reports");

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">报告管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            支付确认、报告审核、邮件发送
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "emails" && <EmailsTab />}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center text-muted-foreground">
          加载中...
        </div>
      }
    >
      <ReportManagementPage />
    </Suspense>
  );
}
