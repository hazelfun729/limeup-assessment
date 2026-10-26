"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LETTER_QUESTIONS } from "@/lib/profile/content";
export default function ConsultationPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const router = useRouter();
  const [email, setEmail] = useState(""),
    [answers, setAnswers] = useState(() => LETTER_QUESTIONS.map(() => "")),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/consultation/${assessmentId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          if (r.status === 403) {
            router.replace(
              `/login?redirect=${encodeURIComponent(`/consultation/${assessmentId}`)}`,
            );
            return;
          }
          throw Error(d.error);
        }
        setEmail(d.email);
        if (d.letter) {
          setAnswers(LETTER_QUESTIONS.map((_, i) => d.letter.answers[i] || ""));
          setStatus(d.letter.status);
        }
      })
      .catch((e) => setError(e.message));
  }, [assessmentId, router]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/consultation/${assessmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setStatus("PENDING");
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-dvh bg-background px-6 py-10 text-foreground sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/profile/${assessmentId}`}
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground"
        >
          ← 返回成长画像
        </Link>
        <h1 className="mt-12 text-3xl font-semibold tracking-tight sm:text-4xl">
          写咨询信
        </h1>
        <p className="mb-10 mt-6 max-w-lg text-base leading-8 text-muted-foreground">
          不用组织成一封完美的信。写下真实的经历，就已经是很好的开始。
        </p>
        {error && (
          <p role="alert" className="my-4 text-red-700">
            {error}
          </p>
        )}
        {!email && !error && <p role="status">正在读取来信信息…</p>}
        {email && (
          <>
            <p className="mb-12 border-y border-border py-5 text-sm leading-7 break-all text-muted-foreground">
              回复将发送到已验证邮箱：{email}
            </p>
            {status ? (
              <section className="rounded-2xl bg-card p-8">
                <h2 className="text-xl font-medium">
                  {status === "REPLIED" ? "回信已发送" : "来信已收到"}
                </h2>
                <p className="mt-4 leading-8">
                  {status === "REPLIED"
                    ? "请到你的邮箱查看柚子老师的回信，也可以检查垃圾邮件文件夹。"
                    : "柚子老师将在3个工作日内回复至你的邮箱。首次回信免费，无需购买报告。"}
                </p>
                <details className="mt-6">
                  <summary className="cursor-pointer">查看我的来信</summary>
                  {answers.map((a, i) => (
                    <div key={i} className="mt-4">
                      <h3 className="font-medium">{LETTER_QUESTIONS[i]}</h3>
                      <p className="mt-2 whitespace-pre-wrap break-words">
                        {a || "未填写"}
                      </p>
                    </div>
                  ))}
                </details>
              </section>
            ) : (
              <form onSubmit={submit} className="space-y-10 sm:space-y-12">
                {LETTER_QUESTIONS.map((q, i) => (
                  <label key={q} className="block">
                    <span className="block text-base font-medium leading-8">
                      {i + 1}. {q}
                      {i === 4 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          选填
                        </span>
                      )}
                    </span>
                    <textarea
                      required={i < 4}
                      maxLength={4000}
                      value={answers[i]}
                      onChange={(e) =>
                        setAnswers(
                          answers.map((a, j) => (j === i ? e.target.value : a)),
                        )
                      }
                      className="mt-4 min-h-36 w-full resize-y rounded-xl border border-input bg-card px-5 py-4 text-base leading-8 outline-none transition focus:border-foreground/40 focus:ring-2 focus:ring-primary/30"
                    />
                  </label>
                ))}
                <p className="max-w-lg text-xs leading-6 text-muted-foreground">
                  提交后，柚子老师可查看这封信及对应测评，帮助理解你的困惑。
                </p>
                <button
                  disabled={busy}
                  className="min-h-12 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition hover:brightness-95 disabled:opacity-50"
                >
                  {busy ? "正在提交，请稍候…" : "提交咨询信"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
