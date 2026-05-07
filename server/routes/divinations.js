import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db/init.js';

const router = Router();

function ok(res, data, code = 200) { res.status(code).json({ success: true, data }); }
function fail(res, msg, code = 400) { res.status(code).json({ success: false, message: msg }); }
function now() { return new Date().toISOString(); }

function getUserId(req) {
  const auth = req.headers.authorization;
  return auth ? auth.replace('Bearer ', '') : null;
}

// 记录占卜
router.post('/', (req, res) => {
  const userId = getUserId(req);
  const { seed, hexagramId, yaos, question = '', answer = '', mode = 'iching' } = req.body;
  if (!seed || !hexagramId) return fail(res, '参数不完整');

  try {
    const id = uuidv4();
    run(
      'INSERT INTO divinations (id,user_id,seed,hexagram_id,yaos,question,answer,mode,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
      id, userId || null, seed, hexagramId, JSON.stringify(yaos || []), question, answer, mode, now()
    );
    ok(res, { id, message: '已记录' }, 201);
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 历史记录
router.get('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return fail(res, '请先登录', 401);
  const { limit = 20, offset = 0 } = req.query;

  try {
    const rows = all(
      'SELECT id,seed,hexagram_id,yaos,question,answer,mode,created_at FROM divinations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      userId, Number(limit), Number(offset)
    );
    const total = get('SELECT COUNT(*) as n FROM divinations WHERE user_id = ?', userId)?.n ?? 0;

    ok(res, {
      records: rows.map(r => ({ ...r, yaos: JSON.parse(r.yaos || '[]'), createdAt: r.created_at })),
      total, limit: Number(limit), offset: Number(offset)
    });
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 单条详情
router.get('/:id', (req, res) => {
  const userId = getUserId(req);
  try {
    const row = get('SELECT * FROM divinations WHERE id = ?', req.params.id);
    if (!row) return fail(res, '记录不存在', 404);

    const pub = { id: row.id, hexagram_id: row.hexagram_id, yaos: JSON.parse(row.yaos || '[]'), mode: row.mode, createdAt: row.created_at };
    if (!userId) return ok(res, pub);

    ok(res, { ...row, yaos: JSON.parse(row.yaos || '[]'), createdAt: row.created_at });
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 删除
router.delete('/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return fail(res, '请先登录', 401);

  try {
    const row = get('SELECT user_id FROM divinations WHERE id = ?', req.params.id);
    if (!row) return fail(res, '记录不存在', 404);
    if (row.user_id !== userId) return fail(res, '无权删除', 403);

    run('DELETE FROM divinations WHERE id = ?', req.params.id);
    ok(res, { message: '已删除' });
  } catch (e) { fail(res, '服务器错误', 500); }
});

export default router;
