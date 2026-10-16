import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import { StrengthBar, type TopicSummary } from './CaseCard';

/** Sag sutunun ortak kart kabi. */
export function RailCard({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      {title && (
        <header className="flex items-center justify-between gap-2 px-4 pb-1 pt-3">
          <h2 className="font-display text-lg text-parchment">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Sag sutundaki arama kutusu — her sayfadan davaya ulasmak icin. */
export function RailSearch({ defaultValue = '' }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        navigate(query ? `/kesfet?q=${encodeURIComponent(query)}` : '/kesfet');
      }}
      role="search"
      className="sticky top-0 z-10 bg-ink pb-1 pt-1"
    >
      <div className="flex items-center gap-2 rounded-full border border-transparent bg-ink-3 px-4 focus-within:border-brass focus-within:bg-ink">
        <Icon name="ara" className="h-5 w-5 shrink-0 text-parchment-dim" />
        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Dava ara"
          aria-label="Dava ara"
          className="min-h-[44px] w-full bg-transparent text-sm text-parchment outline-none placeholder:text-parchment-dim"
        />
      </div>
    </form>
  );
}

/**
 * Canli davalar: en hareketli uc dosya, guc cubuklariyla.
 * Sosyal akislardaki "gundem" kutusunun yerini alir; ama siralama populerlik
 * degil, son hareket ve kanit yogunlugudur.
 */
export function LiveCases() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);

  useEffect(() => {
    apiRequest<{ items: TopicSummary[] }>('/topics?limit=3&sort=active')
      .then((page) => setTopics(page.items))
      .catch(() => undefined);
  }, []);

  if (topics.length === 0) return null;

  return (
    <RailCard title="Canli davalar">
      <ul>
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              to={`/topics/${topic.id}`}
              className="block px-4 py-3 transition-colors hover:bg-ink-3"
            >
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-parchment-dim">
                {topic.category}
              </p>
              <p className="mb-2 line-clamp-2 text-sm leading-snug text-parchment">{topic.title}</p>
              <StrengthBar sides={topic.sides} leadingSideId={topic.leadingSideId} compact />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        to="/kesfet"
        className="block border-t border-line px-4 py-3 text-sm text-brass transition-colors hover:bg-ink-3"
      >
        Tumunu gor
      </Link>
    </RailCard>
  );
}

/** Kategori bulutu — sag sutundan hizli suzme. */
export function CategoryCloud({ active }: { active?: string }) {
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);

  useEffect(() => {
    apiRequest<{ category: string; count: number }[]>('/topics/categories')
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  if (categories.length === 0) return null;

  return (
    <RailCard title="Kategoriler">
      <div className="flex flex-wrap gap-2 px-4 pb-4 pt-2">
        {categories.map((item) => (
          <Link
            key={item.category}
            to={`/kesfet?category=${encodeURIComponent(item.category)}`}
            className={`flex min-h-[36px] items-center rounded-full border px-3 text-xs transition-colors ${
              active === item.category
                ? 'border-brass text-brass'
                : 'border-line text-parchment-dim hover:border-brass hover:text-parchment'
            }`}
          >
            {item.category}
            <span className="ml-1.5 font-mono text-[11px] opacity-70">{item.count}</span>
          </Link>
        ))}
      </div>
    </RailCard>
  );
}

/** Giris yapmamis ziyaretciye kisa deger onerisi; giris yapana odul durumu. */
export function AccountCard() {
  const { user, accessToken } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  // Bakiye ayri bir uctan degil, `/users/me` icindeki `pointsBalance`'tan gelir.
  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ pointsBalance: number }>('/users/me', { token: accessToken })
      .then((data) => setBalance(data.pointsBalance))
      .catch(() => undefined);
  }, [accessToken]);

  if (!user) {
    return (
      <RailCard title="Veritas'a katil">
        <div className="space-y-3 px-4 pb-4 pt-1">
          <p className="text-sm leading-relaxed text-parchment-dim">
            Tartismayi yuksek ses degil, kanit kalitesi belirler. Kaydol, kendi davani ac,
            delilini sun; yapay zeka puanlasin.
          </p>
          <Link
            to="/login"
            className="flex min-h-[44px] items-center justify-center rounded-full bg-brass px-4 font-semibold text-ink transition-colors hover:bg-brass-light"
          >
            Hesap olustur
          </Link>
        </div>
      </RailCard>
    );
  }

  return (
    <RailCard title="Durumun">
      <dl className="grid grid-cols-2 gap-px bg-line">
        <div className="bg-ink-2 px-4 py-3">
          <dt className="font-mono text-[11px] text-parchment-dim">itibar</dt>
          <dd className="font-display text-2xl text-parchment">{user.reputationScore}</dd>
        </div>
        <div className="bg-ink-2 px-4 py-3">
          <dt className="font-mono text-[11px] text-parchment-dim">odul puani</dt>
          <dd className="font-display text-2xl text-brass">{balance ?? '-'}</dd>
        </div>
      </dl>
      <Link
        to="/rewards"
        className="block border-t border-line px-4 py-3 text-sm text-brass transition-colors hover:bg-ink-3"
      >
        Odul programi ve uygunluk
      </Link>
    </RailCard>
  );
}

const FOOTER_LINKS = [
  { to: '/how-it-works', label: 'Nasil calisir' },
  { to: '/rules', label: 'Kurallar' },
  { to: '/leaderboard', label: 'Siralama' },
  { to: '/terms', label: 'Sartlar' },
  { to: '/privacy', label: 'Gizlilik' },
];

export function RailFooter() {
  const year = useMemo(() => new Date().getFullYear(), []);
  return (
    <nav className="flex flex-wrap gap-x-3 gap-y-1 px-2 pb-6 font-mono text-[11px] text-parchment-dim">
      {FOOTER_LINKS.map((link) => (
        <Link key={link.to} to={link.to} className="py-1 hover:text-brass">
          {link.label}
        </Link>
      ))}
      <span className="py-1">&copy; {year} Veritas</span>
    </nav>
  );
}

/** Sayfalarin cogunda kullanilan varsayilan sag sutun bilesimi. */
export default function RightRail({
  children,
  activeCategory,
}: {
  children?: ReactNode;
  activeCategory?: string;
}) {
  return (
    <>
      <RailSearch />
      {children}
      <AccountCard />
      <LiveCases />
      <CategoryCloud active={activeCategory} />
      <RailFooter />
    </>
  );
}
