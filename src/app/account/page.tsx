"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Settings,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileSearch,
  Send,
  UserCheck,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SystemScore = { name?: string; score: number; level: string };

type AssessmentItem = {
  id: string;
  status: string;
  currentQuestion: number;
  startedAt: string;
  completedAt: string | null;
  studentName: string | null;
  grade: string | null;
  profile: {
    learningMode: string;
    learningModeName: string | null;
    learningModeEmoji: string | null;
    systemScores: Record<string, SystemScore> | SystemScore[];
    growthFocus: string | null;
    summary: string | null;
    createdAt: string;
  } | null;
  handbookStatus: string | null;
  handbookSentAt: string | null;
  paymentStatus: string | null;
};

type DashboardData = {
  user: {
    id: string;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  assessments: AssessmentItem[];
  growthCurve: Array<{
    assessmentId: string;
    date: string;
    learningMode: string;
    systemScores: Record<string, SystemScore>;
  }>;
  stats: {
    totalAssessments: number;
    completedAssessments: number;
    hasHandbook: boolean;
    latestAssessmentId: string | null;
  };
};

const HANDBOOK_STATUS_MAP: Record<
  string,
  { label: string; desc: string; icon: typeof Clock; color: string }
> = {
  ANALYZING: {
    label: "手册分析中",
    desc: "正在为孩子整理成长导航手册",
    icon: FileSearch,
    color: "text-amber-600 bg-amber-50",
  },
  REVIEWING: {
    label: "老师审核中",
    desc: "老师正在审核，确保内容准确可执行",
    icon: UserCheck,
    color: "text-blue-600 bg-blue-50",
  },
  SENDING: {
    label: "报告发送中",
    desc: "审核已完成，正在发送至邮箱",
    icon: Send,
    color: "text-violet-600 bg-violet-50",
  },
  SENT: {
    label: "报告已发送",
    desc: "成长导航手册已发送至注册邮箱",
    icon: CheckCircle2,
    color: "text-emerald-600 bg-emerald-50",
  },
};

const levelColors: Record<string, string> = {
  强: "bg-primary/20 text-primary",
  中: "bg-secondary text-muted-foreground",
  弱: "bg-destructive/10 text-destructive",
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function normalizeScores(
  raw: Record<string, SystemScore> | SystemScore[]
): { name: string; score: number; level: string }[] {
  if (Array.isArray(raw)) {
    return raw.map((s) => ({
      name: s.name || "",
      score: s.score,
      level: s.level,
    }));
  }
  const nameMap: Record<string, string> = {
    motivation: "学习动力",
    ability: "学习能力",
    perseverance: "学习毅力",
  };
  return Object.entries(raw).map(([key, val]) => ({
    name: nameMap[key] || key,
    score: val.score,
    level: val.level,
  }));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/user/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
          return;
        }
        if (res.status === 401) {
          router.push("/login");
          return;
        }
      } catch {
        // API unavailable
      }
      setLoading(false);
    }
    fetchDashboard().finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="text-muted-foreground">暂时无法加载数据</p>
          <Link href="/">
            <Button variant="outline" className="mt-4 rounded-xl">
              返回首页
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const { user, assessments, stats } = data;
  const completedAssessments = assessments.filter(
    (a) => a.status === "COMPLETED"
  );
  const inProgressAssessments = assessments.filter(
    (a) => a.status === "IN_PROGRESS"
  );

  return (
    <main className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="青柠伴学"
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-sm font-medium text-foreground">
              成长档案
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/account/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Settings className="h-4.5 w-4.5" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-10">
        {/* User info */}
        <motion.section {...fadeUp} transition={{ duration: 0.3 }}>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            我的成长档案
          </h1>
        </motion.section>

        {/* Quick stats */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="flex gap-3"
        >
          <div className="flex-1 rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">
              {stats.completedAssessments}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">完成测评</p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">
              {completedAssessments.length > 0 &&
              completedAssessments[0]?.profile
                ? completedAssessments[0].profile.learningModeEmoji || "📊"
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">最近类型</p>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-semibold text-foreground">
              {stats.hasHandbook ? "✓" : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">导航手册</p>
          </div>
        </motion.section>

        {/* In-progress assessments */}
        {inProgressAssessments.length > 0 && (
          <motion.section
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-3"
          >
            <h2 className="text-sm font-medium text-muted-foreground">
              进行中的测评
            </h2>
            {inProgressAssessments.map((a) => (
              <Link
                key={a.id}
                href={`/assessment/${a.id}`}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-4 transition-colors hover:bg-amber-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      测评进行中
                    </p>
                    <p className="text-xs text-muted-foreground">
                      已完成 {a.currentQuestion - 1}/66 题 ·{" "}
                      {formatDate(a.startedAt)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </motion.section>
        )}

        {/* Completed assessments with profiles */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-medium text-muted-foreground">
            成长档案
          </h2>

          {completedAssessments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                还没有完成过测评
              </p>
              <Link href="/assessment">
                <Button className="mt-4 rounded-full bg-primary px-6 text-primary-foreground hover:brightness-95">
                  <Plus className="mr-1.5 h-4 w-4" />
                  开始第一次测评
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {completedAssessments.map((a) => {
                const scores = a.profile
                  ? normalizeScores(a.profile.systemScores)
                  : [];

                return (
                  <div
                    key={a.id}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    {/* Profile header */}
                    <Link
                      href={`/profile/${a.id}`}
                      className="flex items-center justify-between p-4 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {a.profile?.learningModeEmoji || "📊"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {a.profile?.learningModeName ||
                              a.profile?.learningMode ||
                              "成长画像"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(a.completedAt || a.startedAt)}
                            {a.studentName ? ` · ${a.studentName}` : ""}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>

                    {/* System scores mini */}
                    {scores.length > 0 && (
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        {scores.map((s) => (
                          <div
                            key={s.name}
                            className="flex items-center gap-3"
                          >
                            <span className="w-16 text-xs text-muted-foreground">
                              {s.name}
                            </span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${s.score}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium tabular-nums text-foreground">
                              {s.score}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                levelColors[s.level] || ""
                              }`}
                            >
                              {s.level}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Handbook status */}
                    {a.handbookStatus &&
                      HANDBOOK_STATUS_MAP[a.handbookStatus] && (
                        <div className="border-t border-border px-4 py-3">
                          {(() => {
                            const hb =
                              HANDBOOK_STATUS_MAP[a.handbookStatus];
                            const HbIcon = hb.icon;
                            return (
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`flex h-7 w-7 items-center justify-center rounded-full ${hb.color}`}
                                >
                                  <HbIcon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-foreground">
                                    {hb.label}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {hb.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                    {/* No payment yet - show CTA */}
                    {!a.handbookStatus && !a.paymentStatus && (
                      <div className="border-t border-border px-4 py-3">
                        <Link
                          href={`/payment/${a.id}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">
                            获取完整成长导航手册
                          </span>
                          <span className="font-medium text-primary">
                            ¥9.9 →
                          </span>
                        </Link>
                      </div>
                    )}

                    {/* Payment pending */}
                    {a.paymentStatus === "PENDING" &&
                      !a.handbookStatus && (
                        <div className="border-t border-border px-4 py-3">
                          <Link
                            href={`/status/${a.id}`}
                            className="flex items-center gap-2 text-xs text-amber-600"
                          >
                            <Clock className="h-3.5 w-3.5" />
                            等待付款确认
                            <ChevronRight className="ml-auto h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* Growth curve (when multiple completed assessments) */}
        {completedAssessments.length >= 2 && (
          <motion.section
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground">
                成长曲线
              </h2>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="space-y-4">
                {data.growthCurve.map((point, idx) => {
                  const scores = normalizeScores(
                    point.systemScores as Record<string, SystemScore>
                  );
                  return (
                    <div key={point.assessmentId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">
                          第 {idx + 1} 次 · {point.learningMode}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(point.date)}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {scores.map((s) => (
                          <div
                            key={s.name}
                            className="text-center"
                          >
                            <p className="text-lg font-semibold tabular-nums text-foreground">
                              {s.score}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {s.name}
                            </p>
                          </div>
                        ))}
                      </div>
                      {idx < data.growthCurve.length - 1 && (
                        <div className="border-b border-dashed border-border pt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground text-center">
                多次测评可追踪成长变化趋势
              </p>
            </div>
          </motion.section>
        )}

        {/* Start new assessment CTA */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="border-t border-border pt-8 text-center"
        >
          <Link href="/assessment">
            <Button
              variant="outline"
              className="h-11 rounded-full px-6"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              开始新的测评
            </Button>
          </Link>
        </motion.section>
      </div>
    </main>
  );
}
