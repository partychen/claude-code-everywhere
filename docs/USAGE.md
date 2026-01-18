# 使用手册

完整的 Remote Claude 使用指南。

## 目录

- [消息格式](#消息格式)
- [命令系统](#命令系统)
  - [工作目录管理](#工作目录管理)
  - [预览管理](#预览管理)
  - [帮助命令](#帮助命令)
- [工作目录](#工作目录)
- [预览功能](#预览功能)
- [数据库](#数据库)
- [常见问题](#常见问题)

## 消息格式

### 基础语法

```
[dir:/path|alias] [new] 任务内容
```

- `[dir:/path]` - 使用完整路径
- `[dir:alias]` - 使用配置的别名
- `[new]` - 开启新会话（忘记之前的上下文）

### 使用示例

```bash
# 使用默认目录
@机器人 帮我检查代码有没有 bug

# 使用别名
@机器人 [dir:blog] 帮我写一篇新文章

# 使用完整路径
@机器人 [dir:/Users/xxx/project] 分析这个项目的架构

# 开启新会话
@机器人 [new] 重新开始，忘掉之前的对话

# 组合使用
@机器人 [dir:api] [new] 从头开始实现用户认证
```

## 命令系统

所有命令都以 `/` 开头，在钉钉群中 @机器人 发送。

### 工作目录管理

#### 添加工作目录

```bash
/d a <别名> <路径> [选项]
```

**选项**：
- `-desc "描述"` - 添加描述信息
- `-p` - 启用预览功能
- `-cmd "命令"` - 预览启动命令
- `-po 端口` - 预览端口（默认 3000）
- `-d` - 设为默认目录

**示例**：

```bash
# 基础用法（配置了 ALLOWED_ROOT_DIR 时使用相对路径）
@机器人 /d a blog my-blog

# 完整示例（带预览）
@机器人 /d a blog my-blog -desc "个人博客" -p -cmd "npm run dev" -d

# 多个项目
@机器人 /d a web-a client/web-app -desc "前端应用" -p -cmd "npm run dev"
@机器人 /d a api-a server/api -desc "后端 API" -p -cmd "python app.py" -po 5000
@机器人 /d a docs documentation -desc "项目文档"
```

**路径说明**：
- 如果配置了 `ALLOWED_ROOT_DIR`：只能使用相对路径（如 `blog` 或 `sites/portfolio`）
- 如果未配置 `ALLOWED_ROOT_DIR`：必须使用绝对路径（如 `/Users/xxx/project`）
- 详见 [SECURITY.md](SECURITY.md)

#### 列出所有目录

```bash
/d ls
```

**示例**：

```bash
@机器人 /d ls
```

**输出示例**：

```
📁 工作目录列表

**blog** [默认, 预览]
路径: /Users/john/projects/my-blog
描述: 个人博客

**web-a** [预览]
路径: /Users/john/projects/client/web-app
描述: 前端应用

**api-a**
路径: /Users/john/projects/server/api
描述: 后端 API
```

#### 查看目录详情

```bash
/d i <别名>
```

**示例**：

```bash
@机器人 /d i blog
```

**输出示例**：

```
📁 工作目录详情

**别名**: blog
**路径**: /Users/john/projects/my-blog
**描述**: 个人博客
**默认目录**: 是
**预览功能**: 启用
**启动命令**: npm run dev
**预览端口**: 3000
**创建时间**: 2024-01-15 10:30:00
**更新时间**: 2024-01-20 14:45:00
```

#### 设置默认目录

```bash
/d d <别名>
```

**示例**：

```bash
@机器人 /d d blog
```

设置后，不指定目录时会自动使用该目录。

#### 更新目录配置

```bash
/d u <别名> [选项]
```

**选项**：
- `-desc "新描述"` - 更新描述
- `-p on|off` - 启用/禁用预览
- `-cmd "命令"` - 更新启动命令
- `-po 端口` - 更新预览端口

**示例**：

```bash
# 更新描述
@机器人 /d u blog -desc "技术博客"

# 启用预览
@机器人 /d u api-a -p on -cmd "python app.py" -po 5000

# 禁用预览
@机器人 /d u docs -p off

# 同时更新多个配置
@机器人 /d u blog -desc "新的博客" -p on -cmd "npm run dev"
```

#### 删除目录配置

```bash
/d rm <别名>
```

**示例**：

```bash
@机器人 /d rm old-project
```

**注意**：只删除数据库中的配置，不会删除实际文件。

### 预览管理

#### 启动预览

```bash
/p s <别名>
```

**示例**：

```bash
@机器人 /p s blog
```

#### 查看预览状态

```bash
/p st [别名]
```

**示例**：

```bash
# 查看所有预览
@机器人 /p st

# 查看指定预览
@机器人 /p st blog
```

#### 停止预览

```bash
/p x <别名>
```

**示例**：

```bash
# 停止指定预览
@机器人 /p x blog

# 停止所有预览
@机器人 /p xa
```

### 帮助命令

```bash
/h
```

在钉钉群中查看完整的命令帮助：

```bash
@机器人 /h
```

## 工作目录

### 三种指定方式

系统支持三种方式指定工作目录：

**1. 使用别名**（推荐）

预先配置后可以用简短的别名：

```bash
@机器人 /dir add blog my-blog --default
@机器人 [dir:blog] 帮我写一篇文章
```

**2. 使用完整路径**

无需预先配置，直接使用：

```bash
@机器人 [dir:/Users/xxx/project] 分析这个项目
```

**3. 使用默认目录**

设置默认目录后，无需指定：

```bash
@机器人 /dir set-default blog
@机器人 帮我写一篇文章  # 自动使用 blog 目录
```

### 最佳实践

1. **常用项目使用别名**

   为常用项目配置简短易记的别名：

   ```bash
   @机器人 /d a blog my-blog -d
   @机器人 /d a web my-website -p -cmd "npm run dev"
   @机器人 /d a api backend-api -p -cmd "python app.py" -po 5000
   ```

2. **设置默认目录**

   为最常用的项目设置默认目录：

   ```bash
   @机器人 /d d blog
   ```

3. **启用预览功能**

   为需要预览的项目启用该功能：

   ```bash
   @机器人 /d u blog -p on -cmd "npm run dev"
   ```

## 预览功能

### 配置

为工作目录启用预览后，Claude Code 任务成功完成时会自动启动项目预览，并通过 Cloudflare Tunnel 提供临时访问 URL。

**添加时启用**：

```bash
@机器人 /d a blog my-blog -p -cmd "npm run dev" -po 3000
```

**已存在的目录启用**：

```bash
@机器人 /d u blog -p on -cmd "npm run dev" -po 3000
```

**禁用**：

```bash
@机器人 /d u blog -p off
```

### 前提条件

需要安装 [cloudflared](https://github.com/cloudflare/cloudflared) 工具。详见 [PREVIEW_SETUP.md](PREVIEW_SETUP.md)。

### 适用场景

- **前端项目**：React、Vue、Angular 等
- **后端 API**：Node.js、Python、Go 等
- **静态网站**：任何 HTTP 服务器
- **全栈应用**：Next.js、Nuxt.js 等
- **快速预览**：外出时通过手机查看项目

### 预览流程

```
Claude Code 执行成功
         ↓
    检查是否启用预览
         ↓
    启动项目进程（start_cmd）
         ↓
    等待端口监听
         ↓
    启动 Cloudflare Tunnel
         ↓
    钉钉通知预览 URL
         ↓
    进程一直运行
```

### 手动管理

```bash
# 启动预览
@机器人 /p s blog

# 查看状态
@机器人 /p st

# 停止预览
@机器人 /p x blog

# 停止所有预览
@机器人 /p xa
```

### 注意事项

1. **预览 URL 是临时的**

   每次启动生成新的随机 URL，适合开发预览，不适合生产环境。

2. **进程持续运行**

   Claude Code 任务完成后，项目进程会继续运行，直到手动停止。

3. **端口冲突**

   确保配置的端口没有被占用。

4. **公开访问**

   预览 URL 是公开的，任何人都可以访问，注意不要暴露敏感信息。

## 数据库

### 位置

默认位置：项目目录下的 `data/data.db`

自定义位置（通过环境变量）：

```bash
# .env
DB_PATH=/custom/path
```

### 表结构

#### working_directories

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键（自增） |
| alias | TEXT | 目录别名（唯一） |
| path | TEXT | 完整路径 |
| is_default | INTEGER | 是否为默认目录（0 或 1） |
| preview_enabled | INTEGER | 是否启用预览（0 或 1） |
| start_cmd | TEXT | 启动命令（可选） |
| preview_port | INTEGER | 预览端口（可选） |
| description | TEXT | 目录描述（可选） |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

#### preview_services

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键（自增） |
| alias | TEXT | 目录别名（唯一） |
| pid | INTEGER | 项目进程 PID |
| tunnel_pid | INTEGER | Tunnel 进程 PID |
| port | INTEGER | 预览端口 |
| tunnel_url | TEXT | Cloudflare URL |
| started_at | INTEGER | 启动时间戳 |

### 管理

**查看数据库**：

```bash
sqlite3 data/data.db
```

```sql
-- 查看所有工作目录
SELECT * FROM working_directories;

-- 查看默认目录
SELECT * FROM working_directories WHERE is_default = 1;

-- 查看启用预览的目录
SELECT * FROM working_directories WHERE preview_enabled = 1;

-- 查看运行中的预览服务
SELECT * FROM preview_services;
```

**备份**：

```bash
cp data/data.db data/data.db.backup
```

**恢复**：

```bash
cp data/data.db.backup data/data.db
```

## 常见问题

### 命令相关

**Q: 删除工作目录配置会删除实际文件吗？**

A: 不会。`/d rm` 只会删除数据库中的配置记录，不影响实际文件。

**Q: 别名可以修改吗？**

A: 别名不能直接修改。需要先删除旧配置，再添加新配置：

```bash
@机器人 /d rm old-alias
@机器人 /d a new-alias /path/to/project -p -cmd "npm run dev"
```

**Q: 可以配置多少个工作目录？**

A: 没有限制，可以配置任意数量的工作目录。

### 路径相关

**Q: 配置了 ALLOWED_ROOT_DIR 后还能使用完整路径吗？**

A: 不能。配置根目录是为了安全，配置后只能使用相对路径。

**Q: 相对路径可以包含子目录吗？**

A: 可以。例如 `sites/blog`、`projects/web/app` 都是合法的。

**Q: 路径不存在会报错吗？**

A: 添加配置时不会验证路径是否存在，但使用时如果路径不存在，Claude Code 会执行失败。

### 预览相关

**Q: 预览启动失败怎么办？**

A: 检查以下几点：
1. cloudflared 是否已安装（`cloudflared --version`）
2. 启动命令是否正确（`/d i <别名>` 查看配置）
3. 端口是否被占用
4. 查看控制台的日志

**Q: 预览 URL 无法访问怎么办？**

A: 可能原因：
1. 项目未正确启动 - 检查项目进程
2. 端口配置错误 - 确认项目监听端口与配置一致
3. 防火墙阻止 - 检查防火墙设置
4. Tunnel 未建立 - 重启预览服务（`/p x` 后 `/p s`）

**Q: 如何停止所有预览？**

A: 使用 `/p xa` 命令或重启 Remote Claude 服务。

### 消息格式相关

**Q: `[dir:alias]` 和 `[new]` 可以同时使用吗？**

A: 可以：

```bash
@机器人 [dir:blog] [new] 从头开始写一篇文章
```

顺序不限，可以是 `[new] [dir:blog]` 或 `[dir:blog] [new]`。

**Q: 可以在任务内容中使用方括号吗？**

A: 可以。系统只识别开头的特殊标记，任务内容中的方括号不会被特殊处理。

### 其他问题

**Q: 可以同时处理多个任务吗？**

A: 不可以。为了避免冲突，同一时间只能处理一个任务。如果有任务正在执行，新任务会被拒绝并提示。

**Q: 如何查看正在执行的任务？**

A: 查看控制台日志，会显示当前执行的任务内容和状态。

**Q: 数据库损坏怎么办？**

A: 如果有备份，可以直接恢复。如果没有备份，可以删除数据库文件，系统会自动创建新的空数据库，但之前的配置会丢失。

**Q: 是否支持多个钉钉机器人？**

A: 支持。但每个机器人需要独立的服务实例和配置。建议使用不同的数据库文件避免冲突。

## 相关文档

- [README.md](../README.md) - 项目介绍和快速开始
- [SECURITY.md](SECURITY.md) - 安全配置指南
- [PREVIEW_SETUP.md](PREVIEW_SETUP.md) - Cloudflare Tunnel 配置指南
- [CLAUDE.md](../CLAUDE.md) - Claude Code 项目指南
