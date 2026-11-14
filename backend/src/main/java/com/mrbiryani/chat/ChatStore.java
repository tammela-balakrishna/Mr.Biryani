package com.mrbiryani.chat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ChatStore {

    public record Source(UUID id, String title, String type, String content, String status, int version) {}

    public record Hit(UUID chunkId, UUID sourceId, String title, String content) {}

    public record SessionRow(UUID id, UUID ownerUserId, Instant expiresAt) {}

    public record MessageRow(UUID id, String role, String content, String answerKind, Instant createdAt) {}

    private final JdbcClient jdbc;

    public ChatStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static Source mapSource(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        return new Source(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("source_type"),
                rs.getString("content"), rs.getString("status"), rs.getInt("version"));
    }

    // ---- knowledge ----

    public void insertSource(UUID id, String title, String type, String content, UUID actor) {
        jdbc.sql("INSERT INTO knowledge_sources (id, title, source_type, content, created_by) "
                + "VALUES (:id, :title, :type, :content, :actor)")
                .param("id", id).param("title", title).param("type", type).param("content", content).param("actor", actor)
                .update();
    }

    public Optional<Source> findSource(UUID id) {
        return jdbc.sql("SELECT id, title, source_type, content, status, version FROM knowledge_sources WHERE id = :id")
                .param("id", id).query(ChatStore::mapSource).optional();
    }

    public List<Source> listSources() {
        return jdbc.sql("SELECT id, title, source_type, content, status, version FROM knowledge_sources "
                + "ORDER BY updated_at DESC LIMIT 200").query(ChatStore::mapSource).list();
    }

    /** Replaces all chunks of a source with the given version. Runs inside the caller's transaction. */
    public void replaceChunks(UUID sourceId, String title, int version, List<String> chunks) {
        jdbc.sql("DELETE FROM knowledge_chunks WHERE source_id = :s").param("s", sourceId).update();
        for (int i = 0; i < chunks.size(); i++) {
            jdbc.sql("INSERT INTO knowledge_chunks (id, source_id, source_version, title, chunk_index, content) "
                    + "VALUES (:id, :s, :v, :t, :i, :c)")
                    .param("id", UUID.randomUUID()).param("s", sourceId).param("v", version).param("t", title)
                    .param("i", i).param("c", chunks.get(i)).update();
        }
    }

    public void setPublished(UUID id, int version) {
        jdbc.sql("UPDATE knowledge_sources SET status = 'PUBLISHED', version = :v, published_at = now(), updated_at = now() "
                + "WHERE id = :id").param("v", version).param("id", id).update();
    }

    public void setRetired(UUID id) {
        jdbc.sql("UPDATE knowledge_sources SET status = 'RETIRED', updated_at = now() WHERE id = :id")
                .param("id", id).update();
    }

    /**
     * Full-text search over PUBLISHED sources only, at their current version. Draft and retired content
     * is excluded in the query itself, not by the caller.
     */
    public List<Hit> search(String query, int limit) {
        // OR over meaningful words (stop words are dropped by the english config); ranking puts the best
        // passages first. Words are reduced to letters/digits so the tsquery syntax cannot be injected.
        String terms = java.util.Arrays.stream(query.toLowerCase(java.util.Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(w -> w.length() >= 3).distinct().collect(java.util.stream.Collectors.joining(" | "));
        if (terms.isEmpty()) return List.of();
        return jdbc.sql("SELECT c.id AS chunk_id, s.id AS source_id, s.title AS title, c.content AS content "
                + "FROM knowledge_chunks c JOIN knowledge_sources s ON s.id = c.source_id AND s.version = c.source_version "
                + "WHERE s.status = 'PUBLISHED' AND c.tsv @@ to_tsquery('english', :q) "
                + "ORDER BY ts_rank(c.tsv, to_tsquery('english', :q)) DESC LIMIT :n")
                .param("q", terms).param("n", limit)
                .query((rs, i) -> new Hit(rs.getObject("chunk_id", UUID.class), rs.getObject("source_id", UUID.class),
                        rs.getString("title"), rs.getString("content")))
                .list();
    }

    public void audit(UUID actor, String action, String targetId) {
        jdbc.sql("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id) "
                + "VALUES (:id, :actor, :action, 'knowledge_source', :target)")
                .param("id", UUID.randomUUID()).param("actor", actor).param("action", action).param("target", targetId)
                .update();
    }

    // ---- conversations ----

    public void createSession(UUID id, UUID owner) {
        jdbc.sql("INSERT INTO chat_sessions (id, owner_user_id) VALUES (:id, :owner)")
                .param("id", id).param("owner", owner).update();
    }

    public Optional<SessionRow> findSession(UUID id) {
        return jdbc.sql("SELECT id, owner_user_id, expires_at FROM chat_sessions WHERE id = :id")
                .param("id", id)
                .query((rs, i) -> new SessionRow(rs.getObject("id", UUID.class),
                        rs.getObject("owner_user_id", UUID.class), rs.getTimestamp("expires_at").toInstant()))
                .optional();
    }

    public void insertMessage(UUID id, UUID sessionId, String role, String content, String kind) {
        jdbc.sql("INSERT INTO chat_messages (id, session_id, role, content, answer_kind) "
                + "VALUES (:id, :s, :role, :content, :kind)")
                .param("id", id).param("s", sessionId).param("role", role).param("content", content).param("kind", kind)
                .update();
    }

    public void insertCitation(UUID messageId, UUID chunkId, UUID sourceId, String title) {
        jdbc.sql("INSERT INTO chat_message_sources (message_id, chunk_id, source_id, title) "
                + "VALUES (:m, :c, :s, :t)")
                .param("m", messageId).param("c", chunkId).param("s", sourceId).param("t", title).update();
    }

    public List<MessageRow> listMessages(UUID sessionId) {
        return jdbc.sql("SELECT id, role, content, answer_kind, created_at FROM chat_messages "
                + "WHERE session_id = :s ORDER BY created_at, id LIMIT 200")
                .param("s", sessionId)
                .query((rs, i) -> new MessageRow(rs.getObject("id", UUID.class), rs.getString("role"),
                        rs.getString("content"), rs.getString("answer_kind"), rs.getTimestamp("created_at").toInstant()))
                .list();
    }

    /** Session that owns the message, if the message is an assistant reply. */
    public Optional<UUID> assistantMessageSession(UUID messageId) {
        return jdbc.sql("SELECT session_id FROM chat_messages WHERE id = :id AND role = 'ASSISTANT'")
                .param("id", messageId).query(UUID.class).optional();
    }

    public void upsertFeedback(UUID messageId, String rating) {
        jdbc.sql("INSERT INTO chat_feedback (id, message_id, rating) VALUES (:id, :m, :r) "
                + "ON CONFLICT (message_id) DO UPDATE SET rating = EXCLUDED.rating, created_at = now()")
                .param("id", UUID.randomUUID()).param("m", messageId).param("r", rating).update();
    }

    public int deleteExpiredSessions() {
        return jdbc.sql("DELETE FROM chat_sessions WHERE expires_at < now()").update();
    }
}
