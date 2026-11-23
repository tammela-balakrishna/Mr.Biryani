import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DietaryBadge, OutlineButton, PrimaryButton, Screen, SectionHeader } from '../../components/ui';
import { LogoBadge } from '../../components/Logo';
import { useCart } from '../../features/cart/CartProvider';
import { useMenu } from '../../features/data/queries';
import { colors } from '../../theme/colors';
import { DEFAULT_MENU } from '../../data/menuData';
import { DISH_IMAGES, getDishImage } from '../../data/dishImages';

const specialties = [
  { id: '6b780b50-7a8e-80b3-94d2-fec1e5563d17', name: 'Hyderabadi Dum Biryani', tag: 'Chef Signature', price: 170, image: DISH_IMAGES.dum },
  { id: '646199df-094b-00d4-3d60-c34603d75e3f', name: 'Fry-Piece Chicken Biryani', tag: 'Spicy Andhra', price: 180, image: DISH_IMAGES.fry },
  { id: '6f2fa89b-c15b-c2d4-423b-108709977154', name: 'Mr. Biryani Special', tag: 'Royal Feast', price: 200, image: DISH_IMAGES.special },
  { id: '1e0cc9fe-76e6-2ff9-9c3d-b2e7ef0e37ef', name: 'Mutton Ghee Biryani', tag: 'Slow Dum', price: 240, image: DISH_IMAGES.mutton },
];

const highlights = [
  { icon: 'flame-outline', title: 'Authentic Andhra Taste & Heirloom Spices' },
  { icon: 'people-outline', title: 'Generous Portions for Family & Friends' },
  { icon: 'shield-checkmark-outline', title: 'Great Value for Money & Fresh Quality' },
  { icon: 'sparkles-outline', title: 'Warm & Friendly Casual Dining Ambience' },
];

const promises = [
  { icon: 'restaurant-outline', title: 'Authentic Taste', desc: 'Slow-cooked traditional recipes using freshly ground Andhra spices.' },
  { icon: 'ribbon-outline', title: 'Quality Food', desc: 'Fresh ingredients, premium aged basmati rice, and tender meat.' },
  { icon: 'star-outline', title: '5,000+ Ratings', desc: 'Loved by foodies across BTM, HSR, Hosur Road & Marathahalli.' },
];

