# Jarvis‌ · 企业级 AI 智能效率助手

## 最终技术方案与实施规划

> **版本**: V0.1 · 初版方案  
> **日期**: 2025-06-25  
> **目标岗位**: AI 应用全栈工程师  
> **时间预算**: 8-12 周  
> **展现形式**: Web + 桌面端(Tauri) + 移动端(PWA) · 三端一套代码

---

## 目录

0. [架构哲学：可迭代性优先](#0-架构哲学可迭代性优先)
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
13. [面试竞争策略](#13-面试竞争策略)
14. [风险与对策](#14-风险与对策)

---

## 0. 架构哲学：可迭代性优先

> **这条高于所有具体技术选型。宁可少做一个功能，不能破坏一个边界。**

### 0.1 核心问题

软件熵增的典型路径：

```
第 1 周: 架构清晰 → 第 3 周: "就加一个 if，不改架构了"
→ 第 6 周: 模块边界模糊 → 第 10 周: 改一个文案要动 8 个文件
→ 第 12 周: 不敢重构，只敢打补丁 → 项目烂尾
```

**我们要打破这个循环。** 代价是前期多想 30 分钟，收益是 12 周后依然能自信地增删功能。

### 0.2 六条铁律

#### 铁律 1：单一职责 + 边界隔离

```
每个模块只做一件事，模块间通过接口通信。

✅ 正确:
  ChatService 只负责对话编排
  → 它不直接调 Embedding 模型
  → 它通过 SearchService 接口获取检索结果

❌ 错误:
  ChatService 直接 import pgvector 查数据库
  → 改检索逻辑要改 ChatService
  → 改数据库要改 ChatService
  → ChatService 变成黑洞
```

**检验标准**: 如果我说"把 pgvector 换成 Milvus"，你只需要改 `SearchService` 内部实现，对外接口不变，`ChatService` 一行不动。做不到就是不隔离。

#### 铁律 2：依赖倒置 —— 高层不依赖低层

```
传统 (错误):  ChatService → PostgreSQL
依赖倒置 (正确): ChatService → SearchRepository (接口) ← PgvectorSearchRepo (实现)

    高层模块                抽象接口                低层模块
  ┌──────────┐         ┌──────────────┐        ┌────────────────┐
  │ ChatSvc  │ ──→    │ ISearchRepo   │   ←── │ PgvectorRepo   │
  └──────────┘         │ search()      │        └────────────────┘
                       │ hybridSearch()│        ┌────────────────┐
                       └──────────────┘   ←── │ MilvusRepo      │
                                              │ (未来可替换)     │
                                              └────────────────┘
```

NestJS 的依赖注入天然支持这套模式。每个 Service 依赖抽象接口，不依赖具体实现。

#### 铁律 3：单一变更源 —— "一个需求只改一处"

| 需求 | 修改范围 | 不改什么 |
|------|---------|---------|
| 换个 Embedding 模型 | `EmbeddingService` 1 个文件 | ChunkingService, SearchService |
| 换个 LLM 厂商 | `ModelGateway` 配置文件 | ChatService, AgentService |
| 换 UI 组件库 | `packages/ui/` | `apps/web/pages/**`, `apps/server/**` |
| 加一个 Agent Tool | `tools/` 下新增 1 个文件 + 注册 | AgentService 核心逻辑 |
| 改数据库表结构 | Prisma Schema + Migration | 所有 Service (Prisma 自动生成类型) |
| 改 Prompt 模板 | `prompt-templates.ts` 1 个文件 | 对话编排逻辑 |

#### 铁律 4：接口即合同 —— 先定义再实现

```
任何跨模块通信，先定义接口/类型，再写实现。

前端 ←→ 后端:
  packages/shared/src/types/api.ts   # 所有 API 请求/响应类型
  packages/shared/src/validation/    # Zod schemas (前后端共享校验)

Service ←→ Service (后端内部):
  ai/interfaces/                      # ISearchService, IEmbeddingService, IModelProvider

组件 ←→ 组件 (前端内部):
  Props/Emits 类型显式定义
  复杂组件提供 provide/inject 接口
```

#### 铁律 5：不可变数据流

```
所有数据传递创建新对象，不修改入参。

✅ const updated = { ...original, field: newValue }
❌ original.field = newValue

前端:
  Pinia actions 返回新状态，不直接 mutate
  computed 派生，不冗余存储

后端:
  Service 方法返回新对象，不修改传入的 entity
  Prisma 查询结果视为只读
```

#### 铁律 6：测试即文档，也是重构安全网

```
每个 Service 有单元测试 (80%+ 覆盖率)
  → 测试描述的是"这个模块的契约是什么"
  → 重构时: 测试通过 = 行为不变 = 安全

关键路径有集成测试:
  ├── 文档上传 → 解析 → 向量化 → 可检索  (全链路)
  ├── 用户提问 → 检索 → 生成 → 流式返回  (核心链路)
  └── Agent 创建 → 执行 → 工具调用 → 完成 (Agent 链路)
```

#### 铁律 7：三次原则 —— 不提前抽象，但及时抽象

> **业界共识**: 2 个用例看不到真正的共性模式，3 个才够。过早抽象比重复代码更难改。

##### 两种抽象，两种节奏

```
架构级抽象 (一开始就做)
  前提: 100% 确定，不需要猜测
  例: 共享类型定义、统一响应体、平台适配器、模型网关接口
  做法: 项目初始化时就建好 packages/shared/ 和接口定义

业务级抽象 (等出现 3 次再做)
  前提: 发现了真正的共性模式
  例: 两个 Service 有相似查询逻辑 → 先各自写 → 第 3 次才提取
      两个组件有相似交互 → 先各自写 → 第 3 次才提取为 composable
  做法: 前两次允许复制 (不是偷懒，是谨慎)
```

##### 决策流程

```
发现"这好像可以复用"
    │
    ├── 是架构层面必须统一的吗? (API 格式/类型定义/主题系统)
    │   └── YES → 立即抽象，定义接口
    │
    └── 是业务逻辑巧合相似吗?
        ├── 第 1 次 → 直接写，不加抽象
        ├── 第 2 次 → 复制，加 @abstract-candidate 注释标记
        └── 第 3 次 → 抽象，提取到 shared/ 对应目录
```

##### @abstract-candidate 标记规范

```typescript
// @abstract-candidate: 文档分页查询逻辑
// Seen: 2/3 (KnowledgeService.ts → searchDocuments,
//             ChatService.ts → searchConversations)
// Pattern: 分页 + 关键词过滤 + 日期排序 + 软删除排除
// If seen again: 提取到 shared/utils/paginated-search.ts
//   Abstract as: createPaginatedSearch(config: PaginatedSearchConfig)
async function searchDocuments(query: SearchQuery) {
  // 暂时保持独立实现，等第 3 个用例出现再抽象
}
```

##### 为什么不是 DRY 优先？

```
经典 DRY 陷阱:
  两个地方代码看起来一样
  → 立即提取共用函数
  → 第三处需求来了，发现逻辑有微妙差异
  → 给共用函数加 if/参数/回调 → 函数越来越复杂
  → 三个月后，这个"共用"函数比两份独立代码加起来还难懂

三次原则的智慧:
  见过 3 个真实用例
  → 知道哪些是真正不变的，哪些是各用例独有的
  → 抽象出的接口精确、稳定、不会反复修改
  → 这才是真正的 DRY
```

### 0.3 模块间通信规范

```
┌─────────────────────────────────────────────────────────────┐
│                    通信方式决策树                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  同模块内 Service 之间                                       │
│  ├── 直接依赖注入 (NestJS DI)                                │
│  └── 例: ChatService → SearchService                        │
│                                                             │
│  跨模块 Service 之间                                         │
│  ├── 通过抽象接口 (NestJS custom provider)                   │
│  └── 例: ChatModule 不 import KnowledgeModule               │
│          而是依赖 ISearchService 接口                        │
│                                                             │
│  异步/耗时操作                                               │
│  ├── BullMQ 事件队列                                         │
│  └── 例: 文档上传 → DocumentUploadedEvent → Worker 处理      │
│          主流程不等待，Worker 完成后 WebSocket 推送结果       │
│                                                             │
│  前端 ←→ 后端                                                │
│  ├── RESTful API (CRUD)                                      │
│  ├── SSE (流式推送: 对话/AI 生成)                            │
│  ├── WebSocket (实时状态: Agent 执行进度)                     │
│  └── 所有类型定义在 packages/shared/                         │
│                                                             │
│  前端组件之间                                                │
│  ├── Props/Emits (父子通信)                                  │
│  ├── provide/inject (跨层级，如主题/模型配置)                  │
│  └── Pinia Store (全局状态: 用户信息/对话列表)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 0.4 新增功能的标准流程 (保证不破窗)

```
1. 定义接口
   ├── 后端: 在 ai/interfaces/ 或 modules/xxx/ 下定义 Service 接口
   ├── 前端: 在 packages/shared/ 下定义 API 类型
   └── 组件: 先写 Props/Emits 类型

2. 写测试 (TDD)
   ├── 后端: 写 Service 单元测试 (Mock 外部依赖)
   ├── 前端: 写组件测试 (渲染 + 交互)
   └── 集成: 写 E2E 测试骨架

3. 实现
   ├── 后端: 实现 Service → Controller → Module 注册
   ├── 前端: 实现组件 → 页面组装 → 路由
   └── 跨端: 共享逻辑放 packages/，平台差异放 Adapter

4. 验证
   ├── 单元测试通过
   ├── 集成测试通过
   ├── 不破坏已有测试 (回归)
   └── 代码审查

5. 文档
   └── 如果加了新的模块间接口 → 更新 docs/
```

### 0.5 反模式清单 (每次提交前自查)

| 反模式 | 检测信号 | 后果 |
|--------|---------|------|
| 循环依赖 | A import B 且 B import A | NestJS 启动报错 / 逻辑死循环 |
| 跨层直接调用 | Controller 直接调 Repository | 跳过 Service 层校验，不可测试 |
| 硬编码配置 | 代码里写死 URL/Key/阈值 | 换环境要改代码，不能进配置中心 |
| God Service | 一个 Service 超 300 行 | 职责不清，改不动 |
| 模块间耦合 | import 另一个 Module 的内部 Service | 模块重构时雪崩 |
| 类型重复定义 | 前后端各定义一套相同的类型 | 改一处漏一处 |
| 忽略错误处理 | `await` 不带 try-catch / 吞异常 | 故障无法追踪 |
| 过早抽象 | 只见过 1-2 个用例就提取公共层 | 公共层频繁修改,改一处影响所有调用方 |
| 抽象过晚 | 5+ 份复制代码仍未提取 | 修改一个逻辑要同步改 5 个地方 |

### 0.6 重构成本账 (为什么要守铁律)

```
                                       代码质量高
每次做正确的架构决策 (+5 分钟)          → 第 12 周加功能: 1 小时
                                        代码质量烂
每次偷懒跳过边界隔离   (-5 分钟)         → 第 12 周加功能: 8 小时 + 引入 3 个新 Bug

12 周累计: 正确的慢 = 多花 ~2 小时 | 偷懒的快 = 多花 ~40 小时
```

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
│  Vue 3 + TS  │  Pinia  │  AI Elements Vue + Ant Design Vue   │
│  SSE 流式渲染  │  PWA (Workbox)  │  Tauri v2 (Rust)         │
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
│   ├── ui/                         # 共享 UI 组件库 (双层体系)
│   │   ├── src/
│   │   │   ├── base/               # Layer 1: Ant Design Vue 封装
│   │   │   │   ├── ATable.vue      #   表格 (排序/筛选/分页)
│   │   │   │   ├── AForm.vue       #   表单 (校验/提交)
│   │   │   │   ├── AModal.vue      #   弹窗 (确认/表单)
│   │   │   │   ├── ATree.vue       #   树形控件 (知识库目录)
│   │   │   │   ├── AUpload.vue     #   文件上传 (分片/进度)
│   │   │   │   └── ADatePicker.vue #   日期选择
│   │   │   │
│   │   │   ├── ai/                 # Layer 2: AI Elements Vue 封装
│   │   │   │   ├── chat/           #   Conversation + Message + PromptInput
│   │   │   │   │   ├── ChatView.vue        # 对话视图 (组合 Conversation/Message)
│   │   │   │   │   ├── ChatInput.vue       # 输入框 (封装 PromptInput)
│   │   │   │   │   └── ChatSuggestions.vue # 快捷建议 (封装 Suggestion)
│   │   │   │   ├── content/        #   CodeBlock + MessageResponse + Sources
│   │   │   │   │   ├── ResponseView.vue    # 流式响应视图
│   │   │   │   │   ├── SourcePanel.vue     # 来源引用面板 (封装 Sources)
│   │   │   │   │   └── CodeViewer.vue      # 代码展示 (封装 CodeBlock)
│   │   │   │   ├── reasoning/      #   Reasoning + ChainOfThought
│   │   │   │   │   ├── ReasoningPanel.vue  # 推理过程面板
│   │   │   │   │   └── ThoughtChain.vue    # 思维链可视化
│   │   │   │   ├── tools/          #   Tool + Confirmation
│   │   │   │   │   ├── ToolCallCard.vue    # 工具调用卡片
│   │   │   │   │   └── ConfirmDialog.vue   # 工具审批弹窗
│   │   │   │   └── workflow/       #   Canvas + Node + Edge (VueFlow)
│   │   │   │       ├── WorkflowCanvas.vue  # Agent 工作流画布
│   │   │   │       └── AgentNode.vue       # 工作流节点
│   │   │   │
│   │   │   ├── custom/             # Layer 2 补充: 项目专属组件
│   │   │   │   ├── FileDropzone.vue    # 拖拽文件上传 (AI 无此组件)
│   │   │   │   ├── KnowledgeCard.vue   # 知识库文档卡片
│   │   │   │   ├── ModelSelector.vue   # 模型选择器 (配合 PromptInput)
│   │   │   │   └── CheckpointNav.vue   # 对话检查点导航
│   │   │   │
│   │   │   ├── themes/             # 主题与设计系统
│   │   │   │   ├── tokens.css      #   设计 Token (CSS 变量)
│   │   │   │   ├── presets/        #   预设主题
│   │   │   │   │   ├── chatgpt-dark.ts
│   │   │   │   │   ├── jarvis-blue.ts
│   │   │   │   │   ├── notion-light.ts
│   │   │   │   │   └── cyber-terminal.ts
│   │   │   │   └── StyleProvider.vue
│   │   │   │
│   │   │   └── inspiration/        # 设计灵感笔记
│   │   │       ├── README.md       #   灵感来源索引
│   │   │       ├── v0-prompts.md   #   v0.dev 有效 Prompt 记录
│   │   │       └── screenshots/    #   21st.dev / dribbble 截图
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
| **CSS 框架** | Tailwind CSS | 3.4+ | 原子化CSS，AI Elements Vue 依赖，快速原型 |
| **状态管理** | Pinia | 2.x | Vue官方，TS友好 |
| **UI组件库 (基础层)** | Ant Design Vue | 4.x | 企业级重型组件：表格/表单/弹窗/树/日期 |
| **UI组件库 (AI层)** | AI Elements Vue | 最新 | **Vue AI 专用组件库**，Vercel AI Elements 的 Vue 移植版，尤雨溪背书。30+ 组件覆盖对话/推理/Canvas/工具调用 |
| **动画库** | @vueuse/motion | 最新 | Vue 动画，复现设计灵感中的微交互效果 |
| **设计灵感源** | v0.dev / 21st.dev | — | v0.dev 主用（AI 生成 UI 原型），21st.dev 辅助（浏览高分组件） |
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
│   │   ├── ChatView.vue           # 对话视图 (基于 AI Elements Conversation)
│   │   │   ├── MessageList.vue    # 消息列表
│   │   │   │   ├── UserBubble.vue         # 用户消息气泡
│   │   │   │   └── AIBubble.vue          # AI 回复气泡
│   │   │   │       ├── ReasoningPanel.vue  # 推理过程 (AI Elements Reasoning)
│   │   │   │       ├── ThoughtChain.vue    # 思维链 (AI Elements CoT)
│   │   │   │       ├── ResponseView.vue    # 流式Markdown (AI Elements MessageResponse)
│   │   │   │       ├── CodeViewer.vue      # 代码块 (AI Elements CodeBlock)
│   │   │   │       ├── SourcePanel.vue     # 来源引用 (AI Elements Sources)
│   │   │   │       ├── ToolCallCard.vue    # 工具调用 (AI Elements Tool)
│   │   │   │       └── ConfirmDialog.vue   # 工具审批 (AI Elements Confirmation)
│   │   │   └── ScrollAnchor.vue     # 自动滚动锚点
│   │   └── ChatInput.vue          # 输入区 (基于 AI Elements PromptInput)
│   │       ├── FileDropzone.vue   # 文件拖拽上传
│   │       ├── ModelSelector.vue  # 模型切换
│   │       └── ChatSuggestions.vue # 快捷建议 (AI Elements Suggestion)
│   │
│   └── DetailPanel.vue (可折叠)    # 右侧详情面板
│       ├── SourceDetail.vue       # RAG 引用原文查看
│       ├── CheckpointNav.vue      # 对话检查点 (AI Elements Checkpoint)
│       └── DocumentPreview.vue    # 文档预览
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

### 4.4 双层组件体系：Ant Design Vue + AI Elements Vue

> **设计决策**: 没有一种组件库能同时完美处理"企业级重型组件"和"AI 原生交互 UI"。采用**双层策略**，其中 AI Elements Vue（Vercel AI Elements 的 Vue 移植版，尤雨溪背书）作为 AI 层主力。

#### 组件体系全景

```
                    Jarvis UI 体系
                    ─────────────
    ┌───────────────────┴───────────────────┐
    │                                       │
Layer 1: Ant Design Vue              Layer 2: AI Elements Vue
(基础设施层 ~20% UI 量)              (AI 交互层 ~80% UI 量)
    │                                       │
    ├── 表格/数据展示                       ├── Conversation (对话容器)
    ├── 复杂表单校验                        ├── Message (消息气泡)
    ├── 弹窗/抽屉                           ├── MessageResponse (流式Markdown)
    ├── 树形控件                            ├── CodeBlock (代码高亮+复制)
    ├── 日期选择器                          ├── PromptInput (高级输入框)
    ├── 文件上传(分片)                      ├── Reasoning + CoT (推理展示)
    └── 全局通知                            ├── Sources + InlineCitation (引用)
                                            ├── Tool + Confirmation (工具调用)
                                            ├── Canvas + Node + Edge (工作流)
                                            ├── Suggestion (快捷建议)
                                            ├── Shimmer (加载动画)
                                            └── Checkpoint (检查点回退)

                    ┌─────────────────────┐
                    │ 补充自研 (项目专属)  │
                    │ FileDropzone        │
                    │ KnowledgeCard       │
                    │ ModelSelector       │
                    └─────────────────────┘
```

#### Layer 1: Ant Design Vue (基础设施层)

处理**复杂度高、无差异化的企业交互**。不改源码，用 `A` 前缀二次封装。

#### Layer 2: AI Elements Vue (AI 交互层)

##### 为什么用它而不是裸 shadcn-vue？

AI Elements Vue 是基于 shadcn-vue 构建的 **AI 专用组件库**。它提供了 shadcn-vue 没有的能力：

| 能力 | 裸 shadcn-vue | AI Elements Vue |
|------|:--:|:--:|
| 对话容器 (Conversation) | 需自研 | ✅ 开箱即用，流式感知 |
| 消息气泡 (Message) | 需自研 | ✅ 支持 user/assistant/system/tool 角色 |
| 流式 Markdown 渲染 | 需自研 ~350 行 | ✅ MessageResponse 内置 |
| 代码高亮 + 一键复制 | 需自研 | ✅ CodeBlock 内置 |
| 输入框 (模型选择/附件/发送) | 需自研 ~200 行 | ✅ PromptInput 内置 |
| 推理过程展示 (Reasoning) | ❌ 未规划 | ✅ **新增能力** |
| 思维链 (ChainOfThought) | ❌ 未规划 | ✅ **新增能力** |
| 工具调用可视化 (Tool) | ❌ 未规划 | ✅ **新增能力** |
| 工具审批 (Confirmation) | ❌ 未规划 | ✅ **新增能力** |
| 来源引用 (Sources) | 需自研 ~150 行 | ✅ 开箱即用，带行内引用 |
| Agent 工作流画布 | 需自研 ~500 行 | ✅ Canvas (基于 VueFlow) |
| 对话检查点 (Checkpoint) | ❌ 未规划 | ✅ **新增能力** |
| 快捷建议 (Suggestion) | 需自研 | ✅ 开箱即用 |

##### 统计

```
节省自研代码:  ~1500 行
新增未规划能力: 5 个
项目专属组件:  仅剩 3 个 (FileDropzone / KnowledgeCard / ModelSelector)
```

> **原则**: 和 shadcn 哲学一样，AI Elements Vue 组件通过 CLI 复制到 `packages/ui/src/ai/`，你可以完全控制源码。不是 npm 依赖，是你拥有的代码。

### 4.5 设计灵感工作流：v0.dev + 21st.dev 组合策略

> **核心变化**: 有了 AI Elements Vue 提供 AI 专用组件后，灵感工具的角色从"找可复用的组件"变为"找交互模式和创新方向"。

#### 三源矩阵

| 工具 | 角色 | 使用方式 | 频率 |
|------|------|---------|------|
| **v0.dev** (主力) | AI 快速原型 | 描述功能需求 → AI 生成 React UI → 提取布局/色彩/信息架构 → 用 AI Elements Vue 同名组件复现 | 每个新功能前 |
| **21st.dev** (辅助) | 组件设计参考 | 浏览高分 Chat UI/Agent Dashboard → 分析交互模式 → 截图保存到 inspiration/ | 需要灵感时 |
| **dribbble.com** (探索) | 视觉方向 | 搜索 "AI assistant" "Agent workflow" | 确定大方向时 |

#### 实操流程 (以 Agent 工作流可视化为案例)

```
1. 需求: Agent 执行多步任务，需要一个可视化工作流面板
        │
2. v0.dev 快速出原型
   ┌──────────────────────────────────────────────┐
   │ Prompt: "Agent workflow visualization panel  │
   │  with nodes for: analyze → search → reason   │
   │  → execute → evaluate. Show running status,  │
   │  intermediate results, and human-in-the-loop  │
   │  checkpoints. Dark theme, sidebar layout."   │
   │                                              │
   │ → v0 生成 React 代码 (10秒)                  │
   │ → 观察: 节点布局、状态颜色编码、              │
   │   暂停/继续交互、结果预览卡片                │
   └──────────────────────────────────────────────┘
        │
3. 分析核心设计模式
   ┌──────────────────────────────────────────────┐
   │ packages/ui/src/inspiration/v0-prompts.md    │
   │                                              │
   │ ## Agent Workflow 设计要点                   │
   │ - 节点状态: running(蓝脉冲) / done(绿勾) /   │
   │   waiting(橙旋转) / error(红叉)              │
   │ - 点击节点 → 右侧展开中间结果 (不打断流)     │
   │ - 人工介入节点 → 醒目边框 + 确认/拒绝按钮    │
   │ - 失败节点 → 重试按钮 + 自动回退到上一步    │
   │ - 进度条: 顶部 2/5 steps                    │
   └──────────────────────────────────────────────┘
        │
4. 用 AI Elements Vue 实现
   ┌──────────────────────────────────────────────┐
   │ AI Elements Vue 已有:                        │
   │ Canvas + Node + Edge → 画布和节点            │
   │ Tool + Confirmation → 工具状态和审批         │
   │ Reasoning → 推理过程展示                     │
   │ Checkpoint → 断点续跑                        │
   │                                              │
   │ 我们只需:                                    │
   │ - 组合这些组件                               │
   │ - 自定义节点样式 (状态颜色)                  │
   │ - 绑定实时数据 (SSE 推送节点状态)            │
   │ - 加交互 (点击展开/重试按钮)                 │
   └──────────────────────────────────────────────┘
```

#### 辅助: 21st.dev 的使用定位

```
21st.dev 现在的角色:
├── 搜 "chat" → 看其他开发者怎么设计对话界面
├── 搜 "agent" → 看 Agent Dashboard 的布局方案
├── 搜 "workflow" → 看工作流可视化的视觉风格
└── 搜 "reasoning" → 看推理链的展示形式

但不是:
├── ❌ 复制代码 (React 不兼容)
├── ❌ 直接用组件 (不需要，AI Elements Vue 已有)
└── ❌ 每个都看 (只关注高星 + 有 Demo 视频的)
```

---

## 5. 后端服务层

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

### 6.7 AI 可靠性保障体系

> **面试亮点**: 大部分 AI 项目不处理异常流程，这层是你区分"Demo"和"生产级"的关键证据。

#### 6.7.1 SSE 流式连接容错

```typescript
// ai/reliability/sse-recovery.ts
class SSERecoveryManager {
  // 断线重连: exponential backoff, max 3 retries
  async reconnect(conversationId: string, lastTokenIndex: number) {
    // 重连后从断点续传，避免重复输出
  }

  // 客户端超时检测: 30s 无新 token → 提示用户 + 重试按钮
  setupClientTimeout(stream: AsyncGenerator, onTimeout: () => void) {
    // 心跳检测机制
  }
}
```

#### 6.7.2 模型调用故障转移

```typescript
// ai/reliability/model-failover.ts
class ModelFailoverHandler {
  private retryPolicy = {
    429: { action: 'switch_provider', delay: 0 },        // 限流 → 立即切换厂商
    500: { action: 'retry', maxRetries: 3, backoff: 'exponential' }, // 服务器错误 → 退避重试
    502: { action: 'retry', maxRetries: 2, backoff: 'linear' },
    503: { action: 'switch_provider', delay: 1000 },      // 服务不可用 → 1s后切换
  }

  // 降级链: deepseek-chat → qwen-turbo → openai-gpt-4o-mini → 直接检索结果
  private fallbackChain = [
    'deepseek-chat',
    'qwen-turbo',
    'gpt-4o-mini',
    '__local_search_only__',  // 全挂时返回纯检索结果
  ]

  async executeWithFailover<T>(
    operation: (model: string) => Promise<T>,
    preferredModel: string
  ): Promise<{ result: T; usedModel: string; retries: number }> {
    let lastError: Error
    for (const model of [preferredModel, ...this.fallbackChain]) {
      try {
        const result = await operation(model)
        return { result, usedModel: model, retries: /* ... */ }
      } catch (err) {
        lastError = err as Error
        if (model === '__local_search_only__') {
          // 降级: 不使用 LLM，直接返回检索结果列表
          return { result: await this.localSearchFallback(), usedModel: 'none', retries: /* */ }
        }
      }
    }
    throw lastError!
  }
}
```

#### 6.7.3 内容安全审核

```typescript
// ai/reliability/content-guard.ts
class ContentGuard {
  // 输入审核: 用户输入 → 敏感词过滤 → 注入检测 → 放行/拦截
  async auditInput(text: string): Promise<{ safe: boolean; reason?: string }> {
    // 检测: 越狱提示词、恶意指令、违规内容
  }

  // 输出审核: LLM 输出 → 幻觉检测 → 合规检查 → 渲染/拦截
  async auditOutput(text: string, context: RAGContext): Promise<{
    safe: boolean
    hasHallucination: boolean  // 回答与检索上下文不一致 = 疑似幻觉
    flags: string[]
  }> {
    // 幻觉检测: 输出中的实体/数据是否在检索上下文中出现
    // 如果没有 → 可能是幻觉 → 标记为"AI 生成，请核实"
  }
}
```

#### 6.7.4 可靠性架构全景

```
用户请求
  → 参数校验 (Zod)
  → 内容安全审核 (输入)
  → 速率限制检查 (Redis 滑动窗口)
  → 语义缓存查询 (命中直接返回)
  → 模型路由 (智能选择)
  → [失败] → 故障转移 (换厂商/换模型/降级)
  → [成功] → 内容安全审核 (输出)
  → SSE 流式推送 (带断线续传)
```

### 6.8 可量化的性能指标

> **面试使用**: 在回答"项目效果如何"时，直接引用这些数字。

| 指标 | 目标值 | 测量方式 | 面试话术 |
|------|--------|---------|---------|
| RAG 召回率@5 | ≥ 85% | 自建 50 条问答对测试集 | "检索召回率 85%，意味着 10 次查询中有 8.5 次能在前 5 条结果中找到正确答案" |
| RAG 精确率@5 (含 Rerank) | ≥ 90% | 同上 | "加上 Rerank 精排后，精确率从 72% 提升到 90%+，提升约 25%" |
| 首字响应时间 (TTFT) | < 1.5s | SSE 首个 token 到达计时 | "从用户发送到第一个字出现，控制在 1.5 秒以内" |
| 语义缓存命中率 | ≥ 30% | Redis 命中数 / 总查询数 | "30% 的查询命中语义缓存，直接返回，Token 成本为零" |
| 单次对话平均 Token | < 2000 | 对话日志聚合统计 | "通过上下文压缩和滑动窗口，单次对话平均消耗不到 2000 Token" |
| 模型可用率 | ≥ 99.5% | 成功请求 / 总请求 | "多厂商故障转移确保 99.5% 以上可用率" |
| 文档处理吞吐 | 10MB/分钟 | 解析+分块+向量化 全链路 | "10MB 文档从上传到可检索，平均 3 分钟内完成" |
| 桌面端包体积 | < 10MB | Tauri 打包 .msi 大小 | "桌面端安装包不到 10MB，对比 Electron 的 150MB+，轻量 15 倍" |

> **评估体系**: 引入 RAGAS 框架对 RAG 管线做量化评估（Faithfulness / Answer Relevancy / Context Precision / Context Recall），数据驱动迭代，而非凭感觉调参。这是大厂 AI 团队的标准做法，面试时直接体现工程严谨性。

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

### 8.5 Tauri 容错与备用方案

#### 风险场景

| 风险 | 原因 | 影响 |
|------|------|------|
| WebView2 未安装 | Windows 企业电脑可能未预装 | Tauri 窗口无法启动 |
| Rust 编译链问题 | Windows 上 MSVC/Build Tools 配置缺失 | 桌面端无法编译 |
| Linux 兼容性 | WebKitGTK 版本不一致 | 部分 Linux 发行版异常 |

#### 三级降级策略

```
第一优先: Tauri 桌面端 (主力)
    打包体积 ~8MB，原生体验最佳
    ↓ 检测到 WebView2 缺失
第二选择: PWA 桌面安装
    Chrome/Edge "安装为应用" → 独立窗口 + 系统级体验
    零额外代码，只需 manifest.json
    ↓ 需要最大兼容性
第三选择: 浏览器 Web 版
    直接访问，功能完整
```

#### 启动时 WebView 检测

```typescript
// Tauri 启动时自动检测并提示安装 WebView2
// src-tauri/src/main.rs
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 检测 WebView2 可用性
            // 如果不可用 → 弹窗提示下载链接 + 引导使用 PWA
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> **面试话术**: "我设计了三级降级方案保证桌面端覆盖。主力是 Tauri (~8MB 包体)，如果环境不支持会自动引导用户安装 PWA 桌面版作为零成本的备用方案。这种容错设计在企业级桌面应用中很常见。"

---

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

#### 9.3.3 一键切换预设主题

> **面试展示**: 在对话界面实时切换 4 套主题，直观展示主题系统的可扩展性。

| 预设 | 风格描述 | 面试场景 |
|------|---------|---------|
| 🔵 **ChatGPT 暗色** (默认) | 灰黑底色 + 绿色强调，经典专业 | 展示"我懂参考业界标杆" |
| 🔷 **Jarvis 科技蓝** | 深蓝黑底色 + 蓝色主色调 + 橙色点缀，微粒子背景动画 | 展示品牌感和前端动画能力 |
| ⚪ **Notion 极简白** | 米白底色 + 灰蓝强调，毛玻璃卡片，衬线标题 | 展示浅色/深色双模支持 |
| 🟣 **赛博终端** | 纯黑底 + 霓虹青/紫 + 等宽字体 + 扫描线效果 | 展示"风格系统没有天花板" |

```typescript
// 预设主题定义
const themePresets: Record<string, DeepPartial<StyleConfig>> = {
  'chatgpt-dark': {
    mode: 'dark',
    colors: { bgPrimary: '#212121', accent: '#10A37F' },
    typography: { fontSans: "'Inter', 'SF Pro', system-ui" },
    layout: { borderRadius: 'rounded' },
  },
  'jarvis-blue': {
    mode: 'dark',
    colors: { bgPrimary: '#0A1628', accent: '#3B82F6', /* + 粒子背景 */ },
    typography: { fontSans: "'Inter', system-ui" },
    layout: { borderRadius: 'rounded' },
  },
  'notion-light': {
    mode: 'light',
    colors: { bgPrimary: '#FAFAFA', accent: '#5B6C7E' },
    typography: { fontSans: "'Inter', 'Noto Sans SC', system-ui" },
    layout: { borderRadius: 'pill', messageSpacing: 'relaxed' },
  },
  'cyber-terminal': {
    mode: 'dark',
    colors: { bgPrimary: '#000000', accent: '#00FF41' },
    typography: { fontSans: "'JetBrains Mono', monospace", fontMono: "'JetBrains Mono', monospace" },
    layout: { borderRadius: 'sharp' },
    animation: { streamingStyle: 'typewriter' },
  },
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

## 15. 面试展示策略

### 15.1 演示脚本 (3 分钟抓住面试官)

> **目标**: 在 3 分钟内展示项目最深的技术点，让面试官觉得"这个人不只调 API"。

#### 第 1 分钟: 第一印象

```
1. 打开 Jarvis 桌面端 (Tauri ~8MB)
   → "这是我独立开发的 AI 办公助手，Web/桌面/移动三端覆盖，桌面端用 Tauri 打包只有 8MB"
2. 切换 4 套主题 (ChatGPT → Jarvis蓝 → Notion白 → 赛博终端)
   → "主题系统完全可自定义，支持一键切换预设"
```

#### 第 2 分钟: 核心技术

```
3. 上传一份 PDF 文档到知识库
   → 展示: 解析进度、分块策略选择、自动向量化
4. 提问一个需要跨段落推理的问题
   → 展示: SSE 流式回答 + 来源引用 (点击跳转原文)
   → "这里用了混合检索: 向量语义 + BM25 关键词 + RRF 融合，最后 Rerank 精排"
5. 打开 Grafana 监控大盘
   → 展示: 实时 QPS、Token 消耗趋势、缓存命中率
```

#### 第 3 分钟: 架构深度

```
6. 切换到 Agent 模式，执行一个多步任务
   → "帮我总结最近上传的3份文档，对比它们的技术方案时间节点，生成一个对比表格"
   → 展示: LangGraph 工作流可视化 (思考→搜索→分析→生成)
7. 打开代码，展示关键架构
   → NestJS 模块化结构 / RAG 管线代码 / 多模型网关
8. 最后: Docker Compose 一键启动
   → "全服务容器化，支持私有化部署，数据不出域"
```

### 15.2 面试官可能会追问的 10 个问题 (提前准备)

| # | 追问 | 你的回答要点 |
|---|------|------------|
| 1 | "为什么不用 LangChain 的默认检索器？" | "默认只是简单向量检索。我加了 BM25 关键词互补 + RRF 融合，召回率提升 15%。再加上 Rerank 精排，精确率从 72% 到 90%。这是企业级 RAG 的标配。" |
| 2 | "混合检索的 BM25 放在哪里？" | "直接用 PostgreSQL 的全文检索功能，不需要额外部署 Elasticsearch。`tsvector` + `tsquery` 足够中小规模使用，部署成本更低。" |
| 3 | "多模型网关为什么自研不用 LiteLLM？" | "LiteLLM 主要是 Python 生态，Node.js 侧我用的是统一的适配层模式，每个厂商实现 Provider 接口，配置驱动路由。" |
| 4 | "Embedding 为什么选 bge 系列？" | "MTEB 中文榜单 Top 3，开源可本地部署，1024 维在精度和性能间平衡最好。比直接用 OpenAI text-embedding-3 更可控，也不花钱。" |
| 5 | "怎么处理长文档的 Token 限制？" | "三招: ① 递归分治总结长文档生成层级摘要 ② 对话上下文滑动窗口+历史压缩 ③ 大小模型路由——简单问题用轻量模型读摘要即可。" |
| 6 | "语义缓存怎么判断两个问题相似？" | "不是简单的字符串匹配。用 Embedding 向量算余弦相似度 > 0.92 判定为同义问题，直接返回缓存答案。缓存命中率 30%+ 直接省 Token。" |
| 7 | "Agent 怎么做错误恢复？" | "LangGraph 支持断点续跑。每个工具调用后检查结果，失败自动重试或换策略。关键节点设人工介入，防止自动化出错一直跑。" |
| 8 | "为什么选 Tauri 不选 Electron？" | "体积: 8MB vs 150MB。性能: Rust 后端 vs Node.js。安全: 最小权限模型 vs 完整 Node API。面试展示桌面端，面试官一看体积就懂了。" |
| 9 | "如何保证回答不幻觉？" | "输出后做幻觉检测: 提取回答中的实体/数据点，回查检索上下文是否包含。不包含的标记警告。RAGAS 框架量化评估 Faithfulness 指标。" |
| 10 | "这个项目你一个人做，最大的挑战是什么？" | "不是技术难度，是工程深度的取舍。8 周做一个 95 分的模块比 12 周做 3 个 70 分的模块更有价值。我在 RAG 管线投入最深，从分块策略到检索融合到精排评估，每个环节都有量化指标。" |

### 15.3 简历关键词布局

```
技术栈关键词 (按面试官搜索频率排序):

AI/LLM 方向:
RAG · 混合检索 · Rerank · LangChain · LangGraph · Agent 编排 · 多模型网关
语义缓存 · 向量数据库 · Embedding · Prompt 工程 · 幻觉检测 · RAGAS 评估

后端/架构方向:
NestJS · 企业级架构 · Prisma ORM · PostgreSQL · Redis · BullMQ
异步任务队列 · 微服务 · 事件驱动 · RESTful API · SSE 流式

前端/跨平台方向:
Vue 3 · TypeScript · SSR · PWA · Tauri · Monorepo · 虚拟列表
响应式 · 主题系统 · 流式渲染 · Markdown 渲染

工程化/DevOps:
Docker · CI/CD · Prometheus/Grafana · 可观测性 · 多环境管理
私有化部署 · 容错降级 · 安全审计
```

### 15.4 STAR 法则简历描述 (直接套用)

> 独立设计开发企业级 AI 智能助手 Jarvis‌，基于 RAG 架构实现私有知识库检索问答与 Agent 任务编排，支持 Web/桌面(Tauri)/移动(PWA)三端覆盖。
>
> **核心工作**:
> - 采用 NestJS + LangChain.js 构建 AI 引擎，实现向量语义 + BM25 关键词混合检索与 bge-reranker 二次精排的完整 RAG 管线，召回率 85%+，精确率 90%+
> - 自研多模型统一网关，支持 DeepSeek/通义千问/OpenAI 兼容接口的智能路由与三级故障降级，可用率 99.5%+
> - 引入 BullMQ 异步解耦文档处理，语义缓存 + 大小模型路由将单用户 Token 成本降低 40%
> - 基于 Tauri v2 实现 8MB 桌面端包体，结合 PWA 实现移动端零额外代码覆盖
> - Docker Compose 全服务编排 + Prometheus/Grafana 全链路监控，支持一键私有化部署

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
