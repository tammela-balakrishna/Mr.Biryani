import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useBranchTopic } from '../../features/realtime/useBranchTopic';
import { nextStep } from '../../features/staff/orderFlow';
import { colors } from '../../theme/colors';

// Waiter and captain view: live orders in the branch, moved forward one permitted step at a time.
// New orders arrive over the realtime socket; polling every 15 seconds is the fallback.
export default function StaffOrdersScreen() {
  const queryClient = useQueryClient();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const [error, setError] = useState('');
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

  return (
    <Screen>
      <FlatList
        data={orders.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => { void orders.refetch(); }} tintColor={colors.gold} />}
        ListHeaderComponent={<ErrorText message={error} />}
        ListEmptyComponent={<EmptyState title="No open orders" />}
        renderItem={({ item }) => {
          const step = nextStep(item.status);
          return (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={{ color: colors.gold }}>{item.status}</Text>
              </View>
              {item.items.map((line) => (
                <Text key={`${line.name}-${line.quantity}`} style={{ color: colors.text }}>{line.quantity} × {line.name}</Text>
              ))}
              {step ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => { setError(''); advance.mutate({ orderId: item.id, to: step.to }); }}
                  style={{ marginTop: 6, minHeight: 44, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: colors.onGold, fontWeight: '700' }}>{step.label}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </Screen>
  );
}
