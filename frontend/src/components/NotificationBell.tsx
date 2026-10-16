import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  unreadCount: number;
}

const POLL_INTERVAL_MS = 60_000;

/*
  Paylasilan okunmamis sayaci.

  Rozet artik birden fazla yerde ciziliyor (sol sutun, telefon basligi, alt
  sekme cubugu). Her kopya kendi `setInterval`'ini kursaydi ayni veriyi uc kez
  ceker ve sayilar birbirini tutmazdi; bu yuzden tek bir modul duzeyi store var
  ve bilesenler ona abone oluyor.
*/
let unreadCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeToken: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setUnreadCount(value: number) {
  if (unreadCount === value) return;
  unreadCount = value;
  emit();
}

async function refreshCount(token: string) {
  try {
    const data = await apiRequest<NotificationList>('/notifications?limit=1', { token });
    setUnreadCount(data.unreadCount);
  } catch {
    /* sessiz: rozet, sayfayi bozacak kadar kritik degil */
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
      activeToken = null;
    }
  };
}

export function useUnreadCount() {
  const { accessToken } = useAuth();
  const count = useSyncExternalStore(
    subscribe,
    () => unreadCount,
    () => 0,
  );

  useEffect(() => {
    if (!accessToken) {
      activeToken = null;
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      setUnreadCount(0);
      return;
    }
    if (activeToken === accessToken && pollTimer) return;
    activeToken = accessToken;
    void refreshCount(accessToken);
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (activeToken) void refreshCount(activeToken);
    }, POLL_INTERVAL_MS);
  }, [accessToken]);

  return count;
}

/**
 * `variant="dot"`  — yalnizca okunmamis rozeti; bir ikonun ustune bindirilir.
 * `variant="menu"` — ikon + acilir liste (masaustu kisayolu).
 */
export default function NotificationBell({ variant = 'menu' }: { variant?: 'dot' | 'menu' }) {
  const { accessToken } = useAuth();
  const count = useUnreadCount();
  const [data, setData] = useState<NotificationList>({ items: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !accessToken) return;
    apiRequest<NotificationList>('/notifications?limit=20', { token: accessToken })
      .then((list) => {
        setData(list);
        setUnreadCount(list.unreadCount);
      })
      .catch(() => undefined);
  }, [open, accessToken]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!accessToken) return null;

  if (variant === 'dot') {
    if (count === 0) return null;
    return (
      <span
        aria-label={`${count} okunmamis bildirim`}
        className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-brass px-1 text-center font-mono text-[10px] font-semibold leading-[18px] text-ink"
      >
        {count > 9 ? '9+' : count}
      </span>
    );
  }

  const markAllRead = async () => {
    if (!accessToken || data.unreadCount === 0) return;
    await apiRequest('/notifications/read-all', { method: 'PATCH', token: accessToken });
    setData((previous) => ({
      items: previous.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: 0,
    }));
    setUnreadCount(0);
  };

  const markRead = async (notification: Notification) => {
    if (!accessToken || notification.isRead) return;
    await apiRequest(`/notifications/${notification.id}/read`, {
      method: 'PATCH',
      token: accessToken,
    });
    setData((previous) => ({
      items: previous.items.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ),
      unreadCount: Math.max(0, previous.unreadCount - 1),
    }));
    setUnreadCount(Math.max(0, count - 1));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-parchment-dim transition-colors hover:bg-ink-2 hover:text-parchment"
        aria-label="Bildirimler"
        aria-expanded={open}
      >
        <Icon name="bildirim" className="h-6 w-6" />
        {count > 0 && (
          <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-brass px-1 font-mono text-[10px] font-semibold leading-[18px] text-ink">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-ink-2 shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-sm font-semibold">Bildirimler</span>
            {data.unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="font-mono text-xs text-brass hover:underline"
              >
                tumunu okundu yap
              </button>
            )}
          </div>

          {data.items.length === 0 && (
            <p className="px-4 py-6 text-center font-mono text-xs text-parchment-dim">
              henuz bildirim yok
            </p>
          )}

          <ul className="divide-y divide-line">
            {data.items.map((notification) => {
              const body = (
                <div
                  className={`px-4 py-3 transition-colors hover:bg-ink-3 ${
                    notification.isRead ? 'opacity-60' : ''
                  }`}
                >
                  <p className="flex items-start gap-2 text-sm text-parchment">
                    {!notification.isRead && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                    )}
                    <span>{notification.title}</span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-parchment-dim">
                    {notification.body}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-parchment-dim">
                    {new Date(notification.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              );

              return (
                <li key={notification.id}>
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      onClick={() => {
                        void markRead(notification);
                        setOpen(false);
                      }}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => void markRead(notification)}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
