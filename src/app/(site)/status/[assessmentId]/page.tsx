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
import { Button } from "@/components/ui/button";

// Status definitions from PRD §7
const STATUS_ORDER = ["PENDING", "ANALYZING", "REVIEWING", "SENDING", "SENT"];

const STATUSES = [
  {
    key: "PENDING",
    label: "等待付款确认",
    description: "老师正在确认订单，请稍候。你也可以添加咨询老师企业微信。",
    icon: Clock,
  },
  {
    key: "ANALYZING",
    label: "手册分析中",
    description: "已确认付款，正在为孩子整理成长导航手册。",
    icon: FileSearch,
  },
  {
    key: "REVIEWING",
    label: "老师审核中",
    description: "成长导航手册正在由老师审核，确保内容准确、清晰、可执行。",
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
    description: "成长导航手册已发送至你的注册邮箱，请注意查收。",
    icon: CheckCircle2,
  },
];

export default function StatusPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/status/${assessmentId}`);
        if (res.ok) {
          const data = await res.json();
          const idx = STATUS_ORDER.indexOf(data.handbookStatus);
          if (idx >= 0) {
            setCurrentStatusIndex(idx);
          } else if (data.paymentStatus === "CONFIRMED") {
            // Payment confirmed but no handbook yet → analyzing
            setCurrentStatusIndex(1);
          } else if (data.paymentStatus === "PENDING") {
            setCurrentStatusIndex(0);
          }
          return;
        }
      } catch {
        // API unavailable, use default
      }
    }
    fetchStatus().finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

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
          <h1 className="text-2xl font-semibold text-foreground">订单进度</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            我们会在每个阶段完成后通知你
          </p>
        </motion.div>

        {/* Status timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-0"
        >
          {STATUSES.map((status, i) => {
            const Icon = status.icon;
            const isCurrent = i === currentStatusIndex;
            const isCompleted = i < currentStatusIndex;

            return (
              <div key={status.key} className="flex gap-4">
                {/* Timeline line + icon */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {i < STATUSES.length - 1 && (
                    <div
                      className={`w-px flex-1 ${
                        isCompleted ? "bg-primary" : "bg-border"
                      }`}
                      style={{ minHeight: 32 }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <p
                    className={`text-sm font-medium ${
                      isCurrent || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {status.label}
                  </p>
                  {(isCurrent || isCompleted) && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-sm leading-relaxed text-muted-foreground"
                    >
                      {status.description}
                    </motion.p>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* WeChat QR reminder for pending status */}
        {currentStatusIndex === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              等待期间，你也可以添加咨询老师企业微信，获取即时帮助。
            </p>
            <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/50">
              <span className="text-xs text-muted-foreground">
                企业微信二维码
              </span>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        {currentStatusIndex === STATUS_ORDER.length - 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Link href="/account">
              <Button className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:brightness-95">
                查看成长档案
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}
