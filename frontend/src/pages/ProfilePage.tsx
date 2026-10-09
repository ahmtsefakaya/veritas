import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';

interface Evidence {
  id: string;
  content: string;
  score: number | null;
  sourceUrl: string | null;
  side: { label: string; position: string; topic: { id: string; title: string } };
}

interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  reputationScore: number;
  pointsBalance: number;
  createdAt: string;
  stats: {
    evidenceCount: number;
    scoredEvidenceCount: number;
    averageScore: number | null;
    netVotes: number;
    voteCount: number;
    topicCount: number;
    commentCount: number;
    bestEvidences: Evidence[];
  };
}

interface Leader {
  username: string;
  displayName: string | null;
  reputationScore: number;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      apiRequest<Profile>(`/users/${encodeURIComponent(username)}`),
      apiRequest<Leader[]>('/users/leaderboard'),
    ])
      .then(([p, l]) => {
        setProfile(p);
        setLeaders(l);
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return <div className="min-h-screen bg-ink text-parchment-dim p-6">yukleniyor...</div>;
  }
  if (!profile) {
    return <div className="min-h-screen bg-ink text-parchment-dim p-6">kullanici bulunamadi.</div>;
  }

  const rank = leaders.findIndex((l) => l.username === profile.username);

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <header className="border-b border-line px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <Link to="/" className="font-mono text-xs text-parchment-dim hover:text-brass">
            &larr; gundeme don
          </Link>
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-brass">@{profile.username}</p>
              <h1 className="font-display text-3xl mt-1">{profile.displayName ?? profile.username}</h1>
              {profile.bio && <p className="text-parchment-dim text-sm mt-2">{profile.bio}</p>}
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-parchment-dim">itibar</p>
              <p className="font-display text-3xl text-brass">{profile.reputationScore}</p>
              <p className="font-mono text-xs text-parchment-dim mt-2">odul puani</p>
              <p className="font-display text-xl text-brass">{profile.pointsBalance}</p>
              {rank >= 0 && <p className="font-mono text-xs text-parchment-dim">#{rank + 1} liderlik</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 grid gap-8 md:grid-cols-[1fr_280px]">
        <section>
          <h2 className="font-display text-xl mb-4">Katki ozeti</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
            {[
              ['kanit', profile.stats.evidenceCount],
              ['AI puanli', profile.stats.scoredEvidenceCount],
              ['ortalama', profile.stats.averageScore ?? '-'],
              ['net oy', profile.stats.netVotes],
              ['onayli dava', profile.stats.topicCount],
              ['yorum', profile.stats.commentCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-line bg-ink-2 rounded-sm p-3">
                <p className="font-mono text-xs text-parchment-dim">{label}</p>
                <p className="font-display text-xl text-brass mt-1">{value}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-xl mb-4">En guclu kanitlar</h2>
          {profile.stats.bestEvidences.length === 0 ? (
            <p className="text-parchment-dim text-sm">Henuz puanlanmis kanit yok.</p>
          ) : (
            <div className="space-y-3">
              {profile.stats.bestEvidences.map((e) => (
                <div key={e.id} className="border border-line bg-ink-2 rounded-sm p-4">
                  <div className="flex justify-between gap-3">
                    <span className="font-mono text-xs text-brass">
                      {e.side.position} &middot; {e.side.label}
                    </span>
                    <span className="font-mono text-xs text-verdict-strong">{e.score}/100</span>
                  </div>
                  <p className="text-sm leading-relaxed mt-2">{e.content}</p>
                  <Link
                    to={`/topics/${e.side.topic.id}`}
                    className="font-mono text-xs text-parchment-dim hover:text-brass mt-2 inline-block"
                  >
                    {e.side.topic.title} &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside>
          <h2 className="font-display text-xl mb-4">Itibar siralamasi</h2>
          <div className="border border-line bg-ink-2 rounded-sm divide-y divide-line">
            {leaders.length === 0 && <p className="p-4 text-sm text-parchment-dim">Henuz siralama yok.</p>}
            {leaders.slice(0, 10).map((leader, i) => (
              <Link
                key={leader.username}
                to={`/users/${leader.username}`}
                className="flex items-center justify-between gap-2 p-3 hover:bg-ink-3 transition-colors"
              >
                <span className="font-mono text-xs text-parchment-dim">#{i + 1}</span>
                <span className="text-sm flex-1 truncate">{leader.displayName ?? leader.username}</span>
                <span className="font-mono text-xs text-brass">{leader.reputationScore}</span>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
