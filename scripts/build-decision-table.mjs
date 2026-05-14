// build-decision-table.mjs
// 从 engine/structure/ + semantic/archetypes/ 计算 64 卦决策表
// 输出: engine/decision/hexagram-decision-table.json

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const hexMap    = JSON.parse(readFileSync(join(root, 'engine/structure/hexagram-map.json'), 'utf8'));
const fiveElem  = JSON.parse(readFileSync(join(root, 'engine/structure/five-elements.json'), 'utf8'));
const bagua     = JSON.parse(readFileSync(join(root, 'engine/structure/bagua-map.json'), 'utf8'));
const archetypes = JSON.parse(readFileSync(join(root, 'semantic/archetypes/core-archetypes.json'), 'utf8'));

// ─── Element helpers ───
function trigramElement(symbol) {
  return bagua[symbol]?.element || 'unknown';
}
function elementRelation(upperEl, lowerEl) {
  if (upperEl === lowerEl) return 'same';
  const el = fiveElem[upperEl];
  if (!el) return 'unknown';
  if (el.generates === lowerEl) return 'upper_generates_lower';
  if (el.generated_by === lowerEl) return 'lower_generates_upper';
  if (el.controls === lowerEl) return 'upper_controls_lower';
  if (el.controlled_by === lowerEl) return 'lower_controls_upper';
  return 'neutral';
}

// ─── Decision rules ───

function computeState(arche, bin, upperEl, lowerEl) {
  const dt = arche.dynamic_type;
  const et = arche.energy_type;
  const sameTrigram = (upperEl === lowerEl);

  // Identical trigrams → extreme (乾/坤/震/艮/坎/离/巽/兑 pure)
  if (sameTrigram) return 'extreme';

  // Dynamic + Energy → State mapping
  if (dt === 'stillness') {
    if (et === 'blockage') return 'blocked';
    return 'stable';
  }
  if (dt === 'movement') {
    if (et === 'blockage') return 'blocked';
    return 'progressing';
  }
  if (dt === 'tension') {
    if (et === 'blockage') return 'blocked';
    if (et === 'accumulation') return 'blocked';
    return 'turning';
  }
  if (dt === 'transition') {
    if (et === 'blockage') return 'blocked';
    return 'turning';
  }
  return 'stable';
}

function computeDirection(arche, bin) {
  const yangCount = bin.filter(b => b === 1).length;
  const yinCount = 6 - yangCount;
  if (yangCount > yinCount) return 'up';
  if (yinCount > yangCount) return 'down';
  if (arche.dynamic_type === 'tension') return 'critical';
  return 'lateral';
}

function computeTiming(arche, rel) {
  const tm = arche.time_mode;
  if (tm === 'instant') return 'go';
  if (tm === 'delayed') return 'wait';
  if (tm === 'cyclic') return 'approaching';
  if (tm === 'threshold') {
    // Threshold with controlling relation → more caution
    if (rel === 'upper_controls_lower' || rel === 'lower_controls_upper') return 'no-go';
    if (rel === 'lower_generates_upper' || rel === 'upper_generates_lower') return 'approaching';
    return 'no-go';
  }
  return 'wait';
}

function computeRisk(arche, rel, bin) {
  const dt = arche.dynamic_type;
  const et = arche.energy_type;

  // Structural blockages always higher risk
  if (et === 'blockage') {
    if (rel === 'upper_controls_lower' || rel === 'lower_controls_upper') return 'critical_instability';
    return 'external_pressure';
  }

  // Tension states
  if (dt === 'tension') {
    if (rel === 'upper_controls_lower' || rel === 'lower_controls_upper') return 'internal_conflict';
    return 'imbalance';
  }

  // Transition states with contradictory elements
  if (dt === 'transition' && (rel === 'upper_controls_lower' || rel === 'lower_controls_upper')) {
    return 'imbalance';
  }

  // Check internal structure: even yin-yang distribution = balanced
  const yangCount = bin.filter(b => b === 1).length;
  if (yangCount === 3) return 'balanced';
  if (Math.abs(yangCount - 3) === 1) return 'balanced';
  if (Math.abs(yangCount - 3) >= 3) return 'imbalance';

  return 'balanced';
}

// ─── Main ───
const table = {};

for (let i = 1; i <= 64; i++) {
  const hexId = `Q${i}`;
  const hex = hexMap[hexId];
  const arche = archetypes[hexId];

  if (!hex || !arche) {
    console.warn(`Missing data for ${hexId}`);
    continue;
  }

  const upperEl = trigramElement(hex.upper);
  const lowerEl = trigramElement(hex.lower);
  const rel = elementRelation(upperEl, lowerEl);
  const bin = hex.binary;

  // Priority: chaotic states override
  let state = computeState(arche, bin, upperEl, lowerEl);

  table[hexId] = {
    state,
    direction: computeDirection(arche, bin),
    timing: computeTiming(arche, rel),
    risk: computeRisk(arche, rel, bin)
  };
}

// Write
const outPath = join(root, 'engine', 'decision', 'hexagram-decision-table.json');
writeFileSync(outPath, JSON.stringify(table, null, 2));
console.log(`Wrote ${Object.keys(table).length} entries to ${outPath}`);

// Print distribution
const dist = {};
for (const [id, d] of Object.entries(table)) {
  for (const [key, val] of Object.entries(d)) {
    dist[key] = dist[key] || {};
    dist[key][val] = (dist[key][val] || 0) + 1;
  }
}
console.log('\nDistributions:');
for (const [key, counts] of Object.entries(dist)) {
  console.log(`  ${key}:`, counts);
}
