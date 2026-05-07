// ---------------------- Zen-Tap 核心逻辑 ----------------------

// ---------------------- 工具函数 ----------------------
async function sha256Hex(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function xorshift32(seed) {
  let x = seed >>> 0;
  return function() {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    return (x >>> 0) / 0x100000000;
  };
}

function hexToUint32(hex) {
  return parseInt(hex.slice(0,8),16)>>>0;
}

function randomYao(rnd) {
  if (rnd < 0.125) return 9;
  if (rnd < 0.125+0.375) return 7;
  if (rnd < 0.125+0.375+0.375) return 8;
  return 6;
}

function yaosToHexagramId(yaos) {
  let bits=0;
  for(let i=0;i<6;i++){
    const isYang = (yaos[i]===7||yaos[i]===9)?1:0;
    bits |= (isYang<<i);
  }
  return "Q"+(bits+1);
}

function toChangedYaos(yaos) {
  return yaos.map(y=>{
    if(y===9) return 8;
    if(y===6) return 7;
    return y;
  });
}

function toMutualYaos(yaos){
  if(!Array.isArray(yaos)||yaos.length!==6) throw new Error("yaos must be length 6");
  const [y1,y2,y3,y4,y5,y6]=yaos;
  return [y2,y3,y4,y3,y4,y5];
}

function generateUid() {
  const existing = localStorage.getItem('zen_uid');
  if(existing) return existing;
  const uid = 'zen_'+Math.random().toString(36).slice(2,10);
  localStorage.setItem('zen_uid',uid);
  return uid;
}

// ---------------------- 卦象数据加载逻辑 ----------------------
async function detectAvailableVersions(hexId) {
  const versions = ['v1', 'v2', 'v3'];
  const availableVersions = [];
  
  for (const version of versions) {
    try {
      const resp = await fetch(`data/hexagrams/${hexId}/semantic-${version}.json`);
      if (resp.ok) {
        availableVersions.push(version);
        console.log(`✅ 语义版本 ${version} 可用`);
      }
    } catch (e) {
      console.log(`❌ 语义版本 ${version} 不可用`);
    }
  }
  
  return availableVersions.length > 0 ? availableVersions : ['v1']; // 默认使用v1
}

// ---------------------- 加载卦象数据 ----------------------
async function loadHexagram(hexId, version = null) {
  console.log(`正在加载卦象数据: ${hexId}`);
  
  const basePath = `data/hexagrams/${hexId}`;
  
  try {
    // 首先检查当前版本是否存在，否则尝试其他版本
    let targetVersion = version;
    if (!targetVersion) {
      const availableVersions = await detectAvailableVersions(hexId);
      // 随机选择一个可用版本
      targetVersion = availableVersions[Math.floor(Math.random() * availableVersions.length)];
    }
    
    console.log(`选择语义版本: ${targetVersion}`);
    
    // 加载指定版本的卦象数据
    const resp = await fetch(`${basePath}/semantic-${targetVersion}.json`);
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    
    const data = await resp.json();
    console.log(`成功加载卦象 ${hexId} 版本 ${targetVersion}:`, data);
    
    // 处理数据片段结构
    let segments;
    if (data.main && data.main.segments) {
      segments = data.main.segments;
      console.log('使用data', JSON.stringify(data));
    } else if (data.segments) {
      segments = data.segments;
      console.log(`使用数据结构: data.segments`);
    } else {
      console.warn(`加载 ${hexId} 缺少 segments 字段，使用默认内容`);
      segments = {
        status: `${hexId}卦的当前状态`,
        trend: `${hexId}卦的趋势变化`, 
        mind: `${hexId}卦的心态建议`,
        risk: `${hexId}卦的风险提示`
      };
    }
    
return {
  id: data.id || hexId,
  summary: data.summary || hexId,   // 使用卦象ID作为默认摘要
  segments,
  lines: data.main?.lines || data.lines || [],
  version: targetVersion
};
    
  } catch(e) {
    console.warn(`❌ 加载卦象 ${hexId} 失败:`, e);
    
    // 尝试其他版本
    try {
      const availableVersions = await detectAvailableVersions(hexId);
      for (const version of availableVersions) {
        if (version !== (version || 'v1')) {
          console.log(`尝试其他版本 ${version}`);
          return loadHexagram(hexId, version);
        }
      }
    } catch (fallbackError) {
      console.warn('没有其他版本可用');
    }
    
    // 如果所有尝试都失败，返回默认卦象
    console.warn(`使用默认卦象`);
    return {
      id: hexId,
      segments: {
        status: `${hexId}卦的数据加载失败`,
        trend: `${hexId}卦的趋势无法确定`, 
        mind: `${hexId}卦的心态建议暂缺`,
        risk: `${hexId}卦的风险提示未知`
      },
      lines: [],
      version: 'default'
    };
  }
}

// ---------------------- 生成卦象结果 ----------------------
async function generateHexagramResult(opts = {}) {
  try {
    console.log('🚀 开始生成卦象解卦结果');
    
    const timestamp = opts.timestamp || Date.now();
    const uid = opts.uid || 'user';
    const ip = opts.ip || '127.0.0.1';

    const seedStr = `${timestamp}@${ip}#${uid}`;
    const h = await sha256Hex(seedStr);
    const seed32 = hexToUint32(h);
    const rnd = xorshift32(seed32);

    // 生成6个爻
    const yaos = Array.from({length:6},() => randomYao(rnd()));
    const mainId = yaosToHexagramId(yaos);

    console.log('生成的主卦信息:', { 
      爻数组: yaos,
      主卦ID: mainId 
    });

    // 加载主卦数据
    console.log('🔍 开始加载卦象数据...');
    const mainData = await loadHexagram(mainId);
    console.log('✅ 卦象数据加载成功 - summary:', mainData.summary);

    // 处理 segments 数据
    if (!mainData.segments) {
      console.warn('卦象数据缺少 segments，使用默认内容');
      mainData.segments = {
        status: "当前状态不明",
        trend: "趋势变化难以预测", 
        mind: "心态保持平和",
        risk: "风险需要警惕"
      };
    }

    // 构建最终结果
    const result = {
      seed: { timestamp, uid, ip },
      summary: mainData.summary,  // 使用卦象的摘要
      main: { 
        id: mainId, 
        yaos, 
        segments: mainData.segments, 
        lines: mainData.lines || [],
        version: mainData.version
      }
    };

    console.log('🎯 卦象生成完成 - summary:', result.summary);
    return result;
    
  } catch (error) {
    console.error('❌ 生成卦象解卦失败:', error);
    
    return {
      seed: { timestamp: Date.now(), uid: 'error', ip: '0.0.0.0' },
      summary: '卦象生成过程中出现错误',  // 错误情况下的默认summary
      main: {
        id: 'Q1',
        yaos: [7,7,7,7,7,7],
        segments: {
          status: "卦象数据加载失败",
          trend: "趋势无法确定",
          mind: "心态建议暂缺",
          risk: "风险提示未知"
        },
        lines: [],
        version: 'error'
      }
    };
  }
}
// ---------------------- 全局暴露接口 ----------------------
window.ZenTap = {
  generateHexagramResult,
  loadHexagram,
  detectAvailableVersions,
  sha256Hex,
  xorshift32,
  randomYao,
  yaosToHexagramId
};

console.log('✅ Zen-Tap 卦象解卦系统已加载 - 支持语义版本切换');
