import { Link } from 'react-router-dom';
import Icon from './Icon';

export interface Side {
  id: string;
  position: 'A' | 'B';
  label: string;
  totalScore: number;
  averageScore?: number | null;
  strengthScore: number | null;
  evidenceCount: number;
  scoredCount?: number;
}

export interface TopicSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  sides: Side[];
  leadingSideId: string | null;
  isTie?: boolean;
  commentCount: number;
  createdAt: string;
  creator?: { username: string; displayName: string | null } | null;
}

/** Guc degerini renge cevirir: 60 ustu guclu, 40 alti zayif. */
export function strengthTone(value: number | null) {
  if (value === null) return 'text-parchment-dim';
  if (value >= 60) return 'text-verdict-strong';
  if (value <= 40) return 'text-verdict-weak';
  return 'text-verdict-mid';
}

/**
 * Iki tarafin gucunu tek bir cubukta karsilastirir.
 *
 * Bu, orijinal sosyal akislarda karsiligi olmayan Veritas'a ozgu bilesendir:
 * bir gonderinin begeni sayisi yerine iki tezin kanit gucu yarisir. Oranlar
 * `strengthScore` (buzusmeli ortalama) uzerinden hesaplanir; toplam puan
 * kullanilsaydi cok sayida vasat kanit az sayida guclu kaniti ezerdi.
 */
export function StrengthBar({ sides, leadingSideId, compact = false }: {
  sides: Side[];
  leadingSideId?: string | null;
  compact?: boolean;
}) {
  const a = sides.find((side) => side.position === 'A');
  const b = sides.find((side) => side.position === 'B');
  if (!a || !b) return null;

  const aScore = a.strengthScore ?? 50;
  const bScore = b.strengthScore ?? 50;
  const total = aScore + bScore || 1;
  const aPercent = Math.round((aScore / total) * 100);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full bg-side-a" />
          <span className="truncate text-parchment">{a.label}</span>
          <span className={`font-mono font-semibold ${strengthTone(a.strengthScore)}`}>
            {a.strengthScore ?? '-'}
          </span>
          {leadingSideId === a.id && <span className="font-mono text-[10px] text-brass">onde</span>}
        </span>
        <span className="flex min-w-0 items-baseline gap-1.5">
          {leadingSideId === b.id && <span className="font-mono text-[10px] text-brass">onde</span>}
          <span className={`font-mono font-semibold ${strengthTone(b.strengthScore)}`}>
            {b.strengthScore ?? '-'}
          </span>
          <span className="truncate text-parchment">{b.label}</span>
          <span className="h-2 w-2 shrink-0 rounded-full bg-side-b" />
        </span>
      </div>

      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-ink-4"
        role="img"
        aria-label={`${a.label} gucu ${a.strengthScore ?? 'yok'}, ${b.label} gucu ${b.strengthScore ?? 'yok'}`}
      >
        <span
          className="bg-side-a transition-[width] duration-500"
          style={{ width: `${aPercent}%` }}
        />
        <span
          className="bg-side-b transition-[width] duration-500"
          style={{ width: `${100 - aPercent}%` }}
        />
      </div>
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.round(diff / minute))} dk`;
  if (diff < day) return `${Math.round(diff / hour)} sa`;
  if (diff < 7 * day) return `${Math.round(diff / day)} g`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

/**
 * Akistaki tek dava satiri.
 *
 * Kart cercevesi yok; satirlar ince ayracla ayrilir ve tum yuzey tiklanabilir —
 * sosyal akislardan tanidik olan bu kalip, tarama hizini artiriyor. Icerik ise
 * tamamen Veritas'a ait: iki tez, guc cubugu, kanit ve yorum sayaci.
 */
export default function CaseCard({ topic, index }: { topic: TopicSummary; index?: number }) {
  const evidenceTotal = topic.sides.reduce((sum, side) => sum + side.evidenceCount, 0);

  return (
    <article className="relative border-b border-line transition-colors hover:bg-ink-2/60">
      <Link to={`/topics/${topic.id}`} className="block px-4 py-3.5 sm:px-5">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-parchment-dim">
            {topic.category}
          </span>
          {typeof index === 'number' && (
            <span className="font-mono text-[11px] text-brass-dim">
              DAVA-{String(index).padStart(3, '0')}
            </span>
          )}
          {topic.status === 'PENDING' && (
            <span className="rounded-full border border-verdict-mid px-2 py-0.5 font-mono text-[11px] text-verdict-mid">
              onay bekliyor
            </span>
          )}
          <span className="ml-auto font-mono text-[11px] text-parchment-dim">
            {relativeTime(topic.createdAt)}
          </span>
        </div>

        <h3 className="font-display text-[19px] leading-snug text-parchment">{topic.title}</h3>
        <p className="mb-3 mt-1 line-clamp-2 text-sm leading-relaxed text-parchment-dim">
          {topic.description}
        </p>

        <StrengthBar sides={topic.sides} leadingSideId={topic.leadingSideId} />

        <div className="mt-3 flex items-center gap-6 text-parchment-dim">
          <span className="flex items-center gap-1.5 text-xs">
            <Icon name="delil" className="h-4 w-4" /> {evidenceTotal} delil
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <Icon name="yorum" className="h-4 w-4" /> {topic.commentCount} yorum
          </span>
          {topic.isTie && <span className="font-mono text-[11px] text-brass">berabere</span>}
        </div>
      </Link>
    </article>
  );
}
