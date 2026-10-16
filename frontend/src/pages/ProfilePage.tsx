import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell, { Avatar } from '../components/AppShell';
import RightRail from '../components/RightRail';
import Tabs, { PageHeader } from '../components/Tabs';
import Icon from '../components/Icon';

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

function roleBadge(role: string) {
  if (role === 'ADMIN') return 'yonetici';
  if (role === 'MODERATOR') return 'moderator';
  return null;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  useDocumentTitle(username ? `@${username}` : null);
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'kanit' | 'istatistik'>('kanit');

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      apiRequest<Profile>(`/users/${encodeURIComponent(username)}`),
      apiRequest<Leader[]>('/users/leaderboard').catch(() => [] as Leader[]),
    ])
      .then(([profileData, leaderData]) => {
        setProfile(profileData);
        setLeaders(leaderData);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <AppShell right={<RightRail />}>
        <p className="px-4 py-10 text-center text-sm text-parchment-dim">yukleniyor...</p>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell right={<RightRail />}>
        <p className="px-4 py-10 text-center text-sm text-parchment-dim">Kullanici bulunamadi.</p>
      </AppShell>
    );
  }

  const rank = leaders.findIndex((leader) => leader.username === profile.username);
  const name = profile.displayName ?? profile.username;
  const badge = roleBadge(profile.role);
  const isMe = user?.username === profile.username;
  const joined = new Date(profile.createdAt).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  const stats: [string, string | number][] = [
    ['kanit', profile.stats.evidenceCount],
    ['AI puanli', profile.stats.scoredEvidenceCount],
    ['ortalama kalite', profile.stats.averageScore ?? '-'],
    ['net oy', profile.stats.netVotes],
    ['onayli dava', profile.stats.topicCount],
    ['yorum', profile.stats.commentCount],
  ];

  return (
    <AppShell right={<RightRail />}>
      <PageHeader title={name} subtitle={`@${profile.username}`} back="/" />

      {/*
        Kapak serisi: profil sayfasina kimlik veren tek gorsel oge. Resim
        yuklemesi olmadigi icin kullanici adindan turetilen sabit bir degrade
        kullaniliyor — her kullanici her yerde ayni renkte goruluyor.
      */}
      <div
        className="h-28 w-full sm:h-36"
        style={{
          background: `linear-gradient(120deg, hsl(${
            [...profile.username].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
          } 30% 20%), #0f1319)`,
        }}
        aria-hidden="true"
      />

      <div className="px-4 pb-4 sm:px-5">
        <div className="-mt-10 flex items-end justify-between gap-3">
          <span className="rounded-full border-4 border-ink">
            <Avatar name={name} size={80} />
          </span>
          {isMe && (
            <Link
              to="/settings"
              className="flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm transition-colors hover:border-brass hover:text-brass"
            >
              Profili duzenle
            </Link>
          )}
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl text-parchment">{name}</h1>
            {badge && (
              <span className="rounded-full border border-brass px-2 py-0.5 font-mono text-[11px] text-brass">
                {badge}
              </span>
            )}
          </div>
          <p className="font-mono text-sm text-parchment-dim">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-[15px] leading-relaxed text-parchment">{profile.bio}</p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-parchment-dim">
            <span className="flex items-center gap-1.5">
              <Icon name="profil" className="h-4 w-4" /> {joined} tarihinde katildi
            </span>
            {rank >= 0 && (
              <Link to="/leaderboard" className="flex items-center gap-1.5 hover:text-brass">
                <Icon name="siralama" className="h-4 w-4" /> siralamada #{rank + 1}
              </Link>
            )}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
          <div className="bg-ink-2 px-3 py-3 text-center">
            <dt className="font-mono text-[11px] text-parchment-dim">itibar</dt>
            <dd className="font-display text-2xl text-parchment">{profile.reputationScore}</dd>
          </div>
          <div className="bg-ink-2 px-3 py-3 text-center">
            <dt className="font-mono text-[11px] text-parchment-dim">odul puani</dt>
            <dd className="font-display text-2xl text-brass">{profile.pointsBalance}</dd>
          </div>
          <div className="bg-ink-2 px-3 py-3 text-center">
            <dt className="font-mono text-[11px] text-parchment-dim">ort. kalite</dt>
            <dd className="font-display text-2xl text-parchment">
              {profile.stats.averageScore ?? '-'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-y border-line">
        <Tabs
          items={[
            { key: 'kanit', label: 'En guclu kanitlar', count: profile.stats.bestEvidences.length },
            { key: 'istatistik', label: 'Katki ozeti' },
          ]}
          active={tab}
          ariaLabel="Profil sekmeleri"
          onChange={(key) => setTab(key as 'kanit' | 'istatistik')}
        />
      </div>

      {tab === 'kanit' && (
        <>
          {profile.stats.bestEvidences.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-parchment-dim">
              Henuz puanlanmis kanit yok.
            </p>
          )}
          {profile.stats.bestEvidences.map((evidence) => (
            <article key={evidence.id} className="border-b border-line px-4 py-4 sm:px-5">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    evidence.side.position === 'A' ? 'bg-side-a' : 'bg-side-b'
                  }`}
                />
                <span className="truncate font-mono text-[11px] text-parchment-dim">
                  {evidence.side.label}
                </span>
                <span className="ml-auto shrink-0 rounded-full border border-verdict-strong px-2 py-0.5 font-mono text-[11px] text-verdict-strong">
                  {evidence.score}/100
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-parchment">{evidence.content}</p>
              <Link
                to={`/topics/${evidence.side.topic.id}`}
                className="mt-2 inline-block font-mono text-xs text-parchment-dim hover:text-brass"
              >
                {evidence.side.topic.title} &rarr;
              </Link>
            </article>
          ))}
        </>
      )}

      {tab === 'istatistik' && (
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-ink px-4 py-5">
              <dt className="font-mono text-xs text-parchment-dim">{label}</dt>
              <dd className="font-display text-3xl text-brass">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </AppShell>
  );
}
