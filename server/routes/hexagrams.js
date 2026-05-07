import { Router } from 'express';
import { run, get, all } from '../db/init.js';

const router = Router();

function ok(res, data) { res.json({ success: true, data }); }
function fail(res, msg, code = 400) { res.status(code).json({ success: false, message: msg }); }
function now() { return new Date().toISOString(); }

// 获取卦象古典文本（彖传/象传/爻辞）
// GET /api/hexagrams/:hexId/classics?source=zhouyi&version=v1
router.get('/:hexId/classics', (req, res) => {
  const { hexId } = req.params;
  const { source, version } = req.query;

  try {
    let rows;
    if (source && version) {
      rows = all(
        'SELECT * FROM hexagram_classics WHERE hexagram_id = ? AND source = ? AND version = ? ORDER BY source',
        hexId, source, version
      );
    } else if (source) {
      rows = all(
        'SELECT * FROM hexagram_classics WHERE hexagram_id = ? AND source = ? ORDER BY version',
        hexId, source
      );
    } else {
      rows = all(
        'SELECT * FROM hexagram_classics WHERE hexagram_id = ? ORDER BY source, version',
        hexId
      );
    }

    if (!rows.length) return fail(res, '未找到古典文本', 404);

    ok(res, {
      hexagram_id: hexId,
      classics: rows.map(r => ({
        id: r.id,
        source: r.source,
        version: r.version,
        title: r.title,
        gua_ci: r.gua_ci,
        tuan_zhuan: r.tuan_zhuan,
        xiang_zhuan: r.xiang_zhuan,
        yao_ci: JSON.parse(r.yao_ci || '[]'),
        meta: JSON.parse(r.meta || '{}'),
        updated_at: r.updated_at,
      })),
    });
  } catch (e) {
    console.error(e);
    fail(res, '服务器错误', 500);
  }
});

// 获取单个卦象
router.get('/:hexId', (req, res) => {
  const { hexId } = req.params;
  const { version } = req.query;

  try {
    if (version) {
      const row = get('SELECT * FROM hexagrams WHERE id = ? AND version = ?', hexId, version);
      if (!row) return fail(res, '卦象不存在', 404);
      return ok(res, {
        id: row.id, version: row.version, summary: row.summary,
        segments: JSON.parse(row.segments || '{}'),
        lines: JSON.parse(row.lines || '[]'),
      });
    }

    const rows = all('SELECT * FROM hexagrams WHERE id = ?', hexId);
    if (!rows.length) return fail(res, '卦象不存在', 404);
    ok(res, { versions: rows });
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 列表
router.get('/', (_req, res) => {
  try {
    const rows = all('SELECT id, version, summary, updated_at FROM hexagrams ORDER BY id, version');
    ok(res, { hexagrams: rows });
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 新增 / 更新
router.post('/', (req, res) => {
  const { id, version = 'v1', summary, segments, lines } = req.body;
  if (!id) return fail(res, '卦象 ID 不能为空');
  const t = now();

  try {
    run(
      `INSERT INTO hexagrams (id,version,summary,segments,lines,updated_at)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(id,version) DO UPDATE SET summary=excluded.summary,segments=excluded.segments,lines=excluded.lines,updated_at=excluded.updated_at`,
      id, version, summary ?? '', JSON.stringify(segments ?? {}), JSON.stringify(lines ?? []), t
    );
    ok(res, { message: '已保存', id, version });
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 批量导入
router.post('/batch', (req, res) => {
  const { hexagrams } = req.body;
  if (!Array.isArray(hexagrams) || !hexagrams.length) return fail(res, '需要卦象数组');

  try {
    const t = now();
    for (const h of hexagrams) {
      run(
        `INSERT INTO hexagrams (id,version,summary,segments,lines,updated_at)
         VALUES (?,?,?,?,?,?)
         ON CONFLICT(id,version) DO UPDATE SET summary=excluded.summary,segments=excluded.segments,lines=excluded.lines,updated_at=excluded.updated_at`,
        h.id, h.version || 'v1', h.summary || '', JSON.stringify(h.segments || {}), JSON.stringify(h.lines || []), t
      );
    }
    ok(res, { message: `成功导入 ${hexagrams.length} 条` });
  } catch (e) { fail(res, '服务器错误', 500); }
});

export default router;
