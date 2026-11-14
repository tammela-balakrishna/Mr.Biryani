package com.mrbiryani.order;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.AuthorizationRepository;
import com.mrbiryani.authorization.BranchAccess;
import com.mrbiryani.common.ApiException;
import com.mrbiryani.order.OrderService.Line;
import com.mrbiryani.order.OrderService.OrderView;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1")
public class OrderController {

    public record LineRequest(@NotNull UUID menuItemId, @NotNull Integer quantity) {}

    public record PlaceOrderRequest(@NotNull UUID branchId, @NotEmpty List<@NotNull LineRequest> items) {}

    public record StatusRequest(@NotBlank String status) {}

    private final OrderService orders;
    private final BranchAccess branchAccess;
    private final AuthorizationRepository authRepo;

    public OrderController(OrderService orders, BranchAccess branchAccess, AuthorizationRepository authRepo) {
        this.orders = orders;
        this.branchAccess = branchAccess;
        this.authRepo = authRepo;
    }

    @PostMapping("/orders")
    @PreAuthorize("hasAuthority('PERM_orders.create_own')")
    ResponseEntity<Map<String, Object>> place(@Valid @RequestBody PlaceOrderRequest body,
            @RequestHeader("Idempotency-Key") @NotBlank @Size(min = 8, max = 64) String idempotencyKey) {
        List<Line> lines = body.items().stream().map(l -> new Line(l.menuItemId(), l.quantity())).toList();
        var result = orders.place(branchAccess.currentUserId(), body.branchId(), idempotencyKey, lines);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(Map.of("data", result.order()));
    }

    @GetMapping("/orders")
    @PreAuthorize("hasAuthority('PERM_orders.read_own')")
    List<OrderView> mine() {
        return orders.listForCustomer(branchAccess.currentUserId());
    }

    /** The customer who placed the order, or staff with orders.read in the order's branch. Otherwise 404. */
    @GetMapping("/orders/{id}")
    @PreAuthorize("hasAuthority('PERM_orders.read_own') or hasAuthority('PERM_orders.read')")
    Map<String, Object> one(@PathVariable UUID id) {
        OrderView view = orders.get(id);
        requireViewer(view);
        return Map.of("data", view);
    }

    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("hasAuthority('PERM_orders.create_own')")
    Map<String, Object> cancelMine(@PathVariable UUID id) {
        OrderView view = orders.get(id);
        if (!view.customerId().equals(branchAccess.currentUserId())) throw ApiException.notFound("Order not found");
        return Map.of("data", orders.changeStatus(id, OrderStatus.CANCELLED, branchAccess.currentUserId(),
                true, false, false));
    }

    /** Staff status transition within the order's branch. */
    @PatchMapping("/orders/{id}/status")
    @PreAuthorize("hasAuthority('PERM_orders.update') or hasAuthority('PERM_orders.cancel')")
    Map<String, Object> changeStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest body) {
        OrderView view = orders.get(id);
        branchAccess.require(view.branchId());
        OrderStatus to = parse(body.status());
        return Map.of("data", orders.changeStatus(id, to, branchAccess.currentUserId(), false,
                branchAccess.hasPermission("orders.update"), branchAccess.hasPermission("orders.cancel")));
    }

    /** Staff view of a branch's orders, optionally filtered by status. */
    @GetMapping("/branches/{branchId}/orders")
    @PreAuthorize("hasAuthority('PERM_orders.read')")
    List<OrderView> branchOrders(@PathVariable UUID branchId, @RequestParam(required = false) String status) {
        branchAccess.require(branchId);
        return orders.listForBranch(branchId, status == null ? null : parse(status));
    }

    private void requireViewer(OrderView view) {
        UUID me = branchAccess.currentUserId();
        if (view.customerId().equals(me)) return;
        boolean staffCanSee = branchAccess.hasPermission("orders.read")
                && authRepo.hasBranchAccess(me, view.branchId());
        if (!staffCanSee) throw ApiException.notFound("Order not found");
    }

    private static OrderStatus parse(String value) {
        try {
            return OrderStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Unknown order status: " + value);
        }
    }
}
