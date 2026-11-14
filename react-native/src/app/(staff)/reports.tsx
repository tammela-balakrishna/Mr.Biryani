import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches } from '../../features/data/queries';
import { colors } from '../../theme/colors';

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// Manager view: sales for the last seven days, from the server's report. Refunds are shown as approved only.
export default function ReportsScreen() {
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  // The range is fixed when the screen mounts, so re-renders never change the query key.
  const [range] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
    return { from: isoDay(from), to: isoDay(to) };
  });
  const report = useQuery({
    queryKey: ['staff', 'sales', branchId, range.from, range.to],
    queryFn: () => staffApi.sales(branchId as string, range.from, range.to),
    enabled: !!branchId,
  });

  if (branches.isPending || report.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;
  if (report.isError) return <Screen><View style={{ padding: 16 }}><ErrorText message="Could not load the report." /></View></Screen>;

  const r = report.data;
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: colors.gold, fontSize: 20, fontWeight: '700' }}>Sales, {r.from} to {r.to}</Text>
        <Text style={{ color: colors.text }}>Paid bills: {r.bills}</Text>
        <Text style={{ color: colors.text }}>Gross: ₹{Number(r.gross).toFixed(2)}</Text>
        <Text style={{ color: colors.text }}>Approved refunds: ₹{Number(r.refunds).toFixed(2)}</Text>
        <Text style={{ color: colors.gold, fontWeight: '700' }}>Net: ₹{Number(r.net).toFixed(2)}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>By tender</Text>
        {Object.entries(r.byMethod).map(([method, amount]) => (
          <Text key={method} style={{ color: colors.text }}>{method}: ₹{Number(amount).toFixed(2)}</Text>
        ))}
      </ScrollView>
    </Screen>
  );
}
