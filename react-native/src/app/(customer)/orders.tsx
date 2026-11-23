import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DietaryBadge, EmptyState, ErrorText, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useMyOrders } from '../../features/data/queries';
import { useCart } from '../../features/cart/CartProvider';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PLACED: { label: 'Order Placed', color: colors.gold, bg: 'rgba(212, 166, 58, 0.15)', icon: 'checkmark-circle-outline' },
  ACCEPTED: { label: 'Kitchen Accepted', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', icon: 'restaurant-outline' },
  PREPARING: { label: 'Cooking Dum Feast', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)', icon: 'flame-outline' },
  READY: { label: 'Ready for Serving', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', icon: 'alarm-outline' },
  SERVED: { label: 'Served at Table', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.15)', icon: 'checkmark-done-outline' },
  COMPLETED: { label: 'Feast Completed', color: colors.textMuted, bg: 'rgba(255, 255, 255, 0.08)', icon: 'receipt-outline' },
  CANCELLED: { label: 'Cancelled', color: colors.danger, bg: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle-outline' },
};

export default function OrdersScreen() {
  const auth = useAuth();
  const isAuthenticated = auth.status === 'authenticated';
  const orders = useMyOrders(isAuthenticated);
  const cart = useCart();
  const router = useRouter();

  if (!isAuthenticated) {
    return (
      <Screen>
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(212, 166, 58, 0.12)',
              borderWidth: 1,
              borderColor: colors.cardBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="receipt-outline" size={36} color={colors.gold} />
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
            Track Your Royal Feasts
          </Text>
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 19,
              maxWidth: 300,
            }}
          >
            Sign in to follow live kitchen preparation, view digital dining bills, and reorder past favorites in one tap.
          </Text>
          <View style={{ width: '100%', maxWidth: 280, gap: 10, marginTop: 8 }}>
            <PrimaryButton
              title="Sign In to View Orders"
              onPress={() => router.push('/login')}
              icon={<Ionicons name="log-in-outline" size={17} color={colors.onGold} />}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/menu')}
              style={{
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                backgroundColor: colors.surface,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                Explore Menu
              </Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  if (orders.isPending) return <Loading />;
  if (orders.isError) {
    return (
      <Screen>
        <View style={{ padding: 24 }}>
          <ErrorText message="Could not load your orders. Pull to refresh." />
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
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => { void orders.refetch(); }} tintColor={colors.gold} />}
        ListEmptyComponent={
          <EmptyState
            title="No orders placed yet"
            body="When you order a feast, its live status and digital bill will show up here."
            icon={<Ionicons name="receipt-outline" size={38} color={colors.textMuted} />}
          />
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PLACED;
          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 18,
                padding: 16,
                gap: 12,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              {/* Card Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                    Order #{item.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    backgroundColor: cfg.bg,
                  }}
                >
                  <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                  <Text style={{ color: cfg.color, fontWeight: '800', fontSize: 11 }}>
                    {cfg.label}
                  </Text>
                </View>
              </View>

              {/* Items List */}
              <View
                style={{
                  gap: 8,
                  borderTopWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                  paddingTop: 10,
                }}
              >
                {item.items.map((line) => {
                  const isVeg = /paneer|veg|gobi|mushroom/i.test(line.name);
                  return (
                    <View key={`${line.name}-${line.quantity}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <DietaryBadge isVeg={isVeg} />
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                          {line.name} × {line.quantity}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                        ₹{Number(line.lineSubtotal).toFixed(0)}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Total & Order Again */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTopWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                  paddingTop: 10,
                }}
              >
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Total Amount</Text>
                  <Text style={{ color: colors.goldBright, fontWeight: '900', fontSize: 17 }}>
                    ₹{Number(item.total).toFixed(2)}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => handleReorder(item.items)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: 'rgba(212, 166, 58, 0.15)',
                    borderWidth: 1,
                    borderColor: colors.gold,
                  }}
                >
                  <Ionicons name="refresh" size={13} color={colors.gold} />
                  <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '800' }}>Order Again</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}
