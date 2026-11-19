import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useMyOrders } from '../../features/data/queries';
import { useCart } from '../../features/cart/CartProvider';
import { colors } from '../../theme/colors';

const STATUS_COLOR: Record<string, string> = {
  PLACED: colors.gold,
  ACCEPTED: '#60A5FA',
  PREPARING: '#C084FC',
  READY: '#34D399',
  SERVED: '#4ADE80',
  COMPLETED: colors.textMuted,
  CANCELLED: colors.danger,
};

// Status is shown exactly as the server reports it. "Confirmed" or "paid" appear only when the server says so.
export default function OrdersScreen() {
  const orders = useMyOrders();
  const cart = useCart();
  const router = useRouter();

  if (orders.isPending) return <Loading />;
  if (orders.isError) {
    return (
      <Screen>
        <View style={{ padding: 24 }}>
          <ErrorText message="Could not load your orders." />
        </View>
      </Screen>
    );
  }

  const handleReorder = (items: { menuItemId: string | null; name: string; lineSubtotal?: string | number; quantity: number }[]) => {
    items.forEach((line) => {
      if (!line.menuItemId) return;
      const price = line.lineSubtotal ? Number(line.lineSubtotal) / line.quantity : 0;
      for (let i = 0; i < line.quantity; i++) {
        cart.add({ menuItemId: line.menuItemId, name: line.name, unitPrice: price });
      }
    });
    router.push('/cart');
  };

  return (
    <Screen>
      <FlatList
        data={orders.data}
        keyExtractor={(order) => order.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => { void orders.refetch(); }} tintColor={colors.gold} />}
        ListEmptyComponent={<EmptyState title="No orders yet" body="Your orders will appear here." />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ color: STATUS_COLOR[item.status] ?? colors.gold, fontWeight: '700', fontSize: 12 }}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()}</Text>
            
            <View style={{ gap: 4, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingTop: 8 }}>
              {item.items.map((line) => (
                <View key={`${line.name}-${line.quantity}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontSize: 13 }}>{line.name} × {line.quantity}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>₹{Number(line.lineSubtotal).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingTop: 8 }}>
              <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 15 }}>Total ₹{Number(item.total).toFixed(2)}</Text>
              
              <Pressable
                accessibilityRole="button"
                onPress={() => handleReorder(item.items)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: 'rgba(212, 166, 58, 0.15)',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '700' }}>Order Again</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
