"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  userEmail: string;
  studentName: string | null;
  reportId: string | null;
  amount: number;
  status: string;
  orderNo: string | null;
  wechatTransactionId: string | null;
  remark: string | null;
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
  const [transactionIds, setTransactionIds] = useState<Record<string, string>>({});
  const [billFile, setBillFile] = useState<File | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState("");
  const [reconcileIssues, setReconcileIssues] = useState<Record<string, string>>({});

  const uploadBill = async () => {
    if (!billFile) return;
    setReconciling(true);
    setReconcileMessage("");
    try {
      const form = new FormData();
      form.set("file", billFile);
      const response = await fetch("/api/admin/payments/reconcile", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "账单核对失败");
      setReconcileMessage(`已核对 ${data.billTransactions} 条账单交易，自动确认 ${data.confirmed} 笔；${data.conflicts} 笔有冲突，${data.unmatched} 笔暂未找到对应交易。${data.failed.length ? `另有 ${data.failed.length} 笔需要检查报告生成状态。` : ""}`);
      setReconcileIssues(Object.fromEntries([
        ...data.conflictPaymentIds.map((id: string) => [id, "账单冲突，需人工核对"]),
        ...data.unmatchedPaymentIds.map((id: string) => [id, "账单未匹配，暂不确认"]),
        ...data.failed.map((item: { paymentId: string; reason: string }) => [item.paymentId, item.reason]),
      ]));
      await fetchPayments();
    } catch (error) {
      setReconcileMessage(error instanceof Error ? error.message : "账单核对失败");
    } finally {
      setReconciling(false);
    }
  };

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
    const timer = setTimeout(() => { fetchPayments(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  const handleConfirm = async (payment: Payment) => {
    const wechatTransactionId = (transactionIds[payment.id] || "").trim();
    if (wechatTransactionId && !/^[A-Za-z0-9]{10,64}$/.test(wechatTransactionId)) {
      alert("请填写完整的微信支付订单号（10–64 位字母或数字）");
      return;
    }
    const mismatch = Boolean(wechatTransactionId && payment.remark && !wechatTransactionId.endsWith(payment.remark));
    if (!confirm(mismatch
      ? `完整订单号与家长填写的后六位（${payment.remark}）不一致。只有核实到账及归属后才能人工确认。确定继续吗？`
      : `请先核对 ¥${Number(payment.amount).toFixed(2)}、微信支付订单号后 6 位 ${payment.remark || "未提供（历史订单）"}${wechatTransactionId ? ` 和完整订单号 ${wechatTransactionId}` : ""}。确认已到账且归属无误后，点击确定。`)) return;
    const paymentId = payment.id;
    setConfirming(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wechatTransactionId: wechatTransactionId || undefined, allowSuffixMismatch: mismatch }),
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
          <p className="mt-2 text-xs text-muted-foreground">
            请对照微信收款账单核实金额和微信支付订单号后 6 位；无法对应时请暂缓确认。
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

      <section className="rounded-xl border border-border bg-background p-5">
        <h2 className="font-medium">上传微信交易账单</h2>
        <p className="mt-1 text-sm text-muted-foreground">请上传收款码所属微信账户导出的账单。首次使用需先绑定该收款账户。系统仅自动确认金额、订单号后六位和交易时间都唯一对应的成功收款；未匹配或冲突订单保留人工核对。支持 Excel 和商户交易账单 CSV。</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="选择微信交易账单 Excel 或 CSV" onChange={(event) => setBillFile(event.target.files?.[0] || null)} className="max-w-full text-sm" />
          <Button type="button" onClick={uploadBill} disabled={!billFile || reconciling} className="rounded-lg bg-primary text-primary-foreground">
            {reconciling ? "正在核对…" : "上传并自动核对"}
          </Button>
        </div>
        {reconcileMessage && <p role="status" className="mt-3 text-sm text-foreground">{reconcileMessage}</p>}
      </section>

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
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">学生 / 报告</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">金额</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">订单号</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">微信支付尾号</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">完整微信订单号</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">时间</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  加载中...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                  暂无记录
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">{p.userEmail}</td>
                  <td className="px-4 py-3">
                    <span>{p.studentName || "—"}</span>
                    {p.reportId ? (
                      <Link href={`/admin/reports/${p.reportId}`} className="ml-2 text-xs text-primary underline">查看报告</Link>
                    ) : (
                      <span className="ml-2 text-xs text-muted-foreground">确认后生成</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">¥{Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.orderNo || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {p.remark || "—"}
                    {reconcileIssues[p.id] && <p className="mt-1 text-xs font-normal text-amber-700">{reconcileIssues[p.id]}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "PENDING" ? (
                      <input
                        aria-label={`填写 ${p.userEmail} 的完整微信支付订单号`}
                        className="w-48 rounded-lg border border-border bg-background px-2 py-1.5 text-xs tabular-nums"
                        inputMode="numeric"
                        placeholder="人工核对后填写"
                        value={transactionIds[p.id] || ""}
                        onChange={(event) => setTransactionIds((current) => ({ ...current, [p.id]: event.target.value }))}
                      />
                    ) : <span className="tabular-nums text-xs">{p.wechatTransactionId || "—"}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(p.createdAt).toLocaleString("zh-CN")}
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
                        onClick={() => handleConfirm(p)}
                        disabled={confirming === p.id}
                        className="h-8 rounded-lg bg-primary text-xs text-primary-foreground hover:brightness-95"
                      >
                        {confirming === p.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3" />
                        )}
                        <span className="ml-1">核对到账后确认</span>
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
