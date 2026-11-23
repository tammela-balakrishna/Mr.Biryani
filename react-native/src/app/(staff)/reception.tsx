import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/client';
import { approvalsApi } from '../../api/approvals';
import { operationsApi, staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';
import { DEFAULT_RESERVATIONS, DEFAULT_TABLES } from '../../data/mockStaffData';

const STATUS_CONFIG: Record<
  string,
  { label: string; badge: string; text: string; dot: string }
> = {
  REQUESTED: {
    label: 'Needs Confirmation',
    badge: 'rgba(245, 158, 11, 0.15)',
    text: '#F59E0B',
    dot: '#F59E0B',
  },
  CONFIRMED: {
    label: 'Confirmed',
    badge: 'rgba(56, 189, 248, 0.15)',
    text: '#38BDF8',
    dot: '#38BDF8',
  },
  CHECKED_IN: {
    label: 'Seated & Checked In',
    badge: 'rgba(16, 185, 129, 0.15)',
    text: '#34D399',
    dot: '#34D399',
  },
  CANCELLED: {
    label: 'Cancelled',
    badge: 'rgba(115, 115, 115, 0.2)',
    text: '#9CA3AF',
    dot: '#6B7280',
  },
};

const TABLE_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badge: string }
> = {
  AVAILABLE: { label: 'Available', color: '#34D399', badge: 'rgba(16, 185, 129, 0.15)' },
  OCCUPIED: { label: 'Occupied', color: '#E0B246', badge: 'rgba(212, 166, 58, 0.15)' },
  RESERVED: { label: 'Reserved', color: '#C084FC', badge: 'rgba(192, 132, 252, 0.15)' },
  CLEANING: { label: 'Cleaning', color: '#FB7185', badge: 'rgba(244, 63, 94, 0.15)' },
};

