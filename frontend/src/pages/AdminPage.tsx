import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  creator: { username: string };
  sides: { id: string; position: string; label: string }[];
}

interface Report {
  id: string;
  reason: string;
  detail: string | null;
  status: string;
  createdAt: string;
  reporter: { username: string; displayName: string | null };
  evidence: {
    id: string;
    content: string;
    sourceUrl: string | null;
    score: number | null;
    author: { username: string };
    side: { label: string; topic: { id: string; title: string } };
  };
}

const REASON_LABELS: Record<string, string> = {
  FAKE_SOURCE: 'kaynak sahte',
  BROKEN_SOURCE: 'kaynak linki calismiyor',
  MISREPRESENTS_SOURCE: 'kaynagi yanlis aktariyor',
  OUT_OF_CONTEXT: 'baglamdan koparilmis',
  DUPLICATE: 'tekrar eden kanit',
  OFF_TOPIC: 'konuyla ilgisiz',
};

export default function AdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'topics' | 'reports'>('topics');
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuth();

  function load() {
    setLoading(true);
    Promise.all([
      apiRequest<Topic[]>('/topics/pending', { token: accessToken }).catch(() => []),
      apiRequest<Report[]>('/topics/reports/queue', { token: accessToken }).catch(() => []),
    ])
      .then(([pendingTopics, reportQueue]) => {
        setTopics(pendingTopics);
        setReports(reportQueue);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAction(topicId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION') {
    const note =
      action !== 'APPROVE' ? window.prompt('Not eklemek ister misin? (opsiyonel)') : undefined;
    await apiRequest(`/topics/${topicId}/moderate`, {
      method: 'PATCH',
      token: accessToken,
      body: { action, note: note || undefined },
    });
    load();
  }

  async function handleReport(reportId: string, action: 'ACCEPT' | 'REJECT') {
    const note = window.prompt('Karar notu (opsiyonel)');
    await apiRequest(`/topics/reports/${reportId}`, {
      method: 'PATCH',
      token: accessToken,
      body: { action, note: note || undefined },
    });
    load();
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-line px-6 py-5 max-w-3xl mx-auto">
        <Link to="/" className="font-mono text-xs text-parchment-dim hover:text-parchment">
          &larr; gundeme don
        </Link>
        <h1 className="font-display text-2xl text-parchment mt-2">Moderasyon Masasi</h1>
        <div className="flex gap-4 mt-4">
          <button
            type="button"
            onClick={() => setTab('topics')}
            className={`font-mono text-xs pb-1 border-b-2 transition-colors ${
              tab === 'topics'
                ? 'border-brass text-brass'
                : 'border-transparent text-parchment-dim hover:text-parchment'
            }`}
          >
            dava kuyrugu ({topics.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`font-mono text-xs pb-1 border-b-2 transition-colors ${
              tab === 'reports'
                ? 'border-brass text-brass'
                : 'border-transparent text-parchment-dim hover:text-parchment'
            }`}
          >
            kaynak bildirimleri ({reports.length})
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading && <p className="text-parchment-dim text-sm">yukleniyor...</p>}

        {!loading && tab === 'topics' && (
          <>
            {topics.length === 0 && (
              <p className="text-parchment-dim text-sm">onay bekleyen dava yok.</p>
            )}
            <div className="space-y-4">
              {topics.map((topic) => (
                <div key={topic.id} className="border border-line rounded-sm p-5 bg-ink-2">
                  <p className="font-mono text-xs text-brass">{topic.category.toUpperCase()}</p>
                  <h3 className="font-display text-lg text-parchment mt-1">{topic.title}</h3>
                  <p className="text-parchment-dim text-sm mt-1 leading-relaxed">
                    {topic.description}
                  </p>
                  <div className="flex gap-2 mt-3">
                    {topic.sides.map((side) => (
                      <span
                        key={side.id}
                        className="font-mono text-xs px-2.5 py-1 rounded-sm border border-line text-parchment-dim"
                      >
                        {side.position} &middot; {side.label}
                      </span>
                    ))}
                  </div>
                  <p className="font-mono text-xs text-parchment-dim mt-3">
                    acan: {topic.creator.username}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAction(topic.id, 'APPROVE')}
                      className="px-4 py-2 rounded-sm border border-verdict-strong text-verdict-strong hover:bg-verdict-strong hover:text-ink text-sm font-medium transition-colors"
                    >
                      onayla
                    </button>
                    <button
                      onClick={() => handleAction(topic.id, 'REQUEST_REVISION')}
                      className="px-4 py-2 rounded-sm border border-verdict-mid text-verdict-mid hover:bg-verdict-mid hover:text-ink text-sm font-medium transition-colors"
                    >
                      duzeltme iste
                    </button>
                    <button
                      onClick={() => handleAction(topic.id, 'REJECT')}
                      className="px-4 py-2 rounded-sm border border-verdict-weak text-verdict-weak hover:bg-verdict-weak hover:text-ink text-sm font-medium transition-colors"
                    >
                      reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && tab === 'reports' && (
          <>
            <p className="text-xs text-parchment-dim mb-4 leading-relaxed">
              Bu kuyruk, yeterli bildirim toplandigi icin yapay zeka tarafindan yeniden
              degerlendirilen kanitlari gosterir. Kararin puani dogrudan degistirmez; kabul
              edilen bildirim kaniti tekrar degerlendirmeye sokar.
            </p>
            {reports.length === 0 && (
              <p className="text-parchment-dim text-sm">incelenecek bildirim yok.</p>
            )}
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border border-line rounded-sm p-5 bg-ink-2">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs text-verdict-weak">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </span>
                    <span className="font-mono text-xs text-parchment-dim shrink-0">
                      {report.evidence.score === null ? 'puanlaniyor' : `${report.evidence.score}/100`}
                    </span>
                  </div>

                  <Link
                    to={`/topics/${report.evidence.side.topic.id}`}
                    className="font-display text-base text-brass hover:underline mt-2 block"
                  >
                    {report.evidence.side.topic.title}
                  </Link>
                  <p className="font-mono text-xs text-parchment-dim mt-1">
                    taraf: {report.evidence.side.label} &middot; kanit sahibi:{' '}
                    {report.evidence.author.username}
                  </p>

                  <p className="text-sm text-parchment mt-3 leading-relaxed border-t border-line pt-3">
                    {report.evidence.content}
                  </p>
                  {report.evidence.sourceUrl && (
                    <a
                      href={report.evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-brass hover:underline mt-2 inline-block"
                    >
                      kaynagi ac &rarr;
                    </a>
                  )}

                  {report.detail && (
                    <p className="text-xs text-parchment-dim mt-3 border-l-2 border-line pl-3 leading-relaxed">
                      {report.detail}
                    </p>
                  )}
                  <p className="font-mono text-xs text-parchment-dim mt-3">
                    bildiren: {report.reporter.username} &middot;{' '}
                    {new Date(report.createdAt).toLocaleString('tr-TR')}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleReport(report.id, 'ACCEPT')}
                      className="px-4 py-2 rounded-sm border border-verdict-weak text-verdict-weak hover:bg-verdict-weak hover:text-ink text-sm font-medium transition-colors"
                    >
                      bildirimi kabul et
                    </button>
                    <button
                      onClick={() => handleReport(report.id, 'REJECT')}
                      className="px-4 py-2 rounded-sm border border-line text-parchment-dim hover:text-parchment text-sm font-medium transition-colors"
                    >
                      bildirimi reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
