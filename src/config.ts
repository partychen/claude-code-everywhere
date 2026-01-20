import 'dotenv/config';
import { resolve } from 'path';

export interface LLMConfig {
  provider: 'volcengine' | 'openai' | 'anthropic' | 'local' | 'qwen';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

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
    allowedOrigins: string;
    auth: {
      username: string;
      passwordHash: string;
      jwtSecret: string;
      jwtExpiresIn: string;
    };
  };
  llm: LLMConfig;
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
      allowedOrigins: getEnvOrDefault('WEB_ALLOWED_ORIGINS', 'http://localhost:3001'),
      auth: {
        username: getEnvOrThrow('WEB_ADMIN_USERNAME'),
        passwordHash: getEnvOrThrow('WEB_ADMIN_PASSWORD_HASH'),
        jwtSecret: getEnvOrThrow('WEB_JWT_SECRET'),
        jwtExpiresIn: getEnvOrDefault('WEB_JWT_EXPIRES_IN', '2h'),
      },
    },
    llm: {
      provider: getEnvOrDefault('LLM_PROVIDER', 'volcengine') as LLMConfig['provider'],
      model: getEnvOrDefault('LLM_MODEL', 'doubao-pro-32k'),
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL,
      temperature: process.env.LLM_TEMPERATURE
        ? parseFloat(process.env.LLM_TEMPERATURE)
        : 0.3,
      maxTokens: process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS) : 1024,
    },
  };
}
