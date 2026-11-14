package com.mrbiryani.authorization;

import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.mrbiryani.common.ApiException;

/**
 * Branch scope enforcement (pipeline step 3 in docs/rbac.md). Checks the current user's
 * assignments in the database on every call; the JWT is never trusted for branch access.
 */
@Component
public class BranchAccess {

    private final AuthorizationRepository repo;

    public BranchAccess(AuthorizationRepository repo) {
        this.repo = repo;
    }

    public UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) throw ApiException.unauthorized("Authentication required");
        return UUID.fromString(auth.getName());
    }

    /** True when the current principal holds the permission (authorities come from the database). */
    public boolean hasPermission(String key) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("PERM_" + key));
    }

    /**
     * Returns the branch id when the current user is assigned to it. Otherwise responds 404, so
     * callers cannot discover which branches exist (non-disclosing, per the RBAC spec).
     */
    public UUID require(UUID branchId) {
        if (!repo.hasBranchAccess(currentUserId(), branchId)) {
            throw ApiException.notFound("Branch not found");
        }
        return branchId;
    }
}
