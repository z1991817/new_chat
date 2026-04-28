# artImg Pro 改版备份包

创建时间：2026-04-25

这个备份包用于保存今天确认的改版方向，方便明天直接继续开工。重点目标是把当前文生图站点改成更适合小白的 `ChatGPT` 式极简创作体验，同时保留图片参数设置和任务结果展示。

推荐效果图预览：

![v2 设计图](./assets/artimg-pro-ui-chatgpt-minimal-v2.png)


## 文件内容

- `assets/artimg-pro-ui-chatgpt-minimal-v2.png`
  当前推荐方向。白灰黑极简风，桌面端和移动端统一，适合小白直接上手。

## 当前结论

当前站点更像营销型 `AI SaaS` 首页，信息较多，第一眼不够聚焦。对于文生图工具来说，更适合改成“先输入，再出图，再继续修改”的轻量创作流程。

即使上游接口是单次任务式调用，也可以做成 `ChatGPT` 风格。连续对话不一定要求上游原生保存会话，前端和你自己的服务端可以自己保存：

- 用户输入内容
- 每次生成时的参数
- 上一轮结果图
- 上游返回的 `taskId`
- 生成成功后的图片地址

这样就能实现“继续改第二张”“背景改白色”“做成小红书封面”这种体验。

## 推荐技术栈

首选方案：

- 前端：`React + Vite + TypeScript`
- UI：`HeroUI + Tailwind CSS v4`
- 图标：`lucide-react`
- 状态管理：`Zustand`
- 请求与缓存：`@tanstack/react-query`
- 表单与校验：`react-hook-form + zod`
- 图片任务轮询：前端轮询或服务端转发轮询
- 部署方式：前端静态部署，后端单独提供接口层，统一对接 `Kie.ai`

推荐这个组合的原因：

- 比 `Next SSR` 更轻，服务器压力更小
- 和现有组件体系更接近，设计系统更容易统一
- 很适合“对话式生成 + 参数面板 + 历史记录”的产品形态
- 桌面端和移动端可以共用一套交互模型

备选方案：

- 如果保留现有项目结构，可以继续用 `Next.js`，但创作页尽量按客户端应用来做，不依赖重型服务端渲染。

## 推荐界面结构

- 左侧：历史会话 / 最近创作，可折叠
- 中间：对话流，展示用户输入和生成结果
- 底部：固定输入框
- 输入框下方：轻量参数胶囊
- 高级参数：抽屉或弹层
- 移动端：历史用抽屉，参数用底部弹层

默认只露出这几个参数：

- 图片比例：`1:1`、`3:4`、`4:3`、`9:16`、`16:9`
- 清晰度：`1K`、`2K`、`4K`
- 风格：`写实`、`电商`、`动漫`、`电影感`、`极简`
- 数量：`1`、`2`、`4`

高级参数可以后置：

- 模型
- 提示词增强
- 负面提示词
- 随机种子
- 参考图
- 风格强度

## 推荐参考项目

适合直接借鉴交互结构：

- `assistant-ui`
  https://github.com/assistant-ui/assistant-ui
- `NextChat`
  https://github.com/ChatGPTNextWeb/NextChat
- `LobeChat`
  https://github.com/lobehub/lobe-chat
- `Ant Design X`
  https://ant-design-x.antgroup.com/components/overview

适合借鉴图片产品的信息架构和参数组织：

- `Koubou`
  https://github.com/za01br/koubou
- `InvokeAI`
  https://github.com/invoke-ai/InvokeAI
- `Jaaz`
  https://github.com/11cafe/jaaz
- `ViewComfy`
  https://github.com/ViewComfy/ViewComfy
- `Fooocus`
  https://github.com/lllyasviel/Fooocus

## 推荐设计方向

主推 `v2`：

- 白底、浅灰边界、黑色主按钮
- 风格接近 `ChatGPT Web`
- 默认界面足够安静，不压用户
- 更适合新手直接输入一句话开始生成
- 移动端一致性更好



## 明天开工顺序


## 备注

当前建议不追求把站点做成纯聊天机器人，而是做成“`ChatGPT` 式图片生成工作台”。核心是让小白先敢用、能出图、能继续改，而不是先看一堆概念和参数。
现有的框架，我觉得assistant-ui还不错
