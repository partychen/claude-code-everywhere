import Database from 'better-sqlite3';
import {
  PreviewService,
  CreatePreviewServiceInput,
  PreviewInfo,
} from '../types/database.js';

/**
 * 预览服务数据访问层
 */
export class PreviewRepository {
  constructor(private db: Database.Database) {}

  /**
   * 创建预览服务记录
   */
  create(data: CreatePreviewServiceInput): PreviewService {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO preview_services (alias, pid, tunnel_pid, port, tunnel_url, started_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.alias,
      data.pid,
      data.tunnelPid,
      data.port,
      data.tunnelUrl,
      now
    );

    return {
      id: result.lastInsertRowid as number,
      alias: data.alias,
      pid: data.pid,
      tunnel_pid: data.tunnelPid,
      port: data.port,
      tunnel_url: data.tunnelUrl,
      started_at: now,
    };
  }

  /**
   * 根据别名查询预览服务
   */
  findByAlias(alias: string): PreviewService | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM preview_services WHERE alias = ?
    `);
    return stmt.get(alias) as PreviewService | undefined;
  }

  /**
   * 查询所有运行中的预览服务
   */
  findAll(): PreviewService[] {
    const stmt = this.db.prepare(`
      SELECT * FROM preview_services ORDER BY started_at DESC
    `);
    return stmt.all() as PreviewService[];
  }

  /**
   * 删除预览服务记录
   */
  delete(alias: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM preview_services WHERE alias = ?
    `);
    stmt.run(alias);
  }

  /**
   * 删除所有预览服务记录
   */
  deleteAll(): void {
    this.db.exec('DELETE FROM preview_services');
  }

  /**
   * 转换为 PreviewInfo 格式
   */
  toPreviewInfo(service: PreviewService): PreviewInfo {
    return {
      alias: service.alias,
      port: service.port,
      tunnelUrl: service.tunnel_url,
      pid: service.pid,
      tunnelPid: service.tunnel_pid,
      startedAt: service.started_at,
    };
  }
}
