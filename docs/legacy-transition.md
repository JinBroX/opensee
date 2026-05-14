# Legacy: transition.json

## 当前状态

`states/hexagrams/Q*/transition.json` 中的 `mutual.segments` 和 `changed.segments`
字段是 **V1 时期的静态文案**，描述了互卦和变卦的"人类可读解释"。

这些文案是由人工写作的，用于 render 层展示。

## 退役原因

1. **transition 关系应该由 engine 实时计算**，不应依赖静态 JSON
2. 互卦（互体）、变卦（之卦）、错卦、综卦的结构关系
   已经实现在 `engine/transform/` 中：
   - `mutual-rules.js` — 互卦计算
   - `change-rules.js` — 之卦计算
   - `opposite-rules.js` — 错卦计算
   - `inverse-rules.js` — 综卦计算
3. 这四种变换关系是易经的**纯结构规则**，不需要"解释文案"
4. 未来 frontend 如需展示 transition 信息，
   应调用 `engine/transform/` 计算结构关系，
   再通过 `semantic/archetypes/core-archetypes.json` 获取状态定义，
   而非读取静态 transition.json

## 保留计划

- `transition.json` 继续保留在 `states/hexagrams/Q*/` 中
- 标记为 legacy，不再作为主要数据源
- 未来版本将彻底删除

## 迁移路径

```
旧路径:
  states/hexagrams/Q*/transition.json → frontend 直接读取文案

新路径:
  engine/transform/mutual-rules.js → 计算互卦 hexId
  semantic/archetypes/core-archetypes.json → 读取状态定义
  semantic/v1/Q*.json → 读取人类可读文本
```

## 当前影响

- 无 frontend 页面直接依赖 `transition.json`
- 无 engine 代码依赖 `transition.json`
- 该文件仅作为备份保留
