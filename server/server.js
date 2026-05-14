import express from 'express';
import cors from 'cors';
import { initDb } from './db/init.js';
import authRoutes from './routes/auth.js';
import hexagramRoutes from './routes/hexagrams.js';
import divinationRoutes from './routes/divinations.js';
import aiChatRoutes from './routes/ai-chat.js';
import configRoutes from './routes/config.js';
import subscriptionRoutes from './routes/subscription.js';

const PORT = process.env.PORT || 3001;

async function start() {
  // 初始化数据库
  await initDb();

  const app = express();

  app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080', 'http://127.0.0.1:8080'], credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/hexagrams', hexagramRoutes);
  app.use('/api/divinations', divinationRoutes);
  app.use('/api', aiChatRoutes);
  app.use('/api', configRoutes);
  app.use('/api', subscriptionRoutes);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use((_req, res) => res.status(404).json({ success: false, message: 'API 不存在' }));

  app.use((err, _req, res, _next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  });

  app.listen(PORT, () => {
    console.log(`\n  OpenSee API Server\n  http://localhost:${PORT}\n`);
  });
}

start().catch(e => { console.error(e); process.exit(1); });
