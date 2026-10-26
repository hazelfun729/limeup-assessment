"use client";
import { useEffect, useState } from "react";
type Item = {
  id: string;
  user: { email: string } | null;
  delivery: { status: string; error: string | null } | null;
};
export default function ProfileMails() {
  const [items, setItems] = useState<Item[]>([]),
    [enabled, setEnabled] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [page, setPage] = useState(0);
  async function load(n: number) {
    const r = await fetch(`/api/admin/profile-mails?page=${n}`);
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setItems(d.items);
    setEnabled(d.enabled);
  }
  useEffect(() => {
    let active = true;
    fetch(`/api/admin/profile-mails?page=${page}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (active) {
          setItems(d.items);
          setEnabled(d.enabled);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [page]);
  async function send(id: string) {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/admin/profile-mails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId: id }),
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
    <div className="p-8">
      <h1 className="text-2xl font-semibold">画像邮件</h1>
      <p className="my-4">
        {enabled
          ? "已启用公开链接，可发送或重试失败的邮件。"
          : "本地预览模式：暂不向用户发送画像邮件。"}
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {items.map((a) => (
        <div key={a.id} className="my-3 rounded border p-4">
          <p className="break-all">{a.user?.email}</p>
          <p className="my-2 text-sm">
            {a.delivery?.status || "尚未发送"} {a.delivery?.error}
          </p>
          <a
            className="mr-6 underline"
            href={`/api/admin/profile-mails?assessmentId=${a.id}`}
            target="_blank"
            rel="noreferrer"
          >
            预览邮件
          </a>
          <button
            disabled={
              !enabled ||
              !!busy ||
              (!!a.delivery &&
                !["FAILED", "PENDING"].includes(a.delivery.status))
            }
            onClick={() => send(a.id)}
            className="disabled:opacity-40"
          >
            {busy === a.id ? "发送中…" : "发送 / 重试"}
          </button>
        </div>
      ))}
      <div className="mt-6 flex gap-6">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          上一页
        </button>
        <button disabled={items.length < 20} onClick={() => setPage(page + 1)}>
          下一页
        </button>
      </div>
    </div>
  );
}
