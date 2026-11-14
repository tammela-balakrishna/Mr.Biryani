import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError, newIdempotencyKey } from '../../api/client';
import { EmptyState, ErrorText, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useCart } from '../../features/cart/CartProvider';
import { estimatedSubtotal, toOrderItems } from '../../features/cart/cart';
import { useBranches, usePlaceOrder } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { CUSTOMER_PERMISSIONS } from '../../authorization/permissions';
import { colors } from '../../theme/colors';

// The app shows an estimate. The server recalculates prices, tax and availability and returns the final order.
export default function CartScreen() {
  const cart = useCart();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const place = usePlaceOrder();
  const [branchChoice, setBranchChoice] = useState<string | null>(null);
  const [error, setError] = useState('');
  // One key per checkout attempt: a retry after a timeout reuses it, so the order cannot be duplicated.
  const attemptKey = useRef<string | null>(null);

  if (branches.isPending) return <Loading />;
  const branchId = branchChoice ?? branches.data?.[0]?.id ?? null;
  const subtotal = estimatedSubtotal(cart.lines);
  const canOrder = hasPermission(CUSTOMER_PERMISSIONS.placeOrder);

  const checkout = async () => {
    setError('');
    if (!branchId) {
      setError('No branch is open for orders right now.');
      return;
    }
    attemptKey.current = attemptKey.current ?? newIdempotencyKey();
    try {
      const order = await place.mutateAsync({ branchId, items: toOrderItems(cart.lines), idempotencyKey: attemptKey.current });
      cart.clear();
      attemptKey.current = null;
      Alert.alert('Order placed', `Reference ${order.id.slice(0, 8).toUpperCase()} · total ₹${Number(order.total).toFixed(2)}`);
      router.push('/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not place the order. Please try again.');
    }
  };

  if (cart.lines.length === 0) {
    return (
      <Screen>
        <EmptyState title="Your cart is empty" body="Add something from the menu to get started." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {cart.lines.map((line) => (
          <View key={line.menuItemId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{line.name}</Text>
              <Text style={{ color: colors.textMuted }}>₹{line.unitPrice.toFixed(2)} each</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${line.name}`} onPress={() => cart.change(line.menuItemId, -1)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.gold, fontSize: 22 }}>−</Text>
            </Pressable>
            <Text style={{ color: colors.text, minWidth: 24, textAlign: 'center', fontWeight: '700' }}>{line.quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${line.name}`} onPress={() => cart.change(line.menuItemId, 1)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.gold, fontSize: 22 }}>+</Text>
            </Pressable>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 12, gap: 4 }}>
          <Text style={{ color: colors.textMuted }}>Estimated subtotal (before tax)</Text>
          <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '700' }}>₹{subtotal.toFixed(2)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Tax and the final total are calculated by the restaurant when the order is placed.</Text>
        </View>
        {branches.data && branches.data.length > 1 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textMuted }}>Branch</Text>
            {branches.data.map((b) => (
              <Pressable key={b.id} accessibilityRole="radio" accessibilityState={{ selected: b.id === branchId }} onPress={() => setBranchChoice(b.id)} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: b.id === branchId ? colors.gold : colors.border }}>
                <Text style={{ color: colors.text }}>{b.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ErrorText message={error} />
        {!canOrder ? <ErrorText message="Your account cannot place orders." /> : null}
        <PrimaryButton title={place.isPending ? 'Placing order…' : 'Place order'} onPress={checkout} disabled={place.isPending || !canOrder} />
      </ScrollView>
    </Screen>
  );
}
