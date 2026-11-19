-- V10: Allow staff-created POS orders linked to a dining table.
-- V7 created orders with a mandatory customer_id and customer-scoped idempotency.
-- V8 created dining_tables. This migration connects the existing order model
-- to the POS flow without changing the online-order idempotency constraint.
--
-- IF NOT EXISTS is intentional: some development databases already contain
-- table_id/created_by from an earlier manual application of the POS schema.
-- Flyway still records this migration once it completes successfully.

ALTER TABLE orders
    ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS table_id UUID;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS created_by UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_table_id_fk'
          AND conrelid = 'orders'::regclass
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_table_id_fk
            FOREIGN KEY (table_id) REFERENCES dining_tables (id);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_created_by_fk'
          AND conrelid = 'orders'::regclass
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_created_by_fk
            FOREIGN KEY (created_by) REFERENCES users (id);
    END IF;
END
$$;

-- Keep customer online-order uniqueness from V2.
-- POS idempotency is scoped to branch + staff member + key.
CREATE UNIQUE INDEX IF NOT EXISTS orders_pos_idempotency_unique
    ON orders (branch_id, created_by, idempotency_key)
    WHERE channel = 'POS';

CREATE INDEX IF NOT EXISTS orders_table_created_at_idx
    ON orders (table_id, created_at)
    WHERE table_id IS NOT NULL;
