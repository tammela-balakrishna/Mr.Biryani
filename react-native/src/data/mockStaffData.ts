import type { Bill, DiningTable, Order, Reservation } from '../api/contracts';

export const DEFAULT_TABLES: DiningTable[] = [
  { id: '11111111-1111-4111-a111-111111111101', label: 'T-01 Window', capacity: 2, status: 'OCCUPIED', waiter: 'Kiran' },
  { id: '11111111-1111-4111-a111-111111111102', label: 'T-02 Central', capacity: 4, status: 'AVAILABLE' },
  { id: '11111111-1111-4111-a111-111111111103', label: 'T-03 Garden', capacity: 4, status: 'OCCUPIED', waiter: 'Kiran' },
  { id: '11111111-1111-4111-a111-111111111104', label: 'T-04 Royal Majlis', capacity: 6, status: 'RESERVED' },
  { id: '11111111-1111-4111-a111-111111111105', label: 'T-05 Central', capacity: 4, status: 'AVAILABLE' },
  { id: '11111111-1111-4111-a111-111111111106', label: 'T-06 Window', capacity: 2, status: 'CLEANING' },
  { id: '11111111-1111-4111-a111-111111111107', label: 'T-07 Family Feast', capacity: 8, status: 'AVAILABLE' },
  { id: '11111111-1111-4111-a111-111111111108', label: 'T-08 Patio', capacity: 4, status: 'AVAILABLE' },
  { id: '11111111-1111-4111-a111-111111111109', label: 'FB-1 VIP Booth', capacity: 6, status: 'OCCUPIED', waiter: 'Kiran' },
  { id: '11111111-1111-4111-a111-111111111110', label: 'FB-2 VIP Booth', capacity: 6, status: 'AVAILABLE' },
];

export const DEFAULT_ORDERS: Order[] = [
  {
    id: '33333333-3333-4333-a333-333333333301',
    branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
    status: 'READY',
    tableId: null,
    tableLabel: null,
    subtotal: 680,
    taxTotal: 34,
    total: 714,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    items: [
      { menuItemId: '6b780b50-7a8e-80b3-94d2-fec1e5563d17', name: 'Hyderabadi Dum Biryani', unitPrice: 170, quantity: 2, lineSubtotal: 340, lineTax: 17 },
      { menuItemId: '88d525d0-1bac-1195-692e-6c3c017e4801', name: 'Andhra Chicken Fry', unitPrice: 180, quantity: 2, lineSubtotal: 360, lineTax: 18 },
    ],
  },
  {
    id: '33333333-3333-4333-a333-333333333302',
    branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
    status: 'SERVED',
    subtotal: 640,
    taxTotal: 32,
    total: 672,
    tableId: '11111111-1111-4111-a111-111111111103',
    tableLabel: 'T-03 Garden',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
    items: [
      { menuItemId: '1e0cc9fe-76e6-2ff9-9c3d-b2e7ef0e37ef', name: 'Mutton Biryani', unitPrice: 240, quantity: 1, lineSubtotal: 240, lineTax: 12 },
      { menuItemId: '6f2fa89b-c15b-c2d4-423b-108709977154', name: 'Mr.Biryani Special', unitPrice: 200, quantity: 2, lineSubtotal: 400, lineTax: 20 },
    ],
  },
];

export const DEFAULT_BILLS: Bill[] = [
  {
    id: '764ca67d-e0b5-4b1f-a2b3-919e1b8d1e7e',
    orderId: '695e60d4-3e7d-4c10-bb1f-6f4d01b4877f',
    branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
    subtotal: 310,
    taxTotal: 15.5,
    total: 325.5,
    paid: 0,
    due: 325.5,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_RESERVATIONS: Reservation[] = [
  {
    id: '22222222-2222-4222-a222-222222222201',
    branchId: '86841c23-a243-4282-bb0d-65415b68ae36',
    guestName: 'Balakrishna (VIP Guest)',
    partySize: 4,
    startsAt: new Date(Date.now() + 4 * 3600000).toISOString(),
    status: 'CONFIRMED',
    tableId: '11111111-1111-4111-a111-111111111104',
    tableLabel: 'T-04 Royal Majlis',
    notes: 'Family dining - prefer Royal Andhra flavours',
  },
];
