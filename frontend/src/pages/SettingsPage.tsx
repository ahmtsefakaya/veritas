import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Me {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  reputationScore: number;
  pointsBalance: number;
  country: string | null;
  isEmailVerified: boolean;
  createdAt: string;
}

interface PayoutRules {
  supportedCountries: string[];
}

interface QuotaItem {
  used: number;
  limit: number;
}

interface Quota {
  topics: QuotaItem;
  evidences: QuotaItem;
  comments: QuotaItem;
  points: QuotaItem;
}

const QUOTA_LABELS: Record<keyof Quota, string> = {
  topics: 'dava',
  evidences: 'kanit',
  comments: 'yorum',
  points: 'odul puani',
};

export default function SettingsPage() {
  const { accessToken, updateUser } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [country, setCountry] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyNote, setVerifyNote] = useState('');

  async function sendVerification() {
    if (!accessToken) return;
    setVerifySending(true);
    setVerifyNote('');
    try {
      const res = await apiRequest<{ message: string }>('/auth/email/verify/request', {
        method: 'POST',
        token: accessToken,
      });
      setVerifyNote(res.message);
    } catch (err) {
      setVerifyNote((err as Error).message);
    } finally {
      setVerifySending(false);
    }
  }

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      apiRequest<Me>('/users/me', { token: accessToken }),
      apiRequest<PayoutRules>('/users/payout-rules'),
      apiRequest<Quota>('/users/me/quota', { token: accessToken }).catch(() => null),
    ])
      .then(([profile, rules, usage]) => {
        setMe(profile);
        setCountries(rules.supportedCountries ?? []);
        setQuota(usage);
        setDisplayName(profile.displayName ?? '');
        setBio(profile.bio ?? '');
        setAvatarUrl(profile.avatarUrl ?? '');
        setCountry(profile.country ?? '');
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError('');
    setSaved('');

    const body: Record<string, string> = {};
    if (displayName.trim()) body.displayName = displayName.trim();
    if (bio.trim()) body.bio = bio.trim();
    if (avatarUrl.trim()) body.avatarUrl = avatarUrl.trim();
    if (country) body.country = country;

    try {
      const updated = await apiRequest<Partial<Me>>('/users/me', {
        method: 'PATCH',
        token: accessToken,
        body,
      });
      setMe((previous) => (previous ? { ...previous, ...updated } : previous));
      updateUser({ displayName: updated.displayName ?? null });
      setSaved('Profil guncellendi.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen bg-ink text-parchment px-6 py-10">
        <p className="font-mono text-xs text-parchment-dim">
          Ayarlari gormek icin{' '}
          <Link to="/login" className="text-brass underline">
            giris yapin
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <header className="border-b border-line px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-brass">
          VERITAS
        </Link>
        <nav className="font-mono text-xs text-parchment-dim">hesap ayarlari</nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-3xl text-brass">Hesap Ayarlari</h1>

        {loading && <p className="mt-6 font-mono text-xs text-parchment-dim">yukleniyor...</p>}

        {me && (
          <>
            <div className="mt-6 border border-line rounded p-5 grid gap-2 font-mono text-xs text-parchment-dim">
              <p>
                kullanici adi: <span className="text-parchment">@{me.username}</span>
              </p>
              <p>
                e-posta: <span className="text-parchment">{me.email}</span>{' '}
                {me.isEmailVerified ? (
                  <span className="text-brass">(dogrulandi)</span>
                ) : (
                  <span className="text-rust">(dogrulanmadi)</span>
                )}
              </p>
              {!me.isEmailVerified && (
                <div className="border border-line rounded-sm p-3 bg-ink-3">
                  <p className="leading-relaxed">
                    Odeme uygunlugu icin e-posta dogrulamasi gereklidir. Dogrulama baglantisi
                    e-posta adresinize gonderilir ve 24 saat gecerlidir.
                  </p>
                  <button
                    type="button"
                    onClick={sendVerification}
                    disabled={verifySending}
                    className="mt-2 font-mono text-xs px-3 py-1.5 rounded-sm border border-brass text-brass disabled:opacity-50"
                  >
                    {verifySending ? 'gonderiliyor...' : 'dogrulama baglantisi gonder'}
                  </button>
                  {verifyNote && <p className="mt-2 text-brass">{verifyNote}</p>}
                </div>
              )}
              <p>
                rol: <span className="text-parchment">{me.role}</span>
              </p>
              <p>
                kayit: <span className="text-parchment">{new Date(me.createdAt).toLocaleDateString('tr-TR')}</span>
              </p>
              <p>
                itibar <span className="text-brass">{me.reputationScore}</span> &middot; odul puani{' '}
                <span className="text-brass">{me.pointsBalance}</span>
              </p>
              <Link to={`/users/${me.username}`} className="text-brass hover:underline">
                herkese acik profilimi gor &rarr;
              </Link>
            </div>

            <form onSubmit={save} className="mt-8 space-y-4">
              <div>
                <label htmlFor="displayName" className="font-mono text-xs text-parchment-dim">
                  gorunen ad
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  maxLength={50}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment text-sm outline-none focus:border-brass transition-colors"
                />
              </div>

              <div>
                <label htmlFor="bio" className="font-mono text-xs text-parchment-dim">
                  kisa tanitim ({bio.length}/300)
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  maxLength={300}
                  rows={4}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment text-sm outline-none focus:border-brass transition-colors resize-y"
                />
              </div>

              <div>
                <label htmlFor="avatarUrl" className="font-mono text-xs text-parchment-dim">
                  avatar adresi (https://...)
                </label>
                <input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://"
                  className="mt-1 w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment text-sm outline-none focus:border-brass transition-colors"
                />
              </div>

              <div>
                <label htmlFor="country" className="font-mono text-xs text-parchment-dim">
                  ulke (odeme uygunlugu icin gerekli)
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-sm bg-ink-3 border border-line text-parchment text-sm outline-none focus:border-brass transition-colors"
                >
                  <option value="">secilmedi</option>
                  {countries.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="font-mono text-xs text-rust">{error}</p>}
              {saved && <p className="font-mono text-xs text-brass">{saved}</p>}

              <button
                type="submit"
                disabled={saving}
                className="font-mono text-xs px-4 py-2 rounded-sm bg-brass text-ink disabled:opacity-50"
              >
                {saving ? 'kaydediliyor...' : 'kaydet'}
              </button>
            </form>

            {quota && (
              <section className="mt-10 border border-line rounded p-5">
                <h2 className="font-display text-lg text-brass">Gunluk kotalar</h2>
                <ul className="mt-3 space-y-1 font-mono text-xs text-parchment-dim">
                  {(Object.keys(QUOTA_LABELS) as Array<keyof Quota>).map((key) => (
                    <li key={key}>
                      {QUOTA_LABELS[key]}:{' '}
                      <span className="text-parchment">
                        {quota[key].used}/{quota[key].limit}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-parchment-dim mt-3 leading-relaxed">
                  Kotalar her gun sifirlanir ve kotuye kullanimi sinirlamak icindir. Kota dolsa bile
                  kanit kalite puani hesaplanmaya devam eder.
                </p>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
