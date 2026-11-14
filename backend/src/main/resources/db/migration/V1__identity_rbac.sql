-- Identity, RBAC, session and audit foundation.
-- Restaurant domain tables (dining tables, orders, payments, ...) follow the ER
-- diagram review; staff_table_assignments depends on them.

CREATE TABLE branches (
    id          UUID PRIMARY KEY,
    code        VARCHAR(32)  NOT NULL UNIQUE,
    name        VARCHAR(160) NOT NULL,
    status      VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id                  UUID PRIMARY KEY,
    email               VARCHAR(254) UNIQUE,          -- lower-cased, trimmed
    phone               VARCHAR(16)  UNIQUE,          -- E.164
    full_name           VARCHAR(120) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    status              VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
    -- Incremented whenever outstanding access must be invalidated.
    auth_version        INTEGER      NOT NULL DEFAULT 1,
    failed_login_count  INTEGER      NOT NULL DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_identifier_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE roles (
    id              UUID PRIMARY KEY,
    code            VARCHAR(32)  NOT NULL UNIQUE
                    CHECK (code IN ('CUSTOMER','WAITER','RECEPTIONIST','CAPTAIN','CASHIER','MANAGER','ADMIN')),
    name            VARCHAR(64)  NOT NULL,
    description     TEXT         NOT NULL,
    is_system_role  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id           UUID PRIMARY KEY,
    key          VARCHAR(96)  NOT NULL UNIQUE,
    module       VARCHAR(32)  NOT NULL,
    description  TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX permissions_module_idx ON permissions (module);

CREATE TABLE role_permissions (
    role_id        UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id  UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    updated_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX role_permissions_permission_idx ON role_permissions (permission_id);

-- Canonical source of role + branch scope. branch_id NULL = GLOBAL (Admin) or
-- not branch-bound (Customer).
CREATE TABLE user_roles (
    id           UUID PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_id      UUID NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    branch_id    UUID REFERENCES branches (id) ON DELETE RESTRICT,
    is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
    assigned_by  UUID REFERENCES users (id) ON DELETE SET NULL,
    assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX user_roles_branch_key ON user_roles (user_id, role_id, branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX user_roles_global_key ON user_roles (user_id, role_id) WHERE branch_id IS NULL;
CREATE INDEX user_roles_user_active_idx ON user_roles (user_id, is_active);
CREATE INDEX user_roles_branch_idx ON user_roles (branch_id);

-- Opaque refresh tokens; only the SHA-256 hash is stored. Rotated on every use;
-- presenting an already-rotated token revokes the whole family.
CREATE TABLE refresh_sessions (
    id             UUID PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id      UUID NOT NULL,
    token_hash     CHAR(64)    NOT NULL UNIQUE,
    expires_at     TIMESTAMPTZ NOT NULL,
    revoked_at     TIMESTAMPTZ,
    revoke_reason  VARCHAR(24) CHECK (revoke_reason IN ('ROTATED','LOGOUT','REUSE_DETECTED','ADMIN_REVOKED')),
    replaced_by    UUID UNIQUE REFERENCES refresh_sessions (id) ON DELETE SET NULL,
    user_agent     VARCHAR(512),
    ip_address     VARCHAR(64),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_sessions_user_idx ON refresh_sessions (user_id);
CREATE INDEX refresh_sessions_family_idx ON refresh_sessions (family_id);

-- Append-only; never store secrets in metadata. Actor/branch are plain UUIDs
-- (no FK) so the trail survives and is never rewritten by cascades.
CREATE TABLE audit_logs (
    id           UUID PRIMARY KEY,
    actor_id     UUID,
    branch_id    UUID,
    action       VARCHAR(96) NOT NULL,
    target_type  VARCHAR(48),
    target_id    VARCHAR(64),
    request_id   VARCHAR(64),
    metadata     JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_idx  ON audit_logs (actor_id, created_at);
CREATE INDEX audit_logs_branch_idx ON audit_logs (branch_id, created_at);
CREATE INDEX audit_logs_action_idx ON audit_logs (action, created_at);

-- System roles cannot be deleted or repurposed.
CREATE FUNCTION protect_system_roles() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND OLD.is_system_role THEN
        RAISE EXCEPTION 'System role % cannot be deleted', OLD.code;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.is_system_role AND (NEW.code <> OLD.code OR NOT NEW.is_system_role) THEN
        RAISE EXCEPTION 'System role % cannot be repurposed', OLD.code;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_protect_system BEFORE UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION protect_system_roles();

CREATE FUNCTION audit_logs_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update_delete BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION audit_logs_append_only();
