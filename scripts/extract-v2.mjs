// extract-v2.mjs
// 从 semantic/v1/ 提取 V2 内容，清理 V1，生成 extraction-report
// V1 ← 保留：状态判断、趋势、风险、结构解释
// V2 ← 提取：生活动作、可投射行为、微小现实经验
// 删除：AI 味句式

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const v1Dir = join(root, 'semantic', 'v1');
const v2Dir = join(root, 'semantic', 'v2');

if (!existsSync(v2Dir)) mkdirSync(v2Dir, { recursive: true });

// ─── AI 味检测 ───
const AI_PATTERNS = [
  /不是[^，。]*而是[^，。]*[。，]/,
  /你以为[^。]*其实[^。]*[。]/,
  /真正[^的]的[^，。]*[。，]/g,
  /本质上[^，。]*[。，]/g,
  /这意味着[^。]*[。]/g,
  /学会[^，。]*[。，]/g,
  /人生的[^，。]*[。，]/g,
  /宇宙[^，。]*[。，]/g,
  /答案[^，。]*[。，]/g,
  /觉醒[^，。]*[。，]/g,
  /这才是[^，。]*[。，]/g,
];

// ─── V2 可提取信号 ───
const V2_ACTION_SIGNALS = [
  /把[^，。]{2,20}[掉|好|完|开|走|来|去|住|下|上]/,
  /先[^，。]{2,15}[。，]/,
  /别[^，。]{2,15}[。，]/,
  /不要[^，。]{2,15}[。，]/,
  /该[^，。]{2,10}[了|的]/,
  /找一个[^，。]{2,15}/,
  /找一个[^，。]{2,15}[。，]/,
  /留[^，。]{2,15}[。，]/,
  /清[^，。]{2,15}[。，]/,
  /收[^，。]{2,15}[。，]/,
  /去[^，。]{2,10}[吧|一下|一趟|看看]/,
  /停[^，。]{2,15}[。，]/,
  /等[^，。]{2,15}[。，]/,
  /做[^，。]{2,10}[吧|一下|一点|完|好]/,
];

// ─── V1 保留信号 ───
const V1_KEEP_SIGNALS = [
  /你正处在/,
  /你处在一个/,
  /你面对的是/,
  /利于/,
  /不适合/,
  /这个阶段/,
  /方向是/,
  /趋势/,
  /风险/,
  /可能会/,
  /最容易/,
  /最大的/,
  /另一个/,
];

// ─── 判断句子属于 V1 还是 V2 ───
function classifySentence(s) {
  s = s.trim();
  if (!s || s.length < 4) return null;

  // V2 signals: imperative actions, small behaviors
  for (const pattern of V2_ACTION_SIGNALS) {
    if (pattern.test(s)) return 'V2';
  }

  // Additional V2 heuristics
  if (/^(给|让|放|走|坐|站|拿|写|删|关|开|收|清|减|加|省|存|花|买|卖|说|听|看|想|试|做|去|来|留|丢|搬|换|改)/.test(s) && s.length < 30) return 'V2';

  // V1 signals: state descriptions, structural analysis
  for (const pattern of V1_KEEP_SIGNALS) {
    if (pattern.test(s)) return 'V1';
  }

  // Default: if it describes a state/feeling → V1; if it describes an action → V2
  if (/^(你|这|那|它|他|她|事情|情况|局面|现在|目前|当前|整体|方向)/.test(s)) return 'V1';
  if (s.includes('阶段') || s.includes('状态') || s.includes('趋势') || s.includes('风险')) return 'V1';

  // Short descriptive sentences → V2 if action-oriented
  if (s.length < 25 && !s.includes('是')) return 'V2';

  return 'V1'; // default
}

