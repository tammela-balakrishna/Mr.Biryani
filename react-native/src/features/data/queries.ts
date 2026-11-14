import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { branchApi, menuApi, orderApi } from '../../api/endpoints';

// Query keys live in one place so invalidation rules stay consistent (menu, orders, branches).
export const queryKeys = {
  menu: ['menu'] as const,
  branches: ['branches'] as const,
  myOrders: ['orders', 'mine'] as const,
};

export const useMenu = () => useQuery({ queryKey: queryKeys.menu, queryFn: menuApi.get, staleTime: 5 * 60_000 });

export const useBranches = () => useQuery({ queryKey: queryKeys.branches, queryFn: branchApi.list, staleTime: 15 * 60_000 });

export const useMyOrders = () => useQuery({ queryKey: queryKeys.myOrders, queryFn: orderApi.mine });

/** Placing an order refreshes the customer's order list. The idempotency key is passed by the caller. */
export const usePlaceOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { branchId: string; items: { menuItemId: string; quantity: number }[]; idempotencyKey: string }) =>
      orderApi.place({ branchId: args.branchId, items: args.items }, args.idempotencyKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myOrders }),
  });
};
