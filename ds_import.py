import os
import json
from openai import OpenAI

# ========= 配置区域 =========
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com",
)

# 批次：可改成 Q6~Q10、Q11~Q20 等
TARGET_IDS = ["Q1", "Q2", "Q3", "Q4", "Q5"]

# 你的精修 prompt（注意：保持 {target_id} 占位符不要动）
BASE_PROMPT = """
你将为 {target_id} 生成 JSON 内容，完全遵循 Q34.json 的结构和字段：
- segments.status: 描述当前状态，偏观察、场景化，不出现“卦、爻、六壬”等术语。
- segments.trend: 描述趋势或暗示，能让用户感受到事情发展方向。
- segments.mind: 行动+心理建设结合，先建议用户可采取的轻松行动，再给心理引导。
- segments.risk: 温馨提示或注意事项，隐晦提醒用户潜在问题。
- lines: 6条内容，每条对应原爻的 line 1-6，场景化叙述，行动引导+心理建设，避免硬性古文或鸡汤风格。
- summary: 用一句七字古诗风格总结，类似“登高一览众山小”，体现整个内容的定型和意境。

生成的 JSON 必须：
- 保持 Q34.json 的完整字段结构，segments、lines、summary 都要输出。
- 可直接替换 {target_id}.json 使用。
- 使用现代语言，但可以隐晦表达易经内核理念：每个人是宇宙的一部分，信息和时间戳、UID、IP也可体现这种全息场逻辑。
- 场景示例：与朋友外出、散步、喝咖啡、登高、短途旅行等日常生活场景。

示例结构参考 Q34.json，输出 JSON 严格遵循格式：
{
  "id": "{target_id}",
  "main": {
    "id": "{target_id}",
    "segments": {
      "status": "...",
      "trend": "...",
      "mind": "...",
      "risk": "..."
    },
    "lines": [
      {"line": 1, "yaoCode": "...", "text": "..."},
      {"line": 2, "yaoCode": "...", "text": "..."},
      {"line": 3, "yaoCode": "...", "text": "..."},
      {"line": 4, "yaoCode": "...", "text": "..."},
      {"line": 5, "yaoCode": "...", "text": "..."},
      {"line": 6, "yaoCode": "...", "text": "..."}
    ]
  },
  "summary": "一句七字古诗风格总结"
}
"""


# ========= 主函数 =========

def generate_hexagram(target_id):
    prompt = BASE_PROMPT.replace("{target_id}", target_id)

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个专业 JSON 生成助手，只输出结构化内容。"},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )

        text = response.choices[0].message.content

        # 清理代码块（如果 DeepSeek 自动加了 Markdown 格式）
        text = text.replace("```json", "").replace("```", "").strip()

        # 转换为 JSON 对象（如格式错误会抛异常）
        return json.loads(text)

    except Exception as e:
        print(f"[ERROR] {target_id} 生成失败: {e}")
        return None


def save_hexagram_json(target_id, data):
    filename = f"{target_id}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] {filename} 已生成")


# ========= 批量执行 =========

if __name__ == "__main__":
    for tid in TARGET_IDS:
        print(f"生成 {tid} ...")
        result = generate_hexagram(tid)

        if result:
            save_hexagram_json(tid, result)
        else:
            print(f"{tid} 生成失败")
