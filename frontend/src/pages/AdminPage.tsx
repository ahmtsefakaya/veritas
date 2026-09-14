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
    <div className="min-h-screen bg-ink">
      <header className="border-b border-line px-6 py-5 max-w-3xl mx-auto">
        <Link to="/" className="font-mono text-xs text-parchment-dim hover:text-parchment">
          &larr; gundeme don
        </Link>
        <h1 className="font-display text-2xl text-parchment mt-2">Moderasyon Masasi</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading && <p className="text-parchment-dim text-sm">yukleniyor...</p>}
        {!loading && topics.length === 0 && (
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
      </main>
    </div>
  );
}
