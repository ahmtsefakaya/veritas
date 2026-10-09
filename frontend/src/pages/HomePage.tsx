import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Side {
  id: string;
  position: 'A' | 'B';
  label: string;
  totalScore: number;
  evidenceCount: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  sides: Side[];
  leadingSideId: string | null;
  commentCount: number;
  createdAt: string;
}

interface TopicPage {
  items: Topic[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

const PAGE_SIZE = 10;
const SORTS = [
  { key: 'new', label: 'en yeni' },
  { key: 'active', label: 'hareketli' },
  { key: 'old', label: 'en eski' },
] as const;

export default function HomePage() {
  const [data, setData] = useState<TopicPage | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'new' | 'active' | 'old'>('new');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    apiRequest<CategoryCount[]>('/topics/categories')
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
    });
    if (category) params.set('category', category);
    if (query) params.set('q', query);

    setLoading(true);
    apiRequest<TopicPage>(`/topics?${params.toString()}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, category, sort, query]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function pickCategory(value: string) {
    setPage(1);
    setCategory(value);
  }

  const topics = data?.items ?? [];
  const offset = ((data?.page ?? 1) - 1) * (data?.limit ?? PAGE_SIZE);

  return (
    <div className="min-h-screen bg-ink flex">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-line px-5 py-6 sticky top-0 h-screen">
        <h1 className="font-display text-2xl text-parchment mb-8">Veritas</h1>

        <nav className="flex flex-col gap-1">
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

        {categories.length > 0 && (
          <div className="mt-8 flex-1 overflow-y-auto">
            <p className="font-mono text-xs text-parchment-dim tracking-wide mb-2">kategoriler</p>
            <button
              type="button"
              onClick={() => pickCategory('')}
              className={`block w-full text-left px-2 py-1 rounded-sm font-mono text-xs transition-colors ${
                category === '' ? 'text-brass' : 'text-parchment-dim hover:text-parchment'
              }`}
            >
              tumu
            </button>
            {categories.map((c) => (
              <button
                key={c.category}
                type="button"
                onClick={() => pickCategory(c.category)}
                className={`block w-full text-left px-2 py-1 rounded-sm font-mono text-xs transition-colors ${
                  category === c.category ? 'text-brass' : 'text-parchment-dim hover:text-parchment'
                }`}
              >
                {c.category.toLowerCase()} ({c.count})
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-line pt-4 mt-4">
          {user ? (
            <>
              <p className="font-mono text-xs text-parchment truncate">
                {user.displayName ?? user.username}
              </p>
              <button
                onClick={logout}
                className="font-mono text-xs text-parchment-dim hover:text-brass transition-colors mt-1"
              >
                cikis yap
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="font-mono text-xs text-brass hover:text-parchment transition-colors"
            >
              giris yap / kayit ol
            </Link>
          )}
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

        <div className="px-6 py-4 border-b border-line space-y-3">
          <form onSubmit={applySearch} className="flex gap-2">
            <input
              type="search"
              placeholder="dava ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-sm border border-line font-mono text-xs text-parchment-dim hover:text-brass hover:border-brass transition-colors"
            >
              ara
            </button>
          </form>

          <div className="flex items-center gap-3 flex-wrap">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setPage(1);
                  setSort(s.key);
                }}
                className={`font-mono text-xs transition-colors ${
                  sort === s.key ? 'text-brass' : 'text-parchment-dim hover:text-parchment'
                }`}
              >
                {s.label}
              </button>
            ))}
            <span className="font-mono text-xs text-parchment-dim ml-auto">
              {data ? `${data.total} dava` : ''}
            </span>
          </div>

          {(category || query) && (
            <div className="flex gap-2 flex-wrap">
              {category && (
                <button
                  type="button"
                  onClick={() => pickCategory('')}
                  className="font-mono text-xs px-2 py-0.5 rounded-sm border border-brass text-brass"
                >
                  {category} &times;
                </button>
              )}
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSearchInput('');
                    setPage(1);
                  }}
                  className="font-mono text-xs px-2 py-0.5 rounded-sm border border-brass text-brass"
                >
                  "{query}" &times;
                </button>
              )}
            </div>
          )}
        </div>

        {loading && <p className="text-parchment-dim text-sm px-6 py-8">yukleniyor...</p>}

        {!loading && topics.length === 0 && (
          <p className="text-parchment-dim text-sm px-6 py-8">
            {query || category
              ? 'bu filtreyle dava bulunamadi.'
              : 'henuz onaylanmis bir dava yok. ilk davayi sen ac.'}
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
                  DAVA-{String(offset + i + 1).padStart(3, '0')}
                </span>
                <span className="font-mono text-xs text-parchment-dim uppercase tracking-wide">
                  {topic.category}
                </span>
                {topic.commentCount > 0 && (
                  <span className="font-mono text-xs text-parchment-dim ml-auto">
                    {topic.commentCount} yorum
                  </span>
                )}
              </div>
              <h3 className="font-display text-xl text-parchment mb-1.5">{topic.title}</h3>
              <p className="text-parchment-dim text-sm leading-relaxed line-clamp-2 mb-3">
                {topic.description}
              </p>
              <div className="flex gap-2">
                {topic.sides.map((side) => (
                  <span
                    key={side.id}
                    className={`font-mono text-xs px-2.5 py-1 rounded-sm border ${
                      topic.leadingSideId === side.id
                        ? 'border-brass text-brass'
                        : 'border-line text-parchment-dim'
                    }`}
                  >
                    {side.position} &middot; {side.label} &middot; {side.totalScore}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-5">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="font-mono text-xs px-3 py-1.5 rounded-sm border border-line text-parchment-dim hover:text-brass hover:border-brass transition-colors disabled:opacity-40"
            >
              &larr; onceki
            </button>
            <span className="font-mono text-xs text-parchment-dim">
              sayfa {data.page} / {data.totalPages}
            </span>
            <button
              type="button"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="font-mono text-xs px-3 py-1.5 rounded-sm border border-line text-parchment-dim hover:text-brass hover:border-brass transition-colors disabled:opacity-40"
            >
              sonraki &rarr;
            </button>
          </div>
        )}
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
