import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './AppShell';
import Icon from './Icon';

const CATEGORIES = ['Siyaset', 'Bilim', 'Tarih', 'Ekonomi', 'Teknoloji', 'Saglik', 'Spor', 'Diger'];

/*
  Hizli dava kutusu.

  Sosyal akislardaki "ne dusunuyorsun" kutusunun Veritas karsiligi: akistan
  ayrilmadan bir dava acilir. Fark, tek bir metin alani degil uc zorunlu parca
  olmasi — soru ve iki taraf. Baslik yazilana kadar kutu tek satir kalir,
  odaklaninca acilir; boylece akisin ustunu kaplamaz.

  Tam form (uzun aciklama) hala /new-topic adresinde; buradaki kisa yol ayni
  POST /topics ucunu kullanir.
*/
export default function QuickCase({ onCreated }: { onCreated?: () => void }) {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sideA, setSideA] = useState('Evet');
  const [sideB, setSideB] = useState('Hayir');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 sm:px-5">
        <p className="min-w-0 flex-1 text-sm text-parchment-dim">
          Kendi davani acmak ve delil sunmak icin giris yap.
        </p>
        <Link
          to="/login"
          className="flex min-h-[44px] items-center rounded-full bg-brass px-5 font-semibold text-ink transition-colors hover:bg-brass-light"
        >
          Giris yap
        </Link>
      </div>
    );
  }

  const canSubmit = title.trim().length >= 10 && sideA.trim() && sideB.trim() && !saving;

  async function submit() {
    if (!canSubmit || !accessToken) return;
    setSaving(true);
    setError('');
    try {
      const created = await apiRequest<{ id: string }>('/topics', {
        method: 'POST',
        token: accessToken,
        body: {
          title: title.trim(),
          description: description.trim() || title.trim(),
          category,
          sideALabel: sideA.trim(),
          sideBLabel: sideB.trim(),
        },
      });
      setTitle('');
      setDescription('');
      setExpanded(false);
      onCreated?.();
      navigate(`/topics/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dava acilamadi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b border-line px-4 py-3 sm:px-5">
      <div className="flex gap-3">
        <Avatar name={user.displayName ?? user.username} />
        <div className="min-w-0 flex-1">
          <label htmlFor="quick-case-title" className="sr-only">
            Dava sorusu
          </label>
          <textarea
            id="quick-case-title"
            value={title}
            onFocus={() => setExpanded(true)}
            onChange={(event) => setTitle(event.target.value)}
            rows={expanded ? 2 : 1}
            placeholder="Neyi tartisalim? Net bir soru yaz."
            className="w-full resize-none bg-transparent py-2 font-display text-lg text-parchment outline-none placeholder:text-parchment-dim"
          />

          {expanded && (
            <div className="space-y-3 pb-1">
              <label htmlFor="quick-case-desc" className="sr-only">
                Kisa aciklama
              </label>
              <textarea
                id="quick-case-desc"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Baglami bir iki cumleyle acikla (istege bagli)."
                className="w-full resize-none bg-transparent text-sm text-parchment outline-none placeholder:text-parchment-dim"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-line px-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-side-a" />
                  <label htmlFor="quick-side-a" className="sr-only">
                    A tarafi etiketi
                  </label>
                  <input
                    id="quick-side-a"
                    value={sideA}
                    onChange={(event) => setSideA(event.target.value)}
                    placeholder="A tarafi"
                    className="min-h-[44px] w-full bg-transparent text-sm text-parchment outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line px-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-side-b" />
                  <label htmlFor="quick-side-b" className="sr-only">
                    B tarafi etiketi
                  </label>
                  <input
                    id="quick-side-b"
                    value={sideB}
                    onChange={(event) => setSideB(event.target.value)}
                    placeholder="B tarafi"
                    className="min-h-[44px] w-full bg-transparent text-sm text-parchment outline-none"
                  />
                </div>
              </div>

              <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                    className={`flex min-h-[36px] shrink-0 items-center rounded-full border px-3 text-xs transition-colors ${
                      category === item
                        ? 'border-brass text-brass'
                        : 'border-line text-parchment-dim hover:text-parchment'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {error && <p className="text-sm text-verdict-weak">{error}</p>}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-2">
            <Link
              to="/new-topic"
              className="flex items-center gap-1.5 font-mono text-xs text-parchment-dim transition-colors hover:text-brass"
            >
              <Icon name="delil" className="h-4 w-4" /> ayrintili form
            </Link>
            <div className="flex items-center gap-3">
              {expanded && (
                <span className="font-mono text-xs text-parchment-dim">
                  {title.trim().length < 10 ? `${10 - title.trim().length} karakter daha` : 'hazir'}
                </span>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="flex min-h-[40px] items-center rounded-full bg-brass px-5 font-semibold text-ink transition-colors hover:bg-brass-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? 'aciliyor...' : 'Davayi ac'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
