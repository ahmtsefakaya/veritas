import { useEffect, useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import RightRail from '../components/RightRail';
import { PageHeader, MobilePageTitle } from '../components/Tabs';
import Icon from '../components/Icon';

interface Requirement {
  key: string;
  label: string;
  met: boolean;
  current: number | string | boolean | null;
  required: number | string | boolean;
}

interface Eligibility {
  eligible: boolean;
  pointsBalance: number;
  requirements: Requirement[];
  missing: string[];
}

const TIERS = [
  { range: '90 - 100', points: 20 },
  { range: '80 - 89', points: 12 },
  { range: '70 - 79', points: 8 },
  { range: '60 - 69', points: 4 },
  { range: '0 - 59', points: 0 },
];

function formatValue(value: number | string | boolean | null) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'var' : 'yok';
  return String(value);
}

export default function RewardsPage() {
  useDocumentTitle('Odul programi');
  const { accessToken } = useAuth();
  const [data, setData] = useState<Eligibility | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiRequest<Eligibility>('/users/me/eligibility', { token: accessToken })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const metCount = data?.requirements.filter((item) => item.met).length ?? 0;
  const totalCount = data?.requirements.length ?? 0;
  const progress = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0;

  return (
    <AppShell right={<RightRail />}>
      <PageHeader title="Odul programi" subtitle="kaliteye dayali puan" />
      <MobilePageTitle title="Odul programi" subtitle="kaliteye dayali puan" />

      <p className="border-b border-line px-4 py-4 text-sm leading-relaxed text-parchment-dim sm:px-5">
        Odul puani yalnizca kanitlarinizin yapay zeka tarafindan olculen kalite puanindan
        kazanilir. Kullanici oylari ve yorumlar puaninizi etkilemez; boylece art niyetli
        kalabaliklar sonucu degistiremez.
      </p>

      {data && (
        <section className="border-b border-line px-4 py-5 sm:px-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs text-parchment-dim">odul puani</p>
              <p className="font-display text-4xl text-brass">{data.pointsBalance}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-parchment-dim">odeme uygunlugu</p>
              <p className="font-display text-2xl text-parchment">
                {metCount}/{totalCount}
              </p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-4">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                data.eligible ? 'bg-verdict-strong' : 'bg-brass'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p
            className={`mt-3 text-sm ${data.eligible ? 'text-verdict-strong' : 'text-parchment-dim'}`}
          >
            {data.eligible
              ? 'Tum sartlari sagliyorsunuz. Odeme altyapisi acildiginda basvurabileceksiniz.'
              : 'Henuz uygun degilsiniz. Eksik sartlar asagida isaretli.'}
          </p>
        </section>
      )}

      <section className="border-b border-line px-4 py-5 sm:px-5">
        <h2 className="font-display text-lg text-parchment">Puan nasil kazanilir</h2>
        <ul className="mt-3 space-y-1">
          {TIERS.map((tier) => (
            <li
              key={tier.range}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 odd:bg-ink-2"
            >
              <span className="font-mono text-xs text-parchment-dim">kalite {tier.range}</span>
              <span className="h-px flex-1 bg-line" />
              <span
                className={`font-display text-lg ${
                  tier.points > 0 ? 'text-brass' : 'text-parchment-dim'
                }`}
              >
                {tier.points > 0 ? `+${tier.points}` : '0'}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-parchment-dim">
          Kanit kalitesi bes bilesende olculur: kaynak guvenilirligi 35, dogrulanabilirlik 25,
          konuya alaka 20, somutluk 15, guncellik ve baglam 5. Ayni kanit iki kez puan
          kazandirmaz; kalite puani sonradan duserse odul puani da duzeltilir.
        </p>
      </section>

      {!accessToken && (
        <div className="px-4 py-8 text-center sm:px-5">
          <p className="text-sm text-parchment-dim">Uygunluk durumunu gormek icin giris yap.</p>
          <Link
            to="/login"
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-brass px-6 font-semibold text-ink"
          >
            Giris yap
          </Link>
        </div>
      )}

      {loading && accessToken && (
        <p className="px-4 py-10 text-center text-sm text-parchment-dim">yukleniyor...</p>
      )}
      {error && <p className="px-4 py-10 text-center text-sm text-verdict-weak">{error}</p>}

      {data && (
        <section className="px-4 py-5 sm:px-5">
          <h2 className="font-display text-lg text-parchment">Odeme sartlari</h2>
          <ul className="mt-3 divide-y divide-line">
            {data.requirements.map((requirement) => (
              <li key={requirement.key} className="flex items-start gap-3 py-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    requirement.met
                      ? 'bg-verdict-strong/20 text-verdict-strong'
                      : 'border border-line text-parchment-dim'
                  }`}
                >
                  {requirement.met && <Icon name="moderasyon" className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-parchment">{requirement.label}</p>
                  <p className="mt-0.5 font-mono text-xs text-parchment-dim">
                    mevcut: {formatValue(requirement.current)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-parchment-dim">
            Odul puani su an ekonomik bir degere donusturulmemektedir. Para dagitimi acildiginda
            yukaridaki sartlarin tamami ayni anda saglanmak zorunda olacaktir.
          </p>
        </section>
      )}
    </AppShell>
  );
}
