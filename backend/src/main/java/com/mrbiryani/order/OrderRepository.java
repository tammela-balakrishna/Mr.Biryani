package com.mrbiryani.order;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class OrderRepository {

    public record OrderRow(UUID id, UUID branchId, UUID customerId, OrderStatus status, int version,
            BigDecimal subtotal, BigDecimal taxTotal, BigDecimal total, String fingerprint, Instant createdAt) {}

    public record ItemRow(UUID menuItemId, String name, BigDecimal unitPrice, BigDecimal taxRate, int quantity,
            BigDecimal lineSubtotal, BigDecimal lineTax) {}

    private static final String ORDER_COLS =
            "id, branch_id, customer_id, status, version, subtotal, tax_total, total, request_fingerprint, created_at";

    private static OrderRow mapOrder(ResultSet rs, int i) throws SQLException {
        return new OrderRow(rs.getObject("id", UUID.class), rs.getObject("branch_id", UUID.class),
                rs.getObject("customer_id", UUID.class), OrderStatus.valueOf(rs.getString("status")),
                rs.getInt("version"), rs.getBigDecimal("subtotal"), rs.getBigDecimal("tax_total"),
                rs.getBigDecimal("total"), rs.getString("request_fingerprint"),
                rs.getTimestamp("created_at").toInstant());
    }

    private final JdbcClient jdbc;

    public OrderRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insertOrder(UUID id, UUID branchId, UUID customerId, BigDecimal subtotal, BigDecimal tax,
            BigDecimal total, String idempotencyKey, String fingerprint) {
        jdbc.sql("INSERT INTO orders (id, branch_id, customer_id, status, subtotal, tax_total, total, "
                + "idempotency_key, request_fingerprint) VALUES (:id, :branch, :customer, 'PLACED', :sub, :tax, :total, :key, :fp)")
                .param("id", id).param("branch", branchId).param("customer", customerId)
                .param("sub", subtotal).param("tax", tax).param("total", total)
                .param("key", idempotencyKey).param("fp", fingerprint).update();
    }

    public void insertItem(UUID orderId, UUID menuItemId, ItemRow row) {
        jdbc.sql("INSERT INTO order_items (id, order_id, menu_item_id, item_name, unit_price, tax_rate, quantity, "
                + "line_subtotal, line_tax) VALUES (:id, :order, :menu, :name, :unit, :rate, :qty, :sub, :tax)")
                .param("id", UUID.randomUUID()).param("order", orderId).param("menu", menuItemId)
                .param("name", row.name()).param("unit", row.unitPrice()).param("rate", row.taxRate())
                .param("qty", row.quantity()).param("sub", row.lineSubtotal()).param("tax", row.lineTax()).update();
    }

    public void insertHistory(UUID orderId, OrderStatus from, OrderStatus to, UUID actorId) {
        jdbc.sql("INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_id) "
                + "VALUES (:id, :order, :from, :to, :actor)")
                .param("id", UUID.randomUUID()).param("order", orderId)
                .param("from", from == null ? null : from.name()).param("to", to.name()).param("actor", actorId).update();
    }

    public Optional<OrderRow> findById(UUID id) {
        return jdbc.sql("SELECT " + ORDER_COLS + " FROM orders WHERE id = :id").param("id", id)
                .query(OrderRepository::mapOrder).optional();
    }

    public Optional<OrderRow> findByIdempotencyKey(UUID customerId, String key) {
        return jdbc.sql("SELECT " + ORDER_COLS + " FROM orders WHERE customer_id = :c AND idempotency_key = :k")
                .param("c", customerId).param("k", key).query(OrderRepository::mapOrder).optional();
    }

    public List<OrderRow> listForCustomer(UUID customerId) {
        return jdbc.sql("SELECT " + ORDER_COLS + " FROM orders WHERE customer_id = :c ORDER BY created_at DESC LIMIT 100")
                .param("c", customerId).query(OrderRepository::mapOrder).list();
    }

    public List<OrderRow> listForBranch(UUID branchId, OrderStatus status) {
        String filter = status == null ? "" : " AND status = :status";
        var stmt = jdbc.sql("SELECT " + ORDER_COLS + " FROM orders WHERE branch_id = :b" + filter
                + " ORDER BY created_at DESC LIMIT 200").param("b", branchId);
        if (status != null) stmt = stmt.param("status", status.name());
        return stmt.query(OrderRepository::mapOrder).list();
    }

    public List<ItemRow> items(UUID orderId) {
        return jdbc.sql("SELECT menu_item_id, item_name, unit_price, tax_rate, quantity, line_subtotal, line_tax "
                + "FROM order_items WHERE order_id = :o ORDER BY item_name")
                .param("o", orderId)
                .query((rs, i) -> new ItemRow(rs.getObject("menu_item_id", UUID.class), rs.getString("item_name"),
                        rs.getBigDecimal("unit_price"), rs.getBigDecimal("tax_rate"), rs.getInt("quantity"),
                        rs.getBigDecimal("line_subtotal"), rs.getBigDecimal("line_tax")))
                .list();
    }

    /** Compare-and-set on status and version. Returns false when another writer got there first. */
    public boolean casStatus(UUID id, OrderStatus from, OrderStatus to, int expectedVersion) {
        return jdbc.sql("UPDATE orders SET status = :to, version = version + 1, updated_at = now() "
                + "WHERE id = :id AND status = :from AND version = :v")
                .param("to", to.name()).param("id", id).param("from", from.name()).param("v", expectedVersion)
                .update() == 1;
    }
}
