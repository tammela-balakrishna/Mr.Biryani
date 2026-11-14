package com.mrbiryani.authorization;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AuthorizationRepository {

    public record RoleView(String code, String name, List<String> permissions) {}

    public record StaffView(UUID userId, String fullName, String email, String role) {}

    private final JdbcClient jdbc;

    public AuthorizationRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * True when the user has an active assignment covering the branch: either a branch-scoped
     * assignment to this branch, or a GLOBAL assignment (Admin only, see docs/rbac.md section 6).
     * The branch itself must be ACTIVE.
     */
    public boolean hasBranchAccess(UUID userId, UUID branchId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN branches b ON b.id = :branch "
                + "WHERE ur.user_id = :user AND ur.is_active AND b.status = 'ACTIVE' "
                + "AND (ur.branch_id IS NULL OR ur.branch_id = :branch))")
                .param("user", userId).param("branch", branchId).query(Boolean.class).single();
    }

    public List<RoleView> listRoles() {
        Map<String, TreeSet<String>> keysByRole = new TreeMap<>();
        jdbc.sql("SELECT r.code AS code, p.key AS perm FROM roles r "
                + "LEFT JOIN role_permissions rp ON rp.role_id = r.id "
                + "LEFT JOIN permissions p ON p.id = rp.permission_id")
                .query((rs, i) -> {
                    keysByRole.computeIfAbsent(rs.getString("code"), k -> new TreeSet<>());
                    String perm = rs.getString("perm");
                    if (perm != null) keysByRole.get(rs.getString("code")).add(perm);
                    return null;
                }).list();
        return jdbc.sql("SELECT code, name FROM roles ORDER BY code")
                .query((rs, i) -> new RoleView(rs.getString("code"), rs.getString("name"),
                        List.copyOf(keysByRole.getOrDefault(rs.getString("code"), new TreeSet<>()))))
                .list();
    }

    public List<StaffView> listBranchStaff(UUID branchId) {
        return jdbc.sql("SELECT u.id AS id, u.full_name AS name, u.email AS email, r.code AS role "
                + "FROM user_roles ur JOIN users u ON u.id = ur.user_id JOIN roles r ON r.id = ur.role_id "
                + "WHERE ur.branch_id = :branch AND ur.is_active AND u.status = 'ACTIVE' "
                + "ORDER BY u.full_name, r.code")
                .param("branch", branchId)
                .query((rs, i) -> new StaffView(rs.getObject("id", UUID.class), rs.getString("name"),
                        rs.getString("email"), rs.getString("role")))
                .list();
    }
}
