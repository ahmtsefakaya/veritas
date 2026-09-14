import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NewTopicPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [sideALabel, setSideALabel] = useState('');
  const [sideBLabel, setSideBLabel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequest('/topics', {
        method: 'POST',
        token: accessToken,
        body: { title, description, category, sideALabel, sideBLabel },
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata olustu.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-sm bg-ink-3 border border-line text-parchment placeholder-parchment-dim text-sm outline-none focus:border-brass transition-colors';

  return (
    <div className="min-h-screen bg-ink px-6 py-8">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="font-mono text-xs text-parchment-dim hover:text-parchment">
          &larr; gundeme don
        </Link>
        <h1 className="font-display text-2xl text-parchment mt-3 mb-1">Yeni Dava Ac</h1>
        <p className="text-parchment-dim text-sm mb-6 leading-relaxed">
          Davan moderasyondan gectikten sonra gundeme dusecek.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Dava basligi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
          <textarea
            placeholder="Dava aciklamasi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Kategori (orn: teknoloji, siyaset, felsefe)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="A tarafi"
              value={sideALabel}
              onChange={(e) => setSideALabel(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="text"
              placeholder="B tarafi"
              value={sideBLabel}
              onChange={(e) => setSideBLabel(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          {error && <p className="text-verdict-weak text-xs font-mono">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-sm bg-brass hover:bg-brass-light text-ink font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'gonderiliyor...' : 'davayi ac'}
          </button>
        </form>
      </div>
    </div>
  );
}
