# InkPersona — MVP + AI 选区改写（Windows 桌面可用）

这是一个可本地运行的 Markdown 编辑器 MVP，包含：
- 前端（Vite + React）
- 后端（FastAPI，带 /api/rewrite 选区改写）
- 桌面端封装（Electron，可打包 Windows 安装包）

## 一、快速开始（开发模式）
### 1) 启动后端（FastAPI）
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
接口：`http://127.0.0.1:8000/api/rewrite`

> 可选：复制 `.env.example` 为 `.env` 并填入 `OPENAI_API_KEY`，后端将使用 OpenAI 进行真实改写。未配置时使用本地规则模拟。

### 2) 启动前端（Vite）
```powershell
cd frontend
npm install
npm run dev
```
浏览器打开 `http://localhost:5173`

> 如需前端更改后端地址，编辑 `frontend/.env` 增加：
> ```
> VITE_API_BASE=http://127.0.0.1:8000/api/rewrite
> ```

### 3) 启动桌面端（开发模式）
另开一个终端：
```powershell
cd electron
npm install
npm run dev
```
> 开发模式下 Electron 会加载 `http://localhost:5173`。

## 二、打包 Windows 桌面应用
1) 先构建前端静态文件：
```powershell
cd frontend
npm run build
```
2) 再打包 Electron：
```powershell
cd ../electron
npm run dist
```
生成的安装包在 `electron/dist/`。

## 三、功能点
- Markdown/GFM 预览、代码高亮、Slash 菜单、导入导出、禅模式。
- 选区改写：在编辑区选中一段文本 → 点“选区改写” → 后端返回新文本并替换。
- 插件化扩展可继续在前端加“插入块”“导出”等注册点。

## 四、目录结构
```
InkPersona-MVP/
  backend/          # FastAPI 服务
  frontend/         # React + Vite 前端
  electron/         # Electron 封装
```

## 五、常见问题
- 端口冲突：修改 `vite.config.ts` 中端口或 Uvicorn 端口。
- CORS：后端已启用 `allow_origins=['*']`，本地联调无障碍。
- AI 不生效：检查是否设置了 `OPENAI_API_KEY`，否则为本地规则占位改写。
