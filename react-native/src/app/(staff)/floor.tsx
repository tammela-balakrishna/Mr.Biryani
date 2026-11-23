import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { operationsApi, staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';
import { DEFAULT_ORDERS, DEFAULT_TABLES } from '../../data/mockStaffData';

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

// Floor Dashboard combining Captain Turnaround Supervision and Waiter Station
export default function FloorScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, roles, hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;

  const isCaptain = roles.includes('CAPTAIN') || roles.includes('MANAGER') || roles.includes('ADMIN');
  const [tabFilter, setTabFilter] = useState<'ALL' | 'MINE'>(isCaptain ? 'ALL' : 'MINE');
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null);

  const tables = useQuery({
    queryKey: ['staff', 'tables', branchId],
    queryFn: () => staffApi.tables(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const orders = useQuery({
    queryKey: ['staff', 'orders', branchId],
    queryFn: () => staffApi.orders(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const canAssign = hasPermission('tables.assign') || hasPermission('floor.assign_waiter');
  const waiters = useQuery({
    queryKey: ['staff', 'waiters', branchId],
    queryFn: () => staffApi.waiters(branchId as string),
    enabled: !!branchId && canAssign,
  });

  const setStatus = useMutation({
    mutationFn: (args: { tableId: string; status: string }) =>
      staffApi.setTableStatus(branchId as string, args.tableId, args.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', 'tables', branchId] }),
  });

  const assignWaiter = useMutation({
    mutationFn: (args: { tableId: string; waiterUserId: string }) =>
      operationsApi.assignWaiter(branchId as string, args.tableId, args.waiterUserId),
    onSuccess: () => {
      setAssigningTableId(null);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'tables', branchId] });
    },
  });

  if (branches.isPending || tables.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;

  const tableList = tables.data ?? [];
  const orderList = orders.data ?? [];

  const occupied = tableList.filter((t) => t.status === 'OCCUPIED').length;
  const cleaning = tableList.filter((t) => t.status === 'CLEANING').length;
  const available = tableList.filter((t) => t.status === 'AVAILABLE').length;
  const waitingKitchen = orderList.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;
  const readyToServe = orderList.filter((o) => o.status === 'READY').length;

  const myTables = tableList.filter(
    (t) => (t.waiter_user_id && t.waiter_user_id === user?.id) || (t.waiter && user?.fullName && t.waiter.toLowerCase() === user.fullName.toLowerCase())
  );

  const displayedTables = tabFilter === 'MINE' ? myTables : tableList;
  const canChange = hasPermission('tables.allocate') || hasPermission('tables.release') || hasPermission('floor.supervise');

  return (
    <Screen>
      {tables.isError ? (
        <View style={{ padding: 16 }}>
          <ErrorText message="Could not load tables." />
        </View>
      ) : null}

      <FlatList
        data={displayedTables}
        keyExtractor={(t) => t.id}
        numColumns={2}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 36 }}
        columnWrapperStyle={{ gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
                  FLOOR OPERATIONS
                </Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
                  {tabFilter === 'MINE' ? 'My Assigned Tables' : 'Floor & Turnaround'}
                </Text>
              </View>

              {/* View Switcher: All Tables vs My Tables */}
              <View style={{ flexDirection: 'row', backgroundColor: '#1A1612', borderRadius: 8, padding: 2, borderWidth: 1, borderColor: colors.border }}>
                <Pressable
                  onPress={() => setTabFilter('ALL')}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: tabFilter === 'ALL' ? colors.gold : 'transparent',
                  }}
                >
                  <Text style={{ color: tabFilter === 'ALL' ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    All ({tableList.length})
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setTabFilter('MINE')}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: tabFilter === 'MINE' ? colors.gold : 'transparent',
                  }}
                >
                  <Text style={{ color: tabFilter === 'MINE' ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    Mine ({myTables.length})
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Captain KPIs horizontal scroll matching CaptainDashboard.jsx */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Occupied</Text>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800', marginTop: 2 }}>
                  {occupied} / {tableList.length}
                </Text>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Cleaning</Text>
                <Text style={{ color: colors.danger, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{cleaning}</Text>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Available</Text>
                <Text style={{ color: colors.success, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{available}</Text>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>In Kitchen</Text>
                <Text style={{ color: '#38BDF8', fontSize: 18, fontWeight: '800', marginTop: 2 }}>{waitingKitchen}</Text>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Ready To Serve</Text>
                <Text style={{ color: colors.success, fontSize: 18, fontWeight: '800', marginTop: 2 }}>{readyToServe}</Text>
              </View>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={tabFilter === 'MINE' ? 'No tables assigned to you' : 'No tables set up'}
            body={tabFilter === 'MINE' ? 'Ask the floor captain to assign a table to you.' : undefined}
          />
        }
        renderItem={({ item }) => {
          const isAvail = item.status === 'AVAILABLE';
          const isClean = item.status === 'CLEANING';
          const isOcc = item.status === 'OCCUPIED';
          const isAssigning = assigningTableId === item.id;

          return (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 12,
                gap: 6,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{item.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>{item.capacity} seats</Text>
                </View>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isAvail ? colors.success : isClean ? colors.danger : isOcc ? colors.gold : '#a78bfa',
                  }}
                >
                  {isClean ? '🧹 Clean' : item.status}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, flex: 1 }}>
                  {item.waiter ? `Waiter: ${item.waiter}` : 'No waiter'}
                </Text>
                {canAssign && (
                  <Pressable
                    onPress={() => setAssigningTableId(isAssigning ? null : item.id)}
                    style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(212,166,58,0.15)' }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 9, fontWeight: '700' }}>
                      {isAssigning ? 'Cancel' : 'Assign'}
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Waiter Selection Pop-down for Captain */}
              {isAssigning && waiters.data && waiters.data.length > 0 && (
                <View style={{ backgroundColor: '#1C1814', borderRadius: 8, padding: 6, gap: 4, borderWidth: 1, borderColor: colors.gold }}>
                  <Text style={{ color: colors.gold, fontSize: 9, fontWeight: '700' }}>Select Waiter:</Text>
                  {waiters.data.map((w) => (
                    <Pressable
                      key={w.user_id}
                      onPress={() => assignWaiter.mutate({ tableId: item.id, waiterUserId: w.user_id })}
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 6,
                        borderRadius: 4,
                        backgroundColor: item.waiter_user_id === w.user_id ? colors.gold : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Text style={{ color: item.waiter_user_id === w.user_id ? colors.onGold : colors.text, fontSize: 10, fontWeight: '600' }}>
                        {w.full_name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Upcoming Reservation Timing & Remaining Time Availability */}
              {item.reservation_time ? (
                <View
                  style={{
                    backgroundColor: '#261e05',
                    borderRadius: 6,
                    padding: 5,
                    borderWidth: 1,
                    borderColor: `${colors.gold}30`,
                  }}
                >
                  <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '700' }}>
                    🕒 Booking: {formatTime(item.reservation_time)} ({item.reservation_guest || 'Guest'})
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 1 }}>
                    {isAvail ? '⚡ Free for remaining time' : 'Held for booking'}
                  </Text>
                </View>
              ) : null}

              {/* Captain Floor Status Supervision Grid: Available, Occupied, Cleaning */}
              {canChange ? (
                <View style={{ marginTop: 4, gap: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 8, textTransform: 'uppercase', fontWeight: '700' }}>
                    Status:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {[
                      { id: 'AVAILABLE', label: '✓ Avail', color: colors.success },
                      { id: 'OCCUPIED', label: '🍽️ Occ', color: colors.gold },
                      { id: 'CLEANING', label: '🧹 Clean', color: colors.danger },
                    ].map((s) => {
                      const isActive = item.status === s.id;
                      return (
                        <Pressable
                          key={s.id}
                          disabled={isActive}
                          accessibilityRole="button"
                          accessibilityLabel={`Set ${item.label} to ${s.id}`}
                          onPress={() => setStatus.mutate({ tableId: item.id, status: s.id })}
                          style={{
                            flex: 1,
                            paddingVertical: 5,
                            borderRadius: 6,
                            alignItems: 'center',
                            backgroundColor: isActive ? `${s.color}25` : '#171412',
                            borderWidth: 1,
                            borderColor: isActive ? s.color : 'rgba(255,255,255,0.08)',
                          }}
                        >
                          <Text style={{ color: isActive ? s.color : colors.textMuted, fontSize: 9, fontWeight: '700' }}>
                            {s.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Take Order action button for Waiter / Staff */}
              {hasPermission('orders.create') && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/menu?tableId=${item.id}&branchId=${branchId}`)}
                  style={{
                    marginTop: 4,
                    backgroundColor: 'rgba(212, 166, 58, 0.12)',
                    borderRadius: 6,
                    paddingVertical: 6,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: `${colors.gold}40`,
                  }}
                >
                  <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '700' }}>📝 Take Order</Text>
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}
