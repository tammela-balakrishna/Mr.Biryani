import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { approvalsApi } from '../../api/approvals';
import { operationsApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Field, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

// Manager view: stock, expense entry, and the approval queues. The server refuses approvals by the requester,
// so a manager who recorded an expense or requested a refund sees the error rather than an approve button working.
export default function ManagerScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const [error, setError] = useState('');
  const [expense, setExpense] = useState({ category: '', amount: '', description: '' });
  const inventory = useQuery({
    queryKey: ['staff', 'inventory', branchId],
    queryFn: () => operationsApi.inventory(branchId as string),
    enabled: !!branchId,
  });
  const expenses = useQuery({
    queryKey: ['staff', 'expenses', branchId],
    queryFn: () => operationsApi.expenses(branchId as string),
    enabled: !!branchId,
  });
  const refunds = useQuery({
    queryKey: ['staff', 'refunds', branchId],
    queryFn: () => approvalsApi.refundsRequested(branchId as string),
    enabled: !!branchId && hasPermission('payments.refund.approve'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'inventory', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'expenses', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'refunds', branchId] });
  };
  const fail = (err: unknown, fallback: string) => setError(err instanceof ApiError ? err.message : fallback);

  const adjust = useMutation({
    mutationFn: (args: { id: string; delta: number }) =>
      operationsApi.adjustStock(branchId as string, args.id, args.delta, 'Manual adjustment from app'),
    onSuccess: refresh,
    onError: (err) => fail(err, 'Stock could not be adjusted.'),
  });

  const addExpense = useMutation({
    mutationFn: () => operationsApi.recordExpense(branchId as string, {
      category: expense.category.trim(),
      amount: Number(expense.amount),
      description: expense.description.trim(),
    }),
    onSuccess: () => {
      setExpense({ category: '', amount: '', description: '' });
      refresh();
    },
    onError: (err) => fail(err, 'The expense could not be saved.'),
  });

  const decideExpense = useMutation({
    mutationFn: (args: { id: string; approve: boolean }) => approvalsApi.decideExpense(branchId as string, args.id, args.approve),
    onSuccess: refresh,
    onError: (err) => fail(err, 'That expense could not be decided.'),
  });

  const decideRefund = useMutation({
    mutationFn: (args: { id: string; approve: boolean }) => approvalsApi.decideRefund(branchId as string, args.id, args.approve),
    onSuccess: refresh,
    onError: (err) => fail(err, 'That refund could not be decided.'),
  });

  if (branches.isPending || inventory.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;

  const expenseInvalid = !expense.category.trim() || !(Number(expense.amount) > 0) || !expense.description.trim();
  const pendingExpenses = (expenses.data ?? []).filter((e) => e.status === 'PENDING');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <ErrorText message={error} />

        {hasPermission('payments.refund.approve') ? (
          <>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700' }}>Refunds awaiting approval</Text>
            {(refunds.data ?? []).length === 0 ? <Text style={{ color: colors.textMuted }}>None waiting.</Text> : null}
            {(refunds.data ?? []).map((r) => (
              <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>₹{Number(r.amount).toFixed(2)} · {r.reason}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable accessibilityRole="button" onPress={() => decideRefund.mutate({ id: r.id, approve: true })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.gold, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => decideRefund.mutate({ id: r.id, approve: false })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.danger }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {hasPermission('expenses.approve') ? (
          <>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700' }}>Expenses awaiting approval</Text>
            {pendingExpenses.length === 0 ? <Text style={{ color: colors.textMuted }}>None waiting.</Text> : null}
            {pendingExpenses.map((e) => (
              <View key={e.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{e.category} · ₹{Number(e.amount).toFixed(2)}</Text>
                <Text style={{ color: colors.textMuted }}>{e.description}</Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <Pressable accessibilityRole="button" onPress={() => decideExpense.mutate({ id: e.id, approve: true })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.gold, fontWeight: '700' }}>Approve</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => decideExpense.mutate({ id: e.id, approve: false })} style={{ minHeight: 44, justifyContent: 'center' }}>
                    <Text style={{ color: colors.danger }}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700' }}>Record an expense</Text>
        <Field label="Category" value={expense.category} onChangeText={(v) => setExpense({ ...expense, category: v })} />
        <Field label="Amount (₹)" value={expense.amount} onChangeText={(v) => setExpense({ ...expense, amount: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" />
        <Field label="Description" value={expense.description} onChangeText={(v) => setExpense({ ...expense, description: v })} />
        <PrimaryButton title={addExpense.isPending ? 'Saving…' : 'Save expense'} onPress={() => { setError(''); addExpense.mutate(); }} disabled={expenseInvalid || addExpense.isPending} />

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 10 }}>Stock</Text>
        {(inventory.data ?? []).map((item) => (
          <View key={item.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: item.lowStock ? colors.danger : colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ color: item.lowStock ? colors.danger : colors.textMuted }}>
              {Number(item.quantity)} {item.unit}{item.lowStock ? ' · low stock' : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} onPress={() => adjust.mutate({ id: item.id, delta: 1 })} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.gold, fontSize: 22 }}>+1</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Use one ${item.name}`} onPress={() => adjust.mutate({ id: item.id, delta: -1 })} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.gold, fontSize: 22 }}>−1</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {inventory.data?.length === 0 ? <EmptyState title="No stock items yet" /> : null}
      </ScrollView>
    </Screen>
  );
}
