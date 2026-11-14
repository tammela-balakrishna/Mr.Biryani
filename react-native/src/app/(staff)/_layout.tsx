import { Tabs } from 'expo-router/js-tabs';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

// Each tab is shown only when the signed-in account holds the permission it needs.
// The API enforces the same permissions and the branch assignment on every request.
export default function StaffLayout() {
  const { hasPermission } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.gold,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Protected guard={hasPermission('tables.read')}>
        <Tabs.Screen name="floor" options={{ title: 'Floor' }} />
      </Tabs.Protected>
      <Tabs.Protected guard={hasPermission('orders.read')}>
        <Tabs.Screen name="staff-orders" options={{ title: 'Orders' }} />
      </Tabs.Protected>
      <Tabs.Protected guard={hasPermission('billing.read') || hasPermission('payments.collect')}>
        <Tabs.Screen name="cashier" options={{ title: 'Cashier' }} />
      </Tabs.Protected>
      <Tabs.Protected guard={hasPermission('reservations.read')}>
        <Tabs.Screen name="reception" options={{ title: 'Reception' }} />
      </Tabs.Protected>
      <Tabs.Protected guard={hasPermission('inventory.read') || hasPermission('expenses.create')}>
        <Tabs.Screen name="manager" options={{ title: 'Manager' }} />
      </Tabs.Protected>
      <Tabs.Protected guard={hasPermission('reports.sales.read')}>
        <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      </Tabs.Protected>
    </Tabs>
  );
}
