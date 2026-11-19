import React, { useState } from 'react';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  Database,
  Clock,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { SyncStatusBadge, formatRelativeTime } from '../../components/Badges';
import { EmptyState } from '../../components/UI';

export const OfflineSyncPage: React.FC = () => {
  const {
    isOnline,
    simulatedOffline,
    toggleSimulatedOffline,
    syncStatus,
    lastSyncError,
    lastSyncAt,
    pendingCount,
    pendingPracticeCount,
    pendingExamCount,
    downloadedTopics,
    downloadedExams,
    localContentVersion,
    serverContentVersion,
    updateAvailable,
    releaseNotes,
    syncLogs,
    syncNow,
    checkContentUpdates,
    refreshDownloadedUpdates,
    removeDownloadedTopic,
    removeDownloadedExam,
  } = useOffline();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [updatingContent, setUpdatingContent] = useState(false);

  const handleManualSync = async () => {
    const res = await syncNow();
    setFeedback(res.message);
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleUpdateContent = async () => {
    setUpdatingContent(true);
    try {
      await refreshDownloadedUpdates();
      setFeedback(`Updated all downloaded topics and exams to Content Pack v${serverContentVersion}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdatingContent(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Offline & Synchronization Center</h1>

        <button
          onClick={() => void handleManualSync()}
          disabled={!isOnline || syncStatus === 'Syncing'}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-40 font-semibold text-sm cursor-pointer self-start"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus === 'Syncing' ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-medium animate-fade-in">
          {feedback}
        </div>
      )}

      {lastSyncError && syncStatus === 'Failed' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Last sync error: {lastSyncError}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        <div className="card-surface rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Connectivity</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>
            </div>
            <div className="font-display text-xl font-extrabold text-slate-900">
              {isOnline ? 'Connected' : simulatedOffline ? 'Offline (Simulated)' : 'No Internet'}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Toggle Offline Simulation Mode to test IndexedDB practice and automatic sync recovery.
            </p>
          </div>
          <button
            onClick={toggleSimulatedOffline}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
              simulatedOffline
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            {simulatedOffline ? 'Restore Internet (Go Online & Auto-Sync)' : 'Simulate Offline Mode'}
          </button>
        </div>

        <div className="card-surface rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">IndexedDB Sync Queue</span>
            <SyncStatusBadge status={syncStatus} pendingCount={pendingCount} />
          </div>
          <div className="font-display text-xl font-extrabold text-slate-900 tabular-nums">{pendingCount} Pending Records</div>
          <div className="text-xs text-slate-600 space-y-1.5 pt-1 tabular-nums">
            <div className="flex justify-between"><span>Practice attempts queued</span><strong className="text-slate-900">{pendingPracticeCount}</strong></div>
            <div className="flex justify-between"><span>Mock exams queued</span><strong className="text-slate-900">{pendingExamCount}</strong></div>
            <div className="flex justify-between"><span>Last successful sync</span><strong className="text-slate-900">{formatRelativeTime(lastSyncAt)}</strong></div>
          </div>
        </div>

        <div className="card-surface rounded-2xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Content Pack</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-xl font-extrabold text-slate-900 tabular-nums">
              Local v{localContentVersion} <span className="text-sm font-medium text-slate-400">/ Server v{serverContentVersion}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {releaseNotes || 'All downloaded packs are synced with the latest Olympiad question bank.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void checkContentUpdates()}
              disabled={!isOnline}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              Check Updates
            </button>
            {updateAvailable && (
              <button
                onClick={() => void handleUpdateContent()}
                disabled={!isOnline || updatingContent}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {updatingContent ? 'Updating…' : 'Update Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Downloaded Content Managers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Download className="w-4 h-4 text-emerald-600" />
              Downloaded Topics ({downloadedTopics.length})
            </h2>
          </div>
          {downloadedTopics.length === 0 ? (
            <EmptyState icon={Download} title="No topics downloaded yet" description="Download chapters from Subjects & Topics for offline practice." />
          ) : (
            <div className="divide-y divide-slate-100">
              {downloadedTopics.map((dt) => (
                <div key={dt.topicId} className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{dt.title}</div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {dt.questionCount} questions • v{dt.contentVersion} • {formatRelativeTime(dt.downloadedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => void removeDownloadedTopic(dt.topicId)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Remove from offline storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Download className="w-4 h-4 text-blue-600" />
              Downloaded Mock Exams ({downloadedExams.length})
            </h2>
          </div>
          {downloadedExams.length === 0 ? (
            <EmptyState icon={Download} title="No mock exams downloaded yet" description="Download tests from Mock Exams to attempt them offline." />
          ) : (
            <div className="divide-y divide-slate-100">
              {downloadedExams.map((de) => (
                <div key={de.examId} className="px-6 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{de.title}</div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {de.questionCount} questions • v{de.contentVersion} • {formatRelativeTime(de.downloadedAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => void removeDownloadedExam(de.examId)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Remove from offline storage"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sync Activity Log */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 font-display font-bold text-slate-900 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Synchronization History
        </div>
        {syncLogs.length === 0 ? (
          <EmptyState icon={Clock} title="No sync events recorded yet" description="Synchronization activity on this device will appear here." />
        ) : (
          <div className="divide-y divide-slate-100">
            {syncLogs.map((log) => (
              <div key={log.id} className="px-6 py-3.5 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${log.status === 'Synced' ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <div>
                    <div className="font-medium text-slate-800">{log.message}</div>
                    <div className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ring-1 ring-inset ${
                    log.status === 'Synced'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                  }`}
                >
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
