import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import RightRail from '../components/RightRail';
import Tabs, { PageHeader, MobilePageTitle } from '../components/Tabs';
import Icon, { type IconName } from '../components/Icon';
import {
  setUnreadCount,
  type Notification,
  type NotificationList,
} from '../components/NotificationBell';

/*
  Bildirimler sayfasi.

  Acilir liste masaustunde hizli bir kisayol; ama telefonda kucuk bir panele
  sigmiyordu ve alt sekme cubugunda kendi yeri olmasi gerekiyordu. Burasi tam
  liste: okunmamis suzgeci, tek tek ve topluca okundu isaretleme.
*/

const TYPE_ICON: Record<string, IconName> = {
  evidence_scored: 'delil',
  comment_reply: 'yorum',
  topic_comment: 'yorum',
  topic_moderated: 'moderasyon',
  topic_pending_review: 'moderasyon',
  payout_eligible: 'odul',
};

export default function NotificationsPage() {
  useDocumentTitle('Bildirimler');
  const { accessToken } = useAuth();
  const [data, setData] = useState<NotificationList>({ items: [], unreadCount: 0 });
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    apiRequest<NotificationList>('/notifications?limit=50', { token: accessToken })
      .then((list) => {
        setData(list);
        setUnreadCount(list.unreadCount);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(load, [load]);

  async function markAllRead() {
    if (!accessToken || data.unreadCount === 0) return;
    await apiRequest('/notifications/read-all', { method: 'PATCH', token: accessToken });
    setData((previous) => ({
      items: previous.items.map((item) => ({ ...item, isRead: true })),
      unreadCount: 0,
    }));
    setUnreadCount(0);
  }

  async function markRead(notification: Notification) {
    if (!accessToken || notification.isRead) return;
    await apiRequest(`/notifications/${notification.id}/read`, {
      method: 'PATCH',
      token: accessToken,
    });
    setData((previous) => {
      const unread = Math.max(0, previous.unreadCount - 1);
      setUnreadCount(unread);
      return {
        items: previous.items.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ),
        unreadCount: unread,
      };
    });
  }

  const visible = filter === 'unread' ? data.items.filter((item) => !item.isRead) : data.items;

  const tabs = (
    <Tabs
      items={[
        { key: 'all', label: 'Tumu', count: data.items.length },
        { key: 'unread', label: 'Okunmamis', count: data.unreadCount },
      ]}
      active={filter}
      ariaLabel="Bildirim suzgeci"
      onChange={(key) => setFilter(key as 'all' | 'unread')}
    />
  );

  return (
    <AppShell right={<RightRail />}>
      <PageHeader
        title="Bildirimler"
        action={
          data.unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllRead}
              className="min-h-[40px] shrink-0 rounded-full border border-line px-3 text-xs text-brass transition-colors hover:border-brass"
            >
              tumunu okundu yap
            </button>
          ) : undefined
        }
      >
        {tabs}
      </PageHeader>

      <div className="md:hidden">
        <MobilePageTitle title="Bildirimler" />
        <div className="border-b border-line">{tabs}</div>
      </div>

      {loading && <p className="px-4 py-10 text-center text-sm text-parchment-dim">yukleniyor...</p>}

      {!loading && visible.length === 0 && (
        <p className="px-4 py-12 text-center text-sm text-parchment-dim">
          {filter === 'unread' ? 'Okunmamis bildirim yok.' : 'Henuz bildirim yok.'}
        </p>
      )}

      <ul>
        {visible.map((notification) => {
          const icon = TYPE_ICON[notification.type] ?? 'bildirim';
          const body = (
            <div
              className={`flex gap-3 border-b border-line px-4 py-4 transition-colors hover:bg-ink-2 sm:px-5 ${
                notification.isRead ? 'opacity-60' : ''
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  notification.isRead ? 'text-parchment-dim' : 'bg-brass-dim/30 text-brass'
                }`}
              >
                <Icon name={icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-parchment">
                  {notification.title}
                  {!notification.isRead && <span className="h-2 w-2 rounded-full bg-brass" />}
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-parchment-dim">
                  {notification.body}
                </p>
                <p className="mt-1 font-mono text-[11px] text-parchment-dim">
                  {new Date(notification.createdAt).toLocaleString('tr-TR')}
                </p>
              </div>
            </div>
          );

          return (
            <li key={notification.id}>
              {notification.link ? (
                <Link to={notification.link} onClick={() => void markRead(notification)}>
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
    </AppShell>
  );
}
