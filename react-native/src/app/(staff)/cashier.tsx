import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ApiError, newIdempotencyKey } from '../../api/client';
import { orderApi, staffApi } from '../../api/endpoints';
import type { Bill, DiningTable, Order } from '../../api/contracts';
import { EmptyState, ErrorText, Loading, Screen } from '../../components/ui';
import { useBranches, useMenu } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const METHODS = [
  { id: 'CASH', label: '💵 Cash Tender', color: '#34D399' },
  { id: 'UPI', label: '📱 UPI / QR Scan', color: '#38BDF8' },
  { id: 'CARD', label: '💳 Debit / Card', color: '#FBBF24' },
] as const;
type Method = (typeof METHODS)[number]['id'];

// Cashier POS Terminal: Settle bills, collect payments, place walk-ins, and manage floor checks
export default function CashierScreen() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const menu = useMenu();

  const [activeTab, setActiveTab] = useState<'UNBILLED' | 'BILLS'>('UNBILLED');
  const [bill, setBill] = useState<Bill | null>(null);
  const [method, setMethod] = useState<Method>('CASH');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const paymentKey = useRef<string | null>(null);

  // Walk-in Quick POS State
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInType, setWalkInType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [walkInTableId, setWalkInTableId] = useState<string>('');
  const [walkInGuestName, setWalkInGuestName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInSearch, setWalkInSearch] = useState('');
  const [walkInCategory, setWalkInCategory] = useState('ALL');
  const [walkInCart, setWalkInCart] = useState<Record<string, { menuItemId: string; name: string; price: number; quantity: number }>>({});

  // Refund Request State
  const [showRefund, setShowRefund] = useState(false);
  const [refundBill, setRefundBill] = useState<Bill | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Served and placed orders
  const orders = useQuery({
    queryKey: ['staff', 'orders', branchId],
    queryFn: () => staffApi.orders(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  // Bills list
  const bills = useQuery({
    queryKey: ['staff', 'bills', branchId],
    queryFn: () => staffApi.bills(branchId as string),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  // Tables list for Dine-in walk-ins
  const tables = useQuery({
    queryKey: ['staff', 'tables', branchId],
    queryFn: () => staffApi.tables(branchId as string),
    enabled: !!branchId,
  });

  const createBill = useMutation({
    mutationFn: (orderId: string) => staffApi.createBill(branchId as string, orderId),
    onSuccess: (created) => {
      setBill(created);
      setAmount(String(created.due));
      setError('');
      setSuccessNotice(`Bill #${created.id.slice(0, 8).toUpperCase()} generated.`);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'orders', branchId] });
      void queryClient.invalidateQueries({ queryKey: ['staff', 'bills', branchId] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create the bill.'),
  });

  const pay = useMutation({
    mutationFn: async () => {
      paymentKey.current = paymentKey.current ?? newIdempotencyKey();
      await staffApi.recordPayment(branchId as string, bill!.id, method, Number(amount), paymentKey.current);
      return staffApi.bill(branchId as string, bill!.id);
    },
    onSuccess: (updated) => {
      setBill(updated);
      setAmount(String(updated.due));
      paymentKey.current = null;
      setError('');
      setSuccessNotice(`Payment of ₹${Number(amount).toFixed(2)} recorded via ${method}.`);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'orders', branchId] });
      void queryClient.invalidateQueries({ queryKey: ['staff', 'bills', branchId] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Payment could not be recorded.'),
  });

  const requestRefund = useMutation({
    mutationFn: async () => {
      if (!refundBill) return;
      await staffApi.requestRefund(branchId as string, refundBill.id, Number(refundAmount), refundReason.trim());
    },
    onSuccess: () => {
      setShowRefund(false);
      setRefundBill(null);
      setRefundAmount('');
      setRefundReason('');
      setSuccessNotice('Refund request submitted successfully for manager approval.');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not submit refund request.'),
  });

  const placeWalkIn = useMutation({
    mutationFn: async () => {
      const items = Object.values(walkInCart).map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
      }));
      if (items.length === 0) throw new Error('Please select at least one item');
      const idemKey = newIdempotencyKey();

      if (walkInType === 'DINE_IN' && walkInTableId) {
        return staffApi.placeForTable(branchId as string, { tableId: walkInTableId, items }, idemKey);
      } else {
        return orderApi.place({ branchId: branchId as string, items }, idemKey);
      }
    },
    onSuccess: (placedOrder) => {
      setShowWalkIn(false);
      setWalkInCart({});
      setWalkInTableId('');
      setWalkInGuestName('');
      setWalkInPhone('');
      setSuccessNotice(`Walk-in order #${placedOrder.id.slice(0, 8).toUpperCase()} placed successfully!`);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'orders', branchId] });
      void queryClient.invalidateQueries({ queryKey: ['staff', 'bills', branchId] });
      // Automatically generate bill for immediate counter checkout
      void createBill.mutate(placedOrder.id);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : (err as Error).message),
  });

  const menuCategories = menu.data?.categories ?? [];
  const allMenuItems = useMemo(() => {
    return menuCategories.flatMap((cat) =>
      cat.items.map((it) => ({
        ...it,
        categoryName: cat.name,
      }))
    );
  }, [menuCategories]);

  const filteredMenuItems = useMemo(() => {
    return allMenuItems.filter((it) => {
      const matchCat = walkInCategory === 'ALL' || it.categoryName === walkInCategory;
      const matchSearch = !walkInSearch || it.name.toLowerCase().includes(walkInSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allMenuItems, walkInCategory, walkInSearch]);

  const cartItemsArray = Object.values(walkInCart);
  const cartSubtotal = cartItemsArray.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const cartTax = Math.round(cartSubtotal * 0.05 * 100) / 100;
  const cartTotal = cartSubtotal + cartTax;

  const updateWalkInQuantity = (item: { id: string; name: string; price: number }, delta: number) => {
    setWalkInCart((prev) => {
      const cur = prev[item.id];
      const nextQty = (cur ? cur.quantity : 0) + delta;
      if (nextQty <= 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: nextQty,
        },
      };
    });
  };

  const shareReceipt = async (b: Bill) => {
    try {
      const text = `==============================\n   MR. BIRIYANI\n   House of Andhra Flavours\n==============================\nBill: #${b.id.slice(0, 8).toUpperCase()}\nOrder: #${b.orderId.slice(0, 8).toUpperCase()}\nSubtotal: ₹${Number(b.subtotal).toFixed(2)}\nTax (GST): ₹${Number(b.taxTotal).toFixed(2)}\nTotal Amount: ₹${Number(b.total).toFixed(2)}\nAmount Paid: ₹${Number(b.paid).toFixed(2)}\nStatus: ${b.status}\n==============================\nThank you for dining with us!\n==============================`;
      await Share.share({ message: text, title: `Receipt Bill #${b.id.slice(0, 8).toUpperCase()}` });
    } catch {
      // dismissed
    }
  };

  if (branches.isPending || orders.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;

  const canBill = hasPermission('billing.generate') || hasPermission('billing.read');
  const canCollect = hasPermission('payments.collect');

  if (!canBill && !canCollect) {
    return <Screen><EmptyState title="Not available for your account" body="Cashier permissions required." /></Screen>;
  }

  const allOrders = orders.data ?? [];
  const servedOrders = allOrders.filter((o) => o.status === 'SERVED');
  const otherUnbilled = allOrders.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));
  const billList = bills.data ?? [];
  const openBills = billList.filter((b) => b.status === 'OPEN');
  const paidBills = billList.filter((b) => b.status === 'PAID');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
              POINT OF SALE & TILL
            </Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Cashier POS Counter</Text>
          </View>

          <Pressable
            onPress={() => setShowWalkIn(true)}
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
            <Ionicons name="add-circle" size={16} color={colors.onGold} />
            <Text style={{ color: colors.onGold, fontSize: 12, fontWeight: '800' }}>+ Walk-in POS</Text>
          </Pressable>
        </View>

        {/* Status Notices */}
        <ErrorText message={error} />
        {successNotice ? (
          <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: colors.success, borderRadius: 10, padding: 10 }}>
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {successNotice}</Text>
          </View>
        ) : null}

        {/* Active Bill Settlement Drawer */}
        {bill ? (
          <View style={{ backgroundColor: '#181410', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.gold }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>
                  Bill #{bill.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  Order #{bill.orderId.slice(0, 8).toUpperCase()}
                </Text>
              </View>

              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: bill.status === 'PAID' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  borderWidth: 1,
                  borderColor: bill.status === 'PAID' ? colors.success : colors.danger,
                }}
              >
                <Text style={{ color: bill.status === 'PAID' ? colors.success : colors.danger, fontWeight: '800', fontSize: 11 }}>
                  {bill.status === 'PAID' ? '✓ SETTLED' : '⏳ PAYMENT DUE'}
                </Text>
              </View>
            </View>

            {/* Bill Financial Breakdown */}
            <View style={{ backgroundColor: '#100E0C', borderRadius: 10, padding: 12, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Subtotal</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>₹{Number(bill.subtotal).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>GST & Taxes</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>₹{Number(bill.taxTotal).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 6 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Total Bill</Text>
                <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>₹{Number(bill.total).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.success, fontSize: 13 }}>Paid Amount</Text>
                <Text style={{ color: colors.success, fontSize: 13, fontWeight: '700' }}>₹{Number(bill.paid).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '700' }}>Balance Due</Text>
                <Text style={{ color: colors.danger, fontSize: 15, fontWeight: '800' }}>₹{Number(bill.due).toFixed(2)}</Text>
              </View>
            </View>

            {/* Payment Collection Form */}
            {bill.status === 'PAID' ? (
              <View style={{ alignItems: 'center', paddingVertical: 8, gap: 10 }}>
                <Text style={{ color: colors.success, fontSize: 15, fontWeight: '700' }}>
                  ✓ This check has been fully settled!
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Pressable
                    onPress={() => shareReceipt(bill)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: 'rgba(56, 189, 248, 0.18)',
                      borderWidth: 1,
                      borderColor: '#38BDF8',
                    }}
                  >
                    <Ionicons name="receipt-outline" size={14} color="#38BDF8" />
                    <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }}>Share Receipt</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setRefundBill(bill);
                      setRefundAmount(String(bill.paid));
                      setShowRefund(true);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderWidth: 1,
                      borderColor: colors.danger,
                    }}
                  >
                    <Ionicons name="return-down-back-outline" size={14} color={colors.danger} />
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Refund Request</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setBill(null)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>Done & Close</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                  Select Tender:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {METHODS.map((m) => {
                    const isSelected = method === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => setMethod(m.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          alignItems: 'center',
                          backgroundColor: isSelected ? 'rgba(212, 166, 58, 0.18)' : '#100E0C',
                          borderWidth: 1,
                          borderColor: isSelected ? colors.gold : colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? colors.gold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>Amount to Tender (₹):</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(v) => {
                      paymentKey.current = null;
                      setAmount(v.replace(/[^\d.]/g, ''));
                    }}
                    keyboardType="decimal-pad"
                    style={{
                      color: colors.text,
                      backgroundColor: '#100E0C',
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <Pressable
                    disabled={pay.isPending || !canCollect || !(Number(amount) > 0)}
                    onPress={() => {
                      setError('');
                      pay.mutate();
                    }}
                    style={{
                      flex: 2,
                      minHeight: 48,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.gold,
                      opacity: pay.isPending || !(Number(amount) > 0) ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: colors.onGold, fontWeight: '800', fontSize: 14 }}>
                      {pay.isPending ? 'Processing…' : `Collect ₹${amount || '0'} ${method}`}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setBill(null)}
                    style={{
                      flex: 1,
                      minHeight: 48,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {/* Tab Selection: Unbilled Orders vs All Bills */}
        <View style={{ flexDirection: 'row', backgroundColor: '#141210', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border }}>
          <Pressable
            onPress={() => setActiveTab('UNBILLED')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: activeTab === 'UNBILLED' ? colors.gold : 'transparent',
            }}
          >
            <Text style={{ color: activeTab === 'UNBILLED' ? colors.onGold : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
              Unbilled Orders ({servedOrders.length + otherUnbilled.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('BILLS')}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: activeTab === 'BILLS' ? colors.gold : 'transparent',
            }}
          >
            <Text style={{ color: activeTab === 'BILLS' ? colors.onGold : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
              Bills ({openBills.length} Open · {paidBills.length} Paid)
            </Text>
          </Pressable>
        </View>

        {/* Tab 1: Unbilled Orders */}
        {activeTab === 'UNBILLED' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '700' }}>
              🍽️ Food Served (Ready for Bill Generation)
            </Text>

            {servedOrders.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No served orders waiting for bills right now.</Text>
            ) : (
              servedOrders.map((ord) => (
                <View
                  key={ord.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(212, 166, 58, 0.3)',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                      #{ord.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>
                      ₹{Number(ord.total).toFixed(2)}
                    </Text>
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Items: {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                  </Text>

                  {canBill && (() => {
                    const existingBill = billList.find((b) => b.orderId === ord.id);
                    return (
                      <Pressable
                        disabled={createBill.isPending}
                        onPress={() => {
                          setError('');
                          if (existingBill) {
                            setBill(existingBill);
                            setAmount(String(existingBill.due));
                            setSuccessNotice(`Opened Bill #${existingBill.id.slice(0, 8).toUpperCase()}.`);
                          } else {
                            createBill.mutate(ord.id);
                          }
                        }}
                        style={{
                          marginTop: 4,
                          minHeight: 42,
                          borderRadius: 10,
                          backgroundColor: existingBill ? 'rgba(212, 166, 58, 0.2)' : colors.gold,
                          borderWidth: existingBill ? 1 : 0,
                          borderColor: colors.gold,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: existingBill ? colors.gold : colors.onGold, fontWeight: '800', fontSize: 13 }}>
                          {existingBill ? `View & Settle Bill #${existingBill.id.slice(0, 8).toUpperCase()}` : 'Generate Bill & Settle Check'}
                        </Text>
                      </Pressable>
                    );
                  })()}
                </View>
              ))
            )}

            {otherUnbilled.length > 0 && (
              <View style={{ gap: 8, marginTop: 10 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700' }}>
                  ⏳ Active in Kitchen ({otherUnbilled.length} orders)
                </Text>
                {otherUnbilled.map((ord) => (
                  <View
                    key={ord.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                        #{ord.id.slice(0, 8).toUpperCase()}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>Status: {ord.status}</Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '700' }}>
                      ₹{Number(ord.total).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Tab 2: Existing Bills */
          <View style={{ gap: 10 }}>
            {billList.length === 0 ? (
              <EmptyState title="No bills found for this branch" />
            ) : (
              billList.map((b) => {
                const isPaid = b.status === 'PAID';
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => {
                      setBill(b);
                      setAmount(String(b.due));
                    }}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      padding: 14,
                      gap: 6,
                      borderWidth: 1,
                      borderColor: isPaid ? 'rgba(16, 185, 129, 0.25)' : 'rgba(212, 166, 58, 0.3)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
                        Bill #{b.id.slice(0, 8).toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          color: isPaid ? colors.success : colors.gold,
                          fontSize: 11,
                          fontWeight: '800',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(212,166,58,0.15)',
                        }}
                      >
                        {b.status}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        Total: ₹{Number(b.total).toFixed(2)} · Paid: ₹{Number(b.paid).toFixed(2)}
                      </Text>
                      <Text style={{ color: isPaid ? colors.success : colors.danger, fontSize: 13, fontWeight: '700' }}>
                        {isPaid ? 'Settled' : `Due: ₹${Number(b.due).toFixed(2)}`}
                      </Text>
                    </View>

                    {isPaid && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
                        <Pressable
                          onPress={() => shareReceipt(b)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          }}
                        >
                          <Ionicons name="receipt-outline" size={13} color="#38BDF8" />
                          <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>Share Receipt</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            setRefundBill(b);
                            setRefundAmount(String(b.paid));
                            setShowRefund(true);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 6,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          }}
                        >
                          <Ionicons name="return-down-back-outline" size={13} color={colors.danger} />
                          <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Request Refund</Text>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: WALK-IN / TAKEAWAY QUICK POS ORDER */}
      <Modal visible={showWalkIn} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#141210', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '90%', gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>+ Quick POS Walk-in Order</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Punch walk-in table or takeaway orders directly at counter</Text>
              </View>
              <Pressable onPress={() => setShowWalkIn(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Type Switcher: Dine-in vs Takeaway */}
            <View style={{ flexDirection: 'row', backgroundColor: '#0B0A09', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: colors.border }}>
              <Pressable
                onPress={() => setWalkInType('DINE_IN')}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: walkInType === 'DINE_IN' ? colors.gold : 'transparent',
                }}
              >
                <Text style={{ color: walkInType === 'DINE_IN' ? colors.onGold : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                  🍽️ Dine-in Table
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setWalkInType('TAKEAWAY')}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                  backgroundColor: walkInType === 'TAKEAWAY' ? colors.gold : 'transparent',
                }}
              >
                <Text style={{ color: walkInType === 'TAKEAWAY' ? colors.onGold : colors.textMuted, fontSize: 12, fontWeight: '700' }}>
                  🛍️ Parcel / Takeaway
                </Text>
              </Pressable>
            </View>

            {/* Dine-in Table Picker */}
            {walkInType === 'DINE_IN' ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Select Dining Table:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {(tables.data ?? []).map((t) => {
                    const isSelected = walkInTableId === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setWalkInTableId(t.id)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 10,
                          backgroundColor: isSelected ? colors.gold : '#1A1815',
                          borderWidth: 1,
                          borderColor: isSelected ? colors.gold : colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? colors.onGold : colors.text, fontSize: 12, fontWeight: '700' }}>
                          {t.label}
                        </Text>
                        <Text style={{ color: isSelected ? colors.onGold : colors.textMuted, fontSize: 10 }}>
                          {t.capacity} seats · {t.status}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  placeholder="Customer Name (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={walkInGuestName}
                  onChangeText={setWalkInGuestName}
                  style={{
                    flex: 1,
                    backgroundColor: '#0B0A09',
                    borderRadius: 10,
                    padding: 10,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontSize: 13,
                  }}
                />
                <TextInput
                  placeholder="Phone"
                  placeholderTextColor={colors.textMuted}
                  value={walkInPhone}
                  onChangeText={setWalkInPhone}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    backgroundColor: '#0B0A09',
                    borderRadius: 10,
                    padding: 10,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontSize: 13,
                  }}
                />
              </View>
            )}

            {/* Menu Category & Search Filters */}
            <View style={{ gap: 8 }}>
              <TextInput
                placeholder="🔍 Search biryani, starters..."
                placeholderTextColor={colors.textMuted}
                value={walkInSearch}
                onChangeText={setWalkInSearch}
                style={{
                  backgroundColor: '#0B0A09',
                  borderRadius: 10,
                  padding: 10,
                  color: colors.text,
                  borderWidth: 1,
                  borderColor: colors.border,
                  fontSize: 13,
                }}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                <Pressable
                  onPress={() => setWalkInCategory('ALL')}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: walkInCategory === 'ALL' ? colors.gold : '#1A1815',
                  }}
                >
                  <Text style={{ color: walkInCategory === 'ALL' ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>All Dishes</Text>
                </Pressable>
                {menuCategories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => setWalkInCategory(cat.name)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: walkInCategory === cat.name ? colors.gold : '#1A1815',
                    }}
                  >
                    <Text style={{ color: walkInCategory === cat.name ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Menu Items Picker List */}
            <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 6 }}>
              {filteredMenuItems.map((it) => {
                const qty = walkInCart[it.id]?.quantity ?? 0;
                return (
                  <View
                    key={it.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1C1916',
                      borderRadius: 10,
                      padding: 10,
                      borderWidth: 1,
                      borderColor: qty > 0 ? colors.gold : colors.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{it.name}</Text>
                      <Text style={{ color: colors.gold, fontSize: 12, fontWeight: '800' }}>₹{Number(it.price).toFixed(2)}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {qty > 0 && (
                        <Pressable
                          onPress={() => updateWalkInQuantity(it, -1)}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            backgroundColor: '#2A2520',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="remove" size={16} color={colors.gold} />
                        </Pressable>
                      )}

                      {qty > 0 && (
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', minWidth: 18, textAlign: 'center' }}>
                          {qty}
                        </Text>
                      )}

                      <Pressable
                        onPress={() => updateWalkInQuantity(it, 1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: colors.gold,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="add" size={16} color={colors.onGold} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Cart Summary & Punch Order Button */}
            <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Selected: {cartItemsArray.reduce((acc, it) => acc + it.quantity, 0)} items
                </Text>
                <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>
                  Total: ₹{cartTotal.toFixed(2)} (inc. tax)
                </Text>
              </View>

              <Pressable
                disabled={placeWalkIn.isPending || cartItemsArray.length === 0 || (walkInType === 'DINE_IN' && !walkInTableId)}
                onPress={() => placeWalkIn.mutate()}
                style={{
                  minHeight: 46,
                  borderRadius: 12,
                  backgroundColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: placeWalkIn.isPending || cartItemsArray.length === 0 || (walkInType === 'DINE_IN' && !walkInTableId) ? 0.5 : 1,
                }}
              >
                <Text style={{ color: colors.onGold, fontSize: 14, fontWeight: '800' }}>
                  {placeWalkIn.isPending ? 'Placing Order…' : `Punch Order & Open Bill (₹${cartTotal.toFixed(2)})`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CASHIER REFUND REQUEST */}
      <Modal visible={showRefund} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#181410', borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: colors.danger }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.danger, fontSize: 18, fontWeight: '800' }}>Request Payment Refund</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                  Bill #{refundBill?.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <Pressable onPress={() => setShowRefund(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Refund Amount (₹):</Text>
              <TextInput
                value={refundAmount}
                onChangeText={setRefundAmount}
                keyboardType="decimal-pad"
                style={{
                  color: colors.text,
                  backgroundColor: '#100E0C',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 16,
                  fontWeight: '700',
                }}
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Reason for Refund:</Text>
              <TextInput
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder="e.g. Guest changed item, billing correction"
                placeholderTextColor={colors.textMuted}
                style={{
                  color: colors.text,
                  backgroundColor: '#100E0C',
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Pressable
                onPress={() => setShowRefund(false)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={requestRefund.isPending || !refundReason.trim() || !(Number(refundAmount) > 0)}
                onPress={() => requestRefund.mutate()}
                style={{
                  flex: 1.5,
                  minHeight: 44,
                  borderRadius: 10,
                  backgroundColor: colors.danger,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: requestRefund.isPending || !refundReason.trim() || !(Number(refundAmount) > 0) ? 0.6 : 1,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                  {requestRefund.isPending ? 'Submitting…' : 'Submit Refund'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
