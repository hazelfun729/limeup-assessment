import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
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
          <h1 className="text-lg font-medium text-foreground">关于青柠伴学</h1>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">
            看清真问题，找到撬动成长的关键支点
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            青柠伴学（LIMEUP）是一个专注于孩子自主学习力发展的测评平台。我们相信，每个孩子的成长都有自己的节奏，关键不在于和谁比较，而在于看清他真正需要什么。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">我们的理念</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            很多家长都在焦虑孩子的学习问题，但真正的问题往往藏在表面之下。孩子不是「不努力」，而是缺乏内在动力；不是「不够聪明」，而是还没找到适合自己的学习方式。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            我们基于「3-9-27 成长操作系统」模型，从学习动力、学习能力、学习毅力三大系统出发，覆盖 9 个核心维度、27 个关键模块，帮助家长看清孩子成长的真实状态。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">测评能帮你什么</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            完成 66 道科学设计的测评题（约 10–15 分钟），你将获得一份免费成长画像，清晰展示孩子在三大系统、九大维度上的具体表现和强弱等级。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            如果需要更深入的分析，可以获取成长导航手册（¥9.9），包含系统深度解析、学科影响分析、亲子关系评估、完整导航方案和 1 个月启动计划，由老师一对一审核后发送至邮箱。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">联系我们</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            如有任何疑问或需要成长建议，欢迎添加咨询老师企业微信，我们将为你提供一对一的专业支持。
          </p>
        </section>
      </article>
    </main>
  );
}