const formatTime = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ReceptionScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;

  const [date, setDate] = useState(todayIso());
  const [viewTab, setViewTab] = useState<'SPLIT' | 'RESERVATIONS' | 'TABLES'>('SPLIT');
  const [resFilter, setResFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Quick Walk-in Seating State
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInGuest, setWalkInGuest] = useState('');
  const [walkInGuestsCount, setWalkInGuestsCount] = useState('2');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInSelectedTableId, setWalkInSelectedTableId] = useState<string>('');

  const day = useQuery({
    queryKey: ['staff', 'reservations', branchId, date],
    queryFn: () => operationsApi.reservationsForDay(branchId as string, date),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const tables = useQuery({
    queryKey: ['staff', 'tables', branchId],
    queryFn: () => staffApi.tables(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'reservations', branchId, date] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'tables', branchId] });
  }, [queryClient, branchId, date]);

  const act = useMutation({
    mutationFn: (args: { id: string; action: 'confirm' | 'check-in'; guestName?: string }) =>
      args.action === 'confirm'
        ? operationsApi.confirmReservation(branchId as string, args.id)
        : operationsApi.checkInReservation(branchId as string, args.id),
    onSuccess: (_, vars) => {
      refresh();
      setNotice(
        vars.action === 'confirm'
          ? `Reservation for ${vars.guestName || 'guest'} confirmed.`
          : `Guest ${vars.guestName || 'guest'} checked in and seated.`
      );
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'That change could not be saved.'),
  });

  const unlockTable = useMutation({
    mutationFn: (tableId: string) => staffApi.setTableStatus(branchId as string, tableId, 'AVAILABLE'),
    onSuccess: () => {
      refresh();
      setNotice('Table made available for remaining time.');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not unlock table.'),
  });

  const walkInSeat = useMutation({
    mutationFn: async () => {
      const res = await approvalsApi.walkIn(branchId as string, {
        guestName: walkInGuest.trim() || 'Walk-in Guest',
        partySize: Number(walkInGuestsCount) || 2,
        notes: walkInNotes.trim() || undefined,
      });
      if (walkInSelectedTableId) {
        await staffApi.setTableStatus(branchId as string, walkInSelectedTableId, 'OCCUPIED');
      }
      return res;
    },
    onSuccess: (res) => {
      setShowWalkInModal(false);
      setWalkInGuest('');
      setWalkInGuestsCount('2');
      setWalkInNotes('');
      setWalkInSelectedTableId('');
      refresh();
      setNotice(`Walk-in guest ${res.guestName || 'guest'} seated successfully.`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not seat walk-in guest.'),
  });

  if (branches.isPending || day.isPending || tables.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;

  const rows = day.data ?? [];
  const tableList = tables.data ?? [];

  // Counts
  const pendingCount = rows.filter((r) => r.status === 'REQUESTED').length;
  const confirmedCount = rows.filter((r) => r.status === 'CONFIRMED').length;
  const checkedInCount = rows.filter((r) => r.status === 'CHECKED_IN').length;
  const activeBookingsCount = rows.filter((r) => r.status !== 'CANCELLED').length;
  const availableTables = tableList.filter((t) => t.status === 'AVAILABLE');
  const cleaningTables = tableList.filter((t) => t.status === 'CLEANING');

  // Filtered reservations
  const filteredReservations = rows.filter((r) => {
    if (resFilter !== 'ALL' && r.status !== resFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.guestName?.toLowerCase().includes(q);
      const notesMatch = r.notes?.toLowerCase().includes(q);
      return nameMatch || notesMatch;
    }
    return true;
  });

  const isToday = date === todayIso();
  const isTomorrow = date === tomorrowIso();

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
              FRONT DESK & CONCIERGE
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Reception Desk</Text>
          </View>

          <Pressable
            onPress={() => setShowWalkInModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.gold,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Ionicons name="person-add" size={16} color={colors.onGold} />
            <Text style={{ color: colors.onGold, fontSize: 12, fontWeight: '800' }}>+ Walk-in Guest</Text>
          </Pressable>
        </View>

        <ErrorText message={error} />
        {notice ? (
          <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: colors.success, borderRadius: 10, padding: 10 }}>
            <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>{notice}</Text>
          </View>
        ) : null}

        {/* Top Control Bar: Date Switcher & Refresh */}
        <View
          style={{
            backgroundColor: '#141210',
            borderRadius: 14,
            padding: 10,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDate(todayIso())}
              style={{
                backgroundColor: isToday ? colors.gold : colors.surface,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: isToday ? colors.onGold : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
                Today
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setDate(tomorrowIso())}
              style={{
                backgroundColor: isTomorrow ? colors.gold : colors.surface,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: isTomorrow ? colors.onGold : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
                Tomorrow
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#555"
              style={{
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                fontSize: 12,
                borderWidth: 1,
                borderColor: colors.border,
                width: 100,
                textAlign: 'center',
              }}
            />

            <Pressable
              accessibilityRole="button"
              onPress={refresh}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.gold, fontSize: 14 }}>🔄</Text>
            </Pressable>
          </View>
        </View>

        {/* 5 Reception KPIs Overview */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Bookings</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{activeBookingsCount}</Text>
          </View>

          <View style={{ backgroundColor: pendingCount > 0 ? 'rgba(212, 166, 58, 0.15)' : colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: pendingCount > 0 ? colors.gold : colors.border, minWidth: 110 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>To Confirm</Text>
            <Text style={{ color: pendingCount > 0 ? colors.gold : colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{pendingCount}</Text>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Checked In</Text>
            <Text style={{ color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{checkedInCount}</Text>
          </View>

          <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, minWidth: 110 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Available</Text>
            <Text style={{ color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{availableTables.length}</Text>
          </View>

          <View style={{ backgroundColor: cleaningTables.length > 0 ? 'rgba(239, 68, 68, 0.1)' : colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: cleaningTables.length > 0 ? colors.danger : colors.border, minWidth: 110 }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Cleaning</Text>
            <Text style={{ color: cleaningTables.length > 0 ? colors.danger : colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>{cleaningTables.length}</Text>
          </View>
        </ScrollView>

        {/* View Switcher Pills */}
        <View style={{ flexDirection: 'row', gap: 6, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setViewTab('SPLIT')}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: viewTab === 'SPLIT' ? `${colors.gold}25` : colors.surface,
              borderWidth: 1,
              borderColor: viewTab === 'SPLIT' ? colors.gold : colors.border,
            }}
          >
            <Text style={{ color: viewTab === 'SPLIT' ? colors.gold : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
              Split View
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setViewTab('RESERVATIONS')}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: viewTab === 'RESERVATIONS' ? `${colors.gold}25` : colors.surface,
              borderWidth: 1,
              borderColor: viewTab === 'RESERVATIONS' ? colors.gold : colors.border,
            }}
          >
            <Text style={{ color: viewTab === 'RESERVATIONS' ? colors.gold : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
              Bookings ({rows.length})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setViewTab('TABLES')}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: viewTab === 'TABLES' ? `${colors.gold}25` : colors.surface,
              borderWidth: 1,
              borderColor: viewTab === 'TABLES' ? colors.gold : colors.border,
            }}
          >
            <Text style={{ color: viewTab === 'TABLES' ? colors.gold : colors.textMuted, fontWeight: '700', fontSize: 12 }}>
              Table Board ({tableList.length})
            </Text>
          </Pressable>
        </View>

        {/* SECTION: GUEST RESERVATIONS */}
        {viewTab === 'SPLIT' || viewTab === 'RESERVATIONS' ? (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16 }}>👥</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Guest Reservations</Text>
              </View>

              {/* Search Box */}
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 10,
                  width: 140,
                }}
              >
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search guest..."
                  placeholderTextColor="#666"
                  style={{ color: colors.text, fontSize: 12, paddingVertical: 6 }}
                />
              </View>
            </View>

            {/* Filter Tabs matching Image 1: All, Pending, Confirmed, Seated, Cancelled */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {[
                ['ALL', `All (${rows.length})`],
                ['REQUESTED', `Pending (${pendingCount})`],
                ['CONFIRMED', `Confirmed (${confirmedCount})`],
                ['CHECKED_IN', `Seated (${checkedInCount})`],
                ['CANCELLED', 'Cancelled'],
              ].map(([status, label]) => {
                const isActive = resFilter === status;
                return (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    onPress={() => setResFilter(status)}
                    style={{
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: isActive ? colors.gold : colors.surface,
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
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Reservation Cards List matching Image 1 */}
            {filteredReservations.length === 0 ? (
              <EmptyState title="No matching reservations" />
            ) : (
              <View style={{ gap: 8 }}>
                {filteredReservations.map((r) => {
                  const conf = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.REQUESTED;
                  const isSeated = r.status === 'CHECKED_IN';
                  return (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: '#111010',
                        borderRadius: 14,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {/* Left: Guest Name, Badge & Details */}
                      <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                            {r.guestName || 'Valued Guest'}
                          </Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: conf.badge,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 10,
                            }}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: conf.dot }} />
                            <Text style={{ color: conf.text, fontSize: 11, fontWeight: '700' }}>{conf.label}</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                            🕒 {formatTime(r.startsAt)} • 👥 {r.partySize} guests
                          </Text>
                          {r.tableLabel ? (
                            <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '600' }}>
                              • 🍽️ {r.tableLabel}
                            </Text>
                          ) : null}
                          {r.notes ? (
                            <Text style={{ color: colors.textMuted, fontSize: 12, fontStyle: 'italic' }}>
                              • "{r.notes}"
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Right Action matching Image 1: ✓ Seated in green or action button */}
                      {isSeated ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ color: colors.success, fontSize: 15 }}>✓</Text>
                          <Text style={{ color: colors.success, fontWeight: '700', fontSize: 14 }}>Seated</Text>
                        </View>
                      ) : r.status === 'REQUESTED' && hasPermission('reservations.confirm') ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => act.mutate({ id: r.id, action: 'confirm', guestName: r.guestName ?? undefined })}
                          disabled={act.isPending}
                          style={{
                            backgroundColor: colors.gold,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                          }}
                        >
                          <Text style={{ color: colors.onGold, fontWeight: '700', fontSize: 12 }}>Confirm</Text>
                        </Pressable>
                      ) : r.status === 'CONFIRMED' && hasPermission('reservations.check_in') ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => act.mutate({ id: r.id, action: 'check-in', guestName: r.guestName ?? undefined })}
                          disabled={act.isPending}
                          style={{
                            backgroundColor: '#059669',
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>✓ Check in</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* SECTION: LIVE TABLE BOARD */}
        {viewTab === 'SPLIT' || viewTab === 'TABLES' ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🍽️</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Live Table Board</Text>
            </View>

            <View style={{ gap: 8 }}>
              {tableList.map((t) => {
                const conf = TABLE_STATUS_CONFIG[t.status] ?? TABLE_STATUS_CONFIG.AVAILABLE;
                const isReserved = t.status === 'RESERVED';
                return (
                  <View
                    key={t.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
                        Table {t.label} · {t.capacity} seats
                      </Text>
                      <View style={{ backgroundColor: conf.badge, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ color: conf.color, fontSize: 11, fontWeight: '700' }}>{conf.label}</Text>
                      </View>
                    </View>

                    {/* Upcoming reservation banner with remaining time */}
                    {t.reservation_time ? (
                      <View
                        style={{
                          backgroundColor: 'rgba(212, 166, 58, 0.1)',
                          borderColor: 'rgba(212, 166, 58, 0.3)',
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 8,
                        }}
                      >
                        <Text style={{ color: colors.goldBright, fontSize: 12, fontWeight: '600' }}>
                          🕒 Booking at {formatTime(t.reservation_time)} ({t.reservation_guest || 'Guest'}) · Free for remaining time
                        </Text>
                      </View>
                    ) : null}

                    {/* Override button: Make Available for Remaining Time */}
                    {isReserved ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => unlockTable.mutate(t.id)}
                        disabled={unlockTable.isPending}
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          borderWidth: 1,
                          borderColor: colors.success,
                          borderRadius: 8,
                          paddingVertical: 7,
                          alignItems: 'center',
                          marginTop: 4,
                        }}
                      >
                        <Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>
                          ⚡ Make Available for Remaining Time
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* QUICK WALK-IN GUEST SEATING MODAL */}
      <Modal visible={showWalkInModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#181410', borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.gold }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>+ Seat Walk-In Guest</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Quickly register & seat arriving guests</Text>
              </View>
              <Pressable onPress={() => setShowWalkInModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Guest Name:</Text>
              <TextInput
                value={walkInGuest}
                onChangeText={setWalkInGuest}
                placeholder="e.g. Ramesh Varma"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: '#100E0C',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  fontSize: 14,
                }}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Party Size (Guests):</Text>
              <TextInput
                value={walkInGuestsCount}
                onChangeText={setWalkInGuestsCount}
                keyboardType="numeric"
                style={{
                  backgroundColor: '#100E0C',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  fontSize: 14,
                }}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Special Requests / Notes:</Text>
              <TextInput
                value={walkInNotes}
                onChangeText={setWalkInNotes}
                placeholder="e.g. Window booth, high chair"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: '#100E0C',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  fontSize: 13,
                }}
              />
            </View>

            {/* Available Table Selector */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Assign to Table:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {tableList.map((t) => {
                  const isSelected = walkInSelectedTableId === t.id;
                  const isAvailable = t.status === 'AVAILABLE';
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setWalkInSelectedTableId(isSelected ? '' : t.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: isSelected ? colors.gold : isAvailable ? '#161310' : '#0B0A09',
                        borderWidth: 1,
                        borderColor: isSelected ? colors.gold : isAvailable ? 'rgba(16,185,129,0.3)' : colors.border,
                      }}
                    >
                      <Text style={{ color: isSelected ? colors.onGold : colors.text, fontSize: 12, fontWeight: '700' }}>
                        {t.label}
                      </Text>
                      <Text style={{ color: isSelected ? colors.onGold : isAvailable ? colors.success : colors.textMuted, fontSize: 10 }}>
                        {t.capacity} seats · {t.status}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Pressable
                onPress={() => setShowWalkInModal(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={walkInSeat.isPending || !walkInGuest.trim()}
                onPress={() => walkInSeat.mutate()}
                style={{
                  flex: 1.5,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  opacity: walkInSeat.isPending || !walkInGuest.trim() ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '800' }}>
                  {walkInSeat.isPending ? 'Seating Guest…' : 'Seat & Check In'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
