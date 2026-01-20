import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

export interface LLMConfig {
  provider: 'volcengine' | 'openai' | 'anthropic' | 'local' | 'qwen';
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM Provider 工厂
 * 根据配置创建不同的 LLM 实例
 */
export class LLMFactory {
  static createLLM(config: LLMConfig): BaseChatModel {
    switch (config.provider) {
      case 'volcengine':
        // 火山引擎使用 OpenAI 兼容接口
        return new ChatOpenAI({
          model: config.model,
          apiKey: config.apiKey,
          configuration: {
            baseURL: config.baseURL || 'https://ark.cn-beijing.volces.com/api/v3',
          },
          temperature: config.temperature ?? 0.3,
          maxTokens: config.maxTokens ?? 1024,
        });

      case 'openai':
        return new ChatOpenAI({
          model: config.model,
          apiKey: config.apiKey,
          configuration: config.baseURL ? { baseURL: config.baseURL } : undefined,
          temperature: config.temperature ?? 0.3,
          maxTokens: config.maxTokens ?? 1024,
        });

      case 'anthropic':
        return new ChatAnthropic({
          model: config.model,
          apiKey: config.apiKey,
          temperature: config.temperature ?? 0.3,
          maxTokens: config.maxTokens ?? 1024,
        });

      case 'qwen':
        // 阿里千问（通义千问）使用 OpenAI 兼容接口
        return new ChatOpenAI({
          model: config.model,
          apiKey: config.apiKey,
          configuration: {
            baseURL: config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          },
          temperature: config.temperature ?? 0.3,
          maxTokens: config.maxTokens ?? 1024,
        });

      case 'local':
        // 本地模型（Ollama 等）使用 OpenAI 兼容接口
        return new ChatOpenAI({
          model: config.model,
          apiKey: 'ollama', // Ollama 不需要真实 API key
          configuration: {
            baseURL: config.baseURL || 'http://localhost:11434/v1',
          },
          temperature: config.temperature ?? 0.3,
          maxTokens: config.maxTokens ?? 1024,
        });

      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
}
