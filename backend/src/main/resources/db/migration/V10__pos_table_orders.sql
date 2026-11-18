-- V10: Allow staff-created POS orders linked to a dining table.
-- V7 created orders with a mandatory customer_id and customer-scoped idempotency.
-- V8 created dining_tables. This migration connects the existing order model
-- to the POS flow without changing the online-order idempotency constraint.

ALTER TABLE orders
    ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE orders
    ADD COLUMN table_id UUID,
    ADD COLUMN created_by UUID;

ALTER TABLE orders
    ADD CONSTRAINT orders_table_id_fk
        FOREIGN KEY (table_id) REFERENCES dining_tables (id),
    ADD CONSTRAINT orders_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users (id);

-- Keep customer online-order uniqueness from V7.
-- POS idempotency is scoped to branch + staff member + key.
CREATE UNIQUE INDEX orders_pos_idempotency_unique
    ON orders (branch_id, created_by, idempotency_key)
    WHERE channel = 'POS';

CREATE INDEX orders_table_created_at_idx
    ON orders (table_id, created_at)
    WHERE table_id IS NOT NULL;
