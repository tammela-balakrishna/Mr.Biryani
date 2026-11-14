-- Roadmap step 7: menu, online orders and reservations.
-- Table/floor and POS-session tables are deliberately not here; they wait for the ER diagram review.

CREATE TABLE menu_categories (
    id          UUID PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Menu is restaurant-wide for now; branch-specific pricing is a later step.
CREATE TABLE menu_items (
    id            UUID PRIMARY KEY,
    category_id   UUID          NOT NULL REFERENCES menu_categories (id),
    name          VARCHAR(120)  NOT NULL,
    description   TEXT,
    price         NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    tax_rate      NUMERIC(5,2)  NOT NULL DEFAULT 5.00 CHECK (tax_rate BETWEEN 0 AND 28),
    is_available  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX menu_items_category_idx ON menu_items (category_id);

CREATE TABLE orders (
    id                   UUID PRIMARY KEY,
    branch_id            UUID          NOT NULL REFERENCES branches (id),
    customer_id          UUID          NOT NULL REFERENCES users (id),
    channel              VARCHAR(16)   NOT NULL DEFAULT 'ONLINE' CHECK (channel IN ('ONLINE', 'POS')),
    status               VARCHAR(16)   NOT NULL CHECK (status IN
                         ('PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED')),
    subtotal             NUMERIC(12,2) NOT NULL,
    tax_total            NUMERIC(12,2) NOT NULL,
    total                NUMERIC(12,2) NOT NULL,
    idempotency_key      VARCHAR(64)   NOT NULL,
    request_fingerprint  VARCHAR(2000) NOT NULL,
    version              INTEGER       NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT orders_idempotency_unique UNIQUE (customer_id, idempotency_key)
);
CREATE INDEX orders_branch_status_idx ON orders (branch_id, status, created_at);
CREATE INDEX orders_customer_idx ON orders (customer_id, created_at);

-- Item name, price and tax are snapshots: later menu edits never change a placed order.
CREATE TABLE order_items (
    id            UUID PRIMARY KEY,
    order_id      UUID          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    menu_item_id  UUID          REFERENCES menu_items (id) ON DELETE SET NULL,
    item_name     VARCHAR(120)  NOT NULL,
    unit_price    NUMERIC(10,2) NOT NULL,
    tax_rate      NUMERIC(5,2)  NOT NULL,
    quantity      INTEGER       NOT NULL CHECK (quantity BETWEEN 1 AND 50),
    line_subtotal NUMERIC(12,2) NOT NULL,
    line_tax      NUMERIC(12,2) NOT NULL
);
CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE order_status_history (
    id           UUID PRIMARY KEY,
    order_id     UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    from_status  VARCHAR(16),
    to_status    VARCHAR(16) NOT NULL,
    actor_id     UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_history_order_idx ON order_status_history (order_id, created_at);

CREATE TABLE reservations (
    id          UUID PRIMARY KEY,
    branch_id   UUID         NOT NULL REFERENCES branches (id),
    customer_id UUID         REFERENCES users (id),
    guest_name  VARCHAR(120) NOT NULL,
    party_size  INTEGER      NOT NULL CHECK (party_size BETWEEN 1 AND 20),
    starts_at   TIMESTAMPTZ  NOT NULL,
    status      VARCHAR(16)  NOT NULL CHECK (status IN ('REQUESTED', 'CONFIRMED', 'CHECKED_IN', 'CANCELLED')),
    notes       VARCHAR(500),
    version     INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX reservations_branch_time_idx ON reservations (branch_id, starts_at);
CREATE INDEX reservations_customer_idx ON reservations (customer_id, starts_at);
