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
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Veritas</h1>
        <div className="flex items-center gap-4">
          {user?.role === 'ADMIN' || user?.role === 'MODERATOR' ? (
            <Link to="/admin" className="text-sm text-indigo-400 hover:text-indigo-300">
              Moderasyon Paneli
            </Link>
          ) : null}
          <Link
            to="/new-topic"
            className="text-sm bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg transition"
          >
            + Yeni Konu
          </Link>
          <span className="text-sm text-slate-400">{user?.displayName ?? user?.username}</span>
          <button onClick={logout} className="text-sm text-slate-400 hover:text-white">
            Cikis
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold mb-4">Guncel Tartismalar</h2>

        {loading && <p className="text-slate-400">Yukleniyor...</p>}

        {!loading && topics.length === 0 && (
          <p className="text-slate-400">Henuz onaylanmis bir konu yok.</p>
        )}

        <div className="space-y-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/topics/${topic.id}`}
              className="block bg-slate-800 hover:bg-slate-750 rounded-xl p-5 transition"
            >
              <span className="text-xs uppercase tracking-wide text-indigo-400">
                {topic.category}
              </span>
              <h3 className="text-lg font-semibold mt-1">{topic.title}</h3>
              <p className="text-slate-400 text-sm mt-1 line-clamp-2">{topic.description}</p>
              <div className="flex gap-3 mt-3 text-sm">
                {topic.sides.map((side) => (
                  <span
                    key={side.id}
                    className="px-3 py-1 rounded-full bg-slate-700 text-slate-300"
                  >
                    {side.label}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
