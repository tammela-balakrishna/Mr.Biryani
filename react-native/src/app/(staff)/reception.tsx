import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { approvalsApi } from '../../api/approvals';
import { operationsApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Field, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  CANCELLED: 'Cancelled',
};

const todayIso = () => new Date().toISOString().slice(0, 10);

// Receptionist view: today's reservations, walk-in guests seated on arrival, confirm and check-in.
// The server decides every transition; a reservation does not occupy a table until a dining session starts.
export default function ReceptionScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const [date] = useState(todayIso);
  const [walkIn, setWalkIn] = useState({ guestName: '', partySize: '2' });
  const [error, setError] = useState('');
  const day = useQuery({
    queryKey: ['staff', 'reservations', branchId, date],
    queryFn: () => operationsApi.reservationsForDay(branchId as string, date),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff', 'reservations', branchId, date] });
  const act = useMutation({
    mutationFn: (args: { id: string; action: 'confirm' | 'check-in' }) =>
      args.action === 'confirm'
        ? operationsApi.confirmReservation(branchId as string, args.id)
        : operationsApi.checkInReservation(branchId as string, args.id),
    onSuccess: () => { void refresh(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'That change could not be saved.'),
  });
  const seat = useMutation({
    mutationFn: () => approvalsApi.walkIn(branchId as string, {
      guestName: walkIn.guestName.trim(),
      partySize: Number(walkIn.partySize),
    }),
    onSuccess: () => {
      setWalkIn({ guestName: '', partySize: '2' });
      void refresh();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'The walk-in could not be seated.'),
  });

  if (branches.isPending || day.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;
  const walkInInvalid = !walkIn.guestName.trim() || !(Number(walkIn.partySize) >= 1 && Number(walkIn.partySize) <= 20);

  return (
    <Screen>
      <FlatList
        data={day.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 8 }}>
            <ErrorText message={error} />
            {hasPermission('reservations.check_in') ? (
              <View style={{ gap: 10, marginBottom: 10 }}>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '700' }}>Seat a walk-in</Text>
                <Field label="Guest name" value={walkIn.guestName} onChangeText={(v) => setWalkIn({ ...walkIn, guestName: v })} />
                <Field label="Guests (1-20)" value={walkIn.partySize} onChangeText={(v) => setWalkIn({ ...walkIn, partySize: v.replace(/\D/g, '') })} keyboardType="number-pad" />
                <PrimaryButton title={seat.isPending ? 'Seating…' : 'Seat walk-in'} onPress={() => { setError(''); seat.mutate(); }} disabled={walkInInvalid || seat.isPending} />
              </View>
            ) : null}
            <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '700' }}>Reservations for {date}</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No reservations today" />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {item.partySize} guests
            </Text>
            <Text style={{ color: colors.textMuted }}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            {item.notes ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.notes}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {item.status === 'REQUESTED' && hasPermission('reservations.confirm') ? (
                <Pressable accessibilityRole="button" onPress={() => { setError(''); act.mutate({ id: item.id, action: 'confirm' }); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.gold, fontWeight: '700' }}>Confirm</Text>
                </Pressable>
              ) : null}
              {item.status === 'CONFIRMED' && hasPermission('reservations.check_in') ? (
                <Pressable accessibilityRole="button" onPress={() => { setError(''); act.mutate({ id: item.id, action: 'check-in' }); }} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Text style={{ color: colors.gold, fontWeight: '700' }}>Check in</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
