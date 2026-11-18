
-- V10: Support staff-created POS orders for dining tables.

-- POS orders can be created without a registered customer.
ALTER TABLE orders
    ALTER COLUMN customer_id DROP NOT NULL;

-- Add table and staff creator references.
ALTER TABLE orders
    ADD COLUMN table_id UUID REFERENCES dining_tables(id),
    ADD COLUMN created_by UUID REFERENCES users(id);

-- Enforce the ownership rules for online and POS orders.
ALTER TABLE orders
    ADD CONSTRAINT orders_channel_owner_check
        CHECK (
            (
                channel = 'ONLINE'
                    AND customer_id IS NOT NULL
                    AND table_id IS NULL
                    AND created_by IS NULL
                )
                OR
            (
                channel = 'POS'
                    AND customer_id IS NULL
                    AND table_id IS NOT NULL
                    AND created_by IS NOT NULL
                )
            );

-- POS idempotency is scoped to branch + staff member + key.
CREATE UNIQUE INDEX orders_pos_idempotency_unique
    ON orders (branch_id, created_by, idempotency_key)
    WHERE channel = 'POS';

CREATE INDEX orders_table_idx
    ON orders (table_id, created_at);
