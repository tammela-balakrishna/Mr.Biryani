import { ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrimaryButton, Screen } from '../../components/ui';
import { useAuth } from '../../auth/AuthProvider';
import { useMyOrders } from '../../features/data/queries';
import { reservationApi } from '../../api/endpoints';
import { colors } from '../../theme/colors';

export default function AccountScreen() {
  const auth = useAuth();
  const router = useRouter();

  const orders = useMyOrders();
  const reservations = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: reservationApi.mine,
    enabled: auth.status === 'authenticated',
  });

  if (auth.status !== 'authenticated') return null;
  const { user, roles } = auth.session;
  const isStaff = roles.some((role) => role !== 'CUSTOMER');
  const userInitial = (user.fullName || 'U').charAt(0).toUpperCase();

  const roleDisplay = roles.includes('CUSTOMER')
    ? 'Customer'
    : roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase()).join(', ');

  const totalSpent = (orders.data ?? []).reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        {/* User Profile Hero Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.gold,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.onGold, fontSize: 28, fontWeight: '800' }}>
                {userInitial}
              </Text>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
                {user.fullName}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: 'rgba(212, 166, 58, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(212, 166, 58, 0.3)',
                }}
              >
                <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>
                  {roleDisplay}
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={{ borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingTop: 14, gap: 6 }}>
            {user.email ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Email</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{user.email}</Text>
              </View>
            ) : null}
            {user.phone ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Phone</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{user.phone}</Text>
              </View>
            ) : null}
          </View>

          {/* Quick Metrics */}
          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              paddingTop: 14,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Orders</Text>
              <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700', marginTop: 2 }}>
                {orders.data?.length ?? 0}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Spent</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 }}>
                ₹{totalSpent.toFixed(0)}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Bookings</Text>
              <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700', marginTop: 2 }}>
                {reservations.data?.length ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Shortcuts */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' }}>
            Quick Actions
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/orders')}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>View Order History</Text>
            <Text style={{ color: colors.gold }}>→</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/reservations')}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>Table Reservations</Text>
            <Text style={{ color: colors.gold }}>→</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/assistant')}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '600' }}>AI Dining Assistant</Text>
            <Text style={{ color: colors.gold }}>→</Text>
          </Pressable>

          {isStaff && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/staff-orders')}
              style={{
                backgroundColor: 'rgba(212, 166, 58, 0.12)',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.gold,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.gold, fontWeight: '700' }}>Staff Operations Console</Text>
              <Text style={{ color: colors.gold }}>→</Text>
            </Pressable>
          )}
        </View>

        {/* Sign Out */}
        <View style={{ marginTop: 12 }}>
          <PrimaryButton title="Sign out" onPress={() => void auth.logout()} />
        </View>
      </ScrollView>
    </Screen>
  );
}
