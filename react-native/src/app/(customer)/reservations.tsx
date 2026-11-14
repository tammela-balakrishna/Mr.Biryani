import { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../api/client';
import { reservationApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Field, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { toInstant, validateReservation } from '../../features/reservations/rules';
import { colors } from '../../theme/colors';

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  CANCELLED: 'Cancelled',
};

const reservationsKey = ['reservations', 'mine'] as const;

export default function ReservationsScreen() {
  const queryClient = useQueryClient();
  const branches = useBranches();
  const mine = useQuery({ queryKey: reservationsKey, queryFn: reservationApi.mine });
  const [form, setForm] = useState({ date: '', time: '19:00', partySize: '2', notes: '' });
  const [error, setError] = useState('');

  const create = useMutation({
    mutationFn: (args: { branchId: string; startsAt: string; partySize: number; notes?: string }) =>
      reservationApi.create(args.branchId, { startsAt: args.startsAt, partySize: args.partySize, notes: args.notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsKey }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => reservationApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsKey }),
  });

  const submit = async () => {
    setError('');
    const branchId = branches.data?.[0]?.id;
    if (!branchId) {
      setError('No branch is open for reservations right now.');
      return;
    }
    const partySize = Number(form.partySize);
    const problem = validateReservation({ date: form.date, time: form.time, partySize });
    if (problem) {
      setError(problem);
      return;
    }
    const at = toInstant(form.date, form.time);
    if (!at) {
      setError('Choose a valid date and time');
      return;
    }
    try {
      await create.mutateAsync({ branchId, startsAt: at.toISOString(), partySize, notes: form.notes || undefined });
      setForm({ ...form, notes: '' });
      Alert.alert('Request received', 'The restaurant will confirm your table. Its status is shown below.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the request. Please try again.');
    }
  };

  if (mine.isPending || branches.isPending) return <Loading />;

  return (
    <Screen>
      <FlatList
        data={mine.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 14 }}>
            <Text style={{ color: colors.gold, fontSize: 22, fontWeight: '700' }}>Reserve a table</Text>
            <Field label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="2026-12-01" autoCapitalize="none" />
            <Field label="Time (HH:MM, 24-hour)" value={form.time} onChangeText={(v) => setForm({ ...form, time: v })} placeholder="19:00" />
            <Field label="Guests (1-20)" value={form.partySize} onChangeText={(v) => setForm({ ...form, partySize: v.replace(/\D/g, '') })} keyboardType="number-pad" />
            <Field label="Special requests (optional)" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline maxLength={500} />
            <ErrorText message={error} />
            <PrimaryButton title={create.isPending ? 'Sending…' : 'Request reservation'} onPress={submit} disabled={create.isPending} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 }}>My reservations</Text>
            {mine.isError ? <ErrorText message="Could not load your reservations." /> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title="No reservations yet" />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{new Date(item.startsAt).toLocaleString()}</Text>
            <Text style={{ color: colors.textMuted }}>{item.partySize} guests · {STATUS_LABEL[item.status] ?? item.status}</Text>
            {item.status === 'REQUESTED' || item.status === 'CONFIRMED' ? (
              <Pressable accessibilityRole="button" onPress={() => cancel.mutate(item.id)} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.danger }}>Cancel reservation</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
