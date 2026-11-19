import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { formatRelativeTime } from '../../components/Badges';

interface SyncMonitorData {
  logs: Array<{
    id: string;
    userName: string;
    userEmail: string;
    village: string;
    status: string;
    attemptsSynced: number;
    examsSynced: number;
    contentVersion: number;
    errorMessage: string;
    deviceInfo: string;
    createdAt: string;
  }>;
  studentSyncSummary: Array<{
    id: string;
    name: string;
    email: string;
    grade: string;
    village: string;
    lastSyncAt: string | null;
  }>;
}

export const AdminSyncMonitoring: React.FC = () => {
  const [data, setData] = useState<SyncMonitorData | null>(null);

  useEffect(() => {
    apiFetch<SyncMonitorData>('/admin/sync-logs').then(setData);
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-500">Loading synchronization telemetry…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" />
          Synchronization Monitoring
        </h1>
      </div>

      {/* Student Last Sync Grid */}
      <div className="card-surface rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Student Device Last Sync Overview</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.studentSyncSummary.map((st) => (
            <div key={st.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <div>
                <div className="font-bold text-sm text-slate-900">{st.name}</div>
                <div className="text-xs text-slate-500">
                  {st.grade} • {st.village}
                </div>
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full shrink-0">
                {formatRelativeTime(st.lastSyncAt)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Event Table */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 font-bold text-slate-900">Recent Synchronization Events</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Uploaded Data</th>
                <th className="px-5 py-3">Device / Version</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-slate-900">{log.userName}</div>
                    <div className="text-xs text-slate-400">{log.village}</div>
                  </td>
                  <td className="px-5 py-3">
                    {log.status === 'Synced' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" /> {log.status}
                      </span>
                    )}
                    {log.errorMessage && <div className="text-[11px] text-rose-600 mt-0.5">{log.errorMessage}</div>}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-700">
                    {log.attemptsSynced} practice • {log.examsSynced} exam(s)
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {log.deviceInfo} • v{log.contentVersion}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{formatRelativeTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
