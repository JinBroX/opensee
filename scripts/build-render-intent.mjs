// build-render-intent.mjs
// 从卦结构推导每卦的 V 层意图
// 输出: engine/render/render-intent.json

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const archetypes = JSON.parse(readFileSync(join(root, 'semantic/archetypes/core-archetypes.json'), 'utf8'));
const hexMap    = JSON.parse(readFileSync(join(root, 'engine/structure/hexagram-map.json'), 'utf8'));

// ─── Classification rules ───
// analyze hexagram → { primary, secondary, reason }

function classify(hexId, arche, hex) {
  // ═══════════════════════════════════════════
  // 2.4 校准版：V1=结构判断(默认), V2=动作容器, V3=意象共振
  // 原则：structural_break / polarity / critical_decision → V1
  //        gradual / action_only / stillness_obs → V2
  //        symbolic_resonance → V3
  // ═══════════════════════════════════════════

  // ── V3: symbolic resonance (意象共振，不适合直说) ──
  if (['Q30','Q31','Q44','Q50','Q58','Q59','Q61','Q64'].includes(hexId)) {
    return { primary: 'v3', secondary: ['v1','v2'], reason: 'symbolic_resonance' };
  }

  // ── V1: structural_break (结构断裂→必须判断，不能柔化) ──
  if (['Q3','Q6','Q12','Q23','Q25','Q28','Q29','Q36','Q38','Q39','Q47','Q54'].includes(hexId)) {
    return { primary: 'v1', secondary: ['v2'], reason: 'structural_break' };
  }

  // ── V1: critical_decision (临界决策→必须断) ──
  if (['Q16','Q18','Q21','Q40','Q43','Q55','Q62'].includes(hexId)) {
    return { primary: 'v1', secondary: ['v2'], reason: 'critical_decision' };
  }

  // ── V1: extreme_structure (极性结构→不能柔化) ──
  if (['Q27','Q52'].includes(hexId)) {
    return { primary: 'v1', secondary: ['v2','v3'], reason: 'extreme_structure' };
  }

  // ── V1: structure_clarity (结构明确→需要判断) ──
  if (['Q1','Q2','Q7','Q13','Q14','Q34','Q35','Q37','Q45','Q49','Q51','Q57'].includes(hexId)) {
    return { primary: 'v1', secondary: ['v2'], reason: 'structure_clarity' };
  }

  // ── V2: gradual_process (渐进过程→适合动作容器) ──
  if (['Q5','Q8','Q9','Q26','Q32','Q46','Q48','Q53','Q56','Q60'].includes(hexId)) {
    return { primary: 'v2', secondary: ['v1'], reason: 'gradual_process' };
  }

  // ── V2: cyclical_return (循环回转→适合过程描述) ──
  if (['Q11','Q24','Q63'].includes(hexId)) {
    return { primary: 'v2', secondary: ['v1'], reason: 'cyclical_return' };
  }

  // ── V2: action_guidance (纯动作导向→不需要结构解释) ──
  if (['Q22','Q41','Q42'].includes(hexId)) {
    return { primary: 'v2', secondary: ['v1'], reason: 'action_guidance' };
  }

  // ── V2: stillness_observation (静观→不适合判断) ──
  if (['Q15','Q20'].includes(hexId)) {
    return { primary: 'v2', secondary: ['v1','v3'], reason: 'stillness_observation' };
  }

  // ── V2: unstable_threshold (不稳定临界→需要稳定框架) ──
  if (['Q4','Q10','Q17','Q19','Q33'].includes(hexId)) {
    return { primary: 'v2', secondary: ['v1'], reason: 'unstable_threshold' };
  }

  // ── fallback: 基于结构的通用规则 ──
  if (hexId === 'Q8')  return { primary: 'v2', secondary: ['v1'], reason: 'gradual_process' };

  // 任何未被覆写的卦
  return { primary: 'v1', secondary: ['v2'], reason: 'structure_clarity' };
}

// ─── Main ───
const table = {};

for (let i = 1; i <= 64; i++) {
  const hexId = `Q${i}`;
  const arche = archetypes[hexId];
  const hex = hexMap[hexId];

  if (!arche || !hex) {
    console.warn(`Missing data for ${hexId}`);
    continue;
  }

  table[hexId] = classify(hexId, arche, hex);
}

// Write
const outPath = join(root, 'engine', 'render', 'render-intent.json');
writeFileSync(outPath, JSON.stringify(table, null, 2));

// ─── Stats ───
const dist = {};
const reasonDist = {};
for (const [id, r] of Object.entries(table)) {
  dist[r.primary] = (dist[r.primary] || 0) + 1;
  reasonDist[r.reason] = (reasonDist[r.reason] || 0) + 1;
}

console.log('Primary V distribution:');
for (const [v, n] of Object.entries(dist).sort()) {
  console.log('  ' + v + ': ' + n);
}

console.log('\nReason distribution:');
for (const [r, n] of Object.entries(reasonDist).sort((a,b) => b[1]-a[1])) {
  console.log('  ' + r + ': ' + n);
}

// V3 primary list
const v3List = Object.entries(table).filter(([,r]) => r.primary === 'v3').map(([id]) => id);
console.log('\nV3 primary (' + v3List.length + '):', v3List.join(', '));

// Not-V2 list (V2 is not even secondary)
const noV2 = Object.entries(table).filter(([,r]) => !r.secondary.includes('v2')).map(([id]) => id);
console.log('No V2 secondary (' + noV2.length + '):', noV2.join(', '));

console.log('\nWritten to', outPath);
