import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { addItem, changeQuantity, type CartLine } from './cart';

// The cart is held in memory. It is intentionally not persisted in this release: the backend is the source of
// truth for orders, and a stale local cart would show prices the server may no longer use.

type CartValue = {
  lines: CartLine[];
  add: (item: Omit<CartLine, 'quantity'>) => void;
  change: (menuItemId: string, delta: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const value = useMemo<CartValue>(() => ({
    lines,
    add: (item) => setLines((current) => addItem(current, item)),
    change: (menuItemId, delta) => setLines((current) => changeQuantity(current, menuItemId, delta)),
    clear: () => setLines([]),
  }), [lines]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
