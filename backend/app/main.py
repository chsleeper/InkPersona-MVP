from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
import os
import asyncio
import json
from typing import Optional, Dict, Any

# 可选：集成 OpenAI。若设置 OPENAI_API_KEY，则会优先使用 OpenAI 进行改写
USE_OPENAI = bool(os.getenv("OPENAI_API_KEY"))
try:
    if USE_OPENAI:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception as e:
    USE_OPENAI = False
    print(f"OpenAI not available: {e}")

app = FastAPI(title="InkPersona API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 风格模板定义
STYLE_TEMPLATES = {
    "academic": {
        "name": "学术风格",
        "instruction": "请使用严谨、专业的学术写作风格改写这段文字。要求逻辑清晰、用词准确、结构完整，适合学术论文或研究报告。",
        "replacements": {
            "我觉得": "据研究表明",
            "很好": "具有显著效果",
            "不错": "表现良好",
            "问题": "课题",
            "方法": "研究方法"
        }
    },
    "creative": {
        "name": "创意风格",
        "instruction": "请使用生动活泼、富有想象力的创意写作风格改写这段文字。要求语言生动有趣、充满画面感，适合创意文案或故事叙述。",
        "replacements": {
            "很好": "棒极了",
            "不错": "相当精彩",
            "开始": "启程",
            "完成": "大功告成",
            "方法": "妙招"
        }
    },
    "concise": {
        "name": "简洁风格",
        "instruction": "请将这段文字改写为简洁明了的表达方式。去除冗余词汇、精简句式，保持核心信息清晰准确。",
        "replacements": {
            "其实": "",
            "实际上": "",
            "有点": "略",
            "非常": "很",
            "进行": "",
            "实施": ""
        }
    },
    "business": {
        "name": "商务风格",
        "instruction": "请使用正式的商务写作风格改写这段文字。要求用词专业、语气正式、目标导向明确，适合商业报告或正式沟通。",
        "replacements": {
            "我觉得": "据分析",
            "很好": "效果显著",
            "问题": "挑战",
            "方法": "解决方案",
            "做": "执行"
        }
    },
    "friendly": {
        "name": "友好风格",
        "instruction": "请使用亲和友好的口吻改写这段文字。语言要贴近生活、易于理解，让读者感到温暖亲切。",
        "replacements": {
            "您": "你",
            "实施": "做",
            "执行": "去做",
            "问题": "困难",
            "解决": "搞定"
        }
    },
    "technical": {
        "name": "技术风格",
        "instruction": "请使用准确的技术写作风格改写这段文字。要求术语准确、逻辑严密、条理清晰，适合技术文档或说明书。",
        "replacements": {
            "方法": "算法",
            "做": "实现",
            "好的": "优化的",
            "问题": "异常",
            "完成": "执行完毕"
        }
    }
}


class RewriteReq(BaseModel):
    text: str
    instruction: Optional[str] = "请在保持意思不变的前提下，提高这段文字的清晰度与说服力，并修复错别字。"
    style: Optional[str] = None
    temperature: Optional[float] = 0.3


class RewriteResp(BaseModel):
    result: str
    provider: str
    style_used: Optional[str] = None
    original_length: int
    new_length: int


class SummarizeReq(BaseModel):
    text: str
    max_length: Optional[int] = 200


class SummarizeResp(BaseModel):
    summary: str
    keywords: list[str]
    provider: str


@app.get("/api/health")
def health():
    return {"ok": True, "openai_available": USE_OPENAI}


@app.post("/api/rewrite", response_model=RewriteResp)
async def rewrite(req: RewriteReq):
    original_length = len(req.text)
    style_used = req.style

    # 如果指定了风格，使用风格模板
    if req.style and req.style in STYLE_TEMPLATES:
        style_config = STYLE_TEMPLATES[req.style]
        instruction = style_config["instruction"]
        style_used = style_config["name"]
    else:
        instruction = req.instruction

    # 优先使用 OpenAI（如果提供了 API Key）
    if USE_OPENAI:
        try:
            prompt = f"你是中文写作助手。{instruction}\n\n待改写文本：{req.text}"

            completion = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=req.temperature,
                messages=[
                    {"role": "system",
                     "content": "你是一名严谨的中文写作助手，擅长润色、结构优化与风格统一。请只返回改写后的文本，不要添加任何解释或说明。"},
                    {"role": "user", "content": prompt},
                ],
            )
            content = completion.choices[0].message.content.strip()

            return RewriteResp(
                result=content,
                provider="openai",
                style_used=style_used,
                original_length=original_length,
                new_length=len(content)
            )
        except Exception as e:
            print(f"OpenAI API error: {e}")
            # 回退到本地规则改写
            pass

    # 本地改写逻辑
    enhanced = enhance_text_locally(req.text, req.style)

    return RewriteResp(
        result=enhanced,
        provider="local",
        style_used=style_used,
        original_length=original_length,
        new_length=len(enhanced)
    )


