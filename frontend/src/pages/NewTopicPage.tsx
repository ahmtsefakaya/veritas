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

  return (
    <div className="min-h-screen bg-slate-900 text-white px-6 py-8">
      <div className="max-w-xl mx-auto">
        <Link to="/" className="text-sm text-slate-400 hover:text-white">
          &larr; Geri
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-1">Yeni Konu Olustur</h1>
        <p className="text-slate-400 text-sm mb-6">
          Konun admin onayindan gectikten sonra herkese acik olacak.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Konu basligi"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            placeholder="Konu aciklamasi"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Kategori (orn: teknoloji, siyaset, felsefe)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="A tarafi etiketi"
              value={sideALabel}
              onChange={(e) => setSideALabel(e.target.value)}
              required
              className="px-4 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="B tarafi etiketi"
              value={sideBLabel}
              onChange={(e) => setSideBLabel(e.target.value)}
              required
              className="px-4 py-2.5 rounded-lg bg-slate-800 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium transition disabled:opacity-50"
          >
            {loading ? 'Gonderiliyor...' : 'Konuyu Olustur'}
          </button>
        </form>
      </div>
    </div>
  );
}
