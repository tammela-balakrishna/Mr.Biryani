import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>;
}

export function Field({ label, ...input }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#6B6B6B"
        {...input}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 16,
        }}
      />
    </View>
  );
}

export function PrimaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: colors.gold,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        minHeight: 48,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: colors.onGold, fontWeight: '700', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 14 }}>{message}</Text>;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{title}</Text>
      {body ? <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{body}</Text> : null}
    </View>
  );
}
