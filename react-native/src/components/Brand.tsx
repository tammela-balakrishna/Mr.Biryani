import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { BrandLogo, LogoBadge } from './Logo';

export interface BrandProps {
  onPress?: () => void;
  compact?: boolean;
  showText?: boolean;
  tone?: 'dark' | 'light' | 'gold';
  style?: StyleProp<ViewStyle>;
}

export function Brand({
  onPress,
  compact = false,
  showText = true,
  tone = 'dark',
  style,
}: BrandProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/home');
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mr. Biriyani Home"
      onPress={handlePress}
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}
    >
      {showText ? (
        <BrandLogo
          tone={tone}
          height={compact ? 32 : 40}
        />
      ) : (
        <LogoBadge
          detail="simple"
          size={compact ? 32 : 42}
        />
      )}
    </Pressable>
  );
}

export default Brand;
