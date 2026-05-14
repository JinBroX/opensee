// OpenSee Semantic Cleaner
// Remove all hexagram/yao terminology from V1/V2/V3

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'semantic');

// ── V1 specific replacements ──
const V1_REPLACE = {
  'semantic/v1/Q24.json': [
    [/上六是这卦最凶的一爻——迷复，错过了回来的时机。这卦的风险不是回来本身，是不回来。/g,
     '最大的风险是迷复——错过了回来的时机。风险不是回来本身，是不回来。'],
  ],
  'semantic/v1/Q29.json': [
    [/坎卦讲的是如何在被坑包围的状态下存活。/g,
     '如何在被坑包围的状态下存活。'],
    [/掉进了一个坑。不只是困难多——是结构性的陷落。这不是你不努力——是地形就是这样。坎卦讲的是如何在被坑包围的状态下存活。/g,
     '掉进了一个坑。不只是困难多——是结构性的陷落。这不是你不努力——是地形就是这样。'],
  ],
  'semantic/v1/Q51.json': [
    [/震卦讲的是人在震惊中的反应——是慌了手脚跑掉，还是站在原地接受震动，然后没事一样继续/g,
     '人在震惊中的反应——是慌了手脚跑掉，还是站在原地接受震动，然后没事一样继续'],
  ],
  'semantic/v1/Q57.json': [
    [/巽卦讲的是柔性力量：不硬推，但持续地、温和地、一遍一遍地吹——最后石头也会被风化。/g,
     '柔性力量：不硬推，但持续地、温和地、一遍一遍地吹——最后石头也会被风化。'],
  ],
  'semantic/v1/Q58.json': [
    [/兑卦讲的是：快乐是需要分享的。一个人偷着乐不是兑——说出来、让人知道，快乐才会加倍。/g,
     '快乐是需要分享的。一个人偷着乐不够——说出来、让人知道，快乐才会加倍。'],
  ],
  'semantic/v1/Q64.json': [
    [/"yaoCode": "未济征凶利涉大川",/g, ''],
    [/利于涉过大川/g, '涉过大的水域'],
  ],
};

// ── V2 specific replacements ──
const V2_REPLACE = {
  'semantic/v2/Q26.json': [
    [/利涉大川——但准备好再出发。/g, '远行之前——准备好再出发。'],
  ],
  'semantic/v2/Q52.json': [
    [/艮卦告诉你：停在正确的位置上比继续走更有力量。/g,
     '停在正确的位置上比继续走更有力量。'],
  ],
};

// ── Global: remove all yaoCode fields from V1 lines ──
function cleanYaoCodes(obj) {
  if (obj.lines && Array.isArray(obj.lines)) {
    for (const line of obj.lines) {
      if (line.yaoCode !== undefined) {
        line.yaoCode = '';
      }
    }
  }
  return obj;
}

// ── Main ──

console.log('=== OpenSee Semantic Cleaner ===\n');

// Clean V1
let v1Fixed = 0;
for (let i = 1; i <= 64; i++) {
  const filename = `Q${i}.json`;
  const filePath = path.join(BASE, 'v1', filename);
  let content = fs.readFileSync(filePath, 'utf8');

  // Apply specific replacements
  const key = `semantic/v1/${filename}`;
  if (V1_REPLACE[key]) {
    for (const [pattern, replacement] of V1_REPLACE[key]) {
      const before = content;
      content = content.replace(pattern, replacement);
      if (before !== content) v1Fixed++;
    }
  }

  // Parse, clean yaoCodes, re-serialize
  let data = JSON.parse(content);
  data = cleanYaoCodes(data);
  // Remove empty yaoCode fields
  if (data.lines) {
    for (const line of data.lines) {
      if (line.yaoCode === '') delete line.yaoCode;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}
console.log(`v1: cleaned ${v1Fixed} text replacements + removed yaoCodes from 64 files`);

// Clean V2
let v2Fixed = 0;
for (let i = 1; i <= 64; i++) {
  const filename = `Q${i}.json`;
  const filePath = path.join(BASE, 'v2', filename);
  let content = fs.readFileSync(filePath, 'utf8');

  const key = `semantic/v2/${filename}`;
  if (V2_REPLACE[key]) {
    for (const [pattern, replacement] of V2_REPLACE[key]) {
      const before = content;
      content = content.replace(pattern, replacement);
      if (before !== content) v2Fixed++;
    }
  }

  if (content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
console.log(`v2: cleaned ${v2Fixed} text replacements`);

// V3 — already clean (generated without hexagram/yao terms)
console.log('v3: already clean (no hexagram/yao terms in generated content)');

console.log('\n=== Done ===');
