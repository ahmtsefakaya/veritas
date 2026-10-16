import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import RightRail from '../components/RightRail';
import { PageHeader, MobilePageTitle } from '../components/Tabs';

const CATEGORIES = ['Siyaset', 'Bilim', 'Tarih', 'Ekonomi', 'Teknoloji', 'Saglik', 'Spor', 'Diger'];

export default function NewTopicPage() {
  useDocumentTitle('Yeni dava');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [sideALabel, setSideALabel] = useState('');
  const [sideBLabel, setSideBLabel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const created = await apiRequest<{ id: string }>('/topics', {
        method: 'POST',
        token: accessToken,
        body: { title, description, category, sideALabel, sideBLabel },
      });
      navigate(`/topics/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu.');
    } finally {
      setLoading(false);
    }
  }

  const field =
    'w-full rounded-xl border border-line bg-ink-2 px-4 py-3 text-sm text-parchment outline-none transition-colors placeholder:text-parchment-dim focus:border-brass';

  return (
    <AppShell right={<RightRail />}>
      <PageHeader title="Yeni dava" subtitle="iki taraf, bir soru" back="/" />
      <MobilePageTitle title="Yeni dava" subtitle="iki taraf, bir soru" />

      <p className="border-b border-line px-4 py-4 text-sm leading-relaxed text-parchment-dim sm:px-5">
        Davan moderasyondan gectikten sonra gundeme duser. Beklerken kendi davana kanit
        eklemeye devam edebilirsin.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-5 sm:px-5">
        <div>
          <label htmlFor="topic-title" className="mb-1.5 block font-mono text-xs text-parchment-dim">
            dava sorusu
          </label>
          <input
            id="topic-title"
            type="text"
            placeholder="Ornek: Yapay zeka istihdami azaltir mi?"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className={`${field} font-display text-lg`}
          />
        </div>

        <div>
          <label htmlFor="topic-desc" className="mb-1.5 block font-mono text-xs text-parchment-dim">
            baglam
          </label>
          <textarea
            id="topic-desc"
            placeholder="Tartisilan sey tam olarak ne? Hangi donem, hangi kapsam?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={4}
            className={`${field} resize-none`}
          />
        </div>

        <fieldset>
          <legend className="mb-1.5 font-mono text-xs text-parchment-dim">kategori</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={`flex min-h-[40px] items-center rounded-full border px-4 text-sm transition-colors ${
                  category === item
                    ? 'border-brass text-brass'
                    : 'border-line text-parchment-dim hover:text-parchment'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="side-a" className="mb-1.5 flex items-center gap-2 font-mono text-xs text-parchment-dim">
              <span className="h-2 w-2 rounded-full bg-side-a" /> A tarafi
            </label>
            <input
              id="side-a"
              type="text"
              placeholder="Evet, azaltir"
              value={sideALabel}
              onChange={(event) => setSideALabel(event.target.value)}
              required
              className={field}
            />
          </div>
          <div>
            <label htmlFor="side-b" className="mb-1.5 flex items-center gap-2 font-mono text-xs text-parchment-dim">
              <span className="h-2 w-2 rounded-full bg-side-b" /> B tarafi
            </label>
            <input
              id="side-b"
              type="text"
              placeholder="Hayir, azaltmaz"
              value={sideBLabel}
              onChange={(event) => setSideBLabel(event.target.value)}
              required
              className={field}
            />
          </div>
        </div>

        {error && <p className="text-sm text-verdict-weak">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="min-h-[48px] w-full rounded-full bg-brass font-semibold text-ink transition-colors hover:bg-brass-light disabled:opacity-50"
        >
          {loading ? 'gonderiliyor...' : 'Davayi ac'}
        </button>
      </form>
    </AppShell>
  );
}
