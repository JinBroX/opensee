// e2e-test.mjs — OpenSee 64卦 × 10 seeds 端到端测试
// 测试: generation → line_engine → decision → render_intent → V output

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ─── Load all data ───
const hexMap    = JSON.parse(readFileSync(join(root, 'engine/structure/hexagram-map.json'), 'utf8'));
const lineStruct = JSON.parse(readFileSync(join(root, 'engine/structure/line-structure.json'), 'utf8'));
const lineDyn   = JSON.parse(readFileSync(join(root, 'engine/structure/line-dynamics.json'), 'utf8'));
const lineRel   = JSON.parse(readFileSync(join(root, 'engine/structure/line-relations.json'), 'utf8'));
const decision  = JSON.parse(readFileSync(join(root, 'engine/decision/hexagram-decision-table.json'), 'utf8'));
const renderInt = JSON.parse(readFileSync(join(root, 'engine/render/render-intent.json'), 'utf8'));
const archetypes = JSON.parse(readFileSync(join(root, 'semantic/archetypes/core-archetypes.json'), 'utf8'));

// ─── Engine functions (from engine/runtime/engine.js) ───
async function sha256Hex(str) {
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  return hash;
}
function hexToUint32(hex) {
  return parseInt(hex.slice(0, 8), 16) >>> 0;
}
function xorshift32(seed) {
  let x = seed >>> 0;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    return (x >>> 0) / 0x100000000;
  };
}
function randomYao(rnd) {
  if (rnd < 0.125) return 9;
  if (rnd < 0.5) return 7;
  if (rnd < 0.875) return 8;
  return 6;
}
function yaosToHexagramId(yaos) {
  let bits = 0;
  for (let i = 0; i < 6; i++) {
    const isYang = (yaos[i] === 7 || yaos[i] === 9) ? 1 : 0;
    bits |= (isYang << i);
  }
  return 'Q' + (bits + 1);
}

// ─── Line Engine ───
function getDynamic(yv) {
  if (yv === 9) return lineDyn.yang_moving;
  if (yv === 6) return lineDyn.yin_moving;
  if (yv === 7) return lineDyn.yang_still;
  if (yv === 8) return lineDyn.yin_still;
  return null;
}
function lineAnalysis(yaos) {
  const moving = [];
  const analysis = [];
  for (let i = 0; i < 6; i++) {
    const dyn = getDynamic(yaos[i]);
    const pos = lineStruct[String(i + 1)];
    if (dyn && dyn.state === 'moving') {
      moving.push({ line: i + 1, dynamic_type: dyn.name, direction: dyn.direction, effect: dyn.effect_on_structure });
    }
    analysis.push({
      line: i + 1,
      position: pos.position,
      phase: pos.phase,
      polarity: dyn?.polarity || '?',
      dynamic: dyn?.state === 'moving' ? `${dyn.polarity}_moving` : `${dyn?.polarity || '?'}_still`,
    });
  }

  // Relations
  const corrPairs = lineRel.correspondence.pairs;
  const correspondence = corrPairs.map(({ lower, upper }) => {
    const lYang = (yaos[lower - 1] === 7 || yaos[lower - 1] === 9);
    const uYang = (yaos[upper - 1] === 7 || yaos[upper - 1] === 9);
    return { pair: [lower, upper], status: lYang !== uYang ? '有应' : '无应' };
  });

  const yangPos = lineRel.proper_position.yang_positions;
  const yinPos = lineRel.proper_position.yin_positions;
  const proper = [];
  for (let i = 0; i < 6; i++) {
    const isYang = (yaos[i] === 7 || yaos[i] === 9);
    const ln = i + 1;
    const ok = (isYang && yangPos.includes(ln)) || (!isYang && yinPos.includes(ln));
    proper.push({ line: ln, status: ok ? '当位' : '不当位' });
  }

  return {
    moving_lines: moving.map(m => m.line),
    moving_count: moving.length,
    moving_detail: moving,
    line_analysis: analysis,
    relations: { correspondence, proper },
    summary: {
      movement_intensity: moving.length <= 1 ? 'subtle' : moving.length <= 2 ? 'moderate' : 'intense',
    }
  };
}

// ─── Render Engine ───
function getVersionOrder(hexId) {
  const intent = renderInt[hexId];
  if (!intent) return ['v1'];
  return [intent.primary, ...(intent.secondary || [])];
}
function checkVAvailability(hexId, version) {
  const path = join(root, 'semantic', version, hexId + '.json');
  try { readFileSync(path); return true; } catch { return false; }
}
function selectV(hexId) {
  const order = getVersionOrder(hexId);
  const intent = renderInt[hexId];
  for (const v of order) {
    if (checkVAvailability(hexId, v)) {
      return {
        selected: v,
        intended: intent?.primary || 'v1',
        fallback: v !== (intent?.primary || 'v1'),
        reason: intent?.reason || 'unknown',
        tried: order
      };
    }
  }
  return { selected: 'v1', intended: intent?.primary || 'v1', fallback: true, reason: 'all_fallback', tried: order };
}

// ─── Test Harness ───
const RUNS_PER_HEX = 10;
const results = [];
const errors = [];

