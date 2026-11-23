import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchApi, menuApi, orderApi } from '../../api/endpoints';
import { DEFAULT_BRANCHES } from '../../data/branchData';
import { DEFAULT_MENU, type MenuCategoryData } from '../../data/menuData';

// Query keys live in one place so invalidation rules stay consistent (menu, orders, branches).
export const queryKeys = {
  menu: ['menu'] as const,
  branches: ['branches'] as const,
  myOrders: ['orders', 'mine'] as const,
};

export const useMenu = () =>
  useQuery<{ categories: MenuCategoryData[] }>({
    queryKey: queryKeys.menu,
    queryFn: async () => {
      try {
        const res = await menuApi.get();
        if (res?.categories && res.categories.length > 0) {
          return {
            categories: res.categories.map((c) => ({
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
            })),
          };
        }
        return { categories: DEFAULT_MENU };
      } catch {
        return { categories: DEFAULT_MENU };
      }
    },
    staleTime: 5 * 60_000,
    initialData: { categories: DEFAULT_MENU },
  });

export const useBranches = () =>
  useQuery({
    queryKey: queryKeys.branches,
    queryFn: branchApi.list,
    staleTime: 15 * 60_000,
    initialData: DEFAULT_BRANCHES,
  });

export const useMyOrders = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.myOrders,
    queryFn: orderApi.mine,
    enabled,
  });

/** Placing an order refreshes the customer's order list. The idempotency key is passed by the caller. */
export const usePlaceOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { branchId: string; items: { menuItemId: string; quantity: number }[]; idempotencyKey: string }) =>
      orderApi.place({ branchId: args.branchId, items: args.items }, args.idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myOrders }),
  });
};
