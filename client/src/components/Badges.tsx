import React from 'react';
import { CloudOff, Cloud, CheckCircle2, Clock, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import type { Difficulty, SyncStatus } from '../types';

export const DifficultyBadge: React.FC<{ difficulty: Difficulty | string }> = ({ difficulty }) => {
  const styles: Record<string, string> = {
    Easy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    Medium: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    Hard: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold rounded-md ring-1 ring-inset ${
        styles[difficulty] || 'bg-slate-100 text-slate-700 ring-slate-300'
      }`}
    >
      {difficulty}
    </span>
  );
};

export const OfflineAvailabilityBadge: React.FC<{ downloaded: boolean; compact?: boolean }> = ({ downloaded, compact }) => {
  if (downloaded) {
    return (
      <span
        title="Downloaded to IndexedDB — accessible without internet"
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
      >
        <Check className="w-3 h-3 stroke-[2.5]" />
        {compact ? 'Offline Ready' : 'Downloaded • Offline Ready'}
      </span>
    );
  }
  return (
    <span
      title="Requires internet connection unless downloaded"
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100/90 text-slate-600 ring-1 ring-inset ring-slate-200"
    >
      <Cloud className="w-3 h-3 text-slate-400" />
      Online Only
    </span>
  );
};

export const SyncStatusBadge: React.FC<{ status: SyncStatus; pendingCount: number }> = ({ status, pendingCount }) => {
  if (status === 'Syncing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Syncing…
      </span>
    );
  }
  if (status === 'Failed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
        <AlertTriangle className="w-3.5 h-3.5" />
        Sync Failed ({pendingCount})
      </span>
    );
  }
  if (status === 'Pending' || pendingCount > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25 tabular-nums">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Pending ({pendingCount})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
      Synced
    </span>
  );
};

export const ConnectivityPill: React.FC<{ isOnline: boolean; simulatedOffline: boolean; onToggle: () => void }> = ({
  isOnline,
  simulatedOffline,
  onToggle,
}) => {
  return (
    <button
      onClick={onToggle}
      title={simulatedOffline ? 'Click to restore internet connection' : 'Click to simulate Offline Mode'}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg ring-1 ring-inset transition cursor-pointer ${
        isOnline
          ? 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
          : 'bg-amber-50 text-amber-900 ring-amber-300 hover:bg-amber-100'
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </span>
      {isOnline ? (
        <span>Online</span>
      ) : (
        <span className="inline-flex items-center gap-1">
          <CloudOff className="w-3.5 h-3.5 text-amber-700" />
          {simulatedOffline ? 'Offline (Sim)' : 'Offline'}
        </span>
      )}
    </button>
  );
};

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
