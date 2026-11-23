import { ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { OutlineButton, PrimaryButton, Screen } from '../../components/ui';
import { LogoBadge } from '../../components/Logo';
import { useAuth } from '../../auth/AuthProvider';
import { useMyOrders } from '../../features/data/queries';
import { reservationApi } from '../../api/endpoints';
import { colors } from '../../theme/colors';

export default function AccountScreen() {
  const auth = useAuth();
  const router = useRouter();

  const orders = useMyOrders(auth.status === 'authenticated');
  const reservations = useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: reservationApi.mine,
    enabled: auth.status === 'authenticated',
  });

  if (auth.status !== 'authenticated') {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          {/* Guest VIP Membership Hero */}
          <View
            style={{
              backgroundColor: '#15120E',
              borderRadius: 22,
              padding: 24,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <LogoBadge detail="full" size={84} />

            <View style={{ alignItems: 'center', gap: 3 }}>
              <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
                Mr. Biryani Guest
              </Text>
              <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
                House of Andhra Flavours
              </Text>
            </View>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                textAlign: 'center',
                lineHeight: 19,
                marginTop: 2,
              }}
            >
              Sign in to manage feast orders, track dining table bookings, and experience authentic royal hospitality.
            </Text>

            <View style={{ width: '100%', gap: 10, marginTop: 8 }}>
              <PrimaryButton
                title="Sign In to Your Account"
                onPress={() => router.push('/login')}
                icon={<Ionicons name="log-in-outline" size={17} color={colors.onGold} />}
              />
              <OutlineButton
                title="Create a New Account"
                onPress={() => router.push('/register')}
                icon={<Ionicons name="person-add-outline" size={16} color={colors.gold} />}
              />
            </View>
          </View>

          {/* Quick Explore Services */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
              Explore Services
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/menu')}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="restaurant" size={20} color={colors.gold} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Explore Andhra Delicacies</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/reservations')}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="calendar" size={20} color={colors.gold} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Book a Royal Table</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/assistant')}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="sparkles" size={20} color={colors.gold} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>AI Dining Sommelier</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>
          </View>

          {/* Demo Accounts Helper Card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="key-outline" size={16} color={colors.gold} />
              <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 13 }}>Quick Demo Sign In</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
              Tap Sign In above to test with preloaded accounts: Customer, Floor Captain, Cashier POS, or Receptionist.
            </Text>
          </View>

          {/* Restaurant & Support info */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              gap: 6,
            }}
          >
            <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 14 }}>Mr. Biryani Bengaluru</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
              BTM Layout · HSR Layout · Hosur Road · Marathahalli
            </Text>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
              📞 +91 88848 66644
            </Text>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const { user, roles } = auth.session;
  const isStaff = roles.some((role) => role !== 'CUSTOMER');
  const userInitial = (user.fullName || 'U').charAt(0).toUpperCase();

  const roleDisplay = roles.includes('CUSTOMER')
    ? 'Royal Guest'
    : roles.map((r) => r.charAt(0) + r.slice(1).toLowerCase()).join(', ');

  const totalSpent = (orders.data ?? []).reduce((sum, o) => sum + Number(o.total || 0), 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <View
          style={{
            backgroundColor: '#15120E',
            borderRadius: 22,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: colors.gold,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.onGold, fontSize: 26, fontWeight: '900' }}>
                {userInitial}
              </Text>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>
                {user.fullName}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor: 'rgba(212, 166, 58, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(212, 166, 58, 0.35)',
                }}
              >
                <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>
                  {roleDisplay}
                </Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={{ borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', paddingTop: 12, gap: 6 }}>
            {user.email ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Email</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{user.email}</Text>
              </View>
            ) : null}
            {user.phone ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Mobile</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{user.phone}</Text>
              </View>
            ) : null}
          </View>

          {/* Quick Metrics */}
          <View
            style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              paddingTop: 14,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Orders</Text>
              <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
                {orders.data?.length ?? 0}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Spent</Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
                ₹{totalSpent.toFixed(0)}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Bookings</Text>
              <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
                {reservations.data?.length ?? 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Shortcuts */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
            Quick Actions
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/orders')}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="receipt-outline" size={20} color={colors.gold} />
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>View Order History</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gold} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/reservations')}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="calendar-outline" size={20} color={colors.gold} />
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Table Reservations</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gold} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/assistant')}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="sparkles-outline" size={20} color={colors.gold} />
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>AI Dining Sommelier</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gold} />
          </Pressable>

          {isStaff && (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/floor')}
              style={{
                backgroundColor: 'rgba(212, 166, 58, 0.14)',
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.gold,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ionicons name="grid-outline" size={20} color={colors.gold} />
                <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 14 }}>Staff Operations Console</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>
          )}
        </View>

        {/* Sign Out */}
        <View style={{ marginTop: 8 }}>
          <OutlineButton
            title="Sign Out"
            onPress={() => void auth.logout()}
            icon={<Ionicons name="log-out-outline" size={16} color={colors.gold} />}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
