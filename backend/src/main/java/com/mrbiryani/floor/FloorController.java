package com.mrbiryani.floor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.BranchAccess;
import com.mrbiryani.common.ApiException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Dining tables, their status, and the waiter responsible for each table. Provisional until the ER review. */
@RestController
@RequestMapping("/api/v1/branches/{branchId}/tables")
public class FloorController {

    public record TableRequest(@NotBlank @Size(max = 20) String label, @NotNull @Min(1) @Max(30) Integer capacity) {}

    public record StatusRequest(@NotBlank String status) {}

    public record AssignRequest(@NotNull UUID waiterUserId) {}

    private static final List<String> STATUSES = List.of("AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING");

    private final JdbcClient jdbc;
    private final BranchAccess branchAccess;

    public FloorController(JdbcClient jdbc, BranchAccess branchAccess) {
        this.jdbc = jdbc;
        this.branchAccess = branchAccess;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_tables.read')")
    Map<String, Object> tables(@PathVariable UUID branchId) {
        branchAccess.require(branchId);
        return Map.of("data", jdbc.sql("SELECT t.id, t.label, t.capacity, t.status, u.full_name AS waiter, "
                + "u.id AS waiter_user_id "
                + "FROM dining_tables t LEFT JOIN table_assignments a ON a.table_id = t.id AND a.active "
                + "LEFT JOIN users u ON u.id = a.waiter_user_id WHERE t.branch_id = :b ORDER BY t.label")
                .param("b", branchId).query().listOfRows());
    }

    /** Active waiters in this branch, for assigning tables. Needs only the floor-assignment permission, not staff access. */
    @GetMapping("/waiters")
    @PreAuthorize("hasAnyAuthority('PERM_tables.assign', 'PERM_floor.assign_waiter')")
    Map<String, Object> waiters(@PathVariable UUID branchId) {
        branchAccess.require(branchId);
        return Map.of("data", jdbc.sql("SELECT u.id AS user_id, u.full_name FROM user_roles ur "
                + "JOIN roles r ON r.id = ur.role_id JOIN users u ON u.id = ur.user_id "
                + "WHERE ur.branch_id = :b AND ur.is_active AND r.code = 'WAITER' ORDER BY u.full_name")
                .param("b", branchId).query().listOfRows());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_tables.allocate')")
    ResponseEntity<Map<String, Object>> create(@PathVariable UUID branchId, @Valid @RequestBody TableRequest body) {
        branchAccess.require(branchId);
        UUID id = UUID.randomUUID();
        try {
            jdbc.sql("INSERT INTO dining_tables (id, branch_id, label, capacity) VALUES (:id, :b, :l, :c)")
                    .param("id", id).param("b", branchId).param("l", body.label().trim()).param("c", body.capacity()).update();
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("A table with this label already exists");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id)));
    }

    @PatchMapping("/{tableId}/status")
    @PreAuthorize("hasAnyAuthority('PERM_tables.allocate', 'PERM_tables.release')")
    @Transactional
    Map<String, Object> setStatus(@PathVariable UUID branchId, @PathVariable UUID tableId, @Valid @RequestBody StatusRequest body) {
        branchAccess.require(branchId);
        String status = body.status().trim().toUpperCase();
        if (!STATUSES.contains(status)) throw ApiException.badRequest("Status must be one of " + STATUSES);
        int rows = jdbc.sql("UPDATE dining_tables SET status = :s, version = version + 1 WHERE id = :id AND branch_id = :b")
                .param("s", status).param("id", tableId).param("b", branchId).update();
        if (rows == 0) throw ApiException.notFound("Table not found");
        return Map.of("data", Map.of("id", tableId, "status", status));
    }

    /** Changes a table's label or seat count. */
    @PatchMapping("/{tableId}")
    @PreAuthorize("hasAuthority('PERM_tables.allocate')")
    Map<String, Object> updateTable(@PathVariable UUID branchId, @PathVariable UUID tableId, @Valid @RequestBody TableRequest body) {
        branchAccess.require(branchId);
        try {
            int rows = jdbc.sql("UPDATE dining_tables SET label = :l, capacity = :c, version = version + 1 "
                    + "WHERE id = :id AND branch_id = :b")
                    .param("l", body.label().trim()).param("c", body.capacity()).param("id", tableId).param("b", branchId).update();
            if (rows == 0) throw ApiException.notFound("Table not found");
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("A table with this label already exists");
        }
        return Map.of("data", Map.of("id", tableId));
    }

    /** Removes a table. Only an available table can be removed, so no guest is seated at it. */
    @DeleteMapping("/{tableId}")
    @PreAuthorize("hasAuthority('PERM_tables.allocate')")
    ResponseEntity<Void> deleteTable(@PathVariable UUID branchId, @PathVariable UUID tableId) {
        branchAccess.require(branchId);
        String status = jdbc.sql("SELECT status FROM dining_tables WHERE id = :id AND branch_id = :b")
                .param("id", tableId).param("b", branchId).query(String.class).optional()
                .orElseThrow(() -> ApiException.notFound("Table not found"));
        if (!"AVAILABLE".equals(status)) throw ApiException.conflict("Only an available table can be removed");
        jdbc.sql("DELETE FROM dining_tables WHERE id = :id").param("id", tableId).update();
        return ResponseEntity.noContent().build();
    }

    /** Makes a waiter responsible for a table. The waiter must hold WAITER in this branch. */
    @PostMapping("/{tableId}/assignment")
    @PreAuthorize("hasAuthority('PERM_tables.assign')")
    @Transactional
    Map<String, Object> assign(@PathVariable UUID branchId, @PathVariable UUID tableId, @Valid @RequestBody AssignRequest body) {
        branchAccess.require(branchId);
        boolean tableHere = jdbc.sql("SELECT EXISTS (SELECT 1 FROM dining_tables WHERE id = :id AND branch_id = :b)")
                .param("id", tableId).param("b", branchId).query(Boolean.class).single();
        if (!tableHere) throw ApiException.notFound("Table not found");
        boolean isWaiter = jdbc.sql("SELECT EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "WHERE ur.user_id = :u AND ur.branch_id = :b AND ur.is_active AND r.code = 'WAITER')")
                .param("u", body.waiterUserId()).param("b", branchId).query(Boolean.class).single();
        if (!isWaiter) throw ApiException.badRequest("The selected user is not an active waiter in this branch");

        jdbc.sql("UPDATE table_assignments SET active = FALSE WHERE table_id = :t AND active").param("t", tableId).update();
        jdbc.sql("INSERT INTO table_assignments (id, table_id, waiter_user_id, assigned_by) VALUES (:id, :t, :w, :by)")
                .param("id", UUID.randomUUID()).param("t", tableId).param("w", body.waiterUserId())
                .param("by", branchAccess.currentUserId()).update();
        return Map.of("data", Map.of("tableId", tableId, "waiterUserId", body.waiterUserId()));
    }
}
