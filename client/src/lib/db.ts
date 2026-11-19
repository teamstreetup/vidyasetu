import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ExamAttempt, LocalSyncLog, MockExam, PracticeAttempt, Question, Subject, Topic } from '../types';

export interface DownloadedTopicRecord {
  topicId: string;
  subjectId: string;
  title: string;
  questionCount: number;
  contentVersion: number;
  downloadedAt: string;
}

export interface DownloadedExamRecord {
  examId: string;
  title: string;
  questionCount: number;
  contentVersion: number;
  downloadedAt: string;
}

interface VidyaSetuDB extends DBSchema {
  subjects: { key: string; value: Subject };
  topics: { key: string; value: Topic; indexes: { 'by-subject': string } };
  questions: { key: string; value: Question; indexes: { 'by-topic': string; 'by-subject': string } };
  exams: { key: string; value: MockExam };
  downloadedTopics: { key: string; value: DownloadedTopicRecord };
  downloadedExams: { key: string; value: DownloadedExamRecord };
  practiceAttempts: { key: string; value: PracticeAttempt; indexes: { 'by-topic': string } };
  examAttempts: { key: string; value: ExamAttempt; indexes: { 'by-exam': string } };
  syncLogs: { key: string; value: LocalSyncLog };
  cache: { key: string; value: { key: string; data: unknown; updatedAt: string } };
}

let dbPromise: Promise<IDBPDatabase<VidyaSetuDB>> | null = null;

export function getLocalDB(): Promise<IDBPDatabase<VidyaSetuDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VidyaSetuDB>('vidyasetu-offline-v1', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('subjects')) {
          db.createObjectStore('subjects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('topics')) {
          const store = db.createObjectStore('topics', { keyPath: 'id' });
          store.createIndex('by-subject', 'subjectId');
        }
        if (!db.objectStoreNames.contains('questions')) {
          const store = db.createObjectStore('questions', { keyPath: 'id' });
          store.createIndex('by-topic', 'topicId');
          store.createIndex('by-subject', 'subjectId');
        }
        if (!db.objectStoreNames.contains('exams')) {
          db.createObjectStore('exams', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('downloadedTopics')) {
          db.createObjectStore('downloadedTopics', { keyPath: 'topicId' });
        }
        if (!db.objectStoreNames.contains('downloadedExams')) {
          db.createObjectStore('downloadedExams', { keyPath: 'examId' });
        }
        if (!db.objectStoreNames.contains('practiceAttempts')) {
          const store = db.createObjectStore('practiceAttempts', { keyPath: 'id' });
          store.createIndex('by-topic', 'topicId');
        }
        if (!db.objectStoreNames.contains('examAttempts')) {
          const store = db.createObjectStore('examAttempts', { keyPath: 'id' });
          store.createIndex('by-exam', 'examId');
        }
        if (!db.objectStoreNames.contains('syncLogs')) {
          db.createObjectStore('syncLogs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function putCache<T>(key: string, data: T): Promise<void> {
  const db = await getLocalDB();
  await db.put('cache', { key, data, updatedAt: new Date().toISOString() });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await getLocalDB();
  const row = await db.get('cache', key);
  return row ? (row.data as T) : null;
}

export async function clearOfflineStorage(): Promise<void> {
  const db = await getLocalDB();
  const stores: Array<keyof VidyaSetuDB> = [
    'subjects',
    'topics',
    'questions',
    'exams',
    'downloadedTopics',
    'downloadedExams',
    'practiceAttempts',
    'examAttempts',
    'syncLogs',
    'cache',
  ];
  for (const s of stores) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.clear(s as any);
  }
}
