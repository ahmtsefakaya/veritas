import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon, { type IconName } from './Icon';
import NotificationBell from './NotificationBell';

/*
  AppShell — uygulamanin uc sutunlu iskeleti.

  Sol:   kalici gezinme (ikon + etiket), altta hesap kartı
  Orta:  sayfanin kendi icerigi, tek sutun, ust baslik yapiskan
  Sag:   baglam serisi (arama, canli davalar, kategoriler, odul)

  Telefonda sol sutun alt sekme cubuguna, sag sutun da icerigin altina duser.
  Erisilebilirlik notu: her dokunma hedefi en az 44px; gezinme baglantilari
  kucuk ekranda da erisilebilir olmak zorunda (gecmiste sol sutun `hidden`
  oldugu icin telefondan giris yapilamiyordu).
*/

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  requiresAuth?: boolean;
  staffOnly?: boolean;
  /** Alt sekme cubugunda gosterilsin mi */
  mobile?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Gundem', icon: 'gundem', mobile: true },
  { to: '/kesfet', label: 'Kesfet', icon: 'kesfet', mobile: true },
  { to: '/bildirimler', label: 'Bildirimler', icon: 'bildirim', requiresAuth: true, mobile: true },
  { to: '/leaderboard', label: 'Siralama', icon: 'siralama' },
  { to: '/rewards', label: 'Odul', icon: 'odul', mobile: true },
  { to: '/settings', label: 'Ayarlar', icon: 'ayarlar', requiresAuth: true },
  { to: '/admin', label: 'Moderasyon', icon: 'moderasyon', staffOnly: true },
];

function isActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function AppShell({
  children,
  right,
  wide = false,
}: {
  children: ReactNode;
  /** Sag sutunun ustune eklenecek sayfaya ozel kartlar */
  right?: ReactNode;
  /** Admin gibi genis tablolu sayfalarda orta sutunu genislet */
  wide?: boolean;
}) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isStaff = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const visible = NAV.filter((item) => {
    if (item.staffOnly) return isStaff;
    if (item.requiresAuth) return Boolean(user);
    return true;
  });

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const mobileNav = visible.filter((item) => item.mobile).slice(0, 4);

  return (
    <div className="min-h-screen bg-ink text-parchment">
      <div className="mx-auto flex w-full max-w-[1280px] justify-center">
        {/* ---------------- SOL SUTUN ---------------- */}
        <aside className="hidden md:flex sticky top-0 h-screen w-[88px] xl:w-[268px] shrink-0 flex-col justify-between px-2 xl:px-4 py-3">
          <div>
            <Link
              to="/"
              aria-label="Veritas ana sayfa"
              className="flex h-12 w-12 items-center justify-center rounded-full text-brass hover:bg-ink-2 transition-colors xl:w-auto xl:justify-start xl:gap-2 xl:px-3"
            >
              <Icon name="terazi" className="h-7 w-7" />
              <span className="hidden xl:inline font-display text-2xl text-parchment">Veritas</span>
            </Link>

            <nav className="mt-2 flex flex-col gap-1">
              {visible.map((item) => {
                const active = isActive(pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-h-[48px] items-center gap-4 rounded-full px-3 transition-colors hover:bg-ink-2 ${
                      active ? 'text-parchment' : 'text-parchment-dim'
                    }`}
                  >
                    <span className="relative">
                      <Icon name={item.icon} filled={active} className="h-6 w-6" />
                      {item.icon === 'bildirim' && <NotificationBell variant="dot" />}
                    </span>
                    <span className={`hidden xl:inline text-lg ${active ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <Link
              to="/new-topic"
              className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-brass px-3 font-semibold text-ink transition-colors hover:bg-brass-light xl:w-full"
            >
              <Icon name="dava-ac" className="h-5 w-5 xl:hidden" strokeWidth={2.4} />
              <span className="hidden xl:inline">Dava ac</span>
            </Link>
          </div>

          {/* Hesap karti */}
          <div ref={menuRef} className="relative pb-2">
            {user ? (
              <>
                {menuOpen && (
                  <div className="absolute bottom-full mb-2 w-60 overflow-hidden rounded-2xl border border-line bg-ink-2 shadow-2xl">
                    <Link
                      to={`/users/${user.username}`}
                      className="flex min-h-[48px] items-center gap-3 px-4 text-sm hover:bg-ink-3"
                    >
                      <Icon name="profil" className="h-5 w-5" /> Profilim
                    </Link>
                    <Link
                      to="/settings"
                      className="flex min-h-[48px] items-center gap-3 px-4 text-sm hover:bg-ink-3"
                    >
                      <Icon name="ayarlar" className="h-5 w-5" /> Ayarlar
                    </Link>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full min-h-[48px] items-center gap-3 border-t border-line px-4 text-left text-sm text-verdict-weak hover:bg-ink-3"
                    >
                      <Icon name="cikis" className="h-5 w-5" /> Cikis yap
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-expanded={menuOpen}
                  aria-label="Hesap menusu"
                  className="flex w-full min-h-[48px] items-center gap-3 rounded-full px-2 transition-colors hover:bg-ink-2"
                >
                  <Avatar name={user.displayName ?? user.username} />
                  <span className="hidden xl:block min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold">
                      {user.displayName ?? user.username}
                    </span>
                    <span className="block truncate font-mono text-xs text-parchment-dim">
                      @{user.username}
                    </span>
                  </span>
                  <span className="hidden xl:inline font-mono text-xs text-brass">
                    {user.reputationScore}
                  </span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex min-h-[48px] items-center justify-center rounded-full border border-line px-3 text-sm text-parchment transition-colors hover:border-brass hover:text-brass"
              >
                <Icon name="profil" className="h-5 w-5 xl:hidden" />
                <span className="hidden xl:inline">Giris yap</span>
              </Link>
            )}
          </div>
        </aside>

        {/* ---------------- ORTA SUTUN ---------------- */}
        <main
          className={`min-h-screen w-full border-x border-line pb-20 md:pb-0 ${
            wide ? 'max-w-[1000px]' : 'max-w-[620px]'
          }`}
        >
          {/* Telefon basligi: logo + bildirim + hesap */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-ink/85 px-4 py-2 backdrop-blur md:hidden">
            <Link to="/" aria-label="Veritas ana sayfa" className="flex items-center gap-2 text-brass">
              <Icon name="terazi" className="h-6 w-6" />
              <span className="font-display text-lg text-parchment">Veritas</span>
            </Link>
            <div className="flex items-center gap-1">
              {user && (
                <Link
                  to="/bildirimler"
                  aria-label="Bildirimler"
                  className="relative flex h-11 w-11 items-center justify-center rounded-full text-parchment-dim hover:bg-ink-2"
                >
                  <Icon name="bildirim" className="h-6 w-6" />
                  <NotificationBell variant="dot" />
                </Link>
              )}
              {user ? (
                <Link to={`/users/${user.username}`} aria-label="Profilim" className="p-1">
                  <Avatar name={user.displayName ?? user.username} />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="flex min-h-[44px] items-center rounded-full bg-brass px-4 text-sm font-semibold text-ink"
                >
                  Giris
                </Link>
              )}
            </div>
          </header>

          {children}
        </main>

        {/* ---------------- SAG SUTUN ---------------- */}
        <aside className="hidden lg:block w-[350px] shrink-0 px-6 py-3">
          <div className="sticky top-3 space-y-4">{right}</div>
        </aside>
      </div>

      {/* ---------------- ALT SEKME CUBUGU (telefon) ---------------- */}
      <nav
        aria-label="Ana gezinme"
        className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-line bg-ink/95 backdrop-blur md:hidden"
      >
        {mobileNav.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 ${
                active ? 'text-brass' : 'text-parchment-dim'
              }`}
            >
              <Icon name={item.icon} filled={active} className="h-6 w-6" />
              <span className="text-[10px]">{item.label}</span>
              {item.icon === 'bildirim' && <NotificationBell variant="dot" />}
            </Link>
          );
        })}
        <Link
          to="/new-topic"
          aria-label="Dava ac"
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-brass"
        >
          <Icon name="dava-ac" className="h-6 w-6" strokeWidth={2.4} />
          <span className="text-[10px]">Dava ac</span>
        </Link>
      </nav>
    </div>
  );
}

/** Harf tabanli avatar: resim yuklemesi olmadan tutarli bir kimlik rozeti. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  // Ismin kodundan sabit bir ton uret: ayni kullanici her yerde ayni renkte.
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(145deg, hsl(${hue} 32% 28%), hsl(${(hue + 40) % 360} 28% 18%))`,
        fontSize: size * 0.36,
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line font-semibold text-parchment"
    >
      {initials || '?'}
    </span>
  );
}
