import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

/**
 * 数据库服务
 */
export class DatabaseService {
  private db: Database.Database;

  constructor(dataPath?: string) {
    const dataDir = dataPath || join(homedir(), 'data');

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(join(dataDir, 'data.db'));
    this.db.pragma('journal_mode = WAL');
    this.initTables();
  }

  private initTables(): void {
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

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_is_default
      ON working_directories(is_default)
    `);

    this.migrateAddPreviewFields();

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

  private migrateAddPreviewFields(): void {
    const columns = this.db
      .prepare('PRAGMA table_info(working_directories)')
      .all() as Array<{ name: string }>;
    const columnNames = columns.map((col) => col.name);

    if (!columnNames.includes('preview_enabled')) {
      this.db.exec('ALTER TABLE working_directories ADD COLUMN preview_enabled INTEGER DEFAULT 0');
    }
    if (!columnNames.includes('start_cmd')) {
      this.db.exec('ALTER TABLE working_directories ADD COLUMN start_cmd TEXT');
    }
    if (!columnNames.includes('preview_port')) {
      this.db.exec('ALTER TABLE working_directories ADD COLUMN preview_port INTEGER DEFAULT 3000');
    }
  }

  getDb(): Database.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}
