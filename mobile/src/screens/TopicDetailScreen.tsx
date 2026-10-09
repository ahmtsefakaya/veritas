import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiRequest, Evidence, Side, TopicDetail } from '../api/client';
import { theme, verdictColor } from '../theme';
import { useAuth } from '../context/AuthContext';

function QualityRow({ evidence }: { evidence: Evidence }) {
  const q = evidence.qualityBreakdown;
  if (!q) return null;
  const parts: [string, number, number][] = [
    ['kaynak', q.sourceReliability, 35],
    ['dogrulama', q.verifiability, 25],
    ['alaka', q.relevance, 20],
    ['somutluk', q.specificity, 15],
    ['baglam', q.timeliness, 5],
  ];
  return (
    <View style={styles.qualityGrid}>
      {parts.map(([label, value, max]) => (
        <Text key={label} style={styles.qualityItem}>
          {label} {value}/{max}
        </Text>
      ))}
    </View>
  );
}

function EvidenceCard({
  evidence,
  label,
  onChanged,
}: {
  evidence: Evidence;
  label: string;
  onChanged: () => void;
}) {
  const { user, accessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const isOwn = user?.username === evidence.author.username;

  const vote = async (value: 1 | -1) => {
    if (!user) {
      Alert.alert('Giris gerekli', 'Oy vermek icin giris yapmalisin.');
      return;
    }
    setBusy(true);
    try {
      await apiRequest(`/topics/evidences/${evidence.id}/vote`, {
        method: 'POST',
        token: accessToken,
        body: { value: evidence.myVote === value ? 0 : value },
      });
      onChanged();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.evidenceCard}>
      <View style={styles.evidenceHeader}>
        <Text style={styles.exhibit}>{label}</Text>
        <Text style={[styles.scoreBadge, { color: verdictColor(evidence.score) }]}>
          {evidence.score === null ? 'puanlaniyor' : `${evidence.score}/100`}
        </Text>
      </View>

      <Text style={styles.evidenceText}>{evidence.content}</Text>

      {evidence.sourceUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(evidence.sourceUrl as string)}>
          <Text style={styles.sourceLink}>kaynak →</Text>
        </TouchableOpacity>
      )}

      {evidence.aiReasoning && <Text style={styles.reasoning}>{evidence.aiReasoning}</Text>}
      <QualityRow evidence={evidence} />

      <Text style={styles.author}>{evidence.author.displayName ?? evidence.author.username}</Text>

      <View style={styles.voteRow}>
        <TouchableOpacity
          disabled={busy || isOwn}
          onPress={() => vote(1)}
          style={[styles.voteButton, evidence.myVote === 1 && styles.voteActive, isOwn && styles.disabled]}
        >
          <Text style={[styles.voteText, evidence.myVote === 1 && styles.voteTextActive]}>↑</Text>
        </TouchableOpacity>
        <Text style={styles.voteScore}>{evidence.voteScore}</Text>
        <TouchableOpacity
          disabled={busy || isOwn}
          onPress={() => vote(-1)}
          style={[styles.voteButton, evidence.myVote === -1 && styles.voteDown, isOwn && styles.disabled]}
        >
          <Text style={[styles.voteText, evidence.myVote === -1 && styles.voteTextDown]}>↓</Text>
        </TouchableOpacity>
        {evidence.reportCount > 0 && (
          <Text style={styles.reportCount}>{evidence.reportCount} acik bildirim</Text>
        )}
      </View>
    </View>
  );
}

