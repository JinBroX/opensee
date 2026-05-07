/**
 * 导入 64 卦古典文本到数据库
 * 运行：node seed_classics.js
 */
import { initDb } from './db/init.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const db = await initDb();

  const classics = JSON.parse(
    readFileSync(join(__dirname, 'data', 'classics-v1.json'), 'utf-8')
  );

  const now = new Date().toISOString();
  let inserted = 0;
  let updated = 0;

  for (const item of classics) {
    const existing = db.get(
      'SELECT id FROM hexagram_classics WHERE hexagram_id = ? AND source = ? AND version = ?',
      item.hexagram_id, item.source, item.version ?? 'v1'
    );

    if (existing) {
      db.run(
        `UPDATE hexagram_classics SET
          title = ?, gua_ci = ?, tuan_zhuan = ?, xiang_zhuan = ?,
          yao_ci = ?, meta = ?, updated_at = ?
         WHERE id = ?`,
        item.title ?? '',
        item.gua_ci ?? '',
        item.tuan_zhuan ?? '',
        item.xiang_zhuan ?? '',
        JSON.stringify(item.yao_ci ?? []),
        JSON.stringify(item.meta ?? {}),
        now,
        existing.id
      );
      updated++;
    } else {
      db.run(
        `INSERT INTO hexagram_classics
          (id, hexagram_id, version, source, title, gua_ci, tuan_zhuan, xiang_zhuan, yao_ci, meta, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        randomUUID(),
        item.hexagram_id,
        item.version ?? 'v1',
        item.source ?? 'zhouyi',
        item.title ?? '',
        item.gua_ci ?? '',
        item.tuan_zhuan ?? '',
        item.xiang_zhuan ?? '',
        JSON.stringify(item.yao_ci ?? []),
        JSON.stringify(item.meta ?? {}),
        now,
        now
      );
      inserted++;
    }
  }

  // 强制写盘
  db.save();

  console.log(`✅ 导入完成：新增 ${inserted} 条，更新 ${updated} 条，合计 ${inserted + updated} 条`);
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 导入失败:', err);
  process.exit(1);
});
