import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

type State = 'pending' | 'ok' | 'error' | 'missing';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { updateUser } = useAuth();
  const [state, setState] = useState<State>(token ? 'pending' : 'missing');
  const [message, setMessage] = useState('');
  // React 18 strict mode useEffect'i iki kez calistirir; jeton tek
  // kullanimlik oldugu icin ikinci cagri "kullanilmis" hatasi verirdi.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;

    apiRequest<{ ok: boolean }>('/auth/email/verify', {
      method: 'POST',
      body: { token },
    })
      .then(() => {
        setState('ok');
        updateUser({ isEmailVerified: true });
      })
      .catch((err: Error) => {
        setState('error');
        setMessage(err.message);
      });
  }, [token, updateUser]);

  return (
    <div className="min-h-screen bg-ink text-parchment flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="font-display text-3xl text-brass">
          VERITAS
        </Link>

        <div className="mt-8 border border-line rounded-sm p-6 bg-ink-2">
          {state === 'pending' && (
            <p className="font-mono text-xs text-parchment-dim">dogrulaniyor...</p>
          )}

          {state === 'missing' && (
            <p className="font-mono text-xs text-rust">
              Baglantida dogrulama jetonu yok. E-postadaki baglantiyi oldugu gibi acin.
            </p>
          )}

          {state === 'ok' && (
            <>
              <p className="font-display text-xl text-brass">E-posta dogrulandi</p>
              <p className="mt-2 font-mono text-xs text-parchment-dim leading-relaxed">
                Hesabiniz artik odeme uygunlugu kontrolunde dogrulanmis sayilir.
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <p className="font-display text-xl text-rust">Dogrulanamadi</p>
              <p className="mt-2 font-mono text-xs text-parchment-dim leading-relaxed">
                {message}
              </p>
              <Link
                to="/settings"
                className="mt-4 inline-block font-mono text-xs text-brass hover:underline"
              >
                ayarlardan yeni baglanti isteyin &rarr;
              </Link>
            </>
          )}
        </div>

        <Link to="/" className="mt-4 inline-block font-mono text-xs text-parchment-dim hover:text-parchment">
          anasayfaya don
        </Link>
      </div>
    </div>
  );
}
