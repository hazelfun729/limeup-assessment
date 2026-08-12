import Link from "next/link";
import { HeroBackground } from "@/components/hero-background";
import { AssessmentEntry } from "@/components/assessment-entry";

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Abstract background animation */}
      <HeroBackground />

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1
          className="hero-fade-up max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl md:leading-[1.15]"
          style={{ animationDelay: "0s" }}
        >
          全面测评学习力，
          <br />
          发现学习中的真问题。
        </h1>

        <p
          className="hero-fade-up mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          style={{ animationDelay: "0.15s" }}
        >
          Growth OS 通过自主学习力测评，帮助孩子探索成长优势，获得属于自己的成长升级方案。
        </p>

        <AssessmentEntry />
      </section>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-6 px-6 py-5 text-xs text-muted-foreground">
        <Link href="/terms" className="transition-colors hover:text-foreground">
          用户协议
        </Link>
        <span className="text-border">·</span>
        <Link href="/privacy" className="transition-colors hover:text-foreground">
          隐私政策
        </Link>
        <span className="text-border">·</span>
        <span>沪ICP备XXXXXXXX号</span>
      </footer>
    </main>
  );
}
