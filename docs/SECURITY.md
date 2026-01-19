# 安全配置指南

## 概述

Claude Code Everywhere 使用根目录限制功能，确保所有工作目录都在可控范围内，防止误操作或恶意配置访问敏感文件。

**必需配置**：`ALLOWED_ROOT_DIR` 是必需的环境变量，服务启动时会检查，未配置将无法启动。

## 核心安全特性

系统自动阻止以下危险操作：

- ✅ 路径遍历攻击（`..`）
- ✅ 绝对路径注入（`/` 或 `~` 开头）
- ✅ 危险字符（`<>"|?*`）

## 工作原理

配置 `ALLOWED_ROOT_DIR` 后：

- ✅ 用户**只能提供相对路径**
- ✅ 系统会自动将相对路径拼接到根目录下
- ❌ 不允许提供绝对路径（以 `/` 或 `~` 开头）

**配置**：

```bash
# .env 文件（必需）
ALLOWED_ROOT_DIR=/Users/yourname/projects
```

**使用示例**：

假设配置了 `ALLOWED_ROOT_DIR=/Users/john/projects`

```bash
# ✅ 正确 - 提供相对路径
@机器人 /d a blog my-blog
# 实际路径: /Users/john/projects/my-blog

@机器人 /d a web sites/website-a
# 实际路径: /Users/john/projects/sites/website-a

@机器人 /d a app mobile/app-v2
# 实际路径: /Users/john/projects/mobile/app-v2

# ❌ 错误 - 不能提供绝对路径
@机器人 /d a blog /Users/john/projects/my-blog
# 错误: 请只提供相对路径（如 "blog" 或 "projects/web"），不要以 / 或 ~ 开头

@机器人 /d a blog ~/projects/my-blog
# 错误: 请只提供相对路径（如 "blog" 或 "projects/web"），不要以 / 或 ~ 开头
```

## 配置示例

### 个人开发

```bash
# .env
ALLOWED_ROOT_DIR=~/projects
```

**使用**：

```bash
@机器人 /d a blog my-blog -d
# → ~/projects/my-blog

@机器人 /d a web sites/portfolio -p -cmd "npm run dev"
# → ~/projects/sites/portfolio
```

**输出**：

```
📁 工作目录列表

**blog** [默认]
路径: /Users/john/projects/my-blog

**web** [预览]
路径: /Users/john/projects/sites/portfolio
```

### 团队协作

```bash
# .env
ALLOWED_ROOT_DIR=/var/www/team-projects
```

**使用**：

```bash
@机器人 /d a frontend client/web-app -p -cmd "npm run dev"
@机器人 /d a backend server/api -p -cmd "python app.py" -po 5000
@机器人 /d a docs documentation
```

**实际路径**：

- frontend: `/var/www/team-projects/client/web-app`
- backend: `/var/www/team-projects/server/api`
- docs: `/var/www/team-projects/documentation`

### CI/CD 环境

```bash
# .env
ALLOWED_ROOT_DIR=/workspace
```

**使用**：

```bash
@机器人 /d a main app -p -cmd "npm start"
@机器人 /d a test test-suite
```

**实际路径**：

- main: `/workspace/app`
- test: `/workspace/test-suite`

## 内置安全防护

系统会自动阻止以下危险操作：

### 1. 路径遍历攻击

包含 `..` 的路径会被拒绝：

```bash
❌ ../../../etc
❌ projects/../../../root
❌ ./../../sensitive
```

### 2. 绝对路径注入

以 `/` 或 `~` 开头的路径会被拒绝：

```bash
❌ /Users/john/blog
❌ ~/projects/my-blog
❌ /etc/passwd
```

### 3. 危险字符

包含特殊字符的路径会被拒绝：

```bash
❌ blog|hack       # 管道符
❌ blog>output     # 重定向符
❌ blog"test       # 引号
❌ blog?wildcard   # 通配符
❌ blog*all        # 通配符
```

## 错误信息说明

```bash
# 错误 1：提供了绝对路径
@机器人 /d a blog /Users/john/blog
❌ 请只提供相对路径（如 "blog" 或 "projects/web"），不要以 / 或 ~ 开头

# 错误 2：路径遍历攻击
@机器人 /d a hack ../../../etc
❌ 路径包含不安全的字符或模式（不允许 .., 特殊字符等）

# 错误 3：危险字符
@机器人 /d a test "blog|hack"
❌ 路径包含不安全的字符或模式（不允许 .., 特殊字符等）
```

## 安全最佳实践

### 1. 选择合适的根目录

**推荐**：

