import express from 'express';
import { exec, run } from '../db/init.js';

const router = express.Router();

// 获取用户订阅状态
// 前端使用 uid（localStorage 生成的随机字符串），但数据库用 id（用户注册才有）
// 对于未注册用户，返回默认免费用户状态
router.get('/subscription', (req, res) => {
  const { uid } = req.query;
  
  if (!uid) {
    return res.status(400).json({ success: false, message: '缺少 uid 参数' });
  }

  // 简单处理：未注册用户默认免费用户
  // 实际使用量存储在前端 localStorage，后端仅记录注册用户
  res.json({
    tier: 'free',
    questionsUsed: 0,
    remaining: 3,
    monthlyLimit: 3
  });
});

// 确认订阅（模拟支付成功）
router.post('/subscribe', (req, res) => {
  const { uid } = req.body;
  
  if (!uid) {
    return res.status(400).json({ success: false, message: '缺少 uid 参数' });
  }

  // 模拟订阅成功，返回付费状态
  res.json({ success: true, tier: 'paid', remaining: 30, monthlyLimit: 30 });
});

export default router;
