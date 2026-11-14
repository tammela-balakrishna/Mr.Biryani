import { useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, newIdempotencyKey } from '../../api/client';
import { staffApi } from '../../api/endpoints';
import type { Bill } from '../../api/contracts';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const METHODS = ['CASH', 'CARD', 'UPI'] as const;
type Method = (typeof METHODS)[number];

// Cashier view: create a bill from a served order and record cash, card or UPI tenders.
// The server enforces the balance; a retry of the same payment reuses its idempotency key.
export default function CashierScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const [bill, setBill] = useState<Bill | null>(null);
  const [method, setMethod] = useState<Method>('CASH');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const paymentKey = useRef<string | null>(null);

  const served = useQuery({
    queryKey: ['staff', 'served', branchId],
    queryFn: () => staffApi.orders(branchId as string, 'SERVED'),
    enabled: !!branchId,
  });

  const createBill = useMutation({
    mutationFn: (orderId: string) => staffApi.createBill(branchId as string, orderId),
    onSuccess: (created) => {
      setBill(created);
      setAmount(String(created.due));
      void queryClient.invalidateQueries({ queryKey: ['staff', 'served', branchId] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create the bill.'),
  });

  const pay = useMutation({
    mutationFn: async () => {
      paymentKey.current = paymentKey.current ?? newIdempotencyKey();
      await staffApi.recordPayment(branchId as string, bill!.id, method, Number(amount), paymentKey.current);
      return staffApi.bill(branchId as string, bill!.id);
    },
    onSuccess: (updated) => {
      setBill(updated);
      setAmount(String(updated.due));
      paymentKey.current = null;
      setError('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Payment could not be recorded.'),
  });

  if (branches.isPending || served.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;
  if (!hasPermission('payments.collect') && !hasPermission('billing.generate')) {
    return <Screen><EmptyState title="Not available for your account" /></Screen>;
  }

  return (
    <Screen>
      {bill ? (
        <View style={{ padding: 16, gap: 10, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700' }}>Bill {bill.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={{ color: colors.text }}>Total ₹{Number(bill.total).toFixed(2)} · Paid ₹{Number(bill.paid).toFixed(2)} · Due ₹{Number(bill.due).toFixed(2)}</Text>
          {bill.status === 'PAID' ? (
            <Text style={{ color: colors.gold, fontWeight: '700' }}>Settled</Text>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {METHODS.map((m) => (
                  <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: m === method }} onPress={() => setMethod(m)} style={{ flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: m === method ? colors.gold : colors.border }}>
                    <Text style={{ color: m === method ? colors.gold : colors.text }}>{m}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Amount"
                value={amount}
                onChangeText={(v) => { paymentKey.current = null; setAmount(v.replace(/[^\d.]/g, '')); }}
                keyboardType="decimal-pad"
                style={{ color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 }}
              />
              <Pressable
                accessibilityRole="button"
                disabled={pay.isPending || !hasPermission('payments.collect')}
                onPress={() => { setError(''); pay.mutate(); }}
                style={{ minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, opacity: pay.isPending ? 0.5 : 1 }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '700' }}>Record {method} payment</Text>
              </Pressable>
            </>
          )}
          <ErrorText message={error} />
        </View>
      ) : null}
      <Text style={{ color: colors.textMuted, padding: 16, paddingBottom: 4 }}>Served orders waiting for a bill</Text>
      <FlatList
        data={served.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={<EmptyState title="Nothing waiting for payment" />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>#{item.id.slice(0, 8).toUpperCase()} · ₹{Number(item.total).toFixed(2)}</Text>
            {hasPermission('billing.generate') ? (
              <Pressable accessibilityRole="button" onPress={() => { setError(''); createBill.mutate(item.id); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.gold, fontWeight: '700' }}>Create bill</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
