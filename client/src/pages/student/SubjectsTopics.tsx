import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Download,
  CheckCircle2,
  Trash2,
  Play,
  WifiOff,
  Clock,
  Calculator,
  FlaskConical,
  Brain,
  Loader2,
  Lock,
  Search,
} from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';
import { apiFetch } from '../../lib/api';
import { getCache, getLocalDB, putCache } from '../../lib/db';
import type { StudentProgressData, Subject, Topic } from '../../types';
import { DifficultyBadge, OfflineAvailabilityBadge } from '../../components/Badges';
import { ProgressBar } from '../../components/Charts';
import { EmptyState, SkeletonPage } from '../../components/UI';

export const SubjectsTopics: React.FC = () => {
  const {
    isOnline,
    downloadedTopicIds,
    busyDownloads,
    downloadTopic,
    downloadSubject,
    removeDownloadedTopic,
  } = useOffline();
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'all' | 'downloaded' | 'online-only'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const db = await getLocalDB();
      if (isOnline) {
        try {
          const [subs, tops, prog] = await Promise.all([
            apiFetch<Subject[]>('/content/subjects'),
            apiFetch<Topic[]>('/content/topics'),
            apiFetch<StudentProgressData>('/practice/progress'),
          ]);
          const txS = db.transaction('subjects', 'readwrite');
          for (const s of subs) await txS.store.put(s);
          await txS.done;

          const txT = db.transaction('topics', 'readwrite');
          for (const t of tops) await txT.store.put(t);
          await txT.done;

          await putCache('student_progress', prog);
          if (!active) return;
          setSubjects(subs);
          setTopics(tops);
          setProgress(prog);
          setLoading(false);
          return;
        } catch {
          // fallback to IndexedDB
        }
      }

      const [subs, tops, cachedProg] = await Promise.all([
        db.getAll('subjects'),
        db.getAll('topics'),
        getCache<StudentProgressData>('student_progress'),
      ]);
      if (!active) return;
      setSubjects(subs);
      setTopics(tops);
      setProgress(cachedProg);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [isOnline]);

  const handleDownloadTopic = async (topicId: string, title: string) => {
    try {
      await downloadTopic(topicId);
      setBannerMsg(`"${title}" saved to IndexedDB for offline access.`);
      setTimeout(() => setBannerMsg(null), 4000);
    } catch (err) {
      setBannerMsg(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleDownloadSubject = async (subjectId: string, name: string) => {
    try {
      await downloadSubject(subjectId);
      setBannerMsg(`All ${name} chapters & MCQs downloaded for offline study.`);
      setTimeout(() => setBannerMsg(null), 4000);
    } catch (err) {
      setBannerMsg(err instanceof Error ? err.message : 'Subject download failed');
    }
  };

  const getSubjectIcon = (icon: string) => {
    if (icon === 'calculator') return Calculator;
    if (icon === 'flask') return FlaskConical;
    if (icon === 'brain') return Brain;
    return BookOpen;
  };

  const filteredTopics = topics.filter((t) => {
    if (selectedSubject !== 'ALL' && t.subjectId !== selectedSubject) return false;
    const isDl = downloadedTopicIds.has(t.id);
    if (filterMode === 'downloaded' && !isDl) return false;
    if (filterMode === 'online-only' && isDl) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.subjectName.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return <SkeletonPage cards={3} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold text-slate-900">Subjects & Topics</h1>

        <div className="inline-flex bg-slate-200/70 rounded-xl p-1 self-start">
          {[
            { id: 'all', label: `All (${topics.length})` },
            { id: 'downloaded', label: `Offline Ready (${downloadedTopicIds.size})` },
            { id: 'online-only', label: `Online Only (${Math.max(0, topics.length - downloadedTopicIds.size)})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as 'all' | 'downloaded' | 'online-only')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterMode === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {bannerMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {bannerMsg}
        </div>
      )}

      {/* Subject Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {subjects.map((sub) => {
          const Icon = getSubjectIcon(sub.icon);
          const subTopics = topics.filter((t) => t.subjectId === sub.id);
          const downloadedCount = subTopics.filter((t) => downloadedTopicIds.has(t.id)).length;
          const allDownloaded = subTopics.length > 0 && downloadedCount === subTopics.length;
          const subStat = progress?.subjectStats.find((s) => s.subjectId === sub.id);
          const isBusy = busyDownloads.has(sub.id);
          const isSelected = selectedSubject === sub.id;

          return (
            <div
              key={sub.id}
              onClick={() => setSelectedSubject(isSelected ? 'ALL' : sub.id)}
              className={`card-surface card-interactive rounded-2xl p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                isSelected ? 'ring-2 ring-[#0f2440] border-transparent' : ''
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: sub.color }} />

              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: sub.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <OfflineAvailabilityBadge downloaded={allDownloaded} compact />
                </div>

                <h2 className="font-display text-lg font-bold text-slate-900">{sub.name}</h2>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{sub.description}</p>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium tabular-nums">
                    {sub.topicCount} Chapters • {sub.questionCount} MCQs
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums">{subStat?.completion ?? 0}%</span>
                </div>
                <ProgressBar value={subStat?.completion ?? 0} color={sub.color} height="h-1.5" />

                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                    {downloadedCount}/{subTopics.length} offline
                  </span>
                  <button
                    type="button"
                    disabled={!isOnline || isBusy || allDownloaded}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDownloadSubject(sub.id, sub.name);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      allDownloaded
                        ? 'bg-emerald-50 text-emerald-700 cursor-default'
                        : 'btn-primary disabled:opacity-40'
                    }`}
                  >
                    {isBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : allDownloaded ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {allDownloaded ? 'Downloaded' : 'Download All'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Topic List */}
      <div className="card-surface rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display font-bold text-slate-900">
              {selectedSubject === 'ALL'
                ? 'All Olympiad Chapters'
                : `${subjects.find((s) => s.id === selectedSubject)?.name || ''} Chapters`}
            </h2>
            {selectedSubject !== 'ALL' && (
              <button
                onClick={() => setSelectedSubject('ALL')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chapters…"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
            />
          </div>
        </div>

        {filteredTopics.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No matching chapters found"
            description={
              filterMode === 'downloaded'
                ? 'Download any subject or chapter while online so you can practise without internet.'
                : 'Try adjusting your subject filter or search query.'
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTopics.map((topic) => {
              const isDl = downloadedTopicIds.has(topic.id);
              const isBusy = busyDownloads.has(topic.id);
              const tStat = progress?.topicStats.find((s) => s.topicId === topic.id);
              const blockedOffline = !isOnline && !isDl;

              return (
                <div
                  key={topic.id}
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition ${
                    blockedOffline ? 'bg-slate-50/70 opacity-70' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-md text-[11px] font-bold text-white"
                        style={{ backgroundColor: topic.subjectColor }}
                      >
                        {topic.subjectName} • Ch {topic.chapterNumber}
                      </span>
                      <DifficultyBadge difficulty={topic.difficulty} />
                      <OfflineAvailabilityBadge downloaded={isDl} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-[15px]">{topic.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{topic.description}</p>

                    <div className="flex items-center gap-4 pt-0.5 text-xs text-slate-500 flex-wrap tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {topic.questionCount} MCQs
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> ~{topic.estimatedMinutes} min
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Progress:</span>
                        <div className="w-20">
                          <ProgressBar value={tStat?.completion ?? 0} color={topic.subjectColor} height="h-1.5" />
                        </div>
                        <strong className="text-slate-700">{tStat?.completion ?? 0}%</strong>
                      </div>
                      {tStat && tStat.attempted > 0 && (
                        <span>
                          Accuracy:{' '}
                          <strong className={tStat.accuracy < 65 ? 'text-rose-600' : 'text-emerald-600'}>
                            {tStat.accuracy}%
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDl ? (
                      <button
                        type="button"
                        onClick={() => void removeDownloadedTopic(topic.id)}
                        title="Remove offline copy"
                        className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!isOnline || isBusy}
                        onClick={() => void handleDownloadTopic(topic.id, topic.title)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 transition cursor-pointer"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={blockedOffline}
                      onClick={() => navigate(`/student/practice?topicId=${topic.id}`)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        blockedOffline ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'btn-primary'
                      }`}
                    >
                      {blockedOffline ? (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Online Only
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Practise
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isOnline && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-700" />
          Topics marked <strong>Online Only</strong> require downloading once internet connectivity returns.
        </div>
      )}
    </div>
  );
};
