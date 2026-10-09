import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../api/client';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

interface Requirement {
  key: string;
  label: string;
  met: boolean;
  current: number | string | boolean | null;
}

interface Eligibility {
  eligible: boolean;
  pointsBalance: number;
  requirements: Requirement[];
  missing: string[];
}

const EARNING_TABLE: [string, string][] = [
  ['kalite 90-100', '20 puan'],
  ['kalite 80-89', '12 puan'],
  ['kalite 70-79', '8 puan'],
  ['kalite 60-69', '4 puan'],
  ['kalite 0-59', 'puan yok'],
];

function formatValue(value: Requirement['current']) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'var' : 'yok';
  return String(value);
}

export default function RewardsScreen() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<Eligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setError('');
    try {
      setData(await apiRequest<Eligibility>('/users/me/eligibility', { token: accessToken }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const metCount = data?.requirements.filter((r) => r.met).length ?? 0;

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
      <Text style={styles.heading}>Odul Programi</Text>
      <Text style={styles.intro}>
        Odul puani yalnizca kanitlarinizin yapay zeka tarafindan olculen kalite puanindan
        kazanilir. Kullanici oylari ve yorumlar puaninizi etkilemez.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Puan nasil kazanilir</Text>
        {EARNING_TABLE.map(([range, reward]) => (
          <View key={range} style={styles.tableRow}>
            <Text style={styles.tableKey}>{range}</Text>
            <Text style={styles.tableValue}>{reward}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          Kalite bes bilesende olculur: kaynak guvenilirligi 35, dogrulanabilirlik 25, alaka 20,
          somutluk 15, guncellik 5. Ayni kanit iki kez puan kazandirmaz.
        </Text>
      </View>

      {!user && <Text style={styles.hint}>Uygunluk durumunu gormek icin giris yap.</Text>}
      {loading && user && <ActivityIndicator color={theme.brass} style={styles.loader} />}
      {error !== '' && <Text style={styles.error}>{error}</Text>}

      {data && (
        <View style={styles.card}>
          <View style={styles.eligibilityHeader}>
            <View>
              <Text style={styles.cardTitle}>Odeme uygunlugu</Text>
              <Text style={styles.note}>
                {metCount}/{data.requirements.length} sart saglandi
              </Text>
            </View>
            <View>
              <Text style={styles.balanceLabel}>odul puani</Text>
              <Text style={styles.balance}>{data.pointsBalance}</Text>
            </View>
          </View>

          <Text style={[styles.status, data.eligible ? styles.statusOk : styles.statusPending]}>
            {data.eligible
              ? 'Tum sartlari sagliyorsun. Odeme altyapisi acildiginda basvurabileceksin.'
              : 'Henuz uygun degilsin. Eksik sartlar asagida.'}
          </Text>

          {data.requirements.map((requirement) => (
            <View key={requirement.key} style={styles.requirementRow}>
              <Text style={[styles.mark, requirement.met ? styles.markOk : styles.markMissing]}>
                {requirement.met ? '[+]' : '[ ]'}
              </Text>
              <View style={styles.requirementBody}>
                <Text style={styles.requirementLabel}>{requirement.label}</Text>
                <Text style={styles.note}>mevcut: {formatValue(requirement.current)}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.note}>
            Odul puani su an ekonomik bir degere donusturulmemektedir.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.ink },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: theme.brass, fontSize: 22, fontWeight: '700' },
  intro: { color: theme.parchmentDim, fontSize: 13, lineHeight: 19, marginTop: 8 },
  card: {
    marginTop: 20,
    padding: 14,
    backgroundColor: theme.ink2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
  },
  cardTitle: { color: theme.brass, fontSize: 15, fontWeight: '600' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tableKey: { color: theme.parchmentDim, fontSize: 12 },
  tableValue: { color: theme.parchment, fontSize: 12 },
  note: { color: theme.parchmentDim, fontSize: 11, lineHeight: 16, marginTop: 8 },
  eligibilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { color: theme.parchmentDim, fontSize: 10, textAlign: 'right' },
  balance: { color: theme.brass, fontSize: 26, fontWeight: '700', textAlign: 'right' },
  status: { fontSize: 12, marginTop: 12, lineHeight: 17 },
  statusOk: { color: theme.brass },
  statusPending: { color: theme.parchmentDim },
  requirementRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  mark: { fontSize: 12, marginTop: 1 },
  markOk: { color: theme.brass },
  markMissing: { color: theme.verdictWeak },
  requirementBody: { flex: 1 },
  requirementLabel: { color: theme.parchment, fontSize: 13 },
  hint: { color: theme.parchmentDim, fontSize: 13, marginTop: 20 },
  loader: { marginTop: 20 },
  error: { color: theme.verdictWeak, fontSize: 12, marginTop: 16 },
});
