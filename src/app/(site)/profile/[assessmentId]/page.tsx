"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sprout } from "lucide-react";
import {
  REPORT_PRICE,
  LETTER_QUESTIONS,
  CONSULTATION_INTRO,
  CONSULTATION_CHOICE,
  REPORT_DELIVERABLES,
  scorePresentation,
  type ProfileView,
} from "@/lib/profile/content";

function ScoreBar({
  name,
  score,
  large = false,
}: {
  name: string;
  score: number | null;
  large?: boolean;
}) {
  const tone = scorePresentation(score);
  return (
    <div
      role={score === null ? undefined : "meter"}
      aria-label={name}
      aria-valuenow={score ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={score === null ? "信息不足" : `${score}分，${tone.level}`}
      className={`${large ? "h-2" : "h-1.5"} overflow-hidden rounded-full bg-black/[0.05]`}
    >
      {score !== null && (
        <div
          className="profile-score-fill h-full rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, score))}%`,
            backgroundColor: tone.bar,
          }}
        />
      )}
    </div>
  );
}
function ScoreBadge({ score }: { score: number | null }) {
  const tone = scorePresentation(score);
  return (
    <span
      className="text-xs font-medium whitespace-nowrap"
      style={{ color: tone.text }}
    >
      {tone.level}
    </span>
  );
}
function Score({
  name,
  score,
  modules,
}: {
  name: string;
  score: number | null;
  modules?: string[];
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_72px_25px_20px] items-center gap-2 border-b border-border/50 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_160px_32px_24px] sm:gap-4">
      <p className="min-w-0 text-[13px] leading-5 sm:text-sm">
        <span className="font-medium">{name}</span>
        {modules && (
          <span className="text-[11px] font-normal text-muted-foreground sm:text-xs">
            （{modules.join("、")}）
          </span>
        )}
      </p>
      <ScoreBar name={name} score={score} />
      <span className="text-right text-xs tabular-nums text-muted-foreground">
        {score ?? "—"}
      </span>
      <ScoreBadge score={score} />
    </div>
  );
}

