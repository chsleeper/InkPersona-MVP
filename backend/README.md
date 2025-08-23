# Backend (FastAPI)

## 本地运行
```bash
# 1) 创建虚拟环境（可选）
python -m venv .venv
# 2) 激活环境
# Windows PowerShell:
.\\.venv\\Scripts\\Activate.ps1
# 3) 安装依赖
pip install -r requirements.txt
# 4) 运行
uvicorn app.main:app --reload --port 8000
```

## 启用 OpenAI（可选）
复制 `.env.example` 为 `.env`，填入 `OPENAI_API_KEY`。
