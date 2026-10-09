import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationList {
  items: Notification[];
  unreadCount: number;
}

const POLL_INTERVAL_MS = 60_000;

export default function NotificationBell() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<NotificationList>({ items: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (!accessToken) return;
    apiRequest<NotificationList>('/notifications?limit=20', { token: accessToken })
      .then(setData)
      .catch(() => undefined);
  };

  useEffect(() => {
    if (!accessToken) {
      setData({ items: [], unreadCount: 0 });
      return;
    }
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [accessToken]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const markAllRead = async () => {
    if (!accessToken || data.unreadCount === 0) return;
    await apiRequest('/notifications/read-all', { method: 'PATCH', token: accessToken });
    setData((previous) => ({
      items: previous.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: 0,
    }));
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
  };

  if (!accessToken) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="font-mono text-xs text-parchment-dim hover:text-parchment transition-colors relative px-2 py-1"
        aria-label="bildirimler"
      >
        bildirim
        {data.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-brass text-ink rounded-full px-1.5 text-[10px] font-mono">
            {data.unreadCount > 9 ? '9+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-ink-2 border border-line rounded shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line">
            <span className="font-mono text-xs text-parchment-dim">bildirimler</span>
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
            <p className="px-4 py-6 font-mono text-xs text-parchment-dim text-center">
              henuz bildirim yok
            </p>
          )}

          <ul className="divide-y divide-line">
            {data.items.map((notification) => {
              const body = (
                <div
                  className={`px-4 py-3 hover:bg-ink transition-colors ${
                    notification.isRead ? 'opacity-60' : ''
                  }`}
                >
                  <p className="text-sm text-parchment flex items-start gap-2">
                    {!notification.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brass mt-1.5 shrink-0" />
                    )}
                    <span>{notification.title}</span>
                  </p>
                  <p className="text-xs text-parchment-dim mt-1 leading-relaxed">
                    {notification.body}
                  </p>
                  <p className="font-mono text-[10px] text-parchment-dim mt-1">
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
