// ========== 错卦计算 ==========
// 规则：六爻全变 — 阳变阴、阴变阳（逐位取反）
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
 * @returns {string} 错卦 hexId
 */
function computeOpposite(hexId) {
  const bin = binaryByHexId[hexId];
  if (!bin) throw new Error(`Unknown hexId: ${hexId}`);
  const flipped = bin.map(b => b === 1 ? 0 : 1);
  return hexIdByBinary[flipped.join('')];
}

export { computeOpposite };
