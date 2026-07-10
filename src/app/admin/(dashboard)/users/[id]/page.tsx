"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {}
      setLoading(false);
    }
    fetchUser();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6 p-8">
        <p className="text-destructive">用户不存在或加载失败</p>
        <Link href="/admin/users">
          <Button variant="outline" className="rounded-lg gap-2">
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Button>
        </Link>
      </div>
    );
  }

  const u = user as Record<string, unknown>;
  const assessments = (u.assessments as Record<string, unknown>[]) || [];
  const emails = (u.emails as Record<string, unknown>[]) || [];
  const crm = u.crmContact as Record<string, unknown> | null;

  return (
    <div className="space-y-8 p-8">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回用户列表
      </Link>

      {/* Basic info */}
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">
          {(u.email as string) || "—"}
        </h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <InfoCard label="用户ID" value={(u.id as string)?.slice(0, 12) + "..."} />
          <InfoCard label="邮箱验证" value={u.emailVerified ? "已验证" : "未验证"} />
          <InfoCard label="手机" value={(u.phone as string) || "—"} />
          <InfoCard
            label="注册时间"
            value={new Date(u.createdAt as string).toLocaleString("zh-CN")}
          />
        </div>
      </section>

      {/* Assessment records */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">测评记录</h2>
        {assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无测评记录</p>
        ) : (
          <div className="space-y-3">
            {assessments.map((a, i) => {
              const profile = a.growthProfile as Record<string, unknown> | null;
              const handbook = a.handbook as Record<string, unknown> | null;
              const payment = a.payment as Record<string, unknown> | null;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-5 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-foreground">
                      {(a.id as string)?.slice(0, 8)}...
                    </span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {a.status as string}
                    </span>
                    {payment && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                        支付: {payment.status as string}
                      </span>
                    )}
                    {handbook && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        手册: {handbook.status as string}
                      </span>
                    )}
                  </div>
                  {profile && (
                    <p className="text-sm text-muted-foreground">
                      学习模式: {(profile.learningModeName as string) || "—"} | 成长重点:{" "}
                      {(profile.growthFocus as string)?.slice(0, 40) || "—"}
                    </p>
                  )}
                  <Link
                    href={`/admin/reports/${a.id as string}`}
                    className="text-sm text-primary hover:underline"
                  >
                    查看报告详情 →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Emails */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">邮件记录</h2>
        {emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无邮件记录</p>
        ) : (
          <div className="space-y-2">
            {emails.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium">{e.subject as string}</span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    {new Date(e.createdAt as string).toLocaleString("zh-CN")}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    e.status === "SENT"
                      ? "bg-emerald-100 text-emerald-700"
                      : e.status === "FAILED"
                        ? "bg-red-100 text-red-700"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {e.status as string}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CRM */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">CRM 跟进</h2>
        {crm ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex flex-wrap gap-2">
              {((crm.tags as string[]) || []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              企微: {(crm.wechatAdded as boolean) ? "已添加" : "未添加"} | 负责人:{" "}
              {(crm.owner as string) || "未分配"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无 CRM 记录</p>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
