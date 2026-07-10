"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  UserCheck,
  FileText,
  CreditCard,
  CheckCircle,
  Users,
  ScrollText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type DashboardData = {
  today: {
    visitors: number;
    assessments: number;
    completions: number;
    registrations: number;
    payments: number;
  };
  queue: {
    pendingPayments: number;
    analyzingReports: number;
    reviewingReports: number;
    sendingReports: number;
    sentReports: number;
    failedReports: number;
  };
};

type LogEntry = {
  id: string;
  adminName: string | null;
  action: string;
  target: string | null;
  details: string | null;
  createdAt: string;
};

const MOCK_DATA: DashboardData = {
  today: { visitors: 0, assessments: 0, completions: 0, registrations: 0, payments: 0 },
  queue: { pendingPayments: 0, analyzingReports: 0, reviewingReports: 0, sendingReports: 0, sentReports: 0, failedReports: 0 },
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

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function QueueItem({ label, count, href, variant = "default" }: { label: string; count: number; href: string; variant?: "default" | "warning" | "success" | "danger" }) {
  const colors = { default: "text-foreground", warning: "text-amber-600", success: "text-emerald-600", danger: "text-destructive" };
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-secondary">
      <span className="text-sm text-foreground">{label}</span>
      <span className={`text-xl font-semibold tabular-nums ${colors[variant]}`}>{count}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/admin/dashboard");
        if (res.ok) { setData(await res.json()); return; }
      } catch {}
      setData(MOCK_DATA);
    }
    fetchDashboard();
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(logPage), pageSize: "10" });
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const d = await res.json();
        setLogs(d.logs || []);
        setLogTotal(d.total);
      }
    } catch {}
  }, [logPage]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-semibold text-foreground">数据概览</h1>
        <p className="mt-1 text-sm text-muted-foreground">今日运营数据</p>
      </motion.div>

      {/* Today's metrics */}
      <motion.div className="grid grid-cols-2 gap-4 md:grid-cols-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <StatCard label="今日访问" value={data.today.visitors} icon={Users} />
        <StatCard label="开始测评" value={data.today.assessments} icon={FileText} />
        <StatCard label="完成测评" value={data.today.completions} icon={CheckCircle} />
        <StatCard label="今日注册" value={data.today.registrations} icon={UserCheck} />
        <StatCard label="今日付款" value={data.today.payments} icon={CreditCard} />
      </motion.div>

      {/* Status queue */}
      <motion.div className="space-y-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <h2 className="text-lg font-medium text-foreground">待处理队列</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <QueueItem label="待确认付款" count={data.queue.pendingPayments} href="/admin/reports" variant="warning" />
          <QueueItem label="手册分析中" count={data.queue.analyzingReports} href="/admin/reports?status=ANALYZING" />
          <QueueItem label="待审核报告" count={data.queue.reviewingReports} href="/admin/reports?status=REVIEWING" variant="warning" />
          <QueueItem label="报告发送中" count={data.queue.sendingReports} href="/admin/reports?status=SENDING" />
          <QueueItem label="已发送报告" count={data.queue.sentReports} href="/admin/reports?status=SENT" variant="success" />
          <QueueItem label="发送失败" count={data.queue.failedReports} href="/admin/reports?status=FAILED" variant="danger" />
        </div>
      </motion.div>

      {/* Recent operation logs */}
      <motion.div className="space-y-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-medium text-foreground">操作日志</h2>
          <span className="text-sm text-muted-foreground">({logTotal} 条)</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作人</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">详情</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">暂无日志</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(log.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="px-4 py-3 font-medium">{log.adminName || "系统"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{ACTION_LABELS[log.action] || log.action}</span>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{log.details || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {logTotal > 10 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">第 {logPage}/{Math.ceil(logTotal / 10)} 页</p>
            <div className="flex gap-2">
              <button disabled={logPage <= 1} onClick={() => setLogPage((p) => p - 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button disabled={logPage >= Math.ceil(logTotal / 10)} onClick={() => setLogPage((p) => p + 1)} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
