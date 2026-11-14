package com.mrbiryani.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.common.ApiException;

/**
 * Bills, split tenders and refunds. Every query is scoped to the branch in the request, so a bill from
 * another branch is reported as not found. Amounts are NUMERIC(12,2) and computed in BigDecimal.
 */
@Service
public class BillingService {

    public record BillView(UUID id, UUID orderId, UUID branchId, BigDecimal subtotal, BigDecimal taxTotal,
            BigDecimal total, BigDecimal paid, BigDecimal due, String status) {}

    public record PaymentView(UUID id, UUID billId, String method, BigDecimal amount, Instant createdAt) {}

    public record RefundView(UUID id, UUID paymentId, BigDecimal amount, String reason, String status) {}

    public record SalesReport(LocalDate from, LocalDate to, int bills, BigDecimal gross, BigDecimal refunds,
            BigDecimal net, Map<String, BigDecimal> byMethod) {}

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private final JdbcClient jdbc;

    public BillingService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public BillView createBill(UUID branchId, UUID orderId, UUID actorId) {
        var order = jdbc.sql("SELECT branch_id, status, subtotal, tax_total, total FROM orders WHERE id = :id AND branch_id = :b")
                .param("id", orderId).param("b", branchId)
                .query((rs, i) -> new Object[] {rs.getString("status"), rs.getBigDecimal("subtotal"),
                        rs.getBigDecimal("tax_total"), rs.getBigDecimal("total")})
                .optional().orElseThrow(() -> ApiException.notFound("Order not found"));
        if ("CANCELLED".equals(order[0])) throw ApiException.conflict("A cancelled order cannot be billed");
        if (jdbc.sql("SELECT EXISTS (SELECT 1 FROM bills WHERE order_id = :o)").param("o", orderId).query(Boolean.class).single()) {
            throw ApiException.conflict("This order already has a bill");
        }
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO bills (id, order_id, branch_id, subtotal, tax_total, total, created_by) "
                + "VALUES (:id, :o, :b, :s, :t, :total, :actor)")
                .param("id", id).param("o", orderId).param("b", branchId).param("s", order[1])
                .param("t", order[2]).param("total", order[3]).param("actor", actorId).update();
        return bill(branchId, id);
    }

    public BillView bill(UUID branchId, UUID billId) {
        return jdbc.sql("SELECT id, order_id, branch_id, subtotal, tax_total, total, status FROM bills WHERE id = :id AND branch_id = :b")
                .param("id", billId).param("b", branchId)
                .query((rs, i) -> {
                    BigDecimal total = rs.getBigDecimal("total");
                    BigDecimal paid = netPaid(rs.getObject("id", UUID.class));
                    return new BillView(rs.getObject("id", UUID.class), rs.getObject("order_id", UUID.class),
                            rs.getObject("branch_id", UUID.class), rs.getBigDecimal("subtotal"), rs.getBigDecimal("tax_total"),
                            total, paid, total.subtract(paid).max(ZERO), rs.getString("status"));
                })
                .optional().orElseThrow(() -> ApiException.notFound("Bill not found"));
    }

    /**
     * Records a tender against a bill. The bill row is locked for the duration of the transaction, so two
     * tills cannot both pay the last rupee. A repeated Idempotency-Key returns the original payment.
     */
    @Transactional
    public PaymentView recordPayment(UUID branchId, UUID billId, String method, BigDecimal amount, String idempotencyKey, UUID actorId) {
        var locked = jdbc.sql("SELECT status, total FROM bills WHERE id = :id AND branch_id = :b FOR UPDATE")
                .param("id", billId).param("b", branchId)
                .query((rs, i) -> new Object[] {rs.getString("status"), rs.getBigDecimal("total")})
                .optional().orElseThrow(() -> ApiException.notFound("Bill not found"));

        Optional<PaymentView> replay = findPaymentByKey(billId, idempotencyKey);
        if (replay.isPresent()) return replay.get();

        if (!"OPEN".equals(locked[0])) throw ApiException.conflict("This bill is already settled");
        if (!List.of("CASH", "CARD", "UPI").contains(method)) throw ApiException.badRequest("Method must be CASH, CARD or UPI");
        if (amount == null || amount.signum() <= 0) throw ApiException.badRequest("Amount must be positive");
        BigDecimal total = (BigDecimal) locked[1];
        BigDecimal due = total.subtract(netPaid(billId));
        if (amount.setScale(2).compareTo(due) > 0) {
            throw ApiException.conflict("Amount exceeds the balance due of " + due.toPlainString());
        }

        UUID paymentId = UUID.randomUUID();
        jdbc.sql("INSERT INTO payments (id, bill_id, method, amount, idempotency_key, recorded_by) "
                + "VALUES (:id, :bill, :m, :a, :k, :actor)")
                .param("id", paymentId).param("bill", billId).param("m", method)
                .param("a", amount.setScale(2)).param("k", idempotencyKey).param("actor", actorId).update();
        if (netPaid(billId).compareTo(total) >= 0) {
            jdbc.sql("UPDATE bills SET status = 'PAID' WHERE id = :id").param("id", billId).update();
        }
        return payment(paymentId);
    }

    @Transactional
    public RefundView requestRefund(UUID branchId, UUID paymentId, BigDecimal amount, String reason, UUID actorId) {
        var pay = jdbc.sql("SELECT p.amount, p.id FROM payments p JOIN bills b ON b.id = p.bill_id "
                + "WHERE p.id = :id AND b.branch_id = :b FOR UPDATE OF p")
                .param("id", paymentId).param("b", branchId)
                .query((rs, i) -> rs.getBigDecimal("amount"))
                .optional().orElseThrow(() -> ApiException.notFound("Payment not found"));
        if (amount == null || amount.signum() <= 0) throw ApiException.badRequest("Refund amount must be positive");
        BigDecimal committed = jdbc.sql("SELECT COALESCE(SUM(amount), 0) FROM refunds "
                + "WHERE payment_id = :p AND status IN ('REQUESTED', 'APPROVED')")
                .param("p", paymentId).query(BigDecimal.class).single();
        if (amount.setScale(2).compareTo(pay.subtract(committed)) > 0) {
            throw ApiException.conflict("Refund exceeds the refundable amount");
        }
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO refunds (id, payment_id, amount, reason, requested_by) VALUES (:id, :p, :a, :r, :actor)")
                .param("id", id).param("p", paymentId).param("a", amount.setScale(2)).param("r", reason.trim())
                .param("actor", actorId).update();
        return refund(id);
    }

    /** A different person than the requester must approve. The database also enforces this. */
    @Transactional
    public RefundView decideRefund(UUID branchId, UUID refundId, boolean approve, UUID actorId) {
        var row = jdbc.sql("SELECT r.status, r.requested_by, r.payment_id FROM refunds r "
                + "JOIN payments p ON p.id = r.payment_id JOIN bills b ON b.id = p.bill_id "
                + "WHERE r.id = :id AND b.branch_id = :b FOR UPDATE OF r")
                .param("id", refundId).param("b", branchId)
                .query((rs, i) -> new Object[] {rs.getString("status"), rs.getObject("requested_by", UUID.class),
                        rs.getObject("payment_id", UUID.class)})
                .optional().orElseThrow(() -> ApiException.notFound("Refund not found"));
        if (!"REQUESTED".equals(row[0])) throw ApiException.conflict("This refund has already been decided");
        if (row[1].equals(actorId)) throw ApiException.forbidden("The person who requested a refund cannot approve it");
        jdbc.sql("UPDATE refunds SET status = :s, decided_by = :actor, decided_at = now() WHERE id = :id")
                .param("s", approve ? "APPROVED" : "REJECTED").param("actor", actorId).param("id", refundId).update();
        if (approve) {
            // A refund can reopen a bill that had been fully paid.
            jdbc.sql("UPDATE bills SET status = 'OPEN' WHERE id = (SELECT p.bill_id FROM payments p WHERE p.id = :p) "
                    + "AND status = 'PAID' AND (SELECT COALESCE(SUM(amount),0) FROM payments WHERE bill_id = bills.id) "
                    + "- (SELECT COALESCE(SUM(r.amount),0) FROM refunds r JOIN payments q ON q.id = r.payment_id "
                    + "WHERE q.bill_id = bills.id AND r.status = 'APPROVED') < total")
                    .param("p", row[2]).update();
        }
        return refund(refundId);
    }

    public SalesReport sales(UUID branchId, LocalDate from, LocalDate to) {
        Instant start = from.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant end = to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        BigDecimal gross = jdbc.sql("SELECT COALESCE(SUM(total), 0) FROM bills WHERE branch_id = :b AND status = 'PAID' "
                + "AND created_at >= :s AND created_at < :e")
                .param("b", branchId).param("s", java.sql.Timestamp.from(start)).param("e", java.sql.Timestamp.from(end))
                .query(BigDecimal.class).single();
        int count = jdbc.sql("SELECT COUNT(*) FROM bills WHERE branch_id = :b AND status = 'PAID' "
                + "AND created_at >= :s AND created_at < :e")
                .param("b", branchId).param("s", java.sql.Timestamp.from(start)).param("e", java.sql.Timestamp.from(end))
                .query(Long.class).single().intValue();
        BigDecimal refunds = jdbc.sql("SELECT COALESCE(SUM(r.amount), 0) FROM refunds r JOIN payments p ON p.id = r.payment_id "
                + "JOIN bills b ON b.id = p.bill_id WHERE b.branch_id = :b AND r.status = 'APPROVED' "
                + "AND r.decided_at >= :s AND r.decided_at < :e")
                .param("b", branchId).param("s", java.sql.Timestamp.from(start)).param("e", java.sql.Timestamp.from(end))
                .query(BigDecimal.class).single();
        Map<String, BigDecimal> byMethod = new java.util.TreeMap<>();
        jdbc.sql("SELECT p.method AS method, SUM(p.amount) AS amount FROM payments p JOIN bills b ON b.id = p.bill_id "
                + "WHERE b.branch_id = :b AND p.created_at >= :s AND p.created_at < :e GROUP BY p.method")
                .param("b", branchId).param("s", java.sql.Timestamp.from(start)).param("e", java.sql.Timestamp.from(end))
                .query((rs, i) -> Map.entry(rs.getString("method"), rs.getBigDecimal("amount")))
                .list().forEach(e -> byMethod.put(e.getKey(), e.getValue()));
        return new SalesReport(from, to, count, gross, refunds, gross.subtract(refunds), byMethod);
    }

    /** Refunds in this branch with the given status (for the approval queue). */
    public List<Map<String, Object>> refundsWithStatus(UUID branchId, String status) {
        return jdbc.sql("SELECT r.id AS id, r.payment_id AS payment_id, r.amount AS amount, r.reason AS reason, "
                + "r.status AS status, r.requested_by AS requested_by, p.bill_id AS bill_id FROM refunds r "
                + "JOIN payments p ON p.id = r.payment_id JOIN bills b ON b.id = p.bill_id "
                + "WHERE b.branch_id = :b AND r.status = :s ORDER BY r.created_at LIMIT 200")
                .param("b", branchId).param("s", status).query().listOfRows();
    }

    /** Receipt: totals, every tender recorded against the bill, and approved refunds. */
    public Map<String, Object> receipt(UUID branchId, UUID billId) {
        BillView bill = bill(branchId, billId);
        List<Map<String, Object>> payments = jdbc.sql("SELECT id, method, amount, created_at FROM payments "
                + "WHERE bill_id = :b ORDER BY created_at").param("b", billId).query().listOfRows();
        List<Map<String, Object>> refunds = jdbc.sql("SELECT r.id, r.amount, r.reason, r.decided_at FROM refunds r "
                + "JOIN payments p ON p.id = r.payment_id WHERE p.bill_id = :b AND r.status = 'APPROVED' ORDER BY r.decided_at")
                .param("b", billId).query().listOfRows();
        Map<String, Object> receipt = new java.util.LinkedHashMap<>();
        receipt.put("billId", bill.id());
        receipt.put("orderId", bill.orderId());
        receipt.put("subtotal", bill.subtotal());
        receipt.put("taxTotal", bill.taxTotal());
        receipt.put("total", bill.total());
        receipt.put("paid", bill.paid());
        receipt.put("due", bill.due());
        receipt.put("status", bill.status());
        receipt.put("payments", payments);
        receipt.put("refunds", refunds);
        return receipt;
    }

    // ---- helpers ----

    private BigDecimal netPaid(UUID billId) {
        return jdbc.sql("SELECT COALESCE((SELECT SUM(amount) FROM payments WHERE bill_id = :b), 0) "
                + "- COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments p ON p.id = r.payment_id "
                + "WHERE p.bill_id = :b AND r.status = 'APPROVED'), 0)")
                .param("b", billId).query(BigDecimal.class).single();
    }

    private Optional<PaymentView> findPaymentByKey(UUID billId, String key) {
        return jdbc.sql("SELECT id FROM payments WHERE bill_id = :b AND idempotency_key = :k")
                .param("b", billId).param("k", key).query(UUID.class).optional().map(this::payment);
    }

    private PaymentView payment(UUID id) {
        return jdbc.sql("SELECT id, bill_id, method, amount, created_at FROM payments WHERE id = :id")
                .param("id", id)
                .query((rs, i) -> new PaymentView(rs.getObject("id", UUID.class), rs.getObject("bill_id", UUID.class),
                        rs.getString("method"), rs.getBigDecimal("amount"), rs.getTimestamp("created_at").toInstant()))
                .single();
    }

    private RefundView refund(UUID id) {
        return jdbc.sql("SELECT id, payment_id, amount, reason, status FROM refunds WHERE id = :id").param("id", id)
                .query((rs, i) -> new RefundView(rs.getObject("id", UUID.class), rs.getObject("payment_id", UUID.class),
                        rs.getBigDecimal("amount"), rs.getString("reason"), rs.getString("status")))
                .single();
    }
}
