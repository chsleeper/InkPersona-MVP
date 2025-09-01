import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  chart: string;
  className?: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ chart, className = '' }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!chart || !chartRef.current) return;

    // 初始化Mermaid
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

    const renderChart = async () => {
      try {
        setError('');
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${Date.now()}`, chart);
        setSvg(renderedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : '图表渲染失败');
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className={`mermaid-error ${className}`} style={{
        padding: '16px',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        fontSize: '14px'
      }}>
        <strong>图表渲染错误：</strong>
        <pre style={{ margin: '8px 0', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
          {error}
        </pre>
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
          原始图表代码：
          <pre style={{ margin: '4px 0', backgroundColor: '#f3f4f6', padding: '8px', borderRadius: '4px' }}>
            {chart}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={`mermaid-chart ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100px',
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        margin: '16px 0'
      }}
    />
  );
};

export default MermaidChart;