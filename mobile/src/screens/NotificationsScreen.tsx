import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiRequest, NotificationItem } from '../api/client';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

interface Payload {
  items: NotificationItem[];
  unreadCount: number;
}

export default function NotificationsScreen() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<Payload>({ items: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setData(await apiRequest<Payload>('/notifications?limit=30', { token: accessToken }));
    } catch {
      // sessizce yoksay - bildirim listesi kritik akis degil
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    if (!accessToken || data.unreadCount === 0) return;
    await apiRequest('/notifications/read-all', { method: 'PATCH', token: accessToken });
    setData((prev) => ({ items: prev.items.map((i) => ({ ...i, isRead: true })), unreadCount: 0 }));
  };

  if (!user) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.hint}>Bildirimleri gormek icin giris yap.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.brass} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {data.unreadCount > 0 && (
        <TouchableOpacity onPress={markAllRead} style={styles.markAll}>
          <Text style={styles.markAllText}>
            {data.unreadCount} okunmamis · tumunu okundu yap
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={data.items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={theme.brass}
          />
        }
        ListEmptyComponent={<Text style={styles.hint}>Henuz bildirim yok.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, item.isRead && styles.read]}>
            <Text style={styles.title}>
              {!item.isRead ? '• ' : ''}
              {item.title}
            </Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
  markAll: { padding: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  markAllText: { color: theme.brass, fontSize: 12 },
  row: { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.line },
  read: { opacity: 0.55 },
  title: { color: theme.parchment, fontSize: 14, fontWeight: '600' },
  body: { color: theme.parchmentDim, fontSize: 12, marginTop: 4, lineHeight: 17 },
  date: { color: theme.parchmentDim, fontSize: 10, marginTop: 6 },
  hint: { color: theme.parchmentDim, fontSize: 13, textAlign: 'center', marginTop: 40 },
});
