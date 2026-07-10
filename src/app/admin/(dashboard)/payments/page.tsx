"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const STATUS_FILTERS = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待确认" },
  { value: "CONFIRMED", label: "已确认" },
  { value: "FAILED", label: "失败" },
];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        pageSize: "50",
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setTotal(data.total);
      }
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleConfirm = async (paymentId: string) => {
    if (!confirm("确认该笔支付？确认后将开始生成报告。")) return;
    setConfirming(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "POST",
      });
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

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">支付确认</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 条记录
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">邮箱</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">金额</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">订单号</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">截图</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  暂无记录
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{p.userEmail}</td>
                  <td className="px-4 py-3 tabular-nums">¥{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.orderNo || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3">
                    {p.screenshot ? (
                      <a
                        href={p.screenshot}
                        target="_blank"
                        rel="noopener"
                        className="text-primary hover:underline"
                      >
                        查看截图
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-700"
                          : p.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {p.status === "CONFIRMED"
                        ? "已确认"
                        : p.status === "PENDING"
                          ? "待确认"
                          : p.status}
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
                        {confirming === p.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        <span className="ml-1">确认</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {p.confirmedAt
                          ? new Date(p.confirmedAt).toLocaleString("zh-CN")
                          : "—"}
                      </span>
                    )}
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
