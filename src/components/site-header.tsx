"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const FONT = '"PingFang SC", -apple-system, "Helvetica Neue", sans-serif';

export function SiteHeader() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("账户状态暂不可用");
        return res.json();
      })
      .then((data) => {
        setLoggedIn(data.authenticated);
        setEmail(data.user?.email ?? "");
      })
      .catch(() => {})
      .finally(() => setChecking(false));
    return () => controller.abort();
  }, [pathname]);

  return (
    <header className="relative z-10 flex items-center justify-between px-6 pt-4 pb-2 md:px-12">
      <Link href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-banner.png"
          alt="青柠伴学 - 自主学习力测评"
          width={160}
          height={47}
          style={{ display: "block" }}
        />
      </Link>
      {checking || loggedIn === null ? null : loggedIn ? (
        <Link
          href="/account"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          style={{ fontFamily: FONT }}
        >
          {email}
        </Link>
      ) : (
        <Link
          href="/login"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          style={{ fontFamily: FONT }}
        >
          登录
        </Link>
      )}
    </header>
  );
}
