import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>;
}

export function VegBadge() {
  return (
    <View
      style={{
        width: 15,
        height: 15,
        borderWidth: 1.5,
        borderColor: colors.vegGreen,
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.vegGreen }} />
    </View>
  );
}

export function NonVegBadge() {
  return (
    <View
      style={{
        width: 15,
        height: 15,
        borderWidth: 1.5,
        borderColor: colors.nonVegRed,
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
      }}
    >
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 3.5,
          borderRightWidth: 3.5,
          borderBottomWidth: 6,
          borderStyle: 'solid',
          backgroundColor: 'transparent',
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: colors.nonVegRed,
        }}
      />
    </View>
  );
}

export function DietaryBadge({ isVeg }: { isVeg?: boolean }) {
  return isVeg ? <VegBadge /> : <NonVegBadge />;
}

export function GoldCard({ children, style }: { children: ReactNode; style?: any }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  kicker,
  title,
  actionLabel,
  onAction,
}: {
  kicker?: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
      <View style={{ gap: 2 }}>
        {kicker ? (
          <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
            {kicker}
          </Text>
        ) : null}
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '700' }}>{actionLabel} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
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
          borderColor: colors.cardBorder,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 15,
        }}
      />
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
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
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 48,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        elevation: 2,
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      })}
    >
      {icon}
      <Text style={{ color: colors.onGold, fontWeight: '800', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function OutlineButton({
  title,
  onPress,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: 'rgba(212, 166, 58, 0.08)',
        borderColor: colors.gold,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 13,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 46,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      {icon}
      <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13, marginTop: 4 }}>{message}</Text>;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.gold} />
    </View>
  );
}

export function EmptyState({ title, body, icon }: { title: string; body?: string; icon?: ReactNode }) {
  return (
    <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      {icon}
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      {body ? <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>{body}</Text> : null}
    </View>
  );
}
