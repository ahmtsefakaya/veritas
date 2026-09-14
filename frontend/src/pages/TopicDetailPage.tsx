import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Evidence {
  id: string;
  content: string;
  sourceUrl: string | null;
  score: number | null;
  aiReasoning: string | null;
  author: { username: string; displayName: string | null };
}

interface Side {
  id: string;
  position: 'A' | 'B';
  label: string;
  evidences: Evidence[];
}

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  sides: Side[];
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const scoreColor =
    evidence.score === null
      ? 'bg-slate-600'
      : evidence.score >= 70
        ? 'bg-emerald-600'
        : evidence.score >= 40
          ? 'bg-amber-600'
          : 'bg-red-600';

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-slate-200 text-sm">{evidence.content}</p>
        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full text-white ${scoreColor}`}>
          {evidence.score === null ? '...' : evidence.score}
        </span>
      </div>
      {evidence.sourceUrl && (
        <a
          href={evidence.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-indigo-400 hover:text-indigo-300 mt-2 inline-block"
        >
          Kaynak &rarr;
        </a>
      )}
      {evidence.aiReasoning && (
        <p className="text-xs text-slate-500 mt-2 italic">AI: {evidence.aiReasoning}</p>
      )}
      <p className="text-xs text-slate-500 mt-2">
        {evidence.author.displayName ?? evidence.author.username}
      </p>
    </div>
  );
}

function SideColumn({ side, onAdded }: { side: Side; onAdded: () => void }) {
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { accessToken } = useAuth();

  const sorted = [...side.evidences].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiRequest(`/topics/sides/${side.id}/evidences`, {
        method: 'POST',
        token: accessToken,
        body: { content, sourceUrl: sourceUrl || undefined },
      });
      setContent('');
      setSourceUrl('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-lg mb-3">{side.label}</h3>
      <div className="space-y-3 mb-4">
        {sorted.length === 0 && <p className="text-slate-500 text-sm">Henuz delil yok.</p>}
        {sorted.map((ev) => (
          <EvidenceCard key={ev.id} evidence={ev} />
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          placeholder="Delilini yaz..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="url"
          placeholder="Kaynak linki (opsiyonel)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-700 text-white placeholder-slate-400 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition disabled:opacity-50"
        >
          {submitting ? 'Ekleniyor...' : 'Delil Ekle'}
        </button>
      </form>
    </div>
  );
}

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    if (!id) return;
    apiRequest<Topic>(`/topics/${id}`)
      .then(setTopic)
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 text-white p-6">Yukleniyor...</div>;
  }

  if (!topic) {
    return <div className="min-h-screen bg-slate-900 text-white p-6">Konu bulunamadi.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-800 px-6 py-4">
        <Link to="/" className="text-sm text-slate-400 hover:text-white">
          &larr; Geri
        </Link>
        <h1 className="text-2xl font-bold mt-2">{topic.title}</h1>
        <p className="text-slate-400 text-sm mt-1">{topic.description}</p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {topic.sides
            .sort((a, b) => a.position.localeCompare(b.position))
            .map((side) => (
              <SideColumn key={side.id} side={side} onAdded={load} />
            ))}
        </div>
      </main>
    </div>
  );
}