export default function GrowthProfilePage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [profile, setProfile] = useState<ProfileView | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/profile/${assessmentId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setProfile(d);
      })
      .catch((e) => setError(e.message));
  }, [assessmentId]);
  if (error)
    return (
      <main className="p-12 text-center">
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()} className="mt-4 underline">
          重新加载
        </button>
      </main>
    );
  if (!profile)
    return (
      <main className="p-12 text-center" role="status">
        正在加载成长画像…
      </main>
    );
  const p = profile;
  const totalScore = p.systems.length === 3 && p.systems.every(s => s.score !== null)
    ? Math.round(p.systems.reduce((sum, s) => sum + s.score!, 0) * 10) / 10 : null;
  return (
    <main
      className="min-h-dvh bg-background px-6 text-foreground sm:px-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
      }}
    >
      <div className="mx-auto max-w-3xl">
        <nav className="pt-8 sm:pt-10">
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} />
            返回成长档案
          </Link>
        </nav>
        <header className="mb-10 mt-4 border-b border-border px-2 pb-10 pt-5 text-center sm:mb-12 sm:pb-12">
          <p className="text-xs tracking-[0.2em] text-muted-foreground">
            青柠伴学 · 成长画像
          </p>
          <div
            className="mx-auto mb-4 mt-5 flex h-16 w-16 items-center justify-center text-4xl"
            aria-label={p.copy.animal}
          >
            {p.emoji}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {p.copy.animal}
          </h1>
          {totalScore !== null && <div className="mt-5 inline-flex items-baseline gap-2 rounded-full bg-primary px-5 py-2 text-primary-foreground" aria-label={`总得分${totalScore}，满分300`}><span className="text-xs">总得分</span><strong className="text-2xl font-semibold tabular-nums">{totalScore}</strong><span className="text-sm">/ 300</span></div>}
          <p className="mx-auto mt-6 max-w-xl text-xl font-medium leading-relaxed sm:text-2xl">
            {p.copy.title}
          </p>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            看见此刻的孩子，也看见支持他的可能。
          </p>
        </header>
        <section aria-labelledby="understand-title" className="pb-8 sm:pb-12">
          <h2
            id="understand-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            认识孩子，从理解开始
          </h2>
          <div className="mt-5 space-y-3 text-[15px] leading-7 text-foreground/85 sm:text-base sm:leading-8">
            {p.copy.paragraphs.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <p className="mt-5 max-w-xl text-xs leading-6 text-muted-foreground">
            这份画像来自本次观察，描述的是当前状态，不是孩子固定的标签，也不是医学诊断。
          </p>
        </section>
        <section
          aria-labelledby="scores-title"
          className="border-t border-border py-7 sm:py-10"
        >
          <h2
            id="scores-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            自主学习力系统
          </h2>
          <div className="mt-5 divide-y divide-border">
            {p.systems.map((s) => (
              <section
                key={s.code}
                aria-labelledby={`system-${s.code}`}
                className="py-5 first:pt-0"
              >
                <header className="mb-2 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_25px_20px] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_32px_24px] sm:gap-4">
                  <h3
                    id={`system-${s.code}`}
                    className="text-base font-semibold sm:text-lg"
                  >
                    {s.name}
                  </h3>
                  <ScoreBar name={s.name} score={s.score} large />
                  <span className="text-right text-sm font-medium tabular-nums">
                    {s.score ?? "—"}
                  </span>
                  <ScoreBadge score={s.score} />
                </header>
                {s.dimensions.map((d) => (
                  <Score
                    key={d.code}
                    name={d.name}
                    modules={d.modules}
                    score={d.score}
                  />
                ))}
              </section>
            ))}
          </div>
        </section>
        <section className="relative rounded-2xl border border-primary/20 bg-primary/[0.08] px-5 py-5 sm:px-7 sm:py-6">
          <h2 className="flex items-center gap-3 text-xl font-medium">
            <Sprout className="h-5 w-5 text-foreground/60" />
            今天可以试试
          </h2>
          <p className="mt-5 text-base leading-[2] sm:text-[17px]">
            {p.copy.action}
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            不必一下改变很多。
          </p>
        </section>
        <section aria-labelledby="letter-title" className="py-9 sm:py-12">
          <p className="text-xs tracking-widest text-muted-foreground">
            一封信，让理解更近一点
          </p>
          <h2
            id="letter-title"
            className="mt-5 max-w-xl text-2xl font-semibold leading-[1.5] tracking-tight sm:text-3xl"
          >
            看完孩子的成长画像，
            <br className="hidden sm:block" />
            如果还有想进一步了解的事，欢迎写信告诉我。
          </h2>
          <p className="mt-8 max-w-2xl text-base leading-[2] text-muted-foreground">
            {CONSULTATION_INTRO}
          </p>
          <ol className="mt-5 space-y-2">
            {LETTER_QUESTIONS.map((q, i) => (
              <li
                key={q}
                className="flex gap-3 text-[13px] leading-6 text-[#4b4b47] sm:text-sm"
              >
                <span className="w-4 shrink-0 text-sm tabular-nums text-muted-foreground">
                  {i + 1}.
                </span>
                <span>
                  {q}
                  {i === 4 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      选填
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6 pt-2">
            <p className="text-base leading-[2]">
              收到来信后，柚子老师会在
              <strong className="font-semibold">3个工作日内</strong>给你一封
              <strong className="font-semibold">免费的初步回信</strong>
              ，结合你提供的信息，谈谈可能的原因，以及可以尝试的支持方式。
            </p>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              {CONSULTATION_CHOICE}
            </p>
            <p className="mt-6 text-sm text-muted-foreground">— 柚子老师</p>
          </div>
          <Link
            href={`/consultation/${assessmentId}`}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground transition hover:brightness-95"
          >
            写咨询信
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            首次回信免费，无需购买报告。
          </p>
        </section>
        <section
          aria-labelledby="report-title"
          className="mb-10 border-t border-border pt-9 sm:pt-12"
        >
          <p className="text-xs tracking-widest text-muted-foreground">
            成长导航报告
          </p>
          <h2
            id="report-title"
            className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            把理解，变成接下来的支持
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            成长画像帮你看见整体状态。成长导航报告会结合这次测评，进一步梳理支持方向，帮助你把理解带回每天的相处与学习。
          </p>
          <div className="mt-6 divide-y divide-border/60">
            {REPORT_DELIVERABLES.map((item, i) => (
              <article key={item.title} className="flex gap-4 py-4">
                <span className="pt-0.5 text-xs tabular-nums text-muted-foreground">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-6 border-t border-foreground/10 py-5 sm:py-6">
            <div>
              {!p.purchase.purchased && (
                <>
                  <p className="mb-2 text-xs text-muted-foreground">
                    成长导航报告
                  </p>
                  <p className="flex items-baseline gap-3">
                    <strong className="text-3xl font-semibold tracking-tight">
                      ¥{REPORT_PRICE.current}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      原价 <del>¥{REPORT_PRICE.original}</del>
                    </span>
                  </p>
                </>
              )}
            </div>
            <Link
              href={p.purchase.href}
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground transition hover:brightness-95"
            >
              {p.purchase.label}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <footer className="border-t border-border py-10 text-center text-xs leading-6 text-muted-foreground">
          成长不必急着找到所有答案。先从理解孩子的一小步开始。
        </footer>
      </div>
    </main>
  );
}
