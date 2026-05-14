// ====================== OpenSee 3.0 Engine ======================
// Seed + Salt 混合取卦核心 —— 只负责算卦，不负责表达
// semantic 层负责全部"断的内容"

// ---------------------- 工具函数 ----------------------
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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

function hexToUint32(hex) {
  return parseInt(hex.slice(0, 8), 16) >>> 0;
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
  return "Q" + (bits + 1);
}

// ---------------------- UID ----------------------
function generateUid() {
  const existing = localStorage.getItem('opensee_uid');
  if (existing) return existing;
  const uid = 'opensee_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem('opensee_uid', uid);
  return uid;
}

// ---------------------- Salt 生成 ----------------------
function buildSalt(opts = {}) {
  return {
    type: opts.type || "click",
    value: opts.value || "",
    strength: typeof opts.strength === "number" ? opts.strength : 0.5
  };
}

async function saltToUint32(salt) {
  const saltStr = JSON.stringify(salt || {});
  const h = await sha256Hex(saltStr);
  return hexToUint32(h);
}

// ---------------------- Seed ----------------------
async function buildSeed(opts = {}) {
  const timestamp = opts.timestamp || Date.now();
  const uid = opts.uid || generateUid();
  const ip = opts.ip || "127.0.0.1";

  const seedStr = `${timestamp}@${ip}#${uid}`;
  const h = await sha256Hex(seedStr);
  return hexToUint32(h);
}

// ---------------------- 3.0: 加载断卦数据 ----------------------
// 路径: semantic/judgment/Q{n}.json + semantic/lines/Q{n}.json
async function loadHexagram(hexId) {
  // 1) 加载 judgment
  const judgmentResp = await tryFetch(`semantic/judgment/${hexId}.json`);
  const judgment = judgmentResp?.judgment || {
    situation: "状态未知",
    movement: "趋势未知",
    timing: "时机不明",
    risk: "风险未知",
    outcome: "走向不明"
  };

  // 2) 加载 lines
  const linesResp = await tryFetch(`semantic/lines/${hexId}.json`);
  const lines = linesResp?.lines || [];

  return {
    id: judgmentResp?.id || hexId,
    hexName: judgmentResp?.hexName || hexId,
    judgment,
    lines
  };
}

async function tryFetch(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

// ---------------------- 核心：生成卦象 ----------------------
async function generateHexagramResult(opts = {}) {
  try {
    // 1. Seed
    const seed32 = await buildSeed(opts);

    // 2. Salt
    const salt = buildSalt(opts.salt);
    const salt32 = await saltToUint32(salt);

    // 3. 混合
    const mixedSeed = (seed32 + salt32 * 3) >>> 0;

    // 4. RNG
    const rnd = xorshift32(mixedSeed);

    // 5. 生成爻
    const yaos = Array.from({ length: 6 }, () => randomYao(rnd()));
    const mainId = yaosToHexagramId(yaos);

    // 6. 加载语义 — 直接从 judgment 层加载
    const mainData = await loadHexagram(mainId);

    // 7. 爻级分析
    let lineAnalysis = null;
    try {
      if (window.OpenSee && window.OpenSee.LineEngine) {
        await window.OpenSee.LineEngine.init();
        lineAnalysis = window.OpenSee.LineEngine.fullAnalysis(yaos);
      }
    } catch (e) {}

    // 8. 决策层查询
    let decision = null;
    try {
      if (window.OpenSee && window.OpenSee.DecisionEngine) {
        await window.OpenSee.DecisionEngine.init();
        decision = window.OpenSee.DecisionEngine.getDecision(mainId);
      }
    } catch (e) {}

    return {
      seed: seed32,
      salt,
      main: {
        id: mainId,
        hexName: mainData.hexName,
        yaos,
        judgment: mainData.judgment,
        lines: mainData.lines
      },
      line_engine: lineAnalysis,
      decision
    };

  } catch (e) {
    console.error("生成失败:", e);
    return {
      seed: Date.now(),
      salt: null,
      main: {
        id: "Q1",
        hexName: "乾为天",
        yaos: [7, 7, 7, 7, 7, 7],
        judgment: {
          situation: "异常",
          movement: "异常",
          timing: "异常",
          risk: "异常",
          outcome: "异常"
        },
        lines: []
      }
    };
  }
}

// ---------------------- 暴露接口 ----------------------
window.OpenSee = {
  generateHexagramResult,
  loadHexagram,
  buildSalt,
  buildSeed,
  sha256Hex,
  xorshift32,
  randomYao,
  yaosToHexagramId
};

window.ZenTap = window.OpenSee;

// ---------------------- 初始化 ----------------------
async function init() {
  const status = { engine: 'ok', line_engine: 'not_loaded', decision_engine: 'not_loaded' };

  try {
    if (window.OpenSee?.LineEngine) {
      await window.OpenSee.LineEngine.init();
      status.line_engine = 'ok';
    }
  } catch (e) { status.line_engine = e.message; }

  try {
    if (window.OpenSee?.DecisionEngine) {
      await window.OpenSee.DecisionEngine.init();
      status.decision_engine = 'ok';
    }
  } catch (e) { status.decision_engine = e.message; }

  return status;
}
window.OpenSee.init = init;
