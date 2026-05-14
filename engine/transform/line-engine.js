// ====================== OpenSee Line Engine ======================
// 爻级分析引擎 —— 将卦象分解为六爻的运动结构
// 加载 line-structure / line-dynamics / line-relations 三个结构文件
// 对外暴露 window.OpenSee.LineEngine (浏览器) 或 ESM export (Node)

(function () {
  'use strict';

  let STRUCTURES = null;

  // ---------- 初始化：加载结构数据 ----------
  async function init(structures) {
    if (structures) {
      STRUCTURES = structures;
    } else {
      const [lineStruct, lineDyn, lineRel] = await Promise.all([
        fetch('/engine/structure/line-structure.json').then(r => r.json()),
        fetch('/engine/structure/line-dynamics.json').then(r => r.json()),
        fetch('/engine/structure/line-relations.json').then(r => r.json())
      ]);
      STRUCTURES = { lineStruct, lineDyn, lineRel };
    }
    return STRUCTURES;
  }

  // ---------- 动态类型解析 ----------
  function getDynamic(yaoValue) {
    if (yaoValue === 9) return STRUCTURES.lineDyn.yang_moving;
    if (yaoValue === 6) return STRUCTURES.lineDyn.yin_moving;
    if (yaoValue === 7) return STRUCTURES.lineDyn.yang_still;
    if (yaoValue === 8) return STRUCTURES.lineDyn.yin_still;
    return null;
  }

  // ---------- A. 解析动爻 ----------
  function parseMovingLines(yaos) {
    if (!STRUCTURES) throw new Error('LineEngine not initialized. Call init() first.');
    const moving = [];
    for (let i = 0; i < 6; i++) {
      const dyn = getDynamic(yaos[i]);
      if (dyn && dyn.state === 'moving') {
        moving.push({
          line: i + 1,
          yao_value: yaos[i],
          dynamic_type: dyn.name,
          transition: dyn.transition,
          direction: dyn.direction,
          effect: dyn.effect_on_structure
        });
      }
    }
    return moving;
  }

  // ---------- B. 单爻结构分析 ----------
  function analyzeLine(lineNum, yaoValue) {
    if (!STRUCTURES) throw new Error('LineEngine not initialized.');
    const pos = STRUCTURES.lineStruct[String(lineNum)];
    const dyn = getDynamic(yaoValue);
    if (!pos || !dyn) return null;

    return {
      line: lineNum,
      position: pos.position,
      phase: pos.phase,
      layer: pos.layer,
      meaning: pos.meaning,
      risk: pos.risk,
      is_central: pos.is_central,
      polarity: dyn.polarity,
      dynamic: dyn.state === 'moving' ? `${dyn.polarity}_moving` : `${dyn.polarity}_still`,
      transition: dyn.transition,
      effect: dyn.effect_on_structure
    };
  }

  // ---------- C. 全卦爻位分析 ----------
  function analyzeAllLines(yaos) {
    if (!STRUCTURES) throw new Error('LineEngine not initialized.');
    const analysis = [];
    for (let i = 0; i < 6; i++) {
      analysis.push(analyzeLine(i + 1, yaos[i]));
    }
    return analysis;
  }

  // ---------- D. 爻位关系分析 ----------
  function analyzeRelations(yaos) {
    if (!STRUCTURES) throw new Error('LineEngine not initialized.');
    const rel = STRUCTURES.lineRel;
    const result = { correspondence: [], centrality: [], proper: [], adjacency: [] };

    // 应位
    for (const pair of rel.correspondence.pairs) {
      const lower = yaos[pair.lower - 1];
      const upper = yaos[pair.upper - 1];
      const lowerYang = (lower === 7 || lower === 9);
      const upperYang = (upper === 7 || upper === 9);
      const harmonious = (lowerYang !== upperYang);
      result.correspondence.push({
        pair: [pair.lower, pair.upper],
        lower_polarity: lowerYang ? 'yang' : 'yin',
        upper_polarity: upperYang ? 'yang' : 'yin',
        type: harmonious ? 'harmonious' : 'dissonant',
        status: harmonious ? '有应' : '无应'
      });
    }

    // 中位
    for (const pos of rel.centrality.positions) {
      const yv = yaos[pos - 1];
      const isYang = (yv === 7 || yv === 9);
      result.centrality.push({
        line: pos,
        polarity: isYang ? 'yang' : 'yin',
        status: '中心得位'
      });
    }

    // 当位
    const yangPos = rel.proper_position.yang_positions;
    const yinPos = rel.proper_position.yin_positions;
    for (let i = 0; i < 6; i++) {
      const yv = yaos[i];
      const isYang = (yv === 7 || yv === 9);
      const lineNum = i + 1;
      let proper = false;
      if (isYang && yangPos.includes(lineNum)) proper = true;
      if (!isYang && yinPos.includes(lineNum)) proper = true;
      result.proper.push({
        line: lineNum,
        polarity: isYang ? 'yang' : 'yin',
        status: proper ? '当位' : '不当位'
      });
    }

    // 承乘比（相邻关系）
    for (const pair of rel.adjacency.pairs) {
      const below = yaos[pair.below - 1];
      const above = yaos[pair.above - 1];
      const belowYang = (below === 7 || below === 9);
      const aboveYang = (above === 7 || above === 9);
      let ascType, descType;
      // 承：下承上
      if (!belowYang && aboveYang) ascType = '顺承';
      else if (belowYang && !aboveYang) ascType = '逆承';
      else ascType = '平承';
      // 乘：上乘下
      if (aboveYang && !belowYang) descType = '顺乘';
      else if (!aboveYang && belowYang) descType = '逆乘';
      else descType = '平乘';
      result.adjacency.push({
        pair: [pair.below, pair.above],
        ascending: ascType,
        descending: descType
      });
    }

    return result;
  }

  // ---------- E. 完整分析输出 ----------
  function fullAnalysis(yaos) {
    if (!STRUCTURES) throw new Error('LineEngine not initialized.');
    const moving = parseMovingLines(yaos);
    const lineAnalysis = analyzeAllLines(yaos);
    const relations = analyzeRelations(yaos);

    // 统计
    const movingCount = moving.length;
    const centralMoving = moving.filter(m => m.line === 2 || m.line === 5);
    const extremeMoving = moving.filter(m => m.line === 1 || m.line === 6);

    return {
      moving_lines: moving.map(m => m.line),
      moving_count: movingCount,
      moving_detail: moving,
      line_analysis: lineAnalysis,
      relations,
      summary: {
        has_movement: movingCount > 0,
        movement_intensity: movingCount <= 1 ? 'subtle' : movingCount <= 2 ? 'moderate' : 'intense',
        central_affected: centralMoving.length > 0,
        extremes_affected: extremeMoving.length > 0,
        dominant_dynamic: moving.length > 0
          ? (moving.filter(m => m.dynamic_type === '老阳').length >= moving.filter(m => m.dynamic_type === '老阴').length
            ? 'yang_dominant' : 'yin_dominant')
          : 'balanced'
      }
    };
  }

  // ---------- 暴露 ----------
  const API = { init, parseMovingLines, analyzeLine, analyzeAllLines, analyzeRelations, fullAnalysis };

  if (typeof window !== 'undefined') {
    window.OpenSee = window.OpenSee || {};
    window.OpenSee.LineEngine = API;
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.OpenSeeLineEngine = API;
  }

})();
