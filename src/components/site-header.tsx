"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT = '"PingFang SC", -apple-system, "Helvetica Neue", sans-serif';

export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        setLoggedIn(data.authenticated);
        if (data.user?.email) setEmail(data.user.email);
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setChecking(false));
  }, []);

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
      {checking ? null : loggedIn ? (
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
