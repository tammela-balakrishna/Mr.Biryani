-- Online payments through Zoho Payments (test mode first). A payment is recorded only from a verified
-- webhook, never from the browser redirect (docs/rbac.md section 5).

ALTER TABLE payments DROP CONSTRAINT payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('CASH', 'CARD', 'UPI', 'ONLINE'));
ALTER TABLE payments ADD COLUMN provider VARCHAR(16);
ALTER TABLE payments ADD COLUMN provider_payment_id VARCHAR(64) UNIQUE;

CREATE TABLE payment_sessions (
    id                   UUID PRIMARY KEY,
    bill_id              UUID          NOT NULL REFERENCES bills (id),
    customer_id          UUID          NOT NULL REFERENCES users (id),
    provider             VARCHAR(16)   NOT NULL CHECK (provider IN ('ZOHO')),
    provider_session_id  VARCHAR(64)   NOT NULL UNIQUE,
    amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency             VARCHAR(3)    NOT NULL,
    status               VARCHAR(12)   NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PAID', 'EXPIRED')),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at           TIMESTAMPTZ   NOT NULL
);
CREATE INDEX payment_sessions_bill_idx ON payment_sessions (bill_id);

-- Webhook deliveries already applied. Providers retry, so each event is applied at most once.
CREATE TABLE processed_webhooks (
    provider    VARCHAR(16) NOT NULL,
    event_id    VARCHAR(96) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (provider, event_id)
);
