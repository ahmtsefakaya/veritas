import { useState } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';

/*
  Giris ekrani iki panelli: solda urunun ne oldugunu anlatan sabit bir taraf,
  sagda form. Kabugun (AppShell) disinda kalir — gezinmenin bir anlami yok,
  tek is giris yapmak.
*/

const PITCH = [
  { icon: 'terazi', text: 'Her dava iki tarafa ayrilir; kazanan taraf, kaniti guclu olandir.' },
  { icon: 'delil', text: 'Kaniti yapay zeka bes olcutte puanlar: kaynak, dogrulanabilirlik, alaka, somutluk, baglam.' },
  { icon: 'odul', text: 'Oylar kalite puanini degistiremez; kalabalik dogruyu belirleyemez.' },
] as const;

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  useDocumentTitle(mode === 'login' ? 'Giris yap' : 'Kayit ol');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, username, password, displayName);
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu.');
    } finally {
      setLoading(false);
    }
  }

  const field =
    'w-full min-h-[48px] rounded-xl border border-line bg-ink-2 px-4 text-sm text-parchment outline-none transition-colors placeholder:text-parchment-dim focus:border-brass';

  return (
    <div className="flex min-h-screen bg-ink text-parchment">
      <section className="hidden flex-1 flex-col justify-center gap-8 border-r border-line px-12 lg:flex">
        <Link to="/" className="flex items-center gap-3 text-brass">
          <Icon name="terazi" className="h-10 w-10" />
          <span className="font-display text-4xl text-parchment">Veritas</span>
        </Link>
        <h1 className="max-w-md font-display text-4xl leading-tight text-parchment">
          Delil ile tartis, gorusle degil.
        </h1>
        <ul className="max-w-md space-y-4">
          {PITCH.map((item) => (
            <li key={item.text} className="flex gap-3">
              <Icon name={item.icon} className="mt-0.5 h-5 w-5 shrink-0 text-brass" />
              <span className="text-sm leading-relaxed text-parchment-dim">{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex w-full flex-col justify-center px-6 py-10 lg:w-[480px]">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-brass lg:hidden">
            <Icon name="terazi" className="h-8 w-8" />
            <span className="font-display text-3xl text-parchment">Veritas</span>
          </Link>

          <h2 className="font-display text-2xl text-parchment">
            {mode === 'login' ? 'Tekrar hos geldin' : 'Hesap olustur'}
          </h2>
          <p className="mt-1 text-sm text-parchment-dim">
            {mode === 'login'
              ? 'Kanit sunmak ve oy vermek icin giris yap.'
              : 'Kaydol, kendi davani ac ve ilk kanitini sun.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label htmlFor="auth-email" className="sr-only">E-posta</label>
            <input
              id="auth-email"
              type="email"
              placeholder="E-posta"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={field}
            />

            {mode === 'register' && (
              <>
                <label htmlFor="auth-username" className="sr-only">Kullanici adi</label>
                <input
                  id="auth-username"
                  type="text"
                  placeholder="Kullanici adi"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  className={field}
                />
                <label htmlFor="auth-display" className="sr-only">Goruntulenecek isim</label>
                <input
                  id="auth-display"
                  type="text"
                  placeholder="Goruntulenecek isim"
                  autoComplete="nickname"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={field}
                />
              </>
            )}

            <label htmlFor="auth-password" className="sr-only">Sifre</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Sifre"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className={field}
            />

            {error && <p className="text-sm text-verdict-weak">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] w-full rounded-full bg-brass font-semibold text-ink transition-colors hover:bg-brass-light disabled:opacity-50"
            >
              {loading ? 'Bekleyin...' : mode === 'login' ? 'Giris yap' : 'Kayit ol'}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="min-h-[44px] w-full rounded-full border border-line text-sm text-parchment transition-colors hover:border-brass hover:text-brass"
            >
              {mode === 'login' ? 'Hesabin yok mu? Kayit ol' : 'Zaten hesabin var mi? Giris yap'}
            </button>
            {mode === 'login' && (
              <Link
                to="/forgot-password"
                className="inline-flex min-h-[44px] items-center font-mono text-xs text-parchment-dim transition-colors hover:text-brass"
              >
                sifremi unuttum
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
