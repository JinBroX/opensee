// ========== 互卦计算 ==========
// 规则：取 2-3-4 爻为下卦，3-4-5 爻为上卦，组成新六爻卦
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
 * @returns {string} 互卦 hexId
 */
function computeMutual(hexId) {
  const bin = binaryByHexId[hexId];
  if (!bin) throw new Error(`Unknown hexId: ${hexId}`);
  // binary[0]=初爻(bottom), binary[5]=上爻(top)
  // 下卦 = 二三四爻 = bin[1],bin[2],bin[3]
  // 上卦 = 三四五爻 = bin[2],bin[3],bin[4]
  const lower = [bin[1], bin[2], bin[3]];
  const upper = [bin[2], bin[3], bin[4]];
  const mutual = [...lower, ...upper];
  return hexIdByBinary[mutual.join('')];
}

export { computeMutual };
