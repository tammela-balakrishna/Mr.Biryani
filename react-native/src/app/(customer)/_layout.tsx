import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthProvider';
import { useCart } from '../../features/cart/CartProvider';
import { colors } from '../../theme/colors';
import { Brand } from '../../components/Brand';
import { getPrimaryStaffTab } from '../../authorization/permissions';

export default function CustomerLayout() {
  const { isStaff, status, roles } = useAuth();
  const router = useRouter();
  const cart = useCart();
  const cartBadge = cart.lines.reduce((s, l) => s + l.quantity, 0);

  const HeaderBrand = () => (
    <View style={{ paddingLeft: 6 }}>
      <Brand compact showText tone="gold" />
    </View>
  );

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 14 }}>
      {isStaff ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            const target = getPrimaryStaffTab(roles);
            router.push(`/${target}` as any);
          }}
          style={{
            backgroundColor: 'rgba(212, 166, 58, 0.15)',
            borderWidth: 1,
            borderColor: colors.gold,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Ionicons name="grid-outline" size={13} color={colors.gold} />
          <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>Staff Ops</Text>
        </Pressable>
      ) : status === 'anonymous' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={{
            backgroundColor: colors.gold,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Ionicons name="log-in-outline" size={14} color={colors.onGold} />
          <Text style={{ color: colors.onGold, fontSize: 12, fontWeight: '800' }}>Sign In</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0 },
        headerTintColor: colors.gold,
        headerTitle: () => <HeaderBrand />,
        headerRight: () => <HeaderRight />,
        tabBarStyle: {
          backgroundColor: '#0F0E0C',
          borderTopColor: 'rgba(212, 166, 58, 0.18)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: '#737373',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Reserve',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarBadge: cartBadge > 0 ? cartBadge : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.gold,
            color: colors.onGold,
            fontSize: 10,
            fontWeight: '800',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bag-handle' : 'bag-handle-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
