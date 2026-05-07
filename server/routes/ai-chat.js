/**
 * AI 问卦路由
 * POST /api/ai-chat
 * 调用 DeepSeek API 生成卦象解读
 */
import { Router } from 'express';
import { get, run, exec } from '../db/init.js';
import crypto from 'crypto';

const router = Router();

// DeepSeek 配置（支持环境变量或配置文件）
function getDeepSeekConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  };
}


// 确保 anon_quota 表存在（懒初始化，首次请求时执行）
let anonTableReady = false;
function ensureAnonTable() {
  if (anonTableReady) return;
  // anon_quota：按天重置，date 字段记录当前日期
  exec(`CREATE TABLE IF NOT EXISTS anon_quota (
    uid       TEXT PRIMARY KEY,
    remaining INTEGER DEFAULT 3,
    date      TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  // 兼容旧表：尝试添加缺失列
  try { exec(`ALTER TABLE anon_quota ADD COLUMN date TEXT DEFAULT ''`); } catch(e) {}
  try { exec(`ALTER TABLE users ADD COLUMN quota_date TEXT DEFAULT ''`); } catch(e) {}
  exec(`CREATE TABLE IF NOT EXISTS global_usage (
    month     TEXT PRIMARY KEY,
    count     INTEGER DEFAULT 0
  )`);
  anonTableReady = true;
}

// 每天免费次数
const FREE_DAILY_LIMIT = 3;

// 全局月度请求上限：单个用户每月最多 1500 次（防极端滥用）
const GLOBAL_MONTHLY_LIMIT = 1500;

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function checkGlobalLimit() {
  ensureAnonTable();
  const month = getCurrentMonth();
  const row = get('SELECT count FROM global_usage WHERE month = ?', month);
  return row ? row.count : 0;
}

function incrementGlobalCount() {
  const month = getCurrentMonth();
  const row = get('SELECT count FROM global_usage WHERE month = ?', month);
  if (row) {
    run('UPDATE global_usage SET count = count + 1 WHERE month = ?', month);
  } else {
    run('INSERT INTO global_usage (month, count) VALUES (?, 1)', month);
  }
}

// 获取今天日期字符串 YYYY-MM-DD
function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 检查用户订阅状态 & 扣减次数
function checkQuota(uid) {
  ensureAnonTable();
  const user = get('SELECT * FROM users WHERE id = ?', uid);
  if (user) {
    if (user.subscription_tier === 'paid') return { allowed: true, tier: 'paid', remaining: Infinity };
    // 注册用户也按天重置
    const today = getToday();
    const lastDate = user.quota_date || '';
    const remaining = (lastDate === today) ? (user.subscription_remaining ?? 0) : FREE_DAILY_LIMIT;
    if (remaining <= 0) return { allowed: false, tier: 'free', remaining: 0, resetType: 'daily' };
    return { allowed: true, tier: 'free', remaining };
  }
  // 未注册用户：按天重置
  const today = getToday();
  const row = get('SELECT remaining, date FROM anon_quota WHERE uid = ?', uid);
  let remaining;
  if (!row) {
    remaining = FREE_DAILY_LIMIT;
  } else if (row.date !== today) {
    // 新的一天，重置次数
    remaining = FREE_DAILY_LIMIT;
  } else {
    remaining = row.remaining;
  }
  if (remaining <= 0) return { allowed: false, tier: 'free', remaining: 0, resetType: 'daily' };
  return { allowed: true, tier: 'free', remaining };
}

function deductQuota(uid) {
  ensureAnonTable();
  const today = getToday();
  const user = get('SELECT * FROM users WHERE id = ?', uid);
  if (user) {
    if (user.subscription_tier === 'paid') return;
    const lastDate = user.quota_date || '';
    if (lastDate !== today) {
      // 新的一天，重置为 FREE_DAILY_LIMIT - 1
      run('UPDATE users SET subscription_remaining = ?, quota_date = ? WHERE id = ?', FREE_DAILY_LIMIT - 1, today, uid);
    } else {
      run('UPDATE users SET subscription_remaining = MAX(0, subscription_remaining - 1) WHERE id = ?', uid);
    }
  } else {
    const row = get('SELECT remaining, date FROM anon_quota WHERE uid = ?', uid);
    if (!row) {
      run('INSERT INTO anon_quota (uid, remaining, date) VALUES (?, ?, ?)', uid, FREE_DAILY_LIMIT - 1, today);
    } else if (row.date !== today) {
      // 新的一天，重置
      run('UPDATE anon_quota SET remaining = ?, date = ?, updated_at = datetime(\'now\') WHERE uid = ?', FREE_DAILY_LIMIT - 1, today, uid);
    } else {
      run('UPDATE anon_quota SET remaining = MAX(0, remaining - 1), updated_at = datetime(\'now\') WHERE uid = ?', uid);
    }
  }
}

// 记录对话历史（匿名用户用 token，登录用户用 user_id）
function saveChat(uid, hexagramId, question, answer) {
  try {
    const user = get('SELECT * FROM users WHERE id = ?', uid);
    const userId = user ? uid : null;
    const mode = 'iching';
    run(
      `INSERT INTO divinations (id,user_id,seed,hexagram_id,yaos,question,answer,mode,created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      crypto.randomUUID(), userId,
      `${Date.now()}|${hexagramId}`,
      hexagramId, '[]', question, answer, mode,
      new Date().toISOString()
    );
  } catch (e) {
    console.warn('saveChat failed:', e.message);
  }
}

