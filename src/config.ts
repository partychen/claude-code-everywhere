import 'dotenv/config';
import { resolve } from 'path';

export interface Config {
  dingtalk: {
    clientId: string;
    clientSecret: string;
  };
  db: {
    path: string;
  };
  security: {
    allowedRootDir: string;  // 允许的根目录（必需）
  };
  web: {
    enabled: boolean;
    port: number;
    authToken?: string;
    allowedOrigins: string;
  };
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * 加载基础配置（仅环境变量）
 * 工作目录和自动部署配置已迁移到数据库
 */
export function loadConfig(): Config {
  // 默认数据库路径：项目根目录下的 data 文件夹
  const defaultDbPath = resolve(import.meta.dirname, '../data');

  return {
    dingtalk: {
      clientId: getEnvOrThrow('DINGTALK_CLIENT_ID'),
      clientSecret: getEnvOrThrow('DINGTALK_CLIENT_SECRET'),
    },
    db: {
      path: getEnvOrDefault('DB_PATH', defaultDbPath),
    },
    security: {
      allowedRootDir: getEnvOrThrow('ALLOWED_ROOT_DIR'),
    },
    web: {
      enabled: getEnvOrDefault('WEB_ENABLED', 'true') === 'true',
      port: parseInt(getEnvOrDefault('WEB_PORT', '3001')),
      authToken: process.env.WEB_AUTH_TOKEN,
      allowedOrigins: getEnvOrDefault('WEB_ALLOWED_ORIGINS', 'http://localhost:3001'),
    },
  };
}
