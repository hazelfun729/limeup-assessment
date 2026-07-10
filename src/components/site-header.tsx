"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export function SiteHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => setLoggedIn(data.authenticated))
      .catch(() => setLoggedIn(false))
      .finally(() => setChecking(false));
  }, []);

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="青柠伴学"
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="text-sm font-medium tracking-tight text-foreground">
          自主学习力测评
        </span>
      </Link>
      {checking ? null : loggedIn ? (
        <Link
          href="/account"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          成长档案
        </Link>
      ) : (
        <Link
          href="/login"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          登录
        </Link>
      )}
    </header>
  );
}
