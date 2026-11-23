import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import { colors } from '../theme/colors';
import { LogoBadge } from '../components/Logo';
import { Field, PrimaryButton, ErrorText, Screen } from '../components/ui';

const REAL_STAFF_ACCOUNTS = [
  { role: 'Cashier (Pavan)', email: 'pavan@gmail.com', pass: 'Admin@Biryani2026!', icon: 'card-outline' },
  { role: 'Receptionist (Navya)', email: 'navya@gmail.com', pass: 'Admin@Biryani2026!', icon: 'people-outline' },
  { role: 'Captain (Prabhakar)', email: 'prabhakar@gmail.com', pass: 'Admin@Biryani2026!', icon: 'grid-outline' },
  { role: 'Waiter (Kiran)', email: 'kiran@gmail.com', pass: 'Admin@Biryani2026!', icon: 'restaurant-outline' },
  { role: 'Admin', email: 'admin@example.com', pass: 'Admin@Biryani2026!', icon: 'shield-checkmark-outline' },
  { role: 'Customer (Balakrishna)', email: 'balakrishnatammela1@gmail.com', pass: 'Admin@Biryani2026!', icon: 'person-outline' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Invalid email or password.' : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fillAndLogin = async (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError('');
    setBusy(true);
    try {
      await login(e, p);
      router.replace('/');
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Invalid email or password.' : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card Container */}
          <View
            style={{
              backgroundColor: '#15120E',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              overflow: 'hidden',
              padding: 24,
              gap: 16,
            }}
          >
            {/* Top Brand Banner */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <LogoBadge detail="full" size={88} />
              <Text style={{ color: colors.gold, letterSpacing: 4, fontSize: 11, fontWeight: '800', marginTop: 4 }}>
                MR. BIRIYANI
              </Text>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
                Welcome <Text style={{ color: colors.gold }}>Back</Text>
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                Sign in to your royal account.
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
              />
              <ErrorText message={error} />
              <PrimaryButton
                title={busy ? 'Authenticating…' : 'Sign in'}
                onPress={submit}
                disabled={busy || !email || !password}
                icon={<Ionicons name="log-in" size={17} color={colors.onGold} />}
              />
              {busy && <ActivityIndicator color={colors.gold} />}
            </View>

            {/* Real DB Accounts */}
            <View style={{ borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', paddingTop: 14, gap: 10 }}>
              <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                Real Local DB Accounts (PostgreSQL):
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REAL_STAFF_ACCOUNTS.map((u) => (
                  <Pressable
                    key={u.role}
                    accessibilityRole="button"
                    onPress={() => fillAndLogin(u.email, u.pass)}
                    style={{
                      backgroundColor: 'rgba(212, 166, 58, 0.1)',
                      borderWidth: 1,
                      borderColor: colors.cardBorder,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Ionicons name={u.icon as any} size={14} color={colors.gold} />
                    <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700' }}>{u.role}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Navigation Links */}
            <View style={{ alignItems: 'center', gap: 10, marginTop: 4 }}>
              <Link href="/register" asChild>
                <Pressable accessibilityRole="link">
                  <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 13 }}>
                    New here? <Text style={{ textDecorationLine: 'underline' }}>Create an account</Text>
                  </Text>
                </Pressable>
              </Link>

              <Pressable accessibilityRole="button" onPress={() => router.push('/home')} hitSlop={8}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>← Back to Home / Explore Dishes</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
