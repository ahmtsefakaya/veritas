import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import AppShell from '../components/AppShell';
import RightRail from '../components/RightRail';
import Icon from '../components/Icon';

export default function NotFoundPage() {
  useDocumentTitle('Sayfa bulunamadi');
  return (
    <AppShell right={<RightRail />}>
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <Icon name="terazi" className="h-12 w-12 text-brass-dim" />
        <p className="mt-6 font-mono text-xs tracking-widest text-brass">HATA-404</p>
        <h1 className="mt-2 font-display text-3xl text-parchment">Dosya bulunamadi</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-parchment-dim">
          Aradigin sayfa arsivde yok. Silinmis bir dava ya da yanlis bir adres olabilir.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="flex min-h-[44px] items-center rounded-full bg-brass px-6 font-semibold text-ink"
          >
            Gundeme don
          </Link>
          <Link
            to="/kesfet"
            className="flex min-h-[44px] items-center rounded-full border border-line px-6 text-sm text-parchment-dim transition-colors hover:border-brass hover:text-brass"
          >
            Kesfet
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
