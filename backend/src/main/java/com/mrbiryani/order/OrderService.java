package com.mrbiryani.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.authorization.BranchLookup;
import com.mrbiryani.common.ApiException;
import com.mrbiryani.menu.MenuRepository;
import com.mrbiryani.menu.MenuRepository.Item;
import com.mrbiryani.order.OrderRepository.ItemRow;
import com.mrbiryani.order.OrderRepository.OrderRow;

/**
 * Online ordering. Prices, names and tax rates come from the menu on the server; anything the
 * client sends about money is ignored (the request has no price fields). Placement is idempotent per
 * customer and idempotency key.
 */
@Service
public class OrderService {

    private static final int MAX_LINES = 30;
    private static final int MAX_QTY = 50;

    private final OrderRepository orders;
    private final MenuRepository menu;
    private final BranchLookup branches;
    private final org.springframework.context.ApplicationEventPublisher events;

    public OrderService(OrderRepository orders, MenuRepository menu, BranchLookup branches,
            org.springframework.context.ApplicationEventPublisher events) {
        this.orders = orders;
        this.menu = menu;
        this.branches = branches;
        this.events = events;
    }

    public record Line(UUID menuItemId, int quantity) {}

    public record ItemView(UUID menuItemId, String name, BigDecimal unitPrice, BigDecimal taxRate, int quantity,
            BigDecimal lineSubtotal, BigDecimal lineTax) {}

    public record OrderView(UUID id, UUID branchId, UUID customerId, OrderStatus status, BigDecimal subtotal,
            BigDecimal taxTotal, BigDecimal total, Instant createdAt, List<ItemView> items) {}

    public record PlaceResult(OrderView order, boolean created) {}

    @Transactional
    public PlaceResult place(UUID customerId, UUID branchId, String idempotencyKey, List<Line> lines) {
        branches.requireActive(branchId);
        String fingerprint = fingerprint(branchId, lines);

        var existing = orders.findByIdempotencyKey(customerId, idempotencyKey);
        if (existing.isPresent()) {
            if (!existing.get().fingerprint().equals(fingerprint)) {
                throw ApiException.conflict("Idempotency-Key was already used for a different order");
            }
            return new PlaceResult(view(existing.get()), false);
        }

        validateLines(lines);
        Map<UUID, Item> catalogue = new HashMap<>();
        for (Item i : menu.findItems(lines.stream().map(Line::menuItemId).toList())) catalogue.put(i.id(), i);

        List<ItemRow> rows = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        for (Line line : lines) {
            Item item = catalogue.get(line.menuItemId());
            if (item == null) throw ApiException.badRequest("Unknown menu item: " + line.menuItemId());
            if (!item.available()) throw ApiException.badRequest(item.name() + " is currently unavailable");
            BigDecimal lineSub = item.price().multiply(BigDecimal.valueOf(line.quantity())).setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTax = lineSub.multiply(item.taxRate()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            rows.add(new ItemRow(item.id(), item.name(), item.price(), item.taxRate(), line.quantity(), lineSub, lineTax));
            subtotal = subtotal.add(lineSub);
            tax = tax.add(lineTax);
        }
        BigDecimal total = subtotal.add(tax);

        UUID id = UUID.randomUUID();
        orders.insertOrder(id, branchId, customerId, subtotal, tax, total, idempotencyKey, fingerprint);
        for (ItemRow row : rows) orders.insertItem(id, row.menuItemId(), row);
        orders.insertHistory(id, null, OrderStatus.PLACED, customerId);
        events.publishEvent(new OrderStatusChanged(branchId, id, OrderStatus.PLACED.name(), Instant.now()));
        return new PlaceResult(view(orders.findById(id).orElseThrow()), true);
    }

    public OrderView get(UUID id) {
        return view(orders.findById(id).orElseThrow(() -> ApiException.notFound("Order not found")));
    }

    public List<OrderView> listForCustomer(UUID customerId) {
        return orders.listForCustomer(customerId).stream().map(this::view).toList();
    }

    public List<OrderView> listForBranch(UUID branchId, OrderStatus status) {
        return orders.listForBranch(branchId, status).stream().map(this::view).toList();
    }

    /**
     * Moves an order along its state machine. The caller has already checked who may act on the
     * order. Customers may only cancel their own PLACED order; staff need orders.update (or
     * orders.cancel for cancellation).
     */
    @Transactional
    public OrderView changeStatus(UUID orderId, OrderStatus to, UUID actorId, boolean customerActor,
            boolean canUpdate, boolean canCancel) {
        OrderRow row = orders.findById(orderId).orElseThrow(() -> ApiException.notFound("Order not found"));

        if (customerActor) {
            if (!row.customerId().equals(actorId)) throw ApiException.notFound("Order not found");
            if (to != OrderStatus.CANCELLED || row.status() != OrderStatus.PLACED) {
                throw ApiException.conflict("This order can no longer be cancelled by the customer");
            }
        } else if (to == OrderStatus.CANCELLED) {
            if (!canCancel) throw ApiException.forbidden("Not allowed to cancel orders");
        } else if (!canUpdate) {
            throw ApiException.forbidden("Not allowed to change order status");
        }

        if (!row.status().canMoveTo(to)) {
            throw ApiException.conflict("Cannot move order from " + row.status() + " to " + to);
        }
        if (!orders.casStatus(orderId, row.status(), to, row.version())) {
            throw ApiException.conflict("Order was changed by someone else; reload and try again");
        }
        orders.insertHistory(orderId, row.status(), to, actorId);
        events.publishEvent(new OrderStatusChanged(row.branchId(), orderId, to.name(), Instant.now()));
        return get(orderId);
    }

    private void validateLines(List<Line> lines) {
        if (lines == null || lines.isEmpty()) throw ApiException.badRequest("Order must contain at least one item");
        if (lines.size() > MAX_LINES) throw ApiException.badRequest("Too many lines in one order");
        java.util.Set<UUID> seen = new java.util.HashSet<>();
        for (Line l : lines) {
            if (l.menuItemId() == null) throw ApiException.badRequest("menuItemId is required");
            if (l.quantity() < 1 || l.quantity() > MAX_QTY) {
                throw ApiException.badRequest("Quantity must be between 1 and " + MAX_QTY);
            }
            if (!seen.add(l.menuItemId())) throw ApiException.badRequest("Each menu item may appear only once");
        }
    }

    /** Stable request fingerprint: branch plus sorted item/quantity pairs. */
    static String fingerprint(UUID branchId, List<Line> lines) {
        String items = lines == null ? "" : lines.stream()
                .sorted(Comparator.comparing(l -> String.valueOf(l.menuItemId())))
                .map(l -> l.menuItemId() + "x" + l.quantity())
                .collect(Collectors.joining(","));
        return branchId + "|" + items;
    }

    private OrderView view(OrderRow o) {
        List<ItemView> items = orders.items(o.id()).stream()
                .map(i -> new ItemView(i.menuItemId(), i.name(), i.unitPrice(), i.taxRate(), i.quantity(),
                        i.lineSubtotal(), i.lineTax()))
                .toList();
        return new OrderView(o.id(), o.branchId(), o.customerId(), o.status(), o.subtotal(), o.taxTotal(), o.total(),
                o.createdAt(), items);
    }
}
