# OpenSee 2.0 — TODO

## 已完成迁移

- [x] 备份原项目到 `backups/full-backup-20260512/`
- [x] 创建新目录结构 (frontend/, engine/, states/, assets/, docs/)
- [x] 资源整合 — 所有图片/字体移到 `assets/`
- [x] 引擎解耦 — `js/app.js` → `engine/runtime/engine.js`
  - [x] loadHexagram 路径更新到 `/states/hexagrams/`
  - [x] 返回结构增加 `meta` 字段向后兼容
  - [x] 双路径 fallback（新 state 路径 + 旧 data 路径）
- [x] API 客户端迁移 — `js/api.js` → `frontend/js/api.js`
- [x] 数据迁移 — 64 卦 semantic JSON 拆分为 core.json + transition.json + render-*.json
  - [x] s1_pool.json → `states/core/s1_pool.json`
  - [x] s2_sentences.json → `states/core/s2_sentences.json`
  - [x] 原 semantic-v1.json 保留为 legacy-semantic-v1.json
- [x] 前端页面迁移 — 全部移到 `frontend/`
  - [x] index.html — 消除引擎内联重复，改为引用 `/engine/runtime/engine.js`
  - [x] ask.html — 更新 JS 引用路径
  - [x] content.html — 更新 JS 引用路径，修复 opentree-1.jpg
  - [x] opensee.html — 更新数据路径
  - [x] opensee-me.html — 更新数据路径
  - [x] profile.html — 无需修改
- [x] 服务器更新 — `server.js` 挂载 frontend/engine/assets/states/data
- [x] 清理旧文件 — 删除 public/、root HTML、js/、images/、font/
- [x] 生成 `docs/architecture.md`

## 风险项

1. **opensee-me.html 内联引擎** — 该页面的 sha256/xorshift32/getYaoValues 与 engine 版本略有不同（使用 `state % 4` 映射而非概率映射），因此保留为独立实现。**长期建议**统一到 engine 接口。
2. **content.html 的 opentree-1.jpg** — 原本引用不存在，现已修复为 `/assets/opentree-1.jpg`，需确认服务器上有此文件。
3. **s2.json 引用** — index.html 和 opensee.html 有 `data/hexagrams/Q*/s2.json` 的 fallback，此文件从未存在过，属于遗留死代码，不影响运行。
4. **localStorage key 不一致** — `api.js` 使用 `opensee_uid`，`opensee-me.html` 使用 `osee_uid`，两个页面认证状态不互通。

## 建议下一步

1. **补全 63 卦的 render-v2.json 和 render-v3.json** — 目前仅 Q50 有 v2/v3
2. **统一 opensee-me.html 引擎** — 将其独特算法合并到 engine 层，提供一个 `generateHexagramResultSimple()` 变体
3. **拆分 engine/runtime/engine.js** — 当前为单文件，可拆为 crypto.js / rng.js / seed.js / loader.js
4. **实现 transition system** — transition.json 已就位，但 forward/contrast/reverse 关系尚未填充，暂无页面使用
5. **添加 render-v4 或自定义渲染** — 三层渲染系统可扩展
6. **部署到服务器** — SSH root@43.128.101.103，代码路径 /var/www/zen-tap/
7. **CI/CD** — 考虑添加自动部署脚本
8. **测试覆盖** — 添加 seed/salt 算法的单元测试，保证重构不破坏生成逻辑

## 目录对比（重构前 → 重构后）

```
Before (1.0):                    After (2.0):
opensee/                         opensee/
├── index.html                   ├── frontend/
├── ask.html                     │   ├── index.html
├── content.html                 │   ├── ask.html
├── opensee.html                 │   ├── content.html
├── opensee-me.html              │   ├── opensee.html
├── profile.html                 │   ├── opensee-me.html
├── js/                          │   ├── profile.html
│   ├── api.js                   │   └── js/api.js
│   └── app.js                   ├── engine/
├── data/                        │   └── runtime/engine.js
│   ├── s1_pool.json             ├── states/
│   ├── s2_sentences.json        │   ├── core/
│   └── hexagrams/Q*/            │   └── hexagrams/Q*/
│       └── semantic-v1.json     │       ├── core.json
├── server/                      │       ├── transition.json
│   └── server.js                │       ├── render-v1.json
├── server.js                    │       ├── render-v2.json
├── *.jpg, *.png, *.svg          │       └── render-v3.json
├── images/                      ├── server/
├── font/                        │   └── server.js
├── public/ (过期镜像)            ├── server.js
└── ...                          ├── assets/
                                 │   └── *.jpg, *.png, *.svg
                                 ├── data/ (向后兼容)
                                 ├── docs/
                                 ├── backups/
                                 └── TODO.md
```
