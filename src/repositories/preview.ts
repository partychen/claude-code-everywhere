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

  create(data: CreatePreviewServiceInput): PreviewService {
    const now = Date.now();
    const result = this.db
      .prepare(
        'INSERT INTO preview_services (alias, pid, tunnel_pid, port, tunnel_url, started_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(data.alias, data.pid, data.tunnelPid, data.port, data.tunnelUrl, now);

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

  findByAlias(alias: string): PreviewService | undefined {
    return this.db.prepare('SELECT * FROM preview_services WHERE alias = ?').get(alias) as
      | PreviewService
      | undefined;
  }

  findAll(): PreviewService[] {
    return this.db.prepare('SELECT * FROM preview_services ORDER BY started_at DESC').all() as PreviewService[];
  }

  delete(alias: string): void {
    this.db.prepare('DELETE FROM preview_services WHERE alias = ?').run(alias);
  }

  deleteAll(): void {
    this.db.exec('DELETE FROM preview_services');
  }

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
