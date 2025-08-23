import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, Link, Image, Table, Eye, EyeOff, Download, Upload, Maximize2, Minimize2, FileText, BookOpen, Save, Settings, Moon, Sun, Palette } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";

const sample = `---
title: 我的第一篇笔记
tags: [产品规划, 设计, 研发]
created: ${new Date().toISOString()}
---

# 你好，InkPersona！

> 这是一个**有个性**的编辑器 MVP：
> - Slash 命令: 输入 "/" 试试看
> - 禅模式: 右上角切换
> - 主题切换: 支持明暗主题

## 代码

\`\`\`js
function hello(name){
  console.log(\`Hello, \${name}!\`);
}
\`\`\`

## 表格

| 模块 | 状态 | 备注 |
|---|---|---|
| 渲染 | ✅ | react-markdown + gfm |
| 预览 | ✅ | 支持代码高亮 |
| 导出 | ✅ | .md / .html |

![示意图](https://images.unsplash.com/photo-1551033406-611cf9a28f67?w=800&h=240&fit=crop&auto=format)
`;

type Tool = {
  key: string;
  icon: any;
  tip: string;
  wrap?: [string, string];
  insert?: string;
  prefix?: string;
  template?: string;
};

const TOOLBAR: Tool[] = [
  { key: "bold", icon: Bold, tip: "粗体 (Ctrl+B)", wrap: ["**", "**"], insert: "加粗文本" },
  { key: "italic", icon: Italic, tip: "斜体 (Ctrl+I)", wrap: ["*", "*"], insert: "斜体文本" },
  { key: "strike", icon: Strikethrough, tip: "删除线", wrap: ["~~", "~~"], insert: "删除线文本" },
  { key: "code", icon: Code, tip: "行内代码", wrap: ["`", "`"], insert: "代码" },
  { key: "quote", icon: Quote, tip: "引用", prefix: "> ", insert: "引用内容" },
  { key: "ul", icon: List, tip: "无序列表", prefix: "- ", insert: "列表项" },
  { key: "ol", icon: ListOrdered, tip: "有序列表", prefix: "1. ", insert: "列表项" },
  { key: "link", icon: Link, tip: "链接 (Ctrl+K)", template: "[链接文本](https://example.com)" },
  { key: "image", icon: Image, tip: "图片", template: "![图片描述](https://example.com/image.jpg)" },
  { key: "table", icon: Table, tip: "表格", template: "| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 值1 | 值2 | 值3 |\n| 值4 | 值5 | 值6 |" },
];

const SLASH_COMMANDS = [
  { key: "h1", label: "# 一级标题", snippet: "# 标题\n\n" },
  { key: "h2", label: "## 二级标题", snippet: "## 小节标题\n\n" },
  { key: "h3", label: "### 三级标题", snippet: "### 子标题\n\n" },
  { key: "todo", label: "✓ 任务列表", snippet: "- [ ] 待办事项 1\n- [x] 已完成事项\n- [ ] 待办事项 2\n\n" },
  { key: "note", label: "💡 提示块", snippet: "> **💡 提示**\n> \n> 这里是重要提示内容\n\n" },
  { key: "warn", label: "⚠️ 警告块", snippet: "> **⚠️ 警告**\n> \n> 请注意这里的内容！\n\n" },
  { key: "code", label: "💻 代码块", snippet: "```javascript\n// 在这里输入代码\nconsole.log('Hello World!');\n```\n\n" },
  { key: "table", label: "📊 数据表格", snippet: "| 项目 | 状态 | 备注 |\n|------|------|------|\n| 项目A | 进行中 | 优先级高 |\n| 项目B | 已完成 | 质量良好 |\n\n" },
  { key: "hr", label: "➖ 分割线", snippet: "\n---\n\n" },
];

