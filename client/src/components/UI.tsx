import React from 'react';
import { ProgressBar } from './Charts';

type Tone = 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';

const toneMap: Record<Tone, { well: string; icon: string; value: string; bar: string }> = {
  blue: { well: 'bg-blue-50 ring-blue-100', icon: 'text-blue-600', value: 'text-slate-900', bar: '#2563eb' },
  emerald: { well: 'bg-emerald-50 ring-emerald-100', icon: 'text-emerald-600', value: 'text-emerald-700', bar: '#059669' },
  amber: { well: 'bg-amber-50 ring-amber-100', icon: 'text-amber-600', value: 'text-amber-700', bar: '#d97706' },
  rose: { well: 'bg-rose-50 ring-rose-100', icon: 'text-rose-600', value: 'text-rose-700', bar: '#e11d48' },
  indigo: { well: 'bg-indigo-50 ring-indigo-100', icon: 'text-indigo-600', value: 'text-slate-900', bar: '#4f46e5' },
  slate: { well: 'bg-slate-100 ring-slate-200', icon: 'text-slate-600', value: 'text-slate-900', bar: '#334155' },
};

export const KpiCard: React.FC<{
  label: string;
  value: string | number;
  meta?: string;
  icon: React.FC<{ className?: string }>;
  tone?: Tone;
  progress?: number;
}> = ({ label, value, meta, icon: Icon, tone = 'blue', progress }) => {
  const styles = toneMap[tone];
  return (
    <div className="card-surface rounded-2xl p-5 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center shrink-0 ${styles.well}`}>
          <Icon className={`w-4 h-4 ${styles.icon}`} />
        </div>
      </div>
      <div>
        <div className={`text-2xl sm:text-[26px] font-extrabold tracking-tight tabular-nums leading-none ${styles.value}`}>
          {value}
        </div>
        {progress !== undefined ? (
          <div className="mt-3">
            <ProgressBar value={progress} color={styles.bar} height="h-1.5" />
          </div>
        ) : (
          meta && <div className="text-xs text-slate-500 mt-1.5 font-medium">{meta}</div>
        )}
      </div>
    </div>
  );
};

export const CircularProgress: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}> = ({ value, size = 84, strokeWidth = 7, color = '#fbbf24', trackColor = 'rgba(255,255,255,0.16)', label }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-extrabold tabular-nums leading-none">{clamped}%</span>
        {label && <span className="text-[10px] opacity-80 font-medium mt-0.5">{label}</span>}
      </div>
    </div>
  );
};

export const SkeletonPage: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="space-y-6 animate-pulse">
    <div className="h-8 w-56 bg-slate-200/80 rounded-lg" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200/80 p-5 space-y-3">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-7 w-16 bg-slate-200 rounded" />
          <div className="h-2 w-full bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-slate-200/80" />
      <div className="h-64 bg-white rounded-2xl border border-slate-200/80" />
    </div>
  </div>
);

export const EmptyState: React.FC<{
  icon: React.FC<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3.5">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
