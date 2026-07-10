# PROJECT_RULES.md

Version: 0.1 (Initial)

---

## 开发规范

- 所有功能实现必须严格按照 PRD.md
- 禁止自行发明业务逻辑
- 禁止重命名业务概念
- 禁止改写文案
- 文档与代码冲突时，文档优先
- 架构变更必须提前沟通确认

## 代码风格

- 简洁、克制、Apple 风格
- TypeScript 严格模式
- 组件化、可复用
- 有意义的命名，避免缩写

## 提交规范

- 每个功能模块单独提交
- commit message 使用 conventional commits 格式
- 中文 commit message

## 目录约定

- `src/app/` — Next.js App Router 页面和 API routes
- `src/components/` — React 组件
- `src/lib/` — 工具函数、服务端逻辑
- `src/generated/prisma/` — Prisma 生成文件（勿手动修改）
- `prisma/` — Schema 和 migrations
- `public/` — 静态资源
- `assets/` — 品牌素材
- `emails/` — 邮件模板
- `prompts/` — AI Prompt 模板

## 文档优先级

1. PRD.md（产品需求）
2. DESIGN_SYSTEM.md（设计规范）
3. PROJECT_RULES.md（开发规范，本文件）
4. README.md（项目概览）
