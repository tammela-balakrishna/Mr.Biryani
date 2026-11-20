-- Fresh Sample Restaurant Data: Tables, Orders, Bills, Payments, and Table Assignments
BEGIN;

-- 1. Clean existing orders, bills, payments, reservations, and tables
DELETE FROM refunds;
DELETE FROM payments;
DELETE FROM bills;
DELETE FROM order_items;
DELETE FROM order_status_history;
DELETE FROM orders;
DELETE FROM table_assignments;
DELETE FROM reservations;
DELETE FROM dining_tables;

-- Branch & User Constants
-- Branch: 86841c23-a243-4282-bb0d-65415b68ae36
-- Waiter: 59671b9b-e3e7-47b2-993c-6488a73164ea (kiran)
-- Captain: 4293972a-b599-4a77-8e65-3922e7391dd7 (prabhakar)
-- Cashier: cb74c785-5608-46ff-b36e-0e1188e1effb (pavan)
-- Customer: b5f8f751-951e-49b5-9f5c-b1b85acea975 (balakrishna)

-- 2. Insert 10 Authentic Restaurant Dining Tables (Labels <= 20 chars)
INSERT INTO dining_tables (id, branch_id, label, capacity, status, version) VALUES
  ('11111111-1111-4111-a111-111111111101', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-01 Window', 2, 'OCCUPIED', 1),
  ('11111111-1111-4111-a111-111111111102', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-02 Central', 4, 'AVAILABLE', 1),
  ('11111111-1111-4111-a111-111111111103', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-03 Garden', 4, 'OCCUPIED', 1),
  ('11111111-1111-4111-a111-111111111104', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-04 Royal Majlis', 6, 'RESERVED', 1),
  ('11111111-1111-4111-a111-111111111105', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-05 Central', 4, 'AVAILABLE', 1),
  ('11111111-1111-4111-a111-111111111106', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-06 Window', 2, 'CLEANING', 1),
  ('11111111-1111-4111-a111-111111111107', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-07 Family Feast', 8, 'AVAILABLE', 1),
  ('11111111-1111-4111-a111-111111111108', '86841c23-a243-4282-bb0d-65415b68ae36', 'T-08 Patio', 4, 'AVAILABLE', 1),
  ('11111111-1111-4111-a111-111111111109', '86841c23-a243-4282-bb0d-65415b68ae36', 'FB-1 VIP Booth', 6, 'OCCUPIED', 1),
  ('11111111-1111-4111-a111-111111111110', '86841c23-a243-4282-bb0d-65415b68ae36', 'FB-2 VIP Booth', 6, 'AVAILABLE', 1);

-- 3. Assign Waiter Kiran to Occupied & Active Tables
INSERT INTO table_assignments (id, table_id, waiter_user_id, assigned_by, assigned_at, active) VALUES
  (gen_random_uuid(), '11111111-1111-4111-a111-111111111101', '59671b9b-e3e7-47b2-993c-6488a73164ea', '4293972a-b599-4a77-8e65-3922e7391dd7', now() - interval '2 hours', TRUE),
  (gen_random_uuid(), '11111111-1111-4111-a111-111111111103', '59671b9b-e3e7-47b2-993c-6488a73164ea', '4293972a-b599-4a77-8e65-3922e7391dd7', now() - interval '1 hour', TRUE),
  (gen_random_uuid(), '11111111-1111-4111-a111-111111111105', '59671b9b-e3e7-47b2-993c-6488a73164ea', '4293972a-b599-4a77-8e65-3922e7391dd7', now() - interval '3 hours', TRUE),
  (gen_random_uuid(), '11111111-1111-4111-a111-111111111109', '59671b9b-e3e7-47b2-993c-6488a73164ea', '4293972a-b599-4a77-8e65-3922e7391dd7', now() - interval '45 minutes', TRUE);

-- 4. Sample Reservation for Balakrishna (Linked to Table T-04 Royal Majlis)
INSERT INTO reservations (id, branch_id, customer_id, guest_name, party_size, starts_at, status, notes, table_id, created_at, updated_at) VALUES
  ('22222222-2222-4222-a222-222222222201', '86841c23-a243-4282-bb0d-65415b68ae36', 'b5f8f751-951e-49b5-9f5c-b1b85acea975', 'Balakrishna (VIP Guest)', 4, now() + interval '4 hours', 'CONFIRMED', 'Family dining - prefer Royal Andhra flavours', '11111111-1111-4111-a111-111111111104', now() - interval '1 day', now());

-- 5. ORDER 1: UNBILLED WALK-IN TAKEAWAY (Punched by Cashier Pavan, Ready for Bill & Settle)
INSERT INTO orders (id, branch_id, customer_id, table_id, created_by, channel, status, subtotal, tax_total, total, idempotency_key, request_fingerprint, version, created_at, updated_at) VALUES
  ('33333333-3333-4333-a333-333333333301', '86841c23-a243-4282-bb0d-65415b68ae36', NULL, NULL, 'cb74c785-5608-46ff-b36e-0e1188e1effb', 'POS', 'READY', 720.00, 36.00, 756.00, 'pos-walkin-takeaway-01', 'fp-takeaway-01', 1, now() - interval '25 minutes', now());

INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', '6712c4e1-c91e-8112-0aee-92855b206a55', 'Mughlai Chicken Biryani', 550.00, 0.05, 1, 550.00, 27.50),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', '672dbafd-e284-4e07-f54f-ebe294c2abcd', 'Egg Biryani', 130.00, 0.05, 1, 130.00, 6.50);

INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_id, created_at) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', NULL, 'PLACED', 'cb74c785-5608-46ff-b36e-0e1188e1effb', now() - interval '25 minutes'),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'PLACED', 'READY', 'cb74c785-5608-46ff-b36e-0e1188e1effb', now() - interval '5 minutes');

-- 6. ORDER 2: UNBILLED DINE-IN TABLE T-03 (Punched by Waiter Kiran, SERVED, Awaiting Bill by Cashier)
INSERT INTO orders (id, branch_id, customer_id, table_id, created_by, channel, status, subtotal, tax_total, total, idempotency_key, request_fingerprint, version, created_at, updated_at) VALUES
  ('33333333-3333-4333-a333-333333333302', '86841c23-a243-4282-bb0d-65415b68ae36', NULL, '11111111-1111-4111-a111-111111111103', '59671b9b-e3e7-47b2-993c-6488a73164ea', 'POS', 'SERVED', 640.00, 32.00, 672.00, 'pos-table-t03-01', 'fp-table-t03-01', 1, now() - interval '40 minutes', now());

INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', '6f2fa89b-c15b-c2d4-423b-108709977154', 'Mr.Biryani Special', 200.00, 0.05, 1, 200.00, 10.00),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', '98fb4cc7-12b9-71a0-9d31-7e33bd6729c4', 'Kakinada Chicken Fry', 180.00, 0.05, 1, 180.00, 9.00),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', '672dbafd-e284-4e07-f54f-ebe294c2abcd', 'Egg Biryani', 130.00, 0.05, 2, 260.00, 13.00);

INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_id, created_at) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', NULL, 'PLACED', '59671b9b-e3e7-47b2-993c-6488a73164ea', now() - interval '40 minutes'),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', 'PLACED', 'PREPARING', '59671b9b-e3e7-47b2-993c-6488a73164ea', now() - interval '30 minutes'),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', 'PREPARING', 'READY', '59671b9b-e3e7-47b2-993c-6488a73164ea', now() - interval '18 minutes'),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333302', 'READY', 'SERVED', '59671b9b-e3e7-47b2-993c-6488a73164ea', now() - interval '10 minutes');

-- 7. ORDER 3: KITCHEN PREPARING TABLE FB-1 (VIP Booth, Punched by Waiter Kiran, PREPARING)
INSERT INTO orders (id, branch_id, customer_id, table_id, created_by, channel, status, subtotal, tax_total, total, idempotency_key, request_fingerprint, version, created_at, updated_at) VALUES
  ('33333333-3333-4333-a333-333333333303', '86841c23-a243-4282-bb0d-65415b68ae36', NULL, '11111111-1111-4111-a111-111111111109', '59671b9b-e3e7-47b2-993c-6488a73164ea', 'POS', 'PREPARING', 900.00, 45.00, 945.00, 'pos-table-fb1-01', 'fp-table-fb1-01', 1, now() - interval '15 minutes', now());

INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333303', '6e6ba238-8a48-490a-63ee-42734b7b821e', 'Lollipop Chicken Biryani', 490.00, 0.05, 1, 490.00, 24.50),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333303', 'cce27d45-2676-daeb-1aa2-069afa1dbf75', 'Kshatriya Chicken Wings', 180.00, 0.05, 1, 180.00, 9.00),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333303', 'bdd877b5-aea5-d376-b7a0-28de860c4505', 'Prawns Ghee Roast', 240.00, 0.05, 1, 240.00, 12.00);

INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_id, created_at) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333303', NULL, 'PLACED', '59671b9b-e3e7-47b2-993c-6488a73164ea', now() - interval '15 minutes'),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333303', 'PLACED', 'PREPARING', '59671b9b-e3e7-47b2-993c-6488a73164ea', now() - interval '8 minutes');

-- 8. ORDER 4: BILLED BUT UNPAID (Table T-01, Bill Generated, Awaiting Payment Tender)
INSERT INTO orders (id, branch_id, customer_id, table_id, created_by, channel, status, subtotal, tax_total, total, idempotency_key, request_fingerprint, version, created_at, updated_at) VALUES
  ('33333333-3333-4333-a333-333333333304', '86841c23-a243-4282-bb0d-65415b68ae36', NULL, '11111111-1111-4111-a111-111111111101', '59671b9b-e3e7-47b2-993c-6488a73164ea', 'POS', 'SERVED', 600.00, 30.00, 630.00, 'pos-table-t01-01', 'fp-table-t01-01', 1, now() - interval '50 minutes', now());

INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333304', '646199df-094b-00d4-3d60-c34603d75e3f', 'Fry-Piece Chicken Biryani', 180.00, 0.05, 2, 360.00, 18.00),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333304', '032adde3-228b-0983-de4e-43e3ebb9d45d', 'Andhra Mutton Fry', 240.00, 0.05, 1, 240.00, 12.00);

