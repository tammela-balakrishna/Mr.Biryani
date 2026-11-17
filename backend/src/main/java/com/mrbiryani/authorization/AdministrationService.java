package com.mrbiryani.authorization;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


import tools.jackson.databind.ObjectMapper;
import com.mrbiryani.common.ApiException;

/**
 * Role-template editing (Admin) and staff provisioning (Admin, Manager within branch scope).
 * Business rules from docs/rbac.md sections 2, 5 and 11 are enforced here, not in the UI.
 */
@Service
public class AdministrationService {

    /** Keys an Admin cannot remove from the Admin template without locking the system out. */
    static final Set<String> ADMIN_REQUIRED = Set.of(
            "roles.manage", "roles.permissions.update", "users.manage", "permissions.manage");

    private final AdministrationRepository repo;
    private final PasswordEncoder encoder;
    private final ObjectMapper json;

    public AdministrationService(AdministrationRepository repo, PasswordEncoder encoder, ObjectMapper json) {
        this.repo = repo;
        this.encoder = encoder;
        this.json = json;
    }

    public record StaffCreated(UUID userId) {}

    public List<AdministrationRepository.PermissionView> permissions() {
        return repo.listPermissions();
    }

    @Transactional
    public List<String> replaceRolePermissions(String roleCode, List<String> requested, UUID actorId, String requestId) {
        Role role = parseRole(roleCode);
        UUID roleId = repo.roleId(role.name()).orElseThrow(() -> ApiException.notFound("Role not found"));

        Set<String> keys = new TreeSet<>(requested);
        Set<String> unknown = new TreeSet<>(keys);
        unknown.removeAll(Permissions.ALL);
        if (!unknown.isEmpty()) throw ApiException.badRequest("Unknown permission keys: " + unknown);

        if (role != Role.ADMIN) {
            Set<String> reserved = new TreeSet<>(keys);
            reserved.retainAll(Permissions.ADMIN_ONLY);
            if (!reserved.isEmpty()) {
                throw ApiException.badRequest("Administration permissions are reserved for Admin: " + reserved);
            }
        }
        if (role == Role.CUSTOMER) {
            Set<String> allowed = new TreeSet<>(Permissions.CUSTOMER_MODULE);
            allowed.add("menu.read");
            Set<String> extra = new TreeSet<>(keys);
            extra.removeAll(allowed);
            if (!extra.isEmpty()) throw ApiException.badRequest("Customer template accepts only own-scope keys: " + extra);
        } else {
            Set<String> customerKeys = new TreeSet<>(keys);
            customerKeys.retainAll(Permissions.CUSTOMER_MODULE);
            if (!customerKeys.isEmpty()) {
                throw ApiException.badRequest("Own-scope customer keys can only be granted to Customer: " + customerKeys);
            }
        }
        if (role == Role.ADMIN && !keys.containsAll(ADMIN_REQUIRED)) {
            throw ApiException.conflict("Admin template must keep: " + ADMIN_REQUIRED);
        }

        Set<String> before = new TreeSet<>(repo.rolePermissionKeys(roleId));
        repo.replaceRolePermissions(roleId, keys, actorId);

        Set<String> added = new TreeSet<>(keys);
        added.removeAll(before);
        Set<String> removed = new TreeSet<>(before);
        removed.removeAll(keys);
        audit(actorId, null, "roles.permissions.updated", role.name(), requestId,
                Map.of("added", added, "removed", removed));
        return List.copyOf(keys);
    }

    /** Creates a staff account and assigns one role. The caller has already checked branch access. */
    @Transactional
    public StaffCreated createStaff(UUID actorId, boolean actorManagesUsers, UUID branchId, String email,
            String fullName, String rawPassword, String roleCode, String requestId) {
        Role role = parseRole(roleCode);
        if (role == Role.CUSTOMER) {
            throw ApiException.badRequest("Customers self-register; staff roles only");
        }
        if (role == Role.ADMIN && !actorManagesUsers) {
            throw ApiException.forbidden("Only Admin can create Admin accounts");
        }
        String normalized = email.trim().toLowerCase();
        if (repo.emailTaken(normalized)) throw ApiException.conflict("An account with this email already exists");

        UUID userId;
        try {
            userId = repo.insertUser(normalized, fullName.trim(), encoder.encode(rawPassword));
        } catch (DuplicateKeyException e) {
            throw ApiException.conflict("An account with this email already exists");
        }
        // Admin is GLOBAL (branch NULL); every other role is bound to the branch in the path.
        repo.assignRole(userId, role.name(), role == Role.ADMIN ? null : branchId, actorId);
        audit(actorId, branchId, "staff.created", userId.toString(), requestId, Map.of("role", role.name()));
        return new StaffCreated(userId);
    }

    /** Deactivates a user's assignments in one branch. Protects Admin accounts and the last Admin. */
    @Transactional
    public void disableStaff(UUID actorId, boolean actorManagesUsers, UUID branchId, UUID targetId, String requestId) {
        if (actorId.equals(targetId)) throw ApiException.conflict("You cannot disable your own account");
        List<String> roles = repo.activeRolesInBranch(targetId, branchId);
        if (roles.isEmpty()) throw ApiException.notFound("Staff member not found in this branch");

        if (roles.contains(Role.ADMIN.name())) {
            if (!actorManagesUsers) throw ApiException.forbidden("Only Admin can disable Admin accounts");
            if (repo.countActiveAdmins() <= 1) throw ApiException.conflict("Cannot disable the last active Admin");
        }
        repo.deactivateBranchAssignments(targetId, branchId, actorId);
        audit(actorId, branchId, "staff.disabled", targetId.toString(), requestId, Map.of("roles", roles));
    }

    /** Moves a staff member in this branch to a different staff role. Only Admin can promote to or change a Manager. */
    @Transactional
    public void changeStaffRole(UUID actorId, boolean actorManagesUsers, UUID branchId, UUID targetId, String roleCode, String requestId) {
        if (actorId.equals(targetId)) throw ApiException.conflict("You cannot change your own role");
        Role role = parseRole(roleCode);
        if (role == Role.CUSTOMER) throw ApiException.badRequest("Customers self-register; staff roles only");
        if (role == Role.ADMIN) throw ApiException.forbidden("Admin accounts are not assigned from here");
        if (role == Role.MANAGER && !actorManagesUsers) throw ApiException.forbidden("Only Admin can promote someone to Manager");
        List<String> roles = repo.activeRolesInBranch(targetId, branchId);
        if (roles.isEmpty()) throw ApiException.notFound("Staff member not found in this branch");
        if (roles.contains(Role.ADMIN.name())) throw ApiException.forbidden("Admin accounts cannot be changed here");
        if (roles.contains(Role.MANAGER.name()) && !actorManagesUsers) throw ApiException.forbidden("Only Admin can change a Manager's role");
        if (roles.contains(role.name())) return;
        repo.deactivateBranchAssignments(targetId, branchId, actorId);
        repo.assignRole(targetId, role.name(), branchId, actorId);
        audit(actorId, branchId, "staff.role_changed", targetId.toString(), requestId, Map.of("from", roles, "to", role.name()));
    }

    private static Role parseRole(String code) {
        try {
            return Role.valueOf(code.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Unknown role: " + code);
        }
    }

    private void audit(UUID actorId, UUID branchId, String action, String targetId, String requestId, Object meta) {
        repo.audit(actorId, branchId, action, targetId, requestId, json.writeValueAsString(meta));
    }
}
