import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiRequest, Paged, TopicSummary } from '../api/client';
import { theme } from '../theme';

interface Category {
  category: string;
  count: number;
}

export default function TopicsScreen({ navigation }: { navigation: any }) {
  const [data, setData] = useState<Paged<TopicSummary> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search) params.set('q', search);
      if (category) params.set('category', category);
      setData(await apiRequest<Paged<TopicSummary>>(`/topics?${params.toString()}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiRequest<Category[]>('/topics/categories')
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  const applySearch = () => {
    setPage(1);
    setSearch(query.trim());
  };

  const pickCategory = (value: string) => {
    setPage(1);
    setCategory((current) => (current === value ? '' : value));
  };

  if (loading && !data) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.brass} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={applySearch}
          placeholder="dava ara"
          placeholderTextColor={theme.parchmentDim}
          returnKeyType="search"
          style={styles.input}
        />
        <TouchableOpacity onPress={applySearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>ara</Text>
        </TouchableOpacity>
      </View>

      {categories.length > 0 && (
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.category}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryStrip}
          renderItem={({ item }) => {
            const active = category === item.category;
            return (
              <TouchableOpacity
                onPress={() => pickCategory(item.category)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.category.toLowerCase()} ({item.count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {error !== '' && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={data?.items ?? []}
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
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search || category ? 'Bu filtreye uyan dava yok.' : 'Henuz dava yok.'}
          </Text>
        }
        ListFooterComponent={
          data && data.totalPages > 1 ? (
            <View style={styles.pager}>
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((p) => p - 1)}
                style={[styles.pagerButton, page <= 1 && styles.disabled]}
              >
                <Text style={styles.pagerText}>onceki</Text>
              </TouchableOpacity>
              <Text style={styles.pagerLabel}>
                sayfa {data.page} / {data.totalPages}
              </Text>
              <TouchableOpacity
                disabled={page >= data.totalPages}
                onPress={() => setPage((p) => p + 1)}
                style={[styles.pagerButton, page >= data.totalPages && styles.disabled]}
              >
                <Text style={styles.pagerText}>sonraki</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('TopicDetail', { id: item.id, title: item.title })}
          >
            <Text style={styles.category}>{item.category.toUpperCase()}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.sideRow}>
              {item.sides.map((side) => (
                <View
                  key={side.id}
                  style={[styles.sideTag, item.leadingSideId === side.id && styles.sideTagLeading]}
                >
                  <Text
                    style={[
                      styles.sideTagText,
                      item.leadingSideId === side.id && styles.sideTagTextLeading,
                    ]}
                  >
                    {side.position} · {side.label} · {side.strengthScore ?? '-'}
                  </Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: theme.ink2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.parchment,
  },
  searchButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: theme.brass,
    borderRadius: 4,
  },
  searchButtonText: { color: theme.ink, fontWeight: '600' },
  categoryStrip: { paddingHorizontal: 12, marginBottom: 4, flexGrow: 0 },
  chip: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipActive: { borderColor: theme.brass },
  chipText: { color: theme.parchmentDim, fontSize: 12 },
  chipTextActive: { color: theme.brass },
  card: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    backgroundColor: theme.ink2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
  },
  category: { color: theme.brass, fontSize: 11, letterSpacing: 1 },
  title: { color: theme.parchment, fontSize: 17, fontWeight: '600', marginTop: 4 },
  description: { color: theme.parchmentDim, fontSize: 13, marginTop: 4, lineHeight: 18 },
  sideRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  sideTag: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sideTagLeading: { borderColor: theme.brass },
  sideTagText: { color: theme.parchmentDim, fontSize: 11 },
  sideTagTextLeading: { color: theme.brass },
  empty: { color: theme.parchmentDim, textAlign: 'center', marginTop: 40 },
  error: { color: theme.verdictWeak, paddingHorizontal: 12, paddingBottom: 8, fontSize: 12 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16 },
  pagerButton: { borderWidth: 1, borderColor: theme.line, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  pagerText: { color: theme.parchment, fontSize: 12 },
  pagerLabel: { color: theme.parchmentDim, fontSize: 12 },
  disabled: { opacity: 0.4 },
});
