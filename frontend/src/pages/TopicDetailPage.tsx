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

function verdictColor(score: number | null) {
  if (score === null) return 'text-parchment-dim border-line';
  if (score >= 70) return 'text-verdict-strong border-verdict-strong';
  if (score >= 40) return 'text-verdict-mid border-verdict-mid';
  return 'text-verdict-weak border-verdict-weak';
}

function EvidenceCard({ evidence, exhibitLabel }: { evidence: Evidence; exhibitLabel: string }) {
  return (
    <div className="border border-line rounded-sm p-4 bg-ink-2">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="font-mono text-xs text-brass">{exhibitLabel}</span>
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded-sm border shrink-0 ${verdictColor(evidence.score)}`}
        >
          {evidence.score === null ? 'puanlaniyor' : `${evidence.score}/100`}
        </span>
      </div>
      <p className="text-parchment text-sm leading-relaxed">{evidence.content}</p>
      {evidence.sourceUrl && (
        <a
          href={evidence.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-brass hover:text-brass-light mt-2 inline-block"
        >
          kaynak &rarr;
        </a>
      )}
      {evidence.aiReasoning && (
        <p className="text-xs text-parchment-dim mt-2 leading-relaxed border-t border-line pt-2">
          {evidence.aiReasoning}
        </p>
      )}
      <p className="font-mono text-xs text-parchment-dim mt-2">
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
      <div className="flex items-baseline gap-2 mb-4">
        <span className="font-mono text-xs text-parchment-dim">TARAF {side.position}</span>
        <h3 className="font-display text-lg text-parchment">{side.label}</h3>
      </div>

      <div className="space-y-3 mb-5">
        {sorted.length === 0 && (
          <p className="text-parchment-dim text-sm">henuz kanit sunulmadi.</p>
        )}
        {sorted.map((ev, i) => (
          <EvidenceCard
            key={ev.id}
            evidence={ev}
            exhibitLabel={`${side.position}-${i + 1}`}
          />
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-2 border-t border-line pt-4">
        <textarea
          placeholder="Kanitini sun..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          className="w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
        />
        <input
          type="url"
          placeholder="Kaynak linki (opsiyonel)"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
        />
        {error && <p className="text-verdict-weak text-xs font-mono">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-sm bg-brass hover:bg-brass-light text-ink text-sm font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? 'sunuluyor...' : 'kanit sun'}
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
    return <div className="min-h-screen bg-ink text-parchment-dim text-sm p-6">yukleniyor...</div>;
  }

  if (!topic) {
    return <div className="min-h-screen bg-ink text-parchment-dim text-sm p-6">dava bulunamadi.</div>;
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-line px-6 py-5 max-w-5xl mx-auto">
        <Link to="/" className="font-mono text-xs text-parchment-dim hover:text-parchment">
          &larr; gundeme don
        </Link>
        <p className="font-mono text-xs text-brass mt-3">{topic.category.toUpperCase()}</p>
        <h1 className="font-display text-3xl text-parchment mt-1">{topic.title}</h1>
        <p className="text-parchment-dim text-sm mt-2 leading-relaxed max-w-2xl">
          {topic.description}
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 md:divide-x md:divide-line">
          <div className="md:pr-8 flex-1">
            {topic.sides
              .filter((s) => s.position === 'A')
              .map((side) => (
                <SideColumn key={side.id} side={side} onAdded={load} />
              ))}
          </div>
          <div className="md:pl-8 flex-1">
            {topic.sides
              .filter((s) => s.position === 'B')
              .map((side) => (
                <SideColumn key={side.id} side={side} onAdded={load} />
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
