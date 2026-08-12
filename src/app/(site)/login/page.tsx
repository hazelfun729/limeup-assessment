"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendCode = async () => {
    if (!email || cooldown > 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  const handleLogin = async () => {
    if (!email || !code) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        return;
      }

      router.push("/account");
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </header>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center">
              <Image
                src="/logo.png"
                alt="青柠伴学"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              欢迎回来
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              使用注册邮箱登录，查看成长档案
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="请输入注册邮箱"
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && codeSent && code) handleLogin();
                  }}
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

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              onClick={handleLogin}
              disabled={!email || !code || !codeSent || loading}
              className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:brightness-95"
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            还没有账号？完成测评后会自动注册
          </p>
        </div>
      </div>
    </main>
  );
}
