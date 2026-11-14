import { FlatList, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { operationsApi, staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as const;

// Floor view. The table list comes from the server; a device-local copy is never authoritative.
export default function FloorScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const tables = useQuery({
    queryKey: ['staff', 'tables', branchId],
    queryFn: () => staffApi.tables(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });
  const waiters = useQuery({
    queryKey: ['staff', 'waiters', branchId],
    queryFn: async () => (await operationsApi.branchStaff(branchId as string)).filter((m) => m.role === 'WAITER'),
    enabled: !!branchId && hasPermission('staff.read'),
  });
  const assign = useMutation({
    mutationFn: (args: { tableId: string; waiterUserId: string }) => operationsApi.assignWaiter(branchId as string, args.tableId, args.waiterUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', 'tables', branchId] }),
  });
  const setStatus = useMutation({
    mutationFn: (args: { tableId: string; status: string }) => staffApi.setTableStatus(branchId as string, args.tableId, args.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', 'tables', branchId] }),
  });

  if (branches.isPending || tables.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;
  const canChange = hasPermission('tables.allocate') || hasPermission('tables.release');

  return (
    <Screen>
      {tables.isError ? <View style={{ padding: 16 }}><ErrorText message="Could not load tables." /></View> : null}
      <FlatList
        data={tables.data ?? []}
        keyExtractor={(t) => t.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        columnWrapperStyle={{ gap: 12 }}
        ListEmptyComponent={<EmptyState title="No tables set up" />}
        renderItem={({ item }) => (
          <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{item.label}</Text>
            <Text style={{ color: colors.textMuted }}>{item.capacity} seats · {item.status}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.waiter ? `Waiter: ${item.waiter}` : 'No waiter assigned'}</Text>
            {hasPermission('tables.assign') && (waiters.data?.length ?? 0) > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {waiters.data!.map((w) => (
                  <Pressable key={w.userId} accessibilityRole="button" accessibilityLabel={`Assign ${w.fullName} to ${item.label}`} onPress={() => assign.mutate({ tableId: item.id, waiterUserId: w.userId })} style={{ paddingHorizontal: 8, minHeight: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{w.fullName}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {canChange ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {STATUSES.filter((s) => s !== item.status).map((s) => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${item.label} to ${s}`}
                    onPress={() => setStatus.mutate({ tableId: item.id, status: s })}
                    style={{ paddingHorizontal: 8, minHeight: 36, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 12 }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
