import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useCart } from '../../features/cart/CartProvider';
import { useMenu } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { CUSTOMER_PERMISSIONS } from '../../authorization/permissions';
import { colors } from '../../theme/colors';
import type { MenuItem } from '../../api/contracts';

// Menu comes only from the backend. Nothing is hardcoded here, so the website and the app never disagree on prices.
export default function MenuScreen() {
  const menu = useMenu();
  const cart = useCart();
  const router = useRouter();
  const { tableId, branchId } = useLocalSearchParams<{ tableId?: string; branchId?: string }>();
  const { hasPermission } = useAuth();
  const canOrder = hasPermission(CUSTOMER_PERMISSIONS.placeOrder) || hasPermission('orders.create');
  const [selected, setSelected] = useState<string | null>(null);

  const categories = useMemo(() => menu.data?.categories ?? [], [menu.data]);
  const activeId = selected ?? categories[0]?.id ?? null;
  const items = useMemo<MenuItem[]>(
    () => categories.find((c) => c.id === activeId)?.items ?? [],
    [categories, activeId],
  );

  const totalCount = useMemo(() => cart.lines.reduce((s, x) => s + x.quantity, 0), [cart.lines]);
  const totalAmount = useMemo(() => cart.lines.reduce((s, x) => s + x.unitPrice * x.quantity, 0), [cart.lines]);

  if (menu.isPending) return <Loading />;
  if (menu.isError) {
    return (
      <Screen>
        <View style={{ padding: 24, gap: 12 }}>
          <ErrorText message="Could not load the menu." />
          <Pressable accessibilityRole="button" onPress={() => menu.refetch()}>
            <Text style={{ color: colors.gold }}>Try again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Table Ticket Banner for Staff */}
      {tableId ? (
        <View style={{ backgroundColor: 'rgba(212, 166, 58, 0.15)', padding: 12, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 13 }}>
            Active Ticket · Table #{tableId.slice(0, 8).toUpperCase()}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/cart?tableId=${tableId}&branchId=${branchId ?? ''}`)}
          >
            <Text style={{ color: colors.text, fontWeight: '700', textDecorationLine: 'underline', fontSize: 13 }}>
              View Ticket ({totalCount}) →
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 }}>
        {categories.map((category) => {
          const active = category.id === activeId;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(category.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? colors.gold : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? colors.onGold : colors.text, fontWeight: '600' }}>{category.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {items.length === 0 ? (
        <EmptyState title="No items in this category yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: totalCount > 0 ? 80 : 16 }}
          renderItem={({ item }) => {
            const lineQty = cart.lines.find((l) => l.menuItemId === item.id)?.quantity ?? 0;
            return (
              <View style={{ flexDirection: 'row', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                  {item.description ? <Text style={{ color: colors.textMuted }}>{item.description}</Text> : null}
                  <Text style={{ color: colors.gold, fontWeight: '700', marginTop: 4 }}>₹{Number(item.price).toFixed(2)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.name} to cart`}
                  disabled={!item.available || !canOrder}
                  onPress={() => cart.add({ menuItemId: item.id, name: item.name, unitPrice: Number(item.price) })}
                  style={{
                    alignSelf: 'center',
                    minWidth: 84,
                    minHeight: 44,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: item.available && canOrder ? colors.gold : colors.surfaceAlt,
                  }}
                >
                  <Text style={{ color: item.available && canOrder ? colors.onGold : colors.textMuted, fontWeight: '700' }}>
                    {!item.available ? 'Unavailable' : lineQty > 0 ? `Add (${lineQty})` : (tableId ? 'Add to Ticket +' : 'Add +')}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.gold,
            padding: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <View>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </Text>
            <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 13 }}>
              ₹{totalAmount.toFixed(2)} total
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(tableId ? `/cart?tableId=${tableId}&branchId=${branchId ?? ''}` : '/cart')}
            style={{
              backgroundColor: colors.gold,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: colors.onGold, fontWeight: '700', fontSize: 14 }}>
              {tableId ? 'Review Ticket →' : 'View Cart →'}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
