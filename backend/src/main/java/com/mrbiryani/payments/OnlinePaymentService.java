package com.mrbiryani.payments;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.billing.BillingService;
import com.mrbiryani.common.ApiException;

import tools.jackson.databind.ObjectMapper;

/**
 * Online payment for a customer's own order. The browser is only sent to the provider's hosted page; the
 * payment is recorded when a verified webhook says it succeeded, for the exact amount of the session.
 */
@Service
public class OnlinePaymentService {

    static final String PROVIDER = "ZOHO";
    static final String CURRENCY = "INR";

    private final JdbcClient jdbc;
    private final PaymentGateway gateway;
    private final BillingService billing;
    private final ObjectMapper json;
    private final String webhookSecret;

    public OnlinePaymentService(JdbcClient jdbc, PaymentGateway gateway, BillingService billing, ObjectMapper json,
            @Value("${app.payments.zoho.webhook-secret:}") String webhookSecret) {
        this.jdbc = jdbc;
        this.gateway = gateway;
        this.billing = billing;
        this.json = json;
        this.webhookSecret = webhookSecret;
    }

    public record SessionView(UUID sessionId, String checkoutAccessKey, BigDecimal amount, Instant expiresAt) {}

    @Transactional
    public SessionView startSession(UUID orderId, UUID customerId) {
        if (!gateway.enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UNAVAILABLE", "Online payment is not configured");

        var order = jdbc.sql("SELECT branch_id, status FROM orders WHERE id = :o AND customer_id = :c")
                .param("o", orderId).param("c", customerId)
                .query((rs, i) -> new Object[] {rs.getObject("branch_id", UUID.class), rs.getString("status")})
                .optional().orElseThrow(() -> ApiException.notFound("Order not found"));
        if ("CANCELLED".equals(order[1])) throw ApiException.conflict("A cancelled order cannot be paid");

        UUID billId = jdbc.sql("SELECT id FROM bills WHERE order_id = :o").param("o", orderId).query(UUID.class).optional()
                .orElseGet(() -> billing.createBill((UUID) order[0], orderId, customerId).id());

        var bill = jdbc.sql("SELECT status, total FROM bills WHERE id = :b FOR UPDATE").param("b", billId)
                .query((rs, i) -> new Object[] {rs.getString("status"), rs.getBigDecimal("total")}).single();
        if ("PAID".equals(bill[0])) throw ApiException.conflict("This order is already paid");
        BigDecimal due = ((BigDecimal) bill[1]).subtract(netPaid(billId));
        if (due.signum() <= 0) throw ApiException.conflict("Nothing is due on this order");

        UUID sessionId = UUID.randomUUID();
        PaymentGateway.SessionResult result = gateway.createSession(new PaymentGateway.SessionRequest(
                sessionId.toString(), due, CURRENCY, "Mr. BIRIYANI order " + orderId.toString().substring(0, 8)));
        jdbc.sql("INSERT INTO payment_sessions (id, bill_id, customer_id, provider, provider_session_id, amount, currency, expires_at) "
                + "VALUES (:id, :b, :c, :p, :ps, :a, :cur, :exp)")
                .param("id", sessionId).param("b", billId).param("c", customerId).param("p", PROVIDER)
                .param("ps", result.providerSessionId()).param("a", due).param("cur", CURRENCY)
                .param("exp", java.sql.Timestamp.from(result.expiresAt())).update();
        return new SessionView(sessionId, result.checkoutAccessKey(), due, result.expiresAt());
    }

    /**
     * Applies a verified provider event. Returns a short status string for logs and tests. Any mismatch throws,
     * which rolls back the event's dedupe row too, so a corrected retry is still applied.
     */
    @Transactional
    public String handleWebhook(String rawBody, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UNAVAILABLE", "Webhook verification is not configured");
        }
        if (!WebhookVerifier.verify(webhookSecret, rawBody, signature, Instant.now())) {
            throw ApiException.unauthorized("Invalid webhook signature");
        }
        Map<?, ?> event = json.readValue(rawBody, Map.class);
        String eventId = required(event, "event_id");
        String sessionId = required(event, "payments_session_id");
        String paymentId = required(event, "payment_id");
        String status = required(event, "payment_status");
        BigDecimal amount = new BigDecimal(required(event, "amount"));

        int fresh = jdbc.sql("INSERT INTO processed_webhooks (provider, event_id) VALUES (:p, :e) ON CONFLICT DO NOTHING")
                .param("p", PROVIDER).param("e", eventId).update();
        if (fresh == 0) return "duplicate";
        if (!"SUCCESS".equalsIgnoreCase(status)) return "ignored:" + status;

        var session = jdbc.sql("SELECT id, bill_id, customer_id, amount, status FROM payment_sessions "
                + "WHERE provider_session_id = :s FOR UPDATE")
                .param("s", sessionId)
                .query((rs, i) -> new Object[] {rs.getObject("bill_id", UUID.class), rs.getObject("customer_id", UUID.class),
                        rs.getBigDecimal("amount"), rs.getString("status")})
                .optional().orElse(null);
        if (session == null) return "unknown-session";
        if (!"OPEN".equals(session[3])) return "already-applied";
        if (amount.setScale(2).compareTo(((BigDecimal) session[2]).setScale(2)) != 0) {
            throw ApiException.conflict("Webhook amount does not match the payment session");
        }

        UUID billId = (UUID) session[0];
        jdbc.sql("INSERT INTO payments (id, bill_id, method, amount, idempotency_key, recorded_by, provider, provider_payment_id) "
                + "VALUES (:id, :b, 'ONLINE', :a, :k, :c, :p, :pp)")
                .param("id", UUID.randomUUID()).param("b", billId).param("a", amount.setScale(2))
                .param("k", PROVIDER + ":" + paymentId).param("c", session[1]).param("p", PROVIDER).param("pp", paymentId)
                .update();
        jdbc.sql("UPDATE payment_sessions SET status = 'PAID' WHERE provider_session_id = :s").param("s", sessionId).update();
        BigDecimal total = jdbc.sql("SELECT total FROM bills WHERE id = :b").param("b", billId).query(BigDecimal.class).single();
        if (netPaid(billId).compareTo(total) >= 0) {
            jdbc.sql("UPDATE bills SET status = 'PAID' WHERE id = :b").param("b", billId).update();
            var orderRow = jdbc.sql("SELECT o.id, o.status, o.table_id FROM orders o JOIN bills b ON b.order_id = o.id WHERE b.id = :b")
                    .param("b", billId)
                    .query((rs, i) -> new Object[] {
                            rs.getObject("id", UUID.class),
                            rs.getString("status"),
                            rs.getObject("table_id", UUID.class)
                    })
                    .optional();
            if (orderRow.isPresent()) {
                UUID orderId = (UUID) orderRow.get()[0];
                String fromStatus = (String) orderRow.get()[1];
                UUID tableId = (UUID) orderRow.get()[2];
                jdbc.sql("UPDATE orders SET status = 'COMPLETED', updated_at = now() WHERE id = :oid").param("oid", orderId).update();
                jdbc.sql("INSERT INTO order_status_history (id, order_id, from_status, to_status, actor_id, created_at) "
                        + "VALUES (:hid, :oid, :from, 'COMPLETED', :actor, now())")
                        .param("hid", UUID.randomUUID()).param("oid", orderId).param("from", fromStatus).param("actor", session[1]).update();
                if (tableId != null) {
                    jdbc.sql("UPDATE dining_tables SET status = 'AVAILABLE', version = version + 1 WHERE id = :tid")
                            .param("tid", tableId).update();
                    jdbc.sql("UPDATE table_assignments SET active = false WHERE table_id = :tid")
                            .param("tid", tableId).update();
                }
            }
        }
        return "applied";
    }

    private BigDecimal netPaid(UUID billId) {
        return jdbc.sql("SELECT COALESCE((SELECT SUM(amount) FROM payments WHERE bill_id = :b), 0) "
                + "- COALESCE((SELECT SUM(r.amount) FROM refunds r JOIN payments p ON p.id = r.payment_id "
                + "WHERE p.bill_id = :b AND r.status = 'APPROVED'), 0)")
                .param("b", billId).query(BigDecimal.class).single();
    }

    private static String required(Map<?, ?> event, String key) {
        Object value = event.get(key);
        if (value == null || String.valueOf(value).isBlank()) {
            throw ApiException.badRequest("Webhook is missing " + key);
        }
        return String.valueOf(value);
    }

    static Duration sessionLifetime() {
        return Duration.ofMinutes(15);
    }
}
