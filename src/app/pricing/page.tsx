import Link from "next/link";
import { ArrowLeft, Check, Star } from "lucide-react";

export default function PricingPage() {
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
          <h1 className="text-lg font-medium text-foreground">服务与定价</h1>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
        {/* Intro */}
        <section className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-foreground">
            看清孩子的真问题，找到成长的关键支点
          </h2>
          <p className="text-sm text-muted-foreground">
            66 道科学测评题，覆盖学习动力、学习能力、学习毅力三大系统，生成个性化成长画像。
          </p>
        </section>

        {/* Pricing Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Free Card */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">免费成长画像</h3>
              <p className="text-2xl font-bold text-foreground">¥0</p>
            </div>
            <p className="text-sm text-muted-foreground">
              完成测评并注册后立即获得
            </p>
            <ul className="space-y-2.5">
              {[
                "学习模式与成长画像",
                "三大系统具体得分",
                "九大维度具体得分",
                "27 模块具体得分（强/中/弱）",
                "一句话成长总结",
                "下一阶段成长重点",
                "一条可落地行动建议",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/assessment"
              className="block w-full rounded-lg border border-border py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              开始测评
            </Link>
          </div>

          {/* Paid Card */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-6 space-y-5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
              推荐
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">成长导航手册</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">¥9.9</span>
                <span className="text-sm text-muted-foreground line-through">¥99</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              包含免费画像全部内容，另含深度分析与完整导航方案
            </p>
            <ul className="space-y-2.5">
              {[
                "免费画像的全部内容",
                "三大系统深度解析",
                "学科学习状态分析",
                "亲子关系生态评估",
                "成长全景导航方案",
                "短期修复 + 长期进化方案",
                "1 个月启动计划",
                "阅读指南与书籍推荐",
                "老师一对一审核发送",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/assessment"
              className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              开始测评
            </Link>
          </div>
        </div>

        {/* FAQ teaser */}
        <section className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            有疑问？查看{" "}
            <Link href="/faq" className="text-primary underline-offset-2 hover:underline">
              常见问题
            </Link>
            {" "}或添加咨询老师企业微信。
          </p>
        </section>
      </div>
    </main>
  );
}
