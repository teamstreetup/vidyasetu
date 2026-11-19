import React from 'react';

export const ProgressBar: React.FC<{ value: number; color?: string; height?: string }> = ({
  value,
  color = '#2563eb',
  height = 'h-2',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${height}`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
};

export const AccuracyTrendChart: React.FC<{
  data: Array<{ date: string; attempted: number; accuracy: number }>;
}> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-slate-400">
        Complete a few practice questions to visualize your learning trend.
      </div>
    );
  }

  const width = 480;
  const height = 170;
  const padX = 36;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? padX + innerW / 2 : padX + (i / (data.length - 1)) * innerW;
    const y = padY + innerH - (d.accuracy / 100) * innerH;
    return { ...d, x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${points[0].x},${padY + innerH} ${polyline} ${points[points.length - 1].x},${padY + innerH}`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padY + innerH - (tick / 100) * innerH;
          return (
            <g key={tick}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padX - 6} y={y + 3} fontSize="10" fill="#94a3b8" textAnchor="end">
                {tick}%
              </text>
            </g>
          );
        })}
        <polygon points={area} fill="url(#accGrad)" opacity="0.25" />
        <defs>
          <linearGradient id="accGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
        {points.map((p) => (
          <g key={p.date}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#fff" stroke="#2563eb" strokeWidth="2.5" />
            <text x={p.x} y={height - 4} fontSize="10" fill="#64748b" textAnchor="middle">
              {p.date.slice(5)}
            </text>
            <title>{`${p.date}: ${p.accuracy}% accuracy (${p.attempted} Qs)`}</title>
          </g>
        ))}
      </svg>
    </div>
  );
};
