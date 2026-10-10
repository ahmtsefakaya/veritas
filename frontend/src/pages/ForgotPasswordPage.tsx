import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ message: string }>('/auth/password/forgot', {
        method: 'POST',
        body: { email },
      });
      setMessage(res.message);
      setSent(true);
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
          <p className="font-mono text-xs text-parchment-dim mt-2">sifre sifirlama</p>
        </div>

        <div className="bg-ink-2 border border-line rounded-sm p-7">
          {sent ? (
            <>
              <p className="font-mono text-xs text-brass leading-relaxed">{message}</p>
              <p className="mt-3 font-mono text-xs text-parchment-dim leading-relaxed">
                Baglanti 1 saat gecerlidir. E-posta gelmediyse gelen kutusunu ve spam
                klasorunu kontrol edin.
              </p>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <p className="font-mono text-xs text-parchment-dim leading-relaxed">
                Hesabinizin e-posta adresini girin; sifre sifirlama baglantisi gonderilir.
              </p>
              <input
                type="email"
                placeholder="E-posta"
                aria-label="E-posta"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
              />

              {error && <p className="text-rust text-xs font-mono">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-sm bg-brass hover:bg-brass-light text-ink font-medium text-sm transition-colors disabled:opacity-50"
              >
                {loading ? 'Bekleyin...' : 'Baglanti Gonder'}
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
