"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin/dashboard";

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        return;
      }

      router.push(redirect);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <img
          src="/logo.png"
          alt="青柠伴学"
          className="mx-auto mb-4 h-12 w-12 rounded-xl"
        />
        <h1 className="text-2xl font-semibold text-foreground">运营工作台</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          LIMEUP 自主学习力测评 · 管理后台
        </p>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="账号（用户名或邮箱）"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className="h-12 rounded-xl"
          autoComplete="username"
        />
        <Input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 rounded-xl"
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={!login || !password || loading}
          className="h-12 w-full rounded-full bg-primary text-primary-foreground hover:brightness-95"
        >
          {loading ? "登录中..." : "登录"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        仅限内部运营人员使用
      </p>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6">
      <Suspense fallback={<div className="text-muted-foreground">加载中...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
