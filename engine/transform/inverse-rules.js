// ========== 综卦计算 ==========
// 规则：六爻上下颠倒 — 初爻↔上爻、二爻↔五爻、三爻↔四爻
// 通过 hexagram-map.json 查表实现

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const hexMap = JSON.parse(readFileSync(join(__dirname, '../structure/hexagram-map.json'), 'utf8'));

const binaryByHexId = {};
const hexIdByBinary = {};
for (const [hexId, data] of Object.entries(hexMap)) {
  const key = data.binary.join('');
  binaryByHexId[hexId] = [...data.binary];
  hexIdByBinary[key] = hexId;
}

/**
 * @param {string} hexId — 如 'Q1'
 * @returns {string} 综卦 hexId
 */
function computeInverse(hexId) {
  const bin = binaryByHexId[hexId];
  if (!bin) throw new Error(`Unknown hexId: ${hexId}`);
  const reversed = [...bin].reverse();
  return hexIdByBinary[reversed.join('')];
}

export { computeInverse };
