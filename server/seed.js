/**
 * seed.js
 * 将 public/data/hexagrams/ 下所有卦象 JSON 文件导入 SQLite 数据库
 * 用法：node seed.js
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, run } from './db/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HEX_DIR = join(__dirname, '../public/data/hexagrams');

async function seed() {
  await initDb();
  console.log('\n[Seed] 开始导入卦象数据...');

  const dirs = readdirSync(HEX_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith('Q'))
    .map(d => d.name);

  let count = 0;
  let skipped = 0;

  for (const dir of dirs) {
    const hexDir = join(HEX_DIR, dir);
    const files = readdirSync(hexDir).filter(f => f.startsWith('semantic-') && f.endsWith('.json'));

    for (const file of files) {
      const versionMatch = file.match(/semantic-(.+)\.json/);
      if (!versionMatch) continue;
      const version = versionMatch[1];

      try {
        const raw = JSON.parse(readFileSync(join(hexDir, file), 'utf-8'));

        const id = raw.id || dir;
        const summary = raw.summary || '';
        const segments = raw.main?.segments || raw.segments || {};
        const lines = raw.main?.lines || raw.lines || [];

        run(
          `INSERT INTO hexagrams (id, version, summary, segments, lines, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(id, version) DO UPDATE SET
             summary = excluded.summary,
             segments = excluded.segments,
             lines = excluded.lines,
             updated_at = excluded.updated_at`,
          id,
          version,
          summary,
          JSON.stringify(segments),
          JSON.stringify(lines)
        );

        console.log(`  ✓ ${id} [${version}] ${summary}`);
        count++;
      } catch (e) {
        console.warn(`  ✗ ${dir}/${file}: ${e.message}`);
        skipped++;
      }
    }
  }

  console.log(`\n[Seed] 完成：${count} 条导入，${skipped} 条跳过\n`);
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
