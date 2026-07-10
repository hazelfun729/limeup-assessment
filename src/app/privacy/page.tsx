import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
          <h1 className="text-lg font-medium text-foreground">隐私政策</h1>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            更新日期：2025年7月1日
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            一、我们收集的信息
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            为提供测评服务，我们会收集以下信息：
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            注册信息：邮箱地址（用于账号注册和接收成长导航手册）。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            测评信息：测评答案和得分数据（用于生成成长画像和报告）。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            基本信息：孩子姓名、年级等（用于报告个性化分析，选填）。
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            技术信息：IP地址、浏览器类型等（用于服务改进和安全保障）。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            二、信息的使用
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            我们仅在以下场景使用您的信息：生成个人成长画像和导航手册、发送验证邮件和报告邮件、改进测评服务质量、保障账号安全。我们不会将您的个人数据出售给第三方。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            三、信息的存储
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            您的数据存储在经过加密保护的服务器中。测评历史记录会长期保留，不会覆盖。您可以随时通过账号设置查看或删除自己的数据。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            四、信息的共享
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            除以下情况外，我们不会向第三方共享您的个人信息：经您明确同意、法律法规要求、保护我们或用户的合法权益和人身安全。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            五、Cookie 使用
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            我们使用 Cookie 来维持登录状态和保障账号安全。这些 Cookie 是服务正常运行所必需的，不包含广告追踪信息。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            六、您的权利
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            您有权查看、更正或删除自己的个人信息。如需行使相关权利，请通过咨询老师企业微信与我们联系。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            七、未成年人保护
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            本服务面向家长用户，由家长代为填写孩子的测评信息。我们不会直接向未成年人收集个人信息。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">八、联系方式</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            如对本隐私政策有任何疑问，请添加咨询老师企业微信与我们联系。
          </p>
        </section>
      </article>
    </main>
  );
}
