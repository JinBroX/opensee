import express from 'express';

const router = express.Router();

// 公共配置（无需认证）
router.get('/config', (_req, res) => {
  res.json({
    paypalClientId: process.env.PAYPAL_CLIENT_ID || '',
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    freeLimit: 3,        // 免费用户每月次数
    paidLimit: 30,       // 付费用户每月次数
  });
});

export default router;