for (let i = 1; i <= 64; i++) {
  const hexId = 'Q' + i;

  for (let run = 0; run < RUNS_PER_HEX; run++) {
    const seed = Date.now() + '_' + Math.random().toString(36).slice(2);
    try {
      // 1. Generate
      const hash = await sha256Hex(seed);
      const seed32 = hexToUint32(hash);
      const rnd = xorshift32(seed32 + run);
      const yaos = Array.from({ length: 6 }, () => randomYao(rnd()));
      const generatedId = yaosToHexagramId(yaos);

      // 2. Line analysis
      const line = lineAnalysis(yaos);

      // 3. Decision
      const dec = decision[generatedId] || null;

      // 4. Render intent
      const render = selectV(generatedId);

      // 5. Check if V file exists for selected version
      const vExists = checkVAvailability(generatedId, render.selected);

      // 6. Consistency checks
      const renderHit = !render.fallback;
      const decRenderConflict = dec && render.intended ? checkConflict(dec, render) : false;

      results.push({
        hexId: generatedId,
        run,
        seed: seed.slice(0, 20),
        yaos,
        moving_count: line.moving_count,
        line_moving: line.moving_lines,
        decision: dec,
        render_intended: render.intended,
        render_selected: render.selected,
        render_fallback: render.fallback,
        render_hit: renderHit,
        v_exists: vExists,
        dec_render_conflict: decRenderConflict,
        reason: render.reason,
      });

    } catch (e) {
      errors.push({ hexId, run, error: e.message });
    }
  }
}

function checkConflict(dec, render) {
  // Conflict: decision says blocked/extreme but render intended V2 (soft)
  if ((dec.state === 'blocked' || dec.state === 'extreme') && render.intended === 'v2') return true;
  // Conflict: decision says progressing but render intended V1 (rigid for growth)
  if (dec.state === 'progressing' && dec.risk === 'balanced' && render.intended === 'v1') return false; // OK, V1 can handle growth
  return false;
}

// ─── Report ───
const total = results.length;
const hits = results.filter(r => r.render_hit).length;
const fallbacks = results.filter(r => r.render_fallback).length;
const vMissing = results.filter(r => !r.v_exists).length;
const decConflicts = results.filter(r => r.dec_render_conflict).length;

// V distribution
const vDist = {};
for (const r of results) {
  vDist[r.render_selected] = (vDist[r.render_selected] || 0) + 1;
}

// Render intent hit rate by reason
const hitByReason = {};
for (const r of results) {
  const key = r.reason;
  hitByReason[key] = hitByReason[key] || { total: 0, hits: 0 };
  hitByReason[key].total++;
  if (r.render_hit) hitByReason[key].hits++;
}

// By hexagram
const hexStats = {};
for (const r of results) {
  hexStats[r.hexId] = hexStats[r.hexId] || { total: 0, hits: 0, fallbacks: 0 };
  hexStats[r.hexId].total++;
  if (r.render_hit) hexStats[r.hexId].hits++;
  if (r.render_fallback) hexStats[r.hexId].fallbacks++;
}

const report = {
  generated_at: new Date().toISOString(),
  total_runs: total,
  errors: errors.length,
  success_rate: Math.round((total - errors.length) / total * 10000) / 100 + '%',
  render: {
    intent_hit_rate: Math.round(hits / total * 10000) / 100 + '%',
    fallback_rate: Math.round(fallbacks / total * 10000) / 100 + '%',
    v_file_missing: vMissing,
    dec_render_conflicts: decConflicts,
  },
  v_distribution_actual: vDist,
  v_distribution_design: {
    v1: Object.values(renderInt).filter(r => r.primary === 'v1').length,
    v2: Object.values(renderInt).filter(r => r.primary === 'v2').length,
    v3: Object.values(renderInt).filter(r => r.primary === 'v3').length,
  },
  hit_rate_by_reason: Object.fromEntries(
    Object.entries(hitByReason).map(([k, v]) => [k, Math.round(v.hits / v.total * 100) + '%'])
  ),
  per_hexagram: Object.fromEntries(
    Object.entries(hexStats).sort().map(([k, v]) => [
      k,
      { hit_rate: Math.round(v.hits / v.total * 100) + '%', fallbacks: v.fallbacks, total: v.total }
    ])
  ),
};

writeFileSync(join(root, 'semantic', 'e2e-test-report.json'), JSON.stringify(report, null, 2));

console.log('=== OpenSee E2E Test Report ===');
console.log('Runs:', total, '| Errors:', errors.length, '| Success:', report.success_rate);
console.log('');
console.log('Render Intent Hit Rate:', report.render.intent_hit_rate);
console.log('Fallback Rate:', report.render.fallback_rate);
console.log('V File Missing:', report.render.v_file_missing);
console.log('Decision-Render Conflicts:', report.render.dec_render_conflicts);
console.log('');
console.log('V Distribution (actual vs design):');
console.log('  V1:', vDist['v1'] || 0, 'vs design', report.v_distribution_design.v1);
console.log('  V2:', vDist['v2'] || 0, 'vs design', report.v_distribution_design.v2);
console.log('  V3:', vDist['v3'] || 0, 'vs design', report.v_distribution_design.v3);
console.log('');
console.log('Hit Rate by Reason:');
for (const [reason, rate] of Object.entries(report.hit_rate_by_reason)) {
  console.log('  ' + reason + ': ' + rate);
}

// Top problem hexagrams
const problemHex = Object.entries(hexStats)
  .filter(([, v]) => v.fallbacks > 0)
  .sort((a, b) => b[1].fallbacks - a[1].fallbacks)
  .slice(0, 10);
console.log('');
console.log('Top 10 Fallback Hexagrams:');
for (const [hex, stats] of problemHex) {
  const intent = renderInt[hex];
  console.log('  ' + hex + ': ' + stats.fallbacks + '/' + stats.total + ' fallbacks (intended=' + (intent?.primary||'?') + ', reason=' + (intent?.reason||'?') + ')');
}
