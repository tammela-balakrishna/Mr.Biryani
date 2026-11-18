
package com.mrbiryani.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.authorization.BranchLookup;
import com.mrbiryani.common.ApiException;
import com.mrbiryani.menu.MenuRepository;
import com.mrbiryani.menu.MenuRepository.Item;
import com.mrbiryani.order.OrderRepository.ItemRow;
import com.mrbiryani.order.OrderRepository.OrderRow;

@Service
public class OrderService {

    private static final int MAX_LINES = 30;
    private static final int MAX_QTY = 50;

    private final OrderRepository orders;
    private final MenuRepository menu;
    private final BranchLookup branches;
    private final JdbcClient jdbc;
    private final ApplicationEventPublisher events;

    public OrderService(
            OrderRepository orders,
            MenuRepository menu,
            BranchLookup branches,
            JdbcClient jdbc,
            ApplicationEventPublisher events
    ) {
        this.orders = orders;
        this.menu = menu;
        this.branches = branches;
        this.jdbc = jdbc;
        this.events = events;
    }

    public record Line(UUID menuItemId, int quantity) {}

    public record ItemView(
            UUID menuItemId,
            String name,
            BigDecimal unitPrice,
            BigDecimal taxRate,
            int quantity,
            BigDecimal lineSubtotal,
            BigDecimal lineTax
    ) {}

    public record OrderView(
            UUID id,
            UUID branchId,
            UUID customerId,
            UUID tableId,
            OrderStatus status,
            BigDecimal subtotal,
            BigDecimal taxTotal,
            BigDecimal total,
            Instant createdAt,
            List<ItemView> items
    ) {}

    public record PlaceResult(OrderView order, boolean created) {}

    private record CalculatedOrder(
            List<ItemRow> rows,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal total
    ) {}

    // 1. CUSTOMER ONLINE ORDER
    @Transactional
    public PlaceResult place(
            UUID customerId,
            UUID branchId,
            String idempotencyKey,
            List<Line> lines
    ) {
        branches.requireActive(branchId);
        validateLines(lines);

        String requestFingerprint = fingerprint(branchId, lines);

        var existing = orders.findByIdempotencyKey(customerId, idempotencyKey);

        if (existing.isPresent()) {
            OrderRow row = existing.get();

            if (!row.fingerprint().equals(requestFingerprint)) {
                throw ApiException.conflict(
                        "Idempotency-Key was already used for a different order"
                );
            }

            return new PlaceResult(view(row), false);
        }

        CalculatedOrder calculated = calculate(lines);

        UUID orderId = UUID.randomUUID();

        int inserted = orders.insertOrder(
                orderId,
                branchId,
                customerId,
                calculated.subtotal(),
                calculated.tax(),
                calculated.total(),
                idempotencyKey,
                requestFingerprint
        );

        if (inserted == 0) {
            OrderRow winner = orders.findByIdempotencyKey(
                    customerId,
                    idempotencyKey
            ).orElseThrow();

            if (!winner.fingerprint().equals(requestFingerprint)) {
                throw ApiException.conflict(
                        "Idempotency-Key was already used for a different order"
                );
            }

            return new PlaceResult(view(winner), false);
        }

        saveItems(orderId, calculated.rows());

        orders.insertHistory(
                orderId,
                null,
                OrderStatus.PLACED,
                customerId
        );

        events.publishEvent(
                new OrderStatusChanged(
                        branchId,
                        orderId,
                        OrderStatus.PLACED.name(),
                        Instant.now()
                )
        );

        return new PlaceResult(
                view(orders.findById(orderId).orElseThrow()),
                true
        );
    }

