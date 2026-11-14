import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { colors } from '../theme/colors';
import { Field, PrimaryButton, ErrorText, Screen } from '../components/ui';

// Public registration always creates a Customer. There is no role field on this form.
const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().regex(/^(\+[1-9]\d{7,14})?$/, 'Use the format +919876543210'),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

export default function RegisterScreen() {
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Create account</Text>
          <Field label="Full name" value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} autoComplete="name" />
          <Field label="Email" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Mobile (optional, with country code)" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
          <Field label="Password (10+ characters)" value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} secureTextEntry />
          <ErrorText message={error} />
          <PrimaryButton title={busy ? 'Creating…' : 'Create account'} onPress={submit} disabled={busy} />
          <View style={{ alignItems: 'center' }}>
            <Link href="/login" asChild>
              <Pressable accessibilityRole="link"><Text style={{ color: colors.gold }}>Already registered? Sign in</Text></Pressable>
            </Link>
          </View>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
