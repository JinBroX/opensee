# OpenSee Line Engine — 爻级引擎

## 为什么需要爻级引擎

易经真正的运动单位不是卦，而是**爻**。

64 卦是 384 爻（64 × 6）运动状态的**结构切片**。
停留在"卦级"意味着系统只能看到"哪个卦"——看不到"卦内部的运动"。

Line Engine 让 OpenSee 能够：
- 识别哪些爻在动
- 理解每爻在结构中的位置意义
- 分析爻与爻之间的关系（应、中、当、承乘）
- 输出结构化的爻级分析，而非文案

## 架构

```
engine/
├── structure/
│   ├── line-structure.json    ← 六爻位置定义
│   ├── line-dynamics.json     ← 阴阳动静规则
│   └── line-relations.json    ← 爻间关系规则
│
└── transform/
    └── line-engine.js         ← 爻级计算引擎
```

## 六爻位置模型

| 爻位 | 位置 | 阶段 | 含义 |
|------|------|------|------|
| 初爻 | beginning | emergence | 事物刚发生，能量在地下 |
| 二爻 | inner_stable | development | 内在成形，地面站稳 |
| 三爻 | threshold | transition | 内外交界，上下拉扯 |
| 四爻 | outer_entry | approach | 进入外部，靠近核心 |
| 五爻 | peak | culmination | 影响力最高点 |
| 上爻 | completion | reversal | 极限反转，终点含起点 |

## 动静模型

| 值 | 名称 | 状态 | 方向 |
|----|------|------|------|
| 9 | 老阳 | 动 | 极盛转衰 |
| 6 | 老阴 | 动 | 阴极阳生 |
| 7 | 少阳 | 静 | 稳定上升 |
| 8 | 少阴 | 静 | 稳定承托 |

## 爻间关系

- **应位** (correspondence)：1↔4, 2↔5, 3↔6。一阴一阳为有应，同阴阳为无应
- **中位** (centrality)：2 和 5。居中者天然更稳定
- **当位** (proper)：阳在 1/3/5，阴在 2/4/6 为当位
- **承乘** (adjacency)：相邻爻的上下顺逆关系

## 引擎能力

`window.OpenSee.LineEngine` 提供：

| 函数 | 输入 | 输出 |
|------|------|------|
| `init()` | (无) | 加载 3 个结构文件 |
| `parseMovingLines(yaos)` | 6爻数组 | 动爻列表 + 类型 + 方向 |
| `analyzeLine(n, yv)` | 爻位+爻值 | 该爻的完整结构画像 |
| `analyzeAllLines(yaos)` | 6爻数组 | 全部 6 爻的结构画像 |
| `analyzeRelations(yaos)` | 6爻数组 | 应位+中位+当位+承乘 |
| `fullAnalysis(yaos)` | 6爻数组 | 上述全部 + 统计摘要 |

## runtime 新增返回字段

`generateHexagramResult()` 返回中的 `line_engine` 字段：

```json
{
  "moving_lines": [2, 5],
  "moving_count": 2,
  "moving_detail": [{ "line": 2, "dynamic_type": "老阳", ... }],
  "line_analysis": [{ "line": 1, "position": "beginning", ... }, ...],
  "relations": {
    "correspondence": [{ "pair": [1,4], "status": "有应" }, ...],
    "centrality": [...],
    "proper": [...],
    "adjacency": [...]
  },
  "summary": {
    "has_movement": true,
    "movement_intensity": "moderate",
    "central_affected": true,
    "extremes_affected": false,
    "dominant_dynamic": "yang_dominant"
  }
}
```

## 未来扩展方向

基于爻级引擎，以下易经结构层可以逐步接入：

- **世应** (World-Response)：64 卦每卦有一个世爻和一个应爻，代表主体与客体
- **六亲** (Six Relations)：父母/兄弟/妻财/官鬼/子孙，基于五行生克
- **纳甲** (Stem-Branch)：天干地支与爻的对应
- **六神** (Six Spirits)：青龙/朱雀/勾陈/螣蛇/白虎/玄武
- **动爻权重**：多个动爻之间的优先级和冲突解决
- **飞伏** (Manifest/Hidden)：显爻与隐爻的关系

## 设计原则

- **结构优先**：line-structure/line-dynamics/line-relations 是纯结构数据，不含人类语言解释
- **计算分离**：line-engine.js 只做结构计算，不生成文案
- **语义独立**：爻的分析结果由 semantic 层翻译为人类语言，line-engine 只输出结构对象
