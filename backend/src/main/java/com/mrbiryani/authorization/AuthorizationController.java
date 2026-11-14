package com.mrbiryani.authorization;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.AuthorizationRepository.RoleView;
import com.mrbiryani.authorization.AuthorizationRepository.StaffView;

/**
 * First protected operations. Each one declares its permission key and, where relevant,
 * branch scope. Method security runs after authentication and before the body executes.
 */
@RestController
@RequestMapping("/api/v1")
public class AuthorizationController {

    private final AuthorizationRepository repo;
    private final BranchAccess branchAccess;

    public AuthorizationController(AuthorizationRepository repo, BranchAccess branchAccess) {
        this.repo = repo;
        this.branchAccess = branchAccess;
    }

    /** Admin only: role templates and their permission keys. */
    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('PERM_roles.manage')")
    List<RoleView> roles() {
        return repo.listRoles();
    }

    /** Staff accounts assigned to one branch. Requires staff.read and an assignment to that branch. */
    @GetMapping("/branches/{branchId}/staff")
    @PreAuthorize("hasAuthority('PERM_staff.read')")
    List<StaffView> branchStaff(@PathVariable UUID branchId) {
        branchAccess.require(branchId);
        return repo.listBranchStaff(branchId);
    }
}
