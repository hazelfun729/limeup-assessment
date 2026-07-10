"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Password section
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordCode, setPasswordCode] = useState("");
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [passwordCooldown, setPasswordCooldown] = useState(0);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUserEmail(data.user.email);
            setLoading(false);
            return;
          }
        }
        router.push("/login");
      } catch {
        router.push("/login");
      }
    }
    fetchSession();
  }, [router]);

  const handleSendPasswordCode = async () => {
    if (!userEmail || passwordCooldown > 0) return;
    setPasswordLoading(true);
    setPasswordError("");

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPasswordError(data.error || "发送失败");
        return;
      }

      setPasswordCodeSent(true);
      setPasswordCooldown(60);

      const timer = setInterval(() => {
        setPasswordCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setPasswordError("网络错误");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("密码至少需要6位");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, code: passwordCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setPasswordError(data.error || "修改失败");
        return;
      }

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordCode("");
      setPasswordCodeSent(false);
    } catch {
      setPasswordError("网络错误");
    } finally {
      setPasswordLoading(false);
    }
  };

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

  return (
    <main className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-6 py-4">
          <Link
            href="/account"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-medium text-foreground">账号设置</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-6 py-8 space-y-8">
        {/* Account info */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            账号信息
          </h2>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">注册邮箱</p>
                <p className="text-sm font-medium text-foreground">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Set/change password */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            设置密码
          </h2>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              设置密码后可使用邮箱+密码登录（验证码登录始终可用）
            </p>

            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="新密码（至少6位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-xl pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Input
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-xl"
              />

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="邮箱验证码"
                    value={passwordCode}
                    onChange={(e) => setPasswordCode(e.target.value)}
                    className="h-11 rounded-xl"
                    maxLength={6}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleSendPasswordCode}
                  disabled={!userEmail || passwordCooldown > 0}
                  className="h-11 shrink-0 rounded-xl px-4 text-xs"
                >
                  {passwordCooldown > 0
                    ? `${passwordCooldown}s`
                    : passwordCodeSent
                      ? "重新发送"
                      : "发送验证码"}
                </Button>
              </div>

              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-emerald-600">密码设置成功</p>
              )}

              <Button
                onClick={handleChangePassword}
                disabled={
                  !newPassword ||
                  !confirmPassword ||
                  !passwordCode ||
                  passwordLoading
                }
                className="h-11 w-full rounded-full bg-primary text-primary-foreground hover:brightness-95"
              >
                {passwordLoading ? "设置中..." : "确认设置密码"}
              </Button>
            </div>
          </div>
        </section>

        {/* Logout */}
        <section className="pt-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="h-11 w-full rounded-full text-destructive border-destructive/20 hover:bg-destructive/5"
          >
            退出登录
          </Button>
        </section>
      </div>
    </main>
  );
}
