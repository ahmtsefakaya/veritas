import { useCallback, useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useParams, Link } from 'react-router-dom';
import { apiRequest, API_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { io, type Socket } from 'socket.io-client';
import CommentSection from '../components/CommentSection';
import AppShell, { Avatar } from '../components/AppShell';
import RightRail from '../components/RightRail';
import { PageHeader } from '../components/Tabs';
import Icon from '../components/Icon';
import { StrengthBar, strengthTone } from '../components/CaseCard';

interface Evidence {
  id: string;
  content: string;
  sourceUrl: string | null;
  score: number | null;
  aiReasoning: string | null;
  qualityBreakdown: {
    sourceReliability: number;
    verifiability: number;
    relevance: number;
    specificity: number;
    timeliness: number;
  } | null;
  voteScore: number;
  voteCount: number;
  myVote: number;
  reportCount: number;
  myReported: boolean;
  author: { username: string; displayName: string | null };
}

interface Side {
  id: string;
  position: 'A' | 'B';
  label: string;
  evidences: Evidence[];
  totalScore: number;
  averageScore: number | null;
  strengthScore: number | null;
  evidenceCount: number;
  scoredCount: number;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  status?: string;
  sides: Side[];
  leadingSideId: string | null;
  isTie: boolean;
}

function scoreTone(score: number | null) {
  if (score === null) return 'border-line text-parchment-dim';
  if (score >= 70) return 'border-verdict-strong text-verdict-strong';
  if (score >= 40) return 'border-verdict-mid text-verdict-mid';
  return 'border-verdict-weak text-verdict-weak';
}

/** Kalite bileseni: dolum cubugu + deger. Puanin nereden geldigini gorunur kilar. */
function QualityRow({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 font-mono text-[11px] text-parchment-dim">{label}</span>
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-ink-4">
        <span
          className="block h-full rounded-full bg-brass"
          style={{ width: `${Math.round((value / max) * 100)}%` }}
        />
      </span>
      <span className="w-10 shrink-0 text-right font-mono text-[11px] text-parchment-dim">
        {value}/{max}
      </span>
    </div>
  );
}

function VoteBar({ evidence, onChanged }: { evidence: Evidence; onChanged: () => void }) {
  const { accessToken, user } = useAuth();
  const [myVote, setMyVote] = useState(evidence.myVote);
  const [voteScore, setVoteScore] = useState(evidence.voteScore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const isOwn = user?.username === evidence.author.username;

  async function cast(value: number) {
    if (!user || busy) return;
    const next = myVote === value ? 0 : value;
    setBusy(true);
    setError('');
    try {
      const res = await apiRequest<{ voteScore: number; myVote: number }>(
        `/topics/evidences/${evidence.id}/vote`,
        { method: 'POST', token: accessToken, body: { value: next } },
      );
      setMyVote(res.myVote);
      setVoteScore(res.voteScore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oy verilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-1 border-t border-line pt-2">
        <button
          type="button"
          onClick={() => cast(1)}
          disabled={!user || isOwn || busy}
          title={!user ? 'Oy vermek icin giris yap' : isOwn ? 'Kendi kanitina oy veremezsin' : 'Ikna edici'}
          aria-label="Ikna edici"
          aria-pressed={myVote === 1}
          className={`flex h-10 min-w-[44px] items-center justify-center gap-1.5 rounded-full px-3 transition-colors disabled:opacity-40 ${
            myVote === 1 ? 'bg-verdict-strong/15 text-verdict-strong' : 'text-parchment-dim hover:bg-ink-3 hover:text-parchment'
          }`}
        >
          <Icon name="yukari" className="h-4 w-4" />
          <span className="font-mono text-xs">{voteScore}</span>
        </button>
        <button
          type="button"
          onClick={() => cast(-1)}
          disabled={!user || isOwn || busy}
          title={!user ? 'Oy vermek icin giris yap' : isOwn ? 'Kendi kanitina oy veremezsin' : 'Ikna edici degil'}
          aria-label="Ikna edici degil"
          aria-pressed={myVote === -1}
          className={`flex h-10 min-w-[44px] items-center justify-center rounded-full px-3 transition-colors disabled:opacity-40 ${
            myVote === -1 ? 'bg-verdict-weak/15 text-verdict-weak' : 'text-parchment-dim hover:bg-ink-3 hover:text-parchment'
          }`}
        >
          <Icon name="asagi" className="h-4 w-4" />
        </button>

        {evidence.sourceUrl && (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-1.5 rounded-full px-3 text-parchment-dim transition-colors hover:bg-ink-3 hover:text-brass"
          >
            <Icon name="paylas" className="h-4 w-4" />
            <span className="font-mono text-xs">kaynak</span>
          </a>
        )}

        {user && !isOwn && (
          <button
            type="button"
            onClick={() => setReportOpen((value) => !value)}
            className="ml-auto flex h-10 items-center rounded-full px-3 font-mono text-xs text-parchment-dim transition-colors hover:bg-ink-3 hover:text-verdict-weak"
          >
            {evidence.myReported ? 'bildirdiniz' : 'bildir'}
          </button>
        )}
        {evidence.reportCount > 0 && (
          <span className="font-mono text-[11px] text-verdict-weak">
            {evidence.reportCount} bildirim
          </span>
        )}
      </div>

      {error && <p className="mt-1 font-mono text-xs text-verdict-weak">{error}</p>}
      {reportOpen && !evidence.myReported && (
        <ReportForm
          evidence={evidence}
          onDone={() => {
            setReportOpen(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

const REPORT_REASONS = [
  { value: 'FAKE_SOURCE', label: 'Kaynak sahte veya uydurma' },
  { value: 'BROKEN_SOURCE', label: 'Kaynak linki calismiyor' },
  { value: 'MISREPRESENTS_SOURCE', label: 'Kaynagi yanlis aktariyor' },
  { value: 'OUT_OF_CONTEXT', label: 'Baglamdan koparilmis' },
  { value: 'DUPLICATE', label: 'Ayni kanit tekrar eklenmis' },
  { value: 'OFF_TOPIC', label: 'Konuyla ilgisiz' },
];

function ReportForm({ evidence, onDone }: { evidence: Evidence; onDone: () => void }) {
  const { accessToken } = useAuth();
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="mt-2 rounded-xl border border-line bg-ink p-3">
      <p className="mb-2 font-mono text-[11px] leading-relaxed text-parchment-dim">
        Bildiriminiz puani dogrudan degistirmez; yeterli bildirim toplanirsa kanit yapay zeka
        tarafindan yeniden degerlendirilir.
      </p>
      <label htmlFor={`reason-${evidence.id}`} className="sr-only">
        Sikayet nedeni
      </label>
      <select
        id={`reason-${evidence.id}`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-line bg-ink-2 px-2 text-sm text-parchment"
      >
        {REPORT_REASONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label htmlFor={`detail-${evidence.id}`} className="sr-only">
        Ek aciklama
      </label>
      <textarea
        id={`detail-${evidence.id}`}
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        placeholder="Ek aciklama (istege bagli)"
        maxLength={500}
        rows={2}
        className="mt-2 w-full rounded-lg border border-line bg-ink-2 px-2 py-1 text-sm text-parchment"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await apiRequest<{ reviewQueued: boolean }>(
                `/topics/evidences/${evidence.id}/report`,
                { method: 'POST', body: { reason, detail: detail || undefined }, token: accessToken },
              );
              setMessage(
                result.reviewQueued
                  ? 'Bildirildi. Kanit yeniden degerlendirmeye alindi.'
                  : 'Bildirildi.',
              );
              onDone();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="min-h-[40px] rounded-full bg-brass px-4 font-mono text-xs text-ink disabled:opacity-40"
        >
          {busy ? 'gonderiliyor...' : 'bildir'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-[40px] rounded-full border border-line px-4 font-mono text-xs text-parchment-dim"
        >
          vazgec
        </button>
      </div>
      {message && <p className="mt-2 font-mono text-xs text-parchment-dim">{message}</p>}
    </div>
  );
}

function EvidenceCard({
  evidence,
  exhibitLabel,
  onChanged,
}: {
  evidence: Evidence;
  exhibitLabel: string;
  onChanged: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <article className="border-b border-line px-4 py-4">
      <div className="flex gap-3">
        <Avatar name={evidence.author.displayName ?? evidence.author.username} size={36} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={`/users/${evidence.author.username}`}
              className="truncate text-sm font-semibold text-parchment hover:underline"
            >
              {evidence.author.displayName ?? evidence.author.username}
            </Link>
            <span className="font-mono text-[11px] text-parchment-dim">
              @{evidence.author.username}
            </span>
            <span className="font-mono text-[11px] text-brass-dim">{exhibitLabel}</span>
            <span
              className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px] ${scoreTone(evidence.score)}`}
            >
              {evidence.score === null ? 'puanlaniyor' : `${evidence.score}/100`}
            </span>
          </div>

          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-parchment">
            {evidence.content}
          </p>

          {evidence.sourceUrl && (
            <a
              href={evidence.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-[44px] max-w-full items-center truncate rounded-lg border border-line px-3 font-mono text-xs text-brass hover:border-brass"
            >
              {evidence.sourceUrl}
            </a>
          )}

          {(evidence.qualityBreakdown || evidence.aiReasoning) && (
            <button
              type="button"
              onClick={() => setShowDetail((value) => !value)}
              aria-expanded={showDetail}
              className="mt-2 flex min-h-[32px] items-center gap-1.5 font-mono text-[11px] text-parchment-dim hover:text-brass"
            >
              {showDetail ? 'degerlendirmeyi gizle' : 'yapay zeka degerlendirmesi'}
              <Icon name={showDetail ? 'yukari' : 'asagi'} className="h-3 w-3" />
            </button>
          )}

          {showDetail && (
            <div className="mt-2 space-y-2 rounded-xl border border-line bg-ink-2 p-3">
              {evidence.qualityBreakdown && (
                <div className="space-y-1.5">
                  <QualityRow label="kaynak" value={evidence.qualityBreakdown.sourceReliability} max={35} />
                  <QualityRow label="dogrulama" value={evidence.qualityBreakdown.verifiability} max={25} />
                  <QualityRow label="alaka" value={evidence.qualityBreakdown.relevance} max={20} />
                  <QualityRow label="somutluk" value={evidence.qualityBreakdown.specificity} max={15} />
                  <QualityRow label="baglam" value={evidence.qualityBreakdown.timeliness} max={5} />
                </div>
              )}
              {evidence.aiReasoning && (
                <p className="border-t border-line pt-2 text-xs leading-relaxed text-parchment-dim">
                  {evidence.aiReasoning}
                </p>
              )}
            </div>
          )}

          <VoteBar evidence={evidence} onChanged={onChanged} />
        </div>
      </div>
    </article>
  );
}

function SideColumn({ side, isLeading, onAdded }: { side: Side; isLeading: boolean; onAdded: () => void }) {
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { accessToken, user } = useAuth();

  const sorted = [...side.evidences].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  const accent = side.position === 'A' ? 'bg-side-a' : 'bg-side-b';

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
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
    <section className="min-w-0 flex-1">
      <header className="sticky top-0 z-[5] border-b border-line bg-ink/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent}`} />
          <h2 className="font-display text-lg text-parchment">{side.label}</h2>
          {isLeading && (
            <span className="rounded-full border border-brass px-2 py-0.5 font-mono text-[11px] text-brass">
              onde
            </span>
          )}
          <span
            className={`ml-auto font-display text-2xl ${strengthTone(side.strengthScore)}`}
            title="Kanit kalitesine dayali taraf gucu. Cok sayida zayif kanit bu puani yukseltmez."
          >
            {side.strengthScore ?? '-'}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-parchment-dim">
          ort {side.averageScore ?? '-'} &middot; {side.scoredCount}/{side.evidenceCount} kanit
          puanlandi
        </p>
      </header>

      {sorted.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-parchment-dim">Henuz kanit sunulmadi.</p>
      )}
      {sorted.map((evidence, index) => (
        <EvidenceCard
          key={evidence.id}
          evidence={evidence}
          exhibitLabel={`${side.position}-${index + 1}`}
          onChanged={onAdded}
        />
      ))}

      {user ? (
        <form onSubmit={handleAdd} className="space-y-2 px-4 py-4">
          <label htmlFor={`evidence-${side.id}`} className="sr-only">
            {side.label} tarafina kanit
          </label>
          <textarea
            id={`evidence-${side.id}`}
            placeholder={`"${side.label}" icin kanitini sun`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            required
            rows={3}
            className="w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-parchment outline-none transition-colors placeholder:text-parchment-dim focus:border-brass"
          />
          <label htmlFor={`source-${side.id}`} className="sr-only">
            Kaynak linki
          </label>
          <input
            id={`source-${side.id}`}
            type="url"
            placeholder="Kaynak linki (puanin en buyuk bileseni)"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-line bg-ink-2 px-3 text-sm text-parchment outline-none transition-colors placeholder:text-parchment-dim focus:border-brass"
          />
          {error && <p className="font-mono text-xs text-verdict-weak">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] w-full rounded-full bg-brass font-semibold text-ink transition-colors hover:bg-brass-light disabled:opacity-50"
          >
            {submitting ? 'sunuluyor...' : 'Kanit sun'}
          </button>
        </form>
      ) : (
        <div className="px-4 py-4">
          <Link
            to="/login"
            className="flex min-h-[44px] w-full items-center justify-center rounded-full border border-brass text-sm text-brass transition-colors hover:bg-ink-2"
          >
            Kanit sunmak icin giris yap
          </Link>
        </div>
      )}
    </section>
  );
}

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  useDocumentTitle(topic?.title ?? null);
  const [loading, setLoading] = useState(true);
  const [mobileSide, setMobileSide] = useState<'A' | 'B'>('A');
  const { accessToken } = useAuth();

  const load = useCallback(() => {
    if (!id) return;
    apiRequest<Topic>(`/topics/${id}`, { token: accessToken })
      .then(setTopic)
      .catch(() => setTopic(null))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!id || !API_URL) return;
    const socket: Socket = io(`${API_URL}/realtime`, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('topic:join', { topicId: id }));
    socket.on('evidence:created', load);
    socket.on('evidence:voted', load);
    return () => {
      socket.emit('topic:leave', { topicId: id });
      socket.disconnect();
    };
  }, [id, load]);

  if (loading) {
    return (
      <AppShell right={<RightRail />}>
        <p className="px-4 py-10 text-center text-sm text-parchment-dim">yukleniyor...</p>
      </AppShell>
    );
  }

  if (!topic) {
    return (
      <AppShell right={<RightRail />}>
        <p className="px-4 py-10 text-center text-sm text-parchment-dim">Dava bulunamadi.</p>
      </AppShell>
    );
  }

  const sideA = topic.sides.find((side) => side.position === 'A');
  const sideB = topic.sides.find((side) => side.position === 'B');

  return (
    <AppShell right={<RightRail activeCategory={topic.category} />} wide>
      <PageHeader title={topic.title} subtitle={topic.category.toUpperCase()} back="/" />

      <div className="border-b border-line px-4 py-4 sm:px-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-parchment-dim">
            {topic.category}
          </span>
          {topic.status === 'PENDING' && (
            <span className="rounded-full border border-verdict-mid px-2 py-0.5 font-mono text-[11px] text-verdict-mid">
              onay bekliyor
            </span>
          )}
          {topic.isTie && (
            <span className="rounded-full border border-brass px-2 py-0.5 font-mono text-[11px] text-brass">
              berabere
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl leading-snug text-parchment md:hidden">{topic.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-parchment-dim">{topic.description}</p>
        <div className="mt-4">
          <StrengthBar sides={topic.sides} leadingSideId={topic.leadingSideId} />
        </div>
      </div>

      {/* Telefon: taraflar arasinda sekme. Iki sutunu yan yana sikistirmak
          yerine her tarafa tam genislik verilir. */}
      <div className="flex border-b border-line md:hidden">
        {(['A', 'B'] as const).map((position) => {
          const side = position === 'A' ? sideA : sideB;
          if (!side) return null;
          const selected = mobileSide === position;
          return (
            <button
              key={position}
              type="button"
              aria-pressed={selected}
              onClick={() => setMobileSide(position)}
              className={`relative flex min-h-[48px] flex-1 items-center justify-center gap-2 px-3 text-sm ${
                selected ? 'font-semibold text-parchment' : 'text-parchment-dim'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${position === 'A' ? 'bg-side-a' : 'bg-side-b'}`}
              />
              <span className="truncate">{side.label}</span>
              <span className={`font-mono text-xs ${strengthTone(side.strengthScore)}`}>
                {side.strengthScore ?? '-'}
              </span>
              {selected && (
                <span className="absolute bottom-0 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-brass" />
              )}
            </button>
          );
        })}
      </div>

      <div className="md:flex md:divide-x md:divide-line">
        {sideA && (
          <div className={`${mobileSide === 'A' ? 'block' : 'hidden'} md:block md:flex-1 md:min-w-0`}>
            <SideColumn side={sideA} isLeading={topic.leadingSideId === sideA.id} onAdded={load} />
          </div>
        )}
        {sideB && (
          <div className={`${mobileSide === 'B' ? 'block' : 'hidden'} md:block md:flex-1 md:min-w-0`}>
            <SideColumn side={sideB} isLeading={topic.leadingSideId === sideB.id} onAdded={load} />
          </div>
        )}
      </div>

      <div className="border-t border-line px-4 pb-6 sm:px-5">
        <CommentSection topicId={topic.id} />
      </div>
    </AppShell>
  );
}
