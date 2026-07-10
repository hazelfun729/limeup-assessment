"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RefreshCw, Check, FileText, CreditCard, Mail } from "lucide-react";
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
  createdAt: string;
  sentAt: string | null;
};

const REPORT_STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "ANALYZING", label: "分析中" },
  { value: "REVIEWING", label: "待审核" },
  { value: "SENDING", label: "发送中" },
  { value: "SENT", label: "已发送" },
  { value: "FAILED", label: "失败" },
];

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ANALYZING: { label: "分析中", cls: "bg-blue-100 text-blue-700" },
  REVIEWING: { label: "待审核", cls: "bg-amber-100 text-amber-700" },
  NEEDS_MANUAL_REVIEW: { label: "需人工处理", cls: "bg-red-100 text-red-700" },
  SENDING: { label: "发送中", cls: "bg-blue-100 text-blue-700" },
  SENT: { label: "已发送", cls: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "失败", cls: "bg-red-100 text-red-700" },
};

/* ── Payment types ── */
type Payment = {
  id: string;
  userEmail: string;
  amount: number;
  status: string;
  orderNo: string | null;
  screenshot: string | null;
  confirmedAt: string | null;
  createdAt: string;
};

const PAYMENT_STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待确认" },
  { value: "CONFIRMED", label: "已确认" },
  { value: "FAILED", label: "失败" },
];

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
  { key: "payments", label: "支付确认", icon: CreditCard },
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSending, setBatchSending] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50", status: statusFilter });
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotal(data.total);
        // Clear selections that are no longer SENDING
        setSelectedIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            const r = data.reports.find((r: Report) => r.id === id);
            if (r && r.status === "SENDING") next.add(id);
          }
          return next;
        });
      }
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const sendingReports = reports.filter((r) => r.status === "SENDING");
  const allSendingSelected = sendingReports.length > 0 && sendingReports.every((r) => selectedIds.has(r.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSendingSelected) {
      // Deselect all sending
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const r of sendingReports) next.delete(r.id);
        return next;
      });
    } else {
      // Select all sending
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const r of sendingReports) next.add(r.id);
        return next;
      });
    }
  };

  const handleBatchSend = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确认向 ${selectedIds.size} 位用户发送成长手册邮件？`)) return;
    setBatchSending(true);
    try {
      const res = await fetch("/api/admin/reports/batch-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handbookIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`发送完成：成功 ${data.sent} 封${data.failed > 0 ? `，失败 ${data.failed} 封` : ""}`);
        setSelectedIds(new Set());
        await fetchReports();
      } else {
        const err = await res.json();
        alert(err.error || "发送失败");
      }
    } catch {
      alert("网络错误");
    }
    setBatchSending(false);
  };

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
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            onClick={handleBatchSend}
            disabled={batchSending}
            className="gap-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {batchSending ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" />发送中...</>
            ) : (
              <><Mail className="h-3.5 w-3.5" />批量发送邮件 ({selectedIds.size})</>
            )}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {sendingReports.length > 0 && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSendingSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                    title="全选发送中的报告"
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
              <tr><td colSpan={sendingReports.length > 0 ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={sendingReports.length > 0 ? 7 : 6} className="px-4 py-12 text-center text-muted-foreground">暂无报告</td></tr>
            ) : (
              reports.map((r) => {
                const badge = STATUS_LABELS[r.status] || { label: r.status, cls: "bg-secondary text-muted-foreground" };
                const canSelect = r.status === "SENDING";
                return (
                  <tr key={r.id} className={`border-b border-border hover:bg-secondary/30 ${selectedIds.has(r.id) ? "bg-emerald-50/50" : ""}`}>
                    {sendingReports.length > 0 && (
                      <td className="px-4 py-3">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
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
                      <Link href={`/admin/reports/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                        管理 →
                      </Link>
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
        {sendingReports.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {sendingReports.length} 份待发送 · 已选 {selectedIds.size} 份
          </p>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   Payments Tab
   ════════════════════════════════════════════ */
function PaymentsTab() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50", status: statusFilter });
      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleConfirm = async (paymentId: string) => {
    if (!confirm("确认该笔支付？确认后将开始生成报告。")) return;
    setConfirming(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, { method: "POST" });
      if (res.ok) {
        await fetchPayments();
      } else {
        const data = await res.json();
        alert(data.error || "确认失败");
      }
    } catch {
      alert("网络错误");
    }
    setConfirming(null);
  };

  const handleBatchConfirm = async () => {
    const pendingIds = payments.filter((p) => p.status === "PENDING").map((p) => p.id);
    if (pendingIds.length === 0) return;
    if (!confirm(`批量确认 ${pendingIds.length} 笔待确认支付？`)) return;
    for (const id of pendingIds) {
      try {
        await fetch(`/api/admin/payments/${id}/confirm`, { method: "POST" });
      } catch {}
    }
    await fetchPayments();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {PAYMENT_STATUS_FILTERS.map((f) => (
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
        {statusFilter === "PENDING" && payments.some((p) => p.status === "PENDING") && (
          <Button size="sm" onClick={handleBatchConfirm} className="rounded-lg bg-primary text-primary-foreground hover:brightness-95">
            批量确认全部
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">邮箱</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">金额</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">订单号</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">加载中...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">暂无记录</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{p.userEmail}</td>
                  <td className="px-4 py-3 tabular-nums">¥{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.orderNo || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.createdAt).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700"
                        : p.status === "PENDING" ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                    }`}>
                      {p.status === "CONFIRMED" ? "已确认" : p.status === "PENDING" ? "待确认" : p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "PENDING" ? (
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(p.id)}
                        disabled={confirming === p.id}
                        className="h-8 rounded-lg bg-primary text-xs text-primary-foreground hover:brightness-95"
                      >
                        {confirming === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        <span className="ml-1">确认</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.confirmedAt ? new Date(p.confirmedAt).toLocaleString("zh-CN") : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">共 {total} 条记录</p>
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
            报告审核、支付确认、邮件记录
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
      {activeTab === "payments" && <PaymentsTab />}
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
