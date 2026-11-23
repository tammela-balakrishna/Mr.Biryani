import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { CartProvider } from '../features/cart/CartProvider';
import { colors } from '../theme/colors';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1 } },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { status, isStaff } = useAuth();
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const signedIn = status === 'authenticated';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(customer)" />
      <Stack.Protected guard={signedIn && isStaff}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
