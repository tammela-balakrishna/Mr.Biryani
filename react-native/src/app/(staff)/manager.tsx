import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '../../api/client';
import { approvalsApi } from '../../api/approvals';
import { feedbackApi, floorApi, menuAdminApi, operationsApi, staffApi } from '../../api/endpoints';
import { EmptyState, ErrorText, Field, Loading, PrimaryButton, Screen } from '../../components/ui';
import { useBranches, useMenu } from '../../features/data/queries';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';

const STAFF_ROLES = ['WAITER', 'RECEPTIONIST', 'CAPTAIN', 'CASHIER', 'MANAGER', 'ADMIN'] as const;

// Operations & Branch Management Dashboard matching ManagerDashboard.jsx and AdminDashboard.jsx
export default function ManagerScreen() {
  const queryClient = useQueryClient();
  const { user, roles, hasPermission } = useAuth();
  const branches = useBranches();
  const branchId = branches.data?.[0]?.id;
  const menu = useMenu();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STOCK' | 'TABLES' | 'MENU' | 'SPENDING' | 'TEAM' | 'FEEDBACK'>('OVERVIEW');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Expense form
  const [expense, setExpense] = useState({ category: '', amount: '', description: '' });

  // Add staff form
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'WAITER',
  });

  // Add Table state
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  // Menu Management state
  const [showAddDish, setShowAddDish] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newDish, setNewDish] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: '',
    taxRate: '5.0',
    available: true,
  });
  const [editingPriceItem, setEditingPriceItem] = useState<{ id: string; name: string; price: string } | null>(null);
  const [menuFilterCat, setMenuFilterCat] = useState('ALL');
  const [menuSearch, setMenuSearch] = useState('');

  const inventory = useQuery({
    queryKey: ['staff', 'inventory', branchId],
    queryFn: () => operationsApi.inventory(branchId as string).catch(() => []),
    enabled: !!branchId && hasPermission('inventory.read'),
  });

  const expenses = useQuery({
    queryKey: ['staff', 'expenses', branchId],
    queryFn: () => operationsApi.expenses(branchId as string).catch(() => []),
    enabled: !!branchId && (hasPermission('expenses.read') || hasPermission('expenses.approve')),
  });

  const refunds = useQuery({
    queryKey: ['staff', 'refunds', branchId],
    queryFn: () => approvalsApi.refundsRequested(branchId as string).catch(() => []),
    enabled: !!branchId && hasPermission('payments.refund.approve'),
  });

  const staff = useQuery({
    queryKey: ['staff', 'branchStaff', branchId],
    queryFn: () => operationsApi.branchStaff(branchId as string).catch(() => []),
    enabled: !!branchId && (hasPermission('staff.read') || hasPermission('staff.create') || roles.includes('ADMIN')),
  });

  const tables = useQuery({
    queryKey: ['staff', 'tables', branchId],
    queryFn: () => staffApi.tables(branchId as string).catch(() => []),
    enabled: !!branchId,
  });

  const reviews = useQuery({
    queryKey: ['staff', 'reviews'],
    queryFn: () => feedbackApi.reviews('PENDING').catch(() => []),
    enabled: hasPermission('feedback.read') || hasPermission('feedback.moderate') || roles.includes('ADMIN'),
  });

  const enquiries = useQuery({
    queryKey: ['staff', 'enquiries'],
    queryFn: () => feedbackApi.enquiries().catch(() => []),
    enabled: hasPermission('feedback.read') || hasPermission('feedback.moderate') || roles.includes('ADMIN'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['staff', 'inventory', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'expenses', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'refunds', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'branchStaff', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'tables', branchId] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'reviews'] });
    void queryClient.invalidateQueries({ queryKey: ['staff', 'enquiries'] });
    void queryClient.invalidateQueries({ queryKey: ['menu'] });
  };

  const fail = (err: unknown, fallback: string) => setError(err instanceof ApiError ? err.message : fallback);

  // Table Mutations
  const createTable = useMutation({
    mutationFn: () =>
      floorApi.createTable(branchId as string, {
        label: newTableLabel.trim(),
        capacity: Number(newTableCapacity) || 4,
      }),
    onSuccess: (tbl) => {
      setShowAddTable(false);
      setNewTableLabel('');
      setNewTableCapacity('4');
      refresh();
      setNotice(`Table ${tbl.label} created.`);
    },
    onError: (err) => fail(err, 'Could not create table.'),
  });

  const deleteTable = useMutation({
    mutationFn: (tableId: string) => floorApi.deleteTable(branchId as string, tableId),
    onSuccess: () => {
      refresh();
      setNotice('Table removed.');
    },
    onError: (err) => fail(err, 'Could not delete table.'),
  });

  // Menu Mutations
  const setDishAvailability = useMutation({
    mutationFn: (args: { itemId: string; available: boolean }) =>
      menuAdminApi.setAvailability(args.itemId, args.available),
    onSuccess: () => {
      refresh();
      setNotice('Dish availability updated.');
    },
    onError: (err) => fail(err, 'Could not update dish availability.'),
  });

  const updateDishPrice = useMutation({
    mutationFn: (args: { itemId: string; price: number }) =>
      menuAdminApi.updatePrice(args.itemId, args.price),
    onSuccess: () => {
      setEditingPriceItem(null);
      refresh();
      setNotice('Dish price updated.');
    },
    onError: (err) => fail(err, 'Could not update price.'),
  });

  const addDish = useMutation({
    mutationFn: () =>
      menuAdminApi.addItem({
        categoryId: newDish.categoryId,
        name: newDish.name.trim(),
        description: newDish.description.trim() || undefined,
        price: Number(newDish.price),
        taxRate: Number(newDish.taxRate) || 5.0,
        available: newDish.available,
      }),
    onSuccess: () => {
      setShowAddDish(false);
      setNewDish({ categoryId: '', name: '', description: '', price: '', taxRate: '5.0', available: true });
      refresh();
      setNotice('New dish added to menu.');
    },
    onError: (err) => fail(err, 'Could not add dish to menu.'),
  });

  const addCategory = useMutation({
    mutationFn: () => menuAdminApi.addCategory({ name: newCatName.trim() }),
    onSuccess: () => {
      setShowAddCategory(false);
      setNewCatName('');
      refresh();
      setNotice('New category created.');
    },
    onError: (err) => fail(err, 'Could not create category.'),
  });

  // Feedback Moderation
  const decideReview = useMutation({
    mutationFn: (args: { id: string; approve: boolean }) =>
      feedbackApi.decideReview(args.id, args.approve),
    onSuccess: (_, vars) => {
      refresh();
      setNotice(vars.approve ? 'Review approved for website.' : 'Review rejected.');
    },
    onError: (err) => fail(err, 'Could not update review status.'),
  });

  // Staff Management
  const changeStaffRole = useMutation({
    mutationFn: (args: { userId: string; role: string }) =>
      operationsApi.changeStaffRole(branchId as string, args.userId, args.role),
    onSuccess: () => {
      refresh();
      setNotice('Staff role updated.');
    },
    onError: (err) => fail(err, 'Could not update staff role.'),
  });

  const disableStaff = useMutation({
    mutationFn: (userId: string) => operationsApi.disableStaff(branchId as string, userId),
    onSuccess: () => {
      refresh();
      setNotice('Staff account disabled.');
    },
    onError: (err) => fail(err, 'Could not disable staff member.'),
  });

  const adjust = useMutation({
    mutationFn: (args: { id: string; delta: number }) =>
      operationsApi.adjustStock(branchId as string, args.id, args.delta, 'Stock adjustment from mobile'),
    onSuccess: () => {
      refresh();
      setNotice('Inventory updated.');
    },
    onError: (err) => fail(err, 'Stock could not be adjusted.'),
  });

  const addExpense = useMutation({
    mutationFn: () =>
      operationsApi.recordExpense(branchId as string, {
        category: expense.category.trim(),
        amount: Number(expense.amount),
        description: expense.description.trim(),
      }),
    onSuccess: () => {
      setExpense({ category: '', amount: '', description: '' });
      refresh();
      setNotice('Expense recorded.');
    },
    onError: (err) => fail(err, 'The expense could not be saved.'),
  });

  const decideExpense = useMutation({
    mutationFn: (args: { id: string; approve: boolean }) =>
      approvalsApi.decideExpense(branchId as string, args.id, args.approve),
    onSuccess: (_, vars) => {
      refresh();
      setNotice(vars.approve ? 'Expense approved.' : 'Expense rejected.');
    },
    onError: (err) => fail(err, 'That expense could not be decided.'),
  });

  const decideRefund = useMutation({
    mutationFn: (args: { id: string; approve: boolean }) =>
      approvalsApi.decideRefund(branchId as string, args.id, args.approve),
    onSuccess: (_, vars) => {
      refresh();
      setNotice(vars.approve ? 'Refund approved.' : 'Refund rejected.');
    },
    onError: (err) => fail(err, 'That refund could not be decided.'),
  });

  const createStaffMember = useMutation({
    mutationFn: () => staffApi.createStaff(branchId as string, staffForm),
    onSuccess: () => {
      setShowAddStaff(false);
      setStaffForm({ fullName: '', email: '', phone: '', password: '', role: 'WAITER' });
      refresh();
      setNotice('Staff member created successfully.');
    },
    onError: (err) => fail(err, 'Could not create staff account.'),
  });

  if (branches.isPending) return <Loading />;
  if (!branchId) return <Screen><EmptyState title="No branch available" /></Screen>;

  const inventoryItems = inventory.data ?? [];
  const lowStock = inventoryItems.filter((i) => i.lowStock);
  const expenseItems = expenses.data ?? [];
  const pendingExpenses = expenseItems.filter((e) => e.status === 'PENDING');
  const refundItems = refunds.data ?? [];
  const staffMembers = staff.data ?? [];
  const tableList = tables.data ?? [];
  const reviewList = reviews.data ?? [];
  const enquiryList = enquiries.data ?? [];
  const menuCategories = menu.data?.categories ?? [];

  // Attention items
  const attentionItems = [
    ...(hasPermission('expenses.read') || hasPermission('expenses.approve')
      ? pendingExpenses.length > 0
        ? [{ id: 'SPENDING' as const, label: 'EXPENSES WAITING', count: pendingExpenses.length, color: colors.gold }]
        : []
      : []),
    ...(hasPermission('payments.refund.approve')
      ? refundItems.length > 0
        ? [{ id: 'SPENDING' as const, label: 'REFUNDS WAITING', count: refundItems.length, color: colors.danger }]
        : []
      : []),
    ...(hasPermission('inventory.read')
      ? lowStock.length > 0
        ? [{ id: 'STOCK' as const, label: 'LOW STOCK ITEMS', count: lowStock.length, color: '#F59E0B' }]
        : []
      : []),
    ...(hasPermission('feedback.moderate') || roles.includes('ADMIN')
      ? reviewList.length > 0
        ? [{ id: 'FEEDBACK' as const, label: 'REVIEWS TO MODERATE', count: reviewList.length, color: '#38BDF8' }]
        : []
      : []),
  ];

  const staffByRole = staffMembers.reduce((acc: Record<string, number>, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {});

  // Dynamically filter tabs based on permissions, matching website ManagerDashboard.jsx
  const availableTabs: { id: 'OVERVIEW' | 'STOCK' | 'TABLES' | 'MENU' | 'SPENDING' | 'TEAM' | 'FEEDBACK'; label: string }[] = [
    { id: 'OVERVIEW', label: 'Overview' },
    ...(hasPermission('inventory.read') || hasPermission('inventory.update') || hasPermission('inventory.adjust')
      ? [{ id: 'STOCK' as const, label: `Stock (${inventoryItems.length})` }]
      : []),
    ...(hasPermission('tables.read') || hasPermission('tables.allocate') || hasPermission('tables.assign') || roles.includes('ADMIN')
      ? [{ id: 'TABLES' as const, label: `Tables (${tableList.length})` }]
      : []),
    ...(hasPermission('menu.read') || hasPermission('menu.update') || hasPermission('menu.create') || roles.includes('ADMIN')
      ? [{ id: 'MENU' as const, label: 'Menu Catalog' }]
      : []),
    ...(hasPermission('expenses.read') || hasPermission('expenses.approve') || hasPermission('payments.refund.approve')
      ? [{ id: 'SPENDING' as const, label: 'Spending' }]
      : []),
    ...(hasPermission('staff.read') || hasPermission('staff.create') || roles.includes('ADMIN')
      ? [{ id: 'TEAM' as const, label: `Team (${staffMembers.length})` }]
      : []),
    ...(hasPermission('feedback.read') || hasPermission('feedback.moderate') || roles.includes('ADMIN')
      ? [{ id: 'FEEDBACK' as const, label: `Feedback (${reviewList.length})` }]
      : []),
  ];

  const currentTab = availableTabs.some((t) => t.id === activeTab) ? activeTab : 'OVERVIEW';

  const allDishes = useMemo(() => {
    return menuCategories.flatMap((cat) => cat.items.map((it) => ({ ...it, categoryName: cat.name, catId: cat.id })));
  }, [menuCategories]);

  const filteredDishes = useMemo(() => {
    return allDishes.filter((it) => {
      const matchCat = menuFilterCat === 'ALL' || it.categoryName === menuFilterCat;
      const matchSearch = !menuSearch || it.name.toLowerCase().includes(menuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allDishes, menuFilterCat, menuSearch]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ gap: 2 }}>
          <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
            OPERATIONS & ADMINISTRATION
          </Text>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
            {roles.includes('ADMIN') ? 'Admin Operations' : 'Manager Dashboard'}
          </Text>
        </View>

        <ErrorText message={error} />
        {notice ? (
          <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: colors.success, borderRadius: 10, padding: 10 }}>
            <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>✓ {notice}</Text>
          </View>
        ) : null}

        {/* Attention Summary Cards matching web ManagerDashboard.jsx */}
        {attentionItems.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>
              NEEDS ATTENTION ({attentionItems.reduce((sum, a) => sum + a.count, 0)})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {attentionItems.map((a, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setActiveTab(a.id as typeof activeTab)}
                  style={{
                    backgroundColor: '#1E140C',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: a.color,
                    minWidth: 140,
                  }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>{a.label}</Text>
                  <Text style={{ color: a.color, fontSize: 22, fontWeight: '800', marginTop: 2 }}>
                    {a.count}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Section Navigation Tabs (Horizontal Scrollable for Full Permitted Modules) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {availableTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: isActive ? colors.gold : '#141210',
                  borderWidth: 1,
                  borderColor: isActive ? colors.gold : colors.border,
                }}
              >
                <Text style={{ color: isActive ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* TAB 1: OVERVIEW */}
        {currentTab === 'OVERVIEW' && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>Staff Distribution</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(staffByRole).map(([r, count]) => (
                  <View key={r} style={{ backgroundColor: '#161310', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>{r}</Text>
                    <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>{count}</Text>
                  </View>
                ))}
                {Object.keys(staffByRole).length === 0 && (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>No staff registered yet.</Text>
                )}
              </View>
            </View>

            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>Operational Overview</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>• Active items tracked in inventory: {inventoryItems.length}</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>• Low-stock alerts: {lowStock.length}</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>• Recorded expenses: {expenseItems.length}</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>• Total staff registered: {staffMembers.length}</Text>
            </View>
          </View>
        )}

        {/* TAB 2: STOCK & INVENTORY */}
        {currentTab === 'STOCK' && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>Branch Inventory & Stock</Text>
            {inventoryItems.length === 0 ? (
              <EmptyState title="No stock items yet" />
            ) : (
              inventoryItems.map((item) => (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: item.lowStock ? colors.danger : colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                    {item.lowStock && (
                      <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: colors.danger, fontSize: 10, fontWeight: '800' }}>⚠️ LOW STOCK</Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ color: item.lowStock ? colors.danger : colors.textMuted, fontSize: 13 }}>
                    Current: {Number(item.quantity)} {item.unit} (Reorder level: {Number(item.reorderLevel)})
                  </Text>

                  {/* Quick Adjust Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Pressable
                      onPress={() => adjust.mutate({ id: item.id, delta: 1 })}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: 'rgba(212, 166, 58, 0.15)',
                        borderWidth: 1,
                        borderColor: colors.gold,
                      }}
                    >
                      <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 13 }}>+1 {item.unit}</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => adjust.mutate({ id: item.id, delta: -1 })}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.15)',
                      }}
                    >
                      <Text style={{ color: colors.textMuted, fontWeight: '800', fontSize: 13 }}>−1 {item.unit}</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB: TABLES & SEATING CRUD */}
        {currentTab === 'TABLES' && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>
                Floor Tables & Seating ({tableList.length})
              </Text>
              {(hasPermission('tables.allocate') || roles.includes('ADMIN') || roles.includes('MANAGER')) && (
                <Pressable
                  onPress={() => setShowAddTable(true)}
                  style={{
                    backgroundColor: colors.gold,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons name="add" size={16} color={colors.onGold} />
                  <Text style={{ color: colors.onGold, fontSize: 12, fontWeight: '800' }}>Add Table</Text>
                </Pressable>
              )}
            </View>

            {tableList.length === 0 ? (
              <EmptyState title="No dining tables created" />
            ) : (
              tableList.map((t) => (
                <View
                  key={t.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>
                      {t.label} <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '400' }}>· {t.capacity} seats</Text>
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: t.status === 'AVAILABLE' ? 'rgba(16,185,129,0.15)' : 'rgba(212,166,58,0.15)',
                      }}
                    >
                      <Text style={{ color: t.status === 'AVAILABLE' ? colors.success : colors.gold, fontSize: 11, fontWeight: '700' }}>
                        {t.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {t.waiter ? `Assigned Waiter: ${t.waiter}` : 'No waiter assigned'}
                  </Text>

                  {(hasPermission('tables.allocate') || roles.includes('ADMIN')) && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
                      <Pressable
                        onPress={() => deleteTable.mutate(t.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Delete Table</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB: MENU STUDIO & CATALOG */}
        {currentTab === 'MENU' && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>Menu Studio & Catalog</Text>
              {(hasPermission('menu.create') || roles.includes('ADMIN') || roles.includes('MANAGER')) && (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => setShowAddCategory(true)}
                    style={{
                      backgroundColor: 'rgba(212,166,58,0.15)',
                      borderWidth: 1,
                      borderColor: colors.gold,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>+ Category</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (menuCategories[0]) setNewDish((d) => ({ ...d, categoryId: menuCategories[0].id }));
                      setShowAddDish(true);
                    }}
                    style={{
                      backgroundColor: colors.gold,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: colors.onGold, fontSize: 11, fontWeight: '800' }}>+ Add Dish</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Category Filter Pills & Search */}
            <TextInput
              placeholder="🔍 Search delicacies..."
              placeholderTextColor={colors.textMuted}
              value={menuSearch}
              onChangeText={setMenuSearch}
              style={{
                backgroundColor: '#100E0C',
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
                onPress={() => setMenuFilterCat('ALL')}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: menuFilterCat === 'ALL' ? colors.gold : '#161310',
                }}
              >
                <Text style={{ color: menuFilterCat === 'ALL' ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                  All Dishes
                </Text>
              </Pressable>
              {menuCategories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setMenuFilterCat(cat.name)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                    backgroundColor: menuFilterCat === cat.name ? colors.gold : '#161310',
                  }}
                >
                  <Text style={{ color: menuFilterCat === cat.name ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Dish Cards */}
            {filteredDishes.map((it) => {
              const isAvailable = it.available !== false;
              return (
                <View
                  key={it.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: isAvailable ? colors.border : 'rgba(239,68,68,0.3)',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>{it.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{it.categoryName}</Text>
                    </View>
                    <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '800' }}>
                      ₹{Number(it.price).toFixed(2)}
                    </Text>
                  </View>

                  {it.description ? (
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{it.description}</Text>
                  ) : null}

                  {(hasPermission('menu.update') || roles.includes('ADMIN')) && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 8 }}>
                      <Pressable
                        onPress={() => setDishAvailability.mutate({ itemId: it.id, available: !isAvailable })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: isAvailable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        <Text style={{ color: isAvailable ? colors.success : colors.danger, fontSize: 11, fontWeight: '700' }}>
                          {isAvailable ? '✓ In Stock' : '❌ Sold Out'}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setEditingPriceItem({ id: it.id, name: it.name, price: String(it.price) })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: 'rgba(212, 166, 58, 0.15)',
                        }}
                      >
                        <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '700' }}>Edit Price</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 3: SPENDING & REFUNDS */}
        {currentTab === 'SPENDING' && (
          <View style={{ gap: 14 }}>
            {/* Refund Approvals */}
            {hasPermission('payments.refund.approve') && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>
                  Refunds Awaiting Approval ({refundItems.length})
                </Text>
                {refundItems.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>No refunds pending approval.</Text>
                ) : (
                  refundItems.map((r) => (
                    <View key={r.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.danger }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>₹{Number(r.amount).toFixed(2)}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Reason: {r.reason}</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                        <Pressable onPress={() => decideRefund.mutate({ id: r.id, approve: true })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.gold }}>
                          <Text style={{ color: colors.onGold, fontWeight: '700', fontSize: 12 }}>Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => decideRefund.mutate({ id: r.id, approve: false })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.2)' }}>
                          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 12 }}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Expense Approvals */}
            {hasPermission('expenses.approve') && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>
                  Expenses Awaiting Approval ({pendingExpenses.length})
                </Text>
                {pendingExpenses.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>No expenses waiting for approval.</Text>
                ) : (
                  pendingExpenses.map((e) => (
                    <View key={e.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{e.category} · ₹{Number(e.amount).toFixed(2)}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{e.description}</Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                        <Pressable onPress={() => decideExpense.mutate({ id: e.id, approve: true })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.gold }}>
                          <Text style={{ color: colors.onGold, fontWeight: '700', fontSize: 12 }}>Approve</Text>
                        </Pressable>
                        <Pressable onPress={() => decideExpense.mutate({ id: e.id, approve: false })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(239,68,68,0.2)' }}>
                          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 12 }}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Record New Expense Form */}
            {hasPermission('expenses.create') && (
              <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>Record New Expense</Text>
                <Field label="Category" value={expense.category} onChangeText={(v) => setExpense({ ...expense, category: v })} />
                <Field label="Amount (₹)" value={expense.amount} onChangeText={(v) => setExpense({ ...expense, amount: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" />
                <Field label="Description" value={expense.description} onChangeText={(v) => setExpense({ ...expense, description: v })} />
                <PrimaryButton
                  title={addExpense.isPending ? 'Saving…' : 'Record Expense'}
                  onPress={() => { setError(''); addExpense.mutate(); }}
                  disabled={!expense.category.trim() || !(Number(expense.amount) > 0) || addExpense.isPending}
                />
              </View>
            )}
          </View>
        )}

        {/* TAB 4: TEAM & ADD STAFF */}
        {currentTab === 'TEAM' && (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>
                Branch Team ({staffMembers.length})
              </Text>
              {(hasPermission('staff.create') || roles.includes('ADMIN')) && (
                <Pressable
                  onPress={() => setShowAddStaff(!showAddStaff)}
                  style={{
                    backgroundColor: colors.gold,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ color: colors.onGold, fontSize: 12, fontWeight: '800' }}>
                    {showAddStaff ? 'Cancel' : '+ Add Staff'}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Add Staff Form Matching AdminDashboard.jsx */}
            {showAddStaff && (
              <View style={{ backgroundColor: '#1A1612', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.gold }}>
                <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '800' }}>New Staff Member</Text>
                <Field label="Full Name" value={staffForm.fullName} onChangeText={(v) => setStaffForm({ ...staffForm, fullName: v })} />
                <Field label="Email Address" value={staffForm.email} onChangeText={(v) => setStaffForm({ ...staffForm, email: v })} keyboardType="email-address" />
                <Field label="Mobile Number" value={staffForm.phone} onChangeText={(v) => setStaffForm({ ...staffForm, phone: v })} keyboardType="phone-pad" />
                <Field label="Password (min 10 chars)" value={staffForm.password} onChangeText={(v) => setStaffForm({ ...staffForm, password: v })} secureTextEntry />

                <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                  Assign Role:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {STAFF_ROLES.map((r) => {
                    const isSelected = staffForm.role === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setStaffForm({ ...staffForm, role: r })}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isSelected ? colors.gold : '#100E0C',
                          borderWidth: 1,
                          borderColor: isSelected ? colors.gold : colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <PrimaryButton
                  title={createStaffMember.isPending ? 'Creating Account…' : 'Create Staff Account'}
                  onPress={() => {
                    setError('');
                    createStaffMember.mutate();
                  }}
                  disabled={
                    !staffForm.fullName.trim() ||
                    !staffForm.email.trim() ||
                    staffForm.password.length < 10 ||
                    createStaffMember.isPending
                  }
                />
              </View>
            )}

            {/* Staff Roster */}
            {staffMembers.length === 0 ? (
              <EmptyState title="No staff members registered" />
            ) : (
              staffMembers.map((s) => (
                <View
                  key={s.userId}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 12,
                    gap: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{s.fullName}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{s.email || 'No email'}</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(212, 166, 58, 0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(212, 166, 58, 0.3)' }}>
                      <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '800' }}>{s.role}</Text>
                    </View>
                  </View>

                  {/* Role Change & Disable Controls */}
                  {(roles.includes('ADMIN') || roles.includes('MANAGER')) && (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', borderTopWidth: 1, borderColor: colors.border, paddingTop: 6 }}>
                      {STAFF_ROLES.filter((r) => r !== s.role).map((r) => (
                        <Pressable
                          key={r}
                          onPress={() => changeStaffRole.mutate({ userId: s.userId, role: r })}
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 3,
                            borderRadius: 4,
                            backgroundColor: '#161310',
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '600' }}>→ {r}</Text>
                        </Pressable>
                      ))}

                      <Pressable
                        onPress={() => disableStaff.mutate(s.userId)}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 4,
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          marginLeft: 'auto',
                        }}
                      >
                        <Text style={{ color: colors.danger, fontSize: 10, fontWeight: '700' }}>Disable</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: FEEDBACK & REVIEW MODERATION */}
        {currentTab === 'FEEDBACK' && (
          <View style={{ gap: 14 }}>
            <Text style={{ color: colors.gold, fontSize: 15, fontWeight: '800' }}>
              Pending Customer Reviews ({reviewList.length})
            </Text>

            {reviewList.length === 0 ? (
              <EmptyState title="No reviews waiting for moderation" />
            ) : (
              reviewList.map((r) => (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    padding: 14,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '800' }}>
                      {r.name} · {'⭐'.repeat(r.rating || 5)}
                    </Text>
                    <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#38BDF8', fontSize: 10, fontWeight: '700' }}>{r.category}</Text>
                    </View>
                  </View>

                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>{r.comment}</Text>

                  {(hasPermission('feedback.moderate') || roles.includes('ADMIN')) && (
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <Pressable
                        onPress={() => decideReview.mutate({ id: r.id, approve: true })}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: colors.gold,
                        }}
                      >
                        <Text style={{ color: colors.onGold, fontSize: 11, fontWeight: '700' }}>Publish to Site</Text>
                      </Pressable>

                      <Pressable
                        onPress={() => decideReview.mutate({ id: r.id, approve: false })}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: 'rgba(239,68,68,0.2)',
                        }}
                      >
                        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>Reject</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Enquiries Section */}
            {enquiryList.length > 0 && (
              <View style={{ gap: 8, marginTop: 10 }}>
                <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '800' }}>
                  Customer Enquiries ({enquiryList.length})
                </Text>
                {enquiryList.map((eq) => (
                  <View key={eq.id} style={{ backgroundColor: colors.surface, borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{eq.name} ({eq.email})</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{eq.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAL: ADD TABLE */}
      <Modal visible={showAddTable} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#181410', borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.gold }}>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>+ Add Physical Dining Table</Text>
            <Field label="Table Label (e.g. T-09 Window, FB-3 VIP)" value={newTableLabel} onChangeText={setNewTableLabel} />
            <Field label="Seating Capacity" value={newTableCapacity} onChangeText={setNewTableCapacity} keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowAddTable(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!newTableLabel.trim() || createTable.isPending}
                onPress={() => createTable.mutate()}
                style={{ flex: 1.5, padding: 12, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center' }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '800' }}>
                  {createTable.isPending ? 'Saving…' : 'Create Table'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD DISH */}
      <Modal visible={showAddDish} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#181410', borderRadius: 20, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.gold }}>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>+ Add New Menu Item</Text>
            <Field label="Dish Name" value={newDish.name} onChangeText={(v) => setNewDish({ ...newDish, name: v })} />
            <Field label="Price (₹)" value={newDish.price} onChangeText={(v) => setNewDish({ ...newDish, price: v.replace(/[^\d.]/g, '') })} keyboardType="decimal-pad" />
            <Field label="Description" value={newDish.description} onChangeText={(v) => setNewDish({ ...newDish, description: v })} />

            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700' }}>Select Category:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {menuCategories.map((cat) => {
                const isSelected = newDish.categoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setNewDish({ ...newDish, categoryId: cat.id })}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: isSelected ? colors.gold : '#100E0C',
                      borderWidth: 1,
                      borderColor: isSelected ? colors.gold : colors.border,
                    }}
                  >
                    <Text style={{ color: isSelected ? colors.onGold : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Pressable
                onPress={() => setShowAddDish(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!newDish.name.trim() || !(Number(newDish.price) > 0) || !newDish.categoryId || addDish.isPending}
                onPress={() => addDish.mutate()}
                style={{ flex: 1.5, padding: 12, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center' }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '800' }}>
                  {addDish.isPending ? 'Adding…' : 'Add Dish'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD CATEGORY */}
      <Modal visible={showAddCategory} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#181410', borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.gold }}>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>+ Add Menu Category</Text>
            <Field label="Category Name (e.g. Starters, Tandoor, Desserts)" value={newCatName} onChangeText={setNewCatName} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowAddCategory(false)}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!newCatName.trim() || addCategory.isPending}
                onPress={() => addCategory.mutate()}
                style={{ flex: 1.5, padding: 12, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center' }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '800' }}>
                  {addCategory.isPending ? 'Saving…' : 'Create Category'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: EDIT PRICE */}
      <Modal visible={!!editingPriceItem} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#181410', borderRadius: 20, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.gold }}>
            <Text style={{ color: colors.gold, fontSize: 18, fontWeight: '800' }}>Update Dish Price</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{editingPriceItem?.name}</Text>
            <Field
              label="New Price (₹)"
              value={editingPriceItem?.price ?? ''}
              onChangeText={(v) => setEditingPriceItem((cur) => (cur ? { ...cur, price: v.replace(/[^\d.]/g, '') } : null))}
              keyboardType="decimal-pad"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={() => setEditingPriceItem(null)}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!(Number(editingPriceItem?.price) > 0) || updateDishPrice.isPending}
                onPress={() => {
                  if (editingPriceItem) {
                    updateDishPrice.mutate({ itemId: editingPriceItem.id, price: Number(editingPriceItem.price) });
                  }
                }}
                style={{ flex: 1.5, padding: 12, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center' }}
              >
                <Text style={{ color: colors.onGold, fontWeight: '800' }}>
                  {updateDishPrice.isPending ? 'Saving…' : 'Update Price'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
