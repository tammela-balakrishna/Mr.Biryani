-- Roadmap steps 8-10 (provisional until the ER diagram review):
-- floor tables and waiter assignment, billing and payments with separate refund approval,
-- inventory, expenses and sales reporting. Every branch-owned table carries branch_id.

CREATE TABLE dining_tables (
    id          UUID PRIMARY KEY,
    branch_id   UUID        NOT NULL REFERENCES branches (id),
    label       VARCHAR(20) NOT NULL,
    capacity    INTEGER     NOT NULL CHECK (capacity BETWEEN 1 AND 30),
    status      VARCHAR(16) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING')),
    version     INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT dining_tables_label_unique UNIQUE (branch_id, label)
);

CREATE TABLE table_assignments (
    id              UUID PRIMARY KEY,
    table_id        UUID        NOT NULL REFERENCES dining_tables (id) ON DELETE CASCADE,
    waiter_user_id  UUID        NOT NULL REFERENCES users (id),
    assigned_by     UUID        REFERENCES users (id) ON DELETE SET NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    active          BOOLEAN     NOT NULL DEFAULT TRUE
);
-- A table has at most one active waiter at a time.
CREATE UNIQUE INDEX table_assignments_one_active ON table_assignments (table_id) WHERE active;

CREATE TABLE bills (
    id          UUID PRIMARY KEY,
    order_id    UUID          NOT NULL UNIQUE REFERENCES orders (id),
    branch_id   UUID          NOT NULL REFERENCES branches (id),
    subtotal    NUMERIC(12,2) NOT NULL,
    tax_total   NUMERIC(12,2) NOT NULL,
    total       NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    status      VARCHAR(12)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID')),
    created_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX bills_branch_idx ON bills (branch_id, created_at);

-- Manually recorded tenders. Split payments are several rows against one bill.
CREATE TABLE payments (
    id               UUID PRIMARY KEY,
    bill_id          UUID          NOT NULL REFERENCES bills (id),
    method           VARCHAR(12)   NOT NULL CHECK (method IN ('CASH', 'CARD', 'UPI')),
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    idempotency_key  VARCHAR(64)   NOT NULL,
    recorded_by      UUID          NOT NULL REFERENCES users (id),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT payments_idempotency_unique UNIQUE (bill_id, idempotency_key)
);

-- Refund initiation and approval are different people (docs/rbac.md section 5).
CREATE TABLE refunds (
    id            UUID PRIMARY KEY,
    payment_id    UUID          NOT NULL REFERENCES payments (id),
    amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reason        VARCHAR(200)  NOT NULL,
    status        VARCHAR(12)   NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED')),
    requested_by  UUID          NOT NULL REFERENCES users (id),
    decided_by    UUID REFERENCES users (id),
    decided_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT refunds_separate_approver CHECK (decided_by IS NULL OR decided_by <> requested_by)
);

CREATE TABLE inventory_items (
    id             UUID PRIMARY KEY,
    branch_id      UUID          NOT NULL REFERENCES branches (id),
    name           VARCHAR(120)  NOT NULL,
    unit           VARCHAR(16)   NOT NULL,
    quantity       NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_level  NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    CONSTRAINT inventory_items_name_unique UNIQUE (branch_id, name)
);

CREATE TABLE inventory_movements (
    id          UUID PRIMARY KEY,
    item_id     UUID          NOT NULL REFERENCES inventory_items (id),
    delta       NUMERIC(12,3) NOT NULL CHECK (delta <> 0),
    reason      VARCHAR(200)  NOT NULL,
    actor_id    UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
    id           UUID PRIMARY KEY,
    branch_id    UUID          NOT NULL REFERENCES branches (id),
    category     VARCHAR(40)   NOT NULL,
    amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description  VARCHAR(300)  NOT NULL,
    status       VARCHAR(12)   NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_by   UUID          NOT NULL REFERENCES users (id),
    approved_by  UUID REFERENCES users (id),
    decided_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT expenses_separate_approver CHECK (approved_by IS NULL OR approved_by <> created_by)
);
CREATE INDEX expenses_branch_idx ON expenses (branch_id, created_at);
