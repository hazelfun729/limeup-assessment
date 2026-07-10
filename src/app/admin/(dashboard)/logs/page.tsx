"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type LogEntry = {
  id: string;
  adminId: string | null;
  adminName: string | null;
  action: string;
  target: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: "登录",
  confirm_payment: "确认支付",
  update_report: "更新报告",
  update_report_REVIEWING: "审核通过",
  update_report_ANALYZING: "驳回报告",
  update_report_SENDING: "发送报告",
  create_prompt: "创建 Prompt",
  publish_prompt: "发布 Prompt",
  update_thresholds: "更新阈值",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "50",
      });
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total);
        setTotalPages(Math.ceil(data.total / 50));
      }
    } catch {}
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">操作日志</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 条记录
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="gap-2 rounded-lg"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作人</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">目标</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">详情</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  暂无日志记录
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.adminName || "系统"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                  </td>
                  <td className="max-w-32 truncate px-4 py-3 text-muted-foreground">
                    {log.target ? log.target.slice(0, 12) + "..." : "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                    {log.details || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {log.ip || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page}/{totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
