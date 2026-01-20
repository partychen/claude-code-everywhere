import { Router } from 'express';
import { WorkingDirectoryRepository } from '../../repositories/working-directory.js';
import { ChatConversationRepository } from '../../repositories/chat-conversation.js';
import { executeTask } from '../../services/agent.js';
import { logger } from '../../utils/logger.js';

export interface ChatConfig {
  workingDirRepo: WorkingDirectoryRepository;
  chatConversationRepo: ChatConversationRepository;
  allowedRootDir: string;
}

export function createChatRouter(config: ChatConfig): Router {
  const router = Router();

  // 获取聊天历史
  router.get('/history/:alias', async (req, res) => {
    try {
      const alias = req.params.alias;
      const limit = parseInt(req.query.limit as string) || 1; // 默认只加载最后一次对话
      const beforeId = req.query.beforeId ? parseInt(req.query.beforeId as string) : null;

      let conversations;
      if (beforeId) {
        // 分页加载：加载 beforeId 之前的对话
        conversations = await config.chatConversationRepo.findByAliasBeforeId(alias, beforeId, limit);
      } else {
        // 初次加载：加载最近的对话
        conversations = await config.chatConversationRepo.findRecentByAlias(alias, limit);
      }

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Get chat history error:', errorMsg);
      res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  });

  // 清除聊天历史
  router.delete('/history/:alias', async (req, res) => {
    try {
      const alias = req.params.alias;
      await config.chatConversationRepo.deleteByAlias(alias);

      res.json({
        success: true,
        message: 'Chat history cleared',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Clear chat history error:', errorMsg);
      res.status(500).json({
        success: false,
        error: errorMsg,
      });
    }
  });

  router.post('/execute', async (req, res) => {
    const { alias, prompt, newSession } = req.body;

    if (!alias || !prompt) {
      res.status(400).json({
        code: 400,
        message: 'alias and prompt are required',
      });
      return;
    }

    try {
      const directory = await config.workingDirRepo.findByAlias(alias);

      if (!directory) {
        res.status(404).json({
          code: 404,
          message: `Directory ${alias} not found`,
        });
        return;
      }

      const workingDir = directory.path;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let assistantResponse = '';
      const sendEvent = (type: string, text: string) => {
        res.write(`data: ${JSON.stringify({ type, text })}\n\n`);
        if (type === 'assistant_response') {
          assistantResponse += text;
        }
      };

      try {
        await executeTask(
          {
            prompt,
            workingDir,
            newSession: Boolean(newSession),
          },
          async (text, messageType) => {
            sendEvent(messageType, text);
          }
        );

        // 保存完整的对话（问题 + 回答）
        if (assistantResponse) {
          config.chatConversationRepo.create({
            alias,
            user_message: prompt,
            assistant_message: assistantResponse,
          });
        }

        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error('Agent execution error:', errorMsg);
        sendEvent('error', errorMsg);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Chat API error:', errorMsg);

      if (!res.headersSent) {
        res.status(500).json({
          code: 500,
          message: errorMsg,
        });
      }
    }
  });

  return router;
}
