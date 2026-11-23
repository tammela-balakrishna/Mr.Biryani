import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useBranchTopic } from '../../features/realtime/useBranchTopic';
import { nextStep, isServedAwaitingPayment } from '../../features/staff/orderFlow';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';
import { DEFAULT_ORDERS } from '../../data/mockStaffData';

// Waiter and kitchen view: live orders in the branch, moved forward one permitted step at a time.
// Note: COMPLETED is NOT a kitchen action. Settle & complete happens upon cashier payment.
export default function StaffOrdersScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'KITCHEN' | 'READY' | 'SERVED'>('ALL');

  const orders = useQuery({
    queryKey: ['staff', 'orders', branchId],
    queryFn: () => staffApi.orders(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const onEvent = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'orders', branchId] });
  }, [queryClient, branchId]);
  useBranchTopic(branchId, 'orders', onEvent);

  const advance = useMutation({
    mutationFn: (args: { orderId: string; to: string }) => staffApi.setOrderStatus(args.orderId, args.to),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', 'orders', branchId] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not update the order.'),
  });

  if (branches.isPending || orders.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;

  const orderList = orders.data ?? [];

  const kitchenCount = orderList.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;
  const readyCount = orderList.filter((o) => o.status === 'READY').length;
  const servedCount = orderList.filter((o) => o.status === 'SERVED').length;

  const filteredOrders = orderList.filter((o) => {
    if (filter === 'KITCHEN') return ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status);
    if (filter === 'READY') return o.status === 'READY';
    if (filter === 'SERVED') return o.status === 'SERVED';
    return true;
  });

  const canUpdate = hasPermission('orders.update');

  return (
    <Screen>
      <FlatList
        data={filteredOrders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={orders.isRefetching}
            onRefresh={() => { void orders.refetch(); }}
            tintColor={colors.gold}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View>
              <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
                ORDER MANAGEMENT & KITCHEN PIPELINE
              </Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Active Kitchen Orders</Text>
            </View>

            {/* Filter pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[
                { id: 'ALL', label: `All Orders (${orderList.length})` },
                { id: 'KITCHEN', label: `Cooking (${kitchenCount})` },
                { id: 'READY', label: `Ready to Serve (${readyCount})` },
                { id: 'SERVED', label: `Served (${servedCount})` },
              ].map((pill) => {
                const isActive = filter === pill.id;
                return (
                  <Pressable
                    key={pill.id}
                    onPress={() => setFilter(pill.id as typeof filter)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isActive ? colors.gold : '#1A1612',
                      borderWidth: 1,
                      borderColor: isActive ? colors.gold : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.onGold : colors.textMuted,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {pill.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <ErrorText message={error} />
          </View>
        }
        ListEmptyComponent={<EmptyState title="No orders in this stage" />}
        renderItem={({ item }) => {
          const step = nextStep(item.status);
          const isServed = isServedAwaitingPayment(item.status);

          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                gap: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
                    #{item.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    Total: ₹{Number(item.total).toFixed(2)}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: isServed
                      ? 'rgba(212, 166, 58, 0.15)'
                      : item.status === 'READY'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(56, 189, 248, 0.15)',
                    borderWidth: 1,
                    borderColor: isServed
                      ? colors.gold
                      : item.status === 'READY'
                      ? colors.success
                      : '#38BDF8',
                  }}
                >
                  <Text
                    style={{
                      color: isServed ? colors.gold : item.status === 'READY' ? colors.success : '#38BDF8',
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#141210', borderRadius: 8, padding: 8, gap: 4 }}>
                {item.items.map((line) => (
                  <Text key={`${line.name}-${line.quantity}`} style={{ color: colors.text, fontSize: 13 }}>
                    <Text style={{ color: colors.gold, fontWeight: '700' }}>{line.quantity}×</Text> {line.name}
                  </Text>
                ))}
              </View>

              {/* Step Advance button for kitchen / waiter */}
              {step && canUpdate ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setError('');
                    advance.mutate({ orderId: item.id, to: step.to });
                  }}
                  style={{
                    marginTop: 4,
                    minHeight: 44,
                    borderRadius: 10,
                    backgroundColor: colors.gold,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: advance.isPending ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: colors.onGold, fontWeight: '800', fontSize: 14 }}>
                    {step.label}
                  </Text>
                </Pressable>
              ) : null}

              {/* Served notification card */}
              {isServed && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(212, 166, 58, 0.1)',
                    borderRadius: 8,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(212, 166, 58, 0.25)',
                  }}
                >
                  <Text style={{ fontSize: 14 }}>🍽️</Text>
                  <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '600', flex: 1 }}>
                    Food Served · Awaiting Bill & Payment (Cashier)
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}