    // 2. WAITER POS ORDER FOR A TABLE
    @Transactional
    public PlaceResult placeForTable(
            UUID staffId,
            UUID branchId,
            UUID tableId,
            String idempotencyKey,
            List<Line> lines
    ) {
        branches.requireActive(branchId);
        validateLines(lines);

        // Verify that the table belongs to the requested branch.
        boolean tableBelongsToBranch = jdbc.sql(
                        "SELECT EXISTS ("
                                + "SELECT 1 FROM dining_tables "
                                + "WHERE id = :tableId AND branch_id = :branchId"
                                + ")"
                )
                .param("tableId", tableId)
                .param("branchId", branchId)
                .query(Boolean.class)
                .single();

        if (!tableBelongsToBranch) {
            throw ApiException.badRequest(
                    "The specified table does not belong to this branch"
            );
        }

        String requestFingerprint = fingerprint(
                branchId,
                tableId,
                lines
        );

        // First check whether this staff member already submitted this request.
        var existing = orders.findPosByIdempotencyKey(
                branchId,
                staffId,
                idempotencyKey
        );

        if (existing.isPresent()) {
            OrderRow row = existing.get();

            if (!row.fingerprint().equals(requestFingerprint)) {
                throw ApiException.conflict(
                        "Idempotency-Key was already used for a different POS order"
                );
            }

            return new PlaceResult(view(row), false);
        }

        CalculatedOrder calculated = calculate(lines);

        UUID orderId = UUID.randomUUID();

        int inserted = orders.insertTableOrder(
                orderId,
                branchId,
                staffId,
                tableId,
                calculated.subtotal(),
                calculated.tax(),
                calculated.total(),
                idempotencyKey,
                requestFingerprint
        );

        // Another concurrent request may have inserted the same key first.
        if (inserted == 0) {
            OrderRow winner = orders.findPosByIdempotencyKey(
                    branchId,
                    staffId,
                    idempotencyKey
            ).orElseThrow();

            if (!winner.fingerprint().equals(requestFingerprint)) {
                throw ApiException.conflict(
                        "Idempotency-Key was already used for a different POS order"
                );
            }

            return new PlaceResult(view(winner), false);
        }

        saveItems(orderId, calculated.rows());

        orders.insertHistory(
                orderId,
                null,
                OrderStatus.PLACED,
                staffId
        );

        events.publishEvent(
                new OrderStatusChanged(
                        branchId,
                        orderId,
                        OrderStatus.PLACED.name(),
                        Instant.now()
                )
        );

        return new PlaceResult(
                view(orders.findById(orderId).orElseThrow()),
                true
        );
    }

