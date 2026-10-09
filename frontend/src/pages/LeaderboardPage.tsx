import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';

interface Leader {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  reputationScore: number;
}

export default function LeaderboardPage() {
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
    <div className="min-h-screen bg-ink text-parchment">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-brass">
          VERITAS
        </Link>
        <nav className="font-mono text-xs text-parchment-dim">itibar siralamasi</nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl text-brass">Itibar Siralamasi</h1>
        <p className="text-sm text-parchment-dim mt-3 leading-relaxed">
          Itibar, yapay zekanin kanitlariniza verdigi kalite puanlarindan ve kanitlarinizin net
          oyundan hesaplanir. Siralama yalnizca pozitif itibari olan kullanicilari gosterir.
        </p>

        {loading && <p className="mt-8 font-mono text-xs text-parchment-dim">yukleniyor...</p>}
        {error && <p className="mt-8 font-mono text-xs text-rust">{error}</p>}

        {!loading && !error && leaders.length === 0 && (
          <p className="mt-8 font-mono text-xs text-parchment-dim">
            Henuz siralamaya giren kullanici yok.
          </p>
        )}

        {leaders.length > 0 && (
          <ol className="mt-8 border border-line rounded divide-y divide-line">
            {leaders.map((leader, index) => (
              <li key={leader.username}>
                <Link
                  to={`/users/${leader.username}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-ink-2 transition-colors"
                >
                  <span
                    className={`font-mono text-xs w-8 ${
                      index < 3 ? 'text-brass' : 'text-parchment-dim'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">
                      {leader.displayName ?? leader.username}
                    </span>
                    <span className="block font-mono text-xs text-parchment-dim truncate">
                      @{leader.username}
                    </span>
                  </span>
                  <span className="font-mono text-sm text-brass">{leader.reputationScore}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
