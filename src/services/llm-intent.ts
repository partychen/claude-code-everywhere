import { z } from 'zod';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { logger } from '../utils/logger.js';

/**
 * 操作类型枚举
 */
export enum OperationType {
  // 开发任务
  TASK = 'task',

  // 目录管理
  DIR_ADD = 'dir_add',
  DIR_LIST = 'dir_list',
  DIR_INFO = 'dir_info',
  DIR_UPDATE = 'dir_update',
  DIR_DELETE = 'dir_delete',
  DIR_SET_DEFAULT = 'dir_set_default',

  // 预览管理
  PREVIEW_START = 'preview_start',
  PREVIEW_STOP = 'preview_stop',
  PREVIEW_STOP_ALL = 'preview_stop_all',
  PREVIEW_STATUS = 'preview_status',

  // 历史管理
  HISTORY_VIEW = 'history_view',
  HISTORY_CLEAR = 'history_clear',

  // 系统
  SYSTEM_INFO = 'system_info',
  SYSTEM_HEALTH = 'system_health',
  HELP = 'help',
}

/**
 * 意图识别结果的结构化输出Schema
 */
export const IntentRecognitionSchema = z.object({
  operationType: z.nativeEnum(OperationType).describe('操作类型'),
  confidence: z.number().min(0).max(1).describe('置信度分数 (0-1)'),
  needsConfirmation: z.boolean().describe('是否需要用户确认'),
  reasoning: z.string().describe('推理过程说明'),
  confirmMessage: z.string().optional().describe('如需确认，发给用户的确认消息'),

  // 通用参数
  alias: z.string().nullable().optional().describe('目录或预览别名'),
  workingDir: z.string().nullable().optional().describe('工作目录（别名或路径）'),

  // 任务执行参数
  taskPrompt: z.string().optional().describe('任务描述'),
  newSession: z.boolean().optional().describe('是否新会话'),

  // 目录管理参数
  path: z.string().optional().describe('目录路径'),
  description: z.string().optional().describe('目录描述'),
  previewEnabled: z.boolean().optional().describe('是否启用预览'),
  startCmd: z.string().optional().describe('启动命令'),
  previewPort: z.number().optional().describe('预览端口'),
  isDefault: z.boolean().optional().describe('是否设为默认'),

  // 历史查看参数
  limit: z.number().optional().describe('查看历史的条数'),
});

export type IntentRecognition = z.infer<typeof IntentRecognitionSchema>;

/**
 * AI 意图识别系统提示词
 */
const INTENT_RECOGNITION_PROMPT = `你是智能意图识别助手，负责理解用户的自然语言请求并将其转换为结构化操作。

## 支持的操作类型

### 1. 开发任务 (task)
用户需要执行代码相关的任务：
- "帮我检查代码"、"优化性能"、"添加登录功能"
- "重构这个文件"、"修复bug"

### 2. 目录管理
- **dir_add**: 添加新目录
  - 示例: "添加目录 blog /path/to/blog"
  - 必需: alias, path
  - 可选: description, previewEnabled, startCmd, previewPort, isDefault

- **dir_list**: 列出所有目录
  - 示例: "列出所有目录"、"查看目录列表"

- **dir_info**: 查看目录详情
  - 示例: "查看 blog 目录信息"
  - 必需: alias

- **dir_update**: 更新目录配置
  - 示例: "更新 blog 的描述为xxx"
  - 必需: alias
  - 可选: description, previewEnabled, startCmd, previewPort

- **dir_delete**: 删除目录
  - 示例: "删除 blog 目录"
  - 必需: alias

- **dir_set_default**: 设置默认目录
  - 示例: "把 blog 设为默认目录"
  - 必需: alias

### 3. 预览管理
- **preview_start**: 启动预览
  - 示例: "启动 blog 的预览"
  - 必需: alias

- **preview_stop**: 停止预览
  - 示例: "停止 blog 的预览"
  - 必需: alias

- **preview_stop_all**: 停止所有预览
  - 示例: "停止所有预览"

- **preview_status**: 查看预览状态
  - 示例: "查看预览状态"
  - 可选: alias (为空则查看所有)

### 4. 历史管理
- **history_view**: 查看聊天历史
  - 示例: "查看 blog 的聊天记录"、"看看最近的对话"
  - 必需: alias
  - 可选: limit (默认10条)

- **history_clear**: 清空聊天历史
  - 示例: "清空 blog 的历史"
  - 必需: alias

### 5. 系统操作
- **system_info**: 查看系统信息
  - 示例: "系统信息"、"版本"

- **system_health**: 健康检查
  - 示例: "健康检查"、"服务状态"

- **help**: 查看帮助
  - 示例: "帮助"、"你能做什么"

## 解析规则

1. **识别操作类型**: 根据用户意图匹配对应的 operationType
2. **提取参数**: 从用户消息中提取所需参数
3. **评估置信度**:
   - 高 (0.85-1.0): 意图清晰，参数完整
   - 中 (0.6-0.84): 意图基本明确，部分参数缺失
   - 低 (0-0.59): 意图不明确
4. **判断确认需求**:
   - 置信度 < 0.8 需要确认
   - 删除、清空等危险操作需要确认
   - 参数不完整需要确认

## 特殊格式处理
- 当用户使用 [dir:alias] 格式时，将 alias 提取到 workingDir
- 当用户使用 [new] 标记时，设置 newSession = true

## 示例

### 示例 1: 开发任务
输入: "帮我优化 blog 项目的性能"
输出:
{
  "operationType": "task",
  "taskPrompt": "优化性能",
  "workingDir": "blog",
  "newSession": false,
  "confidence": 0.9,
  "needsConfirmation": false,
  "reasoning": "明确的优化任务，指定了工作目录"
}

### 示例 2: 添加目录
输入: "添加一个目录 blog 路径是 /Users/me/blog 描述是我的博客"
输出:
{
  "operationType": "dir_add",
  "alias": "blog",
  "path": "/Users/me/blog",
  "description": "我的博客",
  "confidence": 0.95,
  "needsConfirmation": false,
  "reasoning": "添加目录操作，所有必需参数都已提供"
}

### 示例 3: 需要确认的操作
输入: "删除 blog 目录"
输出:
{
  "operationType": "dir_delete",
  "alias": "blog",
  "confidence": 0.9,
  "needsConfirmation": true,
  "reasoning": "删除操作需要用户确认",
  "confirmMessage": "⚠️ 确认要删除目录 'blog' 吗？此操作不可恢复。"
}

### 示例 4: 参数不足
输入: "添加一个目录"
输出:
{
  "operationType": "dir_add",
  "confidence": 0.5,
  "needsConfirmation": true,
  "reasoning": "缺少必需参数：别名和路径",
  "confirmMessage": "请提供以下信息：\n- 目录别名（如：blog）\n- 目录路径（如：/path/to/blog）\n\n示例：添加目录 blog /path/to/blog"
}

### 示例 5: 查看历史
输入: "看看我在 blog 项目的最近20条聊天记录"
输出:
{
  "operationType": "history_view",
  "alias": "blog",
  "limit": 20,
  "confidence": 0.95,
  "needsConfirmation": false,
  "reasoning": "明确的历史查看请求，参数完整"
}

### 示例 6: 预览管理
输入: "启动 blog 的预览"
输出:
{
  "operationType": "preview_start",
  "alias": "blog",
  "confidence": 0.95,
  "needsConfirmation": false,
  "reasoning": "明确的预览启动请求"
}

## 注意事项
- 对于模糊的请求，优先设置 needsConfirmation = true
- 删除、清空等危险操作必须设置 needsConfirmation = true
- 如果用户请求不属于任何操作类型，使用 task 类型处理
`;

