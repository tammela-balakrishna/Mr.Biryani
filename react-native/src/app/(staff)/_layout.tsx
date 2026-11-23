import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';
import { Brand } from '../../components/Brand';
import { canAccessStaffTab, getPrimaryStaffTab } from '../../authorization/permissions';

// Each tab is shown only when the signed-in account holds the role and permission it needs,
// strictly matching the web dashboards (Cashier only sees Cashier & Orders, Reception only Reception & Floor, etc.).
export default function StaffLayout() {
  const { roles, permissions, logout } = useAuth();
  const router = useRouter();

  const primaryTab = getPrimaryStaffTab(roles);

  const canFloor = canAccessStaffTab('floor', roles, permissions);
  const canOrders = canAccessStaffTab('staff-orders', roles, permissions);
  const canCashier = canAccessStaffTab('cashier', roles, permissions);
  const canReception = canAccessStaffTab('reception', roles, permissions);
  const canManager = canAccessStaffTab('manager', roles, permissions);
  const canReports = canAccessStaffTab('reports', roles, permissions);

  const HeaderLeft = () => (
    <View style={{ paddingLeft: 10 }}>
      <Brand compact showText tone="gold" />
    </View>
  );

  const HeaderRight = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/home')}
        style={{
          backgroundColor: 'rgba(212, 166, 58, 0.15)',
          borderWidth: 1,
          borderColor: colors.gold,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <Ionicons name="sparkles" size={13} color={colors.gold} />
        <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>Customer View</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => logout()}
        style={{
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderWidth: 1,
          borderColor: colors.danger,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Ionicons name="log-out-outline" size={13} color={colors.danger} />
        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Logout</Text>
      </Pressable>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.gold,
        headerTitle: () => null,
        headerLeft: () => <HeaderLeft />,
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
      <Tabs.Protected guard={canFloor}>
        <Tabs.Screen
          name="floor"
          options={{
            title: 'Floor',
            href: canFloor ? undefined : null,
            headerTitle: () => null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color as string} />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={canOrders}>
        <Tabs.Screen
          name="staff-orders"
          options={{
            title: 'Orders',
            href: canOrders ? undefined : null,
            headerTitle: () => null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={22} color={color as string} />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={canCashier}>
        <Tabs.Screen
          name="cashier"
          options={{
            title: 'Cashier',
            href: canCashier ? undefined : null,
            headerTitle: () => null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'card' : 'card-outline'} size={22} color={color as string} />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={canReception}>
        <Tabs.Screen
          name="reception"
          options={{
            title: 'Reception',
            href: canReception ? undefined : null,
            headerTitle: () => null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={color as string} />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={canManager}>
        <Tabs.Screen
          name="manager"
          options={{
            title: 'Manager',
            href: canManager ? undefined : null,
            headerTitle: () => null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'} size={22} color={color as string} />
            ),
          }}
        />
      </Tabs.Protected>
      <Tabs.Protected guard={canReports}>
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            href: canReports ? undefined : null,
            headerTitle: () => null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color as string} />
            ),
          }}
        />
      </Tabs.Protected>
    </Tabs>
  );
}
