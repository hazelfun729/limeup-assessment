"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LETTER_QUESTIONS } from "@/lib/profile/content";
type Letter = {
  id: string;
  assessmentId: string;
  email: string;
  answers: string[];
  reply: string | null;
  status: string;
  createdAt: string;
  delivery: { status: string; error: string | null } | null;
};
export default function Consultations() {
  const [letters, setLetters] = useState<Letter[]>([]),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [page, setPage] = useState(0);
  async function load(n: number) {
    const r = await fetch(`/api/admin/consultations?page=${n}`);
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setLetters(d);
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/admin/consultations?page=${page}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) {
          setLetters(d);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page]);
  async function send(l: Letter) {
    if (busy) return;
    setBusy(l.id);
    setError("");
    try {
      const r = await fetch(`/api/admin/consultations/${l.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: drafts[l.id] ?? l.reply ?? "" }),
      });
      const d = await r.json();
      await load(page);
      if (!r.ok) throw Error(d.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-semibold">咨询来信</h1>
      <p className="my-3 text-sm">
        首次回信免费，请在3个工作日内回复。发送成功后自动记录状态。
      </p>
      {error && (
        <p role="alert" className="my-4 text-red-700">
          {error}
        </p>
      )}
      {letters.map((l) => (
        <section key={l.id} className="my-6 rounded-xl border bg-white p-6">
          <p className="break-all font-medium">{l.email}</p>
          <p className="my-2 text-sm">
            {new Date(l.createdAt).toLocaleString()} ·{" "}
            {l.status === "REPLIED"
              ? "已回复"
              : l.status === "FAILED"
                ? "发送失败"
                : "待回复"}
          </p>
          <Link className="underline" href={`/profile/${l.assessmentId}`}>
            查看对应成长画像
          </Link>
          {l.answers.map((a, i) => (
            <div key={i} className="mt-4">
              <h2 className="font-medium">{LETTER_QUESTIONS[i]}</h2>
              <p className="whitespace-pre-wrap break-words leading-7">{a || "未填写"}</p>
            </div>
          ))}
          <label className="mt-6 block">
            给家长的回信
            <textarea
              aria-label="给家长的回信"
              disabled={l.status === "REPLIED"}
              maxLength={20000}
              value={drafts[l.id] ?? l.reply ?? ""}
              onChange={(e) => setDrafts({ ...drafts, [l.id]: e.target.value })}
              className="mt-2 min-h-48 w-full rounded border p-3"
            />
          </label>
          {l.delivery?.error && (
            <p className="my-2 text-amber-800">{l.delivery.error}</p>
          )}
          <button
            disabled={
              !!busy ||
              l.status === "REPLIED" ||
              ["SENDING", "UNKNOWN"].includes(l.delivery?.status || "")
            }
            onClick={() => send(l)}
            className="mt-3 rounded bg-primary px-5 py-3 disabled:opacity-40"
          >
            {busy === l.id
              ? "正在发送…"
              : l.status === "REPLIED"
                ? "已发送回信"
                : "发送回信到用户邮箱"}
          </button>
        </section>
      ))}
      {!letters.length && <p className="py-8">暂无来信</p>}
      <div className="flex gap-6">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          上一页
        </button>
        <button
          disabled={letters.length < 20}
          onClick={() => setPage(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
