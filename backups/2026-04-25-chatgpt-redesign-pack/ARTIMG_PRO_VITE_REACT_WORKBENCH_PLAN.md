# artImg Pro Vite React Workbench Plan

创建时间：2026-04-27
修订时间：2026-05-11

这份文档是 artImg Pro 当前产品和技术基线。项目已确定使用 `Vite + React + TypeScript + Express SSR`，不要再按 Next.js 项目来判断结构、路由、API 或渲染边界。

## 核心目标

新版 artImg Pro 要做成一个极简的 AI 图片生成工作台：

- 首页就是工作台，不做传统营销首页
- 第一屏让用户直接输入提示词并生成图片
- 页面保持简约、轻量、不卡顿
- 首页内容能被搜索引擎收录
- 不依赖 `assistant-ui` 这类通用聊天框架
- 复杂交互优先用轻量本地组件，确有必要时再引入成熟底层库

## 当前技术栈

- 构建与开发：`Vite`
- UI 框架：`React 19`
- 语言：`TypeScript`
- SSR：自定义 `Express` 服务，入口为 `server.js`
- 客户端入口：`src/entry-client.tsx`
- 服务端渲染入口：`src/entry-server.tsx`
- 应用入口：`src/App.tsx`
- 样式：`Tailwind CSS 3.4` + `src/index.css`
- 图标：`lucide-react`
- 状态：`zustand`
- API：`src/lib/backendApi.ts` 等 typed plain functions
- 测试：`Vitest`
- 构建输出：`dist/client` 和 `dist/server`

当前不使用：

- `Next.js`
- `App Router`
- `Server Components`
- `Route Handlers`
- `next/image`
- `next.config.*`
- `app/page.tsx` / `pages/`

## 依赖策略

默认保持现有依赖精简。不要因为旧方案或通用模板主动添加：

- `react-hook-form`
- `zod`
- `@tanstack/react-query`
- `Radix UI`
- `Biome`
- `Playwright`

这些库只有在当前任务明确需要、能减少真实风险，并且用户接受新增依赖时才加入。

继续避免：

- `assistant-ui`
- `Ant Design`
- `MUI`
- `Mantine`
- `HeroUI`
- 大型动画库
- 通用组件套件
- 大型日期/工具库

## 页面结构

当前项目结构以 Vite SSR 为准：

```text
index.html
server.js
vite.config.ts
src/entry-client.tsx
src/entry-server.tsx
src/App.tsx
src/components/
src/hooks/
src/lib/
src/store.ts
```

重要约定：

- `index.html` 承载基础 SEO metadata、结构化数据、manifest 和客户端入口脚本。
- `server.js` 在开发环境接入 Vite middleware，在生产环境读取 `dist/client/index.html` 并加载 `dist/server/entry-server.js`。
- `src/entry-server.tsx` 使用 React SSR 输出页面 HTML。
- `src/entry-client.tsx` 负责 hydrate 或 client render。
- `src/App.tsx` 负责当前路径下的应用 shell 和页面状态。
- 不新增 Next.js 文件约定或目录。

## UI 组件策略

不是全部手写，也不是整站套大 UI 框架。

优先维护本地轻量业务组件：

- 输入框和底部 prompt composer
- 参数选择控件
- 图片结果卡片
- 任务网格
- 顶部栏
- 登录、设置、帮助、充值等现有弹层
- 空状态、错误状态、Toast

只有当交互本身需要成熟焦点管理、键盘支持或无障碍行为时，才考虑按需引入底层 primitive，并先评估 bundle 影响。

## SEO 方案

首页仍然是工作台，但不能是空壳 SPA。

SEO 内容来自两层：

- `index.html`：`title`、`description`、canonical、Open Graph、Twitter Card、结构化数据、`noscript` 内容。
- SSR React 组件：真实 `h1`、简短介绍、公开示例、常见用途、FAQ、图片 alt 文案。

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
- canonical URL 校准
- Open Graph 图片
- 图片 alt
- 结构化数据
- Google Search Console / Bing Webmaster / 百度资源平台提交

## 性能策略

目标：

```text
首页首屏 JS：尽量控制在 100-150KB gzip 以内
首页渲染：Vite SSR 输出基础 HTML
交互：只让必要的工作台控件承担高频状态更新
图片：使用 CDN 变体、明确尺寸、稳定比例和 lazy loading
```

实现原则：

- Prompt 输入路径不能被重计算、重渲染或大型依赖阻塞。
- 复杂弹层、图片编辑、裁剪、上传预处理、分析脚本等非首屏能力按需加载。
- 图片结果区使用懒加载。
- 首页第一张关键图片可以优先加载，其余延后。
- 避免一次性引入大 UI 框架。
- 避免把编辑器、上传裁剪器等重功能放进首屏 bundle。
- 如果新增依赖导致 Vite 输出明显变大，先解释原因再继续。

## 图片生成任务流程

推荐流程：

```text
用户输入提示词
  -> 前端校验参数
  -> src/lib/backendApi.ts 发起 typed backend request
  -> 后端创建上游任务
  -> 返回 taskId / queryPath / streamPath
  -> 前端轮询或订阅任务状态
  -> 成功后展示图片
  -> 后端保存图片和任务记录
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

组件和逻辑测试重点：

- 参数切换是否正确
- 表单校验是否正确
- 输入提示词后按钮状态是否正确
- API loading / success / error 三种状态是否正确
- 任务失败时是否显示重试
- 移动端参数面板是否能打开和关闭

当前脚本：

```json
{
  "dev": "node server.js",
  "build": "tsc -b && npm run build:client && npm run build:server",
  "build:client": "vite build --outDir dist/client --ssrManifest",
  "build:server": "vite build --ssr src/entry-server.tsx --outDir dist/server",
  "preview": "node server.js --prod",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Substantial code changes should run:

```text
npm run test
npm run build
```

不要声称已经运行 `npm run lint`，除非后续真的加入 lint 脚本。

## 部署建议

轻量起步：

- 前端/SSR：Node + Express 服务，运行 `server.js --prod`
- 静态资源：`dist/client/assets` 走长缓存
- 图片存储：Cloudflare R2、S3 或同类对象存储
- 数据库：Postgres / Supabase 或现有后端服务

可选部署目标：

- 自建 VPS + Node 进程管理
- Docker + Nginx
- 支持 Node server 的平台
- 静态托管只适合关闭 SSR 或另行生成静态 HTML 的场景

如果后续图片任务多，建议把生成任务 API、轮询、回调处理拆成独立服务，不要全部压在首页应用里。

## 开发顺序

1. 保持当前 Vite React SSR 项目结构稳定
2. 校准 SEO HTML 和 SSR 可见内容
3. 维护工作台基础布局
4. 完善参数面板和输入框
5. 稳定 mock 或真实图片任务流程
6. 补足 Vitest 覆盖
7. 接入真实图片生成 API
8. 接入对象存储和数据库
9. 补 sitemap、robots、结构化数据和站长平台提交
10. 视需要再补浏览器 E2E

## 当前结论

正式版基线为：

```text
Vite + React + TypeScript + Express SSR + Tailwind CSS + Zustand + Vitest
```

这套方案与当前代码一致，适合保持 AI 图片生成工作台轻量、直接、可控。后续读取代码、做方案判断或新增功能时，都应以这套栈为准。
