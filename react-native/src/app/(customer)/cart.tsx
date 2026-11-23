import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, newIdempotencyKey } from '../../api/client';
import { staffApi } from '../../api/endpoints';
import { DietaryBadge, EmptyState, ErrorText, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useCart } from '../../features/cart/CartProvider';
import { estimatedSubtotal, toOrderItems } from '../../features/cart/cart';
import { useBranches, usePlaceOrder } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

export default function CartScreen() {
  const cart = useCart();
  const router = useRouter();
  const { tableId, branchId: urlBranchId } = useLocalSearchParams<{ tableId?: string; branchId?: string }>();
  const { hasPermission, status } = useAuth();
  const branches = useBranches();
  const branchList = branches.data ?? [];
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const place = usePlaceOrder();
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);
  const attemptKey = useRef<string | null>(null);

  const branchId = urlBranchId || selectedBranchId || branchList[0]?.id || null;
  const activeBranch = branchList.find((b) => b.id === branchId) ?? branchList[0];
  const subtotal = estimatedSubtotal(cart.lines);
  const gst = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + gst;

  const isStaff = hasPermission('orders.create');

  const checkout = async () => {
    setError('');
    if (status !== 'authenticated') {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to complete your royal feast order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    if (!branchId) {
      setError('No branch is open for orders right now.');
      return;
    }
    if (isStaff && !tableId) {
      setError('Table selection is missing. Please select a table from the floor screen.');
      return;
    }

    attemptKey.current = attemptKey.current ?? newIdempotencyKey();
    setPlacing(true);

    try {
      let order;
      if (isStaff && tableId) {
        order = await staffApi.placeForTable(
          branchId,
          { tableId, items: toOrderItems(cart.lines) },
          attemptKey.current
        );
      } else {
        order = await place.mutateAsync({
          branchId,
          items: toOrderItems(cart.lines),
          idempotencyKey: attemptKey.current,
        });
      }

      cart.clear();
      attemptKey.current = null;
      Alert.alert(
        tableId ? 'Order Sent to Kitchen' : 'Order Placed Successfully!',
        `Reference #${order.id.slice(0, 8).toUpperCase()} · Total ₹${Number(order.total).toFixed(2)}`
      );
      router.push(tableId ? '/staff-orders' : '/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place the order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (cart.lines.length === 0) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
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
            <Ionicons name="bag-handle-outline" size={38} color={colors.gold} />
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
            Your Feast Cart is Empty
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>
            Add your favorite Andhra dum biryanis, spicy starters, and ghee roasts to start your feast.
          </Text>
          <View style={{ width: '100%', maxWidth: 260, marginTop: 8 }}>
            <PrimaryButton
              title="Explore Royal Menu"
              onPress={() => router.push('/menu')}
              icon={<Ionicons name="restaurant" size={16} color={colors.onGold} />}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Dine-In / Serving Location Header */}
        {tableId ? (
          <View
            style={{
              backgroundColor: 'rgba(212, 166, 58, 0.12)',
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.gold,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Ionicons name="restaurant" size={24} color={colors.gold} />
            <View>
              <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>
                POS DINE-IN TICKET
              </Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 1 }}>
                Table #{tableId.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="location" size={18} color={colors.gold} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>
                Serving Branch: {activeBranch?.name ?? 'Main Branch'}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {branchList.map((b) => {
                const active = branchId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setSelectedBranchId(b.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: active ? 'rgba(212, 166, 58, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      borderWidth: 1,
                      borderColor: active ? colors.gold : colors.cardBorder,
                    }}
                  >
                    <Text style={{ color: active ? colors.gold : colors.textSecondary, fontWeight: active ? '700' : '500', fontSize: 12 }}>
                      {b.code} · {b.name.replace('Mr. Biryani - ', '')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Selected Items Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="bag-check-outline" size={18} color={colors.gold} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Feast Items</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => cart.clear()} hitSlop={8}>
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Clear All</Text>
            </Pressable>
          </View>

          <View style={{ gap: 12, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', paddingTop: 12 }}>
            {cart.lines.map((line) => {
              const isVeg = /paneer|veg|gobi|mushroom/i.test(line.name);
              return (
                <View
                  key={line.menuItemId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, gap: 2, marginRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <DietaryBadge isVeg={isVeg} />
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{line.name}</Text>
                    </View>
                    <Text style={{ color: colors.goldBright, fontSize: 13, fontWeight: '600' }}>
                      ₹{line.unitPrice.toFixed(0)} each
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    {/* Stepper */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surfaceAlt,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.cardBorder,
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        gap: 8,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => cart.change(line.menuItemId, -1)}
                        style={{ paddingHorizontal: 8, paddingVertical: 2 }}
                      >
                        <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 15 }}>-</Text>
                      </Pressable>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{line.quantity}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => cart.change(line.menuItemId, 1)}
                        style={{ paddingHorizontal: 8, paddingVertical: 2 }}
                      >
                        <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 15 }}>+</Text>
                      </Pressable>
                    </View>

                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, minWidth: 64, textAlign: 'right' }}>
                      ₹{(line.unitPrice * line.quantity).toFixed(0)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Bill Summary */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="receipt-outline" size={17} color={colors.gold} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>Bill Summary</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Item Subtotal</Text>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>₹{subtotal.toFixed(2)}</Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>GST (5% Government Tax)</Text>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>₹{gst.toFixed(2)}</Text>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              paddingTop: 12,
              marginTop: 4,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>Total Amount</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Inclusive of all taxes</Text>
            </View>
            <Text style={{ color: colors.goldBright, fontSize: 22, fontWeight: '900' }}>
              ₹{total.toFixed(2)}
            </Text>
          </View>
        </View>

        <ErrorText message={error} />

        {/* Place Order CTA */}
        <PrimaryButton
          title={placing ? 'Sending Feast to Kitchen…' : `Place Order · ₹${total.toFixed(0)}`}
          onPress={checkout}
          disabled={placing}
          icon={<Ionicons name="checkmark-circle" size={18} color={colors.onGold} />}
        />
      </ScrollView>
    </Screen>
  );
}
