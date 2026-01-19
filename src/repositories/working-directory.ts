import Database from 'better-sqlite3';
import {
  WorkingDirectory,
  CreateWorkingDirectoryInput,
  UpdateWorkingDirectoryInput,
} from '../types/database.js';

/**
 * 工作目录数据仓库
 */
export class WorkingDirectoryRepository {
  constructor(private db: Database.Database) {}

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

  findById(id: number): WorkingDirectory | undefined {
    return this.db.prepare('SELECT * FROM working_directories WHERE id = ?').get(id) as
      | WorkingDirectory
      | undefined;
  }

  findByAlias(alias: string): WorkingDirectory | undefined {
    return this.db.prepare('SELECT * FROM working_directories WHERE alias = ?').get(alias) as
      | WorkingDirectory
      | undefined;
  }

  findDefault(): WorkingDirectory | undefined {
    return this.db
      .prepare('SELECT * FROM working_directories WHERE is_default = 1 LIMIT 1')
      .get() as WorkingDirectory | undefined;
  }

  findAll(): WorkingDirectory[] {
    return this.db
      .prepare('SELECT * FROM working_directories ORDER BY is_default DESC, created_at ASC')
      .all() as WorkingDirectory[];
  }

  update(alias: string, input: UpdateWorkingDirectoryInput): boolean {
    const updates: string[] = [];
    const values: unknown[] = [];

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

    return stmt.run(...values).changes > 0;
  }

  setDefault(alias: string): boolean {
    return this.db.transaction(() => {
      this.db.prepare('UPDATE working_directories SET is_default = 0, updated_at = ?').run(Date.now());
      return (
        this.db
          .prepare('UPDATE working_directories SET is_default = 1, updated_at = ? WHERE alias = ?')
          .run(Date.now(), alias).changes > 0
      );
    })();
  }

  delete(alias: string): boolean {
    return this.db.prepare('DELETE FROM working_directories WHERE alias = ?').run(alias).changes > 0;
  }
}
