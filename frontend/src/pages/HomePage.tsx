import { useCallback, useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { apiRequest } from '../api/client';
import AppShell from '../components/AppShell';
import RightRail from '../components/RightRail';
import CaseCard, { type TopicSummary } from '../components/CaseCard';
import Tabs, { PageHeader, MobilePageTitle } from '../components/Tabs';
import QuickCase from '../components/QuickCase';

interface TopicPage {
  items: TopicSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

const FEEDS = [
  { key: 'new', label: 'En yeni' },
  { key: 'active', label: 'Hareketli' },
  { key: 'old', label: 'En eski' },
] as const;

type FeedKey = (typeof FEEDS)[number]['key'];

export default function HomePage() {
  useDocumentTitle('Gundem');
  const [data, setData] = useState<TopicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<FeedKey>('new');
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      sort,
    });
    setLoading(true);
    apiRequest<TopicPage>(`/topics?${params.toString()}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [page, sort]);

  useEffect(load, [load, reloadKey]);

  const topics = data?.items ?? [];
  const offset = ((data?.page ?? 1) - 1) * (data?.limit ?? PAGE_SIZE);

  return (
    <AppShell right={<RightRail />}>
      <PageHeader title="Gundem" subtitle={data ? `${data.total} dava` : undefined}>
        <Tabs
          items={FEEDS.map((feed) => ({ key: feed.key, label: feed.label }))}
          active={sort}
          ariaLabel="Akis siralamasi"
          onChange={(key) => {
            setPage(1);
            setSort(key as FeedKey);
          }}
        />
      </PageHeader>

      <MobilePageTitle title="Gundem" subtitle={data ? `${data.total} dava` : undefined} />
      <div className="sticky top-[57px] z-10 border-b border-line bg-ink/85 backdrop-blur md:hidden">
        <Tabs
          items={FEEDS.map((feed) => ({ key: feed.key, label: feed.label }))}
          active={sort}
          ariaLabel="Akis siralamasi"
          onChange={(key) => {
            setPage(1);
            setSort(key as FeedKey);
          }}
        />
      </div>

      <QuickCase onCreated={() => setReloadKey((value) => value + 1)} />

      {loading && (
        <div className="space-y-4 px-4 py-6 sm:px-5">
          {[0, 1, 2].map((row) => (
            <div key={row} className="animate-pulse space-y-2">
              <div className="h-3 w-24 rounded bg-ink-3" />
              <div className="h-5 w-3/4 rounded bg-ink-3" />
              <div className="h-3 w-full rounded bg-ink-3" />
              <div className="h-1.5 w-full rounded bg-ink-3" />
            </div>
          ))}
        </div>
      )}

      {!loading && topics.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-parchment-dim sm:px-5">
          Henuz onaylanmis bir dava yok. Ilk davayi sen ac.
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
            onClick={() => setPage((value) => Math.max(1, value - 1))}
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
            onClick={() => setPage((value) => value + 1)}
            className="min-h-[44px] rounded-full border border-line px-4 text-sm text-parchment-dim transition-colors hover:border-brass hover:text-brass disabled:opacity-40"
          >
            Sonraki &rarr;
          </button>
        </div>
      )}
    </AppShell>
  );
}
