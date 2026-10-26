"use client";

import { useEffect, useState, useCallback } from "react";

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

/* ════════════════════════════════════════════
   Emails Tab
   ════════════════════════════════════════════ */
export function EmailsTab() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ pageSize: "50", status: statusFilter });
      const res = await fetch(`/api/admin/emails?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(res.status === 401 ? "登录状态已失效，请重新登录" : "邮件记录暂时无法获取，请稍后重试");
      const data = await res.json();
      setEmails(data.emails);
      setTotal(data.total);
    } catch (error) {
      setEmails([]);
      setTotal(0);
      setLoadError(error instanceof Error && error.name === "TimeoutError"
        ? "数据库连接超时，请稍后重试"
        : error instanceof Error ? error.message : "邮件记录暂时无法获取，请重试");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchEmails(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchEmails]);

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
            ) : loadError ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-destructive">{loadError} <button type="button" className="ml-2 underline" onClick={fetchEmails}>重新加载</button></td></tr>
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
