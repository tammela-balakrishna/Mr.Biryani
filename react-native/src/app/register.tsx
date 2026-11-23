import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { colors } from '../theme/colors';
import { LogoBadge } from '../components/Logo';
import { Field, PrimaryButton, ErrorText, Screen } from '../components/ui';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().regex(/^(\+[1-9]\d{7,14})?$/, 'Use the format +919876543210'),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await register({ ...parsed.data, phone: parsed.data.phone || undefined });
      router.replace('/home');
    } catch (err) {
      setError((err as Error).message);
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
                Create <Text style={{ color: colors.gold }}>Account</Text>
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                Join our royal dining guest circle.
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <Field
                label="Full Name"
                value={form.fullName}
                onChangeText={(v) => setForm({ ...form, fullName: v })}
                autoComplete="name"
                placeholder="e.g. Ramesh Kumar"
              />
              <Field
                label="Email"
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="ramesh@example.com"
              />
              <Field
                label="Mobile (with country code)"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                keyboardType="phone-pad"
                placeholder="+919876543210"
              />
              <Field
                label="Password (10+ characters)"
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
                secureTextEntry
                placeholder="••••••••••"
              />
              <ErrorText message={error} />
              <PrimaryButton
                title={busy ? 'Creating Account…' : 'Create Account'}
                onPress={submit}
                disabled={busy}
                icon={<Ionicons name="person-add" size={16} color={colors.onGold} />}
              />
            </View>

            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <Link href="/login" asChild>
                <Pressable accessibilityRole="link" hitSlop={8}>
                  <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 13 }}>
                    Already registered? <Text style={{ textDecorationLine: 'underline' }}>Sign in</Text>
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
