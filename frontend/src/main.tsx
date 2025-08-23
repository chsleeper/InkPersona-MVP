import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          background: '#f8fafc'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            maxWidth: '480px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>😵</div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#1f2937'
            }}>
              应用出现错误
            </h2>
            <p style={{
              color: '#6b7280',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              InkPersona 遇到了一个意外错误。<br />
              请刷新页面重试，如果问题持续存在，请联系支持。
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                刷新页面
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                style={{
                  background: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                重试
              </button>
            </div>
            {this.state.error && (
              <details style={{
                marginTop: '20px',
                textAlign: 'left',
                background: '#f3f4f6',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '500' }}>
                  错误详情
                </summary>
                <pre style={{
                  margin: '8px 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 浏览器兼容性检查
function checkBrowserCompatibility() {
  const requiredFeatures = [
    'fetch',
    'Promise',
    'localStorage',
    'JSON',
    'URL'
  ];

  const missingFeatures = requiredFeatures.filter(feature => {
    return typeof window[feature as keyof Window] === 'undefined';
  });

  if (missingFeatures.length > 0) {
    console.warn('浏览器缺少必要功能:', missingFeatures);
    return false;
  }

  return true;
}

// 隐藏加载屏幕
function hideLoadingScreen() {
  try {
    const loadingScreen = document.getElementById('loading-screen');
    const root = document.getElementById('root');

    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }

    if (root) {
      root.classList.add('loaded');
    }

    console.log('InkPersona 加载完成');
  } catch (error) {
    console.warn('隐藏加载屏幕时出错:', error);
  }
}

// 应用初始化
function initializeApp() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Root element not found');
    return;
  }

  try {
    // 检查浏览器兼容性
    if (!checkBrowserCompatibility()) {
      rootElement.innerHTML = `
        <div style="
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: ui-sans-serif, system-ui, sans-serif;
          background: #f8fafc;
        ">
          <div style="
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            max-width: 480px;
          ">
            <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
            <h2>浏览器不兼容</h2>
            <p>您的浏览器版本过旧，无法运行 InkPersona。请更新到最新版本的现代浏览器。</p>
          </div>
        </div>
      `;
      return;
    }

    // 创建 React 根
    const reactRoot = createRoot(rootElement);

    // 渲染应用
    reactRoot.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );

    // 应用渲染成功后隐藏加载屏幕
    setTimeout(hideLoadingScreen, 100);

    console.log('InkPersona 应用初始化成功');

  } catch (error) {
    console.error('应用初始化失败:', error);

    // 显示错误页面
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        background: #f8fafc;
      ">
        <div style="
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          max-width: 480px;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
          <h2>应用初始化失败</h2>
          <p>InkPersona 无法正常启动。请检查浏览器兼容性或刷新页面重试。</p>
          <button 
            onclick="window.location.reload()"
            style="
              background: #6366f1;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              margin-top: 16px;
            "
          >重新加载</button>
        </div>
      </div>
    `;
  }
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason);
});

// 启动应用
function bootstrap() {
  console.log('InkPersona 启动中...');

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    // DOM 已经就绪
    setTimeout(initializeApp, 0);
  }

  // 备用：5秒后强制隐藏加载屏幕
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && loadingScreen.style.display !== 'none') {
      console.warn('强制隐藏加载屏幕');
      hideLoadingScreen();
    }
  }, 5000);
}

// 立即启动
bootstrap();