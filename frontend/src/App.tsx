import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered, Link, Image, Table, Eye, EyeOff, Download, Upload, Maximize2, Minimize2, FileText, BookOpen, Save, Settings, Moon, Sun, Palette, Plus, X, Menu, Hash, Clock, FileType, RefreshCw, Wand2, Sparkles } from "lucide-react";

const sample = `# Welcome to InkPersona

这是一个功能强大的Markdown编辑器，支持实时预览和AI辅助写作。

## 主要功能

- **实时预览**：边写边看效果
- **AI辅助**：智能改写和优化
- **多文档管理**：轻松组织内容
- **拖拽上传**：支持图片上传
- **键盘快捷键**：高效编辑

## 开始使用

选择文本后按 Ctrl+E 调用AI助手，或使用工具栏进行格式化。

输入 "/" 可以快速插入内容块。
`;

type Tool = {
  key: string;
  icon: any;
  tip: string;
  wrap?: [string, string];
  insert?: string;
  prefix?: string;
  template?: string;
  action?: string;
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
  { key: "table", icon: Table, tip: "表格", action: "table-dialog" },
];

const SLASH_COMMANDS = [
  { key: "h1", label: "# 一级标题", snippet: "# 标题\n\n" },
  { key: "h2", label: "## 二级标题", snippet: "## 小节标题\n\n" },
  { key: "h3", label: "### 三级标题", snippet: "### 子标题\n\n" },
  { key: "h4", label: "#### 四级标题", snippet: "#### 子子标题\n\n" },
  { key: "todo", label: "✅ 任务列表", snippet: "- [ ] 待办事项 1\n- [x] 已完成事项\n- [ ] 待办事项 2\n\n" },
  { key: "note", label: "💡 提示块", snippet: "> **💡 提示**\n> \n> 这里是重要提示内容\n\n" },
  { key: "warn", label: "⚠️ 警告块", snippet: "> **⚠️ 警告**\n> \n> 请注意这里的内容！\n\n" },
  { key: "code", label: "💻 代码块", snippet: "\`\`\`javascript\n// 在这里输入代码\nconsole.log('Hello World!');\n\`\`\`\n\n" },
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



const AI_FUNCTIONS = [
  {
    key: "summarize",
    label: "📋 智能摘要",
    description: "生成文档摘要或提取关键点",
    icon: "📋",
    needsSelection: false
  },
  {
    key: "suggestions",
    label: "✨ 智能建议",
    description: "拼写、语法、语气、排版优化",
    icon: "✨",
    needsSelection: true
  },
  {
    key: "image-generate",
    label: "🖼️ 图文生成",
    description: "为选中段落生成配图",
    icon: "🖼️",
    needsSelection: true
  },
  {
    key: "translate",
    label: "🌐 智能翻译",
    description: "翻译选中文本",
    icon: "🌐",
    needsSelection: true
  }
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

// 工具函数
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

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  const wordsPerMinute = 200;
  const wordCount = text.length;
  return Math.ceil(wordCount / wordsPerMinute);
}

// 简化的Markdown渲染组件
function MarkdownPreview({ content, lineWidth }: { content: string; lineWidth: number }) {
  const [mermaidCharts, setMermaidCharts] = useState<Array<{ id: string; code: string }>>([]);

  // 处理Mermaid图表状态
  useEffect(() => {
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    const matches = Array.from(content.matchAll(mermaidRegex));
    const charts = matches.map((match, index) => ({
      id: `mermaid-${Date.now()}-${index}`,
      code: match[1].trim()
    }));
    setMermaidCharts(charts);
  }, [content]);

  const html = useMemo(() => {
    let processed = content;

    // 处理Mermaid图表
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let mermaidIndex = 0;
    processed = processed.replace(mermaidRegex, () => {
      const id = `mermaid-${Date.now()}-${mermaidIndex++}`;
      return `<div id="${id}" class="mermaid-placeholder" style="min-height: 200px; border: 2px dashed var(--border); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 16px 0; color: var(--text-muted);">
        <div style="text-align: center;">
          <div style="font-size: 14px; margin-bottom: 8px;">🔄 正在渲染图表...</div>
        </div>
      </div>`;
    });

    // 处理表格 - 使用简单的分割方法
    const lines = processed.split('\n');
    let result = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // 检测多行代码块
      if (line.trim().startsWith('```')) {
        const language = line.trim().substring(3).trim();
        const codeLines = [];
        let j = i + 1;

        // 收集代码块内容
        while (j < lines.length && !lines[j].trim().startsWith('```')) {
          codeLines.push(lines[j]);
          j++;
        }

        if (j < lines.length) {
          const code = codeLines.join('\n');
          const langClass = language ? `language-${language}` : '';
          const codeHTML = `<div style="margin: 16px 0; position: relative;"><pre style="background: var(--accent); border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin: 0; overflow-x: auto;"><code class="${langClass}" style="font-family: 'SFMono-Regular', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', monospace; font-size: 14px; line-height: 1.5; color: var(--fg); display: block; white-space: pre; text-align: left;">${escapeHtml(code)}</code></pre>${language ? `<div style="position: absolute; top: 8px; right: 8px; background: var(--border); color: var(--muted); padding: 2px 8px; border-radius: 4px; font-size: 12px;">${language}</div>` : ''}</div>`;
          result += codeHTML;
          i = j + 1;
          continue;
        }
      }

      // 检测表格开始
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines = [line];

        // 收集表格的所有行
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
          tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          // 跳过表头分隔行
          const dataStartIndex = tableLines[1].includes('---') ? 2 : 1;
          const dataLines = tableLines.slice(dataStartIndex);

          if (dataLines.length > 0) {
            // 解析表头
            const headerLine = tableLines[0];
            const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);

            // 构建表格HTML
            let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid var(--border);">';

            // 添加表头
            tableHTML += '<thead><tr style="background: var(--accent);">';
            headers.forEach((cell: string) => {
              tableHTML += `<th style="padding: 8px; text-align: left; border: 1px solid var(--border);">${cell}</th>`;
            });
            tableHTML += '</tr></thead>';

            // 添加表格内容
            tableHTML += '<tbody>';
            dataLines.forEach((line: string) => {
              if (!line.includes('---')) {
                const cells = line.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length > 0) {
                  tableHTML += '<tr>';
                  cells.forEach((cell: string) => {
                    tableHTML += `<td style="padding: 8px; border: 1px solid var(--border);">${cell}</td>`;
                  });
                  tableHTML += '</tr>';
                }
              }
            });
            tableHTML += '</tbody></table>';

            result += tableHTML;
            i = j;
            continue;
          }
        }
      }

      // 处理其他Markdown元素
      let processedLine = line;
      processedLine = processedLine
        .replace(/^#### (.*$)/, (match, text) => {
          const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
          return `<h4 id="${id}" style="margin: 14px 0 8px 0; font-size: 1.1em;">${text}</h4>`;
        })
        .replace(/^### (.*$)/, (match, text) => {
          const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
          return `<h3 id="${id}" style="margin: 16px 0 8px 0; font-size: 1.25em;">${text}</h3>`;
        })
        .replace(/^## (.*$)/, (match, text) => {
          const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
          return `<h2 id="${id}" style="margin: 20px 0 12px 0; font-size: 1.5em;">${text}</h2>`;
        })
        .replace(/^# (.*$)/, (match, text) => {
          const id = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
          return `<h1 id="${id}" style="margin: 24px 0 16px 0; font-size: 2em;">${text}</h1>`;
        })
        .replace(/\*\*(.*)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
        .replace(/\*(.*)\*/g, '<em style="font-style: italic;">$1</em>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />')
        .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: none;">$1</a>')
        .replace(/`([^`]*)`/g, '<code style="background: var(--accent); padding: 2px 6px; border-radius: 4px; font-family: \'SFMono-Regular\', \'Monaco\', \'Consolas\', \'Liberation Mono\', \'Courier New\', monospace; font-size: 0.9em; color: var(--fg);">$1</code>')
        .replace(/^> (.*$)/, '<blockquote style="border-left: 4px solid var(--primary); margin: 16px 0; padding: 0 20px; color: var(--muted); font-style: italic;">$1</blockquote>')
        .replace(/^- (.*$)/, '<li style="margin: 4px 0;">$1</li>')
        .replace(/^\d+\. (.*$)/, '<li style="margin: 4px 0;">$1</li>');

      if (processedLine === line) {
        // 普通文本
        if (line.trim()) {
          result += `<p style="margin: 12px 0;">${line}</p>`;
        } else {
          result += '<br />';
        }
      } else {
        result += processedLine;
      }

      i++;
    }

    return result;
  }, [content]);

  // 渲染Mermaid图表
  useEffect(() => {
    if (mermaidCharts.length === 0) return;

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#2563eb',
          lineColor: '#6b7280',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#ffffff',
          background: '#ffffff',
          mainBkg: '#ffffff',
          secondBkg: '#f9fafb',
          tertiaryBkg: '#ffffff',
          nodeBorder: '#d1d5db',
          clusterBkg: '#f9fafb',
          clusterBorder: '#d1d5db',
          defaultLinkColor: '#6b7280',
          titleColor: '#111827',
          edgeLabelBackground: '#ffffff',
          nodeTextColor: '#111827'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          useMaxWidth: true,
          diagramMarginX: 50,
          diagramMarginY: 10,
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35
        },
        gantt: {
          useMaxWidth: true,
          leftPadding: 75,
          gridLineStartPadding: 35,
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          numberSectionStyles: 4,
          axisFormat: '%Y-%m-%d'
        }
      });

      mermaidCharts.forEach(async ({ id, code }) => {
        const element = document.getElementById(id);
        if (element) {
          try {
            const { svg } = await mermaid.render(`mermaid-${id}`, code);
            element.innerHTML = svg;
            element.className = 'mermaid-chart';
          } catch (error) {
            console.error(`Mermaid rendering error for ${id}:`, error);
            element.innerHTML = `
              <div style="padding: 16px; border: 1px solid #ef4444; border-radius: 8px; background-color: #fef2f2; color: #991b1b; font-size: 14px;">
                <strong>图表渲染错误：</strong>
                <pre style="margin: 8px 0; white-space: pre-wrap; font-size: 12px;">${error}</pre>
              </div>
            `;
          }
        }
      });
    });
  }, [mermaidCharts]);

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        overflow: 'auto',
        width: '100%',
        maxWidth: lineWidth,
        height: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        lineHeight: 1.6,
        color: 'var(--fg)'
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function App(){
  // 核心状态
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
    } catch (e) {
      console.warn("Failed to load documents from localStorage:", e);
    }
    return [{
      id: generateId(),
      title: "欢迎使用 InkPersona",
      content: sample,
      created: new Date(),
      modified: new Date()
    }];
  });

  const [activeDocId, setActiveDocId] = useState(() => documents[0]?.id || '');
  const activeDoc = documents.find(doc => doc.id === activeDocId) || documents[0];

  // UI状态
  const [showPreview, setShowPreview] = useState(true);
  const [zen, setZen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("inkpersona:theme") || "light");
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("inkpersona:fontSize")) || 16);
  const [lineWidth, setLineWidth] = useState(() => Number(localStorage.getItem("inkpersona:lineWidth")) || 820);

  // 面板状态
  const [showTOC, setShowTOC] = useState(true);
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // Slash命令
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashPos, setSlashPos] = useState({x:0,y:0});
  const [slashFilter, setSlashFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 其他状态
  const [selectedText, setSelectedText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiFunction, setAiFunction] = useState<string>('rewrite');
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docSearch, setDocSearch] = useState('');
  const [docSort, setDocSort] = useState<'modified' | 'created' | 'title'>('modified');
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [openAIConfig, setOpenAIConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("inkpersona:openai") || '{}');
    } catch {
      return {
        model: 'qwen-plus',
        apiKey: 'sk-c0de72ea2e064e1ab15000d680531c48',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        temperature: 0.7,
        maxTokens: 2000
      };
    }
  });


  // 撤销/重做相关状态
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const maxUndoSteps = 50; // 最大撤销步数

  const textRef = useRef<HTMLTextAreaElement|null>(null);
  const slashRef = useRef<HTMLDivElement|null>(null);

  // 计算属性
  const toc = useMemo(() => extractTOC(activeDoc?.content || ''), [activeDoc?.content]);
  const readingTime = useMemo(() => calculateReadingTime(activeDoc?.content || ''), [activeDoc?.content]);
  const wordCount = useMemo(() => {
    const content = activeDoc?.content || '';
    return {
      chars: content.length,
      words: content.trim() ? content.trim().split(/\s+/).length : 0,
      lines: content.split('\n').length
    };
  }, [activeDoc?.content]);

  const filteredSlashCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(slashFilter.toLowerCase())
    );
  }, [slashFilter]);

  const filteredAndSortedDocs = useMemo(() => {
    let filtered = documents;

    if (docSearch.trim()) {
      const searchLower = docSearch.toLowerCase();
      filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.content.toLowerCase().includes(searchLower)
      );
    }

    return [...filtered].sort((a, b) => {
      switch (docSort) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        case 'modified':
        default:
          return new Date(b.modified).getTime() - new Date(a.modified).getTime();
      }
    });
  }, [documents, docSearch, docSort]);

  // 通知系统
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // 文档操作
  const updateDocument = useCallback((id: string, updates: Partial<Document>) => {
    setDocuments(docs => docs.map(doc =>
      doc.id === id ? { ...doc, ...updates, modified: new Date() } : doc
    ));
  }, []);

  const saveToUndoStack = useCallback((content: string) => {
    setUndoStack(prev => {
      const newStack = [...prev, content];
      // 限制撤销步数
      if (newStack.length > maxUndoSteps) {
        return newStack.slice(newStack.length - maxUndoSteps);
      }
      return newStack;
    });
    // 每次保存新状态时清空重做栈
    setRedoStack([]);
  }, [maxUndoSteps]);

  const updateActiveDocument = useCallback((content: string) => {
    if (activeDoc) {
      // 保存当前内容到撤销栈
      saveToUndoStack(activeDoc.content);
      updateDocument(activeDoc.id, { content });
    }
  }, [activeDoc, updateDocument, saveToUndoStack]);

  const createNewDocument = useCallback(() => {
    const newDoc: Document = {
      id: generateId(),
      title: "新文档",
      content: "# 新文档\n\n开始你的写作...\n",
      created: new Date(),
      modified: new Date()
    };
    setDocuments(docs => [...docs, newDoc]);
    setActiveDocId(newDoc.id);
    showNotification('success', '新文档已创建');
  }, [showNotification]);

  const deleteDocument = useCallback((id: string) => {
    if (documents.length <= 1) return;

    const docToDelete = documents.find(doc => doc.id === id);
    setDocuments(docs => docs.filter(doc => doc.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter(doc => doc.id !== id);
      setActiveDocId(remaining[0]?.id || '');
    }
    showNotification('success', `文档"${docToDelete?.title || '未命名'}"已删除`);
  }, [documents, activeDocId, showNotification]);

  const duplicateDocument = useCallback((id: string) => {
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
    showNotification('success', `文档"${docToDupe.title}"已复制`);
  }, [documents, showNotification]);

  // 撤销/重做操作
  const undo = useCallback(() => {
    if (undoStack.length === 0 || !activeDoc) return;

    const lastContent = undoStack[undoStack.length - 1];
    const currentContent = activeDoc.content;

    // 将当前内容添加到重做栈
    setRedoStack(prev => [currentContent, ...prev]);

    // 恢复上一个状态
    updateDocument(activeDoc.id, { content: lastContent });
    setUndoStack(prev => prev.slice(0, -1));

    showNotification('info', '已撤销');
  }, [undoStack, activeDoc, updateDocument, showNotification]);

  const redo = useCallback(() => {
    if (redoStack.length === 0 || !activeDoc) return;

    const nextContent = redoStack[0];
    const currentContent = activeDoc.content;

    // 将当前内容添加到撤销栈
    saveToUndoStack(currentContent);

    // 恢复下一个状态
    updateDocument(activeDoc.id, { content: nextContent });
    setRedoStack(prev => prev.slice(1));

    showNotification('info', '已重做');
  }, [redoStack, activeDoc, updateDocument, saveToUndoStack, showNotification]);

  // 工具栏操作
  const applyToolbar = useCallback((tool: Tool) => {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    if (tool.action === 'table-dialog') {
      setShowTableDialog(true);
      return;
    }

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
  }, [activeDoc, updateActiveDocument]);

  // 插入代码片段
  const insertSnippet = useCallback((snippet: string) => {
    const ta = textRef.current;
 if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;

    const textBefore = activeDoc.content.slice(0, start);
    const lastSlashIndex = textBefore.lastIndexOf('/');
    const actualStart = lastSlashIndex >= 0 ? lastSlashIndex : start;

    // 保存当前状态到撤销栈
    saveToUndoStack(activeDoc.content);

    const next = activeDoc.content.slice(0, actualStart) + snippet + activeDoc.content.slice(end);
    updateActiveDocument(next);
    setSlashOpen(false);
    setSelectedIndex(0); // 重置选中索引

    setTimeout(() => {
      ta.focus();
      const caret = actualStart + snippet.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }, [activeDoc, updateActiveDocument, saveToUndoStack]);

  // 生成表格
  const generateTable = useCallback((rows: number, cols: number): string => {
    const headers = Array(cols).fill(null).map((_, i) => `列${i + 1}`).join(' | ');
    const separator = Array(cols).fill('---').join(' | ');
    const tableRows = Array(rows - 1).fill(null).map((_, i) => {
      return Array(cols).fill(null).map((_, j) => `值${i + 1}-${j + 1}`).join(' | ');
    });
    return `| ${headers} |\n|${separator}|\n` + tableRows.map(row => `| ${row} |`).join('\n') + '\n\n';
  }, []);

  const insertTable = useCallback(() => {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const tableContent = generateTable(tableRows, tableCols);

    // 保存当前状态到撤销栈
    saveToUndoStack(activeDoc.content);

    const next = activeDoc.content.slice(0, start) + tableContent + activeDoc.content.slice(start);
    updateActiveDocument(next);
    setShowTableDialog(false);

    setTimeout(() => {
      ta.focus();
      const caret = start + tableContent.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }, [activeDoc, updateActiveDocument, generateTable, tableRows, tableCols, saveToUndoStack]);

  // AI功能
  const handleAIFunction = useCallback(async (functionKey: string, style?: string) => {
    setAiLoading(true);
    setAiResult('');

    // 检查配置是否完整
    if (!openAIConfig.apiKey || !openAIConfig.model || !openAIConfig.baseUrl) {
      setAiResult('请先完成AI模型配置：\n• 输入模型名称\n• 配置Base URL\n• 设置API Key');
      setAiLoading(false);
      return;
    }

    try {
      const content = functionKey === 'summarize' ? (activeDoc?.content || '') : selectedText;

      if (!content.trim()) {
        setAiResult('请先选择需要处理的文本');
        setAiLoading(false);
        return;
      }

      let systemPrompt = '';
      let userPrompt = '';

      switch (functionKey) {
        case 'summarize':
          systemPrompt = `你是一个专业的Markdown文档分析师，擅长提取关键信息和生成结构化摘要。请严格遵循以下Markdown格式要求：

