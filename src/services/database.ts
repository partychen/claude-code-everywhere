import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * 数据库服务
 */
export class DatabaseService {
  private db: Database.Database;
  private dataDir: string;

  constructor(dataPath?: string) {
    // 默认数据目录为 ~/data
    this.dataDir = dataPath || join(homedir(), 'data');

    // 确保数据目录存在
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }

    // 打开数据库连接
    const dbPath = join(this.dataDir, 'data.db');
    this.db = new Database(dbPath);

    // 启用 WAL 模式以提高性能
    this.db.pragma('journal_mode = WAL');

    // 初始化表结构
    this.initTables();
  }

  /**
   * 初始化数据库表
   */
  private initTables(): void {
    // 工作目录配置表（个人使用，无需 conversation_id）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS working_directories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias TEXT NOT NULL UNIQUE,
        path TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_is_default
      ON working_directories(is_default)
    `);

    // 添加预览相关字段（如果不存在）
    this.migrateAddPreviewFields();

    // 预览服务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS preview_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alias TEXT NOT NULL UNIQUE,
        pid INTEGER NOT NULL,
        tunnel_pid INTEGER NOT NULL,
        port INTEGER NOT NULL,
        tunnel_url TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        FOREIGN KEY (alias) REFERENCES working_directories(alias) ON DELETE CASCADE
      )
    `);
  }

  /**
   * 迁移：添加预览相关字段到 working_directories
   */
  private migrateAddPreviewFields(): void {
    // 检查字段是否存在
    const columns = this.db
      .prepare("PRAGMA table_info(working_directories)")
      .all() as Array<{ name: string }>;

    const columnNames = columns.map((col) => col.name);

    // 添加 preview_enabled 字段
    if (!columnNames.includes('preview_enabled')) {
      this.db.exec(`
        ALTER TABLE working_directories ADD COLUMN preview_enabled INTEGER DEFAULT 0
      `);
    }

    // 添加 start_cmd 字段
    if (!columnNames.includes('start_cmd')) {
      this.db.exec(`
        ALTER TABLE working_directories ADD COLUMN start_cmd TEXT
      `);
    }

    // 添加 preview_port 字段
    if (!columnNames.includes('preview_port')) {
      this.db.exec(`
        ALTER TABLE working_directories ADD COLUMN preview_port INTEGER DEFAULT 3000
      `);
    }
  }

  /**
   * 获取数据库实例
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    this.db.close();
  }
}
