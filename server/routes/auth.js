import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { run, get, all } from '../db/init.js';

const router = Router();

function ok(res, data, code = 200) { res.status(code).json({ success: true, data }); }
function fail(res, msg, code = 400) { res.status(code).json({ success: false, message: msg }); }
function now() { return new Date().toISOString(); }

function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

// 注册
router.post('/register', async (req, res) => {
  const { email, password, nickname = '' } = req.body;
  if (!email || !password) return fail(res, '邮箱和密码不能为空');
  if (!validEmail(email)) return fail(res, '邮箱格式不正确');
  if (password.length < 6) return fail(res, '密码至少 6 位');

  try {
    const exist = get('SELECT id FROM users WHERE email = ?', email.toLowerCase().trim());
    if (exist) return fail(res, '该邮箱已注册', 409);

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    const t = now();

    run(
      'INSERT INTO users (id,email,password_hash,nickname,subscription_tier,subscription_remaining,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
      id, email.toLowerCase().trim(), hash, nickname.trim(), 'free', 3, t, t
    );

    ok(res, { userId: id, email: email.toLowerCase() }, 201);
  } catch (e) {
    console.error('register error:', e);
    fail(res, '服务器错误', 500);
  }
});

// 登录
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, '邮箱和密码不能为空');

  try {
    const user = get('SELECT * FROM users WHERE email = ?', email.toLowerCase().trim());
    if (!user) return fail(res, '邮箱或密码错误', 401);

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return fail(res, '邮箱或密码错误', 401);

    run("UPDATE users SET updated_at = ? WHERE id = ?", now(), user.id);

    ok(res, {
      userId: user.id,
      email: user.email,
      nickname: user.nickname || '',
      avatarUrl: user.avatar_url || '',
      subscription: {
        tier: user.subscription_tier,
        remaining: user.subscription_remaining,
        end: user.subscription_end || '',
      }
    });
  } catch (e) {
    console.error('login error:', e);
    fail(res, '服务器错误', 500);
  }
});

// 获取当前用户
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return fail(res, '未登录', 401);
  const userId = auth.replace('Bearer ', '');

  try {
    const user = get(
      'SELECT id,email,nickname,avatar_url,subscription_tier,subscription_remaining,subscription_end,created_at FROM users WHERE id = ?',
      userId
    );
    if (!user) return fail(res, '用户不存在', 404);

    ok(res, {
      userId: user.id,
      email: user.email,
      nickname: user.nickname || '',
      avatarUrl: user.avatar_url || '',
      subscription: {
        tier: user.subscription_tier,
        remaining: user.subscription_remaining,
        end: user.subscription_end || '',
      }
    });
  } catch (e) { fail(res, '服务器错误', 500); }
});

// 更新资料
router.patch('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return fail(res, '未登录', 401);
  const userId = auth.replace('Bearer ', '');
  const { nickname, avatarUrl } = req.body;

  if (nickname !== undefined) run('UPDATE users SET nickname = ?, updated_at = ? WHERE id = ?', nickname, now(), userId);
  if (avatarUrl !== undefined) run('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?', avatarUrl, now(), userId);

  ok(res, { message: '更新成功' });
});

// 订阅状态更新（支付回调）
router.post('/subscription/update', (req, res) => {
  const { email, tier, remaining, end } = req.body;
  if (!email || !tier) return fail(res, '参数不完整');
  run(
    'UPDATE users SET subscription_tier = ?, subscription_remaining = ?, subscription_end = ?, updated_at = ? WHERE email = ?',
    tier, remaining ?? 9999, end ?? '', now(), email.toLowerCase().trim()
  );
  ok(res, { message: '订阅状态已更新' });
});

export default router;
