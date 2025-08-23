from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import asyncio

# 可选：集成 OpenAI。若设置 OPENAI_API_KEY，则会优先使用 OpenAI 进行改写
USE_OPENAI = bool(os.getenv("OPENAI_API_KEY"))
try:
    if USE_OPENAI:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except Exception as e:
    USE_OPENAI = False

app = FastAPI(title="InkPersona API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RewriteReq(BaseModel):
    text: str
    instruction: str = "请在保持意思不变的前提下，提高这段文字的清晰度与说服力，并修复错别字。"

class RewriteResp(BaseModel):
    result: str
    provider: str

@app.get("/api/health")
def health():
    return {"ok": True}

@app.post("/api/rewrite", response_model=RewriteResp)
async def rewrite(req: RewriteReq):
    # 优先使用 OpenAI（如果提供了 API Key）
    if USE_OPENAI:
        try:
            prompt = f"你是中文写作助手。根据指令改写下面的文本：\\n指令：{req.instruction}\\n---\\n待改写文本：{req.text}"
            # 使用 Responses API（兼容新版 SDK）；若不支持可切换到 chat.completions
            completion = client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0.3,
                messages=[
                    {"role": "system", "content": "你是一名严谨的中文写作助手，擅长润色、结构优化与风格统一。"},
                    {"role": "user", "content": prompt},
                ],
            )
            content = completion.choices[0].message.content
            return {"result": content, "provider": "openai"}
        except Exception as e:
            # 回退到本地规则改写
            pass

    # 本地简易改写（占位，避免外网依赖）
    text = req.text.strip()
    # 规则：合并多空格 -> 1；确保句末有句号；首字母（如果是英文）大写
    import re
    text = re.sub(r"[ ]{2,}", " ", text)
    if text and text[-1] not in "。！？.!?":
        text += "。"
    # 简单替换一些常见口语（示范）
    replaces = {
        "不是很": "不太",
        "有点": "略显",
        "感觉": "认为",
        "我觉得": "我认为",
        "其实": "事实上",
        "非常": "十分",
    }
    for k, v in replaces.items():
        text = text.replace(k, v)

    # 添加一行依据指令的说明（演示）
    enhanced = f"{text}\\n\\n（按指令“{req.instruction}”进行了本地规则级润色，仅供占位演示）"
    return {"result": enhanced, "provider": "local"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