/**
 * LangChain 意图识别服务
 */
export class IntentRecognizer {
  private llm: BaseChatModel;
  private confidenceThreshold: number;

  constructor(llm: BaseChatModel, confidenceThreshold: number = 0.8) {
    this.llm = llm;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * 识别用户意图
   */
  async recognize(
    userMessage: string,
    conversationHistory?: string[]
  ): Promise<IntentRecognition> {
    try {
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', '{systemPrompt}'],
        ['user', '用户消息: {message}\n\n对话历史:\n{history}'],
      ]);

      const structuredLLM = this.llm.withStructuredOutput(IntentRecognitionSchema);

      const response = await prompt.pipe(structuredLLM).invoke({
        systemPrompt: INTENT_RECOGNITION_PROMPT,
        message: userMessage,
        history: conversationHistory?.join('\n') || '(无)',
      });

      // 自动判断是否需要确认（基于置信度）
      if (response.confidence < this.confidenceThreshold && !response.needsConfirmation) {
        response.needsConfirmation = true;
        response.confirmMessage = this.generateConfirmMessage(response);
        logger.info(`低置信度 (${response.confidence.toFixed(2)})，自动设置需要确认`);
      }

      logger.info(
        `意图识别完成: taskPrompt="${response.taskPrompt}", confidence=${response.confidence.toFixed(2)}, needsConfirmation=${response.needsConfirmation}`
      );

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`意图识别失败: ${errorMsg}`);
      throw new Error(`意图识别失败: ${errorMsg}`);
    }
  }

  /**
   * 生成确认消息
   */
  private generateConfirmMessage(intent: IntentRecognition): string {
    const lines = ['我理解您想要:', `- 操作: ${this.getOperationDisplayName(intent.operationType)}`];

    if (intent.alias) {
      lines.push(`- 别名: ${intent.alias}`);
    }

    if (intent.workingDir) {
      lines.push(`- 工作目录: ${intent.workingDir}`);
    }

    if (intent.taskPrompt) {
      lines.push(`- 任务: ${intent.taskPrompt}`);
    }

    if (intent.newSession) {
      lines.push('- 新会话模式');
    }

    lines.push('');
    lines.push(`置信度: ${(intent.confidence * 100).toFixed(0)}%`);
    lines.push('');
    lines.push('是否继续执行？(回复"确认"或"取消")');

    return lines.join('\n');
  }

  /**
   * 获取操作类型的显示名称
   */
  private getOperationDisplayName(type: OperationType): string {
    const displayNames: Record<OperationType, string> = {
      [OperationType.TASK]: '执行任务',
      [OperationType.DIR_ADD]: '添加目录',
      [OperationType.DIR_LIST]: '列出目录',
      [OperationType.DIR_INFO]: '查看目录详情',
      [OperationType.DIR_UPDATE]: '更新目录',
      [OperationType.DIR_DELETE]: '删除目录',
      [OperationType.DIR_SET_DEFAULT]: '设置默认目录',
      [OperationType.PREVIEW_START]: '启动预览',
      [OperationType.PREVIEW_STOP]: '停止预览',
      [OperationType.PREVIEW_STOP_ALL]: '停止所有预览',
      [OperationType.PREVIEW_STATUS]: '查看预览状态',
      [OperationType.HISTORY_VIEW]: '查看历史',
      [OperationType.HISTORY_CLEAR]: '清空历史',
      [OperationType.SYSTEM_INFO]: '查看系统信息',
      [OperationType.SYSTEM_HEALTH]: '健康检查',
      [OperationType.HELP]: '查看帮助',
    };
    return displayNames[type] || type;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testResult = await this.recognize('测试消息');
      return testResult !== null;
    } catch {
      return false;
    }
  }
}
