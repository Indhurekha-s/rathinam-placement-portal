import React from 'react';

export default function ChartComponent({ type, data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        height: '240px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.85rem'
      }}>
        No statistical data available.
      </div>
    );
  }

  // Helper to render Bar Chart (Vertical)
  const renderBarChart = () => {
    const width = 500;
    const height = 240;
    const paddingLeft = 40;
    const paddingBottom = 40;
    const paddingTop = 20;
    const paddingRight = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Find max value
    const maxVal = Math.max(...data.map(d => d.value || 0), 1);
    
    // Y Axis Ticks
    const yTicks = [0, Math.round(maxVal / 2), maxVal];

    // Bar variables
    const barWidth = Math.min(36, chartWidth / data.length - 12);
    const spacing = (chartWidth - (barWidth * data.length)) / (data.length + 1);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
        {/* Horizontal Grid lines */}
        {yTicks.map((tick, i) => {
          const y = chartHeight + paddingTop - (tick / maxVal) * chartHeight;
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="var(--border-glass)" 
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                fill="var(--text-secondary)" 
                fontSize="10" 
                textAnchor="end"
                fontWeight="600"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, i) => {
          const x = paddingLeft + spacing + i * (barWidth + spacing);
          const barHeight = ((item.value || 0) / maxVal) * chartHeight;
          const y = chartHeight + paddingTop - barHeight;

          // College Portal Theme Colors (Burgundy, Gold, Navy, Forest Green, Amber)
          const colors = [
            '#6D1F3B', // Burgundy
            '#C9A227', // Gold
            '#0369a1', // Navy
            '#15803d', // Forest Green
            '#b45309', // Deep Amber
            '#4A1428', // Dark Burgundy
            '#64748b'  // Cool Grey
          ];
          const color = colors[i % colors.length];

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={3}
                style={{ transition: 'all 0.3s ease' }}
              />
              {/* Value label on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fill="#252525"
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
              >
                {item.value}
              </text>
              {/* Label on X axis */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + paddingTop + 16}
                fill="var(--text-primary)"
                fontSize="9"
                fontWeight="600"
                textAnchor="middle"
                transform={`rotate(-12, ${x + barWidth / 2}, ${chartHeight + paddingTop + 16})`}
              >
                {item.label}
              </text>
            </g>
          );
        })}

        {/* Base X Line */}
        <line
          x1={paddingLeft}
          y1={chartHeight + paddingTop}
          x2={width - paddingRight}
          y2={chartHeight + paddingTop}
          stroke="rgba(109, 31, 59, 0.15)"
          strokeWidth={1.5}
        />
      </svg>
    );
  };

  // Helper to render Donut (Pie) Chart
  const renderDonutChart = () => {
    const size = 220;
    const center = size / 2;
    const radius = 72;
    const strokeWidth = 20;
    const circum = 2 * Math.PI * radius;

    // Sum values
    const total = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1;
    
    let currentAngleOffset = 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center', height: '240px' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {data.map((item, i) => {
            const percentage = (item.value || 0) / total;
            const strokeLength = percentage * circum;
            const strokeOffset = circum - strokeLength + currentAngleOffset;
            currentAngleOffset -= strokeLength;

            // Colors mapping: Burgundy, Grey/Gold
            const colors = [
              '#6D1F3B', // Burgundy
              'rgba(109, 31, 59, 0.15)', // light burgundy-grey for unplaced
              '#C9A227',
              '#4A1428'
            ];
            const color = colors[i % colors.length];

            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${strokeLength} ${circum}`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: 'all 0.5s ease' }}
              />
            );
          })}
          
          {/* Inner details text */}
          <text x={center} y={center - 2} textAnchor="middle" fill="#6D1F3B" fontSize="20" fontWeight="800" fontFamily="var(--font-title)">
            {data[0]?.label === 'Placed' ? `${Math.round((data[0].value / total) * 100)}%` : total}
          </text>
          <text x={center} y={center + 14} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontWeight="700" textTransform="uppercase" letterSpacing="0.5px">
            {data[0]?.label === 'Placed' ? 'Placed Rate' : 'Total base'}
          </text>
        </svg>

        {/* Legend list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((item, i) => {
            const colors = [
              '#6D1F3B',
              'rgba(109, 31, 59, 0.25)',
              '#C9A227',
              '#4A1428'
            ];
            const color = colors[i % colors.length];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: color }} />
                <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}:</span>
                <span style={{ color: '#252525', fontWeight: '700' }}>{item.value} ({Math.round(((item.value || 0)/total)*100)}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Switch rendering
  if (type === 'donut' || type === 'pie') {
    return renderDonutChart();
  }
  return renderBarChart();
}
