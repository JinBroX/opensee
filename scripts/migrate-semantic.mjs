/**
 * migrate-semantic.mjs
 * 将 data/hexagrams/ 下的 semantic JSON 拆分为 states/ 格式
 * semantic-v1.json → core.json + transition.json + render-v1.json
 * semantic-v2.json → render-v2.json
 * semantic-v3.json → render-v3.json
 * 原始文件保留为 legacy-semantic-v1.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const dataDir = path.join(root, 'data', 'hexagrams');
const statesDir = path.join(root, 'states', 'hexagrams');
const coreDir = path.join(root, 'states', 'core');

let migrated = 0;
let skipped = 0;

for (let i = 1; i <= 64; i++) {
  const hexId = `Q${i}`;
  const srcDir = path.join(dataDir, hexId);
  const dstDir = path.join(statesDir, hexId);
  const v1Path = path.join(srcDir, 'semantic-v1.json');

  if (!fs.existsSync(v1Path)) {
    console.log(`SKIP ${hexId}: no semantic-v1.json`);
    skipped++;
    continue;
  }

  try {
    const v1 = JSON.parse(fs.readFileSync(v1Path, 'utf8'));

    // --- core.json ---
    const core = {
      id: v1.id || hexId,
      meta: v1.meta || { hexName: hexId, description: '' },
      yaos: v1.main?.yaos || [],
      segments: v1.main?.segments || {}
    };
    // Merge virtue from v2/v3 if exists
    const v2Path = path.join(srcDir, 'semantic-v2.json');
    if (fs.existsSync(v2Path)) {
      const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
      if (v2.meta?.virtue) core.meta.virtue = v2.meta.virtue;
    }
    const v3Path = path.join(srcDir, 'semantic-v3.json');
    if (!core.meta.virtue && fs.existsSync(v3Path)) {
      const v3 = JSON.parse(fs.readFileSync(v3Path, 'utf8'));
      if (v3.meta?.virtue) core.meta.virtue = v3.meta.virtue;
    }
    fs.writeFileSync(path.join(dstDir, 'core.json'), JSON.stringify(core, null, 2));

    // --- transition.json ---
    const transition = {
      id: hexId,
      mutual: { segments: v1.mutual?.segments || {} },
      changed: { segments: v1.changed?.segments || {} }
    };
    fs.writeFileSync(path.join(dstDir, 'transition.json'), JSON.stringify(transition, null, 2));

    // --- render-v1.json ---
    const renderV1 = {
      id: v1.id || hexId,
      version: 'v1',
      style: 'narrative',
      summary: v1.summary || '',
      closing: v1.closing || '',
      lines: v1.main?.lines || [],
      segments: v1.main?.segments || {}
    };
    fs.writeFileSync(path.join(dstDir, 'render-v1.json'), JSON.stringify(renderV1, null, 2));

    // --- render-v2.json (copy from semantic-v2.json if exists) ---
    if (fs.existsSync(v2Path)) {
      const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf8'));
      const renderV2 = {
        id: v2.id || hexId,
        version: 'v2',
        style: 'poetic',
        summary: v2.summary || '',
        closing: v2.closing || '',
        lines: v2.main?.lines || [],
        segments: v2.main?.segments || {}
      };
      fs.writeFileSync(path.join(dstDir, 'render-v2.json'), JSON.stringify(renderV2, null, 2));
    }

    // --- render-v3.json (copy from semantic-v3.json if exists) ---
    if (fs.existsSync(v3Path)) {
      const v3 = JSON.parse(fs.readFileSync(v3Path, 'utf8'));
      const renderV3 = {
        id: v3.id || hexId,
        version: 'v3',
        style: 'minimal',
        summary: v3.summary || '',
        closing: v3.closing || '',
        lines: v3.main?.lines || [],
        segments: v3.main?.segments || {}
      };
      fs.writeFileSync(path.join(dstDir, 'render-v3.json'), JSON.stringify(renderV3, null, 2));
    }

    // Rename original to legacy
    fs.renameSync(v1Path, path.join(srcDir, 'legacy-semantic-v1.json'));

    console.log(`OK ${hexId}: core.json + transition.json + render-v1.json`);
    migrated++;
  } catch (e) {
    console.error(`ERR ${hexId}: ${e.message}`);
  }
}

// Copy s1_pool and s2_sentences
try {
  const s1Src = path.join(root, 'data', 's1_pool.json');
  const s2Src = path.join(root, 'data', 's2_sentences.json');
  if (fs.existsSync(s1Src)) {
    fs.copyFileSync(s1Src, path.join(coreDir, 's1_pool.json'));
    console.log('OK: s1_pool.json → states/core/');
  }
  if (fs.existsSync(s2Src)) {
    fs.copyFileSync(s2Src, path.join(coreDir, 's2_sentences.json'));
    console.log('OK: s2_sentences.json → states/core/');
  }
} catch (e) {
  console.error(`ERR copying pool files: ${e.message}`);
}

console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
