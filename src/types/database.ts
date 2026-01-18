/**
 * 数据库表类型定义（个人使用版本）
 */

/**
 * 工作目录配置表
 */
export interface WorkingDirectory {
  id: number;
  alias: string;            // 目录别名
  path: string;             // 完整路径
  is_default: number;       // 是否为默认目录 (0 or 1)
  preview_enabled?: number; // 是否启用预览 (0 or 1)
  start_cmd?: string;       // 项目启动命令
  preview_port?: number;    // 预览端口
  description?: string;     // 目录描述
  created_at: number;       // 创建时间戳
  updated_at: number;       // 更新时间戳
}

/**
 * 工作目录创建参数
 */
export interface CreateWorkingDirectoryInput {
  alias: string;
  path: string;
  isDefault?: boolean;
  previewEnabled?: boolean;   // 是否启用预览
  startCmd?: string;          // 项目启动命令
  previewPort?: number;       // 预览端口
  description?: string;
}

/**
 * 工作目录更新参数
 */
export interface UpdateWorkingDirectoryInput {
  isDefault?: boolean;
  previewEnabled?: boolean;   // 是否启用预览
  startCmd?: string;          // 项目启动命令
  previewPort?: number;       // 预览端口
  description?: string;
}

/**
 * 预览服务表
 */
export interface PreviewService {
  id: number;
  alias: string;           // 工作目录别名
  pid: number;             // 项目进程 PID
  tunnel_pid: number;      // Cloudflare tunnel 进程 PID
  port: number;            // 监听端口
  tunnel_url: string;      // Cloudflare 生成的 URL
  started_at: number;      // 启动时间戳
}

/**
 * 预览服务创建参数
 */
export interface CreatePreviewServiceInput {
  alias: string;
  pid: number;
  tunnelPid: number;
  port: number;
  tunnelUrl: string;
}

/**
 * 预览信息（用于返回）
 */
export interface PreviewInfo {
  alias: string;
  port: number;
  tunnelUrl: string;
  pid: number;
  tunnelPid: number;
  startedAt: number;
}
