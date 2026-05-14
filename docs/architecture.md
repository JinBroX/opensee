# OpenSee 2.0 Architecture

## Overview

OpenSee 是一个**东方状态观察系统**——不是算命网站，不是 AI 聊天应用。

它将易经 64 卦作为**状态语言体系**，通过 Seed + Salt 混合算法生成卦象，
并通过三层渲染系统（明晰 / 意象 / 空灵）映照用户当下的心理状态。

## 四层架构

```
┌─────────────────────────────────────┐
│  frontend/    体验层                 │
│  显示、交互、动画                    │
│  不包含任何引擎逻辑                  │
└──────────────┬──────────────────────┘
               │ import / script src
┌──────────────▼──────────────────────┐
│  engine/      状态引擎层             │
│  Seed + Salt → 取卦 → 版本选择       │
│  纯函数，无 DOM 依赖                 │
└──────────────┬──────────────────────┘
               │ fetch
┌──────────────▼──────────────────────┐
│  states/      状态数据层             │
│  core.json + transition.json        │
│  + render-v1/v2/v3.json             │
└──────────────┬──────────────────────┘
               │ API
┌──────────────▼──────────────────────┐
│  server/      服务层                 │
│  认证、AI 对话、订阅、数据持久化      │
└─────────────────────────────────────┘
```

## 各层职责

### frontend/ — 体验层

- **只负责**: 显示、交互、动画、用户输入
- **不负责**: 卦象生成、Seed 计算、熵混合
- 所有页面统一通过 `/engine/runtime/engine.js` 引用引擎
- 禁止页面内联引擎逻辑

页面清单:
- `index.html` — 主页面（意识映照、句流、Hold-to-generate）
- `ask.html` — 具体事项问卦
- `content.html` — 卦象结果展示
- `opensee.html` — 心流句场
- `opensee-me.html` — 个人状态探索
- `profile.html` — 用户认证与历史

### engine/ — 状态引擎层

- **只负责**: 熵收集、Seed 生成、Salt 混合、取卦、版本选择
- **不负责**: UI 渲染、数据持久化
- 全局接口: `window.OpenSee` / `window.ZenTap`
- 数据路径: `/states/hexagrams/Q*/render-*.json`

当前结构:
```
engine/
├── runtime/engine.js   ← 核心引擎（完整取卦管线）
├── seed/               ← 预留：种子生成模块
├── transition/         ← 预留：状态变换模块
└── utils/              ← 预留：工具函数
```

核心算法:
1. SHA-256(timestamp@ip#uid) → uint32 Seed
2. Salt = buildSalt(user behavior) → SHA-256 → uint32
3. mixedSeed = (seed32 + salt32 × 3) >>> 0
4. xorshift32(mixedSeed) → PRNG
5. randomYao × 6 → [6/7/8/9]
6. 二进制编码 → Q1–Q64
7. selectVersion(salt32) → v1/v2/v3
8. fetch `/states/hexagrams/Q{n}/render-{v}.json`

### states/ — 状态数据层

每个卦由三个独立文件组成:

| 文件 | 职责 | 内容 |
|------|------|------|
| `core.json` | 状态核心 | id, meta, yaos, segments(status/trend/mind/risk) |
| `transition.json` | 状态变化关系 | mutual segments, changed segments |
| `render-v1.json` | 渲染层 v1 (明晰) | summary, closing, lines, segments |
| `render-v2.json` | 渲染层 v2 (意象) | 同上，诗意/隐喻风格 |
| `render-v3.json` | 渲染层 v3 (空灵) | 同上，极简留白风格 |

三层渲染的设计意图:
- v1 = 日常意象，直接切近
- v2 = 隐喻比喻，间接回响
- v3 = 极简留白，沉默中见深度

版本由 Salt 特征自动选择（如 lingerTime、pointer 轨迹等），用户无感知。

### server/ — 服务层

- API 后端 (port 3001): 认证、AI 对话、卦象数据、订阅管理
- 数据库: SQLite (sql.js)
- AI: DeepSeek API

### server.js (根) — 静态文件服务

- Port 3003
- frontend/ 挂载在 `/`
- engine/ 挂载在 `/engine`
- assets/ 挂载在 `/assets`
- states/ 挂载在 `/states`
- data/ 挂载在 `/data`（向后兼容）

## 页面依赖图

```
index.html ──→ /engine/runtime/engine.js
            ──→ /states/core/s1_pool.json
            ──→ /states/hexagrams/Q*/render-*.json
            ──→ /assets/opensee-hero.jpg
            ──→ /assets/opensee-1.jpg

ask.html  ──→ /js/api.js
          ──→ /engine/runtime/engine.js

content.html ──→ /js/api.js
             ──→ /engine/runtime/engine.js

opensee.html ──→ /states/core/s1_pool.json

opensee-me.html ──→ /states/core/s1_pool.json
                ──→ /states/hexagrams/Q*/render-v1.json
                ──→ /assets/hero.png

profile.html ──→ (无静态依赖，仅 API 调用)
```

## 设计原则

1. **Frontend 只显示** — 不计算状态
2. **Engine 只计算** — 不渲染 UI
3. **States 只描述** — 不含逻辑
4. **Server 只服务** — 不介入生成

## 向后兼容

- `window.OpenSee` / `window.ZenTap` 全局接口不变
- `window.ZenTapAI` / `window.OpenSeeAI` 全局接口不变
- `data/` 目录保留，原 `semantic-v1.json` 改名为 `legacy-semantic-v1.json`
- `generateHexagramResult()` 返回值结构不变
