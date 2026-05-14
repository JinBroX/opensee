# OpenSee Engine

## 架构分层

```
engine/
├── structure/     ★ 纯易经结构层（不可变数据）
├── transform/     ★ 变换规则层（实时计算）
├── generation/       生成层（预留：Seed + Salt）
└── runtime/          运行时（对外接口）
```

---

## 各层职责

### structure/ — 纯易经结构层

**只包含易经的原始结构定义，禁止心理学语言、禁止现代解释、禁止 render 文案。**

| 文件 | 内容 |
|------|------|
| `bagua-map.json` | 八卦：名称、卦象、五行、阴阳、方位、属性 |
| `hexagram-map.json` | 64 卦：上下卦、卦序、卦名、阴阳爻编码 |
| `trigram-relations.json` | 八卦关系：先天配对、后天顺序、五行映射 |
| `five-elements.json` | 五行生克：金水木火土的生成与控制关系 |

这层是 **OpenSee 的最底层本体**。任何卦的"属性"都应从这里查询，不应从 semantic 层推断。

### transform/ — 变换规则层

**实现易经的四种结构变换，全部严格依据原始规则，禁止 AI 推断。**

| 文件 | 变换类型 | 规则 |
|------|----------|------|
| `change-rules.js` | 之卦（变卦） | 6→7, 9→8, 7/8 不变 |
| `opposite-rules.js` | 错卦 | 六爻全变，逐位取反 |
| `inverse-rules.js` | 综卦 | 六爻上下颠倒 |
| `mutual-rules.js` | 互卦 | 2-3-4 爻为下卦，3-4-5 爻为上卦 |

所有变换为**纯函数**：输入 hexId 或 yao 数组，输出 hexId。

### generation/ — 生成层（预留）

未来从 runtime 拆分出的 Seed + Salt 生成逻辑。

### runtime/ — 运行时

对外暴露 `window.OpenSee` / `window.ZenTap` 接口。
runtime 通过调用 structure、transform、semantic 三层完成卦象生成。

---

## 数据流

```
用户触发
    │
    ▼
runtime (engine.js)
    │
    ├──→ generation: Seed + Salt → 生成 yao 数组
    │
    ├──→ structure/hexagram-map.json: 查询卦名、上下卦
    │
    ├──→ transform/: 计算之卦、错卦、综卦、互卦
    │
    └──→ semantic/v1/: 加载 render 文案
           │
           ▼
        前端展示
```

---

## 核心原则

1. **structure 是骨架** — 定义了"卦是什么"
2. **transform 是运动** — 定义了"卦如何变"
3. **semantic 是皮肤** — 定义了"卦如何被人类理解"
4. **runtime 是调度器** — 组合以上三层完成一次卦象生成

semantic 层不能决定结构，只能翻译结构。
