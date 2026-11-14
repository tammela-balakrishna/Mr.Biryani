package com.mrbiryani.authorization;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.AdministrationRepository.PermissionView;
import com.mrbiryani.common.RequestIdFilter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1")
public class AdministrationController {

    public record UpdatePermissionsRequest(@NotNull List<String> permissions) {}

    public record CreateStaffRequest(
            @NotBlank @Size(min = 2, max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 128, message = "Password must be 10-128 characters") String password,
            @NotBlank String role) {}

    private final AdministrationService service;
    private final BranchAccess branchAccess;

    public AdministrationController(AdministrationService service, BranchAccess branchAccess) {
        this.service = service;
        this.branchAccess = branchAccess;
    }

    /** Admin only: the permission catalogue. */
    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('PERM_permissions.manage')")
    List<PermissionView> permissions() {
        return service.permissions();
    }

    /** Admin only: replaces the permission keys of one role template. Takes effect on the next request. */
    @PutMapping("/roles/{code}/permissions")
    @PreAuthorize("hasAuthority('PERM_roles.permissions.update')")
    Map<String, Object> updateRolePermissions(@PathVariable String code, @Valid @RequestBody UpdatePermissionsRequest body,
            HttpServletRequest req) {
        List<String> keys = service.replaceRolePermissions(code, body.permissions(),
                branchAccess.currentUserId(), requestId(req));
        return Map.of("role", code.toUpperCase(), "permissions", keys);
    }

    /** Admin (any branch) or Manager (assigned branches): creates a staff account in the branch. */
    @PostMapping("/branches/{branchId}/staff")
    @PreAuthorize("hasAuthority('PERM_staff.create')")
    ResponseEntity<Map<String, Object>> createStaff(@PathVariable UUID branchId,
            @Valid @RequestBody CreateStaffRequest body, HttpServletRequest req) {
        branchAccess.require(branchId);
        var created = service.createStaff(branchAccess.currentUserId(), branchAccess.hasPermission("users.manage"),
                branchId, body.email(), body.fullName(), body.password(), body.role(), requestId(req));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("userId", created.userId())));
    }

    /** Removes a staff member's access to one branch. Does not delete the account or its history. */
    @DeleteMapping("/branches/{branchId}/staff/{userId}")
    @PreAuthorize("hasAuthority('PERM_staff.disable')")
    ResponseEntity<Void> disableStaff(@PathVariable UUID branchId, @PathVariable UUID userId, HttpServletRequest req) {
        branchAccess.require(branchId);
        service.disableStaff(branchAccess.currentUserId(), branchAccess.hasPermission("users.manage"),
                branchId, userId, requestId(req));
        return ResponseEntity.noContent().build();
    }

    private static String requestId(HttpServletRequest req) {
        return (String) req.getAttribute(RequestIdFilter.ATTRIBUTE);
    }
}
