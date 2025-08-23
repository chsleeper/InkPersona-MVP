import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, Link, Image, Table, Eye, EyeOff, Download, Upload, Maximize2, Minimize2, FileText, BookOpen, Save, Settings, Moon, Sun, Palette, Plus, X, Menu, Hash, Clock, FileType, RefreshCw, Wand2, Sparkles } from "lucide-react";
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

type Document = {
  id: string;
  title: string;
  content: string;
  created: Date;
  modified: Date;
};

type TOCItem = {
  level: number;
  text: string;
  id: string;
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
  { key: "todo", label: "✅ 任务列表", snippet: "- [ ] 待办事项 1\n- [x] 已完成事项\n- [ ] 待办事项 2\n\n" },
  { key: "note", label: "💡 提示块", snippet: "> **💡 提示**\n> \n> 这里是重要提示内容\n\n" },
  { key: "warn", label: "⚠️ 警告块", snippet: "> **⚠️ 警告**\n> \n> 请注意这里的内容！\n\n" },
  { key: "code", label: "💻 代码块", snippet: "```javascript\n// 在这里输入代码\nconsole.log('Hello World!');\n```\n\n" },
  { key: "table", label: "📊 数据表格", snippet: "| 项目 | 状态 | 备注 |\n|------|------|------|\n| 项目A | 进行中 | 优先级高 |\n| 项目B | 已完成 | 质量良好 |\n\n" },
  { key: "hr", label: "➖ 分割线", snippet: "\n---\n\n" },
];

