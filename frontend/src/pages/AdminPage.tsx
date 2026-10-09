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

interface AdminUser {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  role: string;
  isBanned: boolean;
  isPremium: boolean;
  isEmailVerified: boolean;
  reputationScore: number;
  pointsBalance: number;
  country: string | null;
  createdAt: string;
  _count: { evidences: number; topics: number; comments: number };
}

interface AdminStats {
  users: number;
  bannedUsers: number;
  staff: number;
  newUsers7d: number;
  topics: number;
  pendingTopics: number;
  evidences: number;
  scoredEvidences: number;
  averageQuality: number;
  openReports: number;
  pointsGranted: number;
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
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [tab, setTab] = useState<'topics' | 'reports' | 'users' | 'stats'>('topics');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const { accessToken, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  function load() {
    setLoading(true);
    Promise.all([
      apiRequest<Topic[]>('/topics/pending', { token: accessToken }).catch(() => []),
      apiRequest<Report[]>('/topics/reports/queue', { token: accessToken }).catch(() => []),
      apiRequest<AdminUser[]>(
        `/admin/users${userQuery.trim() ? `?q=${encodeURIComponent(userQuery.trim())}` : ''}`,
        { token: accessToken },
      ).catch(() => []),
      apiRequest<AdminStats>('/admin/stats', { token: accessToken }).catch(() => null),
    ])
      .then(([pendingTopics, reportQueue, userList, platformStats]) => {
        setTopics(pendingTopics);
        setReports(reportQueue);
        setUsers(userList);
        setStats(platformStats);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateUser(
    target: AdminUser,
    patch: { isBanned?: boolean; role?: string; isPremium?: boolean },
  ) {
    setActionError(null);
    try {
      const note =
        patch.isBanned === true ? window.prompt('Kisitlama gerekcesi (opsiyonel)') : undefined;
      await apiRequest(`/admin/users/${target.id}`, {
        method: 'PATCH',
        token: accessToken,
        body: { ...patch, note: note || undefined },
      });
      load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Islem basarisiz.');
    }
  }

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
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`font-mono text-xs pb-1 border-b-2 transition-colors ${
              tab === 'users'
                ? 'border-brass text-brass'
                : 'border-transparent text-parchment-dim hover:text-parchment'
            }`}
          >
            kullanicilar ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('stats')}
            className={`font-mono text-xs pb-1 border-b-2 transition-colors ${
              tab === 'stats'
                ? 'border-brass text-brass'
                : 'border-transparent text-parchment-dim hover:text-parchment'
            }`}
          >
            istatistik
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading && <p className="text-parchment-dim text-sm">yukleniyor...</p>}
        {actionError && (
          <p className="text-verdict-weak text-sm mb-4 font-mono text-xs">{actionError}</p>
        )}

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

        {!loading && tab === 'users' && (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                load();
              }}
              className="flex gap-2 mb-5"
            >
              <input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="kullanici adi, e-posta veya isim ara"
                className="flex-1 bg-ink-2 border border-line rounded-sm px-3 py-2 text-sm text-parchment placeholder:text-parchment-dim focus:outline-none focus:border-brass"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-sm border border-brass text-brass hover:bg-brass hover:text-ink text-sm font-medium transition-colors"
              >
                ara
              </button>
            </form>

            <p className="text-xs text-parchment-dim mb-4 leading-relaxed">
              Kisitlama erisimi engeller; kanit kalite puanlarini ve odul puanlarini
              degistirmez. Rol ve abonelik degisikligi yalnizca yonetici yetkisiyle yapilir.
            </p>

            {users.length === 0 && <p className="text-parchment-dim text-sm">kullanici bulunamadi.</p>}

            <div className="space-y-3">
              {users.map((person) => (
                <div key={person.id} className="border border-line rounded-sm p-4 bg-ink-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`/users/${person.username}`}
                        className="font-display text-base text-brass hover:underline"
                      >
                        {person.displayName || person.username}
                      </Link>
                      <p className="font-mono text-xs text-parchment-dim mt-0.5">
                        @{person.username} &middot; {person.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-xs text-parchment-dim">{person.role}</span>
                      {person.isBanned && (
                        <span className="font-mono text-xs text-verdict-weak">kisitli</span>
                      )}
                      {person.isPremium && (
                        <span className="font-mono text-xs text-verdict-strong">abone</span>
                      )}
                    </div>
                  </div>

                  <p className="font-mono text-xs text-parchment-dim mt-3">
                    itibar {person.reputationScore} &middot; puan {person.pointsBalance} &middot;
                    kanit {person._count.evidences} &middot; dava {person._count.topics} &middot;
                    yorum {person._count.comments}
                  </p>
                  <p className="font-mono text-xs text-parchment-dim mt-1">
                    kayit: {new Date(person.createdAt).toLocaleDateString('tr-TR')}
                    {person.country ? ` · ${person.country}` : ''}
                    {person.isEmailVerified ? ' · e-posta dogrulanmis' : ' · e-posta dogrulanmamis'}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => updateUser(person, { isBanned: !person.isBanned })}
                      className={`px-3 py-1.5 rounded-sm border text-xs font-medium transition-colors ${
                        person.isBanned
                          ? 'border-verdict-strong text-verdict-strong hover:bg-verdict-strong hover:text-ink'
                          : 'border-verdict-weak text-verdict-weak hover:bg-verdict-weak hover:text-ink'
                      }`}
                    >
                      {person.isBanned ? 'kisitlamayi kaldir' : 'kisitla'}
                    </button>
                    {isAdmin && person.role !== 'MODERATOR' && (
                      <button
                        onClick={() => updateUser(person, { role: 'MODERATOR' })}
                        className="px-3 py-1.5 rounded-sm border border-line text-parchment-dim hover:text-parchment text-xs font-medium transition-colors"
                      >
                        moderator yap
                      </button>
                    )}
                    {isAdmin && person.role !== 'USER' && (
                      <button
                        onClick={() => updateUser(person, { role: 'USER' })}
                        className="px-3 py-1.5 rounded-sm border border-line text-parchment-dim hover:text-parchment text-xs font-medium transition-colors"
                      >
                        yetkiyi kaldir
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => updateUser(person, { isPremium: !person.isPremium })}
                        className="px-3 py-1.5 rounded-sm border border-line text-parchment-dim hover:text-parchment text-xs font-medium transition-colors"
                      >
                        {person.isPremium ? 'aboneligi kapat' : 'abonelik ver'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && tab === 'stats' && (
          <>
            {!stats && <p className="text-parchment-dim text-sm">istatistik alinamadi.</p>}
            {stats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['kullanici', stats.users],
                    ['son 7 gun yeni', stats.newUsers7d],
                    ['kisitli hesap', stats.bannedUsers],
                    ['yetkili', stats.staff],
                    ['dava', stats.topics],
                    ['onay bekleyen dava', stats.pendingTopics],
                    ['kanit', stats.evidences],
                    ['puanlanan kanit', stats.scoredEvidences],
                    ['ortalama kalite', `${stats.averageQuality}/100`],
                    ['acik bildirim', stats.openReports],
                    ['dagitilan odul puani', stats.pointsGranted],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border border-line rounded-sm p-4 bg-ink-2">
                      <p className="font-mono text-xs text-parchment-dim">{label}</p>
                      <p className="font-display text-xl text-parchment mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-parchment-dim mt-5 leading-relaxed">
                  Ortalama kalite yalnizca yapay zekanin kanit degerlendirmelerinden gelir;
                  kullanici oylari ve yorumlar bu sayiyi etkilemez. Odul puani uygulama ici
                  puandir, para degildir.
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
