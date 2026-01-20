# Microsoft Teams 机器人集成计划

> **项目**: Claude Code Everywhere
> **文档版本**: 1.0
> **创建日期**: 2026-01-19
> **实施方式**: 设计文档 (不包含代码实施)

---

## 📋 目录

1. [需求概述](#需求概述)
2. [当前架构分析](#当前架构分析)
3. [改动规模评估](#改动规模评估)
4. [实施策略](#实施策略)
5. [详细实施指南](#详细实施指南)
6. [Cloudflare Tunnel 配置](#cloudflare-tunnel-配置)
7. [环境变量配置](#环境变量配置)
8. [测试验证](#测试验证)
9. [关键代码差异](#关键代码差异)
10. [潜在问题和解决方案](#潜在问题和解决方案)
11. [下一步行动](#下一步行动)

---

## 需求概述

将 Claude Code Everywhere 扩展为多平台支持，使其能够同时支持**钉钉**和 **Microsoft Teams** 机器人。

### 用户偏好

- ✅ **实施方式**: 仅设计不实施 (提供详细架构和实施文档)
- ✅ **部署方式**: Cloudflare Tunnel (复用现有预览服务的 cloudflared)
- ✅ **运行模式**: 单平台模式 (通过 PLATFORM 环境变量切换)

---

## 当前架构分析

### 钉钉集成现状

**耦合程度**: 中高度耦合

#### 紧密耦合部分

3 个核心文件直接依赖钉钉 SDK:

| 文件 | 依赖 | 用途 |
|------|------|------|
| `src/index.ts` | DWClient, TOPIC_ROBOT | 创建客户端、注册回调 |
| `src/handlers/message-handler.ts` | DWClientDownStream | 消息事件类型 |
| `src/services/notifier.ts` | 钉钉消息格式 | 发送通知 |

#### 平台无关部分

核心业务逻辑已经独立:

- ✅ Claude Agent Service (`src/services/agent.ts`)
- ✅ 预览服务 (`src/services/preview.ts`)
- ✅ 数据库层 (`src/services/database.ts`)
- ✅ 工作目录管理 (`src/repositories/working-directory.ts`)

### 钉钉集成流程

```
用户@机器人 → 钉钉服务器
  ↓ (WebSocket Stream)
DWClient.registerCallbackListener(TOPIC_ROBOT)
  ↓
MessageHandler.handle(DWClientDownStream)
  ↓ 解析消息
  ↓ 同步回复: client.socketCallBackResponse()
  ↓ 后台执行 Claude Agent
  ↓ 异步通知: POST sessionWebhook
```

---

## 改动规模评估

### 改动分类

| 改动类型 | 是否需要 | 说明 |
|---------|---------|------|
| 小改动 | ❌ | 需要重构架构层 |
| **中等改动** | ✅ | **3-4 周工作量** |
| 大改动 | ❌ | 核心业务逻辑无需改动 |

### 具体工作量

- **抽象接口设计**: 3-5 天
- **重构现有代码**: 5-7 天
- **Teams 适配器实现**: 5-7 天
- **测试和调试**: 3-5 天
- **总计**: **2-3 周** (按每天 4-6 小时计算)

### 改动分布

```
架构重构: 60% ████████████
Teams 适配器: 30% ██████
测试和文档: 10% ██
```

---

## 实施策略

### 阶段 1: 抽象层设计 (第 1 周)

创建统一的接口层，解耦平台特定逻辑。

**核心接口**:

1. `PlatformAdapter` - 平台适配器接口
2. `Notifier` - 通知服务接口
3. `MessageEvent` - 统一消息事件格式
4. `MessageResponse` - 统一消息响应格式

### 阶段 2: 重构钉钉代码 (第 1-2 周)

将现有钉钉代码改造为适配器模式:

1. 创建 `DingTalkAdapter` 实现 `PlatformAdapter`
2. 创建 `DingTalkNotifier` 实现 `Notifier`
3. 修改 `MessageHandler` 使用接口类型
4. 修改 `src/index.ts` 支持平台选择

### 阶段 3: 实现 Teams 适配器 (第 2-3 周)

基于 Microsoft Bot Framework SDK 实现:

1. 安装 `botbuilder` 和 `botframework-connector`
2. 创建 `TeamsAdapter` 处理 HTTP Webhook
3. 实现 ConversationReference 存储 (用于异步消息)
4. 处理 Teams 特定的消息格式

### 阶段 4: 配置和部署 (第 3 周)

1. 配置 Cloudflare Tunnel
2. 注册 Azure Bot
3. 配置环境变量
4. 测试和文档

---

## 详细实施指南

### 步骤 1: 创建抽象层接口

#### 1.1 创建 `src/abstractions/platform-adapter.ts`

```typescript
/**
 * 统一的消息事件接口
 */
export interface MessageEvent {
  messageId: string;        // 消息唯一 ID (用于去重)
  content: string;          // 消息文本内容
  replyUrl: string;         // 异步回复地址
  userId?: string;          // 用户标识
  metadata?: Record<string, any>;  // 平台特定元数据
}

/**
 * 统一的消息响应接口
 */
export interface MessageResponse {
  type: 'text' | 'markdown' | 'card';
  content: string;
  title?: string;
  metadata?: Record<string, any>;
}

/**
 * 平台适配器接口
 */
export interface PlatformAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(handler: (event: MessageEvent) => Promise<MessageResponse | void>): void;
  sendAsync(replyUrl: string, message: MessageResponse): Promise<void>;
  getPlatformName(): string;
}
```

**设计要点**:

- `MessageEvent.replyUrl` - 统一抽象
  - 钉钉: `sessionWebhook`
  - Teams: `conversationId`
- `MessageResponse` - 三种类型覆盖常见场景
- 平台特定逻辑封装在适配器内部

#### 1.2 创建 `src/abstractions/notifier.ts`

```typescript
export interface Notifier {
  sendText(url: string, content: string): Promise<void>;
  sendMarkdown(url: string, title: string, content: string): Promise<void>;
  sendMessage(url: string, message: MessageResponse): Promise<void>;
}
```

---

### 步骤 2: 实现钉钉适配器

#### 2.1 创建 `src/adapters/dingtalk/dingtalk-adapter.ts`

**主要工作**:

1. 从 `src/index.ts` 移动 `DWClient` 相关代码
2. 实现 `PlatformAdapter` 接口
3. 转换钉钉事件 ↔ `MessageEvent`

**核心方法**:

```typescript
export class DingTalkAdapter implements PlatformAdapter {
  private client: DWClient;

  async connect(): Promise<void> {
    this.client.registerCallbackListener(TOPIC_ROBOT, async (event) => {
      const messageEvent = this.convertToMessageEvent(event);
      const response = await this.messageHandler?.(messageEvent);
      if (response) {
        this.client.socketCallBackResponse(
          event.headers.messageId,
          this.convertToDingTalkResponse(response)
        );
      }
    });
    await this.client.connect();
  }

  private convertToMessageEvent(event: DWClientDownStream): MessageEvent {
    const data = JSON.parse(event.data);
    return {
      messageId: event.headers?.messageId || '',
      content: data.text?.content?.trim() || '',
      replyUrl: data.sessionWebhook || '',  // 钉钉的 webhook
      userId: data.senderId,
    };
  }

  private convertToDingTalkResponse(message: MessageResponse): any {
    if (message.type === 'text') {
      return { msgtype: 'text', text: { content: message.content } };
    } else if (message.type === 'markdown') {
      return {
        msgtype: 'markdown',
        markdown: { title: message.title || '消息', text: message.content }
      };
    }
  }
}
```

#### 2.2 创建 `src/adapters/dingtalk/dingtalk-notifier.ts`

移动 `src/services/notifier.ts` 中的代码并实现 `Notifier` 接口。

---

### 步骤 3: 重构现有代码

#### 3.1 修改 `src/handlers/message-handler.ts`

**Before**:
```typescript
import { DWClientDownStream } from 'dingtalk-stream';
import { DingTalkNotifier } from '../services/notifier';

async handle(event: DWClientDownStream): Promise<{ text: string }> {
  const data = JSON.parse(event.data);
  const notifier = new DingTalkNotifier(data.sessionWebhook);
  // ...
}
```

**After**:
```typescript
import { MessageEvent, MessageResponse } from '../abstractions/platform-adapter';
import { Notifier } from '../abstractions/notifier';

constructor(
  private createNotifier: (url: string) => Notifier  // 工厂函数
) {}

async handle(event: MessageEvent): Promise<MessageResponse | void> {
  const { messageId, content, replyUrl } = event;
  const notifier = this.createNotifier(replyUrl);
  // ...
  return { type: 'text', content: '任务已接收' };
}
```

#### 3.2 修改 `src/index.ts`

**核心改动**:

```typescript
// 根据环境变量选择平台
const platform = process.env.PLATFORM || 'dingtalk';
const adapter = createAdapter(platform, config);

// 注册消息处理器
adapter.onMessage(async (event) => {
  return await messageHandler.handle(event);
});

// 连接平台
await adapter.connect();
console.log(`✅ 已连接到${adapter.getPlatformName()}`);

function createAdapter(platform: string, config: Config): PlatformAdapter {
  if (platform === 'dingtalk') {
    return new DingTalkAdapter(config.dingtalk!);
  } else if (platform === 'teams') {
    return new TeamsAdapter(config.teams!);
  }
  throw new Error(`不支持的平台: ${platform}`);
}
```

---

### 步骤 4: 实现 Teams 适配器

#### 4.1 安装依赖

```bash
npm install botbuilder botframework-connector
npm install --save-dev @types/botbuilder @types/botframework-connector
```

#### 4.2 创建 `src/adapters/teams/teams-adapter.ts`

**关键差异**:

| 特性 | 钉钉 | Teams |
|------|------|-------|
| 连接方式 | WebSocket Stream | HTTP Webhook |
| 认证 | ClientId + Secret | App ID + Password |
| 异步发送 | POST webhook | `adapter.continueConversation()` |

**核心代码**:

```typescript
import { BotFrameworkAdapter, TurnContext, ConversationReference } from 'botbuilder';
import express from 'express';

export class TeamsAdapter implements PlatformAdapter {
  private adapter: BotFrameworkAdapter;
  private app: express.Express;
  private conversationStore: ConversationStore;

  constructor(config: TeamsConfig) {
    this.adapter = new BotFrameworkAdapter({
      appId: config.appId,
      appPassword: config.appPassword,
    });
    this.app = express();
    this.conversationStore = new ConversationStore();
  }

  async connect(): Promise<void> {
    // 设置 /api/messages 端点
    this.app.post('/api/messages', (req, res) => {
      this.adapter.processActivity(req, res, async (context) => {
        await this.handleActivity(context);
      });
    });

    // 启动 HTTP 服务器
    this.server = this.app.listen(this.config.port);
  }

  private async handleActivity(context: TurnContext): Promise<void> {
    if (context.activity.type === 'message') {
      // 保存 conversation reference (用于异步回复)
      const conversationRef = TurnContext.getConversationReference(context.activity);
      this.conversationStore.set(context.activity.conversation.id, conversationRef);

      // 转换为统一的 MessageEvent
      const event = this.convertToMessageEvent(context);
      const response = await this.messageHandler?.(event);

      // 同步回复
      if (response) {
        await context.sendActivity(this.convertToActivity(response));
      }
    }
  }

  async sendAsync(replyUrl: string, message: MessageResponse): Promise<void> {
    // replyUrl 是 conversationId
    const conversationRef = this.conversationStore.get(replyUrl);

    // 使用 continueConversation 发送主动消息
    await this.adapter.continueConversation(conversationRef, async (context) => {
      await context.sendActivity(this.convertToActivity(message));
    });
  }
}
```

#### 4.3 创建 `src/adapters/teams/conversation-store.ts`

```typescript
import { ConversationReference } from 'botbuilder';

export class ConversationStore {
  private store = new Map<string, ConversationReference>();

  set(conversationId: string, ref: ConversationReference): void {
    this.store.set(conversationId, ref);
  }

  get(conversationId: string): ConversationReference | undefined {
    return this.store.get(conversationId);
  }
}
```

**注意**: 生产环境建议持久化到数据库。

---

## Cloudflare Tunnel 配置

### 优势

- ✅ 固定域名 (不像 ngrok 免费版每次随机)
- ✅ 已有 cloudflared 安装 (预览功能在用)
- ✅ 免费且稳定
- ✅ 支持自定义域名

### 配置步骤

#### 1. 创建 Tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create claude-teams-bot
```

#### 2. 配置路由文件

**文件**: `cloudflare-tunnel.yml`

```yaml
tunnel: <your-tunnel-id>
credentials-file: /path/to/<your-tunnel-id>.json

ingress:
  # Teams Bot webhook (新增)
  - hostname: teams-bot.yourdomain.com
    service: http://localhost:3978
    path: /api/messages

  # 现有的预览服务
  - hostname: preview.yourdomain.com
    service: http://localhost:3000

  # 默认规则 (必需)
  - service: http_status:404
```

#### 3. 运行 Tunnel

```bash
cloudflared tunnel run --config cloudflare-tunnel.yml
```

#### 4. 配置 DNS

在 Cloudflare Dashboard 中添加 CNAME 记录:

```
teams-bot.yourdomain.com CNAME <tunnel-id>.cfargotunnel.com
```

#### 5. 在 Azure Bot 中配置

1. 登录 [Azure Portal](https://portal.azure.com)
2. 找到你的 Bot 资源
3. 设置 > Configuration > Messaging endpoint
4. 填入: `https://teams-bot.yourdomain.com/api/messages`

---

## 环境变量配置

### 钉钉模式 (`.env.dingtalk`)

```bash
# 平台选择
PLATFORM=dingtalk

# 钉钉配置
DINGTALK_CLIENT_ID=your_client_id
DINGTALK_CLIENT_SECRET=your_client_secret

# 通用配置
ALLOWED_ROOT_DIR=/Users/yourname/projects
DB_PATH=./data/data.db
```

### Teams 模式 (`.env.teams`)

```bash
# 平台选择
PLATFORM=teams

# Teams 配置
TEAMS_APP_ID=your_app_id
TEAMS_APP_PASSWORD=your_app_password
TEAMS_PORT=3978

# 通用配置
ALLOWED_ROOT_DIR=/Users/yourname/projects
DB_PATH=./data/data.db
```

### 启动脚本

**package.json**:

```json
{
  "scripts": {
    "start": "node dist/index.js",
    "start:dingtalk": "cp .env.dingtalk .env && npm start",
    "start:teams": "cp .env.teams .env && npm start",
    "dev:teams": "cp .env.teams .env && npm run dev"
  }
}
```

**使用**:

```bash
# 启动钉钉模式
npm run start:dingtalk

# 启动 Teams 模式
npm run start:teams
```

---

## 测试验证

### 钉钉功能回归测试

```bash
# 1. 切换到钉钉模式
cp .env.dingtalk .env
npm start

# 2. 在钉钉群中测试
@机器人 帮我检查代码
@机器人 /d ls
@机器人 [dir:blog] 帮我添加功能

# 3. 验证功能
✅ 任务执行正常
✅ 命令解析正确
✅ 预览功能工作
✅ 工作目录切换正常
```

### Teams 功能测试

```bash
# 1. 启动 Cloudflare Tunnel
cloudflared tunnel run --config cloudflare-tunnel.yml

# 2. 切换到 Teams 模式
cp .env.teams .env
npm start

# 3. 在 Teams 中测试
@YourBot 帮我检查代码
@YourBot /d ls
@YourBot [dir:blog] 帮我添加功能

# 4. 验证功能
✅ Bot 响应正常
✅ 消息格式正确
✅ 命令执行成功
✅ 异步通知送达
```

---

## 关键代码差异

### 钉钉 vs Teams 对比

| 特性 | 钉钉 | Teams |
|------|------|-------|
| **连接方式** | WebSocket Stream (主动推送) | HTTP Webhook (被动接收) |
| **认证** | ClientId + ClientSecret | App ID + App Password (Azure AD) |
| **消息接收** | Stream事件 `DWClientDownStream` | HTTP POST `/api/messages` |
| **同步回复** | `client.socketCallBackResponse()` | HTTP 响应中直接返回 Activity |
| **异步发送** | 直接 POST 到 `sessionWebhook` | `adapter.continueConversation()` + ConversationReference |
| **消息格式** | `{ msgtype, text/markdown }` | Activity 对象 (支持 Adaptive Cards) |
| **部署** | 无需公网 (Stream) | 需要公网 URL (Webhook) |

### 消息流对比

**钉钉流程**:

```
用户 → 钉钉服务器 → WebSocket Stream → DWClient
  → DingTalkAdapter.convertToMessageEvent()
  → MessageHandler.handle()
  → 同步响应: client.socketCallBackResponse()
  → 异步通知: POST sessionWebhook
```

**Teams 流程**:

```
用户 → Teams 服务器 → HTTP POST /api/messages → Express
  → BotFrameworkAdapter.processActivity()
  → TeamsAdapter.handleActivity()
  → TeamsAdapter.convertToMessageEvent()
  → MessageHandler.handle()
  → 同步响应: context.sendActivity()
  → 异步通知: adapter.continueConversation()
```

---

## 潜在问题和解决方案

### 问题 1: Teams Conversation Reference 丢失

**场景**: 应用重启后，无法发送异步消息

**解决方案**: 持久化 ConversationReference 到数据库

```typescript
export class ConversationStore {
  constructor(private db: DatabaseService) {}

  async set(conversationId: string, ref: ConversationReference): Promise<void> {
    await this.db.run(
      'INSERT OR REPLACE INTO conversation_references (conversation_id, reference, updated_at) VALUES (?, ?, ?)',
      [conversationId, JSON.stringify(ref), Date.now()]
    );
  }

  async get(conversationId: string): Promise<ConversationReference | undefined> {
    const row = await this.db.get(
      'SELECT reference FROM conversation_references WHERE conversation_id = ?',
      [conversationId]
    );
    return row ? JSON.parse(row.reference) : undefined;
  }
}
```

**数据库 Schema**:

```sql
CREATE TABLE IF NOT EXISTS conversation_references (
  conversation_id TEXT PRIMARY KEY,
  reference TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### 问题 2: Teams 消息长度限制

**场景**: Claude 返回的消息过长 (>28KB)

**解决方案**: 分片发送

```typescript
private async sendLongMessage(context: TurnContext, content: string): Promise<void> {
  const MAX_LENGTH = 25000;  // 留一些余量

  if (content.length <= MAX_LENGTH) {
    await context.sendActivity({ type: 'message', text: content });
    return;
  }

  // 分片发送
  const chunks = this.splitIntoChunks(content, MAX_LENGTH);
  for (const chunk of chunks) {
    await context.sendActivity({ type: 'message', text: chunk });
    await new Promise(resolve => setTimeout(resolve, 100));  // 避免限流
  }
}
```

### 问题 3: Cloudflare Tunnel 断线

**场景**: Tunnel 进程意外退出

**解决方案**: 使用 systemd 守护进程

**文件**: `/etc/systemd/system/cloudflare-tunnel.service`

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=youruser
ExecStart=/usr/local/bin/cloudflared tunnel run --config /path/to/config.yml
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**启动**:

```bash
sudo systemctl enable cloudflare-tunnel
sudo systemctl start cloudflare-tunnel
sudo systemctl status cloudflare-tunnel
```

---

## 文件清单

### 新增文件

```
src/abstractions/
  platform-adapter.ts       ✅ 平台适配器接口
  notifier.ts              ✅ 通知服务接口

src/adapters/dingtalk/
  dingtalk-adapter.ts      ✅ 钉钉适配器
  dingtalk-notifier.ts     ✅ 钉钉通知器

src/adapters/teams/
  teams-adapter.ts         ✅ Teams 适配器
  teams-notifier.ts        ✅ Teams 通知器
  conversation-store.ts    ✅ Conversation 存储

tests/adapters/
  dingtalk-adapter.test.ts ✅ 钉钉适配器测试
  teams-adapter.test.ts    ✅ Teams 适配器测试

docs/
  TEAMS_SETUP.md           ✅ Teams 配置文档

.env.dingtalk              ✅ 钉钉环境变量
.env.teams                 ✅ Teams 环境变量
cloudflare-tunnel.yml      ✅ Tunnel 配置
```

### 修改文件

```
src/index.ts                ✅ 平台选择逻辑
src/config.ts               ✅ 多平台配置
src/handlers/message-handler.ts  ✅ 使用接口类型
src/handlers/command-handler.ts  ✅ 使用接口类型
package.json                ✅ 添加依赖和脚本
README.md                   ✅ 更新文档
```

### 删除文件

```
src/services/notifier.ts    ❌ 移动到 adapters/dingtalk/
```

---

## 最终架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        主应用                                │
│  (src/index.ts)                                            │
│                                                             │
│  ┌──────────┐                                              │
│  │ 平台选择 │ (PLATFORM env var)                           │
│  └────┬─────┘                                              │
│       │                                                     │
│  ┌────▼─────┐         ┌─────────┐                         │
│  │ 创建适配器│ ───────▶│ Adapter │                         │
│  └────┬─────┘         └─────────┘                         │
│       │                                                     │
│  ┌────▼──────────────────────────────┐                    │
│  │     MessageHandler                │                    │
│  │  (平台无关)                        │                    │
│  └────┬──────────────────────────────┘                    │
│       │                                                     │
│  ┌────▼──────────┐  ┌──────────────┐                     │
│  │ CommandHandler│  │ Claude Agent │                     │
│  └───────────────┘  └──────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐
│ 钉钉适配器   │         │ Teams 适配器  │
│              │         │              │
│ DWClient     │         │ BotFramework │
│ WebSocket    │         │ HTTP Webhook │
└──────────────┘         └──────────────┘
      ▲                         ▲
      │                         │
┌─────┴──────┐           ┌─────┴──────┐
│ 钉钉服务器  │           │ Teams 服务器│
└────────────┘           └────────────┘
```

---

## 下一步行动

### 实施步骤

1. ✅ **阅读计划**: 仔细阅读本计划，确认理解所有步骤
2. 📝 **准备环境**: 注册 Azure Bot，获取 App ID 和 Password
3. 🔨 **按步实施**: 按照步骤 1-8 逐步实施
4. 🧪 **测试验证**: 每完成一个步骤，进行测试
5. 📚 **文档记录**: 记录遇到的问题和解决方案

### 预计工作量

**总时长**: 2-3 周 (按每天 4-6 小时计算)

### 建议里程碑

- **第 1 周末**: 完成抽象层和钉钉重构，回归测试通过
- **第 2 周末**: 完成 Teams 适配器，本地测试通过
- **第 3 周末**: Cloudflare Tunnel 部署成功，文档完成

---

## 总结

### 核心优势

- ✅ 核心业务逻辑无需改动
- ✅ 单平台模式简化架构
- ✅ Cloudflare Tunnel 复用现有基础设施
- ✅ 易于扩展更多平台 (Slack, 企业微信等)

### 技术栈

- **抽象层**: TypeScript 接口
- **Teams SDK**: `botbuilder` + `botframework-connector`
- **部署**: Cloudflare Tunnel (已有)
- **配置**: 环境变量切换 (PLATFORM=teams)

### 风险评估

| 风险 | 级别 | 缓解措施 |
|------|------|---------|
| ConversationReference 丢失 | 中 | 持久化到数据库 |
| 消息长度限制 | 低 | 分片发送 |
| Tunnel 断线 | 低 | systemd 守护进程 |

---

**文档结束**
