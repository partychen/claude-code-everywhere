# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remote Claude 是一个 Claude Code 增强工具，提供以下核心功能：

1. **远程触发**：通过钉钉机器人远程调用 Claude Code
2. **预览管理**：Claude Code 任务完成后自动启动项目预览（通过 Cloudflare Tunnel）
3. **工作目录管理**：通过别名快速切换工作目录，支持简写命令
4. **命令简写**：简洁易记的命令格式（`/d`, `/p`, `-desc`, `-cmd` 等）

## 架构

```
钉钉群 @机器人 → 钉钉 Stream → 本地 Worker → Claude Agent SDK → 钉钉回复
                                ↓
                           SQLite 数据库
                   (工作目录配置 + 预览服务管理)
```

## Commands

```bash
npm install     # 安装依赖
npm start       # 启动钉钉远程触发服务
npm run dev     # 开发模式（自动重启）
npm test        # 运行测试
```

## Project Structure

```
src/
  index.ts                       # 主入口
  config.ts                      # 配置加载
  state.ts                       # 应用状态
  handlers/
    message-handler.ts           # 消息处理器
    command-handler.ts           # 命令处理器
  services/
    database.ts                  # 数据库服务
    message-parser.ts            # 消息解析
    claude.ts                    # Claude Agent SDK 调用
    preview.ts                   # 预览服务管理
    notifier.ts                  # 钉钉通知
  repositories/
    working-directory.ts         # 工作目录仓库
    preview.ts                   # 预览服务仓库
  types/
    database.ts                  # 数据库类型
  utils/
    shell.ts                     # Shell 执行
    path.ts                      # 路径工具
    logger.ts                    # 日志工具
  constants/
    help.ts                      # 帮助文档常量
data/
  data.db                        # SQLite 数据库文件
```

## Environment Variables

```bash
# 钉钉应用凭证（必需）
DINGTALK_CLIENT_ID=xxx
DINGTALK_CLIENT_SECRET=xxx

# 安全配置：工作目录根目录限制（必需）
# 所有工作目录必须在此根目录下
ALLOWED_ROOT_DIR=/Users/yourname/projects

# 数据库路径（可选，默认为项目 data/ 目录）
DB_PATH=/custom/path
```

## 消息格式

### 基础用法

```
[dir:/path|alias] [new] 任务内容
```

- `[dir:/path]` - 切换到完整路径
- `[dir:alias]` - 切换到配置的别名
- `[new]` - 强制开启新会话

### 示例

```bash
# 使用默认目录
@机器人 帮我检查代码有没有 bug

# 使用别名切换目录
@机器人 [dir:proj-a] 帮我检查代码

# 使用完整路径
@机器人 [dir:/Users/xxx/project-a] 这个项目怎么部署

# 强制新会话
@机器人 [new] 忘掉之前的，重新开始
```

## 命令系统（简写）

### 工作目录管理

```bash
# 添加工作目录（使用相对路径）
@机器人 /d a blog my-blog -desc "个人博客" -p -cmd "npm run dev" -d

# 列出所有工作目录
@机器人 /d ls

# 查看目录详细信息
@机器人 /d i blog

# 设置默认目录
@机器人 /d d blog

# 更新目录配置
@机器人 /d u blog -desc "技术博客" -p on -cmd "npm run dev"

# 删除目录配置
@机器人 /d rm old-project
```

### 预览管理

```bash
# 启动预览
@机器人 /p s blog

# 查看预览状态
@机器人 /p st

# 停止预览
@机器人 /p x blog

# 停止所有预览
@机器人 /p xa
```

### 帮助

```bash
@机器人 /h
```

**命令简写对照**：
- `/dir` → `/d`, `/preview` → `/p`, `/help` → `/h`
- `add` → `a`, `list` → `ls`, `info` → `i`, `default` → `d`, `update` → `u`, `remove` → `rm`
- `start` → `s`, `stop` → `x`, `stop-all` → `xa`, `status` → `st`
- `--description` → `-desc`, `--preview` → `-p`, `--start-cmd` → `-cmd`, `--port` → `-po`, `--default` → `-d`

详细命令说明请查看 [docs/USAGE.md](docs/USAGE.md)

## 预览功能

### 配置预览

```bash
# 添加目录时启用预览
@机器人 /d a blog my-blog -p -cmd "npm run dev" -po 3000

# 更新现有目录启用预览
@机器人 /d u blog -p on -cmd "npm run dev" -po 3000
```

当 Claude Code 在指定目录执行完成时，会自动：
1. 启动项目进程（执行 `start_cmd` 配置的命令）
2. 启动 Cloudflare Tunnel
3. 将预览 URL 通知到钉钉群

前提条件：
- 需要安装 [cloudflared](https://github.com/cloudflare/cloudflared) 工具
- 详见 [docs/PREVIEW_SETUP.md](docs/PREVIEW_SETUP.md)

注意事项：
- 仅在 Claude Code 任务成功完成后才会启动预览
- 预览进程会持续运行，直到手动停止（`/p x`）
- 预览 URL 是临时的，每次生成新的随机 URL

## 数据库

- 位置：项目目录下的 `data/data.db`（可通过 DB_PATH 配置）
- 类型：SQLite
- 自动初始化：首次启动时自动创建
- 表结构：
  - `working_directories` - 工作目录配置（包含预览配置）
  - `preview_services` - 运行中的预览服务

详细使用说明请查看 [docs/USAGE.md](docs/USAGE.md)
