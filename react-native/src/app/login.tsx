import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import { colors } from '../theme/colors';
import { Field, PrimaryButton, ErrorText, Screen } from '../components/ui';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Invalid email or password.' : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.gold, letterSpacing: 4, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>MR. BIRIYANI</Text>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>Welcome back</Text>
          <View style={{ marginTop: 32, gap: 16 }}>
            <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" />
            <ErrorText message={error} />
            <PrimaryButton title={busy ? 'Signing in…' : 'Sign in'} onPress={submit} disabled={busy || !email || !password} />
            {busy && <ActivityIndicator color={colors.gold} />}
          </View>
          <Link href="/register" asChild>
            <Pressable accessibilityRole="link" style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ color: colors.gold, fontWeight: '600' }}>New here? Create an account</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

