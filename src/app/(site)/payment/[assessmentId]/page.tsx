"use client";

import { REPORT_PRICE, REPORT_DELIVERABLES } from "@/lib/profile/content";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;
  const [submitting, setSubmitting] = useState(false);
  const [wechatOrderSuffix, setWechatOrderSuffix] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handlePaid = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/payment/${assessmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wechatOrderSuffix }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "提交失败");
      }
      router.push(`/status/${assessmentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请重试");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background px-5 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href={`/profile/${assessmentId}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft size={15} />
          返回成长画像
        </Link>
        <header className="mt-4 border-b border-border pb-7 pt-3">
          <p className="text-xs tracking-widest text-muted-foreground">
            青柠伴学 · 成长导航报告
          </p>
          <h1 className="mt-4 text-2xl font-semibold leading-relaxed sm:text-3xl">
            把理解，变成接下来的支持
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            看见孩子的状态之后，你也许还想知道：从哪里开始，怎样陪伴，才更适合自己的孩子？这份报告会结合本次测评，帮你把理解带回每天的相处与学习。
          </p>
        </header>
        <section className="mt-6" aria-label="报告能带来的帮助">
          <h2 className="mb-4 text-lg font-semibold">
            让接下来的每一步，更有方向
          </h2>
          <div className="divide-y divide-border/60">
            {REPORT_DELIVERABLES.map((item) => (
              <article key={item.title} className="py-4">
                <h3 className="text-sm font-semibold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            不必一次改变所有事。先找到一个适合你们的小起点，再逐步尝试。
          </p>
        </section>
        <section
          className="mt-6 rounded-2xl border border-border bg-card p-6 text-center"
          aria-label="支付报告费用"
        >
          <h2 className="text-base font-medium">获取孩子的成长导航报告</h2>
          <p className="my-4">
            <strong className="text-3xl font-semibold">
              ¥{REPORT_PRICE.current}
            </strong>
            <span className="ml-3 text-xs text-muted-foreground">
              原价 <del>¥{REPORT_PRICE.original}</del>
            </span>
          </p>
          <p className="mb-4 text-sm leading-7">请用微信支付 ¥{REPORT_PRICE.current}</p>
          <Image
            src="/wechat-payment-qr.png"
            alt="青柠伴学微信收款码"
            width={828}
            height={1124}
            unoptimized
            className="mx-auto w-full max-w-[260px] rounded-xl border border-border"
          />
          <label htmlFor="wechat-order-suffix" className="mt-4 block text-left text-sm font-medium">
            扫码付款后，填写微信支付订单号最后 6 位数字
          </label>
          <input
            id="wechat-order-suffix"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={wechatOrderSuffix}
            onChange={(event) => setWechatOrderSuffix(event.target.value.replace(/\D/g, "").slice(-6))}
            placeholder="6 位数字"
            aria-describedby="wechat-order-help"
            className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
          />
          <p id="wechat-order-help" className="mt-2 text-left text-xs leading-6 text-muted-foreground">
            在微信账单中打开这笔付款，查看“微信支付订单号”；只填写最后 6 位，不是本网站的订单编号。
          </p>
          <p className="mt-2 text-left text-xs leading-6 text-muted-foreground">
            电脑端可用微信扫码；手机端可长按图片，在微信中识别。
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}
          <button
            onClick={handlePaid}
            disabled={submitting || !/^\d{6}$/.test(wechatOrderSuffix)}
            className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground hover:brightness-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                提交中…
              </>
            ) : (
              "我已支付，提交核对"
            )}
          </button>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            提交后可查看报告进度。付款需人工核对，点击此按钮不代表已确认到账。
          </p>
        </section>
      </div>
    </main>
  );
}
