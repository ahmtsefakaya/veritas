import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Yapiskan sayfa basligi: geri oku (istege bagli), baslik, alt satir ve
 * altinda sekme seridi. Akis sutununun ustunde asili kalir.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  action?: ReactNode;
  /** Sekme seridi gibi baslik altina giren icerik */
  children?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 hidden border-b border-line bg-ink/85 backdrop-blur md:block">
      <div className="flex items-center gap-4 px-4 py-2.5 sm:px-5">
        {back && (
          <Link
            to={back}
            aria-label="Geri"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-parchment transition-colors hover:bg-ink-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl leading-tight text-parchment">{title}</h1>
          {subtitle && (
            <p className="truncate font-mono text-xs text-parchment-dim">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Telefonda basligin karsiligi — alt cubuk zaten gezinmeyi tasidigi icin sade. */
export function MobilePageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-line px-4 py-3 md:hidden">
      <h1 className="font-display text-xl text-parchment">{title}</h1>
      {subtitle && <p className="font-mono text-xs text-parchment-dim">{subtitle}</p>}
    </div>
  );
}

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

/**
 * Alti cizili sekme seridi. Tasma durumunda yatay kaydirilir ki telefonda
 * kategori sayisi artsa bile hicbir sekme erisilemez hale gelmesin.
 */
export default function Tabs({
  items,
  active,
  onChange,
  ariaLabel = 'Sekmeler',
}: {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="no-scrollbar flex overflow-x-auto">
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(item.key)}
            className={`relative flex min-h-[48px] flex-1 shrink-0 items-center justify-center whitespace-nowrap px-4 text-sm transition-colors hover:bg-ink-2 ${
              selected ? 'font-semibold text-parchment' : 'text-parchment-dim'
            }`}
          >
            <span>
              {item.label}
              {typeof item.count === 'number' && (
                <span className="ml-1.5 font-mono text-xs text-parchment-dim">{item.count}</span>
              )}
            </span>
            {selected && (
              <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-brass" />
            )}
          </button>
        );
      })}
    </div>
  );
}