```bash
# ✅ 推荐 - 限制到项目目录
ALLOWED_ROOT_DIR=/home/user/projects

# ⚠️ 不推荐 - 范围太大
ALLOWED_ROOT_DIR=/home/user

# ❌ 危险 - 范围太大
ALLOWED_ROOT_DIR=/
```

### 2. 使用专用用户运行

```bash
# 创建专用用户
sudo useradd -m -s /bin/bash claude-worker

# 设置根目录
sudo mkdir -p /home/claude-worker/projects
sudo chown claude-worker:claude-worker /home/claude-worker/projects

# 配置 .env
ALLOWED_ROOT_DIR=/home/claude-worker/projects

# 以专用用户运行
sudo -u claude-worker npm start
```

### 3. 最小权限原则

只给服务访问必要的目录：

```bash
# ✅ 好 - 只允许访问项目目录
ALLOWED_ROOT_DIR=/home/user/projects

# ⚠️ 一般 - 允许访问整个用户目录
ALLOWED_ROOT_DIR=/home/user

# ❌ 差 - 允许访问系统目录
ALLOWED_ROOT_DIR=/
```

### 4. 定期审计

```bash
# 查看所有配置的目录
@机器人 /d ls

# 删除不用的目录
@机器人 /d rm old-project
```

## 启动提示

配置根目录后，启动时会看到安全提示：

```
🚀 启动钉钉 Stream 机器人...
   数据库路径: /Users/john/remote-claude/data
   🔒 安全限制：工作目录仅允许在 /Users/john/projects 下
   消息格式: [dir:/path|alias] [new] 任务内容
   - [dir:/path] 指定完整路径
   - [dir:alias] 使用配置的别名
   - [new] 开启新会话（默认继续上次会话）

✅ 已连接到钉钉，等待消息...
```

## 常见问题

**Q: 为什么必须配置根目录？**

A: 为了安全。强制配置根目录可以确保所有操作都在可控范围内，防止意外访问系统文件或其他敏感目录。

**Q: 相对路径可以包含子目录吗？**

A: 可以！例如 `projects/web`、`sites/blog/main`、`apps/mobile/ios` 都是合法的。

**Q: 根目录可以用相对路径吗？**

A: 不建议。虽然系统会转换为绝对路径，但为了清晰建议使用绝对路径或 `~` 开头的路径。

```bash
# ✅ 推荐
ALLOWED_ROOT_DIR=/Users/john/projects
ALLOWED_ROOT_DIR=~/projects

# ⚠️ 不推荐（虽然可以工作）
ALLOWED_ROOT_DIR=projects
```

**Q: Windows 系统如何配置？**

A: 使用 Windows 路径格式：

```bash
ALLOWED_ROOT_DIR=C:/Users/YourName/Projects
# 或
ALLOWED_ROOT_DIR=C:\\Users\\YourName\\Projects
```

**Q: 可以配置多个根目录吗？**

A: 不可以。系统只支持一个根目录。如果需要管理多个不同位置的项目，建议：

1. 使用符号链接将它们链接到同一个根目录下
2. 或者选择一个更上层的目录作为根目录

```bash
# 方案 1：使用符号链接
mkdir -p ~/projects/external
ln -s /var/www/website ~/projects/external/website
ln -s ~/Documents/blog ~/projects/external/blog

ALLOWED_ROOT_DIR=~/projects

# 方案 2：选择上层目录（不推荐，范围太大）
ALLOWED_ROOT_DIR=~
```

**Q: 忘记配置根目录会怎样？**

A: 服务启动时会报错并退出：

```
❌ 启动失败: Missing required environment variable: ALLOWED_ROOT_DIR
```

**Q: 如何查看当前配置的根目录？**

A: 启动服务时会在日志中显示：

```
🔒 安全限制：工作目录仅允许在 /Users/john/projects 下
```

## 配置验证

启动前可以验证配置是否正确：

```bash
# 检查 .env 文件
cat .env | grep ALLOWED_ROOT_DIR

# 检查目录是否存在
ls -ld $(grep ALLOWED_ROOT_DIR .env | cut -d= -f2)

# 检查权限
ls -ld $(grep ALLOWED_ROOT_DIR .env | cut -d= -f2)
```

## 总结

- **必须配置**：`ALLOWED_ROOT_DIR` 是启动服务的必需配置
- **只能相对路径**：用户只能提供相对路径（如 `blog`、`sites/web`）
- **自动拼接**：系统自动将相对路径拼接到根目录下
- **安全防护**：自动阻止路径遍历、绝对路径注入、危险字符等
- **最小权限**：选择最小范围的根目录，不要使用 `/` 或 `~`
- **专用用户**：建议使用专用用户运行服务