const AI_STYLES = [
  { key: "academic", label: "📚 学术风", description: "严谨、专业、逻辑清晰" },
  { key: "creative", label: "🎨 创意风", description: "生动、有趣、富有想象力" },
  { key: "concise", label: "✂️ 简洁风", description: "言简意赅、条理清晰" },
  { key: "business", label: "💼 商务风", description: "正式、专业、目标导向" },
  { key: "friendly", label: "😊 友好风", description: "亲和、易懂、贴近生活" },
  { key: "technical", label: "⚙️ 技术风", description: "准确、详细、逻辑严密" },
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

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function extractTOC(markdown: string): TOCItem[] {
  const lines = markdown.split('\n');
  const toc: TOCItem[] = [];

  lines.forEach((line) => {
    const match = line.match(/^(#{1,6})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
      toc.push({ level, text, id });
    }
  });

  return toc;
}

function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200; // 中文约200字/分钟
  const wordCount = text.length;
  return Math.ceil(wordCount / wordsPerMinute);
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
  // 多文档管理
  const [documents, setDocuments] = useState<Document[]>(() => {
    try {
      const saved = localStorage.getItem("inkpersona:documents");
      if (saved) {
        const docs = JSON.parse(saved);
        return docs.map((doc: any) => ({
          ...doc,
          created: new Date(doc.created),
          modified: new Date(doc.modified)
        }));
      }
      return [{
        id: generateId(),
        title: "未命名文档",
        content: sample,
        created: new Date(),
        modified: new Date()
      }];
    } catch {
      return [{
        id: generateId(),
        title: "未命名文档",
        content: sample,
        created: new Date(),
        modified: new Date()
      }];
    }
  });

  const [activeDocId, setActiveDocId] = useState(() => documents[0]?.id || '');
  const activeDoc = documents.find(doc => doc.id === activeDocId) || documents[0];

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

  const [showTOC, setShowTOC] = useState(true);
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({x:0,y:0});
  const [slashFilter, setSlashFilter] = useState("");
  const [status, setStatus] = useState("已保存");
  const [showSettings, setShowSettings] = useState(false);
  const [wordCount, setWordCount] = useState({ chars: 0, words: 0, lines: 0 });
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
      localStorage.setItem("inkpersona:documents", JSON.stringify(documents));
      localStorage.setItem("inkpersona:preview", JSON.stringify(showPreview));
      localStorage.setItem("inkpersona:theme", theme);
      localStorage.setItem("inkpersona:fontSize", String(fontSize));
      localStorage.setItem("inkpersona:lineWidth", String(lineWidth));
      updateWordCount(activeDoc?.content || '');
      setStatus("已保存");
    } catch (e) {
      console.warn("无法保存到本地存储", e);
    }
  }, [documents, showPreview, theme, fontSize, lineWidth, updateWordCount, activeDoc]);

  // 应用主题
  useEffect(() => {
    const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;
    const root = document.documentElement;

    Object.entries(currentTheme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  // 生成目录
  const toc = useMemo(() => {
    return extractTOC(activeDoc?.content || '');
  }, [activeDoc?.content]);

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

      if (isCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        handleTextSelection();
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
        setShowAIPanel(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashOpen]);

  // 点击外部关闭菜单
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

  const markdown = useMemo(() => activeDoc?.content || '', [activeDoc?.content]);

  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
    );
  }, [slashFilter]);

  function updateDocument(id: string, updates: Partial<Document>) {
    setDocuments(docs => docs.map(doc =>
      doc.id === id ? { ...doc, ...updates, modified: new Date() } : doc
    ));
    setStatus("未保存更改");
  }

  function updateActiveDocument(content: string) {
    if (activeDoc) {
      updateDocument(activeDoc.id, { content });
    }
  }

  function createNewDocument() {
    const newDoc: Document = {
      id: generateId(),
      title: "新文档",
      content: "# 新文档\n\n开始你的写作...\n",
      created: new Date(),
      modified: new Date()
    };
    setDocuments(docs => [...docs, newDoc]);
    setActiveDocId(newDoc.id);
  }

  function deleteDocument(id: string) {
    if (documents.length <= 1) return;

    setDocuments(docs => docs.filter(doc => doc.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter(doc => doc.id !== id);
      setActiveDocId(remaining[0]?.id || '');
    }
  }

  function duplicateDocument(id: string) {
    const docToDupe = documents.find(doc => doc.id === id);
    if (!docToDupe) return;

    const newDoc: Document = {
      ...docToDupe,
      id: generateId(),
      title: docToDupe.title + " (副本)",
      created: new Date(),
      modified: new Date()
    };
    setDocuments(docs => [...docs, newDoc]);
  }

  function applyToolbar(tool: Tool) {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const selected = activeDoc.content.slice(start, end) || tool.insert || "";
    let replaced = selected;

    if (tool.wrap) {
      replaced = `${tool.wrap[0]}${selected}${tool.wrap[1]}`;
    } else if (tool.prefix) {
      replaced = selected.split('\n').map(l => tool.prefix + l).join('\n');
    } else if (tool.template) {
      replaced = tool.template;
    }

    const next = activeDoc.content.slice(0, start) + replaced + activeDoc.content.slice(end);
    updateActiveDocument(next);

    setTimeout(() => {
      ta.focus();
      const caret = start + replaced.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }

  function insertSnippet(snippet: string) {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;

    // 移除开头的 "/"
    const textBefore = activeDoc.content.slice(0, start);
    const lastSlashIndex = textBefore.lastIndexOf('/');
    const actualStart = lastSlashIndex >= 0 ? lastSlashIndex : start;

    const next = activeDoc.content.slice(0, actualStart) + snippet + activeDoc.content.slice(end);
    updateActiveDocument(next);
    setSlashOpen(false);

    setTimeout(() => {
      ta.focus();
      const caret = actualStart + snippet.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }

  function handleTextSelection() {
    const ta = textRef.current;
    if (!ta) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const selected = ta.value.slice(start, end);

    if (selected.trim()) {
      setSelectedText(selected);
      setShowAIPanel(true);
    }
  }

  async function rewriteText(style: string) {
    if (!selectedText.trim()) return;

    setAiLoading(true);
    try {
      // 修复：使用正确的API地址
      const response = await fetch('http://localhost:8000/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          style: style,
          instruction: `请按照${AI_STYLES.find(s => s.key === style)?.label}的风格改写这段文字`
        })
      });

      if (response.ok) {
        const data = await response.json();
        replaceSelectedText(data.result);
      } else {
        // 回退到本地简单改写
        const enhanced = enhanceTextLocally(selectedText, style);
        replaceSelectedText(enhanced);
      }
    } catch (error) {
      console.error('AI改写失败:', error);
      // 回退到本地简单改写
      const enhanced = enhanceTextLocally(selectedText, style);
      replaceSelectedText(enhanced);
    } finally {
      setAiLoading(false);
      setShowAIPanel(false);
    }
  }

  function enhanceTextLocally(text: string, style: string): string {
    // 本地简单改写逻辑
    let result = text.trim();

    switch (style) {
      case 'concise':
        result = result.replace(/其实|实际上|事实上/g, '').replace(/有点|一点/g, '略').trim();
        break;
      case 'academic':
        result = result.replace(/我觉得/g, '据观察').replace(/很|非常/g, '十分');
        break;
      case 'friendly':
        result = result.replace(/。/g, '～').replace(/，/g, '，');
        break;
    }

    return result;
  }

  function replaceSelectedText(newText: string) {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const next = activeDoc.content.slice(0, start) + newText + activeDoc.content.slice(end);
    updateActiveDocument(next);

    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start, start + newText.length);
    }, 0);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      const newDoc: Document = {
        id: generateId(),
        title: file.name.replace(/\.(md|markdown|txt)$/i, ""),
        content,
        created: new Date(),
        modified: new Date()
      };
      setDocuments(docs => [...docs, newDoc]);
      setActiveDocId(newDoc.id);
    };
    reader.readAsText(file);
  }

  function downloadMD() {
    if (!activeDoc) return;
    downloadFile(`${activeDoc.title || '未命名文档'}.md`, activeDoc.content);
  }

  function downloadHTML() {
    if (!activeDoc) return;

    const previewElement = document.getElementById('md-preview');
    const htmlContent = previewElement?.innerHTML || "";
    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeDoc.title}</title>
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
    downloadFile(`${activeDoc.title || '未命名文档'}.html`, fullHTML, 'text/html;charset=utf-8');
  }

  function downloadPDF() {
    if (!activeDoc) return;

    // 简单的 PDF 导出提示
    alert('PDF 导出功能需要服务端支持，请先导出 HTML 然后使用浏览器打印为 PDF');
  }

  function jumpToHeading(id: string) {
    const element = document.getElementById(`heading-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;
  const readingTime = calculateReadingTime(activeDoc?.content || '');

  return (
    <div
      className={zen ? 'zen-mode' : ''}
      style={{
        minHeight: '100vh',
        background: currentTheme.bg,
        color: currentTheme.fg,
        transition: 'all 0.3s ease'
      }}
    >
      {/* 顶部导航栏 */}
      {!zen && (
        <div className="topbar">
          <div className="container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            maxWidth: '1600px'
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

              <button
                className={`button ${showDocumentList ? 'primary' : ''}`}
                onClick={() => setShowDocumentList(!showDocumentList)}
              >
                <Menu size={16} />
                文档 ({documents.length})
              </button>

              <input
                className="input"
                value={activeDoc?.title || ''}
                onChange={e => activeDoc && updateDocument(activeDoc.id, { title: e.target.value })}
                placeholder="文档标题..."
                style={{ minWidth: 200 }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button className="button" onClick={createNewDocument}>
                <Plus size={16} />
                新建
              </button>

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

              {/* 改进AI改写按钮样式 */}
              <button
                className="button ai-button"
                onClick={handleTextSelection}
                title="AI 改写选中文本 (Ctrl+E)"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  fontWeight: '500'
                }}
              >
                <Sparkles size={16} />
                AI 改写
              </button>

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

              <button className="button" onClick={downloadPDF}>
                <FileType size={16} />
                PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文档列表面板 */}
      {showDocumentList && (
        <div className="document-list-panel">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>文档列表</h3>
            <button className="button ghost" onClick={() => setShowDocumentList(false)}>
              <X size={16} />
            </button>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {documents.map(doc => (
              <div
                key={doc.id}
                className={`document-item ${doc.id === activeDocId ? 'active' : ''}`}
                onClick={() => {
                  setActiveDocId(doc.id);
                  setShowDocumentList(false);
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{doc.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {doc.modified.toLocaleDateString()} • {doc.content.length} 字符
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="button ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateDocument(doc.id);
                    }}
                    style={{ padding: '4px' }}
                  >
                    <FileText size={14} />
                  </button>
                  {documents.length > 1 && (
                    <button
                      className="button ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('确定要删除这个文档吗？')) {
                          deleteDocument(doc.id);
                        }
                      }}
                      style={{ padding: '4px', color: '#ef4444' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 面板 */}
      {showAIPanel && (
        <div className="ai-panel">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={16} />
              AI 改写助手
            </h3>
            <button className="button ghost" onClick={() => setShowAIPanel(false)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--accent)', borderRadius: 8, fontSize: 14 }}>
              <strong>选中文本:</strong>
              <div style={{ marginTop: 8, fontStyle: 'italic' }}>"{selectedText}"</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ marginBottom: 8, display: 'block' }}>选择改写风格:</strong>
              <div style={{ display: 'grid', gap: 8 }}>
                {AI_STYLES.map(style => (
                  <button
                    key={style.key}
                    className="ai-style-button"
                    onClick={() => rewriteText(style.key)}
                    disabled={aiLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--cardBg)',
                      cursor: aiLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: aiLoading ? 0.6 : 1
                    }}
                  >
                    <span>{style.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, textAlign: 'left' }}>
                      {style.description}
                    </span>
                    {aiLoading && <RefreshCw size={14} className="spin" />}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              快捷键: Ctrl/Cmd + E 快速选择文本进行改写
            </div>
          </div>
        </div>
      )}

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

          <div className="setting-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={showTOC}
                onChange={e => setShowTOC(e.target.checked)}
              />
              显示目录导航
            </label>
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: zen ? 0 : 12, maxWidth: '1600px' }}>
        <div className={zen ? "main-layout zen" : "main-layout"}>
          {/* 侧边目录 */}
          {showTOC && toc.length > 0 && !zen && (
            <div className="toc-sidebar">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 14 }}>
                <Hash size={16} style={{ display: 'inline', marginRight: 6 }} />
                目录导航
              </div>
              <div style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
                {toc.map((item, index) => (
                  <div
                    key={index}
                    className="toc-item"
                    style={{
                      paddingLeft: 16 + (item.level - 1) * 16,
                      paddingRight: 16,
                      paddingTop: 6,
                      paddingBottom: 6,
                      cursor: 'pointer',
                      fontSize: 14 - (item.level - 1),
                      color: item.level === 1 ? 'var(--fg)' : 'var(--muted)',
                      borderLeft: item.level === 1 ? '3px solid var(--primary)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => jumpToHeading(item.id)}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 主编辑区域 */}
          <div className="editor-area" style={{ flex: 1, minHeight: zen ? '100vh' : 'calc(100vh - 200px)' }}>
            <div className="card" style={{
              padding: zen ? 20 : 20,
              border: zen ? 'none' : undefined,
              boxShadow: zen ? 'none' : undefined,
              background: zen ? 'transparent' : undefined,
              minHeight: zen ? '100vh' : 'auto'
            }}>
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
                  <div style={{ flex: 1 }}></div>
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

              {/* 编辑器布局 - 修复为确保固定高度 */}
              <div className={showPreview && !zen ? "editor-layout split" : "editor-layout"}>
                <div className="editor-section" style={{ minHeight: zen ? 'calc(100vh - 100px)' : '60vh' }}>
                  <textarea
                    ref={textRef}
                    className="textarea"
                    style={{
                      fontSize: fontSize,
                      lineHeight: 1.6,
                      height: zen ? 'calc(100vh - 100px)' : '60vh',
                      width: '100%',
                      minHeight: zen ? 'calc(100vh - 100px)' : '60vh',
                      background: zen ? 'transparent' : undefined,
                      border: zen ? 'none' : undefined,
                      outline: zen ? 'none' : undefined
                    }}
                    value={activeDoc?.content || ''}
                    onChange={(e) => updateActiveDocument(e.target.value)}
                    onSelect={e => {
                      const target = e.target as HTMLTextAreaElement;
                      const selected = target.value.slice(target.selectionStart, target.selectionEnd);
                      if (selected.trim()) {
                        setSelectedText(selected);
                      }
                    }}
                    placeholder="# 从这里开始写作..."
                  />
                  {!zen && (
                    <div className="editor-stats">
                      <span><Save size={14}/> {status}</span>
                      <span><FileText size={14}/> {wordCount.chars} 字符</span>
                      <span><BookOpen size={14}/> {wordCount.words} 词</span>
                      <span><Clock size={14}/> 约 {readingTime} 分钟阅读</span>
                    </div>
                  )}
                </div>

                {showPreview && !zen && <div className="divider"></div>}

                {showPreview && !zen && (
                  <div className="preview-section" style={{ minHeight: '60vh' }}>
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
                        width: '100%',
                        maxWidth: lineWidth,
                        height: '60vh',
                        minHeight: '60vh'
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeHighlight]}
                        components={{
                          h1: ({node, children, ...props}) => (
                            <h1 id={`heading-${children?.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`} {...props}>
                              {children}
                            </h1>
                          ),
                          h2: ({node, children, ...props}) => (
                            <h2 id={`heading-${children?.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`} {...props}>
                              {children}
                            </h2>
                          ),
                          h3: ({node, children, ...props}) => (
                            <h3 id={`heading-${children?.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`} {...props}>
                              {children}
                            </h3>
                          ),
                          h4: ({node, children, ...props}) => (
                            <h4 id={`heading-${children?.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`} {...props}>
                              {children}
                            </h4>
                          ),
                          h5: ({node, children, ...props}) => (
                            <h5 id={`heading-${children?.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`} {...props}>
                              {children}
                            </h5>
                          ),
                          h6: ({node, children, ...props}) => (
                            <h6 id={`heading-${children?.toString().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-')}`} {...props}>
                              {children}
                            </h6>
                          ),
                        }}
                      >
                        {markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!zen && (
        <div className="footer">
          <div>快捷键：Ctrl/Cmd+S 保存、Ctrl/Cmd+B 加粗、Ctrl/Cmd+I 斜体、Ctrl/Cmd+K 链接、Ctrl/Cmd+E AI改写、/ 打开插入菜单</div>
          <div>本地自动保存 • 无打扰写作 • {documents.length} 个文档</div>
        </div>
      )}
    </div>
  );
}