-- Bill Generated for Order 4 (OPEN status, due ₹630.00)
INSERT INTO bills (id, order_id, branch_id, subtotal, tax_total, total, status, created_by, created_at) VALUES
  ('44444444-4444-4444-a444-444444444401', '33333333-3333-4333-a333-333333333304', '86841c23-a243-4282-bb0d-65415b68ae36', 600.00, 30.00, 630.00, 'OPEN', 'cb74c785-5608-46ff-b36e-0e1188e1effb', now() - interval '10 minutes');

-- 9. ORDER 5: SETTLED & PAID (Till Revenue Today: ₹1596.00 via UPI)
INSERT INTO orders (id, branch_id, customer_id, table_id, created_by, channel, status, subtotal, tax_total, total, idempotency_key, request_fingerprint, version, created_at, updated_at) VALUES
  ('33333333-3333-4333-a333-333333333305', '86841c23-a243-4282-bb0d-65415b68ae36', NULL, NULL, 'cb74c785-5608-46ff-b36e-0e1188e1effb', 'POS', 'COMPLETED', 1520.00, 76.00, 1596.00, 'pos-settled-01', 'fp-settled-01', 1, now() - interval '2 hours', now());

INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333305', '96d125f7-f8c7-4821-cc58-9b79254f292f', 'Guntur Chicken Biryani', 180.00, 0.05, 3, 540.00, 27.00),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333305', '6e6ba238-8a48-490a-63ee-42734b7b821e', 'Lollipop Chicken Biryani', 490.00, 0.05, 2, 980.00, 49.00);

-- Bill Generated for Order 5 (PAID status)
INSERT INTO bills (id, order_id, branch_id, subtotal, tax_total, total, status, created_by, created_at) VALUES
  ('44444444-4444-4444-a444-444444444402', '33333333-3333-4333-a333-333333333305', '86841c23-a243-4282-bb0d-65415b68ae36', 1520.00, 76.00, 1596.00, 'PAID', 'cb74c785-5608-46ff-b36e-0e1188e1effb', now() - interval '1 hour 45 minutes');

-- Payment record for Bill 2 (UPI ₹1596.00)
INSERT INTO payments (id, bill_id, method, amount, idempotency_key, recorded_by, created_at, provider) VALUES
  (gen_random_uuid(), '44444444-4444-4444-a444-444444444402', 'UPI', 1596.00, 'pay-upi-settled-01', 'cb74c785-5608-46ff-b36e-0e1188e1effb', now() - interval '1 hour 40 minutes', 'MANUAL');

-- 10. ORDER 6: CUSTOMER ONLINE ORDER (Customer Balakrishna)
INSERT INTO orders (id, branch_id, customer_id, table_id, created_by, channel, status, subtotal, tax_total, total, idempotency_key, request_fingerprint, version, created_at, updated_at) VALUES
  ('33333333-3333-4333-a333-333333333306', '86841c23-a243-4282-bb0d-65415b68ae36', 'b5f8f751-951e-49b5-9f5c-b1b85acea975', NULL, 'b5f8f751-951e-49b5-9f5c-b1b85acea975', 'ONLINE', 'ACCEPTED', 1280.00, 64.00, 1344.00, 'online-cust-01', 'fp-online-01', 1, now() - interval '1 hour', now());

INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333306', '052ae692-1200-96df-7e4f-d549702da85e', 'Fish Biryani', 610.00, 0.05, 1, 610.00, 30.50),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333306', 'a8df41f2-f362-ccc1-36ca-3ab180b86dc8', 'Prawns Biryani', 670.00, 0.05, 1, 670.00, 33.50);

INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_id, created_at) VALUES
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333306', NULL, 'PLACED', 'b5f8f751-951e-49b5-9f5c-b1b85acea975', now() - interval '1 hour'),
  (gen_random_uuid(), '33333333-3333-4333-a333-333333333306', 'PLACED', 'ACCEPTED', '571f6bf7-37b1-4be8-ac71-4d700e3c65de', now() - interval '50 minutes');

COMMIT;
