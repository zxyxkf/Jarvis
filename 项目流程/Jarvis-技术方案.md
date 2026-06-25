# Jarvis‌ · 企业级 AI 智能效率助手

## 最终技术方案与实施规划

> **版本**: v1.0  
> **日期**: 2025-06-25  
> **目标岗位**: AI 应用全栈工程师  
> **时间预算**: 8-12 周  
> **展现形式**: Web + 桌面端(Tauri) + 移动端(PWA) · 三端一套代码

---

## 目录

1. [项目定位与愿景](#1-项目定位与愿景)
2. [产品功能规划](#2-产品功能规划)
3. [技术架构总览](#3-技术架构总览)
4. [前端交互层](#4-前端交互层)
5. [后端服务层](#5-后端服务层)
6. [AI 核心引擎层](#6-ai-核心引擎层)
7. [数据存储层](#7-数据存储层)
8. [跨平台策略](#8-跨平台策略)
9. [界面与交互设计规范](#9-界面与交互设计规范)
10. [工程化与 DevOps](#10-工程化与-devops)
11. [安全合规](#11-安全合规)
12. [开发路线图](#12-开发路线图)
13. [面试竞争优势分析](#13-面试竞争优势分析)
14. [风险与对策](#14-风险与对策)

---

## 1. 项目定位与愿景

### 1.1 一句话定位

> **Jarvis‌ 是一个三端覆盖的轻量级企业 AI 办公助手，以知识库 RAG + 智能文档处理 + Agent 任务编排为核心，帮助知识工作者用自然语言高效完成日常工作。**

### 1.2 核心差异化

| 维度 | 市面上大部分 AI 工具 | Jarvis‌ |
|------|---------------------|---------|
| 部署方式 | 纯云端，数据上传第三方 | **支持私有化部署**，数据不出域 |
| 平台覆盖 | 单一 Web 端 | **Web + 桌面(Tauri) + 移动(PWA)** 三端统一 |
| 包体积 | Electron 打包 150MB+ | **Tauri 打包 ~8MB**，极致轻量 |
| 知识库 | 简单向量检索 | **混合检索 + Rerank + 查询改写** 完整 RAG 链路 |
| 模型依赖 | 绑定单一厂商 | **多模型网关**，支持通义千问/DeepSeek/OpenAI 兼容接口 |
| Agent | 无或简单脚本 | **LangGraph 状态图编排**，支持多步推理与工具调用 |

### 1.3 目标用户画像

- **主要用户**: 知识工作者（产品经理、工程师、研究员、管理者）
- **使用场景**: 文档快速检索问答、长文档摘要分析、日程与任务智能管理、跨文档知识关联
- **部署模式**: 个人本地使用 / 小团队私有部署（10-30 人）

---

## 2. 产品功能规划

### 2.1 功能矩阵

| 优先级 | 模块 | 核心功能 | 技术亮点 | 工期 |
|--------|------|---------|---------|------|
| **P0** | 知识库问答 | 文档上传 → 智能解析 → 向量化 → 多轮对话检索 | RAG 全链路、混合检索、Rerank | 3 周 |
| **P0** | 智能文档处理 | 文档摘要、关键信息提取、多文档对比、翻译 | 多模型协作、长文档分治策略 | 2 周 |
| **P1** | Agent 任务编排 | 多步推理任务、工具调用链、自定义工作流 | LangGraph、断点续跑、人工介入 | 3 周 |
| **P1** | 日程/任务助手 | 自然语言创建日程、智能提醒、日报周报生成 | Function Calling、日历集成 | 2 周 |
| **P2** | 邮件辅助 | 邮件摘要、草稿生成、优先级排序 | 邮件解析、模板管理 | 规划中 |
| **P2** | 数据查询分析 | 自然语言查询数据库、图表生成 | Text-to-SQL、可视化 | 规划中 |

### 2.2 P0 功能详细说明

#### 2.2.1 知识库问答（核心 RAG 链路）

```
用户上传文档 → 文档解析 (PDF/Word/Markdown/TXT)
    → 智能分块 (语义分块 + 递归字符分块, 10-20% 重叠)
    → Embedding 向量化 (bge-large-zh-v1.5)
    → 存入向量数据库 (pgvector)

用户提问 → 查询改写 (LLM 优化检索词)
    → 混合检索 (向量语义 + BM25 关键词, RRF 融合)
    → Rerank 精排 (bge-reranker-v2-m3)
    → Top-K 上下文注入 Prompt
    → 流式生成回答 (SSE, Markdown 渲染)
    → 对话历史智能压缩 (Token 管理)
```

#### 2.2.2 智能文档处理

```
文档上传 → 自动识别文档类型
    → 表格提取 (PDF 中的表格 → Markdown 表格)
    → 图片 OCR (多模态模型处理)
    → 长文档分治 (超过 token 限制时分段处理, 递归总结)
    → 结构化输出 (JSON Schema 约束)
```

### 2.3 用户核心流程

```
┌─────────────────────────────────────────────────────────┐
│                    欢迎页 / 对话入口                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💬 输入你的问题，或上传文档开始...              │   │
│  │  📎 上传  📁 知识库  📅 日程  ⚡ Agent          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📄 最近文档                                     │   │
│  │  ├─ 产品需求文档v3.pdf      昨日上传             │   │
│  │  ├─ 技术方案评审纪要.docx   2小时前              │   │
│  │  └─ Q3数据报告.xlsx         6月20日              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  💡 建议                                         │   │
│  │  "总结产品需求文档v3的核心功能点"                │   │
│  │  "对比技术方案评审纪要和Q3报告中的时间节点"       │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 技术架构总览

### 3.1 六层架构全景图

```
┌──────────────────────────────────────────────────────────────┐
│                      前端交互层                                │
│  Vue 3 + TS  │  Pinia  │  Ant Design Vue  │  SSE 流式渲染    │
│  PWA (Workbox) │  Tauri v2 (Rust)  │  虚拟列表              │
├──────────────────────────────────────────────────────────────┤
│                      网关 & 接口层                             │
│  RESTful API  │  SSE  │  WebSocket  │  统一响应体            │
│  全局异常拦截  │  请求校验 (Zod)  │  Rate Limiting           │
├──────────────────────────────────────────────────────────────┤
│                      后端服务层                                │
│  NestJS + TS  │  Prisma ORM  │  BullMQ  │  事件总线          │
│  用户服务  │  文档服务  │  对话服务  │  Agent 服务           │
├──────────────────────────────────────────────────────────────┤
│                      AI 核心引擎层                             │
│  LangChain.js  │  多模型网关  │  RAG 管线  │  LangGraph      │
│  Embedding (bge)  │  Reranker  │  混合检索  │  语义缓存       │
├──────────────────────────────────────────────────────────────┤
│                      数据存储层                                │
│  PostgreSQL 16 (pgvector)  │  Redis 7  │  MinIO (文件)       │
├──────────────────────────────────────────────────────────────┤
│                    工程化 & 部署层                              │
│  Docker  │  GitHub Actions  │  Prometheus + Grafana          │
│  pnpm Monorepo  │  Turborepo  │  Tauri 打包                  │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Monorepo 项目结构

```
jarvis/
├── package.json                    # root workspace
├── pnpm-workspace.yaml
├── turbo.json                      # Turborepo 任务编排
├── docker-compose.yml              # 全服务编排
├── .env.example
│
├── apps/
│   ├── web/                        # Web 应用 (PWA)
│   │   ├── src/
│   │   │   ├── App.vue
│   │   │   ├── main.ts
│   │   │   ├── pages/              # 页面
│   │   │   ├── components/         # UI 组件
│   │   │   ├── composables/        # 组合式函数
│   │   │   ├── stores/             # Pinia stores
│   │   │   ├── router/             # 路由
│   │   │   ├── utils/
│   │   │   └── styles/
│   │   ├── public/
│   │   │   ├── manifest.json       # PWA manifest
│   │   │   └── sw.js               # Service Worker
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── desktop/                    # Tauri 桌面端
│   │   ├── src-tauri/              # Rust 后端 (Tauri)
│   │   │   ├── src/
│   │   │   │   ├── main.rs         # 系统托盘、全局快捷键
│   │   │   │   ├── commands.rs     # 文件系统、系统通知
│   │   │   │   └── tray.rs         # 系统托盘逻辑
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── src/                    # Vue 应用入口 (复用 web/)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                     # NestJS 后端
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/             # 通用 (拦截器、过滤器、守卫、装饰器)
│       │   ├── modules/
│       │   │   ├── auth/           # 认证授权
│       │   │   ├── user/           # 用户管理
│       │   │   ├── knowledge/      # 知识库
│       │   │   ├── document/       # 文档处理
│       │   │   ├── chat/           # 对话服务
│       │   │   ├── agent/          # Agent 编排
│       │   │   └── schedule/       # 日程管理
│       │   ├── ai/                 # AI 引擎核心
│       │   │   ├── gateway/        # 多模型网关
│       │   │   ├── rag/            # RAG 管线
│       │   │   ├── agent/          # LangGraph 编排
│       │   │   └── cache/          # 语义缓存
│       │   └── infrastructure/     # 基础设施
│       │       ├── database/       # Prisma
│       │       ├── cache/          # Redis
│       │       ├── queue/          # BullMQ
│       │       └── storage/        # MinIO
│       ├── prisma/
│       │   └── schema.prisma
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                     # 共享类型、常量、工具
│   │   ├── src/
│   │   │   ├── types/              # 全局 TypeScript 类型定义
│   │   │   ├── constants/          # 共享常量
│   │   │   ├── utils/              # 通用工具函数
│   │   │   └── validation/         # Zod schemas
│   │   └── package.json
│   │
│   ├── ui/                         # 共享 UI 组件库
│   │   ├── src/
│   │   │   ├── ChatBubble/         # 对话气泡
│   │   │   ├── MarkdownRenderer/   # Markdown 渲染
│   │   │   ├── StreamingText/      # 流式文本动画
│   │   │   ├── FileUpload/         # 文件上传
│   │   │   ├── ModelSelector/      # 模型选择器
│   │   │   └── StyleProvider/      # 主题/风格配置
│   │   └── package.json
│   │
│   └── ai-core/                    # 共享 AI 核心逻辑
│       ├── src/
│       │   ├── tokenizer.ts        # Token 计数器
│       │   ├── prompt-templates.ts # Prompt 模板管理
│       │   └── cost-calculator.ts  # 成本计算
│       └── package.json
│
└── docs/
    ├── architecture.md
    ├── api-spec.md
    └── ui-design.md
```

### 3.3 技术栈选型汇总

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| **前端框架** | Vue 3 + Composition API | 3.5+ | 生态成熟，TS支持好，与Tauri/PWA兼容最佳 |
| **类型系统** | TypeScript | 5.5+ | 全栈TS，类型安全 |
| **构建工具** | Vite | 6.x | 极速HMR，Tauri官方推荐 |
| **状态管理** | Pinia | 2.x | Vue官方，TS友好 |
| **UI组件库** | Ant Design Vue | 4.x | 企业级，组件完整，可自定义主题 |
| **桌面框架** | Tauri | v2 | Rust后端，打包体积~8MB，系统级能力 |
| **移动方案** | PWA (Vite PWA) | - | 零额外代码，可安装，离线可用 |
| **后端框架** | NestJS | 10.x | Node.js企业级标准，依赖注入，模块化 |
| **ORM** | Prisma | 5.x | TS类型安全，迁移管理，pgvector支持 |
| **数据库** | PostgreSQL + pgvector | 16 | 关系型+向量混合存储，一套搞定 |
| **缓存** | Redis | 7.x | 会话、限流、语义缓存、队列 |
| **任务队列** | BullMQ | 5.x | 文档解析、向量化异步处理 |
| **对象存储** | MinIO | 最新 | S3兼容，私有化部署 |
| **AI框架** | LangChain.js | 0.3+ | RAG链路标准实现 |
| **Agent框架** | LangGraph | 0.2+ | 状态图编排，多步推理 |
| **Embedding** | bge-large-zh-v1.5 | - | 中文语义检索开源最佳 |
| **Reranker** | bge-reranker-v2-m3 | - | 多语言精排，召回率提升30%+ |
| **模型网关** | 自研适配层 | - | 支持多厂商，负载均衡，故障转移 |
| **监控** | Prometheus + Grafana | - | 全链路可观测 |
| **容器化** | Docker + Compose | - | 一键部署 |
| **CI/CD** | GitHub Actions | - | 自动化构建测试部署 |
| **包管理** | pnpm + Turborepo | - | Monorepo管理，增量构建 |

---

## 4. 前端交互层

### 4.1 组件架构

```
App.vue
├── StyleProvider.vue              # 全局主题/风格配置
├── AppLayout.vue                  # ChatGPT 风格三栏布局
│   ├── Sidebar.vue                # 左侧对话历史/导航栏
│   │   ├── NewChatButton.vue      # 新建对话
│   │   ├── ConversationList.vue   # 对话历史列表
│   │   │   └── <VirtualList>      # 虚拟列表优化
│   │   ├── KnowledgeBaseNav.vue   # 知识库列表
│   │   └── UserMenu.vue           # 用户头像/设置
│   │
│   ├── MainContent.vue            # 主对话区域
│   │   ├── WelcomeScreen.vue      # 欢迎页 (无对话时)
│   │   ├── ChatArea.vue           # 对话区域
│   │   │   ├── MessageList.vue    # 消息列表
│   │   │   │   ├── MessageBubble.vue     # 对话气泡
│   │   │   │   │   ├── UserMessage.vue   # 用户消息
│   │   │   │   │   └── AIMessage.vue     # AI 回复
│   │   │   │   │       ├── MarkdownRenderer.vue  # Markdown/代码渲染
│   │   │   │   │       ├── StreamingText.vue     # 流式打字机效果
│   │   │   │   │       └── SourceCitation.vue    # 来源引用
│   │   │   │   └── ScrollAnchor.vue     # 自动滚动锚点
│   │   │   └── ChatInput.vue      # 输入区
│   │   │       ├── TextInput.vue  # 文本输入
│   │   │       ├── FileUploadButton.vue  # 文件上传
│   │   │       ├── ModelSelector.vue     # 模型切换
│   │   │       └── SendButton.vue # 发送按钮
│   │   └── EmptyState.vue         # 无对话时的引导
│   │
│   └── (可选) DetailPanel.vue     # 右侧详情面板
│       ├── DocumentPreview.vue    # 文档预览 (知识库查看)
│       └── SourceDetail.vue       # RAG 引用原文查看
│
├── SettingsModal.vue              # 设置弹窗
│   ├── StyleSettings.vue          # 风格自定义 (颜色/字体/圆角/间距)
│   ├── ModelSettings.vue          # 模型配置 (API Key、模型选择)
│   ├── KnowledgeSettings.vue      # 知识库管理
│   └── AccountSettings.vue        # 账户设置
│
└── NotificationCenter.vue         # 通知中心
```

### 4.2 核心交互特性

#### 4.2.1 SSE 流式对话

```typescript
// composables/useStreamChat.ts
export function useStreamChat() {
  const messages = ref<Message[]>([])
  const streamingContent = ref('')
  const isStreaming = ref(false)
  const abortController = ref<AbortController>()

  async function sendMessage(content: string, options: ChatOptions) {
    const controller = new AbortController()
    abortController.value = controller

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, ...options }),
      signal: controller.signal,
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    isStreaming.value = true
    streamingContent.value = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      // 解析 SSE 格式: "data: {...}\n\n"
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'token') {
            streamingContent.value += data.content
          } else if (data.type === 'citation') {
            // 处理来源引用
          }
        }
      }
    }
    isStreaming.value = false
  }

  function abortStreaming() {
    abortController.value?.abort()
    isStreaming.value = false
  }

  return { messages, streamingContent, isStreaming, sendMessage, abortStreaming }
}
```

#### 4.2.2 多平台适配策略

```typescript
// utils/platform.ts
export const platform = {
  isDesktop: () => '__TAURI_INTERNALS__' in window,
  isPWA: () => window.matchMedia('(display-mode: standalone)').matches,
  isMobile: () => window.innerWidth < 768,

  // 桌面端专属能力
  async showSystemNotification(title: string, body: string) {
    if (platform.isDesktop()) {
      const { sendNotification } = await import('@tauri-apps/plugin-notification')
      await sendNotification({ title, body })
    } else if ('Notification' in window) {
      new Notification(title, { body })
    }
  },

  // 桌面端全局快捷键
  async registerGlobalShortcut() {
    if (platform.isDesktop()) {
      const { register } = await import('@tauri-apps/plugin-global-shortcut')
      await register('Alt+Space', () => {
        // 唤起 Jarvis 窗口
      })
    }
  }
}
```

### 4.3 前端性能优化策略

| 优化项 | 方案 | 预期效果 |
|--------|------|---------|
| 对话列表 | @tanstack/vue-virtual 虚拟滚动 | 万条消息不卡顿 |
| Markdown 渲染 | 异步组件 + Suspense 懒加载代码高亮 | 首屏加载减少 40% |
| 大文件上传 | 分片上传 + 断点续传 + 进度条 | 支持 GB 级文档 |
| 图片懒加载 | IntersectionObserver | 知识库缩略图按需加载 |
| Worker 卸载 | Web Worker 跑 Token 计算/文本预处理 | 主线程保持 60fps |
| PWA 缓存 | Workbox (Stale-While-Revalidate) | 二次访问秒开，离线可用 |

---

## 5. 后端服务层

### 5.1 NestJS 模块架构

```
AppModule
├── CommonModule              # 全局: 拦截器、过滤器、守卫、管道
│   ├── ResponseInterceptor   # 统一响应体 { code, data, message }
│   ├── HttpExceptionFilter   # 全局异常捕获
│   ├── JwtAuthGuard          # JWT 认证守卫
│   └── ZodValidationPipe     # 参数校验
│
├── AuthModule                # 认证授权
│   ├── AuthController        # POST /auth/login, /auth/refresh, /auth/logout
│   ├── AuthService           # JWT + Refresh Token 双令牌
│   └── strategies/
│       ├── jwt.strategy.ts
│       └── refresh.strategy.ts
│
├── UserModule                # 用户管理
│   ├── UserController        # CRUD
│   └── UserService
│
├── KnowledgeModule           # 知识库
│   ├── KnowledgeController   # 知识库 CRUD、文档上传
│   ├── KnowledgeService      # 知识库业务逻辑
│   ├── DocumentParser        # 文档解析 (PDF/Word/Markdown/TXT)
│   ├── ChunkingService       # 智能分块策略
│   ├── EmbeddingService      # 向量化 (调用 Embedding 模型)
│   └── SearchService         # 混合检索
│
├── ChatModule                # 对话服务
│   ├── ChatController        # SSE 流式对话、对话历史
│   ├── ChatService           # 对话编排
│   ├── ContextManager        # Token 计数、历史压缩、滑动窗口
│   └── PromptBuilder         # Prompt 模板构建
│
├── AgentModule               # Agent 编排
│   ├── AgentController       # Agent 创建、执行、状态查询
│   ├── AgentService          # LangGraph 编排
│   ├── ToolRegistry          # 工具注册中心
│   └── tools/                # 内置工具集
│       ├── DocumentSearch    # 知识库搜索工具
│       ├── CalendarTool      # 日历操作工具
│       ├── WebSearch         # 网页搜索工具
│       └── CodeInterpreter   # 代码执行工具 (沙箱)
│
├── ScheduleModule            # 日程管理
│   ├── ScheduleController    # 日程 CRUD、AI 解析
│   └── ScheduleService
│
└── InfrastructureModule      # 基础设施
    ├── PrismaService         # 数据库服务
    ├── RedisService          # 缓存服务
    ├── QueueService          # 任务队列
    └── StorageService        # 对象存储
```

### 5.2 核心 API 设计

#### 5.2.1 统一响应体

```typescript
// 成功响应
{
  "code": 0,
  "data": { ... },
  "message": "success",
  "timestamp": 1719283200000
}

// 分页响应
{
  "code": 0,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 156,
      "totalPages": 8
    }
  },
  "message": "success"
}

// 错误响应
{
  "code": 40001,
  "data": null,
  "message": "知识库不存在",
  "timestamp": 1719283200000
}
```

#### 5.2.2 核心接口一览

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 登录 | POST | `/api/auth/login` | 返回 access_token + refresh_token |
| 刷新 Token | POST | `/api/auth/refresh` | 刷新 access_token |
| 创建知识库 | POST | `/api/knowledge/bases` | 创建知识库 |
| 上传文档 | POST | `/api/knowledge/bases/:id/documents` | 支持批量、分片上传 |
| 查询文档状态 | GET | `/api/knowledge/documents/:id/status` | 解析进度 |
| 对话 (SSE) | POST | `/api/chat/stream` | 流式对话 |
| 对话历史 | GET | `/api/chat/history?conversation_id=xxx` | 分页查询 |
| 创建 Agent | POST | `/api/agents` | 创建 Agent 任务 |
| Agent 状态 | GET | `/api/agents/:id/status` | 查询执行状态 |
| 日程解析 | POST | `/api/schedule/parse` | AI 解析自然语言日程 |

### 5.3 异步任务架构

```
用户上传文档
  → API 接收文件, 存入 MinIO
  → 创建文档记录 (status: 'pending')
  → 投递 BullMQ 任务到 'document-processing' 队列
  → 立即返回 202 Accepted + 文档 ID

后台 Worker 处理:
  → 下载文件
  → 文档解析 (PDF → 文本 + 表格)
  → 智能分块
  → 批量向量化 (Embedding)
  → 写入 pgvector
  → 更新文档状态 (status: 'completed')
  → 推送通知 (WebSocket/SSE)
```

---

## 6. AI 核心引擎层

### 6.1 多模型统一网关

```typescript
// ai/gateway/model-gateway.ts
interface ModelProvider {
  name: string
  models: ModelConfig[]
  chat(messages: Message[], options: ChatOptions): AsyncGenerator<Token>
}

interface GatewayConfig {
  providers: {
    deepseek: { apiKey: string; baseUrl: string }
    qwen: { apiKey: string; baseUrl: string }
    openai: { apiKey: string; baseUrl: string }
    // 可扩展更多厂商
  }
  routing: {
    default: string                    // 'deepseek-chat'
    fallback: string[]                 // 降级顺序 ['deepseek-chat', 'qwen-turbo']
    lightweight_models: string[]       // 简单任务用小模型
    heavy_models: string[]             // 复杂推理用大模型
  }
}

class ModelGateway {
  // 智能路由: 根据任务复杂度和模型负载选择
  async route(messages: Message[], options?: { taskType?: 'simple' | 'complex' }) {
    // 1. 简单任务 (分类、提取) → 轻量模型 (降成本)
    // 2. 复杂任务 (推理、创作) → 大模型
    // 3. 负载均衡: 检查各厂商可用性
    // 4. 故障转移: 超时/出错自动切换
  }

  // 流式聊天
  async *streamChat(model: string, messages: Message[], options?: ChatOptions) {
    const provider = this.resolveProvider(model)
    for await (const token of provider.chat(messages, options)) {
      yield token
    }
  }
}
```

### 6.2 RAG 管线 (核心壁垒)

```
                      ┌─────────────┐
                      │   用户提问   │
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  查询改写    │  ← LLM 优化检索词
                      │  (Query      │    (多角度改写、实体提取、
                      │   Rewrite)   │     子问题拆分)
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
       │ 向量语义检索 │ │ BM25 关键词│ │  可能的    │
       │ (pgvector)   │ │ 检索      │ │  父子块召回 │
       └──────┬──────┘ └────┬─────┘ └─────┬──────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
                      ┌──────▼──────┐
                      │  RRF 融合   │  ← Reciprocal Rank Fusion
                      │  排序       │     (向量分 + BM25分 加权融合)
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  Rerank     │  ← bge-reranker-v2-m3
                      │  精排       │     二次语义相关性打分
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  Top-K 筛选 │  ← 取前5-10个最相关片段
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  注入 Prompt│  ← 拼接上下文 + 用户问题
                      │  生成回答   │     发送 LLM
                      └─────────────┘
```

### 6.3 智能分块策略

```typescript
// ai/rag/chunking-strategies.ts
interface ChunkingConfig {
  strategy: 'semantic' | 'recursive' | 'hybrid'
  chunkSize: number        // 默认 512 tokens
  overlap: number          // 默认 20% 重叠
  separators: string[]     // 递归分隔符优先级
}

class ChunkingService {
  // 策略1: 语义分块 (适合报告、文章等结构清晰的文档)
  async semanticChunk(doc: Document): Promise<Chunk[]> {
    // 基于段落/章节的自然边界
    // 使用 LLM 判断段落间的语义断点
    // 合并过短段落到上下文
  }

  // 策略2: 递归字符分块 (适合代码、日志等结构不统一的文本)
  recursiveCharacterChunk(text: string, config: ChunkingConfig): Chunk[] {
    // 按优先级尝试分隔符: \n\n → \n → 。→ . → 空格 → 字符
    // 硬上限 512 tokens，软上限尽力接近
  }

  // 策略3: 混合策略 (自动识别文档类型)
  async hybridChunk(doc: Document): Promise<Chunk[]> {
    // 自动识别文档类型 → 选择合适策略
    // PDF 优先语义分块
    // 代码文件用递归字符分块
    // 对话记录按发言轮次分块
  }
}
```

### 6.4 混合检索 (Hybrid Search)

```typescript
// ai/rag/hybrid-search.ts
class HybridSearchService {
  async search(query: string, knowledgeBaseId: string, topK: number = 20) {
    // 并行执行两种检索
    const [vectorResults, bm25Results] = await Promise.all([
      this.vectorSearch(query, knowledgeBaseId, topK * 2),     // pgvector 余弦相似度
      this.bm25Search(query, knowledgeBaseId, topK * 2),       // PostgreSQL 全文检索
    ])

    // RRF (Reciprocal Rank Fusion) 融合
    const fusedMap = new Map<string, number>()
    const k = 60  // RRF 平滑参数

    for (const [rank, doc] of vectorResults.entries()) {
      fusedMap.set(doc.id, (fusedMap.get(doc.id) || 0) + 1 / (k + rank + 1))
    }
    for (const [rank, doc] of bm25Results.entries()) {
      fusedMap.set(doc.id, (fusedMap.get(doc.id) || 0) + 1 / (k + rank + 1))
    }

    // 按融合分数降序排列
    const fused = Array.from(fusedMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)

    // Rerank 精排
    const docs = fused.map(([id]) => vectorResults.find(d => d.id === id)!)
    const reranked = await this.reranker.rerank(query, docs)

    return reranked.slice(0, topK / 2)  // 取最终 Top-K
  }
}
```

### 6.5 对话上下文管理

```typescript
// ai/context-manager.ts
class ContextManager {
  // Token 精确计数 (使用 tiktoken 等价库)
  countTokens(text: string): number

  // 滑动窗口: 保留最近 N 轮完整对话
  slidingWindow(messages: Message[], maxTokens: number): Message[]

  // 历史摘要压缩: 超长对话时自动压缩早期消息
  async compressHistory(messages: Message[]): Promise<Message[]> {
    // 1. 保留最近 4 轮完整对话
    // 2. 更早的消息 → LLM 生成摘要 (保留关键实体/决策)
    // 3. 摘要作为系统提示注入
  }

  // 智能截断: 从旧到新剔除消息直到满足 Token 限制
  truncateToFit(messages: Message[], maxTokens: number): Message[]
}
```

### 6.6 LangGraph Agent 编排

```typescript
// ai/agent/langgraph-workflow.ts
import { StateGraph } from '@langchain/langgraph'

// Agent 状态定义
interface AgentState {
  messages: Message[]
  task: string
  toolCalls: ToolCall[]
  intermediateResults: any[]
  nextStep: string | null
  error: Error | null
}

// 定义工作流节点
const workflow = new StateGraph<AgentState>({
  channels: {
    messages: { value: (a, b) => [...a, ...b] },
    task: { value: (_, b) => b },
    toolCalls: { value: (a, b) => [...a, ...b] },
    intermediateResults: { value: (a, b) => [...a, ...b] },
  }
})

// 节点: 分析任务
workflow.addNode('analyze', async (state) => {
  // LLM 分析任务，拆解子步骤
})

// 节点: 调用工具
workflow.addNode('execute_tools', async (state) => {
  // 执行 ToolRegistry 中注册的工具
})

// 节点: 评估结果
workflow.addNode('evaluate', async (state) => {
  // LLM 评估结果是否满足要求
  // 满足 → END
  // 不满足 → 重新执行或调整策略
})

// 节点: 人工介入 (可选)
workflow.addNode('human_review', async (state) => {
  // 暂停执行，等待人工确认
  // 支持断点续跑
})

// 定义边和条件路由
workflow.addEdge('analyze', 'execute_tools')
workflow.addConditionalEdges('execute_tools', async (state) => {
  if (state.toolCalls.length === 0) return 'analyze'
  return 'evaluate'
})
workflow.addConditionalEdges('evaluate', async (state) => {
  if (state.nextStep === 'done') return END
  if (state.nextStep === 'human_review') return 'human_review'
  return 'execute_tools'
})

const app = workflow.compile()
```

---

## 7. 数据存储层

### 7.1 数据库 Schema (Prisma)

```prisma
// 核心模型

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  avatarUrl     String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  knowledgeBases KnowledgeBase[]
  conversations  Conversation[]
  documents      Document[]
  agentTasks     AgentTask[]
}

model KnowledgeBase {
  id          String      @id @default(uuid())
  name        String
  description String?
  ownerId     String
  owner       User        @relation(fields: [ownerId], references: [id])
  documents   Document[]
  chunks      Chunk[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model Document {
  id              String        @id @default(uuid())
  fileName        String
  fileType        String        // pdf, docx, md, txt, xlsx
  fileSize        Int           // bytes
  fileUrl         String        // MinIO 存储路径
  status          DocStatus     @default(PENDING)
  errorMessage    String?
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id])
  uploaderId      String
  uploader        User          @relation(fields: [uploaderId], references: [id])
  chunks          Chunk[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Chunk {
  id              String        @id @default(uuid())
  content         String
  embedding       Unsupported("vector(1024)")?   // pgvector 1024维
  chunkIndex      Int           // 分块序号
  metadata        Json?         // 页码、章节标题、父块ID
  documentId      String
  document        Document      @relation(fields: [documentId], references: [id])
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id])
  createdAt       DateTime      @default(now())

  @@index([knowledgeBaseId])
  // pgvector IVFFlat 索引 (加快近似检索)
}

model Conversation {
  id        String    @id @default(uuid())
  title     String
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Message {
  id             String       @id @default(uuid())
  role           MessageRole  // user, assistant, system, tool
  content        String
  tokenCount     Int?         // Token 用量
  modelName      String?      // 使用的模型
  citations      Json?        // RAG 来源引用 [{chunkId, score, content}]
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  createdAt      DateTime     @default(now())
}

model AgentTask {
  id          String      @id @default(uuid())
  name        String
  description String?
  status      AgentStatus @default(PENDING)
  workflow    Json        // LangGraph 工作流定义
  state       Json?       // 当前执行状态 (支持断点续跑)
  result      Json?       // 执行结果
  creatorId   String
  creator     User        @relation(fields: [creatorId], references: [id])
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

model ApiKey {
  id        String    @id @default(uuid())
  provider  String    // deepseek, qwen, openai
  keyHash   String    // 加密存储
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  createdAt DateTime  @default(now())
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String
  action    String   // login, upload_document, chat, agent_execute
  resource  String?  // 操作对象
  detail    Json?    // 详细信息
  ip        String?
  createdAt DateTime @default(now())
}

enum Role { USER, ADMIN, SUPER_ADMIN }
enum DocStatus { PENDING, PROCESSING, COMPLETED, FAILED }
enum MessageRole { user, assistant, system, tool }
enum AgentStatus { PENDING, RUNNING, WAITING_HUMAN, COMPLETED, FAILED }
```

### 7.2 Redis 缓存设计

| 缓存类型 | Key Pattern | TTL | 说明 |
|---------|------------|-----|------|
| 用户会话 | `session:{userId}` | 7d | JWT Refresh Token |
| 接口限流 | `ratelimit:{userId}:{endpoint}` | 1m | 滑动窗口计数器 |
| 模型响应缓存 | `semantic:{queryHash}` | 1h | 语义缓存 (相似问题命中) |
| 热门文档Embedding | `embedding:{docId}` | 无过期 | 避免重复向量化 |
| Agent 任务状态 | `agent:{taskId}` | 24h | 实时状态查询 |

---

## 8. 跨平台策略

### 8.1 代码复用率

```
                    ┌──────────────────────────┐
                    │   packages/ui/           │
                    │   packages/shared/       │
                    │   packages/ai-core/      │
                    │       ↑ 被所有端复用      │
                    └──────────┬───────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────▼──────┐      ┌───────▼───────┐      ┌───────▼──────┐
  │ apps/web/  │      │ apps/desktop/ │      │  PWA (同web) │
  │ Vue 3 SPA  │      │ Vue 3 + Tauri │      │ ServiceWorker│
  │             │      │               │      │ + Manifest  │
  │ 浏览器 API  │      │ Tauri API     │      │ Installable │
  └────────────┘      └───────────────┘      └──────────────┘
       95% 代码共享         5% 平台适配         0% 额外代码
```

### 8.2 Tauri 桌面端专属能力

| 能力 | 实现 | 价值 |
|------|------|------|
| 系统托盘常驻 | `tray.rs` + 右键菜单 | 随时可用，不占任务栏 |
| 全局快捷键 | `Alt+Space` 唤起 | ChatGPT 桌面端体验 |
| 本地文件系统 | 直接读写用户文件 | 文档管理更灵活 |
| 系统通知 | 原生通知推送 | Agent 完成/日程提醒 |
| 自动启动 | 开机自启 | 办公常态化使用 |
| 打包体积 | ~8MB (.msi/.dmg) | vs Electron 150MB+ |

### 8.3 PWA 移动端能力

| 能力 | 实现 |
|------|------|
| 添加到主屏幕 | manifest.json + A2HS |
| 离线使用 | Service Worker (Workbox) + IndexedDB |
| 推送通知 | Web Push API |
| 后台同步 | Background Sync API |
| 响应式布局 | CSS Container Queries + 弹性布局 |
| 触摸优化 | 手势滑动、长按菜单、触觉反馈 |

### 8.4 平台差异处理

```typescript
// packages/shared/src/platform-adapter.ts
export interface PlatformAdapter {
  // 文件选择
  pickFiles(options: FilePickerOptions): Promise<File[]>

  // 通知
  notify(title: string, body: string): Promise<void>

  // 快捷键
  registerShortcut(key: string, callback: () => void): Promise<void>

  // 存储
  getLocalStorage(key: string): Promise<string | null>
  setLocalStorage(key: string, value: string): Promise<void>
}

// 自动检测并注入对应实现
export function createPlatformAdapter(): PlatformAdapter {
  if (isTauri()) return new TauriAdapter()
  return new WebAdapter()
}
```

---

## 9. 界面与交互设计规范

### 9.1 设计理念

> **"ChatGPT 的骨架 + Jarvis 的灵魂"** — 以 ChatGPT 桌面客户端的经典布局为基准，融入可自定义的主题系统和微妙的品牌调性。

### 9.2 布局结构 (ChatGPT 经典三栏)

```
┌──────┬──────────────────────────┬───────┐
│      │                          │       │
│ 侧边栏 │       对话主区域           │ 详情  │
│ 260px│       flex-1             │ 320px │
│      │                          │(可折叠)│
│      │                          │       │
├──────┤                          │       │
│ 📝新对话│   ┌──────────────────┐  │       │
│ ──────│   │                  │  │       │
│ 📁对话1│   │  AI 回答区域      │  │ 引用  │
│ 📁对话2│   │  (Markdown渲染)   │  │ 来源  │
│ 📁对话3│   │                  │  │       │
│       │   └──────────────────┘  │       │
│ ──────│   ┌──────────────────┐  │       │
│ 📚知识库│   │  💬 输入你的问题...│  │       │
│  ├文档1│   │  📎 📁 ⚙️    →  │  │       │
│  └文档2│   └──────────────────┘  │       │
│       │                          │       │
│ ──────│                          │       │
│ 👤用户 │                          │       │
└──────┴──────────────────────────┴───────┘
```

### 9.3 配色方案 (可自定义)

#### 默认主题: 暗色专业风 (ChatGPT-Inspired)

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-primary` | `#212121` | 主背景 |
| `--bg-secondary` | `#171717` | 侧边栏背景 |
| `--bg-tertiary` | `#2F2F2F` | 卡片/输入框背景 |
| `--bg-hover` | `#333333` | 悬停态 |
| `--text-primary` | `#ECECEC` | 主文字 |
| `--text-secondary` | `#B4B4B4` | 次要文字 |
| `--text-muted` | `#7D7D7D` | 辅助文字 |
| `--accent` | `#10A37F` | 主强调色 (发送按钮/链接) |
| `--accent-hover` | `#0D8C6D` | 强调色悬停态 |
| `--border` | `#3E3E3E` | 边框 |
| `--radius-sm` | `6px` | 小圆角 |
| `--radius-md` | `10px` | 中圆角 |
| `--radius-lg` | `16px` | 大圆角 |
| `--font-sans` | `'Inter', 'SF Pro', system-ui` | 无衬线字体 |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | 代码字体 |

#### 主题切换架构

```typescript
// 风格自定义配置接口
interface StyleConfig {
  mode: 'dark' | 'light' | 'system'
  colors: {
    bgPrimary: string
    bgSecondary: string
    accent: string
    // ... 所有 color tokens 可覆盖
  }
  typography: {
    fontSans: string
    fontMono: string
    baseSize: number  // rem 基准
  }
  layout: {
    sidebarWidth: number
    messageSpacing: 'compact' | 'normal' | 'relaxed'
    borderRadius: 'sharp' | 'rounded' | 'pill'
  }
  animation: {
    reduceMotion: boolean
    streamingStyle: 'typewriter' | 'fade-in' | 'instant'
  }
}
```

### 9.4 核心交互规范

#### 9.4.1 对话交互

- **发送消息**: Enter 发送，Shift+Enter 换行
- **停止生成**: 生成中显示 ■ 停止按钮，点击即中断 SSE 流
- **重新生成**: 每条 AI 回复下方有 🔄 重新生成按钮
- **复制**: 代码块右上角一键复制，带语言标签
- **反馈**: 👍👎 按钮，收集用户反馈优化 Prompt
- **引用跳转**: AI 回复中的引用编号可点击，右侧面板展示原文

#### 9.4.2 文档上传

- **拖拽上传**: 对话输入区即拖拽目标
- **批量上传**: 支持一次选多个文件
- **上传进度**: 分片上传进度条 + 解析状态指示器
- **格式支持**: PDF、Word(.docx)、Markdown、TXT、Excel(.xlsx)

#### 9.4.3 响应式断点

| 断点 | 布局 | 侧边栏 | 详情面板 |
|------|------|--------|---------|
| ≥1024px | 三栏 | 固定260px | 可折叠320px |
| 768-1023px | 两栏 | 抽屉式 | 隐藏 |
| <768px | 单栏 | 全屏抽屉 | 隐藏 |

---

## 10. 工程化与 DevOps

### 10.1 Docker 编排

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg16  # 内置 pgvector 插件
    environment:
      POSTGRES_DB: jarvis
      POSTGRES_USER: jarvis
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: jarvis
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  server:
    build: ./apps/server
    depends_on:
      - postgres
      - redis
      - minio
    environment:
      DATABASE_URL: postgresql://jarvis:${DB_PASSWORD}@postgres:5432/jarvis
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio
    ports:
      - "3000:3000"

  web:
    build: ./apps/web
    depends_on:
      - server
    ports:
      - "5173:80"

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 10.2 CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint           # ESLint + Prettier
      - run: pnpm typecheck      # TypeScript 类型检查

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: jarvis_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test           # Vitest (前端) + Jest (后端)
      - run: pnpm test:e2e       # Playwright E2E

  build:
    needs: [lint, test]
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build          # 全量构建

  docker:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - run: docker build ...
      - run: docker push ...
```

### 10.3 可观测性

| 层面 | 工具 | 指标 |
|------|------|------|
| 应用日志 | Pino (结构化JSON日志) | 请求日志、错误日志、AI调用日志 |
| 日志聚合 | Loki + Grafana | 日志搜索、聚合分析 |
| 指标监控 | Prometheus + Grafana | QPS、响应时间、Token消耗、错误率、缓存命中率 |
| 链路追踪 | OpenTelemetry (可选) | AI调用链耗时分析 |
| 前端监控 | Sentry (可选) | 前端错误、性能、用户行为 |

---

## 11. 安全合规

### 11.1 认证体系

```typescript
// JWT 双令牌机制
interface TokenPair {
  accessToken: string   // 短期令牌 (15min)
  refreshToken: string  // 长期令牌 (7d, 存储在 Redis)
}

// 登录流程
// 1. 用户邮箱+密码登录
// 2. 验证通过 → 生成 accessToken(15min) + refreshToken(7d)
// 3. accessToken 放在 Authorization header 中传输
// 4. refreshToken 以 httpOnly cookie 方式存储
// 5. accessToken 过期 → 前端自动用 refreshToken 换取新 accessToken
// 6. refreshToken 过期 → 需要重新登录
```

### 11.2 安全措施清单

| 安全措施 | 实现方式 |
|---------|---------|
| 密码加密 | bcrypt (salt rounds=12) |
| API 密钥存储 | AES-256-GCM 加密存储，运行时解密 |
| 参数校验 | Zod Schema 全量校验 |
| SQL 注入防护 | Prisma 参数化查询 (天然防护) |
| XSS 防护 | Vue 默认转义 + DOMPurify (Markdown 渲染) |
| CSRF 防护 | SameSite Cookie + Token |
| 接口限流 | Redis 滑动窗口，60次/分钟/用户 |
| CORS | NestJS CORS 白名单配置 |
| HTTPS | 生产环境强制 TLS 1.3 |
| 安全头 | Helmet 中间件 (CSP, HSTS, X-Frame-Options) |

### 11.3 操作审计

所有关键操作写入 `audit_logs` 表：
- 用户登录/登出
- 文档上传/删除
- 知识库创建/删除
- AI 对话 (记录 Token 消耗)
- Agent 任务创建/执行
- 设置变更

---

## 12. 开发路线图

### Phase 0: 项目初始化 (第 1 周)

```
Week 1: 搭建地基
├── Day 1-2: Monorepo 初始化
│   ├── pnpm workspace + Turborepo 配置
│   ├── ESLint + Prettier + Husky 统一配置
│   ├── TypeScript 严格模式配置
│   └── packages/shared 基础类型定义
│
├── Day 3-4: 基础设施搭建
│   ├── Docker Compose (PostgreSQL+pgvector + Redis + MinIO)
│   ├── NestJS 项目脚手架 + Prisma Schema 设计
│   ├── Vue 3 项目脚手架 + Vite + Ant Design Vue
│   └── Tauri v2 项目脚手架 (空壳)
│
├── Day 5: CI/CD 管线
│   ├── GitHub Actions (lint + test + build)
│   ├── 多环境配置 (.env.development / .env.production)
│   └── Git 分支策略 (main / develop / feature/*)
│
└── Day 6-7: 基础界面
    ├── ChatGPT 风格布局骨架 (三栏 + 响应式)
    ├── 路由配置 + 基础页面
    └── 主题系统初版 (CSS 变量 + 暗色模式)
```

### Phase 1: 核心功能 — 知识库问答 (第 2-4 周)

```
Week 2-3: 后端 AI 引擎
├── 多模型网关 (自研适配层)
├── 文档解析服务 (PDF/Word/Markdown)
├── 智能分块 + Embedding + pgvector 存储
├── 混合检索 (向量 + BM25 + RRF)
├── Rerank 精排集成
├── SSE 流式对话接口
└── 对话上下文管理

Week 3-4: 前端对接
├── 文档上传组件 (拖拽 + 分片 + 进度)
├── 对话界面 (SSE 流式渲染 + Markdown)
├── 知识库管理页面
├── 来源引用展示
└── 虚拟列表 (对话历史)
```

### Phase 2: 进阶功能 (第 5-8 周)

```
Week 5-6: 智能文档处理
├── 文档摘要生成
├── 关键信息提取 (结构化输出)
├── 多文档对比分析
├── 文档翻译
└── 长文档分治策略

Week 6-7: Agent 任务编排 (LangGraph)
├── LangGraph 集成
├── ToolRegistry 工具注册中心
├── 知识库搜索 Tool
├── 日历操作 Tool
├── Agent 执行状态可视化
└── 断点续跑 + 人工介入节点

Week 7-8: 日程/任务助手
├── 自然语言解析日程
├── 日程 CRUD API
├── 智能提醒
├── 日报/周报生成
└── 日历视图组件
```

### Phase 3: 平台扩展与打磨 (第 9-12 周)

```
Week 9: Tauri 桌面端
├── 系统托盘 + 右键菜单
├── 全局快捷键 (Alt+Space 唤起)
├── 系统通知集成
├── 本地文件系统直接访问
├── 窗口管理 (最小化到托盘)
└── 打包配置 (.msi / .dmg)

Week 10: PWA + 移动端优化
├── Service Worker (Workbox)
├── Manifest.json + 安装提示
├── IndexedDB 离线存储
├── 响应式布局打磨
├── 触摸交互优化
└── 离线知识库检索

Week 11: 监控 + 质量
├── Prometheus + Grafana 监控大盘
├── 日志聚合 (Pino + Loki)
├── 语义缓存 (Redis)
├── 大小模型智能路由
├── E2E 测试 (Playwright)
├── 单元测试补充 (目标 80% 覆盖率)
└── API 文档 (Swagger)

Week 12: 收尾与面试准备
├── Bug 修复 + 体验打磨
├── 性能优化
├── README + 架构文档
├── 部署文档
├── 演示视频录制
└── 面试话术准备 (STAR 法则)
```

### 12.1 里程碑检查点

| 时间点 | 检查项 | 产出物 |
|--------|--------|--------|
| 第 2 周末 | 基础架构可用 | 登录 + 空知识库 + 基础对话 |
| 第 4 周末 | **MVP 核心闭环** | 文档上传 → 向量化 → RAG 对话 → 来源引用 |
| 第 6 周末 | 文档处理上线 | 摘要/提取/对比/翻译 |
| 第 8 周末 | Agent 编排可用 | LangGraph 多步任务执行 |
| 第 10 周末 | 三端全部可用 | Web + Tauri + PWA |
| 第 12 周末 | **正式发布** | 完整项目 + 文档 + 演示 |

---

## 13. 面试竞争优势分析

### 13.1 你的项目 vs 普通候选人的项目

| 维度 | 普通候选人 | 你的 Jarvis | 面试官怎么看 |
|------|-----------|------------|------------|
| 项目类型 | "调 ChatGPT API 做了个聊天页面" | **完整 RAG 链路 + 混合检索 + Rerank** | "这人是真做过 AI 工程的" |
| 后端 | Express + 简单路由 | **NestJS + DI + 模块化 + Prisma + BullMQ** | "架构能力不输 Java 开发" |
| AI 深度 | "调了一下 LangChain" | **多模型网关 + 语义缓存 + 大小模型路由** | "有成本意识和工程思维" |
| 前端 | 简单 React/Vue 页面 | **SSE 流式 + 虚拟列表 + PWA + 主题系统** | "前端深度足够" |
| 平台 | 只有 Web | **Web + 桌面(Tauri) + 移动(PWA)** | "全栈能力广，跨平台有实战" |
| 工程化 | npm start 就跑 | **Docker + CI/CD + 监控 + 审计** | "能直接进生产环境的水平" |
| 部署 | 无 | **Docker Compose + 私有化部署方案** | "懂运维，能独立负责项目" |

### 13.2 STAR 法则面试话术 (预编)

> **Situation**: 我发现市面上的 AI 办公工具普遍绑定单一模型厂商，且大多只支持 Web 端，数据隐私和离线使用场景无法满足。
>
> **Task**: 我的目标是独立设计并开发一个轻量级企业 AI 助手，实现 Web/桌面/移动三端覆盖，核心能力包括私有知识库 RAG 问答、智能文档处理和 Agent 任务编排，同时支持私有化部署。
>
> **Action**:
> - 采用 NestJS + LangChain.js 构建后端 AI 引擎，实现了向量+BM25关键词混合检索与 Rerank 二次精排的完整 RAG 管线，问答准确率达到 88%；
> - 设计多模型统一网关，支持 DeepSeek/通义千问/OpenAI 兼容接口的自动路由和故障降级；
> - 引入 BullMQ 异步任务队列解耦文档处理流程，单文档处理耗时降低 60%；
> - 基于 Tauri v2 实现桌面端，打包体积仅 8MB (对比 Electron 150MB+)，结合 PWA 技术实现移动端零额外代码覆盖；
> - 通过语义缓存 + 大小模型智能路由，将单用户 Token 消耗降低约 40%；
> - 基于 Docker Compose 实现全服务一键部署，配套 Prometheus + Grafana 全链路监控。
>
> **Result**: 项目完整覆盖从 UI 到 AI 引擎到部署的全链路，支持私有化部署。这个项目使我在 AI 应用架构设计、RAG 工程化落地、跨平台开发等方面积累了完整的实战经验。

### 13.3 技术深度关键词 (简历 SEO)

```
AI 应用全栈 · RAG 工程化 · 混合检索 · Rerank 精排 · LangGraph Agent
NestJS 企业架构 · Prisma ORM · PostgreSQL + pgvector · Redis 缓存
BullMQ 异步队列 · Tauri 桌面开发 · PWA 渐进式应用 · Monorepo 工程化
Docker 容器化 · CI/CD · Prometheus 监控 · 多模型路由 · 语义缓存
```

---

## 14. 风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| 8-12 周时间不够，功能做不完 | 中 | 高 | Phase 1 (4周) 必须闭环，后续每个 Phase 独立可演示。宁愿少做但做深，不要全面铺开 |
| RAG 准确率达不到预期 | 中 | 中 | 从简单场景开始（短文档、常见问题），迭代优化检索策略。准备几条"精选演示问题"保证展示效果 |
| 多模型 API 费用超预算 | 低 | 中 | 本地 Embedding 模型（bge 系列），语义缓存减少重复调用，大小模型路由 |
| Tauri 打包/签名遇到坑 | 中 | 低 | Tauri v2 文档逐渐完善，提前验证打包流程。实在不行桌面端可以暂缓，Web+PWA 已经足够有说服力 |
| Rust 代码量超预期 | 低 | 低 | Tauri 桌面端只需少量 Rust 代码（系统托盘+快捷键），复杂的放 TypeScript 侧 |

---

## 附录 A: 项目命名与品牌

- **产品名**: Jarvis‌
- **代号**: J.A.R.V.I.S — Just A Rather Very Intelligent System
- **Logo 方向**: 简约几何图形 (六边形/AI 神经网络节点) + 品牌色渐变
- **Slogan**: "你的企业级 AI 办公伙伴"

## 附录 B: 本地开发环境要求

| 工具 | 最低版本 | 用途 |
|------|---------|------|
| Node.js | 20 LTS | 运行环境 |
| pnpm | 9.x | 包管理 |
| Rust | 1.78+ | Tauri 编译 |
| Docker | 24+ | 服务编排 |
| Git | 2.40+ | 版本控制 |
| VS Code | 最新 | IDE (推荐 Volar + Rust Analyzer 插件) |

## 附录 C: 成本估算 (开发期)

| 项目 | 费用 | 说明 |
|------|------|------|
| DeepSeek API | ~¥50/月 | 主要对话模型，价格低廉 |
| 通义千问 API | ~¥30/月 | 备用模型 + 简单任务 |
| Embedding | ¥0 | bge 模型本地部署 (CPU 可跑) |
| 域名 | ~¥50/年 | 演示用 |
| 云服务器 | ~¥100/月 | 2C4G 轻量云即可 (演示阶段) |
| **总计** | **¥230/月** | 极低成本，个人完全负担 |

---

> **最后**: 这份方案的设计核心思路是 **"广度覆盖全栈 + 深度扎根 AI"**。前端、后端、AI 引擎、工程化每层都有明确的深度目标。面试时，你可以从任何一个技术点展开深入讨论，因为每个选型都有充分的理由和工程细节。祝项目顺利！
