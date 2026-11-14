package com.mrbiryani.inventory;

import java.math.BigDecimal;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.BranchAccess;
import com.mrbiryani.common.ApiException;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Stock levels and expenses for one branch. Every change is recorded with who made it. */
@RestController
@RequestMapping("/api/v1/branches/{branchId}")
public class InventoryController {

    public record ItemRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Size(max = 16) String unit,
            @NotNull @DecimalMin("0") BigDecimal reorderLevel) {}

    public record MovementRequest(@NotNull BigDecimal delta, @NotBlank @Size(max = 200) String reason) {}

    public record ExpenseRequest(@NotBlank @Size(max = 40) String category, @NotNull @DecimalMin("0.01") BigDecimal amount,
            @NotBlank @Size(max = 300) String description) {}

    public record ExpenseDecision(@NotNull Boolean approve) {}

    private final JdbcClient jdbc;
    private final BranchAccess branchAccess;

    public InventoryController(JdbcClient jdbc, BranchAccess branchAccess) {
        this.jdbc = jdbc;
        this.branchAccess = branchAccess;
    }

    public record ItemView(UUID id, String name, String unit, BigDecimal quantity, BigDecimal reorderLevel, boolean lowStock) {}

    @GetMapping("/inventory")
    @PreAuthorize("hasAuthority('PERM_inventory.read')")
    Map<String, Object> items(@PathVariable UUID branchId) {
        branchAccess.require(branchId);
        List<ItemView> items = jdbc.sql("SELECT id, name, unit, quantity, reorder_level FROM inventory_items "
                + "WHERE branch_id = :b ORDER BY name")
                .param("b", branchId)
                .query((rs, i) -> {
                    BigDecimal qty = rs.getBigDecimal("quantity");
                    BigDecimal reorder = rs.getBigDecimal("reorder_level");
                    return new ItemView(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("unit"),
                            qty, reorder, qty.compareTo(reorder) <= 0);
                })
                .list();
        return Map.of("data", items);
    }

    @PostMapping("/inventory")
    @PreAuthorize("hasAuthority('PERM_inventory.update')")
    Map<String, Object> createItem(@PathVariable UUID branchId, @Valid @RequestBody ItemRequest body) {
        branchAccess.require(branchId);
        UUID id = UUID.randomUUID();
        try {
            jdbc.sql("INSERT INTO inventory_items (id, branch_id, name, unit, reorder_level) VALUES (:id, :b, :n, :u, :r)")
                    .param("id", id).param("b", branchId).param("n", body.name().trim()).param("u", body.unit().trim())
                    .param("r", body.reorderLevel()).update();
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("An item with this name already exists in the branch");
        }
        return Map.of("data", Map.of("id", id));
    }

    /** Stock adjustment. Negative stock is refused here and by a database check. */
    @PostMapping("/inventory/{itemId}/movements")
    @PreAuthorize("hasAuthority('PERM_inventory.adjust')")
    @Transactional
    Map<String, Object> adjust(@PathVariable UUID branchId, @PathVariable UUID itemId, @Valid @RequestBody MovementRequest body) {
        branchAccess.require(branchId);
        if (body.delta().signum() == 0) throw ApiException.badRequest("Delta must not be zero");
        int rows = jdbc.sql("UPDATE inventory_items SET quantity = quantity + :d WHERE id = :id AND branch_id = :b "
                + "AND quantity + :d >= 0")
                .param("d", body.delta()).param("id", itemId).param("b", branchId).update();
        if (rows == 0) {
            boolean exists = jdbc.sql("SELECT EXISTS (SELECT 1 FROM inventory_items WHERE id = :id AND branch_id = :b)")
                    .param("id", itemId).param("b", branchId).query(Boolean.class).single();
            throw exists ? ApiException.conflict("Not enough stock for this adjustment")
                    : ApiException.notFound("Inventory item not found");
        }
        jdbc.sql("INSERT INTO inventory_movements (id, item_id, delta, reason, actor_id) VALUES (:id, :item, :d, :r, :actor)")
                .param("id", UUID.randomUUID()).param("item", itemId).param("d", body.delta())
                .param("r", body.reason().trim()).param("actor", branchAccess.currentUserId()).update();
        return Map.of("data", Map.of("itemId", itemId, "adjusted", body.delta()));
    }

    @PostMapping("/expenses")
    @PreAuthorize("hasAuthority('PERM_expenses.create')")
    ResponseEntity<Map<String, Object>> createExpense(@PathVariable UUID branchId, @Valid @RequestBody ExpenseRequest body) {
        branchAccess.require(branchId);
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO expenses (id, branch_id, category, amount, description, created_by) "
                + "VALUES (:id, :b, :c, :a, :d, :actor)")
                .param("id", id).param("b", branchId).param("c", body.category().trim())
                .param("a", body.amount()).param("d", body.description().trim())
                .param("actor", branchAccess.currentUserId()).update();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id, "status", "PENDING")));
    }

    @GetMapping("/expenses")
    @PreAuthorize("hasAuthority('PERM_expenses.read')")
    Map<String, Object> expenses(@PathVariable UUID branchId) {
        branchAccess.require(branchId);
        return Map.of("data", jdbc.sql("SELECT id, category, amount, description, status, created_by, approved_by, created_at "
                + "FROM expenses WHERE branch_id = :b ORDER BY created_at DESC LIMIT 200").param("b", branchId).query().listOfRows());
    }

    /** The person who recorded an expense cannot approve it. */
    @PostMapping("/expenses/{expenseId}/decision")
    @PreAuthorize("hasAuthority('PERM_expenses.approve')")
    @Transactional
    Map<String, Object> decideExpense(@PathVariable UUID branchId, @PathVariable UUID expenseId,
            @Valid @RequestBody ExpenseDecision body) {
        branchAccess.require(branchId);
        UUID actor = branchAccess.currentUserId();
        var row = jdbc.sql("SELECT status, created_by FROM expenses WHERE id = :id AND branch_id = :b FOR UPDATE")
                .param("id", expenseId).param("b", branchId)
                .query((rs, i) -> new Object[] {rs.getString("status"), rs.getObject("created_by", UUID.class)})
                .optional().orElseThrow(() -> ApiException.notFound("Expense not found"));
        if (!"PENDING".equals(row[0])) throw ApiException.conflict("This expense has already been decided");
        if (row[1].equals(actor)) throw ApiException.forbidden("You cannot approve an expense you recorded");
        jdbc.sql("UPDATE expenses SET status = :s, approved_by = :actor, decided_at = now() WHERE id = :id")
                .param("s", body.approve() ? "APPROVED" : "REJECTED").param("actor", actor).param("id", expenseId).update();
        return Map.of("data", Map.of("id", expenseId, "status", body.approve() ? "APPROVED" : "REJECTED"));
    }
}
