# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remote Claude 是一个 Claude Code 增强工具，提供两个功能：

1. **远程触发**：通过钉钉机器人远程调用 Claude Code
2. **自动部署**：Claude Code 任务完成后自动执行 npm run deploy

## 架构

```
功能1: 钉钉群 @机器人 → 钉钉 Stream → 本地 Worker → Claude CLI → 钉钉回复
功能2: Claude Code 执行完成 → 自动部署 (npm run deploy) → 钉钉通知
```

## Commands

```bash
npm install   # 安装依赖
npm start     # 启动钉钉远程触发服务
```

## Project Structure

```
src/
  index.ts               # 钉钉 Stream 服务（远程触发）
.env                     # 环境变量
```

## Environment Variables

```bash
# 钉钉应用凭证（远程触发功能）
DINGTALK_CLIENT_ID=xxx
DINGTALK_CLIENT_SECRET=xxx

# Claude Code 默认工作目录（可选）
CLAUDE_WORKING_DIR=/path/to/your/project

# 自动部署配置（可选，支持多个目录用逗号分隔）
# Claude Code 执行完成后，会在这些目录自动运行 npm run deploy
AUTO_DEPLOY_DIRS=/path/to/project1,/path/to/project2

# Azure Foundry 配置（如果使用）
CLAUDE_CODE_USE_FOUNDRY=1
ANTHROPIC_FOUNDRY_API_KEY=xxx
ANTHROPIC_FOUNDRY_RESOURCE=xxx
```

## 消息格式

```
[dir:/path] [new] 任务内容
```

- `[dir:/path]` - 可选，切换到该目录（每个目录有独立的会话上下文）
- `[new]` - 可选，在当前目录强制开启新会话

示例：
```
# 继续默认目录的会话
@机器人 帮我检查代码有没有 bug

# 切换到项目A（使用项目A的会话上下文）
@机器人 [dir:/Users/xxx/project-a] 帮我检查代码

# 切换到项目B（使用项目B的会话上下文）
@机器人 [dir:/Users/xxx/project-b] 这个项目怎么部署

# 回到项目A（恢复之前项目A的上下文）
@机器人 [dir:/Users/xxx/project-a] 刚才那个bug修好了吗

# 在当前目录强制开新会话
@机器人 [new] 忘掉之前的，重新开始
```

## 自动部署功能

配置 `AUTO_DEPLOY_DIRS` 后，当 Claude Code 在指定目录执行完成时，会自动：
1. 执行 `npm run deploy` 命令
2. 实时输出部署日志到控制台
3. 将部署结果通知到钉钉群

注意事项：
- 支持配置多个目录（逗号分隔）
- 仅在 Claude Code 任务成功完成后才会触发部署
- 部署失败不会影响 Claude Code 的执行结果
- 请确保目标项目的 package.json 中有 `deploy` 脚本
