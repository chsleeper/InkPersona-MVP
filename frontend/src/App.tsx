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
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiFunction, setAiFunction] = useState<string>('rewrite');
  const [aiResult, setAiResult] = useState<string>('');
  const [openAIConfig, setOpenAIConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("inkpersona:openai") || '{}');
    } catch {
      return {};
    }
  });
  const [docSearch, setDocSearch] = useState('');
  const [docSort, setDocSort] = useState<'modified' | 'created' | 'title'>('modified');
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  
  // 存储图片数据的映射，用于处理超长base64
  const [imageDataMap, setImageDataMap] = useState<Map<string, string>>(new Map());

  // 生成图片ID和存储图片数据
  function storeImageData(imageData: string, filename: string): string {
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setImageDataMap(prev => {
      const newMap = new Map(prev);
      newMap.set(imageId, imageData);
      return newMap;
    });
    return imageId;
  }

  const textRef = useRef<HTMLTextAreaElement|null>(null);
  const slashRef = useRef<HTMLDivElement|null>(null);

  // 通知系统
  function showNotification(type: 'success' | 'error' | 'info', message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }

  // 自动隐藏通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 生成表格内容
  function generateTable(rows: number, cols: number): string {
    const headers = Array(cols).fill(null).map((_, i) => `列${i + 1}`).join(' | ');
    const separator = Array(cols).fill('---').join(' | ');
    const tableRows = Array(rows - 1).fill(null).map((_, i) => {
      return Array(cols).fill(null).map((_, j) => `值${i + 1}-${j + 1}`).join(' | ');
    });
    return `| ${headers} |\n|${separator}|\n` + tableRows.map(row => `| ${row} |`).join('\n') + '\n\n';
  }

  // 插入表格
  function insertTable() {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const tableContent = generateTable(tableRows, tableCols);
    const next = activeDoc.content.slice(0, start) + tableContent + activeDoc.content.slice(start);
    updateActiveDocument(next);
    setShowTableDialog(false);

    setTimeout(() => {
      ta.focus();
      const caret = start + tableContent.length;
      ta.setSelectionRange(caret, caret);
    }, 0);
  }

  // 处理拖拽事件
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      return validTypes.includes(file.type.toLowerCase());
    });
    
    if (imageFiles.length === 0) {
      showNotification('error', '请拖拽有效的图片文件 (JPG, PNG, GIF, WebP)');
      return;
    }
    
    if (imageFiles.length !== files.length) {
      showNotification('info', `已过滤掉 ${files.length - imageFiles.length} 个非图片文件`);
    }
    
    uploadImages(imageFiles);
  }

  // 上传图片
  async function uploadImages(files: File[]) {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    let insertText = '';
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress((i / files.length) * 100);
      
      try {
        // 将图片转换为Base64格式，这样可以在预览中正常显示
        const imageDataUrl = await convertFileToBase64(file);
        
        // 验证生成的base64格式
        if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
          // 验证base64数据的完整性
          const [header, data] = imageDataUrl.split(',');
          if (header && data && data.length > 0) {
            // 检查base64长度，如果太长使用ID引用方式
            if (imageDataUrl.length > 50000) { // 50KB阈值
              console.log('🔄 图片过大，使用ID引用方式');
              const imageId = storeImageData(imageDataUrl, file.name);
              const markdownImage = `![${file.name.split('.')[0]}](${imageId})\n\n`;
              insertText += markdownImage;
            } else {
              // 直接嵌入base64
              const markdownImage = `![${file.name.split('.')[0]}](${imageDataUrl})\n\n`;
              insertText += markdownImage;
            }
            
            successCount++;
            
            console.log('✅ 图片转换成功:', {
              filename: file.name,
              size: file.size,
              type: file.type,
              base64Length: imageDataUrl.length,
              base64Header: header,
              base64DataLength: data.length,
              base64Prefix: imageDataUrl.substring(0, 50) + '...',
              useIdReference: imageDataUrl.length > 50000
            });
            
            // 简单测试base64是否可以被浏览器解码
            try {
              const testImg = new Image();
              testImg.onload = () => {
                console.log('✅ Base64图片可以正常解码:', {
                  width: testImg.width,
                  height: testImg.height
                });
              };
              testImg.onerror = () => {
                console.warn('⚠️ Base64图片解码测试失败');
              };
              testImg.src = imageDataUrl;
            } catch (e) {
              console.warn('⚠️ Base64图片测试异常:', e);
            }
          } else {
            throw new Error('生成的base64格式无效：缺少数据部分');
          }
        } else {
          throw new Error('生成的base64格式无效：不是有效的数据URL');
        }
        
        showNotification('info', `正在处理图片 ${i + 1}/${files.length}...`);
      } catch (error) {
        console.error('图片上传失败:', error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        showNotification('error', `图片 ${file.name} 处理失败: ${errorMessage}`);
        failCount++;
        
        // 仍然插入一个占位符
        const fallbackMarkdown = `![${file.name}](图片处理失败: ${errorMessage})\n\n`;
        insertText += fallbackMarkdown;
      }
    }

    // 插入Markdown图片链接
    const next = activeDoc.content.slice(0, start) + insertText + activeDoc.content.slice(start);
    updateActiveDocument(next);
    
    setTimeout(() => {
      ta.focus();
      const caret = start + insertText.length;
      ta.setSelectionRange(caret, caret);
      setUploadProgress(0);
      
      // 显示最终结果通知
      if (failCount === 0) {
        showNotification('success', `成功上传 ${successCount} 个图片`);
      } else if (successCount === 0) {
        showNotification('error', `所有图片上传失败`);
      } else {
        showNotification('info', `成功上传 ${successCount} 个图片，${failCount} 个失败`);
      }
    }, 300);
  }

  // 将文件转换为Base64格式，并进行压缩
  function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      // 检查文件大小 (限制为5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        reject(new Error(`图片文件过大 (${Math.round(file.size / 1024 / 1024)}MB)，请选择小于5MB的图片`));
        return;
      }

      // 验证文件类型
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type.toLowerCase())) {
        reject(new Error(`不支持的图片格式: ${file.type}`));
        return;
      }

      console.log('🔄 开始转换图片:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // 如果是图片文件，尝试进行压缩处理
      if (file.type.startsWith('image/')) {
        // 先尝试使用压缩功能
        compressImage(file, 0.8, 1200)
          .then((result) => {
            console.log('✅ 图片压缩成功:', result.substring(0, 50) + '...');
            resolve(result);
          })
          .catch((error) => {
            console.warn('图片压缩失败，尝试直接转换:', error);
            // 如果压缩失败，回退到直接转换
            directFileToBase64(file).then((result) => {
              console.log('✅ 直接转换成功:', result.substring(0, 50) + '...');
              resolve(result);
            }).catch(reject);
          });
      } else {
        // 非图片文件直接转换
        directFileToBase64(file).then(resolve).catch(reject);
      }
    });
  }

  // 直接将文件转换为Base64（不压缩）
  function directFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error('文件读取失败'));
        }
      };
      reader.onerror = () => reject(new Error('文件读取错误'));
      reader.readAsDataURL(file);
    });
  }

  // 图片压缩功能
  function compressImage(file: File, quality: number, maxWidth: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 创建Image对象，兼容不同环境
      let img: HTMLImageElement;
      try {
        img = new Image();
      } catch (error) {
        // 如果Image构造函数不可用，创建img元素
        img = document.createElement('img');
      }
      
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        // 清理临时URL
        URL.revokeObjectURL(objectUrl);
        
        try {
          // 计算压缩后的尺寸
          let { width, height } = img;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // 绘制并压缩图片
          ctx?.drawImage(img, 0, 0, width, height);
          
          // 转换为Base64
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
          resolve(dataUrl);
        } catch (error) {
          reject(new Error(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('图片加载失败，请检查图片格式是否正确'));
      };
      
      // 设置图片源
      try {
        img.src = objectUrl;
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('无法加载图片文件'));
      }
    });
  }

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
      localStorage.setItem("inkpersona:openai", JSON.stringify(openAIConfig));
      updateWordCount(activeDoc?.content || '');
      setStatus("已保存");
    } catch (e) {
      console.warn("无法保存到本地存储", e);
    }
  }, [documents, showPreview, theme, fontSize, lineWidth, openAIConfig, updateWordCount, activeDoc]);

  // 应用主题
  useEffect(() => {
    const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.light;
    const root = document.documentElement;

    Object.entries(currentTheme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  }, [theme]);

  const toc = useMemo(() => {
    return extractTOC(activeDoc?.content || '');
  }, [activeDoc?.content]);

  // 过滤和排序文档
  const filteredAndSortedDocs = useMemo(() => {
    let filtered = documents;
    
    // 搜索过滤
    if (docSearch.trim()) {
      const searchLower = docSearch.toLowerCase();
      filtered = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchLower) ||
        doc.content.toLowerCase().includes(searchLower)
      );
    }
    
    // 排序
    const sorted = [...filtered].sort((a, b) => {
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
    
    return sorted;
  }, [documents, docSearch, docSort]);

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

      if (isCtrl && e.key === 'e') {
        e.preventDefault();
        handleTextSelection();
      }

      // AI改写快捷键
      if (isCtrl && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        quickAIRewrite('academic');
      }

      if (isCtrl && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        quickAIRewrite('creative');
      }

      if (isCtrl && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        quickAIRewrite('concise');
      }

      if (isCtrl && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        quickAIRewrite('business');
      }

      if (isCtrl && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        quickAIRewrite('friendly');
      }

      if (isCtrl && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        quickAIRewrite('technical');
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
        if (zen) {
          setZen(false);
        } else {
          setSlashOpen(false);
          setShowSettings(false);
          setShowAIPanel(false);
          setShowTableDialog(false);
          setShowDocumentList(false);
          setShowHelpPanel(false);
        }
      }

      // 文档导航快捷键
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

      // 帮助面板快捷键
      if (e.key === 'F1' || (e.shiftKey && e.key === '?')) {
        e.preventDefault();
        setShowHelpPanel(!showHelpPanel);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashOpen]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // 检查slash菜单
      if (slashRef.current && !slashRef.current.contains(target)) {
        setSlashOpen(false);
      }

      // 检查设置面板
      if (showSettings) {
        const settingsPanel = document.querySelector('.settings-panel');
        const settingsButton = document.querySelector('.button[data-settings]');
        if (settingsPanel && !settingsPanel.contains(target) && 
            settingsButton && !settingsButton.contains(target)) {
          setShowSettings(false);
        }
      }

      // 检查AI面板
      if (showAIPanel) {
        const aiPanel = document.querySelector('.ai-panel');
        const aiButton = document.querySelector('.ai-button');
        if (aiPanel && !aiPanel.contains(target) && 
            aiButton && !aiButton.contains(target)) {
          setShowAIPanel(false);
        }
      }

      // 检查文档列表面板
      if (showDocumentList) {
        const docPanel = document.querySelector('.document-list-panel');
        const docButton = document.querySelector('.button[data-docs]');
        if (docPanel && !docPanel.contains(target) && 
            docButton && !docButton.contains(target)) {
          setShowDocumentList(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [slashOpen, showSettings, showAIPanel, showDocumentList]);

  const markdown = useMemo(() => {
    const content = activeDoc?.content || '';
    
    // 调试：检查内容中的图片链接
    const imageMatches = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g);
    if (imageMatches) {
      console.log('📝 发现Markdown图片:', imageMatches.map(match => {
        const [, alt, src] = match.match(/!\[([^\]]*)\]\(([^)]+)\)/) || [];
        return {
          match: match.substring(0, 100) + (match.length > 100 ? '...' : ''),
          alt,
          srcLength: src?.length,
          isBase64: src?.startsWith('data:image/'),
          srcPreview: src?.substring(0, 50) + '...'
        };
      }));
    }
    
    return content;
  }, [activeDoc?.content]);

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
    showNotification('success', '新文档已创建');
  }

  function deleteDocument(id: string) {
    if (documents.length <= 1) return;

    const docToDelete = documents.find(doc => doc.id === id);
    setDocuments(docs => docs.filter(doc => doc.id !== id));
    if (activeDocId === id) {
      const remaining = documents.filter(doc => doc.id !== id);
      setActiveDocId(remaining[0]?.id || '');
    }
    showNotification('success', `文档"${docToDelete?.title || '未命名'}"已删除`);
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
    showNotification('success', `文档"${docToDupe.title}"已复制`);
  }

  function applyToolbar(tool: Tool) {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    // 特殊处理表格对话框
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
      setAiFunction('rewrite');
    } else {
      setSelectedText('');
      setAiFunction('summarize');
    }
    setShowAIPanel(true);
  }

  // 处理AI功能
  async function handleAIFunction(functionKey: string, style?: string) {
    setAiLoading(true);
    setAiResult('');
    
    try {
      let requestData: any = {};
      let endpoint = '';

      switch (functionKey) {
        case 'summarize':
          endpoint = '/api/summarize';
          requestData = {
            text: activeDoc?.content || '',
            instruction: '请为这篇文档生成一个简洁的摘要，提取关键点'
          };
          break;
          
        case 'suggestions':
          endpoint = '/api/suggest';
          requestData = {
            text: selectedText,
            instruction: '请分析这段文字的拼写、语法、语气和排版，提供优化建议'
          };
          break;
          
        case 'image-generate':
          endpoint = '/api/generate-image-prompt';
          requestData = {
            text: selectedText,
            instruction: '为这段文字生成一个适合的图片描述或配图建议'
          };
          break;
          
        case 'translate':
          endpoint = '/api/translate';
          requestData = {
            text: selectedText,
            instruction: '请将这段文字翻译成英文'
          };
          break;
          
        case 'rewrite':
        default:
          endpoint = '/api/rewrite';
          requestData = {
            text: selectedText,
            style: style || 'academic',
            instruction: `请按照${AI_STYLES.find(s => s.key === style)?.label}的风格改写这段文字`
          };
          break;
      }

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          openai_config: openAIConfig.apiKey ? {
            api_key: openAIConfig.apiKey,
            model: openAIConfig.model || 'gpt-3.5-turbo',
            temperature: openAIConfig.temperature || 0.7,
            max_tokens: openAIConfig.maxTokens || 1000
          } : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResult(data.result);
      } else {
        // 回退到本地处理
        const fallbackResult = await handleAIFallback(functionKey, style);
        setAiResult(fallbackResult);
      }
    } catch (error) {
      console.error('AI处理失败:', error);
      // 回退到本地处理
      const fallbackResult = await handleAIFallback(functionKey, style);
      setAiResult(fallbackResult);
      showNotification('info', '使用本地AI功能处理');
    } finally {
      setAiLoading(false);
    }
  }

  // AI功能的本地回退处理
  async function handleAIFallback(functionKey: string, style?: string): Promise<string> {
    const content = functionKey === 'summarize' ? (activeDoc?.content || '') : selectedText;
    
    switch (functionKey) {
      case 'summarize':
        const lines = content.split('\n').filter(line => line.trim());
        const headings = lines.filter(line => line.startsWith('#'));
        const summary = headings.length > 0 
          ? `主要内容：\n${headings.slice(0, 5).map(h => `• ${h.replace(/^#+\s*/, '')}`).join('\n')}`
          : `文档概要：\n• 共 ${content.length} 字符\n• 约 ${Math.ceil(content.length / 200)} 分钟阅读时间`;
        return summary;
        
      case 'suggestions':
        return `优化建议：\n• 检查标点符号使用\n• 注意段落之间的逻辑连接\n• 考虑使用更生动的表达方式`;
        
      case 'image-generate':
        return `配图建议：\n• 可以添加相关的示意图或图表\n• 考虑使用图标来突出重点\n• 建议配色与主题保持一致`;
        
      case 'translate':
        return `Translation: ${content}\n(本地翻译功能有限，建议连接网络服务)`;
        
      case 'rewrite':
      default:
        return enhanceTextLocally(content, style || 'academic');
    }
  }

  // 快速AI改写功能
  async function quickAIRewrite(style: string) {
    const ta = textRef.current;
    if (!ta || !activeDoc) return;

    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const selected = ta.value.slice(start, end);

    if (!selected.trim()) {
      showNotification('info', '请先选择要改写的文本');
      return;
    }

    const styleName = AI_STYLES.find(s => s.key === style)?.label || style;
    showNotification('info', `正在使用${styleName}改写文本...`);
    
    setAiLoading(true);
    
    try {
      let requestData = {
        text: selected,
        style: style,
        instruction: `请按照${styleName}的风格改写这段文字`
      };

      const response = await fetch(`http://localhost:8000/api/rewrite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          openai_config: openAIConfig.apiKey ? {
            api_key: openAIConfig.apiKey,
            model: openAIConfig.model || 'gpt-3.5-turbo',
            temperature: openAIConfig.temperature || 0.7,
            max_tokens: openAIConfig.maxTokens || 1000
          } : null
        })
      });

      let result;
      if (response.ok) {
        const data = await response.json();
        result = data.result;
      } else {
        // 回退到本地处理
        result = enhanceTextLocally(selected, style);
        showNotification('info', '使用本地AI功能处理');
      }

      // 直接替换选中文本
      const next = activeDoc.content.slice(0, start) + result + activeDoc.content.slice(end);
      updateActiveDocument(next);

      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start, start + result.length);
      }, 0);

      showNotification('success', '文本改写完成');
      
    } catch (error) {
      console.error('AI改写失败:', error);
      // 回退到本地处理
      const result = enhanceTextLocally(selected, style);
      const next = activeDoc.content.slice(0, start) + result + activeDoc.content.slice(end);
      updateActiveDocument(next);
      
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(start, start + result.length);
      }, 0);
      
      showNotification('info', '使用本地AI功能处理');
    } finally {
      setAiLoading(false);
    }
  }

  async function rewriteText(style: string) {
    await handleAIFunction('rewrite', style);
  }

  // 应用AI结果
  function applyAIResult() {
    if (!aiResult.trim()) return;

    if (aiFunction === 'summarize') {
      // 摘要插入到文档开头
      const ta = textRef.current;
      if (!ta || !activeDoc) return;
      
      const summaryText = `## 文档摘要\n\n${aiResult}\n\n---\n\n`;
      const next = summaryText + activeDoc.content;
      updateActiveDocument(next);
      
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(0, summaryText.length);
      }, 0);
      showNotification('success', '文档摘要已添加');
    } else {
      // 其他功能替换选中文本
      replaceSelectedText(aiResult);
      showNotification('success', 'AI处理结果已应用');
    }
    
    setShowAIPanel(false);
    setAiResult('');
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
    showNotification('success', 'Markdown文件已下载');
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
    showNotification('success', 'HTML文件已下载');
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
      {/* 通知系统 */}
      {notification && (
        <div
          className={`notification ${notification.type}`}
          style={{
            position: 'fixed',
            top: zen ? 20 : 80,
            right: 20,
            zIndex: 2000,
            background: currentTheme.cardBg,
            border: `1px solid var(--border)`,
            borderLeft: `4px solid ${
              notification.type === 'success' ? '#10b981' :
              notification.type === 'error' ? '#ef4444' : 
              '#6366f1'
            }`,
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 4px 12px var(--shadow)',
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
              {notification.type === 'success' ? '✅' : 
               notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {notification.message}
          </div>
        </div>
      )}

      {/* 禅模式退出按钮 */}
      {zen && (
        <button
          className="zen-exit-btn"
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
            transition: 'all 0.3s ease',
            opacity: 0.7
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
          }}
          title="退出禅模式"
        >
          <X size={20} />
        </button>
      )}

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
                data-docs="true"
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
                data-settings="true"
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

      {/* 表格配置对话框 */}
      {showTableDialog && (
        <div
          className="modal-overlay"
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
          <div
            className="modal"
            style={{
              background: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 12,
              padding: 24,
              minWidth: 300,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
            }}
          >
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
                className="button ghost"
                onClick={() => setShowTableDialog(false)}
              >
                取消
              </button>
              <button
                className="button primary"
                onClick={insertTable}
              >
                插入表格
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文档列表面板 */}
      {showDocumentList && (
        <div className="document-list-panel">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>文档管理</h3>
              <button className="button ghost" onClick={() => setShowDocumentList(false)}>
                <X size={16} />
              </button>
            </div>
            
            {/* 搜索框 */}
            <div style={{ marginBottom: 12 }}>
              <input
                className="input"
                type="text"
                placeholder="搜索文档标题或内容..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                style={{ width: '100%', fontSize: 14 }}
              />
            </div>
            
            {/* 排序选项 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>排序：</span>
              <select
                className="input"
                value={docSort}
                onChange={(e) => setDocSort(e.target.value as 'modified' | 'created' | 'title')}
                style={{ fontSize: 12, padding: '4px 8px', minWidth: 'auto' }}
              >
                <option value="modified">最近修改</option>
                <option value="created">创建时间</option>
                <option value="title">标题</option>
              </select>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                共 {filteredAndSortedDocs.length} 个文档
              </span>
            </div>
          </div>
          
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredAndSortedDocs.length === 0 ? (
              <div style={{ 
                padding: 40, 
                textAlign: 'center', 
                color: 'var(--muted)',
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
                    className={`document-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveDocId(doc.id);
                      setShowDocumentList(false);
                      setDocSearch(''); // 清空搜索
                    }}
                    style={{
                      padding: 16,
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      transition: 'all 0.2s ease'
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
                          whiteSpace: 'nowrap'
                        }}>
                          {doc.title}
                        </div>
                        
                        {preview && (
                          <div style={{ 
                            fontSize: 12, 
                            color: 'var(--muted)', 
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
                          color: 'var(--muted)',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'center'
                        }}>
                          <span>📅 {doc.modified.toLocaleDateString()}</span>
                          <span>📝 {doc.content.length} 字符</span>
                          <span>⏱️ {Math.ceil(doc.content.length / 200)} 分钟</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                        <button
                          className="button ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateDocument(doc.id);
                          }}
                          style={{ padding: '4px 6px', fontSize: 11 }}
                          title="复制文档"
                        >
                          <FileText size={12} />
                        </button>
                        {documents.length > 1 && (
                          <button
                            className="button ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定要删除"${doc.title}"吗？`)) {
                                deleteDocument(doc.id);
                              }
                            }}
                            style={{ padding: '4px 6px', color: '#ef4444', fontSize: 11 }}
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
            borderTop: '1px solid var(--border)',
            background: 'var(--accent)'
          }}>
            <button
              className="button primary"
              onClick={() => {
                createNewDocument();
                setShowDocumentList(false);
              }}
              style={{ width: '100%', fontSize: 14, padding: 8 }}
            >
              <Plus size={16} />
              新建文档
            </button>
          </div>
        </div>
      )}

      {/* AI 面板 */}
      {showAIPanel && (
        <div className="ai-panel">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wand2 size={16} />
              AI 智能助手
            </h3>
            <button className="button ghost" onClick={() => setShowAIPanel(false)}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 20 }}>
            {/* 功能选择 */}
            <div style={{ marginBottom: 20 }}>
              <strong style={{ marginBottom: 12, display: 'block' }}>选择AI功能:</strong>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {AI_FUNCTIONS.map(func => (
                  <button
                    key={func.key}
                    className={`ai-function-button ${aiFunction === func.key ? 'active' : ''}`}
                    onClick={() => setAiFunction(func.key)}
                    disabled={func.needsSelection && !selectedText.trim()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 12,
                      border: aiFunction === func.key ? '2px solid var(--primary)' : '1px solid var(--border)',
                      borderRadius: 8,
                      background: aiFunction === func.key ? 'rgba(99, 102, 241, 0.1)' : 'var(--cardBg)',
                      cursor: (func.needsSelection && !selectedText.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (func.needsSelection && !selectedText.trim()) ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{func.icon}</span>
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{func.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{func.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 选中文本显示 */}
            {selectedText && (
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--accent)', borderRadius: 8, fontSize: 14 }}>
                <strong>选中文本:</strong>
                <div style={{ marginTop: 8, fontStyle: 'italic', maxHeight: 100, overflow: 'auto' }}>
                  "{selectedText}"
                </div>
              </div>
            )}

            {/* 样式选择（仅改写功能时显示） */}
            {aiFunction === 'rewrite' && (
              <div style={{ marginBottom: 20 }}>
                <strong style={{ marginBottom: 8, display: 'block' }}>改写风格:</strong>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
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
            )}

            {/* 执行按钮（非改写功能） */}
            {aiFunction !== 'rewrite' && (
              <div style={{ marginBottom: 20 }}>
                <button
                  className="button primary"
                  onClick={() => handleAIFunction(aiFunction)}
                  disabled={aiLoading || (AI_FUNCTIONS.find(f => f.key === aiFunction)?.needsSelection && !selectedText.trim())}
                  style={{
                    width: '100%',
                    padding: 12,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    color: 'white',
                    border: 'none',
                    fontWeight: '500'
                  }}
                >
                  {aiLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <RefreshCw size={16} className="spin" />
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
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--accent)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <strong style={{ marginBottom: 8, display: 'block', color: 'var(--primary)' }}>AI 处理结果:</strong>
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: 1.6, 
                  maxHeight: 300, 
                  overflow: 'auto',
                  fontSize: 14
                }}>
                  {aiResult}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    className="button primary"
                    onClick={applyAIResult}
                    style={{ flex: 1 }}
                  >
                    应用结果
                  </button>
                  <button
                    className="button ghost"
                    onClick={() => setAiResult('')}
                  >
                    重新生成
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              快捷键: Ctrl/Cmd + E 快速选择文本进行AI处理
            </div>
          </div>
        </div>
      )}

      {/* 设置面板 */}
      {showSettings && (
        <div className="settings-panel">
          <h3>编辑器设置</h3>

          {/* OpenAI 配置 */}
          <div className="setting-group">
            <h4 style={{ marginBottom: 12, color: 'var(--primary)' }}>🤖 OpenAI API 配置</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>API Key</label>
              <input
                className="input"
                type="password"
                value={openAIConfig.apiKey || ''}
                onChange={(e) => setOpenAIConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                请输入你的OpenAI API Key，用于AI功能
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>模型</label>
                <select
                  className="input"
                  value={openAIConfig.model || 'gpt-3.5-turbo'}
                  onChange={(e) => setOpenAIConfig(prev => ({ ...prev, model: e.target.value }))}
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>
                  创造性 ({openAIConfig.temperature || 0.7})
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={openAIConfig.temperature || 0.7}
                  onChange={(e) => setOpenAIConfig(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>
                最大输出长度: {openAIConfig.maxTokens || 1000}
              </label>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={openAIConfig.maxTokens || 1000}
                onChange={(e) => setOpenAIConfig(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ 
              padding: 12, 
              background: openAIConfig.apiKey ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${openAIConfig.apiKey ? '#10b981' : '#ef4444'}`,
              borderRadius: 8,
              fontSize: 12
            }}>
              {openAIConfig.apiKey ? (
                <span style={{ color: '#10b981' }}>✅ API Key 已配置，AI功能可用</span>
              ) : (
                <span style={{ color: '#ef4444' }}>⚠️ 未配置API Key，将使用本地简化版AI功能</span>
              )}
            </div>
          </div>

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

      {/* 快捷键帮助面板 */}
      {showHelpPanel && (
        <div
          className="modal-overlay"
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
              setShowHelpPanel(false);
            }
          }}
        >
          <div
            className="modal"
            style={{
              background: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: 12,
              padding: 24,
              minWidth: 600,
              maxWidth: 800,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: currentTheme.fg }}>快捷键帮助</h3>
              <button className="button ghost" onClick={() => setShowHelpPanel(false)}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: 14 }}>
              <div>
                <h4 style={{ color: currentTheme.primary, marginBottom: 12 }}>基本编辑</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div><kbd>Ctrl + S</kbd> 保存文档</div>
                  <div><kbd>Ctrl + B</kbd> 加粗文本</div>
                  <div><kbd>Ctrl + I</kbd> 斜体文本</div>
                  <div><kbd>Ctrl + K</kbd> 插入链接</div>
                  <div><kbd>/</kbd> 打开插入菜单</div>
                  <div><kbd>Escape</kbd> 关闭面板/退出禅模式</div>
                </div>

                <h4 style={{ color: currentTheme.primary, marginBottom: 12, marginTop: 20 }}>文档管理</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div><kbd>Ctrl + N</kbd> 新建文档</div>
                  <div><kbd>Ctrl + D</kbd> 文档列表</div>
                  <div><kbd>Ctrl + ,</kbd> 设置面板</div>
                  <div><kbd>F1</kbd> / <kbd>Shift + ?</kbd> 帮助面板</div>
                </div>
              </div>

              <div>
                <h4 style={{ color: currentTheme.primary, marginBottom: 12 }}>AI功能</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div><kbd>Ctrl + E</kbd> AI智能助手</div>
                  <div><kbd>Ctrl + Shift + A</kbd> 学术风格改写</div>
                  <div><kbd>Ctrl + Shift + C</kbd> 创意风格改写</div>
                  <div><kbd>Ctrl + Shift + S</kbd> 简洁风格改写</div>
                  <div><kbd>Ctrl + Shift + B</kbd> 商务风格改写</div>
                  <div><kbd>Ctrl + Shift + F</kbd> 友好风格改写</div>
                  <div><kbd>Ctrl + Shift + T</kbd> 技术风格改写</div>
                </div>

                <h4 style={{ color: currentTheme.primary, marginBottom: 12, marginTop: 20 }}>其他功能</h4>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div>拖拽图片到编辑器上传</div>
                  <div>点击空白区域关闭面板</div>
                  <div>禅模式下ESC退出</div>
                  <div>支持Markdown语法</div>
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: 20, 
              padding: 12, 
              background: currentTheme.accent, 
              borderRadius: 8, 
              fontSize: 12, 
              color: currentTheme.muted
            }}>
              💡 提示：AI改写功能需要先选择文本，然后使用对应的快捷键即可快速改写。所有AI功能都支持本地回退。
            </div>
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

          {/* 主编辑区域 - 重新设计固定尺寸布局 */}
          <div className="editor-area" style={{ 
            width: '100%',
            minWidth: zen ? '100vw' : '800px',
            maxWidth: zen ? '100vw' : '1400px',
            height: zen ? '100vh' : '90vh',
            minHeight: zen ? '100vh' : '90vh',
            margin: zen ? '0' : '0 auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="card" style={{
              padding: zen ? 20 : 20,
              border: zen ? 'none' : undefined,
              boxShadow: zen ? 'none' : undefined,
              background: zen ? 'transparent' : undefined,
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              flex: 1
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

              {/* 编辑器布局 - 真正固定尺寸布局 */}
              <div 
                className="editor-workspace"
                style={{
                  display: 'grid',
                  gridTemplateColumns: showPreview && !zen ? '1fr 8px 1fr' : '1fr',
                  gap: showPreview && !zen ? '0' : '0',
                  width: '100%',
                  height: '100%',
                  minHeight: zen ? 'calc(100vh - 140px)' : 'calc(90vh - 100px)',
                  flex: 1
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* 拖拽覆盖层 */}
                {dragOver && (
                  <div
                    style={{
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
                      zIndex: 10,
                      color: 'var(--primary)',
                      fontSize: 18,
                      fontWeight: 600
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <Image size={48} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                        拖拽图片到此处上传
                      </div>
                      <div style={{ fontSize: 14, opacity: 0.8 }}>
                        支持 JPG, PNG, GIF, WebP 格式，最大 5MB
                      </div>
                    </div>
                  </div>
                )}

                {/* 上传进度条 */}
                {uploadProgress > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      right: 10,
                      height: 4,
                      background: 'var(--accent)',
                      borderRadius: 2,
                      zIndex: 15
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: 2,
                        width: `${uploadProgress}%`,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                )}

                {/* 编辑区域 */}
                <div className="editor-pane" style={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: zen ? 'calc(100vh - 140px)' : 'calc(90vh - 100px)'
                }}>
                  <textarea
                    ref={textRef}
                    className="textarea"
                    style={{
                      fontSize: fontSize,
                      lineHeight: 1.6,
                      width: '100%',
                      height: '100%',
                      minHeight: zen ? 'calc(100vh - 180px)' : 'calc(90vh - 140px)',
                      background: zen ? 'transparent' : undefined,
                      border: zen ? 'none' : undefined,
                      outline: zen ? 'none' : undefined,
                      flex: 1,
                      boxSizing: 'border-box',
                      resize: 'none'
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
                  <div className="preview-section" style={{ 
                    minHeight: 'calc(90vh - 100px)', 
                    height: 'calc(90vh - 100px)', 
                    maxHeight: 'calc(90vh - 100px)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
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
                        height: 'calc(90vh - 140px)',
                        minHeight: 'calc(90vh - 140px)',
                        maxHeight: 'calc(90vh - 140px)',
                        flex: 1,
                        boxSizing: 'border-box'
                      }}
                    >
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          img: ({node, src, alt, ...props}) => {
                            console.log('🖼️ ReactMarkdown 接收到图片参数:', {
                              src: src ? (src.length > 100 ? src.substring(0, 100) + '...' : src) : 'undefined/null',
                              srcLength: src?.length || 0,
                              alt,
                              isBase64: src?.startsWith('data:image/'),
                              isImageId: src?.startsWith('img_'),
                              props
                            });
                            
                            // 如果src为空或undefined，尝试从props中获取
                            let actualSrc = src || props.src;
                            
                            // 检查是否是图片ID引用
                            if (actualSrc?.startsWith('img_')) {
                              const imageData = imageDataMap.get(actualSrc);
                              if (imageData) {
                                console.log('📷 使用图片ID引用，找到对应数据:', {
                                  imageId: actualSrc,
                                  dataLength: imageData.length
                                });
                                actualSrc = imageData;
                              } else {
                                console.error('❌ 图片ID引用无效:', actualSrc);
                                return (
                                  <div style={{
                                    border: '2px dashed #ef4444',
                                    padding: '20px',
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    textAlign: 'center',
                                    borderRadius: 8,
                                    margin: '16px 0'
                                  }}>
                                    ❌ 图片ID引用无效
                                    <br />
                                    <small>ID: {actualSrc}</small>
                                  </div>
                                );
                              }
                            }
                            
                            const isBase64 = actualSrc?.startsWith('data:image/');
                            
                            if (!actualSrc) {
                              console.error('❌ 图片src为空，无法渲染');
                              return (
                                <div style={{
                                  border: '2px dashed #ef4444',
                                  padding: '20px',
                                  background: '#fef2f2',
                                  color: '#ef4444',
                                  textAlign: 'center',
                                  borderRadius: 8,
                                  margin: '16px 0'
                                }}>
                                  ❌ 图片源地址为空
                                  <br />
                                  <small>alt: {alt}</small>
                                  <br />
                                  <small>原始src: {src}</small>
                                </div>
                              );
                            }
                            
                            // 添加base64图片的特殊处理
                            if (isBase64 && actualSrc) {
                              // 验证base64格式
                              const [header, data] = actualSrc.split(',');
                              if (!header || !data) {
                                console.error('❌ 无效的base64格式:', actualSrc.substring(0, 100));
                                return (
                                  <div style={{
                                    border: '2px dashed #ef4444',
                                    padding: '20px',
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    textAlign: 'center',
                                    borderRadius: 8,
                                    margin: '16px 0'
                                  }}>
                                    ❌ Base64图片格式错误
                                  </div>
                                );
                              }
                              
                              console.log('📷 Base64图片详情:', {
                                alt: alt,
                                mimeType: header,
                                dataLength: data.length,
                                isValidFormat: header.includes('data:image/')
                              });
                            }
                            
                            return (
                              <div style={{ margin: '16px 0' }}>
                                {/* 调试信息 */}
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#666', 
                                  marginBottom: '8px',
                                  fontFamily: 'monospace',
                                  background: '#f5f5f5',
                                  padding: '4px 8px',
                                  borderRadius: '4px'
                                }}>
                                  🖼️ {isBase64 ? `Base64图片 (${actualSrc?.length} 字符)` : `外部图片: ${actualSrc}`}
                                  {src?.startsWith('img_') && <span style={{color: '#10b981'}}> [ID引用]</span>}
                                </div>
                                
                                <img 
                                  {...props}
                                  src={actualSrc}
                                  alt={alt || '图片'}
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: 8,
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    display: 'block',
                                    border: isBase64 ? '2px solid #10b981' : '1px solid #ddd'
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    console.error('❌ 图片加载失败详情:', {
                                      originalSrc: src,
                                      actualSrc: actualSrc,
                                      srcFromTarget: target.src,
                                      alt: target.alt,
                                      isBase64: isBase64,
                                      isImageId: src?.startsWith('img_'),
                                      naturalWidth: target.naturalWidth,
                                      naturalHeight: target.naturalHeight,
                                      error: '图片无法解码或加载'
                                    });
                                    
                                    // 简单地修改样式，不操作DOM结构
                                    target.style.display = 'none';
                                    
                                    // 在父元素中添加错误提示
                                    const errorDiv = document.createElement('div');
                                    errorDiv.className = 'image-error-placeholder';
                                    errorDiv.style.cssText = `
                                      border: 2px dashed #ef4444;
                                      padding: 20px;
                                      background: #fef2f2;
                                      color: #ef4444;
                                      text-align: center;
                                      font-size: 14px;
                                      border-radius: 8px;
                                      margin: 16px 0;
                                      min-height: 80px;
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      flex-direction: column;
                                    `;
                                    
                                    let errorMessage: string;
                                    if (isBase64) {
                                      const [header, data] = actualSrc.split(',');
                                      errorMessage = `❌ Base64图片显示失败<br/><small style="opacity: 0.8">数据: ${header}<br/>长度: ${data?.length || 0} 字符</small>`;
                                    } else if (actualSrc?.includes('图片处理失败')) {
                                      errorMessage = '❌ 图片处理失败<br/><small style="opacity: 0.8">请重新上传图片</small>';
                                    } else {
                                      const shortSrc = actualSrc && actualSrc.length > 50 ? actualSrc.substring(0, 50) + '...' : actualSrc || '无图片地址';
                                      errorMessage = `❌ 图片加载失败<br/><small style="opacity: 0.8">${shortSrc}</small>`;
                                    }
                                    
                                    errorDiv.innerHTML = errorMessage;
                                    
                                    // 安全地插入错误信息
                                    if (target.parentElement && !target.parentElement.querySelector('.image-error-placeholder')) {
                                      target.parentElement.appendChild(errorDiv);
                                    }
                                  }}
                                  onLoad={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    console.log('✅ 图片加载成功:', {
                                      src: isBase64 ? `Base64图片 (${actualSrc?.length} 字符)` : actualSrc,
                                      width: target.naturalWidth,
                                      height: target.naturalHeight,
                                      alt: target.alt,
                                      usedImageId: src?.startsWith('img_')
                                    });
                                    
                                    // 移除任何错误提示
                                    const errorPlaceholder = target.parentElement?.querySelector('.image-error-placeholder');
                                    if (errorPlaceholder) {
                                      errorPlaceholder.remove();
                                    }
                                  }}
                                  loading="lazy"
                                />
                              </div>
                            );
                          },
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
          <div>快捷键：Ctrl+S 保存 • Ctrl+B 加粗 • Ctrl+I 斜体 • Ctrl+K 链接 • Ctrl+E AI处理 • Ctrl+N 新建 • Ctrl+D 文档列表 • Ctrl+, 设置 • F1 帮助</div>
          <div>AI改写：Ctrl+Shift+A 学术 • Ctrl+Shift+C 创意 • Ctrl+Shift+S 简洁 • Ctrl+Shift+B 商务 • Ctrl+Shift+F 友好 • Ctrl+Shift+T 技术</div>
          <div>本地自动保存 • 无打扰写作 • {documents.length} 个文档 • 支持拖拽上传 • ESC退出禅模式</div>
        </div>
      )}
    </div>
  );
}