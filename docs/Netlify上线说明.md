# Netlify 上线说明

此项目是带服务端接口的 Next.js 应用，应从 GitHub 仓库导入 Netlify，并使用仓库根目录的 `netlify.toml` 构建。构建只执行 `npm run build`；不要在每次部署时运行 `prisma db push`、`--accept-data-loss` 或种子脚本。

当前收款流程为家长扫描微信收款码，填写微信支付订单号后六位，管理员核对到账、金额和归属后人工确认；家长提交后不可自动标记为已支付。真实账单自动匹配暂缓验收，有可用账单后再启用。`WECHAT_RECEIVER_NICKNAME` 仅供账单自动导入核对使用，人工确认暂不依赖它。

在 Netlify 的站点环境变量中配置以下服务端变量，作用域需覆盖构建和 Functions，值不要写进 Git：
此前曾在聊天中公开过的 API 密钥应在生产部署前更换，再只通过 Netlify 环境变量保存新密钥。

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres 运行时连接；Netlify 是无服务器环境，优先使用该项目的 transaction pooler（端口 6543）连接串。 |
| `DIRECT_URL` | 可选，仅用于单独执行 Prisma 迁移；使用 session pooler（端口 5432）连接串。 |
| `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL` | DeepSeek 报告生成。 |
| `REPORT_JOB_SECRET` | 报告后台任务签名密钥；设为独立随机长字符串，部署环境中的 Next 接口和 Netlify Function 必须读取同一个值。 |
| `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS` | 验证码、咨询回信和报告邮件；若改用 Resend，按现有代码配置 `RESEND_API_KEY` 和 `MAIL_FROM`。 |
| `PUBLIC_SITE_URL` | 上线后的 HTTPS 站点根地址，例如 `https://你的站点.netlify.app`；报告邮件的正式网页入口依赖它。 |

数据库迁移应在确认当前 Supabase 项目与备份后单独执行和核对，不在 Netlify 构建时自动进行。迁移管理可使用 session pooler（端口 5432）作为 `DIRECT_URL`；`prisma.config.ts` 会优先使用它，运行时仍使用 `DATABASE_URL`。

付款确认和后台手动生成在 Netlify 上使用 Background Function 排队，普通请求会立即返回；后台函数最长运行 15 分钟，DeepSeek 请求限定 10 分钟并预留保存时间。每次排队先持久记录任务 ID；重复请求不会再次排队，超过 20 分钟仍未完成会在报告管理和用户进度页提示异常。管理员核对生成记录与服务商调用结果后才可人工重试；不要自动重试，以免重复消耗 AI 额度。批量操作每次最多 10 份。本地 `next dev` 直接运行生成器，不需要 `REPORT_JOB_SECRET`。

首次部署先在 Netlify 预览环境检查站点首页、数据库连接、管理员登录与报告列表、后台任务入口和公开站点链接。邮箱收件、手机页面和 A4 打印此前已完成验收，不重复归类为未完成项。真实家长从测评、注册、扫码付款到收到报告的完整流程，须在站点上线后验收；真实发信由管理员在后台操作，避免部署检查自动发信。