// 主题配置
const THEMES = {
  light: {
    bg: '#ffffff',
    fg: '#111827',
    muted: '#6b7280',
    border: '#e5e7eb',
    cardBg: '#ffffff',
    primary: '#6366f1',
    accent: '#f3f4f6',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    bg: '#0f172a',
    fg: '#f1f5f9',
    muted: '#94a3b8',
    border: '#334155',
    cardBg: '#1e293b',
    primary: '#6366f1',
    accent: '#334155',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  sepia: {
    bg: '#f7f3e9',
    fg: '#5d4e37',
    muted: '#8b7355',
    border: '#d4c4a0',
    cardBg: '#faf8f3',
    primary: '#8b5a3c',
    accent: '#f0eadb',
    shadow: 'rgba(139, 90, 60, 0.1)',
  }
};

function downloadFile(filename: string, content: string, type = "text/plain;charset=utf-8"){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function caretPosition(textarea: HTMLTextAreaElement){
  const { selectionEnd } = textarea;
  const div = document.createElement('div');
  const style = getComputedStyle(textarea);

  for (const prop of Array.from(style)) {
    (div.style as any)[prop] = (style as any)[prop];
  }

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.overflow = 'hidden';
  div.textContent = textarea.value.substring(0, selectionEnd ?? 0);

  if ((selectionEnd ?? 0) === textarea.value.length) {
    div.textContent += '.';
  }

  document.body.appendChild(div);
  const span = document.createElement('span');
  span.textContent = textarea.value.substring(selectionEnd ?? 0) || '.';
  div.appendChild(span);
  const rect = span.getBoundingClientRect();
  document.body.removeChild(div);
  return rect;
}

export default function App(){
  const [title, setTitle] = useState("未命名文档");
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem("inkpersona:content") || sample;
    } catch {
      return sample;
    }
  });

  const [showPreview, setShowPreview] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("inkpersona:preview") || "true");
    } catch {
      return true;
    }
  });

  const [zen, setZen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("inkpersona:theme") || "light";
    } catch {
      return "light";
    }
  });

  const [fontSize, setFontSize] = useState(() => {
    try {
      return Number(localStorage.getItem("inkpersona:fontSize")) || 16;
    } catch {
      return 16;
    }
  });

  const [lineWidth, setLineWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("inkpersona:lineWidth")) || 820;
    } catch {
      return 820;
    }
  });

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({x:0,y:0});
  const [slashFilter, setSlashFilter] = useState("");
  const [status, setStatus] = useState("已保存");
  const [showSettings, setShowSettings] = useState(false);
  const [wordCount, setWordCount] = useState({ chars: 0, words: 0, lines: 0 });

  const textRef = useRef<HTMLTextAreaElement|null>(null);
  const slashRef = useRef<HTMLDivElement|null>(null);

  // 计算文档统计
  const updateWordCount = useCallback((text: string) => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    setWordCount({ chars, words, lines });
  }, []);

  // 保存到本地存储
  useEffect(() => {
    try {
      localStorage.setItem("inkpersona:content", value);
      localStorage.setItem("inkpersona:preview", JSON.stringify(showPreview));
      localStorage.setItem("inkpersona:theme", theme);
      localStorage.setItem("inkpersona:fontSize", String(fontSize));
      localStorage.setItem("inkpersona:lineWidth", String(lineWidth));
      updateWordCount(value);
      setStatus("已保存");
    } catch (e) {
      console.warn("无法保存到本地存储", e);
    }
  }, [value, showPreview, theme, fontSize, lineWidth, updateWordCount]);

  // 应用主题
  useEffect(() => {
    const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;
    const root = document.documentElement;

    Object.entries(currentTheme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        downloadMD();
      }

      if (isCtrl && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        applyToolbar(TOOLBAR.find(t => t.key === 'bold')!);
      }

      if (isCtrl && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        applyToolbar(TOOLBAR.find(t => t.key === 'italic')!);
      }

      if (isCtrl && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        applyToolbar(TOOLBAR.find(t => t.key === 'link')!);
      }

      if (e.key === '/' && !slashOpen) {
        const ta = textRef.current;
        if (!ta || ta !== document.activeElement) return;

        setTimeout(() => {
          setSlashOpen(true);
          const rect = caretPosition(ta);
          setSlashPos({ x: rect.left, y: rect.top + 20 });
          setSlashFilter("");
        }, 0);
      }

      if (e.key === 'Escape') {
        setSlashOpen(false);
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashOpen]);

  // 点击外部关闭slash菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) {
        setSlashOpen(false);
      }
    };

    if (slashOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [slashOpen]);

  const markdown = useMemo(() => value, [value]);

  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
    );
  }, [slashFilter]);

  function applyToolbar(tool: Tool) {
    const ta = textRef.current;
    if (!ta) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const selected = value.slice(start, end) || tool.insert || "";
    let replaced = selected;

    if (tool.wrap) {
      replaced = `${tool.wrap[0]}${selected}${tool.wrap[1]}`;
    } else if (tool.prefix) {
      replaced = selected.split('\n').map(l => tool.prefix + l).join('\n');
    } else if (tool.template) {
      replaced = tool.template;
    }

    const next = value.slice(0, start) + replaced + value.slice(end);
    setValue(next);
    setStatus("未保存更改");

    setTimeout(() => {
      ta.focus();
      const caret = start + replaced.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }

  function insertSnippet(snippet: string) {
    const ta = textRef.current;
    if (!ta) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;

    // 移除开头的 "/"
    const textBefore = value.slice(0, start);
    const lastSlashIndex = textBefore.lastIndexOf('/');
    const actualStart = lastSlashIndex >= 0 ? lastSlashIndex : start;

    const next = value.slice(0, actualStart) + snippet + value.slice(end);
    setValue(next);
    setSlashOpen(false);

    setTimeout(() => {
      ta.focus();
      const caret = actualStart + snippet.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setValue(String(reader.result || ""));
      setTitle(file.name.replace(/\.(md|markdown|txt)$/i, ""));
    };
    reader.readAsText(file);
  }

  function downloadMD() {
    downloadFile(`${title || '未命名文档'}.md`, value);
  }

  function downloadHTML() {
    const previewElement = document.getElementById('md-preview');
    const htmlContent = previewElement?.innerHTML || "";
    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 10px; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 8px; }
        p { margin-bottom: 16px; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 8px; overflow-x: auto; }
        code { background: #f6f8fa; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
        blockquote { border-left: 4px solid #dfe2e5; margin: 0; padding: 0 20px; color: #6a737d; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
        th { background: #f6f8fa; font-weight: 600; }
        img { max-width: 100%; height: auto; }
        ul, ol { padding-left: 24px; margin-bottom: 16px; }
        li { margin-bottom: 4px; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    downloadFile(`${title || '未命名文档'}.html`, fullHTML, 'text/html;charset=utf-8');
  }

  const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.bg,
      color: currentTheme.fg,
      transition: 'all 0.3s ease'
    }}>
      {/* 顶部导航栏 */}
      <div className="topbar">
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 14
            }}>
              IP
            </div>

            <strong style={{
              fontSize: 18,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              InkPersona
            </strong>

            <input
              className="input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="文档标题..."
              style={{ minWidth: 200 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="button">
              <Upload size={16} />
              导入 .md
              <input
                type="file"
                accept=".md,.markdown,.txt"
                style={{ display: 'none' }}
                onChange={onUpload}
              />
            </label>

            <button
              className={`button ${showSettings ? 'primary' : ''}`}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={16} />
              设置
            </button>

            <button
              className={`button ${zen ? 'primary' : ''}`}
              onClick={() => setZen(!zen)}
            >
              {zen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              禅模式
            </button>

            <button
              className={`button ${showPreview ? 'primary' : ''}`}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
              预览
            </button>

            <button className="button" onClick={downloadMD}>
              <Download size={16} />
              .md
            </button>

            <button className="button" onClick={downloadHTML}>
              <Download size={16} />
              .html
            </button>
          </div>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="settings-panel">
          <h3>编辑器设置</h3>

          <div className="setting-group">
            <label>主题模式</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.keys(THEMES).map((key) => (
                <button
                  key={key}
                  className={`button ${theme === key ? 'primary' : ''}`}
                  onClick={() => setTheme(key)}
                  style={{ padding: '6px 10px', fontSize: 12 }}
                >
                  {key === 'light' && <Sun size={12} />}
                  {key === 'dark' && <Moon size={12} />}
                  {key === 'sepia' && <Palette size={12} />}
                  <span style={{ marginLeft: 4, textTransform: 'capitalize' }}>{key}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <label>字体大小: {fontSize}px</label>
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="setting-group">
            <label>预览宽度: {lineWidth}px</label>
            <input
              type="range"
              min="600"
              max="1200"
              value={lineWidth}
              onChange={e => setLineWidth(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 12 }}>
        <div className="card" style={{ padding: zen ? 0 : 20 }}>
          {/* 工具栏 */}
          {!zen && (
            <div className="toolbar">
              {TOOLBAR.map(t => (
                <button
                  key={t.key}
                  className="button"
                  title={t.tip}
                  onClick={() => applyToolbar(t)}
                >
                  {React.createElement(t.icon, { size: 16 })}
                </button>
              ))}
              <span className="badge">输入 "/" 打开插入菜单</span>
            </div>
          )}

          {/* Slash 命令菜单 */}
          {slashOpen && (
            <div
              ref={slashRef}
              className="slash-menu"
              style={{
                position: 'fixed',
                left: slashPos.x,
                top: slashPos.y,
                zIndex: 1000
              }}
            >
              {filteredSlashCommands.map(cmd => (
                <div
                  key={cmd.key}
                  className="slash-item"
                  onClick={() => insertSnippet(cmd.snippet)}
                >
                  {cmd.label}
                </div>
              ))}
            </div>
          )}

          <div className={showPreview ? "row split" : "row"}>
            <div>
              <textarea
                ref={textRef}
                className="textarea"
                style={{
                  fontSize: fontSize,
                  lineHeight: 1.6,
                  height: zen ? 'calc(100vh - 80px)' : '62vh'
                }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="# 从这里开始写作..."
              />
              <div className="editor-stats">
                <span><Save size={14}/> {status}</span>
                <span><FileText size={14}/> {wordCount.chars} 字符</span>
                <span><BookOpen size={14}/> {wordCount.words} 词</span>
              </div>
            </div>

            {showPreview && <div className="divider"></div>}

            {showPreview && (
              <div>
                <div className="preview-header">
                  <div>预览</div>
                  <div>宽度 {Math.round(lineWidth)}px</div>
                </div>
                <div
                  id="md-preview"
                  className="prose"
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 20,
                    overflow: 'auto',
                    width: lineWidth,
                    maxHeight: zen ? 'calc(100vh - 120px)' : '62vh'
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!zen && (
        <div className="footer">
          <div>快捷键：Ctrl/Cmd+S 保存、Ctrl/Cmd+B 加粗、Ctrl/Cmd+I 斜体、Ctrl/Cmd+K 链接、/ 打开插入菜单</div>
          <div>本地自动保存 • 无打扰写作</div>
        </div>
      )}
    </div>
  );
}