    // Shared menu validation, price calculation and tax calculation.
    private CalculatedOrder calculate(List<Line> lines) {
        Map<UUID, Item> catalogue = new HashMap<>();

        for (Item item : menu.findItems(
                lines.stream().map(Line::menuItemId).toList()
        )) {
            catalogue.put(item.id(), item);
        }

        List<ItemRow> rows = new ArrayList<>();

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;

        for (Line line : lines) {
            Item item = catalogue.get(line.menuItemId());

            if (item == null) {
                throw ApiException.badRequest(
                        "Unknown menu item: " + line.menuItemId()
                );
            }

            if (!item.available()) {
                throw ApiException.badRequest(
                        item.name() + " is currently unavailable"
                );
            }

            BigDecimal lineSubtotal = item.price()
                    .multiply(BigDecimal.valueOf(line.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal lineTax = lineSubtotal
                    .multiply(item.taxRate())
                    .divide(
                            BigDecimal.valueOf(100),
                            2,
                            RoundingMode.HALF_UP
                    );

            rows.add(
                    new ItemRow(
                            item.id(),
                            item.name(),
                            item.price(),
                            item.taxRate(),
                            line.quantity(),
                            lineSubtotal,
                            lineTax
                    )
            );

            subtotal = subtotal.add(lineSubtotal);
            tax = tax.add(lineTax);
        }

        return new CalculatedOrder(
                rows,
                subtotal,
                tax,
                subtotal.add(tax)
        );
    }

    private void saveItems(UUID orderId, List<ItemRow> rows) {
        for (ItemRow row : rows) {
            orders.insertItem(orderId, row.menuItemId(), row);
        }
    }

    public OrderView get(UUID id) {
        return view(
                orders.findById(id)
                        .orElseThrow(() -> ApiException.notFound("Order not found"))
        );
    }

    public List<OrderView> listForCustomer(UUID customerId) {
        return orders.listForCustomer(customerId)
                .stream()
                .map(this::view)
                .toList();
    }

    public List<OrderView> listForBranch(UUID branchId, OrderStatus status) {
        return orders.listForBranch(branchId, status)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public OrderView changeStatus(
            UUID orderId,
            OrderStatus to,
            UUID actorId,
            boolean customerActor,
            boolean canUpdate,
            boolean canCancel
    ) {
        OrderRow row = orders.findById(orderId)
                .orElseThrow(() -> ApiException.notFound("Order not found"));

        if (customerActor) {
            if (row.customerId() == null
                    || !row.customerId().equals(actorId)) {
                throw ApiException.notFound("Order not found");
            }

            if (to != OrderStatus.CANCELLED
                    || row.status() != OrderStatus.PLACED) {
                throw ApiException.conflict(
                        "This order can no longer be cancelled by the customer"
                );
            }
        } else if (to == OrderStatus.CANCELLED) {
            if (!canCancel) {
                throw ApiException.forbidden("Not allowed to cancel orders");
            }
        } else if (!canUpdate) {
            throw ApiException.forbidden(
                    "Not allowed to change order status"
            );
        }

        if (!row.status().canMoveTo(to)) {
            throw ApiException.conflict(
                    "Cannot move order from " + row.status() + " to " + to
            );
        }

        if (!orders.casStatus(
                orderId,
                row.status(),
                to,
                row.version()
        )) {
            throw ApiException.conflict(
                    "Order was changed by someone else; reload and try again"
            );
        }

        orders.insertHistory(
                orderId,
                row.status(),
                to,
                actorId
        );

        events.publishEvent(
                new OrderStatusChanged(
                        row.branchId(),
                        orderId,
                        to.name(),
                        Instant.now()
                )
        );

        return get(orderId);
    }

    private void validateLines(List<Line> lines) {
        if (lines == null || lines.isEmpty()) {
            throw ApiException.badRequest(
                    "Order must contain at least one item"
            );
        }

        if (lines.size() > MAX_LINES) {
            throw ApiException.badRequest(
                    "Too many lines in one order"
            );
        }

        Set<UUID> seen = new HashSet<>();

        for (Line line : lines) {
            if (line.menuItemId() == null) {
                throw ApiException.badRequest("menuItemId is required");
            }

            if (line.quantity() < 1 || line.quantity() > MAX_QTY) {
                throw ApiException.badRequest(
                        "Quantity must be between 1 and " + MAX_QTY
                );
            }

            if (!seen.add(line.menuItemId())) {
                throw ApiException.badRequest(
                        "Each menu item may appear only once"
                );
            }
        }
    }

    // Customer online-order fingerprint.
    static String fingerprint(UUID branchId, List<Line> lines) {
        String items = lines.stream()
                .sorted(Comparator.comparing(
                        line -> String.valueOf(line.menuItemId())
                ))
                .map(line -> line.menuItemId() + "x" + line.quantity())
                .collect(Collectors.joining(","));

        return branchId + "|" + items;
    }

    // POS fingerprint also includes the table ID.
    static String fingerprint(
            UUID branchId,
            UUID tableId,
            List<Line> lines
    ) {
        return branchId + "|" + tableId + "|" + fingerprintItems(lines);
    }

    private static String fingerprintItems(List<Line> lines) {
        return lines.stream()
                .sorted(Comparator.comparing(
                        line -> String.valueOf(line.menuItemId())
                ))
                .map(line -> line.menuItemId() + "x" + line.quantity())
                .collect(Collectors.joining(","));
    }

    private OrderView view(OrderRow order) {
        List<ItemView> items = orders.items(order.id())
                .stream()
                .map(item -> new ItemView(
                        item.menuItemId(),
                        item.name(),
                        item.unitPrice(),
                        item.taxRate(),
                        item.quantity(),
                        item.lineSubtotal(),
                        item.lineTax()
                ))
                .toList();

        return new OrderView(
                order.id(),
                order.branchId(),
                order.customerId(),
                order.tableId(),
                order.status(),
                order.subtotal(),
                order.taxTotal(),
                order.total(),
                order.createdAt(),
                items
        );
    }
}
