import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Sayfa bulunamadi');
  return (
    <div className="min-h-screen bg-ink text-parchment flex items-center justify-center px-6">
      <div className="text-center">
        <p className="font-mono text-xs text-brass tracking-widest">HATA-404</p>
        <h1 className="font-display text-4xl mt-3">Dosya bulunamadi</h1>
        <p className="text-sm text-parchment-dim mt-3 leading-relaxed max-w-sm mx-auto">
          Aradiginiz sayfa arsivde yok. Silinmis bir dava ya da yanlis bir adres olabilir.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="font-mono text-xs px-4 py-2 rounded-sm bg-brass text-ink"
          >
            gundeme don
          </Link>
          <Link
            to="/leaderboard"
            className="font-mono text-xs px-4 py-2 rounded-sm border border-line text-parchment-dim hover:text-brass hover:border-brass transition-colors"
          >
            siralama
          </Link>
        </div>
      </div>
    </div>
  );
}
