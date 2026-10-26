"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  FileSearch,
  UserCheck,
  Send,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

// Status definitions from PRD §7
const STATUS_ORDER = ["PENDING", "ANALYZING", "REVIEWING", "SENDING", "SENT"];

const STATUSES = [
  {
    key: "PENDING",
    label: "等待付款确认",
    description: "已收到你提交的付款信息，我们正在核对。确认后会开始整理报告。",
    icon: Clock,
  },
  {
    key: "ANALYZING",
    label: "报告整理中",
    description: "已确认付款，正在为孩子整理成长导航报告。",
    icon: FileSearch,
  },
  {
    key: "REVIEWING",
    label: "老师审核中",
    description: "成长导航报告正在由老师审核，确保内容准确、清晰、可执行。",
    icon: UserCheck,
  },
  {
    key: "SENDING",
    label: "报告发送中",
    description: "审核已完成，系统正在发送至注册邮箱。",
    icon: Send,
  },
  {
    key: "SENT",
    label: "报告已发送",
    description: "成长导航报告已发送至你的注册邮箱，也可以在这里打开网页版。",
    icon: CheckCircle2,
  },
];

export default function StatusPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/status/${assessmentId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "获取报告进度失败");
        if (
          data.currentStatus === "FAILED" ||
          data.currentStatus === "REFUNDED"
        )
          throw new Error(
            data.currentStatus === "REFUNDED"
              ? "订单已退款"
              : data.generationIssue || "处理失败，请联系客服",
          );
        const idx = STATUS_ORDER.indexOf(data.currentStatus);
        if (idx < 0) throw new Error("订单状态暂不可用");
        setCurrentStatusIndex(idx);
        setOrderNo(data.payment?.orderNo ?? null);
        setPaymentStatus(data.payment?.status ?? null);
        setReportId(data.handbook?.id ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "网络连接失败，请稍后重试",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchStatus();
    const timer = setInterval(fetchStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [assessmentId]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (error)
    return (
      <main className="p-10 text-center">
        <p role="alert">{error}</p>
        <Link href="/account">返回成长档案</Link>
      </main>
    );

  const currentStatus = STATUSES[currentStatusIndex];
  const isSent = currentStatus.key === "SENT";
  const headline = isSent
    ? "孩子的成长导航报告已送达"
    : currentStatus.key === "PENDING"
      ? paymentStatus === "PENDING"
        ? "付款信息已提交，等待核对"
        : "尚未提交付款信息"
      : currentStatus.key === "ANALYZING"
        ? "付款已确认，正在整理报告"
        : currentStatus.label;
  const explanation = currentStatus.key === "PENDING" && !paymentStatus
    ? "请先完成付款并提交微信支付订单号后 6 位，方便我们核对。"
    : currentStatus.description;

  return (
    <main className="min-h-dvh bg-background px-6 py-12">
      <div className="mx-auto max-w-lg space-y-10">
        {/* Back */}
        <Link
          href="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回成长档案
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-semibold text-foreground">报告进度</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSent ? "你可以查看网页版报告，邮件也已发送至注册邮箱" : "进度会自动更新，报告发送后请留意注册邮箱"}
          </p>
          {paymentStatus === "CONFIRMED" && <span className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">付款已确认</span>}
          {paymentStatus === "PENDING" && <span className="mt-3 inline-flex rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">付款待核对</span>}
        </motion.div>

        <section aria-live="polite" className="rounded-2xl border border-primary/25 bg-primary/5 p-6 sm:p-7">
          <p className="text-xs font-medium tracking-widest text-primary">当前状态</p>
          <h2 className="mt-3 text-xl font-semibold leading-snug text-foreground">{headline}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{explanation}</p>
          {isSent && reportId && (
            <Link href={`/report/${reportId}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:brightness-95">
              查看成长导航报告
            </Link>
          )}
          {currentStatus.key === "PENDING" && !paymentStatus && (
            <Link href={`/payment/${assessmentId}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:brightness-95">
              返回付款页面
            </Link>
          )}
        </section>

        {/* Status timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-0"
        >
          <h2 className="mb-6 text-sm font-medium text-muted-foreground">处理记录</h2>
          {STATUSES.map((status, i) => {
            const Icon = status.icon;
            const isCurrent = i === currentStatusIndex;
            const isCompleted = i < currentStatusIndex;

            return (
              <div key={status.key} className="flex gap-4">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div
                    aria-current={isCurrent ? "step" : undefined}
                    className={`${isCurrent && currentStatusIndex < 4 ? "order-stage-active" : ""} flex h-10 w-10 items-center justify-center rounded-full ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isCompleted
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {i < STATUSES.length - 1 && (
                    <div
                      className={`relative w-px flex-1 overflow-hidden ${
                        isCompleted ? "bg-primary" : "bg-border"
                      }`}
                      style={{ minHeight: 32 }}
                    >{isCurrent && <span aria-hidden="true" className="report-line-flow absolute inset-x-0 h-4 bg-primary"/>}</div>
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <p
                    className={`text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {status.label}
                    {isCurrent && <span className="ml-2 text-xs font-normal text-primary">{isSent ? "已完成" : "当前"}</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* WeChat QR reminder for pending status */}
        {currentStatusIndex === 0 && paymentStatus === "PENDING" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              等待期间，你也可以添加咨询老师企业微信，获取帮助。
            </p>
            <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/50">
              <span className="text-xs text-muted-foreground">
                企业微信二维码
              </span>
            </div>
          </motion.div>
        )}

        {orderNo && <p className="break-all text-center text-xs text-muted-foreground">订单编号：{orderNo}</p>}

        {isSent && <Link href="/account" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">返回成长档案</Link>}
      </div>
    </main>
  );
}
