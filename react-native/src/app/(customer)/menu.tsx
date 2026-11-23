import { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DietaryBadge, EmptyState, Screen } from '../../components/ui';
import { useCart } from '../../features/cart/CartProvider';
import { useMenu } from '../../features/data/queries';
import { colors } from '../../theme/colors';
import { DEFAULT_MENU, type MenuCategoryData, type MenuItemData } from '../../data/menuData';
import { getDishImage } from '../../data/dishImages';

export default function MenuScreen() {
  const menuQuery = useMenu();
  const cart = useCart();
  const router = useRouter();
  const { tableId, branchId } = useLocalSearchParams<{ tableId?: string; branchId?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const categories: MenuCategoryData[] = useMemo(() => {
    if (menuQuery.data?.categories && menuQuery.data.categories.length > 0) {
      return menuQuery.data.categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: c.items.map((i) => ({
          id: i.id,
          categoryId: i.categoryId,
          name: i.name,
          price: Number(i.price),
          description: i.description ?? undefined,
          available: i.available ?? true,
        })),
      }));
    }
    return DEFAULT_MENU;
  }, [menuQuery.data]);

  const activeId = selected ?? categories[0]?.id ?? null;

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === activeId) ?? categories[0],
    [categories, activeId]
  );

  const items = useMemo(() => {
    const raw: MenuItemData[] = currentCategory?.items ?? [];
    if (!search.trim()) return raw;
    return raw.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  }, [currentCategory, search]);

  const totalCount = useMemo(() => cart.lines.reduce((s, x) => s + x.quantity, 0), [cart.lines]);
  const totalAmount = useMemo(() => cart.lines.reduce((s, x) => s + x.unitPrice * x.quantity, 0), [cart.lines]);

  return (
    <Screen>
      {/* Table Ticket Banner for Staff */}
      {tableId ? (
        <View
          style={{
            backgroundColor: 'rgba(212, 166, 58, 0.15)',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderColor: colors.cardBorder,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="restaurant" size={15} color={colors.gold} />
            <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 13 }}>
              Dine-In Table #{tableId.slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/cart?tableId=${tableId}&branchId=${branchId ?? ''}`)}
          >
            <Text style={{ color: colors.text, fontWeight: '700', textDecorationLine: 'underline', fontSize: 12 }}>
              View Ticket ({totalCount}) →
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Search Input Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            height: 48,
          }}
        >
          <Ionicons name="search" size={18} color={colors.gold} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search within ${currentCategory?.name ?? 'menu'}…`}
            placeholderTextColor="#737373"
            style={{ flex: 1, color: colors.text, fontSize: 14 }}
          />
          {search ? (
            <Pressable accessibilityRole="button" onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Horizontal Navigation Chips */}
      <View style={{ borderBottomWidth: 1, borderColor: colors.cardBorder, paddingBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const active = item.id === activeId;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelected(item.id);
                  setSearch('');
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 20,
                  backgroundColor: active ? colors.gold : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.gold : colors.cardBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.onGold : colors.text,
                    fontWeight: active ? '800' : '600',
                    fontSize: 13,
                  }}
                >
                  {item.name}
                </Text>
                <View
                  style={{
                    backgroundColor: active ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: active ? colors.onGold : colors.textMuted,
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  >
                    {item.items.length}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Dish Catalog */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: totalCount > 0 ? 100 : 36,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No dishes found"
            body={search ? `No items matched "${search}" in this category.` : 'This category is currently empty.'}
            icon={<Ionicons name="search-outline" size={36} color={colors.textMuted} />}
          />
        }
        renderItem={({ item }) => {
          const inCartLine = cart.lines.find((l) => l.menuItemId === item.id);
          const inCartQty = inCartLine?.quantity ?? 0;
          const isVeg = /paneer|veg|gobi|mushroom/i.test(item.name);
          const imgUrl = getDishImage(item.name, currentCategory?.name);

          return (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
              }}
            >
              {/* Left Side: Dish Details */}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <DietaryBadge isVeg={isVeg} />
                  {item.name.toLowerCase().includes('special') ? (
                    <View
                      style={{
                        backgroundColor: 'rgba(212, 166, 58, 0.15)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800' }}>BESTSELLER</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }}>
                  {item.name}
                </Text>

                <Text style={{ color: colors.goldBright, fontSize: 15, fontWeight: '800' }}>
                  ₹{Number(item.price).toFixed(0)}
                </Text>

                {item.description ? (
                  <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 16 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>

              {/* Right Side: Dish Image + Add/Stepper CTA */}
              <View style={{ width: 106, alignItems: 'center' }}>
                <Image
                  source={{ uri: imgUrl }}
                  style={{ width: 106, height: 88, borderRadius: 12 }}
                  resizeMode="cover"
                />

                <View style={{ marginTop: -16 }}>
                  {inCartQty > 0 ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.surfaceAlt,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.gold,
                        paddingHorizontal: 4,
                        paddingVertical: 2,
                        gap: 8,
                        elevation: 4,
                      }}
                    >
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => cart.change(item.id, -1)}
                        style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                      >
                        <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 15 }}>-</Text>
                      </Pressable>
                      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{inCartQty}</Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => cart.change(item.id, 1)}
                        style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                      >
                        <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 15 }}>+</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        cart.add({ menuItemId: item.id, name: item.name, unitPrice: Number(item.price) })
                      }
                      style={{
                        backgroundColor: colors.gold,
                        borderRadius: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        elevation: 4,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                      }}
                    >
                      <Text style={{ color: colors.onGold, fontWeight: '800', fontSize: 12 }}>+ ADD</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#16130E',
            borderTopWidth: 1,
            borderColor: colors.gold,
            paddingHorizontal: 18,
            paddingVertical: 12,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          }}
        >
          <View>
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
              {totalCount} {totalCount === 1 ? 'item' : 'items'} in feast cart
            </Text>
            <Text style={{ color: colors.goldBright, fontSize: 19, fontWeight: '900' }}>
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/cart?tableId=${tableId ?? ''}&branchId=${branchId ?? ''}`)}
            style={{
              backgroundColor: colors.gold,
              borderRadius: 12,
              paddingHorizontal: 20,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Text style={{ color: colors.onGold, fontWeight: '800', fontSize: 14 }}>View Feast</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.onGold} />
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}
