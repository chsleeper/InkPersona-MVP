# InkPersona — 智能Markdown编辑器 MVP

一个功能丰富的本地Markdown编辑器，集成AI智能改写功能，支持多平台部署。

## ✨ 核心特性

### 📝 强大的编辑体验
- **实时预览**：支持Markdown/GFM语法，代码高亮
- **Slash命令**：输入`/`快速插入标题、代码块、表格等
- **多文档管理**：支持创建、切换、搜索多个文档
- **禅模式**：专注写作的全屏模式
- **拖拽上传**：支持图片拖拽上传，自动转换为Base64嵌入
- **自动保存**：本地存储，数据不丢失

### 🤖 AI智能功能
- **选区改写**：选中文本后一键AI改写
- **多种风格**：学术、创意、简洁、商务、友好、技术等6种改写风格
- **智能摘要**：自动生成文档摘要
- **语法建议**：拼写、语法、语气优化建议
- **智能翻译**：多语言翻译支持
- **图文生成**：为文本段落生成配图建议

### 🎨 界面与体验
- **多主题支持**：浅色、深色、护眼模式
- **响应式设计**：适配不同屏幕尺寸
- **快捷键支持**：丰富的键盘快捷键
- **目录导航**：自动生成文档目录
- **导出功能**：支持MD、HTML格式导出

## 🚀 快速开始

### 方式一：Web版本（推荐开发测试）

#### 1. 启动后端服务
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 2. 启动前端开发服务器
```powershell
cd frontend
npm install
npm run dev
```
浏览器访问：`http://localhost:5173`

### 方式二：桌面应用

#### 开发模式
```powershell
cd electron
npm install
npm run dev
```

#### 打包安装包
```powershell
# 1. 构建前端
cd frontend
npm run build

# 2. 打包Electron应用
cd ../electron
npm run dist
```
生成的安装包位于 `electron/dist/` 目录

## ⚙️ 配置说明

### OpenAI API配置
1. 复制 `backend/.env.example` 为 `backend/.env`
2. 填入您的OpenAI API Key：
```env
OPENAI_API_KEY=sk-your-api-key-here
```
3. 重启后端服务

> 💡 **提示**：未配置API Key时，系统将使用本地简化版AI功能

### 前端API配置
如需修改后端地址，创建 `frontend/.env`：
```env
VITE_API_BASE=http://your-backend-url:8000
```

## 🎯 使用指南

### 基本操作
- **新建文档**：`Ctrl + N`
- **保存文档**：`Ctrl + S`
- **切换预览**：点击预览按钮或使用快捷键
- **禅模式**：`ESC`进入/退出专注模式

### AI功能使用
1. **快速改写**：选中文本 → `Ctrl + E` → 选择改写风格
2. **快捷改写**：
   - `Ctrl + Shift + A`：学术风格
   - `Ctrl + Shift + C`：创意风格  
   - `Ctrl + Shift + S`：简洁风格
   - `Ctrl + Shift + B`：商务风格
   - `Ctrl + Shift + F`：友好风格
   - `Ctrl + Shift + T`：技术风格

### 内容插入
- 输入 `/` 打开快速插入菜单
- 支持标题、列表、代码块、表格、引用等
- 拖拽图片文件直接上传嵌入

## 📁 项目结构

```
InkPersona-MVP/
├── backend/              # FastAPI后端服务
│   ├── app/
│   │   ├── main.py      # 主应用入口
│   │   └── routers/     # API路由
│   ├── requirements.txt  # Python依赖
│   └── .env.example     # 环境配置模板
├── frontend/            # React前端应用
│   ├── src/
│   │   ├── App.tsx      # 主组件
│   │   ├── styles.css   # 样式文件
│   │   └── main.tsx     # 入口文件
│   ├── package.json     # Node.js依赖
│   └── vite.config.ts   # Vite配置
├── electron/            # Electron桌面应用
│   ├── main.js          # 主进程
│   ├── package.json     # Electron配置
│   └── preload.js       # 预加载脚本
└── README.md           # 项目说明
```

## 🛠️ API接口

### 文本改写
```http
POST /api/rewrite
Content-Type: application/json

{
  "text": "要改写的文本",
  "style": "academic",
  "instruction": "改写指令",
  "openai_config": {
    "api_key": "your-api-key",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

### 其他API
- `POST /api/summarize`：文档摘要
- `POST /api/suggest`：语法建议  
- `POST /api/translate`：文本翻译
- `POST /api/generate-image-prompt`：图文生成

## 🔧 开发说明

### 技术栈
- **前端**：React 18 + TypeScript + Vite
- **后端**：FastAPI + Python 3.8+
- **桌面**：Electron 
- **AI**：OpenAI GPT API
- **样式**：CSS3 + Flexbox + Grid

### 开发环境要求
- Node.js 16+
- Python 3.8+
- npm/yarn

### 构建优化
- 前端使用Vite进行快速构建
- 支持热更新和模块替换
- CSS变量实现主题切换
- 响应式设计适配多设备

## 🚨 常见问题

### Q: AI功能不工作？
A: 检查是否正确配置了OpenAI API Key，确保后端服务正常运行。

### Q: 图片上传失败？  
A: 确保图片格式为JPG/PNG/GIF/WebP，大小不超过5MB。

### Q: 端口冲突？
A: 修改`vite.config.ts`中的端口或后端uvicorn端口。

### Q: 桌面应用打包失败？
A: 确保先执行前端构建`npm run build`，再执行Electron打包。

## 📄 开源协议

MIT License

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m '添加了amazing特性'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 📞 联系方式

- 项目地址：[https://github.com/chsleeper/InkPersona-MVP]
- 问题反馈：[Issues页面]

---

**InkPersona** - 让写作更智能，让创作更高效！ ✍️✨