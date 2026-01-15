# Remote Claude

通过钉钉远程控制 Claude Code + 自动部署

## 功能

| 功能 | 说明 |
|------|------|
| 远程触发 | 在钉钉群 @机器人 发送任务，自动调用本地 Claude Code 执行 |
| 自动部署 | Claude Code 任务完成后，自动执行 npm run deploy |

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入钉钉凭证
```

### 3. 启动服务

```bash
npm start
```

## 钉钉配置

1. 登录 [钉钉开放平台](https://open.dingtalk.com)
2. 创建企业内部应用 → 添加机器人能力
3. 消息接收模式选择 **Stream 模式**
4. 复制 Client ID 和 Client Secret 到 `.env`

## 项目结构

```
remote-claude/
├── src/
│   └── index.ts           # 钉钉 Stream 服务
├── .env                   # 环境变量
└── package.json
```
