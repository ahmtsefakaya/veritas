import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-parchment tracking-tight">Veritas</h1>
          <p className="font-mono text-xs text-parchment-dim mt-2 tracking-wide">
            delil ile tartis, gorusle degil
          </p>
        </div>

        <div className="bg-ink-2 border border-line rounded-sm p-7">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
            />

            {mode === 'register' && (
              <>
                <input
                  type="text"
                  placeholder="Kullanici adi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
                />
                <input
                  type="text"
                  placeholder="Goruntulenecek isim"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
                />
              </>
            )}

            <input
              type="password"
              placeholder="Sifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors"
            />

            {error && <p className="text-verdict-weak text-xs font-mono">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-sm bg-brass hover:bg-brass-light text-ink font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Bekleyin...' : mode === 'login' ? 'Giris Yap' : 'Kayit Ol'}
            </button>
          </form>
        </div>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-full mt-4 text-xs font-mono text-parchment-dim hover:text-parchment transition-colors"
        >
          {mode === 'login' ? 'hesabin yok mu -- kayit ol' : 'zaten hesabin var mi -- giris yap'}
        </button>
      </div>
    </div>
  );
}
