// ---------------------- OpenSee 核心逻辑（Seed + Salt 混合取卦）-----------------------

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

// ---------------------- 版本选择 ----------------------
function selectVersion(salt32) {
  const bucket = (salt32 >>> 0) % 100;
  if (bucket < 50) return 'v1';
  if (bucket < 80) return 'v2';
  return 'v3';
}

// ---------------------- 卦象数据加载 ----------------------
async function loadHexagram(hexId, version = 'v1') {
  const basePath = `data/hexagrams/${hexId}`;
  const versionsToTry = [version, 'v1'].filter((v, i, arr) => arr.indexOf(v) === i);

  for (const ver of versionsToTry) {
    const resp = await fetch(`${basePath}/semantic-${ver}.json`);
    if (!resp.ok) continue;

    const data = await resp.json();
    const segments = data.main?.segments || data.segments || {
      status: "状态未知",
      trend: "趋势未知",
      mind: "心态未知",
      risk: "风险未知"
    };

    return {
      id: data.id || hexId,
      summary: data.summary || hexId,
      segments,
      lines: data.main?.lines || data.lines || [],
      closing: data.closing || '',
      version: ver
    };
  }

  return {
    id: hexId,
    summary: hexId,
    segments: { status: "状态未知", trend: "趋势未知", mind: "心态未知", risk: "风险未知" },
    lines: [],
    closing: '',
    version: 'fallback'
  };
}

// ---------------------- 核心：生成卦象 ----------------------
async function generateHexagramResult(opts = {}) {
  try {
    console.log("OpenSee 开始生成卦象");

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

    console.log("生成卦:", mainId, yaos);

    // 6. 加载语义（版本由 Salt 特征决定）
    const version = selectVersion(salt32);
    const mainData = await loadHexagram(mainId, version);

    return {
      seed: seed32,
      salt,
      summary: mainData.summary,
      closing: mainData.closing,
      main: {
        id: mainId,
        yaos,
        segments: mainData.segments,
        lines: mainData.lines,
        version: mainData.version
      }
    };

  } catch (e) {
    console.error("生成失败:", e);
    return {
      seed: Date.now(),
      salt: null,
      summary: "系统异常",
      main: {
        id: "Q1",
        yaos: [7, 7, 7, 7, 7, 7],
        segments: { status: "异常", trend: "异常", mind: "异常", risk: "异常" },
        lines: [],
        version: "error"
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
  selectVersion,
  sha256Hex,
  xorshift32,
  randomYao,
  yaosToHexagramId
};

// 向后兼容旧名
window.ZenTap = window.OpenSee;

console.log("OpenSee 已就绪：Seed + Salt 混合取卦系统");
