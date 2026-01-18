# Remote Claude

通过钉钉远程控制 Claude Code，让 AI 编程助手随时待命。

## 特性

- **远程触发** - 在钉钉群 @机器人发送任务，自动调用本地 Claude Code 执行
- **工作目录管理** - 通过别名快速切换项目，支持简写命令
- **预览管理** - 自动启动项目预览，通过 Cloudflare Tunnel 提供访问 URL
- **命令简写** - 简洁易记的命令格式（`/d`, `/p`, `-desc`, `-cmd` 等）

## 快速开始

### 1. 安装

```bash
git clone https://github.com/your-org/remote-claude.git
cd remote-claude
npm install
```

### 2. 配置钉钉机器人

1. 登录 [钉钉开放平台](https://open.dingtalk.com)
2. 创建企业内部应用 → 添加机器人能力
3. 消息接收模式选择 **Stream 模式**
4. 复制 Client ID 和 Client Secret

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```bash
# 钉钉应用凭证（必需）
DINGTALK_CLIENT_ID=your_client_id
DINGTALK_CLIENT_SECRET=your_client_secret

# 安全配置（强烈推荐）
# 所有工作目录必须在此根目录下
ALLOWED_ROOT_DIR=/Users/yourname/projects

# 数据库路径（可选，默认为项目 data/ 目录）
# DB_PATH=~/custom/path
```

**安全提示**：强烈建议配置 `ALLOWED_ROOT_DIR`，限制所有操作在指定目录下。详见 [SECURITY.md](SECURITY.md)。

### 4. 启动服务

```bash
npm start
```

看到 `✅ 已连接到钉钉，等待消息...` 表示启动成功。

## 基本使用

### 配置工作目录

首次使用需要添加工作目录（支持简写命令）：

```bash
# 添加项目（使用简写命令）
@机器人 /d a blog my-blog -desc "个人博客" -p -cmd "npm run dev" -d

# 添加更多项目
@机器人 /d a web sites/portfolio -desc "作品集网站"

# 查看所有配置
@机器人 /d ls
```

**路径说明**：
- 配置了 `ALLOWED_ROOT_DIR`：只能使用相对路径（如 `my-blog`）
- 未配置 `ALLOWED_ROOT_DIR`：必须使用完整路径（如 `/Users/xxx/my-blog`）

### 使用 Claude Code

```bash
# 使用默认目录
@机器人 帮我检查代码有没有 bug

# 使用别名切换目录
@机器人 [dir:blog] 帮我写一篇新文章

# 使用完整路径
@机器人 [dir:/Users/xxx/project] 分析这个项目

# 开启新会话（忘记之前的上下文）
@机器人 [new] 重新开始
```

### 预览管理

为项目启用预览后，Claude Code 完成任务会自动启动项目并提供访问 URL：

```bash
# 添加时启用预览（-p 表示启用，-cmd 指定启动命令）
@机器人 /d a blog my-blog -p -cmd "npm run dev" -po 3000

# 手动管理预览
@机器人 /p s blog      # 启动预览
@机器人 /p st          # 查看状态
@机器人 /p x blog      # 停止预览
```

**前提条件**：需要安装 cloudflared 工具（用于生成临时访问 URL）。

## 使用场景

### 1. 博客写作

```bash
@机器人 /d a blog my-blog -p -cmd "npm run dev" -d

# 日常使用
@机器人 写一篇关于 TypeScript 的文章
@机器人 优化首页的 SEO
@机器人 修复移动端样式问题
# → Claude Code 完成后自动启动预览并提供 URL
```

### 2. 多项目管理

```bash
# 配置多个项目（使用简写）
@机器人 /d a web-a client/web-app
@机器人 /d a api-a server/api
@机器人 /d a docs documentation

# 快速切换
@机器人 [dir:web-a] 添加登录页面
@机器人 [dir:api-a] 实现用户认证接口
@机器人 [dir:docs] 更新 API 文档
```

### 3. 外出移动办公

```bash
# 在咖啡厅用手机处理紧急需求
@机器人 [dir:api] 紧急修复登录接口的 bug
@机器人 [dir:web] 临时关闭维护中的功能

# 在家用 iPad 继续工作
@机器人 [dir:blog] 继续写昨天的文章
```

## 核心命令

### 工作目录管理
| 命令 | 简写 | 说明 |
|------|------|------|
| `/dir add` | `/d a` | 添加工作目录 |
| `/dir list` | `/d ls` | 列出所有目录 |
| `/dir info` | `/d i` | 查看目录详情 |
| `/dir default` | `/d d` | 设置默认目录 |
| `/dir update` | `/d u` | 更新目录配置 |
| `/dir remove` | `/d rm` | 删除目录 |

### 预览管理
| 命令 | 简写 | 说明 |
|------|------|------|
| `/preview start` | `/p s` | 启动预览 |
| `/preview stop` | `/p x` | 停止预览 |
| `/preview stop-all` | `/p xa` | 停止所有预览 |
| `/preview status` | `/p st` | 查看预览状态 |

### 选项简写
| 选项 | 简写 | 说明 |
|------|------|------|
| `--description` | `-desc` | 描述信息 |
| `--preview` | `-p` | 启用预览 |
| `--start-cmd` | `-cmd` | 启动命令 |
| `--port` | `-po` | 预览端口 |
| `--default` | `-d` | 设为默认 |

发送 `@机器人 /h` 查看完整帮助。

## 架构

```
┌─────────────┐
│  钉钉群消息  │
└──────┬──────┘
       │
       ↓
┌──────────────────┐
│  钉钉 Stream 服务  │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐     ┌──────────────┐
│  本地 Worker 服务 │ ←→ │ SQLite 数据库 │
└──────┬───────────┘     └──────────────┘
       │                   (工作目录配置)
       ↓
┌──────────────────┐
│   Claude Code    │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   钉钉群回复      │
└──────────────────┘
```

## 目录结构

```
remote-claude/
├── src/
│   ├── index.ts                 # 主入口
│   ├── config.ts                # 配置加载
│   ├── state.ts                 # 应用状态
│   ├── handlers/
│   │   ├── message-handler.ts  # 消息处理
│   │   └── command-handler.ts  # 命令处理
│   ├── services/
│   │   ├── database.ts          # 数据库服务
│   │   ├── message-parser.ts   # 消息解析
│   │   ├── claude.ts            # Claude CLI 调用
│   │   ├── deploy.ts            # 自动部署
│   │   └── notifier.ts          # 钉钉通知
│   ├── repositories/
│   │   └── working-directory.ts # 工作目录仓库
│   ├── types/
│   │   └── database.ts          # 数据库类型
│   └── utils/
│       ├── shell.ts             # Shell 执行
│       ├── path.ts              # 路径工具
│       └── logger.ts            # 日志工具
├── data/
│   └── data.db                  # SQLite 数据库
├── .env                         # 环境变量
└── package.json
```

## 常见问题

**Q: 删除工作目录配置会删除实际文件吗？**

A: 不会。`/dir remove` 只会删除数据库中的配置，不影响实际文件。

**Q: 可以同时处理多个任务吗？**

A: 不可以。为了避免冲突，同一时间只能处理一个任务。如果有任务正在执行，新任务会被拒绝。

**Q: 如何备份配置？**

A: 配置存储在项目的 `data/data.db` 文件（可通过 `DB_PATH` 配置），直接复制该文件即可备份。

**Q: 预览功能需要什么前置条件？**

A: 需要安装 [cloudflared](https://github.com/cloudflare/cloudflared) 工具。预览功能会自动启动项目并通过 Cloudflare Tunnel 生成临时访问 URL。

**Q: 如何查看完整的命令列表？**

A: 在钉钉群中发送 `@机器人 /h` 查看完整命令帮助。

## 开发

```bash
# 开发模式（自动重启）
npm run dev

# 运行测试
npm test

# 编译检查
npx tsc --noEmit
```

## 文档

- [CLAUDE.md](CLAUDE.md) - Claude Code 项目指南
- [tests/README.md](tests/README.md) - 测试套件说明
- [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript) 

## License

MIT
