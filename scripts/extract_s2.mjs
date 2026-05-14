import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const hexDir = join(__dirname, '..', 'data', 'hexagrams');

const all = [];

const dirs = readdirSync(hexDir).filter(d => /^Q\d+$/.test(d));
dirs.sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));

for (const dir of dirs) {
  try {
    const raw = readFileSync(join(hexDir, dir, 'semantic-v1.json'), 'utf-8');
    const data = JSON.parse(raw);

    // 从 lines 提取
    if (data.main?.lines) {
      for (const line of data.main.lines) {
        if (line.text && line.text.length > 4) {
          all.push({ text: line.text, hex: dir, source: 'line' });
        }
      }
    }

    // 从 segments 提取
    if (data.main?.segments) {
      for (const [key, val] of Object.entries(data.main.segments)) {
        if (val && val.length > 4) {
          all.push({ text: val, hex: dir, source: key });
        }
      }
    }
  } catch (e) {
    console.warn(`跳过 ${dir}: ${e.message}`);
  }
}

writeFileSync(join(__dirname, '..', 'data', 's2_sentences.json'), JSON.stringify(all, null, 2));
console.log(`提取完成: ${all.length} 条句子 (${dirs.length} 卦)`);