// 调用 DeepSeek API
async function callDeepSeek(messages, config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const resp = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek API error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? '';
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// 构建系统提示词
function buildSystemPrompt(hexagramId, yaos, mode) {
  // 获取当前准确时间
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
  const currentTime = `${year}年${month}月${day}日 ${weekday} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  return `你是一位精通大六壬的占卜师，根据当下的时空能量场，直接给用户具体明确的解答。

当前时间：${currentTime}（请以此时间为准进行占卜判断）

请注意：
- 不透露、提及任何具体的卦象名称（如"乾卦"、"坤卦"等）或卦的编号
- 不描述爻位、六爻结构等符号信息
- 回答要直接了当，干净利落，给出明确的判断和行动建议
- 不要使用禅意装饰性语言，不要绕弯子，不要故作神秘
- 当涉及时间、日期、期限时，必须给出具体的公历日期（如"3月28日"、"2026年4月5日"），不能使用"近日"、"月底"、"下周"等模糊表述
- 当前是${year}年，不是${year - 1}年，也不是其他年份，请务必基于${currentTime}这个时间点来判断
- 像实战派占卜师一样，根据能量场给出可操作的指导，包括具体时间点`;
}

// 核心路由
router.post('/ai-chat', async (req, res) => {
  const { uid, hexagramId, question, yaos, mode = 'iching' } = req.body;

  // 参数校验
  if (!uid || !hexagramId || !question) {
    return res.status(400).json({ success: false, code: 'INVALID_PARAMS', error: '参数不完整' });
  }
  if (question.trim().length < 2) {
    return res.status(400).json({ success: false, code: 'QUESTION_TOO_SHORT', error: '问题太短了，请详细描述你的困惑' });
  }
  if (question.trim().length > 500) {
    return res.status(400).json({ success: false, code: 'QUESTION_TOO_LONG', error: '问题太长了，请控制在500字以内' });
  }

  // 额度检查
  const quota = checkQuota(uid);
  if (!quota.allowed) {
    return res.status(403).json({
      success: false,
      code: 'QUOTA_EXCEEDED',
      error: '本月免费额度已用完',
      tier: 'free',
      remaining: 0,
    });
  }

  // 全局月度上限检查（防极端用户：1500次/月后放慢响应）
  const globalCount = checkGlobalLimit();
  if (globalCount >= GLOBAL_MONTHLY_LIMIT) {
    const delay = 3000 + Math.random() * 5000; // 3~8 秒随机延迟
    await new Promise(r => setTimeout(r, delay));
    return res.status(503).json({
      success: false,
      code: 'SERVER_BUSY',
      error: '服务器繁忙，请稍后再试',
    });
  }

  const config = getDeepSeekConfig();
  if (!config.apiKey) {
    return res.status(500).json({ success: false, code: 'NO_API_KEY', error: 'AI 服务未配置，请联系管理员设置 DEEPSEEK_API_KEY' });
  }

  try {
    const messages = [
      { role: 'system', content: buildSystemPrompt(hexagramId, yaos, mode) },
      { role: 'user', content: question.trim() },
    ];

    const answer = await callDeepSeek(messages, config);

    if (!answer || answer.trim().length === 0) {
      throw new Error('AI 返回为空');
    }

    // 扣减次数（付费用户不扣）
    if (quota.tier === 'free') {
      deductQuota(uid);
    }

    // 记录全局月度计数
    incrementGlobalCount();

    // 记录到数据库
    saveChat(uid, hexagramId, question.trim(), answer);

    const newRemaining = quota.tier === 'paid' ? Infinity : Math.max(0, quota.remaining - 1);

    res.json({
      success: true,
      answer: answer.trim(),
      remaining: newRemaining,
      used: quota.tier === 'paid' ? 0 : quota.remaining - 1,
      tier: quota.tier,
    });
  } catch (e) {
    console.error('[AI-Chat]', e.message);

    if (e.name === 'AbortError' || e.message.includes('abort')) {
      return res.status(504).json({ success: false, code: 'TIMEOUT', error: 'AI 响应超时，请重试' });
    }

    res.status(500).json({ success: false, code: 'AI_ERROR', error: 'AI 服务暂时不可用，请稍后重试' });
  }
});

export default router;