## 输出格式要求
\`\`\`markdown
## 📋 文档摘要

### 🎯 核心主题
[一句话概括文档主题]

### 🔑 关键观点
- **主要观点1**：具体描述
- **主要观点2**：具体描述
- **主要观点3**：具体描述

### 📊 重要数据
- **关键数据**：具体数值/结论
- **核心发现**：重要洞察

### 🚀 实用价值
- **应用场景**：具体用途
- **预期效果**：实际价值
\`\`\`

## 内容要求
- 使用emoji图标增强可读性
- 保持二级标题结构
- 使用加粗强调关键词
- 控制总字数200-300字
- 避免重复原文内容
- 用要点列表展示信息

请直接返回完整的Markdown格式摘要，不要添加解释。`;
          userPrompt = `请为以下Markdown文档生成专业结构化摘要：\n\n${content}`;
          break;

        case 'suggestions':
          systemPrompt = `你是资深技术写作专家，专门优化Markdown文档。请按以下Markdown格式提供专业建议：

## 输出格式要求
\`\`\`markdown
## ✨ 文档优化建议

### 📊 评分概览
| 维度 | 评分 | 说明 |
|------|------|------|
| 内容完整性 | ★★★★☆ | 具体评价 |
| 逻辑结构 | ★★★☆☆ | 具体评价 |
| 表达清晰度 | ★★★★★ | 具体评价 |
| 格式规范 | ★★★☆☆ | 具体评价 |

### 🎯 具体改进建议

#### 1. 内容优化
**问题**：指出的具体问题
**建议**：具体改进方案
**示例**：
- 原文：\`原文示例\`
- 改进：\`改进示例\`

#### 2. 结构调整
**问题**：结构方面的不足
**建议**：如何重新组织
**示例**：
\`\`\`markdown
## 建议的新结构
- 第一部分：xxx
- 第二部分：xxx
\`\`\`

#### 3. 表达精炼
**问题**：语言冗余或不清
**建议**：精炼表达方式
**示例**：
- 原文：\`冗长表达\`
- 精炼：\`简洁表达\`

### 🛠️ 格式修正
- **标题层级**：建议调整
- **列表格式**：统一规范
- **代码块**：优化展示
\`\`\`

请提供3-4条具体建议，每条都有问题、建议、示例的完整结构。`;
          userPrompt = `请深度分析以下Markdown文档并提供具体改进建议：\n\n${content}`;
          break;

        case 'image-generate':
          systemPrompt = `你是专业的技术文档配图设计师，擅长为Markdown内容设计信息图表。请按以下Markdown格式提供配图方案：

## 输出格式要求
\`\`\`markdown
## 🖼️ 配图设计方案

### 📊 图表需求分析
| 内容类型 | 推荐图表 | 设计目的 |
|----------|----------|----------|
| 流程说明 | 流程图 | 展示步骤关系 |
| 概念解释 | 架构图 | 可视化复杂概念 |
| 数据对比 | 柱状图 | 直观展示差异 |
| 层次结构 | 树形图 | 显示层级关系 |

### 🎯 具体配图方案

#### 方案1：流程图
**适用场景**：步骤操作流程
**Mermaid代码**：
\`\`\`mermaid
graph TD
    A[开始] --> B[步骤1]
    B --> C[步骤2]
    C --> D[完成]
\`\`\`
**设计要点**：蓝色主题，简洁线条

#### 方案2：架构图
**适用场景**：系统架构说明
**Mermaid代码**：
\`\`\`mermaid
graph LR
    A[前端] --> B[API]
    B --> C[数据库]
    C --> D[缓存]
\`\`\`
**设计要点**：层次清晰，颜色区分

#### 方案3：对比表格
**适用场景**：功能对比分析
**Markdown表格**：
| 功能 | 方案A | 方案B |
|------|-------|-------|
| 性能 | 高 | 中 |
| 成本 | 低 | 高 |

### 🎨 设计规范
- **配色方案**：主色#007acc，辅助色#e1e7f0
- **字体规范**：无衬线，14-16px
- **布局原则**：简洁清晰，重点突出
\`\`\`

请基于内容提供3-4个具体配图方案，包含Mermaid代码和Markdown表格。`;
          userPrompt = `请为以下Markdown内容设计专业的配图方案：\n\n${content}`;
          break;

        case 'translate':
          systemPrompt = `你是专业的技术文档翻译专家，精通中英文技术写作。请按以下要求翻译：

## 输出格式要求
- 保持原文的Markdown格式结构
- 技术术语使用标准译法
- 代码块和命令保持原文
- 表格和列表格式不变
- 使用专业英文技术表达

## 翻译原则
1. **准确性**：技术概念必须准确
2. **地道性**：符合英文技术文档习惯
3. **简洁性**：避免冗余表达
4. **一致性**：术语统一翻译

请直接返回翻译后的英文Markdown内容。`;
          userPrompt = `请将以下中文技术文档翻译成专业英文，保持Markdown格式：\n\n${content}`;
          break;

        default:
          const styleInfo = AI_STYLES.find(s => s.key === style);
          const stylePrompts = {
            academic: `你是学术写作专家。请将文本改写为学术风格，要求：
- 使用正式学术语言和客观语调
- 增加理论深度和引用框架
- 结构严谨，逻辑清晰
- 使用专业术语和概念
- 保持客观中立的学术表达

请直接返回改写后的Markdown格式文本。`,
            creative: `你是创意写作专家。请将文本改写为创意风格，要求：
- 使用生动形象的比喻和修辞手法
- 增加故事性和情感色彩
- 语言优美，富有感染力
- 运用多样化的句式结构
- 营造画面感和代入体验

请直接返回改写后的Markdown格式文本。`,
            concise: `你是极简写作专家。请将文本改写为简洁风格，要求：
- 删除一切冗余词汇和句子
- 用最少的文字表达最丰富的内容
- 每个词都必须有其价值
- 保持信息的完整性和准确性
- 追求言简意赅的极致效果

请直接返回改写后的Markdown格式文本。`,
            business: `你是商务写作专家。请将文本改写为商务风格，要求：
- 使用专业简洁的商务语言
- 结构清晰，重点突出
- 注重效率和结果导向
- 使用数据和事实支撑观点
- 保持礼貌而坚定的商务语调

请直接返回改写后的Markdown格式文本。`,
            friendly: `你是亲和力写作专家。请将文本改写为友好风格，要求：
- 使用温暖亲切的日常语言
- 增加互动性和对话感
- 避免生僻词汇和复杂句式
- 营造轻松友好的交流氛围
- 让读者感到被理解和尊重

请直接返回改写后的Markdown格式文本。`,
            technical: `你是技术文档写作专家。请将文本改写为技术风格，要求：
- 使用准确的技术术语
- 结构清晰，步骤明确
- 提供具体的操作指导
- 包含必要的背景说明
- 保持逻辑严谨和可验证性

请直接返回改写后的Markdown格式文本。`
          };

          systemPrompt = stylePrompts[style as keyof typeof stylePrompts] ||
            `你是专业写作助手，擅长${styleInfo?.description || '指定风格'}。请改写文本体现该风格特点，返回Markdown格式内容。`;

          userPrompt = `请将以下文本改写为${styleInfo?.label || '指定风格'}，保持原意但体现该风格特点：\n\n${content}`;
          break;
      }

      // 调用真实API
      const response = await fetch(`${openAIConfig.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: openAIConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: openAIConfig.temperature || 0.7,
          max_tokens: openAIConfig.maxTokens || 1000,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API调用失败: ${response.status} ${response.statusText}${errorData.error ? ` - ${errorData.error.message}` : ''}`);
      }

      const data = await response.json();
      let result = data.choices?.[0]?.message?.content || 'API返回格式异常';

      // 确保返回的是Markdown格式内容
      result = result.trim();

      // 根据功能类型添加适当的标题和格式
      const formattedResults = {
        summarize: () => {
          if (!result.startsWith('##')) {
            return `## 📋 文档摘要\n\n${result}`;
          }
          return result;
        },
        suggestions: () => {
          if (!result.startsWith('##')) {
            return `## ✨ 文档优化建议\n\n${result}`;
          }
          return result;
        },
        'image-generate': () => {
          if (!result.startsWith('##')) {
            return `## 🖼️ 配图设计方案\n\n${result}`;
          }
          return result;
        },
        translate: () => result, // 翻译保持原文格式
        default: () => result
      };

      const formattedResult = (formattedResults[aiFunction as keyof typeof formattedResults] || formattedResults.default)();
      setAiResult(formattedResult);
      showNotification('success', 'AI处理完成');
    } catch (error) {
      console.error('AI处理失败:', error);
      setAiResult(`AI处理失败：${error.message}`);
      showNotification('error', 'AI处理失败');
    } finally {
      setAiLoading(false);
    }
  }, [activeDoc, selectedText, showNotification, openAIConfig, aiFunction]);

  const applyAIResult = useCallback(() => {
    if (!aiResult.trim()) return;

    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;

    let newContent = '';
    let cursorPosition = 0;

    if (aiFunction === 'summarize') {
      // 摘要功能：添加到文档开头
      const summaryText = `${aiResult}\n\n---\n\n`;
      newContent = summaryText + activeDoc.content;
      cursorPosition = summaryText.length;
    } else {
      // 其他功能：替换选中文本或在光标位置插入
      const insertText = `${aiResult}\n\n`;
      newContent = activeDoc.content.slice(0, start) + insertText + activeDoc.content.slice(end);
      cursorPosition = start + insertText.length;
    }

    updateActiveDocument(newContent);

    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);

    const successMessages = {
      summarize: '文档摘要已添加',
      suggestions: '优化建议已应用',
      'image-generate': '配图方案已添加',
      translate: '翻译结果已应用',
      default: 'AI处理结果已应用'
    };

    showNotification('success', (successMessages[aiFunction as keyof typeof successMessages] || successMessages.default));

    setShowAIPanel(false);
    setAiResult('');
  }, [aiResult, aiFunction, activeDoc, updateActiveDocument, showNotification]);

  // 文件操作
  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
      showNotification('success', '文档导入成功');
    };
    reader.readAsText(file);
  }, [showNotification]);

  // 图片拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0) return;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const imageMarkdown = `![${file.name}](${base64})\n\n`;

        const ta = textRef.current;
        if (!ta || !activeDoc) return;

        const start = ta.selectionStart || 0;
        const next = activeDoc.content.slice(0, start) + imageMarkdown + activeDoc.content.slice(start);
        updateActiveDocument(next);

        setTimeout(() => {
          ta.focus();
          const caret = start + imageMarkdown.length;
          ta.setSelectionRange(caret, caret);
        }, 0);
      };
      reader.readAsDataURL(file);
    });

    showNotification('success', `已上传 ${imageFiles.length} 张图片`);
  }, [activeDoc, updateActiveDocument, showNotification]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const downloadMD = useCallback(() => {
    if (!activeDoc) return;
    downloadFile(`${activeDoc.title || '未命名文档'}.md`, activeDoc.content);
    showNotification('success', 'Markdown文件已下载');
  }, [activeDoc, showNotification]);

  const downloadHTML = useCallback(() => {
    if (!activeDoc) return;

    const htmlContent = activeDoc.content
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br />');

    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeDoc.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
        h1, h2, h3 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; }
        p { margin-bottom: 16px; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    downloadFile(`${activeDoc.title || '未命名文档'}.html`, fullHTML, 'text/html;charset=utf-8');
    showNotification('success', 'HTML文件已下载');
  }, [activeDoc, showNotification]);

  const downloadWord = useCallback(() => {
    if (!activeDoc) return;

    // 创建完整的HTML文档用于Word导出
    const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;

    // 处理Markdown内容转换为HTML
    let processedContent = activeDoc.content;

    // 处理标题
    processedContent = processedContent
      .replace(/^#### (.*$)/gim, '<h4 style="margin: 14px 0 8px 0; font-size: 1.1em; font-weight: 600;">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 style="margin: 16px 0 8px 0; font-size: 1.25em; font-weight: 600;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="margin: 20px 0 12px 0; font-size: 1.5em; font-weight: 600;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="margin: 24px 0 16px 0; font-size: 2em; font-weight: 700;">$1</h1>');

    // 处理文本格式
    processedContent = processedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 14px; margin: 16px 0;"><code>$1</code></pre>');

    // 处理引用
    processedContent = processedContent
      .replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #3b82f6; margin: 16px 0; padding: 0 20px; color: #6b7280; font-style: italic;">$1</blockquote>');

    // 处理列表
    processedContent = processedContent
      .replace(/^- (.*$)/gm, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>');

    // 处理段落
    processedContent = processedContent
      .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
      .replace(/^(.+)$/gm, '<p style="margin: 12px 0; line-height: 1.6;">$1</p>');

    // 处理图片
    processedContent = processedContent
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />');

    // 处理链接
    processedContent = processedContent
      .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3b82f6; text-decoration: none;">$1</a>');

    // 处理表格
    processedContent = processedContent
      .replace(/\|(.+?)\|/g, (match) => {
        const cells = match.slice(1, -1).split('|').map(c => c.trim());
        let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #d1d5db;"><tr>';
        cells.forEach(cell => {
          if (cell && !cell.includes('---')) {
            tableHTML += `<td style="border: 1px solid #d1d5db; padding: 8px;">${cell}</td>`;
          }
        });
        tableHTML += '</tr></table>';
        return tableHTML;
      });

    // 创建Word文档的HTML格式
    const wordHTML = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeDoc.title || '未命名文档'}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: #374151;
            background: #ffffff;
            margin: 0;
            padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: #111827;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; }
        h2 { font-size: 1.5em; color: #3b82f6; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1.1em; }
        p { margin-bottom: 16px; line-height: 1.7; }
        pre {
            background: #f9fafb;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            margin: 16px 0;
            border-left: 4px solid #3b82f6;
            page-break-inside: avoid;
        }
        code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }
        blockquote {
            border-left: 4px solid #3b82f6;
            margin: 16px 0;
            padding: 0 20px;
            color: #6b7280;
            font-style: italic;
            page-break-inside: avoid;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            border: 1px solid #d1d5db;
            page-break-inside: avoid;
        }
        th, td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
        }
        th {
            background: #f9fafb;
            font-weight: 600;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 16px 0;
            page-break-inside: avoid;
        }
        a {
            color: #3b82f6;
            text-decoration: none;
        }
        ul, ol {
            margin: 16px 0;
            padding-left: 40px;
        }
        li {
            margin: 8px 0;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #d1d5db;
            padding-bottom: 20px;
        }
        .title {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 8px;
            color: #111827;
        }
        .subtitle {
            font-size: 1.2em;
            color: #6b7280;
            margin-bottom: 16px;
        }
        .meta {
            font-size: 0.9em;
            color: #6b7280;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pdf-container { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="word-container">
        <div class="header">
            <div class="title">${activeDoc.title || '未命名文档'}</div>
            <div class="subtitle">InkPersona 文档导出</div>
            <div class="meta">导出时间：${new Date().toLocaleString('zh-CN')}</div>
        </div>
        ${processedContent}
    </div>
</body>
</html>`;

    // 创建Blob对象
    const blob = new Blob([wordHTML], {
      type: 'application/msword;charset=utf-8'
    });

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeDoc.title || '未命名文档'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('success', 'Word文档已下载');
  }, [activeDoc, theme, showNotification]);

  const downloadPDF = useCallback(() => {
    if (!activeDoc) return;

    // 创建完整的HTML文档用于PDF生成
    const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;

    // 处理Markdown内容转换为HTML
    let processedContent = activeDoc.content;

    // 处理标题
    processedContent = processedContent
      .replace(/^#### (.*$)/gim, '<h4 style="margin: 14px 0 8px 0; font-size: 1.1em; font-weight: 600;">$1</h4>')
      .replace(/^### (.*$)/gim, '<h3 style="margin: 16px 0 8px 0; font-size: 1.25em; font-weight: 600;">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="margin: 20px 0 12px 0; font-size: 1.5em; font-weight: 600;">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="margin: 24px 0 16px 0; font-size: 2em; font-weight: 700;">$1</h1>');

    // 处理文本格式
    processedContent = processedContent
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em;">$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 14px; margin: 16px 0;"><code>$1</code></pre>');

    // 处理引用
    processedContent = processedContent
      .replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #6366f1; margin: 16px 0; padding: 0 20px; color: #6b7280; font-style: italic;">$1</blockquote>');

    // 处理列表
    processedContent = processedContent
      .replace(/^- (.*$)/gm, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li style="margin: 4px 0; margin-left: 20px;">$1</li>');

    // 处理段落
    processedContent = processedContent
      .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
      .replace(/^(.+)$/gm, '<p style="margin: 12px 0; line-height: 1.6;">$1</p>');

    // 处理图片
    processedContent = processedContent
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0;" />');

    // 处理链接
    processedContent = processedContent
      .replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" style="color: #6366f1; text-decoration: none;">$1</a>');

    // 处理表格
    processedContent = processedContent
      .replace(/\|(.+?)\|/g, (match) => {
        const cells = match.slice(1, -1).split('|').map(c => c.trim());
        let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #e5e7eb;"><tr>';
        cells.forEach(cell => {
          if (cell && !cell.includes('---')) {
            tableHTML += `<td style="border: 1px solid #e5e7eb; padding: 8px;">${cell}</td>`;
          }
        });
        tableHTML += '</tr></table>';
        return tableHTML;
      });

    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${activeDoc.title || '未命名文档'}</title>
    <style>
        @page {
            margin: 2cm;
            size: A4;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            color: ${currentTheme.fg};
            background: ${currentTheme.bg};
            max-width: none;
            margin: 0;
            padding: 0;
        }
        .pdf-container {
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: ${currentTheme.fg};
        }
        h1 { font-size: 2em; border-bottom: 2px solid ${currentTheme.primary}; padding-bottom: 8px; }
        h2 { font-size: 1.5em; color: ${currentTheme.primary}; }
        h3 { font-size: 1.25em; }
        h4 { font-size: 1.1em; }
        p { margin-bottom: 16px; line-height: 1.7; }
        pre {
            background: ${currentTheme.accent};
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            margin: 16px 0;
            border-left: 4px solid ${currentTheme.primary};
        }
        code {
            background: ${currentTheme.accent};
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 0.9em;
        }
        blockquote {
            border-left: 4px solid ${currentTheme.primary};
            margin: 16px 0;
            padding: 0 20px;
            color: ${currentTheme.muted};
            font-style: italic;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            border: 1px solid ${currentTheme.border};
        }
        th, td {
            border: 1px solid ${currentTheme.border};
            padding: 12px;
            text-align: left;
        }
        th {
            background: ${currentTheme.accent};
            font-weight: 600;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 16px 0;
        }
        a {
            color: ${currentTheme.primary};
            text-decoration: none;
        }
        ul, ol {
            margin: 16px 0;
            padding-left: 40px;
        }
        li {
            margin: 8px 0;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid ${currentTheme.border};
            padding-bottom: 20px;
        }
        .title {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 8px;
            color: ${currentTheme.fg};
        }
        .subtitle {
            font-size: 1.2em;
            color: ${currentTheme.muted};
            margin-bottom: 16px;
        }
        .meta {
            font-size: 0.9em;
            color: ${currentTheme.muted};
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .pdf-container { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="pdf-container">
        <div class="header">
            <div class="title">${activeDoc.title || '未命名文档'}</div>
            <div class="subtitle">InkPersona 文档导出</div>
            <div class="meta">导出时间：${new Date().toLocaleString('zh-CN')}</div>
        </div>
        ${processedContent}
    </div>
</body>
</html>`;

    // 创建隐藏的iframe用于打印
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // 写入HTML内容
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(fullHTML);
      iframeDoc.close();

      // 等待内容加载完成
      setTimeout(() => {
        try {
          // 使用浏览器打印API
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();

          showNotification('success', 'PDF导出已启动，请在打印对话框中选择"另存为PDF"');
        } catch (error) {
          console.error('PDF导出失败:', error);
          showNotification('error', 'PDF导出失败，请重试');
        } finally {
          // 清理iframe
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }
      }, 500);
    }
  }, [activeDoc, theme, showNotification]);

  // 主题应用
  useEffect(() => {
    const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;
    const root = document.documentElement;

    Object.entries(currentTheme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  // 本地存储同步 - 防抖优化
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("inkpersona:documents", JSON.stringify(documents));
    localStorage.setItem("inkpersona:theme", theme);
    localStorage.setItem("inkpersona:fontSize", String(fontSize));
    localStorage.setItem("inkpersona:lineWidth", String(lineWidth));
    localStorage.setItem("inkpersona:openai", JSON.stringify(openAIConfig));
      } catch (e) {
        console.warn("无法保存到本地存储", e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [documents, theme, fontSize, lineWidth, openAIConfig]);



  // 键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        downloadMD();
      }

      if (isCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        downloadPDF();
      }

      if (isCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }

      if (isCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
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

      if (isCtrl && e.key === 'e') {
        e.preventDefault();
        const ta = textRef.current;
        if (ta) {
          const start = ta.selectionStart || 0;
          const end = ta.selectionEnd || 0;
          const selected = ta.value.slice(start, end);
          setSelectedText(selected);
          setAiFunction(selected.trim() ? 'rewrite' : 'summarize');
          setShowAIPanel(true);
        }
      }

      if (slashOpen) {
        // 处理提示框内的键盘导航
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredSlashCommands.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredSlashCommands.length - 1
          );
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredSlashCommands[selectedIndex]) {
            insertSnippet(filteredSlashCommands[selectedIndex].snippet);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSlashOpen(false);
          setSelectedIndex(0);
        } else if (e.key !== '/' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
          // 处理过滤输入
          const ta = textRef.current;
          if (ta) {
            const cursorPos = ta.selectionStart || 0;
            const textBeforeCursor = ta.value.slice(0, cursorPos);
            const match = textBeforeCursor.match(/\/([^\s]*)$/);
            if (match) {
              setSlashFilter(match[1]);
            } else {
              setSlashOpen(false);
              setSelectedIndex(0);
            }
          }
        }
      } else if (e.key === '/') {
        const ta = textRef.current;
        if (ta && ta === document.activeElement) {
          e.preventDefault();

          // 获取光标位置
          const cursorPos = ta.selectionStart || 0;
          const textBeforeCursor = ta.value.slice(0, cursorPos);

          // 检查是否是在行首或前面是空格
          const isValidPosition = cursorPos === 0 ||
            textBeforeCursor.slice(-1) === '\n' ||
            textBeforeCursor.slice(-1) === ' ';

          if (isValidPosition) {
            setTimeout(() => {
              setSlashOpen(true);

              // 获取光标在页面中的位置
              const ta = textRef.current;
              if (ta) {
                const taRect = ta.getBoundingClientRect();
                const text = ta.value.slice(0, cursorPos);
                const lines = text.split('\n');
                const currentLineIndex = lines.length - 1;
                const currentLine = lines[currentLineIndex];

                // 计算相对位置（简化计算，实际项目中可能需要更精确的测量）
                const lineHeight = 24; // 估计的行高
                const charWidth = 8; // 估计的字符宽度
                const left = taRect.left + 20 + (currentLine.length * charWidth);
                const top = taRect.top + (currentLineIndex * lineHeight) + lineHeight;

                setSlashPos({
                  x: Math.min(left, window.innerWidth - 220),
                  y: Math.min(top, window.innerHeight - 200)
                });
                setSlashFilter("");
                setSelectedIndex(0);
              }
            }, 0);
          }
        }
      }

      if (e.key === 'Escape' && !slashOpen) {
        if (zen) {
          setZen(false);
        } else {
          setShowSettings(false);
          setShowAIPanel(false);
          setShowTableDialog(false);
          setShowDocumentList(false);
          setShowHelpPanel(false);
        }
      }

      if (isCtrl && e.key === 'n') {
        e.preventDefault();
        createNewDocument();
      }

      if (isCtrl && e.key === 'd') {
        e.preventDefault();
        setShowDocumentList(!showDocumentList);
      }

      if (isCtrl && e.key === ',') {
        e.preventDefault();
        setShowSettings(!showSettings);
      }

      if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setShowHelpPanel(!showHelpPanel);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashOpen, zen, showDocumentList, showSettings, showHelpPanel, downloadMD, downloadPDF, applyToolbar, createNewDocument, filteredSlashCommands, selectedIndex, insertSnippet, undo, redo]);

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

  const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;

  return (
    <div
      className={zen ? 'zen-mode' : ''}
      style={{
        minHeight: '100vh',
        background: currentTheme.bg,
        color: currentTheme.fg,
        transition: 'all 0.3s ease',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      }}
    >
      {/* 通知系统 */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: zen ? 20 : 80,
            right: 20,
            zIndex: 2000,
            background: currentTheme.cardBg,
            border: `1px solid ${currentTheme.border}`,
            borderLeft: `4px solid ${
              notification.type === 'success' ? '#10b981' :
              notification.type === 'error' ? '#ef4444' : 
              '#6366f1'
            }`,
            borderRadius: 8,
            padding: 12,
            boxShadow: `0 4px 12px ${currentTheme.shadow}`,
            maxWidth: 300,
            animation: 'slideIn 0.3s ease-out'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: currentTheme.fg
          }}>
            <span style={{
              color: notification.type === 'success' ? '#10b981' :
                     notification.type === 'error' ? '#ef4444' :
                     '#6366f1'
            }}>
              {notification.type === 'success' ? '✓' :
               notification.type === 'error' ? '✕' : 'i'}
            </span>
            {notification.message}
          </div>
        </div>
      )}

      {/* 禅模式退出按钮 */}
      {zen && (
        <button
          onClick={() => setZen(false)}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: currentTheme.fg,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          title="退出禅模式 (Esc)"
        >
          <X size={20} />
        </button>
      )}

      {/* 顶部导航栏 */}
      {!zen && (
        <div style={{
          background: currentTheme.cardBg,
          borderBottom: `1px solid ${currentTheme.border}`,
          padding: '12px 0',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '0 20px'
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
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: showDocumentList ? currentTheme.primary : currentTheme.cardBg,
                  color: showDocumentList ? 'white' : currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setShowDocumentList(!showDocumentList)}
              >
                <Menu size={16} />
                文档 ({documents.length})
              </button>

              <input
                style={{
                  minWidth: 200,
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  fontSize: 14
                }}
                value={activeDoc?.title || ''}
                onChange={e => activeDoc && updateDocument(activeDoc.id, { title: e.target.value })}
                placeholder="文档标题..."
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={createNewDocument}
              >
                <Plus size={16} />
                新建
              </button>

              <label style={{
                padding: '8px 12px',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: 8,
                background: currentTheme.cardBg,
                color: currentTheme.fg,
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Upload size={16} />
                导入
                <input
                  type="file"
                  accept=".md,.markdown,.txt"
                  style={{ display: 'none' }}
                  onChange={onUpload}
                />
              </label>

              <button
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: '500'
                }}
                onClick={() => {
                  const ta = textRef.current;
                  if (ta) {
                    const start = ta.selectionStart || 0;
                    const end = ta.selectionEnd || 0;
                    const selected = ta.value.slice(start, end);
                    setSelectedText(selected);
                    setAiFunction(selected.trim() ? 'rewrite' : 'summarize');
                    setShowAIPanel(true);
                  }
                }}
                title="AI 改写选中文本 (Ctrl+E)"
              >
                <Sparkles size={16} />
                AI 改写
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: showSettings ? currentTheme.primary : currentTheme.cardBg,
                  color: showSettings ? 'white' : currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings size={16} />
                设置
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: zen ? currentTheme.primary : currentTheme.cardBg,
                  color: zen ? 'white' : currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={() => setZen(!zen)}
              >
                {zen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                禅模式
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: showPreview ? currentTheme.primary : currentTheme.cardBg,
                  color: showPreview ? 'white' : currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
                预览
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={downloadMD}
              >
                <Download size={16} />
                .md
              </button>

              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={downloadHTML}
              >
                <Download size={16} />
                .html
              </button>
              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={downloadWord}
              >
                <FileText size={16} />
                .docx
              </button>
              <button
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
                onClick={downloadPDF}
              >
                <FileText size={16} />
                .pdf
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: zen ? 0 : '20px',
        minHeight: zen ? '100vh' : 'calc(100vh - 120px)'
      }}>
        <div style={{
          display: 'flex',
          gap: zen ? 0 : 16,
          height: '100%',
          minHeight: zen ? '100vh' : 'calc(100vh - 120px)'
        }}>
          {/* 侧边目录 */}
          {showTOC && toc.length > 0 && !zen && (
            <div style={{
              width: 280,
              flexShrink: 0,
              background: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 12,
              height: 'fit-content',
              maxHeight: '80vh',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${currentTheme.border}`,
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Hash size={16} />
                目录导航
              </div>
              <div style={{ padding: '8px 0', maxHeight: '60vh', overflowY: 'auto' }}>
                {toc.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      paddingLeft: 16 + (item.level - 1) * 16,
                      paddingRight: 16,
                      paddingTop: 6,
                      paddingBottom: 6,
                      cursor: 'pointer',
                      fontSize: Math.max(12, 14 - (item.level - 1)),
                      color: item.level === 1 ? currentTheme.fg : currentTheme.muted,
                      borderLeft: item.level === 1 ? `3px solid ${currentTheme.primary}` : 'none',
                      transition: 'all 0.2s ease',
                      borderRadius: 4,
                      margin: '2px 0'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = currentTheme.accent;
                      e.currentTarget.style.color = currentTheme.primary;
                      e.currentTarget.style.paddingLeft = (16 + (item.level - 1) * 16 + 8) + 'px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = item.level === 1 ? currentTheme.fg : currentTheme.muted;
                      e.currentTarget.style.paddingLeft = (16 + (item.level - 1) * 16) + 'px';
                    }}
                    onClick={() => {
                      // 跳转到对应的标题
                      const element = document.getElementById(item.id);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    title={`跳转到：${item.text}`}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 主编辑区域 */}
          <div style={{
            flex: 1,
            minWidth: 0,
            height: '100%'
          }}>
            <div
              className={dragOver ? 'drag-zone drag-over' : ''}
              style={{
                padding: 20,
                border: zen ? 'none' : `1px solid ${currentTheme.border}`,
                borderRadius: zen ? 0 : 12,
                background: zen ? 'transparent' : currentTheme.cardBg,
                boxShadow: zen ? 'none' : `0 4px 12px ${currentTheme.shadow}`,
                width: '100%',
                height: '100%',
                minHeight: zen ? '100vh' : 'calc(100vh - 160px)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* 工具栏 */}
              {!zen && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${currentTheme.border}`
                }}>
                  {TOOLBAR.map(t => (
                    <button
                      key={t.key}
                      style={{
                        width: 36,
                        height: 36,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: 8,
                        background: currentTheme.cardBg,
                        color: currentTheme.fg,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      title={t.tip}
                      onClick={() => applyToolbar(t)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = currentTheme.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = currentTheme.cardBg;
                      }}
                    >
                      {React.createElement(t.icon, { size: 16 })}
                    </button>
                  ))}
                  <div style={{ flex: 1 }}></div>
                  <span style={{
                    fontSize: 12,
                    color: currentTheme.muted,
                    background: currentTheme.accent,
                    padding: '4px 8px',
                    borderRadius: 4
                  }}>
                    拖拽图片到此处上传
                  </span>
                </div>
              )}

              {/* 拖拽提示 */}
              {dragOver && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '2px dashed var(--primary)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  pointerEvents: 'none'
                }}>
                  <div style={{
                    background: currentTheme.cardBg,
                    padding: '20px 30px',
                    borderRadius: 8,
                    boxShadow: `0 4px 12px ${currentTheme.shadow}`,
                    textAlign: 'center',
                    color: currentTheme.fg
                  }}>
                    <Image size={32} style={{ marginBottom: 8 }} />
                    <div style={{ fontSize: 16, fontWeight: 600 }}>释放图片上传</div>
                    <div style={{ fontSize: 14, color: currentTheme.muted }}>支持 JPG, PNG, GIF 格式</div>
                  </div>
                </div>
              )}

              {/* Slash 命令菜单 */}
              {slashOpen && (
                <div
                  ref={slashRef}
                  style={{
                    position: 'fixed',
                    left: slashPos.x,
                    top: slashPos.y,
                    zIndex: 1000,
                    background: currentTheme.cardBg,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 8,
                    boxShadow: `0 8px 24px ${currentTheme.shadow}`,
                    minWidth: 220,
                    maxHeight: 300,
                    overflowY: 'auto',
                    fontSize: 14
                  }}
                >
                  {filteredSlashCommands.length > 0 ? (
                    filteredSlashCommands.map((cmd, index) => (
                      <div
                        key={cmd.key}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: index === selectedIndex ? currentTheme.accent : 'transparent',
                          color: currentTheme.fg,
                          borderBottom: `1px solid ${currentTheme.border}`,
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onMouseLeave={() => setSelectedIndex(0)}
                        onClick={() => insertSnippet(cmd.snippet)}
                      >
                        <span style={{
                          fontSize: 12,
                          color: index === selectedIndex ? currentTheme.primary : currentTheme.muted,
                          fontWeight: index === selectedIndex ? 'bold' : 'normal'
                        }}>
                          {index === selectedIndex ? '→' : '•'}
                        </span>
                        <span>{cmd.label}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '12px',
                      color: currentTheme.muted,
                      textAlign: 'center',
                      fontSize: 13
                    }}>
                      没有找到匹配的命令
                    </div>
                  )}
                  <div style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    color: currentTheme.muted,
                    background: currentTheme.accent,
                    borderTop: `1px solid ${currentTheme.border}`
                  }}>
                    ↑↓ 选择 • Enter 确认 • Esc 取消
                  </div>
                </div>
              )}

              {/* 编辑器和预览区域 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: showPreview && !zen ? '1fr 8px 1fr' : '1fr',
                gap: 0,
                flex: 1,
                minHeight: 0
              }}>
                {/* 编辑区域 */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0
                }}>
                  <textarea
                    ref={textRef}
                    style={{
                      fontSize: fontSize,
                      lineHeight: 1.6,
                      width: '100%',
                      height: '100%',
                      minHeight: zen ? 'calc(100vh - 40px)' : 'calc(100vh - 300px)',
                      background: zen ? 'transparent' : currentTheme.cardBg,
                      border: zen ? 'none' : `1px solid ${currentTheme.border}`,
                      borderRadius: zen ? 0 : 8,
                      padding: 16,
                      color: currentTheme.fg,
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'ui-monospace, SFMono-Regular, "Cascadia Code", Consolas, monospace'
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
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      marginTop: 12,
                      fontSize: 12,
                      color: currentTheme.muted
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Save size={14} />
                        已保存
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={14} />
                        {wordCount.chars} 字符
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BookOpen size={14} />
                        {wordCount.words} 词
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} />
                        约 {readingTime} 分钟阅读
                      </span>
                    </div>
                  )}
                </div>

                {showPreview && !zen && (
                  <>
                    <div style={{
                      width: 1,
                      background: currentTheme.border,
                      margin: '0 auto'
                    }} />
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                        fontSize: 14,
                        color: currentTheme.muted
                      }}>
                        <span>预览</span>
                        <span>宽度 {Math.round(lineWidth)}px</span>
                      </div>
                      <MarkdownPreview
                        content={activeDoc?.content || ''}
                        lineWidth={lineWidth}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 表格配置对话框 */}
      {showTableDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTableDialog(false);
            }
          }}
        >
          <div style={{
            background: currentTheme.cardBg,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: 12,
            padding: 24,
            minWidth: 300,
            boxShadow: `0 10px 25px ${currentTheme.shadow}`
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: currentTheme.fg }}>插入表格</h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, color: currentTheme.fg }}>
                行数: {tableRows}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={tableRows}
                onChange={(e) => setTableRows(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, color: currentTheme.fg }}>
                列数: {tableCols}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={tableCols}
                onChange={(e) => setTableCols(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'flex-end'
            }}>
              <button
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 8,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  cursor: 'pointer'
                }}
                onClick={() => setShowTableDialog(false)}
              >
                取消
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 8,
                  background: currentTheme.primary,
                  color: 'white',
                  cursor: 'pointer'
                }}
                onClick={insertTable}
              >
                插入表格
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 面板 */}
      {showAIPanel && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          background: currentTheme.cardBg,
          border: `1px solid ${currentTheme.border}`,
          boxShadow: `-4px 0 20px ${currentTheme.shadow}`,
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${currentTheme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={16} />
              AI 智能助手
            </h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: currentTheme.fg,
                cursor: 'pointer',
                padding: 4
              }}
              onClick={() => setShowAIPanel(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
            {/* 功能选择 */}
            <div style={{ marginBottom: 20 }}>
              <strong style={{ marginBottom: 12, display: 'block' }}>选择AI功能:</strong>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr' }}>
                {AI_FUNCTIONS.map(func => (
                  <button
                    key={func.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      border: aiFunction === func.key ? `2px solid ${currentTheme.primary}` : `1px solid ${currentTheme.border}`,
                      borderRadius: 8,
                      background: aiFunction === func.key ? `${currentTheme.primary}20` : currentTheme.cardBg,
                      cursor: (func.needsSelection && !selectedText.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (func.needsSelection && !selectedText.trim()) ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onClick={() => setAiFunction(func.key)}
                    disabled={func.needsSelection && !selectedText.trim()}
                  >
                    <span style={{ fontSize: 16 }}>{func.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{func.label}</div>
                      <div style={{ fontSize: 12, color: currentTheme.muted }}>{func.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 选中文本显示 */}
            {selectedText && (
              <div style={{
                marginBottom: 16,
                padding: 12,
                background: currentTheme.accent,
                borderRadius: 8,
                fontSize: 14
              }}>
                <strong>选中文本:</strong>
                <div style={{
                  marginTop: 8,
                  fontStyle: 'italic',
                  maxHeight: 100,
                  overflow: 'auto',
                  color: currentTheme.muted
                }}>
                  "{selectedText.length > 200 ? selectedText.substring(0, 200) + '...' : selectedText}"
                </div>
              </div>
            )}

            {/* 样式选择（仅改写功能时显示） */}
            {aiFunction === 'rewrite' && (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ marginBottom: 8, display: 'block' }}>改写风格:</strong>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr' }}>
                  {AI_STYLES.map(style => (
                    <button
                      key={style.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: 12,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: 8,
                        background: currentTheme.cardBg,
                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: aiLoading ? 0.6 : 1,
                        textAlign: 'left'
                      }}
                      onClick={() => handleAIFunction('rewrite', style.key)}
                      disabled={aiLoading}
                    >
                      <span style={{ fontSize: 14 }}>{style.label}</span>
                      <div style={{
                        fontSize: 12,
                        color: currentTheme.muted,
                        flex: 1
                      }}>
                        {style.description}
                      </div>
                      {aiLoading && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 执行按钮（非改写功能） */}
            {aiFunction !== 'rewrite' && (
              <div style={{ marginBottom: 20 }}>
                <button
                  style={{
                    width: '100%',
                    padding: 12,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: aiLoading || (AI_FUNCTIONS.find(f => f.key === aiFunction)?.needsSelection && !selectedText.trim()) ? 'not-allowed' : 'pointer',
                    fontWeight: '500',
                    fontSize: 14,
                    opacity: aiLoading || (AI_FUNCTIONS.find(f => f.key === aiFunction)?.needsSelection && !selectedText.trim()) ? 0.6 : 1
                  }}
                  onClick={() => handleAIFunction(aiFunction)}
                  disabled={aiLoading || (AI_FUNCTIONS.find(f => f.key === aiFunction)?.needsSelection && !selectedText.trim())}
                >
                  {aiLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      处理中...
                    </span>
                  ) : (
                    `执行${AI_FUNCTIONS.find(f => f.key === aiFunction)?.label}`
                  )}
                </button>
              </div>
            )}

            {/* AI结果显示 */}
            {aiResult && (
              <div style={{
                marginBottom: 20,
                padding: 16,
                background: currentTheme.accent,
                borderRadius: 8,
                border: `1px solid ${currentTheme.border}`
              }}>
                <strong style={{
                  marginBottom: 8,
                  display: 'block',
                  color: currentTheme.primary
                }}>
                  AI 处理结果:
                </strong>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  maxHeight: 300,
                  overflow: 'auto',
                  fontSize: 14,
                  color: currentTheme.fg
                }}>
                  {aiResult}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    style={{
                      flex: 1,
                      padding: 8,
                      background: currentTheme.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                    onClick={applyAIResult}
                  >
                    应用结果
                  </button>
                  <button
                    style={{
                      padding: 8,
                      background: 'transparent',
                      color: currentTheme.fg,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                    onClick={() => setAiResult('')}
                  >
                    重新生成
                  </button>
                </div>
              </div>
            )}

            <div style={{
              fontSize: 12,
              color: currentTheme.muted,
              textAlign: 'center',
              background: currentTheme.accent,
              padding: 8,
              borderRadius: 6
            }}>
              快捷键: Ctrl/Cmd + E 快速调用AI助手
            </div>
          </div>
        </div>
      )}

      {/* 文档列表面板 */}
      {showDocumentList && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 320,
          background: currentTheme.cardBg,
          border: `1px solid ${currentTheme.border}`,
          boxShadow: `4px 0 20px ${currentTheme.shadow}`,
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${currentTheme.border}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}>
              <h3 style={{ margin: 0 }}>文档管理</h3>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.fg,
                  cursor: 'pointer',
                  padding: 4
                }}
                onClick={() => setShowDocumentList(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <input
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 6,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  fontSize: 14
                }}
                type="text"
                placeholder="搜索文档标题或内容..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: currentTheme.muted }}>排序：</span>
              <select
                style={{
                  padding: '4px 8px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: 4,
                  background: currentTheme.cardBg,
                  color: currentTheme.fg,
                  fontSize: 12
                }}
                value={docSort}
                onChange={(e) => setDocSort(e.target.value as 'modified' | 'created' | 'title')}
              >
                <option value="modified">最近修改</option>
                <option value="created">创建时间</option>
                <option value="title">标题</option>
              </select>
              <span style={{ fontSize: 12, color: currentTheme.muted }}>
                共 {filteredAndSortedDocs.length} 个文档
              </span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredAndSortedDocs.length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: 'center',
                color: currentTheme.muted,
                fontSize: 14
              }}>
                {docSearch ? '未找到匹配的文档' : '暂无文档'}
              </div>
            ) : (
              filteredAndSortedDocs.map(doc => {
                const preview = doc.content.replace(/[#*\-`]/g, '').slice(0, 100);
                const isActive = doc.id === activeDocId;

                return (
                  <div
                    key={doc.id}
                    style={{
                      padding: 16,
                      borderBottom: `1px solid ${currentTheme.border}`,
                      cursor: 'pointer',
                      background: isActive ? `${currentTheme.primary}20` : 'transparent',
                      borderLeft: isActive ? `3px solid ${currentTheme.primary}` : '3px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      setShowDocumentList(false);
                      setDocSearch('');
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = currentTheme.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600,
                          marginBottom: 4,
                          fontSize: 14,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: currentTheme.fg
                        }}>
                          {doc.title}
                        </div>

                        {preview && (
                          <div style={{
                            fontSize: 12,
                            color: currentTheme.muted,
                            marginBottom: 8,
                            lineHeight: 1.4,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {preview}...
                          </div>
                        )}

                        <div style={{
                          fontSize: 11,
                          color: currentTheme.muted,
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center'
                        }}>
                          <span>{doc.modified.toLocaleDateString()}</span>
                          <span>{doc.content.length} 字符</span>
                          <span>{Math.ceil(doc.content.length / 200)} 分钟</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                        <button
                          style={{
                            padding: '4px 6px',
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: 4,
                            background: 'transparent',
                            color: currentTheme.muted,
                            cursor: 'pointer',
                            fontSize: 11
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateDocument(doc.id);
                          }}
                          title="复制文档"
                        >
                          <FileText size={12} />
                        </button>
                        {documents.length > 1 && (
                          <button
                            style={{
                              padding: '4px 6px',
                              border: `1px solid ${currentTheme.border}`,
                              borderRadius: 4,
                              background: 'transparent',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: 11
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定要删除"${doc.title}"吗？`)) {
                                deleteDocument(doc.id);
                              }
                            }}
                            title="删除文档"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{
            padding: 12,
            borderTop: `1px solid ${currentTheme.border}`,
            background: currentTheme.accent
          }}>
            <button
              style={{
                width: '100%',
                padding: 8,
                background: currentTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onClick={() => {
                createNewDocument();
                setShowDocumentList(false);
              }}
            >
              <Plus size={16} />
              新建文档
            </button>
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: zen ? 20 : 80,
          right: 20,
          width: 360,
          background: currentTheme.cardBg,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: 12,
          boxShadow: `0 10px 25px ${currentTheme.shadow}`,
          zIndex: 1000,
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${currentTheme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0 }}>编辑器设置</h3>
            <button
              style={{
                background: 'none',
                border: 'none',
                color: currentTheme.fg,
                cursor: 'pointer',
                padding: 4
              }}
              onClick={() => setShowSettings(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 20 }}>
            {/* 主题设置 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>主题模式</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.keys(THEMES).map((key) => (
                  <button
                    key={key}
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: 6,
                      background: theme === key ? currentTheme.primary : currentTheme.cardBg,
                      color: theme === key ? 'white' : currentTheme.fg,
                      cursor: 'pointer',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    onClick={() => setTheme(key)}
                  >
                    {key === 'light' && <Sun size={12} />}
                    {key === 'dark' && <Moon size={12} />}
                    {key === 'sepia' && <Palette size={12} />}
                    <span style={{ textTransform: 'capitalize' }}>{key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 字体大小 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                字体大小: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 预览宽度 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                预览宽度: {lineWidth}px
              </label>
              <input
                type="range"
                min="600"
                max="1200"
                value={lineWidth}
                onChange={e => setLineWidth(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 目录显示 */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showTOC}
                  onChange={e => setShowTOC(e.target.checked)}
                />
                显示目录导航
              </label>
            </div>

            {/* AI模型配置 */}
            <div>
              <h4 style={{ marginBottom: 12, color: currentTheme.primary }}>AI 模型配置</h4>

              {/* 模型名称 */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>模型名称</label>
                <input
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 6,
                    background: currentTheme.cardBg,
                    color: currentTheme.fg,
                    fontSize: 14,
                    fontFamily: 'monospace'
                  }}
                  value={openAIConfig.model || ''}
                  onChange={(e) => setOpenAIConfig((prev: any) => ({
                    ...prev,
                    model: e.target.value
                  }))}
                  placeholder="qwen-plus"
                />
                <div style={{ fontSize: 12, color: currentTheme.muted, marginTop: 4 }}>
                  输入具体的模型名称，如：qwen-plus, gpt-3.5-turbo, claude-3-sonnet 等
                </div>
              </div>

              {/* Base URL */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Base URL</label>
                <input
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 6,
                    background: currentTheme.cardBg,
                    color: currentTheme.fg,
                    fontSize: 14,
                    fontFamily: 'monospace'
                  }}
                  value={openAIConfig.baseUrl || ''}
                  onChange={(e) => setOpenAIConfig((prev: any) => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                />
                <div style={{ fontSize: 12, color: currentTheme.muted, marginTop: 4 }}>
                  输入API的基础URL地址
                </div>
              </div>

              {/* API Key */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>API Key</label>
                <input
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 6,
                    background: currentTheme.cardBg,
                    color: currentTheme.fg,
                    fontSize: 14,
                    fontFamily: 'monospace'
                  }}
                  type="password"
                  value={openAIConfig.apiKey || ''}
                  onChange={(e) => setOpenAIConfig((prev: any) => ({
                    ...prev,
                    apiKey: e.target.value
                  }))}
                  placeholder="sk-..."
                />
                <div style={{ fontSize: 12, color: currentTheme.muted, marginTop: 4 }}>
                  输入您的API密钥
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>Temperature</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={openAIConfig.temperature || 0.7}
                    onChange={(e) => setOpenAIConfig((prev: any) => ({ ...prev, temperature: Number(e.target.value) }))}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 12, color: currentTheme.muted, textAlign: 'center' }}>
                    {openAIConfig.temperature || 0.7}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4 }}>Max Tokens</label>
                  <input
                    type="number"
                    min="100"
                    max="4000"
                    step="100"
                    value={openAIConfig.maxTokens || 2000}
                    onChange={(e) => setOpenAIConfig((prev: any) => ({ ...prev, maxTokens: Number(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: 4,
                      background: currentTheme.cardBg,
                      color: currentTheme.fg,
                      fontSize: 12
                    }}
                  />
                </div>
              </div>

              <div style={{
                padding: 12,
                background: (openAIConfig.apiKey && openAIConfig.model && openAIConfig.baseUrl) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${(openAIConfig.apiKey && openAIConfig.model && openAIConfig.baseUrl) ? '#10b981' : '#ef4444'}`,
                borderRadius: 8,
                fontSize: 12
              }}>
                {(openAIConfig.apiKey && openAIConfig.model && openAIConfig.baseUrl) ? (
                  <span style={{ color: '#10b981' }}>✓ AI配置已完成 ({openAIConfig.model || '未设置'})</span>
                ) : (
                  <span style={{ color: '#ef4444' }}>! 请完成模型配置</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!zen && (
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${currentTheme.border}`,
          background: currentTheme.cardBg,
          fontSize: 12,
          color: currentTheme.muted,
          textAlign: 'center',
          lineHeight: 1.4
        }}>
          <div>快捷键：Ctrl+S 保存 • Ctrl+P PDF导出 • Ctrl+B 加粗 • Ctrl+I 斜体 • Ctrl+K 链接 • Ctrl+E AI助手 • F1 帮助</div>
          <div style={{ marginTop: 4 }}>本地自动保存 • 无打扰写作 • {documents.length} 个文档 • ESC退出禅模式</div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
        }

        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        ::-webkit-scrollbar-track {
          background: var(--accent);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--muted);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--fg);
        }
      `}</style>
    </div>
  );
}