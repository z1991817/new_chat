# artImg Pro 新版技术方案

创建时间：2026-04-27

这份文档用于替代 `artimg-pro-demo` 的临时验证项目。后续如果删除 demo 项目，可以按这里的方案重新创建正式项目。

## 核心目标

新版 artImg Pro 要做成一个极简的 AI 图片生成工作台：

- 首页就是工作台，不做传统营销首页
- 第一屏让用户直接输入提示词并生成图片
- 页面保持简约、轻量、不卡顿
- 首页内容能被搜索引擎收录
- 不依赖 `assistant-ui` 这类通用聊天框架
- 复杂交互使用成熟底层库，降低自写组件 bug 风险

## 推荐技术栈

首选方案：

- 框架：`Next.js App Router`
- 语言：`TypeScript`
- 样式：`Tailwind CSS v4`
- 底层 UI：`Radix UI Primitives` 按需安装
- 图标：`lucide-react`
- 表单：`react-hook-form + zod`
- 请求与轮询：`@tanstack/react-query`
- 轻量状态：`zustand`
- 单元/组件测试：`Vitest + React Testing Library`
- 端到端测试：`Playwright`
- 代码检查与格式化：`Biome`
- 图片存储：`Cloudflare R2`、`S3` 或同类对象存储
- 数据库：`Postgres` / `Supabase`

不推荐继续使用：

- `assistant-ui`
  适合快速做聊天 demo，但对 AI 图片工作台来说抽象偏重，界面和交互细节不好完全贴合产品。
- `Ant Design` / `MUI` / `Mantine` / `HeroUI`
  功能完整，但对当前目标偏重，视觉定制和包体控制不如 headless 方案灵活。

## UI 组件策略

不是全部手写，也不是整站套大 UI 框架。

自己写轻量业务组件：

- `Button`
- `Input`
- `Textarea`
- 参数胶囊
- 图片结果卡片
- 历史侧边栏
- 顶部栏
- 底部输入框
- 案例展示区

复杂交互使用 `Radix UI`：

- `Dialog`
- `Popover`
- `Tooltip`
- `DropdownMenu`
- `Select`
- `Switch`
- `Slider`
- `Tabs`

这样可以保证视觉足够自由，同时把键盘交互、焦点管理、无障碍这些容易出 bug 的部分交给成熟库。

## 页面结构

推荐路由：

```text
app/page.tsx
  首页，静态预渲染，首屏就是 AI 图片工作台

app/api/generate/route.ts
  创建图片生成任务

app/api/tasks/[id]/route.ts
  查询图片任务状态

app/api/uploads/route.ts
  上传参考图

app/templates/page.tsx
  模板页，可后续补 SEO 流量

app/blog/page.tsx
  教程和内容页，可后续补 SEO 流量
```

推荐组件目录：

```text
components/workbench/
  WorkbenchShell.tsx
  HistorySidebar.tsx
  PromptComposer.tsx
  ParameterBar.tsx
  MobileParameterSheet.tsx
  ResultGrid.tsx
  ResultCard.tsx
  EmptyState.tsx
  TaskStatus.tsx

components/seo/
  HomeSeoContent.tsx
  FaqSection.tsx
  ShowcaseSection.tsx

lib/
  api.ts
  image-task.ts
  prompt-schema.ts
  constants.ts
```

## SEO 方案

首页仍然是工作台，但不能是空壳 SPA。

`app/page.tsx` 应该输出真实 HTML：

- `title`
- `description`
- `h1`
- 一句简短说明
- 公开案例图
- 常见用途
- FAQ

用户看到的是极简工作台，搜索引擎也能直接看到页面主题。

建议首页内容：

```text
H1：AI 图片生成器
说明：输入文字提示词，快速生成海报、封面、电商图和创意视觉。
用途：电商主图、小红书封面、头像写真、室内设计、产品海报
FAQ：是否需要提示词经验、是否可以继续修改、图片如何保存
```

后续再补：

- `sitemap.xml`
- `robots.txt`
- canonical URL
- Open Graph
- 图片 alt
- 结构化数据
- Google Search Console / Bing Webmaster / 百度资源平台提交

## 性能策略

目标：

```text
首页首屏 JS：尽量控制在 100-150KB gzip 以内
首页渲染：静态预渲染优先
交互 hydration：只放在必要组件里
图片：使用 next/image 或 CDN 图片变体
```

实现原则：

- 首页主体由服务端组件输出
- 只有输入框、参数面板、任务结果区使用客户端组件
- 不把整个页面都写成 `"use client"`
- 复杂弹层组件按需加载
- 图片结果区使用懒加载
- 首页第一张关键图片使用高优先级加载
- 避免一次性引入大 UI 框架
- 避免把编辑器、上传裁剪器等重功能放进首屏 bundle

## 图片生成任务流程

推荐流程：

```text
用户输入提示词
  -> 前端校验参数
  -> POST /api/generate
  -> 后端创建上游任务
  -> 返回 taskId
  -> 前端轮询 /api/tasks/[id]
  -> 成功后展示图片
  -> 图片保存到对象存储
  -> 任务记录写入数据库
```

前端状态：

- `idle`
- `submitting`
- `queued`
- `generating`
- `success`
- `failed`

失败时必须有明确提示和重试按钮。

## 测试策略

组件测试重点：

- 参数切换是否正确
- 表单校验是否正确
- 输入提示词后按钮状态是否正确
- API loading / success / error 三种状态是否正确
- 任务失败时是否显示重试
- 移动端参数面板是否能打开和关闭

E2E 测试重点：

- 首页可以正常打开
- 首页有正确 `h1` 和 SEO 文案
- 输入提示词后可以创建任务
- 任务成功后显示图片结果
- API 失败时显示错误提示
- 移动端布局不溢出
- 底部输入框不遮挡关键内容

建议脚本：

```json
{
  "test": "vitest",
  "test:e2e": "playwright test",
  "lint": "biome check .",
  "format": "biome check --write .",
  "build": "next build"
}
```

正式项目要配置 `biome.json`，排除：

```text
.next
node_modules
dist
coverage
```

## 部署建议

轻量起步：

- 前端和 Next API：`Vercel`
- 图片存储：`Cloudflare R2`
- 数据库：`Supabase Postgres`

自建 VPS 起步：

- 最低：`1 核 1GB`
- 更稳：`1 核 2GB`
- Node 服务建议至少预留 `256MB-512MB`

如果后续图片任务多，建议把生成任务 API、轮询、回调处理拆成独立服务，不要全部压在首页应用里。

## 开发顺序

1. 创建正式 Next.js 项目
2. 配置 Tailwind、Biome、测试框架
3. 搭首页静态 SEO 外壳
4. 做工作台基础布局
5. 做参数面板和输入框
6. 接入 mock 图片任务流程
7. 加组件测试和 E2E 测试
8. 接入真实图片生成 API
9. 接入对象存储和数据库
10. 补 sitemap、robots、结构化数据和站长平台提交

## 当前结论

正式版推荐使用：

```text
Next.js App Router + Tailwind CSS + Radix UI Primitives + TanStack Query + Zustand
```

这套方案比 `assistant-ui` 更贴合 AI 图片生成产品，比重型 UI 框架更轻，也比完全手写组件更稳。

