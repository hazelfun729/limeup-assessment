import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
          <h1 className="text-lg font-medium text-foreground">用户协议</h1>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            更新日期：2025年7月1日
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">一、服务说明</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            LIMEUP（青柠伴学）自主学习力测评（以下简称"本服务"）由上海春华秋实公益基金会提供。本服务旨在帮助家长了解孩子的自主学习力状况，提供成长参考建议。本服务不构成任何医学诊断、心理治疗或教育决策建议。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">二、用户注册</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            用户在完成测评后需通过邮箱验证进行注册。用户应确保提供的邮箱地址真实有效，并妥善保管账号信息。每位用户可完成多次测评，历史记录将保留且不覆盖。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">三、测评说明</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            自主学习力测评为教育参考工具，基于3-9-27成长模型，从学习动力、学习能力、学习毅力三大系统评估孩子的自主学习状态。测评结果仅供参考，不代表对孩子的定性评价或预测。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">四、付费服务</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            成长导航手册为付费增值服务，由专业老师基于测评结果进行分析和审核。付费后请保留支付凭证，我们会在确认收款后开始制作。如遇到问题，可添加咨询老师企业微信获取帮助。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">五、知识产权</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            本服务的所有内容，包括但不限于测评题目、报告模板、成长模型、品牌标识、界面设计等，均受知识产权法律保护。未经授权，不得复制、传播或用于商业目的。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">六、免责声明</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            本服务提供的成长画像和建议仅供教育参考，不能替代专业心理咨询或教育诊断。如因使用本服务产生任何教育决策，由用户自行判断和承担。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">七、协议修改</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            我们保留修改本协议的权利。修改后的协议将在网站公布后生效，继续使用本服务即视为同意修改后的协议。
          </p>
        </section>
      </article>
    </main>
  );
}
