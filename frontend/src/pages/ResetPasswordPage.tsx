import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Sifreler ayni degil.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/password/reset', {
        method: 'POST',
        body: { token, password },
      });
      setDone(true);
      // Yeni sifreyle giris yapilmasi icin giris ekranina yonlendir.
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-parchment flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-3xl text-brass">
            VERITAS
          </Link>
          <p className="font-mono text-xs text-parchment-dim mt-2">yeni sifre belirle</p>
        </div>

        <div className="bg-ink-2 border border-line rounded-sm p-7">
          {!token ? (
            <p className="font-mono text-xs text-rust leading-relaxed">
              Baglantida sifirlama jetonu yok. E-postadaki baglantiyi oldugu gibi acin.
            </p>
          ) : done ? (
            <p className="font-mono text-xs text-brass leading-relaxed">
              Sifreniz guncellendi ve eski oturumlar kapatildi. Giris ekranina
              yonlendiriliyorsunuz...
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                placeholder="Yeni sifre"
                aria-label="Yeni sifre"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
              />
              <input
                type="password"
                placeholder="Yeni sifre (tekrar)"
                aria-label="Yeni sifre (tekrar)"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
              />
              <p className="font-mono text-xs text-parchment-dim leading-relaxed">
                En az 8 karakter; bir buyuk harf, bir kucuk harf ve bir rakam/ozel karakter
                icermeli.
              </p>

              {error && <p className="text-rust text-xs font-mono">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-sm bg-brass hover:bg-brass-light text-ink font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Bekleyin...' : 'Sifreyi Guncelle'}
              </button>
            </form>
          )}
        </div>

        <Link
          to="/login"
          className="block w-full mt-4 text-center text-xs font-mono text-parchment-dim hover:text-parchment transition-colors"
        >
          giris ekranina don
        </Link>
      </div>
    </div>
  );
}