// ─── 清理 AI 味 ───
function cleanAI(text) {
  let cleaned = text;
  for (const pattern of AI_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  // Remove doubled periods and commas
  cleaned = cleaned.replace(/[，。]{2,}/g, '。');
  cleaned = cleaned.replace(/^[，。]\s*/g, '');
  return cleaned.trim();
}

// ─── 将文本拆成句子 ───
function splitSentences(text) {
  if (!text) return [];
  return text.split(/[。！？]/).filter(s => s.trim().length > 0).map(s => s.trim() + '。');
}

// ─── 处理单个卦 ───
function processHexagram(q) {
  const v1Path = join(v1Dir, q + '.json');
  if (!existsSync(v1Path)) return null;

  const v1Data = JSON.parse(readFileSync(v1Path, 'utf8'));
  const report = { v1_kept: 0, v2_extracted: 0, removed_ai_phrases: 0 };

  // ─── Process segments ───
  const v1Segments = {};
  const v2Segments = { mind: [], status: [], trend: [], risk: [] };

  for (const seg of ['status', 'trend', 'mind', 'risk']) {
    const text = v1Data.segments?.[seg] || '';
    const sentences = splitSentences(text);
    const v1Kept = [];
    const v2Extracted = [];

    for (const s of sentences) {
      const cls = classifySentence(s);
      if (cls === 'V2') {
        v2Extracted.push(s);
      } else {
        v1Kept.push(s);
      }
    }

    v1Segments[seg] = v1Kept.join('');
    if (v2Extracted.length > 0) {
      v2Segments[seg] = v2Extracted;
    }
    report.v1_kept += v1Kept.length;
    report.v2_extracted += v2Extracted.length;
  }

  // ─── Process lines ───
  const v1Lines = [];
  const v2Lines = [];

  for (const line of (v1Data.lines || [])) {
    const text = line.text || '';
    const sentences = splitSentences(text);
    const v1Kept = [];
    const v2Extracted = [];

    for (const s of sentences) {
      const cls = classifySentence(s);
      if (cls === 'V2') {
        v2Extracted.push(s);
      } else {
        v1Kept.push(s);
      }
    }

    v1Lines.push({ line: line.line, yaoCode: line.yaoCode || '', text: v1Kept.join('') });
    if (v2Extracted.length > 0) {
      v2Lines.push({ line: line.line, text: v2Extracted.join('') });
    }
    report.v1_kept += v1Kept.length;
    report.v2_extracted += v2Extracted.length;
  }

  // ─── Clean AI phrases from V1 ───
  for (const seg of ['status', 'trend', 'mind', 'risk']) {
    const before = v1Segments[seg].length;
    v1Segments[seg] = cleanAI(v1Segments[seg]);
    // Rough count: each ~20 chars of removed text ≈ 1 AI phrase
    const removed = before - v1Segments[seg].length;
    if (removed > 10) report.removed_ai_phrases += Math.round(removed / 30);
  }

  // ─── Write V1 (cleaned) ───
  const cleanedV1 = {
    id: v1Data.id || q,
    meta: v1Data.meta || {},
    segments: v1Segments,
    lines: v1Lines,
    summary: cleanAI(v1Data.summary || ''),
    closing: cleanAI(v1Data.closing || ''),
    version: 'v1'
  };
  writeFileSync(join(v1Dir, q + '.json'), JSON.stringify(cleanedV1, null, 2));

  // ─── Write V2 ───
  // Clean empty arrays from segments
  const cleanV2Segs = {};
  for (const [k, v] of Object.entries(v2Segments)) {
    if (v.length > 0) cleanV2Segs[k] = v;
  }

  const v2Data = {
    id: q,
    version: 'v2',
    style: 'action_container',
    segments: cleanV2Segs,
    lines: v2Lines.length > 0 ? v2Lines : undefined
  };
  if (!v2Data.lines) delete v2Data.lines;
  writeFileSync(join(v2Dir, q + '.json'), JSON.stringify(v2Data, null, 2));

  return report;
}

// ─── Main ───
const report = {};
let totalV1 = 0, totalV2 = 0, totalAI = 0;

for (let i = 1; i <= 64; i++) {
  const q = 'Q' + i;
  const r = processHexagram(q);
  if (r) {
    report[q] = r;
    totalV1 += r.v1_kept;
    totalV2 += r.v2_extracted;
    totalAI += r.removed_ai_phrases;
  }
}

// ─── Write report ───
const reportPath = join(root, 'semantic', 'extraction-report.json');
writeFileSync(reportPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  summary: {
    total_v1_sentences_kept: totalV1,
    total_v2_sentences_extracted: totalV2,
    total_ai_phrases_removed: totalAI,
    hexagrams_processed: Object.keys(report).length
  },
  per_hexagram: report
}, null, 2));

console.log('V2 extraction complete.');
console.log('  V1 sentences kept:', totalV1);
console.log('  V2 sentences extracted:', totalV2);
console.log('  AI phrases removed:', totalAI);
console.log('  Report:', reportPath);
