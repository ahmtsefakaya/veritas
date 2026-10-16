import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell, { Avatar } from '../components/AppShell';
import RightRail from '../components/RightRail';
import { PageHeader, MobilePageTitle } from '../components/Tabs';

interface Leader {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  reputationScore: number;
}

export default function LeaderboardPage() {
  useDocumentTitle('Itibar siralamasi');
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<Leader[]>('/users/leaderboard')
      .then(setLeaders)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell right={<RightRail />}>
      <PageHeader title="Siralama" subtitle="itibar puanina gore" />
      <MobilePageTitle title="Siralama" subtitle="itibar puanina gore" />

      <p className="border-b border-line px-4 py-4 text-sm leading-relaxed text-parchment-dim sm:px-5">
        Itibar, yapay zekanin kanitlariniza verdigi kalite puanlarindan ve kanitlarinizin net
        oyundan hesaplanir. Listede yalnizca pozitif itibari olan kullanicilar yer alir.
      </p>

      {loading && <p className="px-4 py-10 text-center text-sm text-parchment-dim">yukleniyor...</p>}
      {error && <p className="px-4 py-10 text-center text-sm text-verdict-weak">{error}</p>}

      {!loading && !error && leaders.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-parchment-dim">
          Henuz siralamaya giren kullanici yok.
        </p>
      )}

      <ol>
        {leaders.map((leader, index) => {
          const name = leader.displayName ?? leader.username;
          const isMe = user?.username === leader.username;
          return (
            <li key={leader.username}>
              <Link
                to={`/users/${leader.username}`}
                className={`flex items-center gap-3 border-b border-line px-4 py-3 transition-colors hover:bg-ink-2 sm:px-5 ${
                  isMe ? 'bg-ink-2' : ''
                }`}
              >
                <span
                  className={`w-8 shrink-0 font-display text-xl ${
                    index < 3 ? 'text-brass' : 'text-parchment-dim'
                  }`}
                >
                  {index + 1}
                </span>
                <Avatar name={name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-parchment">{name}</span>
                    {isMe && (
                      <span className="rounded-full border border-brass px-1.5 font-mono text-[10px] text-brass">
                        sen
                      </span>
                    )}
                  </span>
                  <span className="block truncate font-mono text-xs text-parchment-dim">
                    @{leader.username}
                  </span>
                </span>
                <span className="shrink-0 font-display text-xl text-brass">
                  {leader.reputationScore}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </AppShell>
  );
}
