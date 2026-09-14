import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Side {
  id: string;
  position: 'A' | 'B';
  label: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  sides: Side[];
  createdAt: string;
}

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    apiRequest<Topic[]>('/topics')
      .then(setTopics)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-ink flex">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-line px-5 py-6 sticky top-0 h-screen">
        <h1 className="font-display text-2xl text-parchment mb-8">Veritas</h1>

        <nav className="flex flex-col gap-1 flex-1">
          <Link
            to="/"
            className="px-3 py-2 rounded-sm text-sm text-parchment bg-ink-2 border border-line"
          >
            Gundem
          </Link>
          <Link
            to="/new-topic"
            className="px-3 py-2 rounded-sm text-sm text-parchment-dim hover:text-parchment hover:bg-ink-2 transition-colors"
          >
            Yeni dava ac
          </Link>
          {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
            <Link
              to="/admin"
              className="px-3 py-2 rounded-sm text-sm text-parchment-dim hover:text-parchment hover:bg-ink-2 transition-colors"
            >
              Moderasyon
            </Link>
          )}
        </nav>

        <div className="border-t border-line pt-4">
          <p className="font-mono text-xs text-parchment truncate">
            {user?.displayName ?? user?.username}
          </p>
          <button
            onClick={logout}
            className="font-mono text-xs text-parchment-dim hover:text-brass transition-colors mt-1"
          >
            cikis yap
          </button>
        </div>
      </aside>

      <main className="flex-1 max-w-2xl border-r border-line">
        <header className="border-b border-line px-6 py-4 flex items-center justify-between md:hidden">
          <h1 className="font-display text-xl text-parchment">Veritas</h1>
          <Link
            to="/new-topic"
            className="font-mono text-xs px-3 py-1.5 rounded-sm bg-brass text-ink"
          >
            + dava
          </Link>
        </header>

        <div className="px-6 py-4 border-b border-line hidden md:block">
          <p className="font-mono text-xs text-parchment-dim tracking-wide">gundemdeki davalar</p>
        </div>

        {loading && <p className="text-parchment-dim text-sm px-6 py-8">yukleniyor...</p>}

        {!loading && topics.length === 0 && (
          <p className="text-parchment-dim text-sm px-6 py-8">
            henuz onaylanmis bir dava yok. ilk davayi sen ac.
          </p>
        )}

        <div>
          {topics.map((topic, i) => (
            <Link
              key={topic.id}
              to={`/topics/${topic.id}`}
              className="block px-6 py-5 border-b border-line hover:bg-ink-2 transition-colors"
            >
              <div className="flex items-baseline gap-3 mb-1.5">
                <span className="font-mono text-xs text-brass">
                  DAVA-{String(i + 1).padStart(3, '0')}
                </span>
                <span className="font-mono text-xs text-parchment-dim uppercase tracking-wide">
                  {topic.category}
                </span>
              </div>
              <h3 className="font-display text-xl text-parchment mb-1.5">{topic.title}</h3>
              <p className="text-parchment-dim text-sm leading-relaxed line-clamp-2 mb-3">
                {topic.description}
              </p>
              <div className="flex gap-2">
                {topic.sides.map((side) => (
                  <span
                    key={side.id}
                    className="font-mono text-xs px-2.5 py-1 rounded-sm border border-line text-parchment-dim"
                  >
                    {side.position} &middot; {side.label}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>

      <aside className="hidden lg:block w-72 shrink-0 px-6 py-6">
        <p className="font-mono text-xs text-parchment-dim tracking-wide mb-3">nasil calisir</p>
        <div className="space-y-3 text-sm text-parchment-dim leading-relaxed">
          <p>Her dava iki tarafa ayrilir. Herkes delil sunar, yapay zeka delilin gucunu puanlar.</p>
          <p>Guclu deliller uste cikar, zayif olanlar altta kalir.</p>
        </div>
      </aside>
    </div>
  );
}
