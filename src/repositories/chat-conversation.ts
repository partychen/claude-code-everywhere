import Database from 'better-sqlite3';

export interface ChatConversation {
  id: number;
  alias: string;
  user_message: string;
  assistant_message: string;
  created_at: number;
}

export interface CreateConversationParams {
  alias: string;
  user_message: string;
  assistant_message: string;
}

/**
 * 聊天对话记录仓库（每条记录包含一次完整的问答）
 */
export class ChatConversationRepository {
  constructor(private db: Database.Database) {}

  /**
   * 保存一次完整的对话（问题+回答）
   */
  create(params: CreateConversationParams): ChatConversation {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO chat_conversations (alias, user_message, assistant_message, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      params.alias,
      params.user_message,
      params.assistant_message,
      now
    );

    return {
      id: result.lastInsertRowid as number,
      alias: params.alias,
      user_message: params.user_message,
      assistant_message: params.assistant_message,
      created_at: now,
    };
  }

  /**
   * 获取指定工作目录的最近 N 次对话
   */
  findRecentByAlias(alias: string, limit: number = 1): ChatConversation[] {
    const stmt = this.db.prepare(`
      SELECT id, alias, user_message, assistant_message, created_at
      FROM chat_conversations
      WHERE alias = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const conversations = stmt.all(alias, limit) as ChatConversation[];
    return conversations.reverse(); // 反转顺序，最早的在前
  }

  /**
   * 分页获取对话记录（用于下拉加载更多）
   * @param alias 工作目录别名
   * @param beforeId 在此 ID 之前的对话（用于分页）
   * @param limit 每页对话数量
   */
  findByAliasBeforeId(
    alias: string,
    beforeId: number,
    limit: number = 5
  ): ChatConversation[] {
    const stmt = this.db.prepare(`
      SELECT id, alias, user_message, assistant_message, created_at
      FROM chat_conversations
      WHERE alias = ? AND id < ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const conversations = stmt.all(alias, beforeId, limit) as ChatConversation[];
    return conversations.reverse(); // 反转顺序，最早的在前
  }

  /**
   * 删除指定工作目录的所有对话记录
   */
  deleteByAlias(alias: string): void {
    const stmt = this.db.prepare('DELETE FROM chat_conversations WHERE alias = ?');
    stmt.run(alias);
  }
}
