"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, BookOpen, MessageCircle } from "lucide-react";

const HANDBOOK_SECTIONS = [
  "全景学习画像与学习模式分析",
  "三大系统深度解析与学科影响",
  "亲子关系生态评估",
  "成长全景导航解决方案",
  "短期修复 + 长期进化方案",
  "1个月详细启动计划",
  "个性化阅读指南",
];

export default function PaymentPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  return (
    <main className="min-h-dvh bg-background px-6 py-12">
      <div className="mx-auto max-w-lg space-y-10">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-semibold text-foreground">
            成长导航手册
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            基于孩子的测评数据，由专业老师审核生成，为家庭提供完整的成长升级方案。
          </p>
        </motion.section>

        {/* Value list */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {HANDBOOK_SECTIONS.map((section, i) => (
            <div key={i} className="flex items-start gap-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-foreground">{section}</span>
            </div>
          ))}
        </motion.section>

        {/* Price */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-3xl font-semibold text-foreground">
              ¥9.9
            </span>
            <span className="text-sm text-muted-foreground line-through">
              ¥99
            </span>
          </div>
        </motion.section>

        {/* QR Codes */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid gap-6 sm:grid-cols-2"
        >
          {/* Payment QR */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center">
            <BookOpen className="mb-3 h-5 w-5 text-muted-foreground" />
            <p className="mb-4 text-sm font-medium text-foreground">
              扫码支付
            </p>
            {/* Placeholder QR - will be replaced with real QR from SiteConfig */}
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/50">
              <span className="text-xs text-muted-foreground">
                支付二维码
                <br />
                （后台可替换）
              </span>
            </div>
          </div>

          {/* WeChat QR */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center">
            <MessageCircle className="mb-3 h-5 w-5 text-muted-foreground" />
            <p className="mb-4 text-sm font-medium text-foreground">
              联系咨询老师
            </p>
            {/* Placeholder QR - will be replaced with real QR from SiteConfig */}
            <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/50">
              <span className="text-xs text-muted-foreground">
                企业微信二维码
                <br />
                （后台可替换）
              </span>
            </div>
          </div>
        </motion.section>

        {/* Payment remark warning */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4 text-center"
        >
          <p className="text-sm font-semibold text-amber-800">
            ⚠️ 请务必在付款备注中填写您的邮箱
          </p>
          <p className="mt-1 text-xs text-amber-600">
            否则无法自动匹配，需要联系客服人工处理（可能延迟）
          </p>
        </motion.div>

        {/* Post-payment instruction */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground"
        >
          支付完成后，请点击下方按钮确认订单
        </motion.p>

        {/* Confirm order button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <a
            href={`/status/${assessmentId}`}
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-95 active:scale-[0.98]"
          >
            我已支付，查看进度
          </a>
        </motion.div>
      </div>
    </main>
  );
}
