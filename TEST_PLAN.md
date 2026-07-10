# Assessment V3 全流程测试计划

> 环境：http://localhost:3456
> 前提：SQLite 数据库已就绪，种子数据已导入，Dev Mode 邮件（验证码存数据库）

---

## 一、用户主流程（核心链路）

这是最重要的测试路径，模拟真实用户从进入到完成测评的完整体验。

### 1.1 首页

- [ ] 访问 `http://localhost:3456`，页面正常加载
- [ ] Hero 区域：标题「看清真问题，找到撬动成长的关键支点。」显示正常
- [ ] 入场动画：标题、副标题、按钮依次淡入上浮
- [ ] 背景动画：节点和连线缓慢浮动，不刺眼不闪烁
- [ ] 左上角 Logo + 「自主学习力测评」显示正常
- [ ] 右上角显示「登录」（未登录状态）
- [ ] 底部「用户协议」「隐私政策」链接可点击
- [ ] 点击「开始测评」按钮

### 1.2 测评答题

- [ ] 自动跳转到 `/assessment/[id]`，URL 包含 UUID
- [ ] 页面顶部显示「第1阶段 · 第1题 / 22题」
- [ ] 进度条显示 0%
- [ ] 题目文字正常显示（真实题目，非占位文字）
- [ ] 5 个选项全部显示：总是 / 经常 / 偶尔 / 极少 / 不了解
- [ ] 点击一个选项，自动跳转到下一题
- [ ] 点击「上一题」返回，之前的选项已选中
- [ ] 答完 22 题后出现阶段完成提示「第一阶段完成」
- [ ] 点击「继续」进入第二阶段
- [ ] 重复完成第二阶段（22题）和第三阶段（22题）
- [ ] 66 题全部答完后，点击「查看成长画像」
- [ ] 跳转到注册页面 `/register?assessmentId=xxx`

### 1.3 注册（Dev Mode）

- [ ] 页面显示邮箱输入框和验证码输入框
- [ ] 输入测试邮箱（如 `test@example.com`），点击「发送验证码」
- [ ] 提示「验证码已发送」
- [ ] 从终端日志查看验证码：`[DEV] Verification code for test@example.com: XXXXXX`
- [ ] 输入验证码，点击「注册」
- [ ] 注册成功后自动登录，跳转到画像页面

### 1.4 画像结果页

- [ ] 页面 `/profile/[assessmentId]` 正常显示
- [ ] 显示动物类型（如绵羊、孔雀等）和 emoji
- [ ] 三个系统得分显示：动力 / 能力 / 毅力（含强/中/弱标签）
- [ ] 9 个维度得分条或分数展示
- [ ] 成长重点（3 句话）正常显示
- [ ] 行动建议正常显示
- [ ] 有「查看详细手册」或支付引导入口

### 1.5 支付引导

- [ ] 点击后跳转到 `/payment/[assessmentId]`
- [ ] 显示价格信息（¥9.9，原价 ¥99）
- [ ] 显示支付二维码区域（可能为占位图）
- [ ] 显示企业微信二维码区域（可能为占位图）
- [ ] 有返回或跳转链接

### 1.6 用户中心

- [ ] 访问 `/account`，已登录状态下正常显示
- [ ] 显示已完成的测评列表
- [ ] 显示最近一次的画像摘要
- [ ] 有「开始新测评」入口
- [ ] 点击「账号设置」跳转到 `/account/settings`

### 1.7 账号设置

- [ ] `/account/settings` 正常显示
- [ ] 显示当前邮箱
- [ ] 可以设置/修改密码（需要验证码）
- [ ] 有「退出登录」按钮

### 1.8 登录 / 登出

- [ ] 退出登录后跳转，右上角变为「登录」
- [ ] 访问 `/account` 被重定向到 `/login`
- [ ] 登录页面：输入邮箱 → 发送验证码 → 输入验证码 → 登录成功
- [ ] 登录后自动跳转到之前的页面（redirect 参数）

---

## 二、管理后台

### 2.1 登录

- [ ] 访问 `/admin`，未登录自动跳转到 `/admin/login`
- [ ] 用管理员账号登录（需要先创建管理员账号，见下方「准备工作」）

### 2.2 Dashboard

- [ ] `/admin/dashboard` 显示统计数据（用户数、测评数、付费数等）

### 2.3 用户管理

- [ ] `/admin/users` 显示用户列表
- [ ] 点击用户进入 `/admin/users/[id]` 查看详情

### 2.4 付款确认

- [ ] `/admin/payments` 显示付款记录列表
- [ ] 可以确认付款操作

### 2.5 报告审核

- [ ] `/admin/reports` 显示报告列表
- [ ] `/admin/reports/[id]` 显示报告详情，可编辑和审核

### 2.6 题库管理

- [ ] `/admin/questions` 显示 66 道题目
- [ ] 可以编辑题目内容

### 2.7 邮件管理

- [ ] `/admin/emails` 显示邮件发送记录
- [ ] 能看到 Dev Mode 下发送的验证码记录

### 2.8 Prompt 管理

- [ ] `/admin/prompts` 显示 Prompt 列表
- [ ] 可以创建和编辑 Prompt

### 2.9 阈值配置

- [ ] `/admin/thresholds` 显示当前阈值（强>65 / 中40-65 / 弱<40）
- [ ] 可以修改阈值

### 2.10 CRM

- [ ] `/admin/crm` 显示联系人列表

### 2.11 操作日志

- [ ] `/admin/logs` 显示操作日志

---

## 三、已知限制（当前环境）

| 功能 | 状态 | 说明 |
|------|------|------|
| 邮件发送 | Dev Mode | 验证码打印到终端 + 存入 DB，不发真实邮件 |
| 支付二维码 | 占位图 | 需要上传真实微信/支付宝二维码图片 |
| 企微二维码 | 占位图 | 需要上传真实企业微信二维码图片 |
| AI 报告生成 | 不可用 | 需要配置 AI_API_KEY |

---

## 四、准备工作

### 创建管理员账号

在数据库中直接创建一个管理员用于测试后台：

```bash
cd "/Users/Zhuanz/Documents/文稿 - Hazel的MacBook Air/🍋lime青柠/品牌手册/测评网站文档/Assessment-V3"
npx tsx -e "
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.resolve('prisma/dev.db'));
const adapter = new PrismaBetterSqlite3({ url: 'file:' + db });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@limeup-happystudy.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Admin created:', admin.username, '/ password: admin123');
  await prisma.\$disconnect();
}
main();
"
```