function SideBlock({
  side,
  isLeading,
  onChanged,
}: {
  side: Side;
  isLeading: boolean;
  onChanged: () => void;
}) {
  const sorted = [...side.evidences].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return (
    <View style={styles.sideBlock}>
      <View style={styles.sideHeader}>
        <Text style={styles.sideLabel}>
          {side.position} · {side.label}
        </Text>
        {isLeading && <Text style={styles.leadingTag}>onde</Text>}
      </View>
      <View style={styles.statRow}>
        <Text style={styles.statStrength}>guc {side.strengthScore ?? '-'}</Text>
        <Text style={styles.stat}>ort {side.averageScore ?? '-'}</Text>
        <Text style={styles.stat}>
          {side.scoredCount}/{side.evidenceCount} puanlandi
        </Text>
      </View>
      {sorted.length === 0 && <Text style={styles.noEvidence}>henuz kanit sunulmadi.</Text>}
      {sorted.map((evidence, index) => (
        <EvidenceCard
          key={evidence.id}
          evidence={evidence}
          label={`${side.position}-${index + 1}`}
          onChanged={onChanged}
        />
      ))}
    </View>
  );
}

export default function TopicDetailScreen({ route }: { route: any }) {
  const { id } = route.params as { id: string };
  const { accessToken } = useAuth();
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setTopic(await apiRequest<TopicDetail>(`/topics/${id}`, { token: accessToken }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={theme.brass} />
      </View>
    );
  }

  if (error || !topic) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.error}>{error || 'Dava bulunamadi.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
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
    >
      <Text style={styles.category}>{topic.category.toUpperCase()}</Text>
      <Text style={styles.topicTitle}>{topic.title}</Text>
      <Text style={styles.topicDescription}>{topic.description}</Text>
      {topic.isTie && <Text style={styles.tie}>taraflar esit guce sahip</Text>}

      {topic.sides.map((side) => (
        <SideBlock
          key={side.id}
          side={side}
          isLeading={topic.leadingSideId === side.id}
          onChanged={load}
        />
      ))}

      <Text style={styles.footnote}>
        Kalite puani yapay zekanin bes bilesenli degerlendirmesinden gelir. Oylar bu puani
        degistirmez; yalnizca toplulugun kaniti faydali bulup bulmadigini gosterir.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  category: { color: theme.brass, fontSize: 11, letterSpacing: 1 },
  topicTitle: { color: theme.parchment, fontSize: 22, fontWeight: '700', marginTop: 6 },
  topicDescription: { color: theme.parchmentDim, fontSize: 14, lineHeight: 20, marginTop: 8 },
  tie: { color: theme.verdictMid, fontSize: 12, marginTop: 8 },
  sideBlock: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 14,
  },
  sideHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sideLabel: { color: theme.parchment, fontSize: 16, fontWeight: '600' },
  leadingTag: {
    color: theme.brass,
    fontSize: 11,
    borderWidth: 1,
    borderColor: theme.brass,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
  statStrength: { color: theme.brass, fontSize: 12 },
  stat: { color: theme.parchmentDim, fontSize: 12 },
  noEvidence: { color: theme.parchmentDim, fontSize: 13, marginTop: 12 },
  evidenceCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.ink2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
  },
  evidenceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  exhibit: { color: theme.brass, fontSize: 11 },
  scoreBadge: { fontSize: 11 },
  evidenceText: { color: theme.parchment, fontSize: 14, lineHeight: 20 },
  sourceLink: { color: theme.brass, fontSize: 12, marginTop: 8 },
  reasoning: {
    color: theme.parchmentDim,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 8,
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 8,
  },
  qualityItem: { color: theme.parchmentDim, fontSize: 11, width: '50%', marginBottom: 2 },
  author: { color: theme.parchmentDim, fontSize: 11, marginTop: 8 },
  voteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  voteButton: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  voteActive: { borderColor: theme.brass },
  voteDown: { borderColor: theme.verdictWeak },
  voteText: { color: theme.parchmentDim, fontSize: 13 },
  voteTextActive: { color: theme.brass },
  voteTextDown: { color: theme.verdictWeak },
  voteScore: { color: theme.parchmentDim, fontSize: 12, minWidth: 24, textAlign: 'center' },
  reportCount: { color: theme.verdictWeak, fontSize: 11 },
  disabled: { opacity: 0.4 },
  error: { color: theme.verdictWeak, fontSize: 13 },
  footnote: {
    color: theme.parchmentDim,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingTop: 12,
  },
});
