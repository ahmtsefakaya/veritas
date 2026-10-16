import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { apiRequest } from '../api/client';
import AppShell from '../components/AppShell';
import RightRail from '../components/RightRail';
import CaseCard, { type TopicSummary } from '../components/CaseCard';
import { PageHeader, MobilePageTitle } from '../components/Tabs';
import Icon from '../components/Icon';

interface TopicPage {
  items: TopicSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

/*
  Kesfet.

  Arama ve kategori suzgeci eskiden ana akisin basligina sikismisti. Ayri bir
  sayfaya tasinmasi iki sey kazandiriyor: akis temiz kaliyor ve bir arama
  sonucu artik paylasilabilir bir adres (``/kesfet?q=...&category=...``).
*/
export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const page = Number(params.get('page') ?? '1');

  useDocumentTitle(query ? `"${query}" aramasi` : category ? `${category} davalari` : 'Kesfet');

  const [input, setInput] = useState(query);
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [data, setData] = useState<TopicPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    apiRequest<{ category: string; count: number }[]>('/topics/categories')
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const search = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort: 'active' });
    if (query) search.set('q', query);
    if (category) search.set('category', category);
    setLoading(true);
    apiRequest<TopicPage>(`/topics?${search.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [query, category, page]);

  function update(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value) merged.set(key, value);
      else merged.delete(key);
    });
    if (!('page' in next)) merged.delete('page');
    setParams(merged);
  }

  const topics = data?.items ?? [];
  const offset = ((data?.page ?? 1) - 1) * (data?.limit ?? PAGE_SIZE);

  const searchField = (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        update({ q: input.trim() });
      }}
      className="px-4 py-2 sm:px-5"
    >
      <div className="flex items-center gap-2 rounded-full border border-transparent bg-ink-3 px-4 focus-within:border-brass focus-within:bg-ink">
        <Icon name="ara" className="h-5 w-5 shrink-0 text-parchment-dim" />
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Dava, taraf veya aciklama ara"
          aria-label="Dava ara"
          className="min-h-[44px] w-full bg-transparent text-sm text-parchment outline-none placeholder:text-parchment-dim"
        />
        {input && (
          <button
            type="button"
            onClick={() => {
              setInput('');
              update({ q: '' });
            }}
            aria-label="Aramayi temizle"
            className="flex h-8 w-8 items-center justify-center rounded-full text-parchment-dim hover:bg-ink-2"
          >
            <Icon name="kapat" className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );

  const categoryStrip = (
    <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-line px-4 pb-3 sm:px-5">
      <button
        type="button"
        aria-pressed={category === ''}
        onClick={() => update({ category: '' })}
        className={`flex min-h-[36px] shrink-0 items-center rounded-full border px-3 text-xs transition-colors ${
          category === '' ? 'border-brass text-brass' : 'border-line text-parchment-dim hover:text-parchment'
        }`}
      >
        Tumu
      </button>
      {categories.map((item) => (
        <button
          key={item.category}
          type="button"
          aria-pressed={category === item.category}
          onClick={() => update({ category: item.category })}
          className={`flex min-h-[36px] shrink-0 items-center rounded-full border px-3 text-xs transition-colors ${
            category === item.category
              ? 'border-brass text-brass'
              : 'border-line text-parchment-dim hover:text-parchment'
          }`}
        >
          {item.category}
          <span className="ml-1.5 font-mono text-[11px] opacity-70">{item.count}</span>
        </button>
      ))}
    </div>
  );

  return (
    <AppShell right={<RightRail activeCategory={category || undefined} />}>
      <PageHeader title="Kesfet" subtitle={data ? `${data.total} dava` : undefined}>
        {searchField}
        {categoryStrip}
      </PageHeader>

      <div className="md:hidden">
        <MobilePageTitle title="Kesfet" subtitle={data ? `${data.total} dava` : undefined} />
        {searchField}
        {categoryStrip}
      </div>

      {(query || category) && (
        <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5">
          {category && (
            <button
              type="button"
              onClick={() => update({ category: '' })}
              className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-brass px-3 text-xs text-brass"
            >
              {category} <Icon name="kapat" className="h-3 w-3" />
            </button>
          )}
          {query && (
            <button
              type="button"
              onClick={() => update({ q: '' })}
              className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-brass px-3 text-xs text-brass"
            >
              &quot;{query}&quot; <Icon name="kapat" className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {loading && <p className="px-4 py-10 text-center text-sm text-parchment-dim">yukleniyor...</p>}

      {!loading && topics.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-parchment-dim sm:px-5">
          Bu filtreyle dava bulunamadi.
        </p>
      )}

      {!loading &&
        topics.map((topic, index) => (
          <CaseCard key={topic.id} topic={topic} index={offset + index + 1} />
        ))}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-4 py-5 sm:px-5">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => update({ page: String(Math.max(1, data.page - 1)) })}
            className="min-h-[44px] rounded-full border border-line px-4 text-sm text-parchment-dim transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
          >
            &larr; Onceki
          </button>
          <span className="font-mono text-xs text-parchment-dim">
            {data.page} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => update({ page: String(data.page + 1) })}
            className="min-h-[44px] rounded-full border border-line px-4 text-sm text-parchment-dim transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
          >
            Sonraki &rarr;
          </button>
        </div>
      )}
    </AppShell>
  );
}
