/**
 * Zen-Tap 语义库生成脚本（ima生成）
 * 生成符合你指定格式的64卦语义库
 * 
 * 使用方法：
 * 1. 先运行生成基础结构：node scripts/generate_zen_semantic_library.js --mode=structure
 * 2. 再运行填充内容：node scripts/generate_zen_semantic_library.js --mode=fill --concurrency=3
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import PQueue from 'p-queue';
import dotenv from 'dotenv';

// 环境配置
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'data', 'zen_outputs.json');

const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL || ' https://api.deepseek.com/chat/completions';

// 64卦名称（用于生成更准确的内容）
const GUA_NAMES = {
  "Q1": "乾卦", "Q2": "坤卦", "Q3": "屯卦", "Q4": "蒙卦", "Q5": "需卦", "Q6": "讼卦",
  "Q7": "师卦", "Q8": "比卦", "Q9": "小畜卦", "Q10": "履卦", "Q11": "泰卦", "Q12": "否卦",
  "Q13": "同人卦", "Q14": "大有卦", "Q15": "谦卦", "Q16": "豫卦", "Q17": "随卦", "Q18": "蛊卦",
  "Q19": "临卦", "Q20": "观卦", "Q21": "噬嗑卦", "Q22": "贲卦", "Q23": "剥卦", "Q24": "复卦",
  "Q25": "无妄卦", "Q26": "大畜卦", "Q27": "颐卦", "Q28": "大过卦", "Q29": "坎卦", "Q30": "离卦",
  "Q31": "咸卦", "Q32": "恒卦", "Q33": "遁卦", "Q34": "大壮卦", "Q35": "晋卦", "Q36": "明夷卦",
  "Q37": "家人卦", "Q38": "睽卦", "Q39": "蹇卦", "Q40": "解卦", "Q41": "损卦", "Q42": "益卦",
  "Q43": "夬卦", "Q44": "姤卦", "Q45": "萃卦", "Q46": "升卦", "Q47": "困卦", "Q48": "井卦",
  "Q49": "革卦", "Q50": "鼎卦", "Q51": "震卦", "Q52": "艮卦", "Q53": "渐卦", "Q54": "归妹卦",
  "Q55": "丰卦", "Q56": "旅卦", "Q57": "巽卦", "Q58": "兑卦", "Q59": "涣卦", "Q60": "节卦",
  "Q61": "中孚卦", "Q62": "小过卦", "Q63": "既济卦", "Q64": "未济卦"
};

// 创建基础结构
function createBaseStructure() {
  const structure = {};
  
  for (let i = 1; i <= 64; i++) {
    const qKey = `Q${i}`;
    structure[qKey] = {
      "yaos": [null, null, null, null, null, null],
      "segments": {
        "status": `【占位】${GUA_NAMES[qKey]} · 当前状况（待填充）`,
        "trend": `【占位】${GUA_NAMES[qKey]} · 前景趋势（待填充）`,
        "mind": `【占位】${GUA_NAMES[qKey]} · 心理建设（待填充）`,
        "risk": `【占位】${GUA_NAMES[qKey]} · 风险提示（待填充）`
      }
    };
  }
  
  return structure;
}

// AI生成单个卦象内容的函数
async function generateGuaContent(guaKey, guaName) {
  const prompt = `你是一位精通易经的心理咨询师。请为「${guaName}」生成现代心理学视角的解读，包含四个部分：

1. 【当前状况】描述用户当前的心理状态和处境（50-70字）
2. 【前景趋势】分析未来可能的发展方向（40-60字）  
3. 【心理建设】提供心态调整和行动建议（40-60字）
4. 【风险提示】指出需要注意的风险和提醒（30-50字）

要求：
- 语言温暖、现代、实用，避免传统术语
- 每部分用一句完整的话表达
- 体现心理学洞察，给予用户力量感

请用JSON格式回复，包含status、trend、mind、risk四个字段。`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 尝试解析JSON，如果失败则使用备用方案
    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.log(`解析JSON失败，使用文本分析: ${parseError.message}`);
      return parseTextContent(content);
    }
  } catch (error) {
    console.error(`生成${guaName}内容失败:`, error);
    return createFallbackContent(guaName);
  }
}

// 解析文本内容为结构化的备用方案
function parseTextContent(text) {
  const lines = text.split('\n').filter(line => line.trim());
  
  // 简单的关键词匹配
  const status = lines.find(line => line.includes('当前') || line.includes('现状')) || lines[0] || '';
  const trend = lines.find(line => line.includes('趋势') || line.includes('未来')) || lines[1] || '';
  const mind = lines.find(line => line.includes('建议') || line.includes('心态')) || lines[2] || '';
  const risk = lines.find(line => line.includes('风险') || line.includes('注意')) || lines[3] || '';
  
  return {
    status: status.trim() || '当前处于转变的关键时期，需要保持觉察。',
    trend: trend.trim() || '趋势将逐渐明朗，耐心等待时机。',
    mind: mind.trim() || '保持内心平静，信任自然的发展过程。',
    risk: risk.trim() || '注意避免过度焦虑，保持适度行动。'
  };
}

// 创建备用内容
function createFallbackContent(guaName) {
  return {
    status: `${guaName}象征着一个重要的转变阶段，当前需要保持耐心和觉察。`,
    trend: `未来趋势将逐渐明朗，关键是要跟随内心的指引前行。`,
    mind: `建议保持开放心态，接纳变化，在行动中寻找平衡点。`,
    risk: `需要注意避免急躁冒进，同时也不要过度保守错失良机。`
  };
}

// 保存JSON文件
function saveJSON(data, filepath) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`已保存到: ${filepath}`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'structure';
  const concurrency = parseInt(args.find(arg => arg.startsWith('--concurrency='))?.split('=')[1] || '3');
  
  console.log(`运行模式: ${mode}, 并发数: ${concurrency}`);
  
  if (mode === 'structure') {
    // 只创建基础结构
    console.log('创建64卦基础结构...');
    const baseStructure = createBaseStructure();
    saveJSON(baseStructure, OUTPUT_FILE);
    console.log('✅ 基础结构创建完成！');
    
  } else if (mode === 'fill') {
    // 填充AI生成的内容
    if (!API_KEY) {
      console.error('❌ 请设置API_KEY环境变量');
      process.exit(1);
    }
    
    // 读取现有结构
    let existingData = {};
    if (fs.existsSync(OUTPUT_FILE)) {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } else {
      console.log('未找到现有文件，先创建基础结构...');
      existingData = createBaseStructure();
    }
    
    console.log('开始填充AI生成内容...');
    
    // 创建队列控制并发
    const queue = new PQueue({ concurrency });
    let completed = 0;
    const total = 64;
    
    // 为每个卦象创建任务
    const tasks = [];
    for (let i = 1; i <= 64; i++) {
      const guaKey = `Q${i}`;
      const guaName = GUA_NAMES[guaKey];
      
      // 跳过已填充的内容（检查是否还是占位符）
      if (!existingData[guaKey].segments.status.includes('【占位】')) {
        console.log(`跳过已填充: ${guaName}`);
        completed++;
        continue;
      }
      
      tasks.push(queue.add(async () => {
        try {
          console.log(`生成内容: ${guaName}`);
          const content = await generateGuaContent(guaKey, guaName);
          
          // 更新数据
          existingData[guaKey].segments = {
            status: content.status,
            trend: content.trend,
            mind: content.mind,
            risk: content.risk
          };
          
          completed++;
          console.log(`✅ 完成 ${completed}/${total}: ${guaName}`);
          
          // 每完成10个保存一次进度
          if (completed % 10 === 0) {
            saveJSON(existingData, OUTPUT_FILE);
            console.log(`💾 已保存进度 (${completed}/${total})`);
          }
          
          // 避免请求过快
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ 生成${guaName}失败:`, error);
          completed++;
        }
      }));
    }
    
    // 等待所有任务完成
    await Promise.all(tasks);
    
    // 最终保存
    saveJSON(existingData, OUTPUT_FILE);
    console.log('🎉 所有内容生成完成！');
    
  } else {
    console.log('可用模式:');
    console.log('  --mode=structure   创建基础结构');
    console.log('  --mode=fill        填充AI内容');
    console.log('示例:');
    console.log('  node scripts/generate_zen_semantic_library.js --mode=structure');
    console.log('  node scripts/generate_zen_semantic_library.js --mode=fill --concurrency=3');
  }
}

// 运行脚本
main().catch(console.error);
