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

export default function AdminPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuth();

  function load() {
    apiRequest<Topic[]>('/topics/pending', { token: accessToken })
      .then(setTopics)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAction(topicId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION') {
    const note = action !== 'APPROVE' ? window.prompt('Not eklemek ister misin? (opsiyonel)') : undefined;
    await apiRequest(`/topics/${topicId}/moderate`, {
      method: 'PATCH',
      token: accessToken,
      body: { action, note: note || undefined },
    });
    load();
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link to="/" className="text-sm text-slate-400 hover:text-white">
          &larr; Geri
        </Link>
        <h1 className="text-2xl font-bold mt-2">Moderasyon Paneli</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading && <p className="text-slate-400">Yukleniyor...</p>}
        {!loading && topics.length === 0 && (
          <p className="text-slate-400">Onay bekleyen konu yok.</p>
        )}

        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="bg-slate-800 rounded-xl p-5">
              <span className="text-xs uppercase tracking-wide text-indigo-400">
                {topic.category}
              </span>
              <h3 className="text-lg font-semibold mt-1">{topic.title}</h3>
              <p className="text-slate-400 text-sm mt-1">{topic.description}</p>
              <div className="flex gap-3 mt-2 text-sm">
                {topic.sides.map((side) => (
                  <span key={side.id} className="px-3 py-1 rounded-full bg-slate-700 text-slate-300">
                    {side.label}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Olusturan: {topic.creator.username}</p>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAction(topic.id, 'APPROVE')}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition"
                >
                  Onayla
                </button>
                <button
                  onClick={() => handleAction(topic.id, 'REQUEST_REVISION')}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium transition"
                >
                  Duzeltme Iste
                </button>
                <button
                  onClick={() => handleAction(topic.id, 'REJECT')}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition"
                >
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
