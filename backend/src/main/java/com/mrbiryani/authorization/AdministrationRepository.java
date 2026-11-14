package com.mrbiryani.authorization;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AdministrationRepository {

    public record PermissionView(String key, String module, String description) {}

    private final JdbcClient jdbc;

    public AdministrationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<PermissionView> listPermissions() {
        return jdbc.sql("SELECT key, module, description FROM permissions ORDER BY module, key")
                .query((rs, i) -> new PermissionView(rs.getString("key"), rs.getString("module"),
                        rs.getString("description")))
                .list();
    }

    public Optional<UUID> roleId(String code) {
        return jdbc.sql("SELECT id FROM roles WHERE code = :code").param("code", code)
                .query(UUID.class).optional();
    }

    public List<String> rolePermissionKeys(UUID roleId) {
        return jdbc.sql("SELECT p.key FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id "
                + "WHERE rp.role_id = :role ORDER BY p.key")
                .param("role", roleId).query(String.class).list();
    }

    /** Replaces a role's mapping. Runs inside the caller's transaction. */
    public void replaceRolePermissions(UUID roleId, Collection<String> keys, UUID actorId) {
        jdbc.sql("DELETE FROM role_permissions WHERE role_id = :role").param("role", roleId).update();
        for (String key : keys) {
            jdbc.sql("INSERT INTO role_permissions (role_id, permission_id, updated_by) "
                    + "SELECT :role, p.id, :actor FROM permissions p WHERE p.key = :key")
                    .param("role", roleId).param("actor", actorId).param("key", key).update();
        }
    }

    public long countActiveAdmins() {
        return jdbc.sql("SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "JOIN users u ON u.id = ur.user_id WHERE r.code = 'ADMIN' AND ur.is_active AND u.status = 'ACTIVE'")
                .query(Long.class).single();
    }

    public boolean emailTaken(String email) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM users WHERE email = :email)")
                .param("email", email).query(Boolean.class).single();
    }

    public UUID insertUser(String email, String fullName, String passwordHash) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :email, :name, :hash)")
                .param("id", id).param("email", email).param("name", fullName).param("hash", passwordHash).update();
        return id;
    }

    /** Assigns a role. A null branch means GLOBAL scope (Admin only). */
    public void assignRole(UUID userId, String roleCode, UUID branchId, UUID actorId) {
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id, assigned_by) "
                + "SELECT :id, :user, r.id, :branch, :actor FROM roles r WHERE r.code = :code")
                .param("id", UUID.randomUUID()).param("user", userId).param("branch", branchId)
                .param("actor", actorId).param("code", roleCode).update();
    }

    /** Branch-scoped assignments of a user with their role codes. */
    public List<String> activeRolesInBranch(UUID userId, UUID branchId) {
        return jdbc.sql("SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "WHERE ur.user_id = :user AND ur.branch_id = :branch AND ur.is_active")
                .param("user", userId).param("branch", branchId).query(String.class).list();
    }

    public boolean hasActiveRole(UUID userId, String roleCode) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "WHERE ur.user_id = :user AND r.code = :code AND ur.is_active)")
                .param("user", userId).param("code", roleCode).query(Boolean.class).single();
    }

    public int deactivateBranchAssignments(UUID userId, UUID branchId, UUID actorId) {
        return jdbc.sql("UPDATE user_roles SET is_active = FALSE, revoked_at = now() "
                + "WHERE user_id = :user AND branch_id = :branch AND is_active")
                .param("user", userId).param("branch", branchId).update();
    }

    public void audit(UUID actorId, UUID branchId, String action, String targetId, String requestId, String metadataJson) {
        jdbc.sql("INSERT INTO audit_logs (id, actor_id, branch_id, action, target_type, target_id, request_id, metadata) "
                + "VALUES (:id, :actor, :branch, :action, 'user', :target, :request, CAST(:meta AS jsonb))")
                .param("id", UUID.randomUUID()).param("actor", actorId).param("branch", branchId)
                .param("action", action).param("target", targetId)
                .param("request", requestId == null ? null : requestId.substring(0, Math.min(64, requestId.length())))
                .param("meta", metadataJson).update();
    }
}
