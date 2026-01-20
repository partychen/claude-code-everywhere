import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { WorkingDirectoryRepository } from '../repositories/working-directory.js';
import { PreviewService } from '../services/preview.js';
import { jwtAuthMiddleware } from './middlewares/auth.js';
import { errorHandler } from './middlewares/error-handler.js';
import { createAuthRouter, AuthConfig } from './routes/auth.js';
import { createDirectoriesRouter } from './routes/directories.js';
import { createPreviewsRouter } from './routes/previews.js';
import { createSystemRouter } from './routes/system.js';
import { createChatRouter } from './routes/chat.js';

import { ChatConversationRepository } from '../repositories/chat-conversation.js';

export interface WebServerConfig {
  port: number;
  allowedOrigins: string;
  workingDirRepo: WorkingDirectoryRepository;
  previewService: PreviewService;
  chatConversationRepo: ChatConversationRepository;
  allowedRootDir: string;
  auth: AuthConfig;
}

export async function startWebServer(config: WebServerConfig): Promise<void> {
  const app = express();

  // 中间件
  app.use(cors({ origin: config.allowedOrigins.split(',') }));
  app.use(express.json());

  // 静态文件服务
  const publicDir = join(import.meta.dirname, '../../public');
  app.use(express.static(publicDir));

  // 认证路由（无需认证）
  app.use('/api/auth', createAuthRouter(config.auth));

  // JWT 认证中间件（应用到 /api/*，除了 /api/auth）
  app.use('/api', jwtAuthMiddleware(config.auth.jwtSecret));

  // API 路由
  app.use('/api/directories', createDirectoriesRouter(config));
  app.use('/api/previews', createPreviewsRouter(config));
  app.use('/api/system', createSystemRouter(config));
  app.use('/api/chat', createChatRouter(config));

  // 错误处理
  app.use(errorHandler);

  // 启动服务器
  app.listen(config.port, '127.0.0.1', () => {
    console.log(`🌐 Web 管理界面: http://127.0.0.1:${config.port}`);
  });
}