export default function HomeScreen() {
  const router = useRouter();
  const cart = useCart();
  const menuQuery = useMenu();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = useMemo(() => {
    if (menuQuery.data?.categories && menuQuery.data.categories.length > 0) {
      return menuQuery.data.categories;
    }
    return DEFAULT_MENU;
  }, [menuQuery.data]);

  const allItems = useMemo(() => {
    const list: Array<{ id: string; name: string; price: number; description?: string; categoryName: string; isVeg: boolean }> = [];
    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          description: item.description ?? undefined,
          categoryName: cat.name,
          isVeg: /paneer|veg|gobi|mushroom/i.test(item.name),
        });
      });
    });
    return list;
  }, [categories]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory = activeCategory === 'ALL' || item.categoryName === activeCategory;
      const matchesSearch = !search.trim() || item.name.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allItems, activeCategory, search]);

  const cartTotalQty = useMemo(() => cart.lines.reduce((acc, l) => acc + l.quantity, 0), [cart.lines]);
  const cartTotalPrice = useMemo(() => cart.lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0), [cart.lines]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: cartTotalQty > 0 ? 100 : 36 }} showsVerticalScrollIndicator={false}>
        {/* Luxury Hero Banner */}
        <View style={{ backgroundColor: '#13110E', borderBottomWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' }}>
          <Image
            source={{ uri: DISH_IMAGES.hero }}
            style={{ width: '100%', height: 180, opacity: 0.35 }}
            resizeMode="cover"
          />
          <View style={{ padding: 20, marginTop: -140 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(212, 166, 58, 0.18)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(212, 166, 58, 0.35)',
                marginBottom: 10,
              }}
            >
              <LogoBadge detail="simple" size={18} />
              <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2 }}>
                EST. 2020 · BENGALURU
              </Text>
            </View>

            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 34 }}>
              A Royal Andhra <Text style={{ color: colors.gold }}>Feast</Text>
            </Text>

            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 320 }}>
              Authentic heirloom recipes slow dum-cooked with fragrant aged basmati rice and hand-ground spices.
            </Text>

            {/* Hero Quick Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title="Explore Menu"
                  onPress={() => router.push('/menu')}
                  icon={<Ionicons name="restaurant" size={16} color={colors.onGold} />}
                />
              </View>
              <View style={{ flex: 1 }}>
                <OutlineButton
                  title="Book Table"
                  onPress={() => router.push('/reservations')}
                  icon={<Ionicons name="calendar-outline" size={16} color={colors.gold} />}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Highlights Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}
        >
          {highlights.map((h, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              <Ionicons name={h.icon as any} size={14} color={colors.gold} />
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{h.title}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Chef's Royal Signatures (Horizontal Scroll Cards) */}
        <View style={{ marginTop: 8, paddingHorizontal: 16 }}>
          <SectionHeader
            kicker="AUTHENTIC SIGNATURES"
            title="Royal Specialties"
            actionLabel="View All"
            onAction={() => router.push('/menu')}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 14, paddingBottom: 6 }}
        >
          {specialties.map((item) => {
            const inCart = cart.lines.find((l) => l.menuItemId === item.id);
            const inCartQty = inCart?.quantity ?? 0;

            return (
              <View
                key={item.id}
                style={{
                  width: 220,
                  backgroundColor: colors.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  overflow: 'hidden',
                }}
              >
                <View style={{ height: 130, width: '100%', position: 'relative' }}>
                  <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  <View
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.gold,
                    }}
                  >
                    <Text style={{ color: colors.gold, fontSize: 10, fontWeight: '800' }}>{item.tag}</Text>
                  </View>
                </View>

                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.goldBright, fontSize: 16, fontWeight: '800' }}>
                      ₹{item.price}
                    </Text>

                    {inCartQty > 0 ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: 'rgba(212, 166, 58, 0.15)',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.gold,
                          paddingHorizontal: 4,
                          paddingVertical: 2,
                          gap: 6,
                        }}
                      >
                        <Pressable onPress={() => cart.change(item.id, -1)} style={{ paddingHorizontal: 6 }}>
                          <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 14 }}>-</Text>
                        </Pressable>
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{inCartQty}</Text>
                        <Pressable onPress={() => cart.change(item.id, 1)} style={{ paddingHorizontal: 6 }}>
                          <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 14 }}>+</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => cart.add({ menuItemId: item.id, name: item.name, unitPrice: item.price })}
                        style={{
                          backgroundColor: colors.gold,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: colors.onGold, fontSize: 11, fontWeight: '800' }}>+ ADD</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Interactive Dish Explorer */}
        <View style={{ marginTop: 26, paddingHorizontal: 16 }}>
          <SectionHeader kicker="EXPLORE OUR DISHES" title="Interactive Menu" />

          {/* Search bar with icon */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              marginBottom: 14,
              height: 48,
            }}
          >
            <Ionicons name="search" size={18} color={colors.gold} style={{ marginRight: 8 }} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search biryani, starters, roasts…"
              placeholderTextColor="#737373"
              style={{ flex: 1, color: colors.text, fontSize: 14 }}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Category Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            <Pressable
              onPress={() => setActiveCategory('ALL')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: activeCategory === 'ALL' ? colors.gold : colors.surface,
                borderWidth: 1,
                borderColor: activeCategory === 'ALL' ? colors.gold : colors.cardBorder,
              }}
            >
              <Text style={{ color: activeCategory === 'ALL' ? colors.onGold : colors.text, fontWeight: '700', fontSize: 13 }}>
                All Dishes
              </Text>
            </Pressable>
            {categories.map((c) => {
              const active = activeCategory === c.name;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setActiveCategory(c.name)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? colors.gold : colors.surface,
                    borderWidth: 1,
                    borderColor: active ? colors.gold : colors.cardBorder,
                  }}
                >
                  <Text style={{ color: active ? colors.onGold : colors.text, fontWeight: '700', fontSize: 13 }}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Restaurant Dishes List */}
          <View style={{ gap: 12 }}>
            {filteredItems.slice(0, 10).map((item) => {
              const inCart = cart.lines.find((l) => l.menuItemId === item.id);
              const inCartQty = inCart?.quantity ?? 0;
              const imgUrl = getDishImage(item.name, item.categoryName);

              return (
                <View
                  key={item.id}
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
                  {/* Left Column (Details) */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <DietaryBadge isVeg={item.isVeg} />
                      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                        {item.categoryName}
                      </Text>
                    </View>

                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }}>
                      {item.name}
                    </Text>

                    <Text style={{ color: colors.goldBright, fontSize: 15, fontWeight: '800' }}>
                      ₹{item.price}
                    </Text>

                    {item.description ? (
                      <Text style={{ color: colors.textMuted, fontSize: 11, lineHeight: 16 }} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Right Column (Image + Add Stepper) */}
                  <View style={{ width: 104, alignItems: 'center' }}>
                    <Image
                      source={{ uri: imgUrl }}
                      style={{ width: 104, height: 86, borderRadius: 12 }}
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
                          <Pressable onPress={() => cart.change(item.id, -1)} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 15 }}>-</Text>
                          </Pressable>
                          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{inCartQty}</Text>
                          <Pressable onPress={() => cart.change(item.id, 1)} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ color: colors.gold, fontWeight: '800', fontSize: 15 }}>+</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => cart.add({ menuItemId: item.id, name: item.name, unitPrice: item.price })}
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
            })}
          </View>
        </View>

        {/* The Royal Promise */}
        <View style={{ marginTop: 32, paddingHorizontal: 16 }}>
          <SectionHeader kicker="OUR ROYAL PROMISE" title="The Andhra Tradition" />
          <View style={{ gap: 12 }}>
            {promises.map((p, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(212, 166, 58, 0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={p.icon as any} size={22} color={colors.gold} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{p.title}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>{p.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {cartTotalQty > 0 ? (
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
              {cartTotalQty} {cartTotalQty === 1 ? 'item' : 'items'} in feast cart
            </Text>
            <Text style={{ color: colors.goldBright, fontSize: 19, fontWeight: '900' }}>
              ₹{cartTotalPrice.toFixed(2)}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/cart')}
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
