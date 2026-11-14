import { FlatList, RefreshControl, Text, View } from 'react-native';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useMyOrders } from '../../features/data/queries';
import { colors } from '../../theme/colors';

// Status is shown exactly as the server reports it. "Confirmed" or "paid" appear only when the server says so.
export default function OrdersScreen() {
  const orders = useMyOrders();
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
  return (
    <Screen>
      <FlatList
        data={orders.data}
        keyExtractor={(order) => order.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => { void orders.refetch(); }} tintColor={colors.gold} />}
        ListEmptyComponent={<EmptyState title="No orders yet" body="Your orders will appear here." />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={{ color: colors.gold }}>{item.status}</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(item.createdAt).toLocaleString()}</Text>
            {item.items.map((line) => (
              <Text key={`${line.name}-${line.quantity}`} style={{ color: colors.text }}>{line.name} × {line.quantity}</Text>
            ))}
            <Text style={{ color: colors.gold, fontWeight: '700' }}>Total ₹{Number(item.total).toFixed(2)} (incl. tax)</Text>
          </View>
        )}
      />
    </Screen>
  );
}
