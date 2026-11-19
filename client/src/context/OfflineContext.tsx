import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch, isEffectivelyOnline, isSimulatedOffline, setSimulatedOffline } from '../lib/api';
import {
  getCache,
  getLocalDB,
  putCache,
  type DownloadedExamRecord,
  type DownloadedTopicRecord,
} from '../lib/db';
import type { ExamAttempt, LocalSyncLog, MockExam, PracticeAttempt, Question, Subject, SyncStatus, Topic } from '../types';
import { useAuth } from './AuthContext';

interface OfflineContextValue {
  isOnline: boolean;
  simulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  syncStatus: SyncStatus;
  lastSyncError: string | null;
  lastSyncAt: string | null;
  pendingCount: number;
  pendingPracticeCount: number;
  pendingExamCount: number;
  downloadedTopics: DownloadedTopicRecord[];
  downloadedTopicIds: Set<string>;
  downloadedExams: DownloadedExamRecord[];
  downloadedExamIds: Set<string>;
  localContentVersion: number;
  serverContentVersion: number;
  updateAvailable: boolean;
  releaseNotes: string;
  syncLogs: LocalSyncLog[];
  busyDownloads: Set<string>;
  downloadTopic: (topicId: string) => Promise<void>;
  downloadSubject: (subjectId: string) => Promise<void>;
  removeDownloadedTopic: (topicId: string) => Promise<void>;
  downloadExam: (examId: string) => Promise<void>;
  removeDownloadedExam: (examId: string) => Promise<void>;
  recordPracticeAttempt: (attempt: Omit<PracticeAttempt, 'id' | 'synced' | 'offlineRecorded'> & { id?: string }) => Promise<PracticeAttempt>;
  recordExamAttempt: (attempt: Omit<ExamAttempt, 'id' | 'synced' | 'offlineRecorded'> & { id?: string }) => Promise<ExamAttempt>;
  syncNow: () => Promise<{ ok: boolean; message: string }>;
  checkContentUpdates: () => Promise<void>;
  refreshDownloadedUpdates: () => Promise<void>;
  refreshState: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const [simulated, setSimulated] = useState(isSimulatedOffline());
  const isOnline = browserOnline && !simulated;

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('Synced');
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pendingPracticeCount, setPendingPracticeCount] = useState(0);
  const [pendingExamCount, setPendingExamCount] = useState(0);
  const [downloadedTopics, setDownloadedTopics] = useState<DownloadedTopicRecord[]>([]);
  const [downloadedExams, setDownloadedExams] = useState<DownloadedExamRecord[]>([]);
  const [localContentVersion, setLocalContentVersion] = useState(1);
  const [serverContentVersion, setServerContentVersion] = useState(1);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [syncLogs, setSyncLogs] = useState<LocalSyncLog[]>([]);
  const [busyDownloads, setBusyDownloads] = useState<Set<string>>(new Set());

  const syncingRef = useRef(false);

  const pendingCount = pendingPracticeCount + pendingExamCount;
  const downloadedTopicIds = new Set(downloadedTopics.map((d) => d.topicId));
  const downloadedExamIds = new Set(downloadedExams.map((d) => d.examId));
  const updateAvailable = serverContentVersion > localContentVersion && (downloadedTopics.length > 0 || downloadedExams.length > 0);

  const refreshState = useCallback(async () => {
    const db = await getLocalDB();
    const [dTopics, dExams, allPractice, allExams, logs, savedSyncAt, savedVersion] = await Promise.all([
      db.getAll('downloadedTopics'),
      db.getAll('downloadedExams'),
      db.getAll('practiceAttempts'),
      db.getAll('examAttempts'),
      db.getAll('syncLogs'),
      getCache<string>('lastSyncAt'),
      getCache<number>('localContentVersion'),
    ]);

    const unsyncedP = allPractice.filter((p) => !p.synced).length;
    const unsyncedE = allExams.filter((e) => !e.synced).length;

    setDownloadedTopics(dTopics.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt)));
    setDownloadedExams(dExams.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt)));
    setPendingPracticeCount(unsyncedP);
    setPendingExamCount(unsyncedE);
    setSyncLogs(logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 20));
    if (savedSyncAt) setLastSyncAt(savedSyncAt);
    if (savedVersion) setLocalContentVersion(savedVersion);

    if (!syncingRef.current) {
      if (unsyncedP + unsyncedE > 0) {
        setSyncStatus((prev) => (prev === 'Failed' ? 'Failed' : 'Pending'));
      } else {
        setSyncStatus('Synced');
      }
    }
  }, []);

  const checkContentUpdates = useCallback(async () => {
    if (!isEffectivelyOnline() || !user) return;
    try {
      const info = await apiFetch<{ contentVersion: number; lastPublishedAt: string; releaseNotes: string }>('/content/version');
      setServerContentVersion(info.contentVersion);
      setReleaseNotes(info.releaseNotes);
      await putCache('serverContentVersion', info.contentVersion);
    } catch {
      // ignore if offline
    }
  }, [user]);

  const syncNow = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!user) return { ok: false, message: 'Not signed in' };
    if (!isEffectivelyOnline()) {
      setSyncStatus(pendingCount > 0 ? 'Pending' : 'Synced');
      return { ok: false, message: 'Device is offline. Data remains safely saved in IndexedDB.' };
    }
    if (syncingRef.current) return { ok: false, message: 'Sync already in progress' };

    syncingRef.current = true;
    setSyncStatus('Syncing');
    setLastSyncError(null);

    try {
      const db = await getLocalDB();
      const allPractice = await db.getAll('practiceAttempts');
      const allExams = await db.getAll('examAttempts');
      const pendingPractice = allPractice.filter((p) => !p.synced);
      const pendingExams = allExams.filter((e) => !e.synced);

      const res = await apiFetch<{
        status: string;
        syncedAttempts: number;
        syncedExams: number;
        syncedAt: string;
        serverContentVersion: number;
        updateAvailable: boolean;
        releaseNotes: string;
      }>('/sync', {
        method: 'POST',
        body: JSON.stringify({
          practiceAttempts: pendingPractice,
          examAttempts: pendingExams,
          clientContentVersion: localContentVersion,
          deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile PWA' : 'Desktop Web PWA',
        }),
      });

      // Mark items as synced in IndexedDB
      const tx1 = db.transaction('practiceAttempts', 'readwrite');
      for (const p of pendingPractice) {
        await tx1.store.put({ ...p, synced: true });
      }
      await tx1.done;

      const tx2 = db.transaction('examAttempts', 'readwrite');
      for (const e of pendingExams) {
        await tx2.store.put({ ...e, synced: true });
      }
      await tx2.done;

      const logEntry: LocalSyncLog = {
        id: makeId(),
        status: 'Synced',
        attemptsSynced: pendingPractice.length,
        examsSynced: pendingExams.length,
        message:
          pendingPractice.length + pendingExams.length > 0
            ? `Uploaded ${pendingPractice.length} practice attempts & ${pendingExams.length} mock exams.`
            : 'Checked with server — all progress up to date.',
        timestamp: res.syncedAt,
      };
      await db.put('syncLogs', logEntry);
      await putCache('lastSyncAt', res.syncedAt);

      setLastSyncAt(res.syncedAt);
      setServerContentVersion(res.serverContentVersion);
      setReleaseNotes(res.releaseNotes);
      setSyncStatus('Synced');
      updateUser({ lastSyncAt: res.syncedAt });

      syncingRef.current = false;
      await refreshState();
      return { ok: true, message: logEntry.message };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed';
      setLastSyncError(msg);
      setSyncStatus('Failed');
      const db = await getLocalDB();
      await db.put('syncLogs', {
        id: makeId(),
        status: 'Failed',
        attemptsSynced: 0,
        examsSynced: 0,
        message: msg,
        timestamp: new Date().toISOString(),
      });
      syncingRef.current = false;
      await refreshState();
      return { ok: false, message: msg };
    }
  }, [user, pendingCount, localContentVersion, refreshState, updateUser]);

  // Listen for browser online/offline events
  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Initial load
  useEffect(() => {
    refreshState();
  }, [refreshState, user?.id]);

  // Automatic synchronization when connectivity returns!
  useEffect(() => {
    if (!isOnline || !user) return;
    checkContentUpdates();
    if (pendingCount > 0 && !syncingRef.current) {
      const timer = setTimeout(() => {
        void syncNow();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOnline, user, pendingCount, syncNow, checkContentUpdates]);

  const toggleSimulatedOffline = () => {
    const next = !simulated;
    setSimulatedOffline(next);
    setSimulated(next);
  };

  const setBusy = (id: string, active: boolean) => {
    setBusyDownloads((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const downloadTopic = async (topicId: string) => {
    setBusy(topicId, true);
    try {
      const bundle = await apiFetch<{
        contentVersion: number;
        downloadedAt: string;
        subject: Subject;
        topic: Topic;
        questions: Question[];
      }>(`/content/bundle/topic/${topicId}`);

      const db = await getLocalDB();
      await db.put('topics', bundle.topic);
      const tx = db.transaction('questions', 'readwrite');
      for (const q of bundle.questions) {
        await tx.store.put(q);
      }
      await tx.done;

      await db.put('downloadedTopics', {
        topicId: bundle.topic.id,
        subjectId: bundle.topic.subjectId,
        title: bundle.topic.title,
        questionCount: bundle.questions.length,
        contentVersion: bundle.contentVersion,
        downloadedAt: bundle.downloadedAt,
      });

      await putCache('localContentVersion', bundle.contentVersion);
      setLocalContentVersion(bundle.contentVersion);
      await refreshState();
    } finally {
      setBusy(topicId, false);
    }
  };

  const downloadSubject = async (subjectId: string) => {
    setBusy(subjectId, true);
    try {
      const bundle = await apiFetch<{
        contentVersion: number;
        downloadedAt: string;
        subject: Subject;
        topics: Topic[];
        questions: Question[];
      }>(`/content/bundle/subject/${subjectId}`);

      const db = await getLocalDB();
      await db.put('subjects', bundle.subject);

      const txT = db.transaction('topics', 'readwrite');
      for (const t of bundle.topics) await txT.store.put(t);
      await txT.done;

      const txQ = db.transaction('questions', 'readwrite');
      for (const q of bundle.questions) await txQ.store.put(q);
      await txQ.done;

      const txD = db.transaction('downloadedTopics', 'readwrite');
      for (const t of bundle.topics) {
        await txD.store.put({
          topicId: t.id,
          subjectId: t.subjectId,
          title: t.title,
          questionCount: t.questionCount,
          contentVersion: bundle.contentVersion,
          downloadedAt: bundle.downloadedAt,
        });
      }
      await txD.done;

      await putCache('localContentVersion', bundle.contentVersion);
      setLocalContentVersion(bundle.contentVersion);
      await refreshState();
    } finally {
      setBusy(subjectId, false);
    }
  };

  const removeDownloadedTopic = async (topicId: string) => {
    const db = await getLocalDB();
    await db.delete('downloadedTopics', topicId);
    await refreshState();
  };

  const downloadExam = async (examId: string) => {
    setBusy(examId, true);
    try {
      const bundle = await apiFetch<{
        contentVersion: number;
        downloadedAt: string;
        exam: MockExam;
        questions: Question[];
      }>(`/exams/${examId}/bundle`);

      const db = await getLocalDB();
      await db.put('exams', bundle.exam);
      const tx = db.transaction('questions', 'readwrite');
      for (const q of bundle.questions) {
        await tx.store.put(q);
      }
      await tx.done;

      await db.put('downloadedExams', {
        examId: bundle.exam.id,
        title: bundle.exam.title,
        questionCount: bundle.questions.length,
        contentVersion: bundle.contentVersion,
        downloadedAt: bundle.downloadedAt,
      });

      await putCache('localContentVersion', bundle.contentVersion);
      setLocalContentVersion(bundle.contentVersion);
      await refreshState();
    } finally {
      setBusy(examId, false);
    }
  };

  const removeDownloadedExam = async (examId: string) => {
    const db = await getLocalDB();
    await db.delete('downloadedExams', examId);
    await refreshState();
  };

  const refreshDownloadedUpdates = async () => {
    for (const dt of downloadedTopics) {
      await downloadTopic(dt.topicId);
    }
    for (const de of downloadedExams) {
      await downloadExam(de.examId);
    }
    await checkContentUpdates();
  };

  const recordPracticeAttempt = async (
    input: Omit<PracticeAttempt, 'id' | 'synced' | 'offlineRecorded'> & { id?: string }
  ): Promise<PracticeAttempt> => {
    const online = isEffectivelyOnline();
    const attempt: PracticeAttempt = {
      ...input,
      id: input.id || makeId(),
      offlineRecorded: !online,
      synced: false,
    };

    const db = await getLocalDB();
    await db.put('practiceAttempts', attempt);

    if (online) {
      try {
        await apiFetch('/practice/attempts', {
          method: 'POST',
          body: JSON.stringify({ attempts: [attempt] }),
        });
        attempt.synced = true;
        await db.put('practiceAttempts', attempt);
        const now = new Date().toISOString();
        await putCache('lastSyncAt', now);
        setLastSyncAt(now);
      } catch {
        // Keep unsynced in IndexedDB for retry
        setSyncStatus('Pending');
      }
    } else {
      setSyncStatus('Pending');
    }

    await refreshState();
    return attempt;
  };

  const recordExamAttempt = async (
    input: Omit<ExamAttempt, 'id' | 'synced' | 'offlineRecorded'> & { id?: string }
  ): Promise<ExamAttempt> => {
    const online = isEffectivelyOnline();
    const attempt: ExamAttempt = {
      ...input,
      id: input.id || makeId(),
      offlineRecorded: !online,
      synced: false,
    };

    const db = await getLocalDB();
    await db.put('examAttempts', attempt);

    if (online) {
      try {
        await apiFetch('/exams/attempts', {
          method: 'POST',
          body: JSON.stringify(attempt),
        });
        attempt.synced = true;
        await db.put('examAttempts', attempt);
        const now = new Date().toISOString();
        await putCache('lastSyncAt', now);
        setLastSyncAt(now);
      } catch {
        setSyncStatus('Pending');
      }
    } else {
      setSyncStatus('Pending');
    }

    await refreshState();
    return attempt;
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        simulatedOffline: simulated,
        toggleSimulatedOffline,
        syncStatus,
        lastSyncError,
        lastSyncAt,
        pendingCount,
        pendingPracticeCount,
        pendingExamCount,
        downloadedTopics,
        downloadedTopicIds,
        downloadedExams,
        downloadedExamIds,
        localContentVersion,
        serverContentVersion,
        updateAvailable,
        releaseNotes,
        syncLogs,
        busyDownloads,
        downloadTopic,
        downloadSubject,
        removeDownloadedTopic,
        downloadExam,
        removeDownloadedExam,
        recordPracticeAttempt,
        recordExamAttempt,
        syncNow,
        checkContentUpdates,
        refreshDownloadedUpdates,
        refreshState,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used inside OfflineProvider');
  return ctx;
}
