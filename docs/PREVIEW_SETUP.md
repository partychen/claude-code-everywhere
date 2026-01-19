# Cloudflare Tunnel 配置指南

Claude Code Everywhere 的预览功能使用 Cloudflare Tunnel 将本地运行的项目暴露到公网，让您可以随时随地通过手机或其他设备访问预览。

## 前置要求

在使用预览功能之前，需要在运行 Claude Code Everywhere 的服务器上安装 `cloudflared`。

## 安装 cloudflared

### macOS

使用 Homebrew 安装：

```bash
brew install cloudflared
```

### Linux

#### Ubuntu/Debian

```bash
# 下载最新版本
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared

# 添加执行权限
chmod +x cloudflared

# 移动到系统路径
sudo mv cloudflared /usr/local/bin/
```

#### CentOS/RHEL

```bash
# 下载最新版本
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared

# 添加执行权限
chmod +x cloudflared

# 移动到系统路径
sudo mv cloudflared /usr/local/bin/
```

### Windows

1. 访问 [Cloudflare Tunnel 发布页面](https://github.com/cloudflare/cloudflared/releases)
2. 下载 `cloudflared-windows-amd64.exe`
3. 将文件重命名为 `cloudflared.exe`
4. 将文件路径添加到系统 PATH 环境变量

## 验证安装

安装完成后，运行以下命令验证：

```bash
cloudflared --version
```

如果看到版本号输出，说明安装成功。

## 使用说明

### 工作原理

Claude Code Everywhere 使用 Cloudflare Tunnel 的临时隧道功能（Quick Tunnels）：

- **无需注册**：不需要 Cloudflare 账号
- **自动生成 URL**：每次启动自动生成临时的 `https://xxx.trycloudflare.com` URL
- **零配置**：系统自动调用 `cloudflared tunnel --url localhost:<port>` 命令

### 限制说明

由于使用的是 Cloudflare 的免费临时隧道功能，有以下限制：

- **URL 不固定**：每次启动生成新的随机 URL
- **临时访问**：适合开发预览，不适合长期生产环境
- **带宽限制**：受 Cloudflare 免费计划限制

如需长期稳定的 URL，建议：
1. 注册 Cloudflare 账号
2. 配置 Named Tunnel
3. 或使用其他内网穿透方案（如 ngrok, frp 等）

## 配置项目预览

### 添加新项目时配置

```bash
@机器人 /d a blog my-blog -p -cmd "npm run dev" -po 3000
```

参数说明：
- `-p`：启用预览功能
- `-cmd "命令"`：项目启动命令（必需）
- `-po 端口号`：项目监听端口（默认 3000）

### 更新现有项目配置

```bash
# 启用预览
@机器人 /d u blog -p on -cmd "npm run dev" -po 3000

# 禁用预览
@机器人 /d u blog -p off
```

## 预览功能使用

### 自动启动

当项目配置了预览功能后，Claude Code 任务成功完成时会自动启动预览：

```bash
@机器人 [dir:blog] 帮我优化首页性能
```

任务完成后，系统会：
1. 启动项目（执行 `start_cmd` 配置的命令）
2. 启动 Cloudflare Tunnel
3. 返回预览 URL

### 手动管理

#### 启动预览

```bash
@机器人 /p s blog
```

#### 查看预览状态

```bash
# 查看所有运行中的预览
@机器人 /p st

# 查看指定项目的预览状态
@机器人 /p st blog
```

#### 停止预览

```bash
# 停止指定项目的预览
@机器人 /p x blog

# 停止所有预览
@机器人 /p xa
```

## 支持的项目类型

预览功能支持任何可以在本地启动 HTTP 服务的项目：

### Node.js 项目

```bash
@机器人 /d a web my-web-app -p -cmd "npm run dev" -po 3000
```

### Python 项目

```bash
@机器人 /d a api my-flask-app -p -cmd "python app.py" -po 5000
```

### Go 项目

```bash
@机器人 /d a go-app my-go-app -p -cmd "go run main.go" -po 8080
```

### 静态网站服务器

```bash
@机器人 /d a static my-site -p -cmd "python -m http.server 8000" -po 8000
```

### Docker 容器

```bash
@机器人 /d a docker my-docker-app -p -cmd "docker-compose up" -po 3000
```

## 常见问题

### Q: 预览启动失败怎么办？

A: 检查以下几点：

1. **cloudflared 是否已安装**
   ```bash
   cloudflared --version
   ```

2. **启动命令是否正确**
   ```bash
   @机器人 /d i blog
   ```
   检查 `start_cmd` 配置

3. **端口是否被占用**
   ```bash
   lsof -i :3000  # macOS/Linux
   netstat -ano | findstr :3000  # Windows
   ```

4. **查看服务日志**
   系统会将项目和 Tunnel 的日志输出到控制台

### Q: 预览 URL 无法访问怎么办？

A: 可能原因：

1. **项目未正确启动**：检查项目进程是否运行
2. **端口配置错误**：确认项目监听端口与配置的端口一致
3. **防火墙阻止**：检查本地防火墙设置
4. **Tunnel 未建立**：重启预览服务

### Q: 如何停止所有预览服务？

A: 有两种方式：

1. 使用命令停止：
   ```bash
   @机器人 /p xa
   ```

2. 重启 Claude Code Everywhere 服务：
   服务启动时会自动清理之前的预览服务

### Q: 预览 URL 会一直有效吗？

A: 不会。预览 URL 的有效期取决于：

1. **手动停止**：运行 `/p x` 命令
2. **服务重启**：Claude Code Everywhere 服务重启时会停止所有预览
3. **进程崩溃**：如果项目进程或 Tunnel 进程崩溃，URL 会失效

### Q: 可以同时运行多个预览吗？

A: 可以！系统支持同时运行多个项目的预览，每个项目有独立的：
- 项目进程
- Cloudflare Tunnel 进程
- 预览 URL

### Q: 预览功能会消耗很多资源吗？

A: 资源消耗主要来自：
- 项目本身的进程
- Cloudflare Tunnel 进程（非常轻量）

建议在不需要预览时及时停止服务。

## 安全建议

1. **不要暴露敏感信息**：预览 URL 是公开的，任何人都可以访问
2. **使用开发环境**：预览功能适合开发环境，不建议用于生产
3. **定期清理**：不使用时及时停止预览服务
4. **限制访问**：如需限制访问，在项目中实现认证功能

## 进阶配置

### 自定义启动脚本

如果项目启动需要多个步骤，可以创建启动脚本：

```bash
# start-preview.sh
#!/bin/bash
export NODE_ENV=development
npm install
npm run build
npm run dev
```

然后配置：

```bash
@机器人 /d a blog my-blog -p -cmd "./start-preview.sh" -po 3000
```

### 环境变量

启动命令会继承当前进程的环境变量，可以在 `.env` 文件中配置。

### 多端口项目

如果项目需要监听多个端口，建议：
1. 配置主端口（前端访问端口）
2. 在项目内部处理端口转发

## 故障排查

### 查看运行中的预览服务

```bash
@机器人 /p st
```

### 查看进程状态

```bash
# 查看项目进程
ps aux | grep "npm run dev"

# 查看 Tunnel 进程
ps aux | grep cloudflared
```

### 手动测试 Cloudflare Tunnel

```bash
# 启动一个简单的 HTTP 服务
python -m http.server 8000

# 在另一个终端启动 Tunnel
cloudflared tunnel --url http://localhost:8000
```

如果手动测试成功，说明 cloudflared 安装正确。

## 更多资源

- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)
- [Claude Code Everywhere 使用手册](./USAGE.md)
