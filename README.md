# Claude Code Everywhere

通过钉钉远程控制 Claude Code，让 AI 编程助手随时待命。

## 特性

- **🤖 AI 智能交互** - 使用自然语言描述需求，AI 自动理解并执行操作
- **📱 钉钉远程控制** - 在钉钉群 @机器人发送任务，自动调用本地 Claude Code 执行
- **🌐 Web 管理界面** - 直观的图形界面管理工作目录和预览服务，支持 JWT 认证
- **📁 工作目录管理** - 通过别名快速切换项目，支持默认目录设置
- **🔍 预览管理** - 自动启动项目预览，通过 Cloudflare Tunnel 提供访问 URL
- **💬 聊天历史** - 记录每个项目的对话历史，方便追溯和查询
- **🔒 安全可控** - 智能确认机制，危险操作自动请求确认

## 快速开始

### 1. 安装

```bash
git clone https://github.com/your-org/claude-code-everywhere.git
cd claude-code-everywhere
npm install
```

### 2. 配置钉钉机器人

#### 2.1 创建钉钉应用

1. 登录 [钉钉开放平台](https://open.dingtalk.com)
2. 进入「应用开发」，点击「创建应用」
3. 填写应用信息：
   - 应用名称（如 "Claude Code Remote"）
   - 应用描述
   - 选择应用图标
4. 保存后进入应用详情

#### 2.2 添加机器人能力

1. 在应用详情页，点击「添加能力」→「机器人」
2. 填写机器人信息：
   - 机器人名称
   - 机器人图标
   - 简介和描述
   - **消息接收模式**：选择「Stream 模式」（重要）
3. 发布机器人

#### 2.3 发布应用版本

1. 回到应用主页，进入「应用发布」→「版本管理与发布」
2. 点击「创建新版本」
3. 填写版本信息：
   - 版本号（如 1.0.0）
   - 版本描述
   - 选择应用可用范围（选择需要使用的部门或人员）
4. 保存并发布版本

#### 2.4 获取应用凭证

1. 回到应用主页，进入「凭证与基础信息」
2. 复制 **Client ID** 和 **Client Secret**（下一步配置环境变量时使用）

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

# Web 管理界面配置（推荐）
WEB_ENABLED=true
WEB_PORT=3001
WEB_ADMIN_USERNAME=admin
WEB_ADMIN_PASSWORD_HASH=<使用 npm run hash-password 生成>
WEB_JWT_SECRET=<使用 npm run hash-password 生成>
WEB_JWT_EXPIRES_IN=2h

# 数据库路径（可选，默认为项目 data/ 目录）
# DB_PATH=~/custom/path
```

**生成密码哈希和 JWT 密钥**：

```bash
npm run hash-password
```

**安全提示**：强烈建议配置 `ALLOWED_ROOT_DIR`，限制所有操作在指定目录下。详见 [SECURITY.md](SECURITY.md)。

### 4. 启动服务

```bash
npm start
```

看到 `✅ 已连接到钉钉，等待消息...` 和 `🌐 Web 管理界面: http://127.0.0.1:3001` 表示启动成功。

## 基本使用

### Web 管理界面

访问 `http://127.0.0.1:3001` 使用图形界面管理：

- **登录认证**：使用配置的管理员用户名和密码登录
- **工作目录管理**：添加、编辑、删除工作目录，设置默认目录
- **预览服务管理**：启动、停止、查看预览服务状态
- **系统信息**：查看系统状态、安全配置、核心功能

### 钉钉远程控制

#### 添加机器人到群聊

在开始使用前，需要先将机器人添加到钉钉群聊：

1. 打开钉钉 App，创建一个群聊（或使用已有群聊）
2. 点击群聊右上角「···」→「智能群助手」→「添加机器人」
3. 在「企业自建机器人」中选择您创建的机器人
4. 确认添加

完成后，在群里 @机器人 即可开始对话。如需单独对话（无需 @），管理员可以点击机器人头像选择「发消息」。

#### 快速开始

直接用自然语言描述需求，AI 会自动理解并执行：

```bash
# 1. 添加工作目录
@机器人 添加目录 blog /path/to/blog 描述是个人博客 并设为默认

# 2. 开始使用 Claude Code
@机器人 帮我检查代码有没有 bug

# 3. 启用预览功能（可选）
@机器人 给 blog 启用预览，启动命令是 npm run dev
```

#### 常用操作示例

```bash
# 工作目录管理
@机器人 列出所有目录
@机器人 查看 blog 的详情
@机器人 把 blog 设为默认目录

# 开发任务
@机器人 在 blog 项目中优化性能
@机器人 帮我在 api 项目里添加用户认证

# 预览管理
@机器人 启动 blog 的预览
@机器人 查看预览状态
@机器人 停止 blog 的预览

# 查看历史
@机器人 查看 blog 的聊天历史

# 帮助
@机器人 帮助
```

> 📖 完整使用文档请查看 [docs/USAGE.md](docs/USAGE.md)

## 使用场景

### 博客写作

```bash
@机器人 添加目录 blog /path/to/blog 启用预览 启动命令是 npm run dev 并设为默认
@机器人 写一篇关于 TypeScript 的文章
# → Claude Code 完成后自动启动预览并提供访问 URL
```

### 多项目管理

```bash
@机器人 添加目录 web /path/to/web-app
@机器人 添加目录 api /path/to/api
@机器人 在 web 项目中添加登录页面
@机器人 在 api 项目里实现用户认证
```

### 移动办公

```bash
# 在咖啡厅用手机处理紧急需求
@机器人 在 api 项目中紧急修复登录接口的 bug
```

> 📖 更多使用场景和详细说明请查看 [docs/USAGE.md](docs/USAGE.md)

## 架构

```
钉钉群 @机器人 → 钉钉 Stream → 本地 Worker → AI 意图识别 → Claude Agent SDK → 钉钉回复
                                         ↓
                                    SQLite 数据库
                          (工作目录 + 预览服务 + 聊天历史)
```

核心流程：
1. **消息接收**：通过钉钉 Stream 接收用户消息
2. **AI 意图识别**：使用 LLM 分析自然语言，识别用户意图和操作类型
3. **操作执行**：根据识别结果调用对应的处理器（目录管理、预览控制、任务执行等）
4. **结果反馈**：通过钉钉 Webhook 发送执行结果

## 常见问题

**Q: 如何安装 cloudflared（预览功能需要）？**

A: 查看 [docs/PREVIEW_SETUP.md](docs/PREVIEW_SETUP.md) 获取详细安装说明。

**Q: 如何使用自然语言操作？**

A: 直接描述需求即可，无需记忆命令格式。例如："添加目录 blog /path/to/blog"、"启动 blog 的预览"、"查看聊天历史"。AI 会自动理解并执行。

**Q: 删除工作目录配置会删除实际文件吗？**

A: 不会。删除操作只会删除数据库中的配置，不影响实际文件系统。

**Q: 可以同时处理多个任务吗？**

A: 不可以。为了避免冲突，同一时间只能处理一个 Claude Code 任务。

> 📖 更多常见问题请查看 [docs/USAGE.md](docs/USAGE.md#常见问题)

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

- [docs/USAGE.md](docs/USAGE.md) - 完整使用手册（AI 智能交互、工作目录、预览功能）
- [docs/PREVIEW_SETUP.md](docs/PREVIEW_SETUP.md) - 预览功能配置指南（Cloudflare Tunnel 安装和使用）
- [docs/SECURITY.md](docs/SECURITY.md) - 安全配置指南（路径限制、权限控制）
- [.claude/CLAUDE.md](.claude/CLAUDE.md) - 项目开发指南（架构、编码规范）
- [tests/README.md](tests/README.md) - 测试套件说明

## License

MIT
