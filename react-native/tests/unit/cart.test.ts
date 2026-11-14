import { addItem, cartCount, changeQuantity, estimatedSubtotal, MAX_LINE_QUANTITY, toOrderItems } from '../../src/features/cart/cart';

const biryani = { menuItemId: 'b1', name: 'Chicken Dum Biryani', unitPrice: 220 };
const starter = { menuItemId: 's1', name: 'Gobi 65', unitPrice: 120.5 };

describe('cart', () => {
  it('adds a new line with quantity 1 and increments an existing line', () => {
    let lines = addItem([], biryani);
    lines = addItem(lines, biryani);
    expect(lines).toEqual([{ ...biryani, quantity: 2 }]);
  });

  it('never exceeds the per-line limit', () => {
    let lines = addItem([], biryani);
    for (let i = 0; i < 100; i++) lines = addItem(lines, biryani);
    expect(lines[0].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it('removes a line when its quantity reaches zero and never goes negative', () => {
    let lines = addItem([], biryani);
    lines = changeQuantity(lines, 'b1', -5);
    expect(lines).toEqual([]);
  });

  it('computes a display subtotal and count', () => {
    let lines = addItem([], biryani);
    lines = addItem(lines, biryani);
    lines = addItem(lines, starter);
    expect(cartCount(lines)).toBe(3);
    expect(estimatedSubtotal(lines)).toBe(560.5);
  });

  it('sends only item ids and quantities to the server', () => {
    const lines = addItem([], biryani);
    expect(toOrderItems(lines)).toEqual([{ menuItemId: 'b1', quantity: 1 }]);
  });
});
