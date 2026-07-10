"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Email = {
  id: string;
  to: string;
  type: string;
  subject: string;
  status: string;
  sentAt: string | null;
  failedReason: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  VERIFICATION: "验证码",
  HANDBOOK: "成长手册",
  PASSWORD_RESET: "重置密码",
};

const STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待发送" },
  { value: "SENT", label: "已发送" },
  { value: "FAILED", label: "失败" },
];

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
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

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">邮件管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 封邮件
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEmails}
          className="gap-2 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex gap-1">
        {STATUS_FILTERS.map((f) => (
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

      {/* Table */}
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
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  暂无邮件记录
                </td>
              </tr>
            ) : (
              emails.map((e) => (
                <tr key={e.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{e.to}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {TYPE_LABELS[e.type] || e.type}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                    {e.subject}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        e.status === "SENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : e.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {e.status === "SENT" ? "已发送" : e.status === "FAILED" ? "失败" : "待发送"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {e.sentAt ? new Date(e.sentAt).toLocaleString("zh-CN") : "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-destructive">
                    {e.failedReason || "—"}
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
