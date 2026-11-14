package com.mrbiryani.identity;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class AuthRepository {

    public record UserRow(UUID id, String email, String fullName, String passwordHash, String status,
            int authVersion, int failedLoginCount, Instant lockedUntil) {}

    public record SessionRow(UUID id, UUID userId, UUID familyId, Instant expiresAt, Instant revokedAt,
            String revokeReason) {}

    private final JdbcClient jdbc;

    public AuthRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    private static final String USER_COLS =
            "id, email, full_name, password_hash, status, auth_version, failed_login_count, locked_until";

    private static UserRow mapUser(ResultSet rs, int i) throws SQLException {
        return new UserRow(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("full_name"),
                rs.getString("password_hash"), rs.getString("status"), rs.getInt("auth_version"),
                rs.getInt("failed_login_count"), toInstant(rs.getTimestamp("locked_until")));
    }

    private static Instant toInstant(java.sql.Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    public Optional<UserRow> findUserByEmail(String email) {
        return jdbc.sql("SELECT " + USER_COLS + " FROM users WHERE email = :email")
                .param("email", email).query(AuthRepository::mapUser).optional();
    }

    public Optional<UserRow> findUserById(UUID id) {
        return jdbc.sql("SELECT " + USER_COLS + " FROM users WHERE id = :id")
                .param("id", id).query(AuthRepository::mapUser).optional();
    }

    public void recordLoginFailure(UUID userId, int failedCount, Instant lockedUntil) {
        jdbc.sql("UPDATE users SET failed_login_count = :c, locked_until = :l, updated_at = now() WHERE id = :id")
                .param("c", failedCount).param("l", lockedUntil == null ? null : java.sql.Timestamp.from(lockedUntil))
                .param("id", userId).update();
    }

    public void recordLoginSuccess(UUID userId) {
        jdbc.sql("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = now(), "
                + "updated_at = now() WHERE id = :id").param("id", userId).update();
    }

    /** Creates a user with the CUSTOMER role in one transaction (called from AuthService). */
    public UUID insertCustomer(String email, String phone, String fullName, String passwordHash) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO users (id, email, phone, full_name, password_hash) "
                + "VALUES (:id, :email, :phone, :name, :hash)")
                .param("id", id).param("email", email).param("phone", phone)
                .param("name", fullName).param("hash", passwordHash).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id) "
                + "SELECT :rid, :uid, r.id FROM roles r WHERE r.code = 'CUSTOMER'")
                .param("rid", UUID.randomUUID()).param("uid", id).update();
        return id;
    }

    public void insertSession(UUID userId, UUID familyId, String tokenHash, Instant expiresAt,
            String userAgent, String ip) {
        jdbc.sql("INSERT INTO refresh_sessions (id, user_id, family_id, token_hash, expires_at, user_agent, ip_address) "
                + "VALUES (:id, :uid, :fid, :hash, :exp, :ua, :ip)")
                .param("id", UUID.randomUUID()).param("uid", userId).param("fid", familyId)
                .param("hash", tokenHash).param("exp", java.sql.Timestamp.from(expiresAt))
                .param("ua", truncate(userAgent, 512)).param("ip", truncate(ip, 64)).update();
    }

    public Optional<SessionRow> findSessionByHash(String tokenHash) {
        return jdbc.sql("SELECT id, user_id, family_id, expires_at, revoked_at, revoke_reason "
                + "FROM refresh_sessions WHERE token_hash = :h")
                .param("h", tokenHash).query((rs, i) -> new SessionRow(
                        rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                        rs.getObject("family_id", UUID.class), toInstant(rs.getTimestamp("expires_at")),
                        toInstant(rs.getTimestamp("revoked_at")), rs.getString("revoke_reason")))
                .optional();
    }

    /**
     * Atomically revokes the old session and inserts its successor. Returns false if the old
     * session was already revoked (a concurrent refresh or a replay). The row lock taken by the
     * UPDATE serializes concurrent rotations of the same token.
     */
    @Transactional
    public boolean rotate(UUID oldSessionId, UUID userId, UUID familyId, String newHash, Instant expiresAt,
            String userAgent, String ip) {
        UUID newId = UUID.randomUUID();
        // Insert the successor first: replaced_by is a foreign key to it.
        jdbc.sql("INSERT INTO refresh_sessions (id, user_id, family_id, token_hash, expires_at, user_agent, ip_address) "
                + "VALUES (:id, :uid, :fid, :hash, :exp, :ua, :ip)")
                .param("id", newId).param("uid", userId).param("fid", familyId).param("hash", newHash)
                .param("exp", java.sql.Timestamp.from(expiresAt))
                .param("ua", truncate(userAgent, 512)).param("ip", truncate(ip, 64)).update();
        int revoked = jdbc.sql("UPDATE refresh_sessions SET revoked_at = now(), revoke_reason = 'ROTATED', "
                + "replaced_by = :new WHERE id = :old AND revoked_at IS NULL")
                .param("new", newId).param("old", oldSessionId).update();
        // Losing the race: roll back the insert too, so no orphan live session is left behind.
        if (revoked != 1) {
            org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus()
                    .setRollbackOnly();
            return false;
        }
        return true;
    }

    public void revokeFamily(UUID familyId, String reason) {
        jdbc.sql("UPDATE refresh_sessions SET revoked_at = now(), revoke_reason = :r "
                + "WHERE family_id = :f AND revoked_at IS NULL")
                .param("r", reason).param("f", familyId).update();
    }

    public boolean isFamilyActive(UUID familyId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM refresh_sessions WHERE family_id = :f "
                + "AND revoked_at IS NULL AND expires_at > now())")
                .param("f", familyId).query(Boolean.class).single();
    }

    public List<String> activePermissionKeys(UUID userId) {
        return jdbc.sql("SELECT DISTINCT p.key FROM user_roles ur "
                + "JOIN role_permissions rp ON rp.role_id = ur.role_id "
                + "JOIN permissions p ON p.id = rp.permission_id "
                + "LEFT JOIN branches b ON b.id = ur.branch_id "
                + "WHERE ur.user_id = :u AND ur.is_active AND (b.id IS NULL OR b.status = 'ACTIVE') "
                + "ORDER BY p.key")
                .param("u", userId).query(String.class).list();
    }

    public List<String> activeRoleCodes(UUID userId) {
        return jdbc.sql("SELECT DISTINCT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "WHERE ur.user_id = :u AND ur.is_active ORDER BY r.code")
                .param("u", userId).query(String.class).list();
    }

    public void audit(UUID actorId, String action, String targetType, String targetId, String requestId) {
        jdbc.sql("INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, request_id) "
                + "VALUES (:id, :actor, :action, :tt, :tid, :rid)")
                .param("id", UUID.randomUUID()).param("actor", actorId).param("action", action)
                .param("tt", targetType).param("tid", targetId).param("rid", truncate(requestId, 64)).update();
    }

    static String truncate(String s, int max) {
        return s == null ? null : (s.length() <= max ? s : s.substring(0, max));
    }
}
