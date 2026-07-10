"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = searchParams.get("assessmentId") || "";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!email || cooldown > 0 || !assessmentId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, assessmentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "发送失败");
        return;
      }

      setCodeSent(true);
      setCooldown(60);

      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!email || !code || !assessmentId) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-and-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, assessmentId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "验证失败");
        return;
      }

      router.push(`/profile/${assessmentId}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          注册并获取成长画像
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          验证邮箱后即可查看孩子的成长画像
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="请输入邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl pl-10"
          />
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 rounded-xl pl-10"
              maxLength={6}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleSendCode}
            disabled={!email || cooldown > 0 || loading}
            className="h-12 shrink-0 rounded-xl px-5"
          >
            {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          onClick={handleVerify}
          disabled={!email || !code || !codeSent || loading}
          className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:brightness-95"
        >
          {loading ? "验证中..." : "查看成长画像"}
        </Button>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <Suspense
        fallback={
          <div className="text-muted-foreground">加载中...</div>
        }
      >
        <RegisterForm />
      </Suspense>
    </main>
  );
}
