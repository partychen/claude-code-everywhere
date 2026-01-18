import Database from 'better-sqlite3';
import {
  WorkingDirectory,
  CreateWorkingDirectoryInput,
  UpdateWorkingDirectoryInput,
} from '../types/database.js';

/**
 * 工作目录数据仓库（个人使用版本，无需 conversation_id）
 */
export class WorkingDirectoryRepository {
  constructor(private db: Database.Database) {}

  /**
   * 创建工作目录配置
   */
  create(input: CreateWorkingDirectoryInput): WorkingDirectory {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO working_directories (
        alias, path, is_default, preview_enabled, start_cmd, preview_port, description, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.alias,
      input.path,
      input.isDefault ? 1 : 0,
      input.previewEnabled ? 1 : 0,
      input.startCmd || null,
      input.previewPort || 3000,
      input.description || null,
      now,
      now
    );

    return this.findById(result.lastInsertRowid as number)!;
  }

  /**
   * 根据 ID 查找
   */
  findById(id: number): WorkingDirectory | undefined {
    const stmt = this.db.prepare('SELECT * FROM working_directories WHERE id = ?');
    return stmt.get(id) as WorkingDirectory | undefined;
  }

  /**
   * 根据别名查找
   */
  findByAlias(alias: string): WorkingDirectory | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM working_directories
      WHERE alias = ?
    `);
    return stmt.get(alias) as WorkingDirectory | undefined;
  }

  /**
   * 获取默认工作目录
   */
  findDefault(): WorkingDirectory | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM working_directories
      WHERE is_default = 1
      LIMIT 1
    `);
    return stmt.get() as WorkingDirectory | undefined;
  }

  /**
   * 获取所有工作目录
   */
  findAll(): WorkingDirectory[] {
    const stmt = this.db.prepare(`
      SELECT * FROM working_directories
      ORDER BY is_default DESC, created_at ASC
    `);
    return stmt.all() as WorkingDirectory[];
  }

  /**
   * 更新工作目录
   */
  update(alias: string, input: UpdateWorkingDirectoryInput): boolean {
    const updates: string[] = [];
    const values: any[] = [];

    if (input.isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(input.isDefault ? 1 : 0);
    }

    if (input.previewEnabled !== undefined) {
      updates.push('preview_enabled = ?');
      values.push(input.previewEnabled ? 1 : 0);
    }

    if (input.startCmd !== undefined) {
      updates.push('start_cmd = ?');
      values.push(input.startCmd);
    }

    if (input.previewPort !== undefined) {
      updates.push('preview_port = ?');
      values.push(input.previewPort);
    }

    if (input.description !== undefined) {
      updates.push('description = ?');
      values.push(input.description);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(alias);

    const stmt = this.db.prepare(`
      UPDATE working_directories
      SET ${updates.join(', ')}
      WHERE alias = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  /**
   * 设置默认目录（清除其他默认标记）
   */
  setDefault(alias: string): boolean {
    const transaction = this.db.transaction(() => {
      // 清除所有默认标记
      const clearStmt = this.db.prepare(`
        UPDATE working_directories
        SET is_default = 0, updated_at = ?
      `);
      clearStmt.run(Date.now());

      // 设置新的默认目录
      const setStmt = this.db.prepare(`
        UPDATE working_directories
        SET is_default = 1, updated_at = ?
        WHERE alias = ?
      `);
      const result = setStmt.run(Date.now(), alias);
      return result.changes > 0;
    });

    return transaction();
  }

  /**
   * 删除工作目录
   */
  delete(alias: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM working_directories
      WHERE alias = ?
    `);
    const result = stmt.run(alias);
    return result.changes > 0;
  }
}
