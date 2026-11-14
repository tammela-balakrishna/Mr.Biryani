-- Roadmap step 14: RAG assistant (first release: public knowledge + own order/reservation status).
-- Retrieval uses PostgreSQL full-text search. Embeddings/pgvector are deliberately not used yet (no embedding provider approved).

CREATE TABLE knowledge_sources (
    id            UUID PRIMARY KEY,
    title         VARCHAR(200) NOT NULL,
    source_type   VARCHAR(16)  NOT NULL CHECK (source_type IN ('FAQ', 'POLICY', 'MENU', 'BRANCH', 'HELP')),
    content       TEXT         NOT NULL,
    status        VARCHAR(16)  NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'RETIRED')),
    version       INTEGER      NOT NULL DEFAULT 0,
    created_by    UUID REFERENCES users (id) ON DELETE SET NULL,
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE knowledge_chunks (
    id              UUID PRIMARY KEY,
    source_id       UUID    NOT NULL REFERENCES knowledge_sources (id) ON DELETE CASCADE,
    source_version  INTEGER NOT NULL,
    title           VARCHAR(200) NOT NULL,
    chunk_index     INTEGER NOT NULL,
    content         TEXT    NOT NULL,
    tsv             tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED,
    CONSTRAINT knowledge_chunks_unique UNIQUE (source_id, source_version, chunk_index)
);
CREATE INDEX knowledge_chunks_tsv_idx ON knowledge_chunks USING GIN (tsv);

CREATE TABLE chat_sessions (
    id             UUID PRIMARY KEY,
    owner_user_id  UUID REFERENCES users (id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);
CREATE INDEX chat_sessions_expiry_idx ON chat_sessions (expires_at);
CREATE INDEX chat_sessions_owner_idx ON chat_sessions (owner_user_id);

CREATE TABLE chat_messages (
    id           UUID PRIMARY KEY,
    session_id   UUID        NOT NULL REFERENCES chat_sessions (id) ON DELETE CASCADE,
    role         VARCHAR(12) NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
    content      TEXT        NOT NULL,
    answer_kind  VARCHAR(32),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_session_idx ON chat_messages (session_id, created_at);

CREATE TABLE chat_message_sources (
    message_id  UUID         NOT NULL REFERENCES chat_messages (id) ON DELETE CASCADE,
    chunk_id    UUID         NOT NULL REFERENCES knowledge_chunks (id) ON DELETE CASCADE,
    source_id   UUID         NOT NULL REFERENCES knowledge_sources (id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    PRIMARY KEY (message_id, chunk_id)
);

CREATE TABLE chat_feedback (
    id          UUID PRIMARY KEY,
    message_id  UUID        NOT NULL UNIQUE REFERENCES chat_messages (id) ON DELETE CASCADE,
    rating      VARCHAR(4)  NOT NULL CHECK (rating IN ('UP', 'DOWN')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- New knowledge permissions. Existing installs get them mapped to Admin here, because the seeder
-- only creates default mappings for roles that have none yet.
INSERT INTO permissions (id, key, module, description) VALUES
    (gen_random_uuid(), 'chat.knowledge.read', 'chat', 'chat knowledge read'),
    (gen_random_uuid(), 'chat.knowledge.manage', 'chat', 'chat knowledge manage'),
    (gen_random_uuid(), 'chat.knowledge.publish', 'chat', 'chat knowledge publish')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'ADMIN' AND p.key LIKE 'chat.%'
ON CONFLICT DO NOTHING;
