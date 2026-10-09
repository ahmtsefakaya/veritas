import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

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

function formatValue(value: number | string | boolean | null) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'var' : 'yok';
  return String(value);
}

export default function RewardsPage() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<Eligibility | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    apiRequest<Eligibility>('/users/me/eligibility', { token: accessToken })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const metCount = data?.requirements.filter((r) => r.met).length ?? 0;
  const totalCount = data?.requirements.length ?? 0;

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-brass">
          VERITAS
        </Link>
        <nav className="font-mono text-xs text-parchment-dim">odul programi</nav>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl text-brass">Odul Programi</h1>
        <p className="text-sm text-parchment-dim mt-3 leading-relaxed">
          Odul puani yalnizca kanitlarinizin yapay zeka tarafindan olculen kalite puanindan
          kazanilir. Kullanici oylari ve yorumlar puaninizi etkilemez; boylece art niyetli
          kalabaliklar sonucu degistiremez.
        </p>

        <section className="mt-8 border border-line rounded p-5">
          <h2 className="font-display text-lg text-brass">Puan nasil kazanilir</h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-parchment-dim">
            <li>kalite 90-100 &rarr; 20 puan</li>
            <li>kalite 80-89 &rarr; 12 puan</li>
            <li>kalite 70-79 &rarr; 8 puan</li>
            <li>kalite 60-69 &rarr; 4 puan</li>
            <li>kalite 0-59 &rarr; puan yok</li>
          </ul>
          <p className="text-xs text-parchment-dim mt-3 leading-relaxed">
            Kanit kalitesi bes bilesende olculur: kaynak guvenilirligi 35, dogrulanabilirlik 25,
            konuya alaka 20, somutluk 15, guncellik ve baglam 5. Ayni kanit iki kez puan
            kazandirmaz; kalite puani sonradan dusurse odul puani da duzeltilir.
          </p>
        </section>

        {!accessToken && (
          <p className="mt-8 font-mono text-xs text-parchment-dim">
            Uygunluk durumunuzu gormek icin{' '}
            <Link to="/login" className="text-brass underline">
              giris yapin
            </Link>
            .
          </p>
        )}

        {loading && accessToken && (
          <p className="mt-8 font-mono text-xs text-parchment-dim">yukleniyor...</p>
        )}
        {error && <p className="mt-8 font-mono text-xs text-rust">{error}</p>}

        {data && (
          <section className="mt-8 border border-line rounded p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg text-brass">Odeme uygunlugu</h2>
                <p className="font-mono text-xs text-parchment-dim mt-1">
                  {metCount}/{totalCount} sart saglandi
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-parchment-dim">odul puani</p>
                <p className="font-display text-3xl text-brass">{data.pointsBalance}</p>
              </div>
            </div>

            <p
              className={`mt-4 font-mono text-xs ${
                data.eligible ? 'text-brass' : 'text-parchment-dim'
              }`}
            >
              {data.eligible
                ? 'Tum sartlari sagliyorsunuz. Odeme altyapisi acildiginda basvurabileceksiniz.'
                : 'Henuz uygun degilsiniz. Eksik sartlar asagida isaretli.'}
            </p>

            <ul className="mt-5 divide-y divide-line">
              {data.requirements.map((requirement) => (
                <li key={requirement.key} className="py-3 flex items-start gap-3">
                  <span
                    className={`font-mono text-xs mt-0.5 ${
                      requirement.met ? 'text-brass' : 'text-rust'
                    }`}
                  >
                    {requirement.met ? '[+]' : '[ ]'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm">{requirement.label}</p>
                    <p className="font-mono text-xs text-parchment-dim mt-0.5">
                      mevcut: {formatValue(requirement.current)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-xs text-parchment-dim mt-5 leading-relaxed border-t border-line pt-4">
              Odul puani su an ekonomik bir degere donusturulmemektedir. Para dagitimi acildiginda
              yukaridaki sartlarin tamami ayni anda saglanmak zorunda olacaktir.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
