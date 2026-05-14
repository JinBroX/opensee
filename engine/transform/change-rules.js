// ========== 之卦（变卦）计算 ==========
// 规则：6（老阴）→ 7（少阳），9（老阳）→ 8（少阴）
// 7 和 8 不变。将所有变爻翻转后得到之卦。
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
 * @param {string} hexId — 当前卦 hexId
 * @param {number[]} yaos — 6 个爻值 [6,7,8,9]
 * @returns {Object} { changedHexId, changingLines }
 */
function computeZhiGua(hexId, yaos) {
  const bin = binaryByHexId[hexId];
  if (!bin) throw new Error(`Unknown hexId: ${hexId}`);

  const changingLines = [];
  const changedBin = [...bin];

  for (let i = 0; i < 6; i++) {
    if (yaos[i] === 6) {
      // 老阴 → 少阳：yin(0) → yang(1)
      changedBin[i] = 1;
      changingLines.push(i);
    } else if (yaos[i] === 9) {
      // 老阳 → 少阴：yang(1) → yin(0)
      changedBin[i] = 0;
      changingLines.push(i);
    }
  }

  return {
    changedHexId: hexIdByBinary[changedBin.join('')],
    changingLines
  };
}

/**
 * Convert hexId to binary line array (1=yang, 0=yin)
 */
function hexIdToBinary(hexId) {
  const bin = binaryByHexId[hexId];
  if (!bin) throw new Error(`Unknown hexId: ${hexId}`);
  return [...bin];
}

export { computeZhiGua, hexIdToBinary };
