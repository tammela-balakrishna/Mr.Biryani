import { useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { reservationApi, staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { toInstant, validateReservation } from '../../features/reservations/rules';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const STATUS_CONFIG: Record<string, { label: string; badge: string; color: string; icon: string }> = {
  REQUESTED: { label: 'Requested', badge: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', icon: 'time-outline' },
  CONFIRMED: { label: 'Confirmed', badge: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', icon: 'checkmark-circle-outline' },
  CHECKED_IN: { label: 'Seated & Checked In', badge: 'rgba(16, 185, 129, 0.15)', color: '#10B981', icon: 'restaurant-outline' },
  CANCELLED: { label: 'Cancelled', badge: 'rgba(115, 115, 115, 0.2)', color: '#737373', icon: 'close-circle-outline' },
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const TIME_SLOTS = ['12:30', '13:30', '19:00', '20:00', '21:00'];
const GUEST_OPTIONS = ['2', '4', '6', '8', '12'];

const reservationsKey = ['reservations', 'mine'] as const;

export default function ReservationsScreen() {
  const router = useRouter();
  const { status } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const queryClient = useQueryClient();
  const branches = useBranches();
  const branchList = branches.data ?? [{ id: '86841c23-a243-4282-bb0d-65415b68ae36', name: 'Main Branch', code: 'MAIN' }];
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchList[0]?.id ?? '');
  const activeBranchId = selectedBranchId || branchList[0]?.id;

  const mine = useQuery({
    queryKey: reservationsKey,
    queryFn: reservationApi.mine,
    enabled: isAuthenticated,
  });

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    date: tomorrow,
    time: '19:00',
    guests: '2',
    tableId: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState('');

  const targetInstant = toInstant(form.date, form.time);
  const slotIso = targetInstant ? targetInstant.toISOString() : undefined;

  const tables = useQuery({
    queryKey: ['tables', activeBranchId, slotIso],
    queryFn: () => staffApi.tables(activeBranchId as string, slotIso),
    enabled: !!activeBranchId && !!slotIso,
  });

  const create = useMutation({
    mutationFn: (args: { branchId: string; startsAt: string; partySize: number; notes?: string; tableId?: string }) =>
      reservationApi.create(args.branchId, {
        startsAt: args.startsAt,
        partySize: args.partySize,
        notes: args.notes,
        tableId: args.tableId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationsKey });
      queryClient.invalidateQueries({ queryKey: ['tables', activeBranchId] });
      setSavedSuccess('Your royal table request has been submitted! Our staff will confirm it shortly.');
      setForm({ ...form, tableId: '', notes: '' });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not send the reservation request.');
    },
  });

  const cancel = useMutation({
    mutationFn: (id: string) => reservationApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationsKey });
      Alert.alert('Reservation Cancelled', 'Your booking has been cancelled.');
    },
  });

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Reservation', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep Booking', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => cancel.mutate(id) },
    ]);
  };

  const submit = () => {
    setError('');
    setSavedSuccess('');

    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to reserve a royal dining table.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/login') },
      ]);
      return;
    }

    const partySize = parseInt(form.guests, 10);
    const validationError = validateReservation({
      date: form.date,
      time: form.time,
      partySize,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const instant = toInstant(form.date, form.time);
    if (!instant) {
      setError('Please provide a valid date (YYYY-MM-DD) and time.');
      return;
    }

    create.mutate({
      branchId: activeBranchId as string,
      startsAt: instant.toISOString(),
      partySize,
      notes: form.notes || undefined,
      tableId: form.tableId || undefined,
    });
  };

  const myReservationsList = mine.data ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Royal Dining Banner Card */}
        <View
          style={{
            backgroundColor: '#141210',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="sparkles" size={18} color={colors.gold} />
            <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 2 }}>
              ANDHRA ROYAL HOSPITALITY
            </Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>
            Book a Royal Table
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            Experience traditional slow-cooked feasts with dedicated host service across our Bengaluru dining halls.
          </Text>
        </View>

        {/* Branch Selection */}
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
            <Ionicons name="location" size={16} color={colors.gold} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>Choose Branch</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {branchList.map((b) => {
              const active = activeBranchId === b.id;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => setSelectedBranchId(b.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: active ? 'rgba(212, 166, 58, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    borderWidth: 1,
                    borderColor: active ? colors.gold : colors.cardBorder,
                  }}
                >
                  <Text style={{ color: active ? colors.gold : colors.textSecondary, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                    {b.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Booking Details Form Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            gap: 16,
          }}
        >
          {/* Date & Time */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              Reservation Date & Time
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={form.date}
                  onChangeText={(v) => setForm({ ...form, date: v })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#666"
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                  }}
                />
              </View>

              <View style={{ width: 100 }}>
                <TextInput
                  value={form.time}
                  onChangeText={(v) => setForm({ ...form, time: v })}
                  placeholder="19:00"
                  placeholderTextColor="#666"
                  style={{
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.text,
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                />
              </View>
            </View>

            {/* Quick Time Slots */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 4 }}>
              {TIME_SLOTS.map((t) => {
                const active = form.time === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setForm({ ...form, time: t })}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: active ? colors.gold : 'rgba(255, 255, 255, 0.05)',
                      borderWidth: 1,
                      borderColor: active ? colors.gold : colors.cardBorder,
                    }}
                  >
                    <Text style={{ color: active ? colors.onGold : colors.text, fontWeight: '700', fontSize: 12 }}>
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Number of Guests */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              Number of Guests
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {GUEST_OPTIONS.map((g) => {
                const active = form.guests === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => setForm({ ...form, guests: g })}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: active ? colors.gold : colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: active ? colors.gold : colors.cardBorder,
                    }}
                  >
                    <Text style={{ color: active ? colors.onGold : colors.text, fontWeight: '800', fontSize: 14 }}>
                      {g}
                    </Text>
                    <Text style={{ color: active ? colors.onGold : colors.textMuted, fontSize: 10, fontWeight: '600' }}>
                      {g === '12' ? 'Guests+' : 'Guests'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Special Requests */}
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
              Special Notes / Seating (Optional)
            </Text>
            <TextInput
              value={form.notes}
              onChangeText={(v) => setForm({ ...form, notes: v })}
              placeholder="e.g. Birthday celebration, window table, high chair…"
              placeholderTextColor="#666"
              style={{
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.text,
                fontSize: 13,
              }}
            />
          </View>

          <ErrorText message={error} />
          {savedSuccess ? (
            <View
              style={{
                backgroundColor: 'rgba(52, 211, 153, 0.12)',
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.success,
              }}
            >
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>{savedSuccess}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <PrimaryButton
            title={create.isPending ? 'Submitting Request…' : 'Request Table Reservation'}
            onPress={submit}
            disabled={create.isPending}
            icon={<Ionicons name="calendar" size={17} color={colors.onGold} />}
          />
        </View>

        {/* My Reservations Section */}
        <View style={{ gap: 12, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="time" size={18} color={colors.gold} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>My Reservations</Text>
          </View>

          {!isAuthenticated ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Sign in to View Bookings</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                Your active dining reservations and booking status will appear here once signed in.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/login')}
                style={{
                  backgroundColor: colors.gold,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 10,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '800', fontSize: 13 }}>Sign In</Text>
              </Pressable>
            </View>
          ) : myReservationsList.length === 0 ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No reservations booked yet.</Text>
            </View>
          ) : (
            myReservationsList.map((res: any) => {
              const cfg = STATUS_CONFIG[res.status] ?? STATUS_CONFIG.REQUESTED;
              return (
                <View
                  key={res.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colors.cardBorder,
                    gap: 10,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>
                      {res.partySize} {res.partySize === 1 ? 'Guest' : 'Guests'}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: cfg.badge,
                      }}
                    >
                      <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                      <Text style={{ color: cfg.color, fontWeight: '800', fontSize: 12 }}>{cfg.label}</Text>
                    </View>
                  </View>

                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    📅 {formatDateTime(res.startsAt)}
                  </Text>

                  {res.tableNumber ? (
                    <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '600' }}>
                      Table #{res.tableNumber} assigned
                    </Text>
                  ) : null}

                  {res.status !== 'CANCELLED' && res.status !== 'CHECKED_IN' ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleCancel(res.id)}
                      style={{ alignSelf: 'flex-start', marginTop: 4 }}
                    >
                      <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Cancel Booking</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
