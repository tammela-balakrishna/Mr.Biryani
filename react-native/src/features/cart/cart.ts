// Cart as a plain data structure. Only item ids and quantities are sent to the server. The prices shown here
// are display estimates; the backend recalculates prices, tax and availability when the order is placed.

export type CartLine = {
  menuItemId: string;
  name: string;
  /** Display price per unit, as last shown from the menu. */
  unitPrice: number;
  quantity: number;
};

export const MAX_LINE_QUANTITY = 50;

export const addItem = (lines: CartLine[], item: Omit<CartLine, 'quantity'>): CartLine[] => {
  const existing = lines.find((line) => line.menuItemId === item.menuItemId);
  if (!existing) return [...lines, { ...item, quantity: 1 }];
  return lines.map((line) =>
    line.menuItemId === item.menuItemId ? { ...line, quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY) } : line,
  );
};

export const changeQuantity = (lines: CartLine[], menuItemId: string, delta: number): CartLine[] =>
  lines
    .map((line) =>
      line.menuItemId === menuItemId
        ? { ...line, quantity: Math.min(Math.max(line.quantity + delta, 0), MAX_LINE_QUANTITY) }
        : line,
    )
    .filter((line) => line.quantity > 0);

export const cartCount = (lines: CartLine[]): number => lines.reduce((sum, line) => sum + line.quantity, 0);

/** Display-only subtotal before tax. */
export const estimatedSubtotal = (lines: CartLine[]): number =>
  Math.round(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) * 100) / 100;

export const toOrderItems = (lines: CartLine[]) =>
  lines.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity }));
