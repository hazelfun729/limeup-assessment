import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const faqs = [
  {
    q: "测评需要多长时间？",
    a: "整个测评包含 66 道题目，分三个阶段完成，通常需要 10–15 分钟。建议在一个安静、不受打扰的环境中填写，确保答案真实反映孩子的日常状态。",
  },
  {
    q: "测评适合多大年龄的孩子？",
    a: "测评面向小学到初中阶段的家长，由家长根据孩子的日常表现代为填写。测评结果会结合孩子的年级进行个性化分析。",
  },
  {
    q: "免费成长画像和成长导航手册有什么区别？",
    a: "免费成长画像在注册后立即展示，包含三大系统、九大维度、27 模块的得分和强弱等级，以及下一阶段成长重点。成长导航手册（¥9.9）是在画像基础上的深度分析，包含系统深度解析、学科影响分析、亲子关系评估、完整导航方案和 1 个月启动计划，由老师一对一审核后发送至邮箱。",
  },
  {
    q: "为什么需要邮箱注册？",
    a: "邮箱用于发送成长导航手册和保存您的测评历史。注册后您可以在个人中心查看成长档案和成长曲线变化。",
  },
  {
    q: "测评结果准确吗？",
    a: "测评基于「3-9-27 成长操作系统」模型，涵盖学习动力、学习能力、学习毅力三大系统，从 9 个维度、27 个模块进行全面评估。题目经过多轮验证和校准，结果具有较高参考价值。但测评是辅助工具，建议结合日常观察综合判断。",
  },
  {
    q: "支付后多久能收到成长导航手册？",
    a: "老师确认付款后，系统会自动开始分析生成手册。经过老师审核和个性化调整后，会发送至您的注册邮箱。通常 1–3 个工作日内完成，请耐心等待。",
  },
  {
    q: "可以重新测评吗？",
    a: "可以。您可以多次进行测评，系统会保存每次的测评记录。在个人中心可以查看成长曲线，了解孩子在不同时期的变化趋势。",
  },
  {
    q: "孩子的信息会被泄露吗？",
    a: "我们严格遵守隐私保护政策，孩子的测评数据和个人信息仅用于生成成长报告，不会向第三方出售或泄露。详见隐私政策。",
  },
  {
    q: "遇到问题怎么联系你们？",
    a: "可以添加页面上的咨询老师企业微信，老师会为您解答测评相关问题和后续成长建议。",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-medium text-foreground">常见问题</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            您可能想了解的问题
          </h2>
          <p className="text-sm text-muted-foreground">
            如果没有找到您的问题，欢迎添加咨询老师企业微信。
          </p>
        </section>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="space-y-2 border-b border-border pb-6 last:border-b-0">
              <h3 className="text-sm font-semibold text-foreground">
                {faq.q}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
