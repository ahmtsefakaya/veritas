import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { login, register, user, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.greeting}>{user.displayName ?? user.username}</Text>
        <Text style={styles.role}>{user.role.toLowerCase()}</Text>
        <TouchableOpacity onPress={logout} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>cikis yap</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), username.trim(), password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>VERITAS</Text>
        <Text style={styles.tagline}>Yapay zeka puanli delil platformu</Text>

        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setMode('login')} style={styles.tab}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabActive]}>giris</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('register')} style={styles.tab}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabActive]}>kayit</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="e-posta"
          placeholderTextColor={theme.parchmentDim}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        {mode === 'register' && (
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="kullanici adi"
            placeholderTextColor={theme.parchmentDim}
            autoCapitalize="none"
            style={styles.input}
          />
        )}
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="sifre"
          placeholderTextColor={theme.parchmentDim}
          secureTextEntry
          style={styles.input}
        />

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity onPress={submit} disabled={busy} style={[styles.button, busy && styles.disabled]}>
          {busy ? (
            <ActivityIndicator color={theme.ink} />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'giris yap' : 'kayit ol'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.ink },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingTop: 48 },
  brand: { color: theme.brass, fontSize: 30, fontWeight: '700', letterSpacing: 3, textAlign: 'center' },
  tagline: { color: theme.parchmentDim, fontSize: 13, textAlign: 'center', marginTop: 6 },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 32, marginBottom: 20 },
  tab: { paddingBottom: 6 },
  tabText: { color: theme.parchmentDim, fontSize: 14 },
  tabActive: { color: theme.brass, fontWeight: '600' },
  input: {
    backgroundColor: theme.ink2,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.parchment,
    marginBottom: 12,
  },
  button: {
    backgroundColor: theme.brass,
    borderRadius: 4,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: theme.ink, fontWeight: '700' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 20,
  },
  secondaryText: { color: theme.parchmentDim },
  greeting: { color: theme.parchment, fontSize: 20, fontWeight: '600' },
  role: { color: theme.brass, fontSize: 12, marginTop: 4 },
  error: { color: theme.verdictWeak, fontSize: 12, marginBottom: 8 },
  disabled: { opacity: 0.6 },
});