@app.post("/api/summarize", response_model=SummarizeResp)
async def summarize(req: SummarizeReq):
    # 使用 OpenAI 生成摘要
    if USE_OPENAI:
        try:
            prompt = f"请为以下文本生成一个简洁的摘要（不超过{req.max_length}字）并提取3-5个关键词：\n\n{req.text}"

            completion = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0.1,
                messages=[
                    {"role": "system",
                     "content": "你是文本摘要专家。请先提供摘要，然后在新行列出关键词，格式为：关键词：词1, 词2, 词3"},
                    {"role": "user", "content": prompt},
                ],
            )

            response = completion.choices[0].message.content.strip()

            # 解析摘要和关键词
            lines = response.split('\n')
            summary = lines[0]
            keywords = []

            for line in lines[1:]:
                if '关键词' in line or 'keywords' in line.lower():
                    keyword_text = line.split('：')[-1] if '：' in line else line.split(':')[-1]
                    keywords = [k.strip() for k in keyword_text.split(',')]
                    break

            return SummarizeResp(
                summary=summary,
                keywords=keywords,
                provider="openai"
            )
        except Exception as e:
            print(f"OpenAI summarization error: {e}")

    # 本地简单摘要
    summary = generate_local_summary(req.text, req.max_length)
    keywords = extract_keywords(req.text)

    return SummarizeResp(
        summary=summary,
        keywords=keywords,
        provider="local"
    )


@app.get("/api/styles")
def get_styles():
    """获取所有可用的写作风格"""
    return {
        "styles": [
            {
                "key": key,
                "name": config["name"],
                "instruction": config["instruction"]
            }
            for key, config in STYLE_TEMPLATES.items()
        ]
    }


def enhance_text_locally(text: str, style: Optional[str] = None) -> str:
    """本地文本增强逻辑"""
    result = text.strip()

    # 基础清理
    import re
    result = re.sub(r"[ ]{2,}", " ", result)

    # 应用风格特定的替换
    if style and style in STYLE_TEMPLATES:
        replacements = STYLE_TEMPLATES[style]["replacements"]
        for old, new in replacements.items():
            if new:  # 如果新词不为空
                result = result.replace(old, new)
            else:  # 如果新词为空，则删除原词
                result = result.replace(old, "")

        # 清理多余空格
        result = re.sub(r"\s+", " ", result).strip()
    else:
        # 通用改进
        common_replacements = {
            "不是很": "不太",
            "有点": "略显",
            "感觉": "认为",
            "我觉得": "我认为",
            "其实": "事实上",
            "非常": "十分",
        }
        for old, new in common_replacements.items():
            result = result.replace(old, new)

    # 确保句末标点
    if result and result[-1] not in "。！？.!?":
        result += "。"

    return result


def generate_local_summary(text: str, max_length: int = 200) -> str:
    """本地摘要生成"""
    sentences = text.split('。')
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        return text[:max_length] + "..." if len(text) > max_length else text

    # 取前几句作为摘要
    summary = ""
    for sentence in sentences:
        if len(summary + sentence + "。") <= max_length:
            summary += sentence + "。"
        else:
            break

    return summary if summary else text[:max_length] + "..."


def extract_keywords(text: str) -> list[str]:
    """本地关键词提取"""
    import re

    # 简单的关键词提取：找出出现频率较高的词
    words = re.findall(r'[\u4e00-\u9fa5]{2,}', text)  # 提取中文词汇
    word_freq = {}

    for word in words:
        if len(word) >= 2:  # 只考虑长度大于等于2的词
            word_freq[word] = word_freq.get(word, 0) + 1

    # 按频率排序，取前5个
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    keywords = [word for word, freq in sorted_words[:5] if freq > 1]

    return keywords[:5]  # 最多返回5个关键词


# 静态文件服务（如果需要）
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_root():
    """返回前端页面"""
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    else:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>InkPersona API</title>
        </head>
        <body>
            <h1>InkPersona API Server</h1>
            <p>API 服务器正在运行</p>
            <h2>可用端点：</h2>
            <ul>
                <li><a href="/docs">API 文档</a></li>
                <li><code>POST /api/rewrite</code> - 文本改写</li>
                <li><code>POST /api/summarize</code> - 文本摘要</li>
                <li><code>GET /api/styles</code> - 获取写作风格</li>
                <li><code>GET /api/health</code> - 健康检查</li>
            </ul>
        </body>
        </html>
        """


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)