import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname);
const DB_FILE = join(DATA_DIR, 'zen_tap.db');

let db = null;
let saveTimer = null;

// 延迟写入：每次修改后 500ms 再写盘，减少 IO
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (db) {
      const data = db.export();
      const buf = Buffer.from(data);
      writeFileSync(DB_FILE, buf);
      console.log('[DB] saved to disk');
    }
  }, 500);
}

// 同步 API（初始化后 db 为同步调用）
function run(sql, ...args) {
  db.run(sql, args);
  scheduleSave();
}
function get(sql, ...args) {
  const stmt = db.prepare(sql);
  stmt.bind(args);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}
function all(sql, ...args) {
  const stmt = db.prepare(sql);
  stmt.bind(args);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}
function exec(sql) {
  db.exec(sql);
  scheduleSave();
}

// ---------- 初始化 ----------
async function initDb() {
  const SQL = await initSqlJs();

  if (existsSync(DB_FILE)) {
    const buf = readFileSync(DB_FILE);
    db = new SQL.Database(buf);
    console.log('[DB] loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('[DB] created new database');
  }

  // 建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      email           TEXT UNIQUE NOT NULL,
      password_hash   TEXT NOT NULL,
      nickname        TEXT DEFAULT '',
      avatar_url      TEXT DEFAULT '',
      subscription_tier   TEXT DEFAULT 'free',
      subscription_remaining INTEGER DEFAULT 3,
      subscription_end     TEXT DEFAULT '',
      quota_date      TEXT DEFAULT '',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      token       TEXT UNIQUE NOT NULL,
      expires_at  TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hexagrams (
      id          TEXT PRIMARY KEY,
      version     TEXT DEFAULT 'v1',
      summary     TEXT DEFAULT '',
      segments    TEXT DEFAULT '{}',
      lines       TEXT DEFAULT '[]',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now')),
      UNIQUE(id, version)
    );

    CREATE TABLE IF NOT EXISTS divinations (
      id          TEXT PRIMARY KEY,
      user_id     TEXT,
      seed        TEXT NOT NULL,
      hexagram_id TEXT NOT NULL,
      yaos        TEXT NOT NULL,
      question    TEXT DEFAULT '',
      answer      TEXT DEFAULT '',
      mode        TEXT DEFAULT 'iching',
      created_at  TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_divinations_user ON divinations(user_id);
    CREATE INDEX IF NOT EXISTS idx_divinations_created ON divinations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hexagrams_id ON hexagrams(id);

    CREATE TABLE IF NOT EXISTS hexagram_classics (
      id              TEXT PRIMARY KEY,
      hexagram_id     TEXT NOT NULL,
      version         TEXT DEFAULT 'v1',
      source          TEXT DEFAULT '',
      title           TEXT DEFAULT '',
      gua_ci          TEXT DEFAULT '',
      tuan_zhuan      TEXT DEFAULT '',
      xiang_zhuan     TEXT DEFAULT '',
      yao_ci          TEXT DEFAULT '[]',
      meta            TEXT DEFAULT '{}',
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (hexagram_id) REFERENCES hexagrams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daliuren_config (
      id          TEXT PRIMARY KEY DEFAULT 'default',
      config      TEXT DEFAULT '{}',
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_classics_hexagram ON hexagram_classics(hexagram_id);
    CREATE INDEX IF NOT EXISTS idx_classics_source ON hexagram_classics(source);
  `);

  scheduleSave();
  console.log('[DB] initialized');

  return { run, get, all, exec, save: () => { if (saveTimer) clearTimeout(saveTimer); const data = db.export(); writeFileSync(DB_FILE, Buffer.from(data)); } };
}

export { initDb, run, get, all, exec };
