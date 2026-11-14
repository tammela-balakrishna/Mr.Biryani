package com.mrbiryani.payments;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "JWT_SECRET=test-secret-test-secret-test-secret-123456",
        "app.auth-rate-limit-per-window=1000",
        "app.payments.zoho.webhook-secret=test-webhook-secret-123",
        "app.seed.admin-email=admin@example.com",
        "app.seed.admin-password=ChangeMe-Admin-123",
})
@AutoConfigureMockMvc
@Testcontainers
class OnlinePaymentIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;

    /** The provider is replaced by a test double: no network, no credentials. */
    @MockitoBean PaymentGateway gateway;

    private static final String SECRET = "test-webhook-secret-123";

    @BeforeEach
    void gatewayIsConfiguredAndReturnsSessions() {
        when(gateway.enabled()).thenReturn(true);
        when(gateway.createSession(any())).thenAnswer(inv -> new PaymentGateway.SessionResult(
                "zs-" + UUID.randomUUID(), "access-key-" + UUID.randomUUID(), Instant.now().plus(15, ChronoUnit.MINUTES)));
    }

    private String login(String email, String password) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    /** A customer with one order of 210.00 (2 x 100.00 plus 5% tax). Returns {token, orderId, branchId}. */
    private String[] customerOrder() throws Exception {
        String admin = login("admin@example.com", "ChangeMe-Admin-123");
        MvcResult cat = mvc.perform(post("/api/v1/menu/categories").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin).content("{\"name\":\"Pay-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String catId = JsonPath.read(cat.getResponse().getContentAsString(), "$.data.id");
        MvcResult item = mvc.perform(post("/api/v1/menu/items").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"categoryId\":\"" + catId + "\",\"name\":\"Pay item\",\"price\":100,\"taxRate\":5}"))
                .andExpect(status().isCreated()).andReturn();
        String itemId = JsonPath.read(item.getResponse().getContentAsString(), "$.data.id");
        UUID branch = jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
        String email = "pay-" + UUID.randomUUID() + "@example.com";
        MvcResult reg = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Payer\",\"email\":\"" + email + "\",\"password\":\"customer-pass-1\"}"))
                .andExpect(status().isCreated()).andReturn();
        String token = JsonPath.read(reg.getResponse().getContentAsString(), "$.data.accessToken");
        MvcResult order = mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + token).header("Idempotency-Key", "pay-order-" + UUID.randomUUID())
                .content("{\"branchId\":\"" + branch + "\",\"items\":[{\"menuItemId\":\"" + itemId + "\",\"quantity\":2}]}"))
                .andExpect(status().isCreated()).andReturn();
        return new String[] {token, JsonPath.read(order.getResponse().getContentAsString(), "$.data.id")};
    }

    private String startSession(String token, String orderId) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/orders/" + orderId + "/payment-session")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value(210.0))
                .andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.sessionId");
    }

    private String providerSessionId(String sessionId) {
        return jdbc.sql("SELECT provider_session_id FROM payment_sessions WHERE id = :id")
                .param("id", UUID.fromString(sessionId)).query(String.class).single();
    }

    private String webhook(String eventId, String providerSession, String status, String amount) {
        return "{\"event_id\":\"" + eventId + "\",\"payments_session_id\":\"" + providerSession + "\","
                + "\"payment_id\":\"pay-" + eventId + "\",\"payment_status\":\"" + status + "\",\"amount\":\"" + amount + "\"}";
    }

    @Test
    void sessionCreationReturnsTheHostedCheckoutKeyForTheExactDueAmount() throws Exception {
        String[] order = customerOrder();
        startSession(order[0], order[1]);
    }

    @Test
    void webhooksWithoutAValidSignatureAreRefused() throws Exception {
        String[] order = customerOrder();
        String session = startSession(order[0], order[1]);
        String body = webhook("evt-bad", providerSessionId(session), "SUCCESS", "210.00");
        mvc.perform(post("/api/v1/payments/webhooks/zoho").contentType(MediaType.APPLICATION_JSON)
                .header(WebhookVerifier.HEADER, "t=" + System.currentTimeMillis() + ",v=00ff").content(body))
                .andExpect(status().isUnauthorized());
        Integer payments = jdbc.sql("SELECT COUNT(*) FROM payments WHERE bill_id = (SELECT id FROM bills WHERE order_id = :o)")
                .param("o", UUID.fromString(order[1])).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(payments).isZero();
    }

    @Test
    void aVerifiedSuccessRecordsTheOnlinePaymentAndSettlesTheBill() throws Exception {
        String[] order = customerOrder();
        String session = startSession(order[0], order[1]);
        String body = webhook("evt-ok-" + UUID.randomUUID(), providerSessionId(session), "SUCCESS", "210.00");
        mvc.perform(post("/api/v1/payments/webhooks/zoho").contentType(MediaType.APPLICATION_JSON)
                .header(WebhookVerifier.HEADER, WebhookVerifier.signatureHeader(SECRET, body, System.currentTimeMillis())).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("applied"));

        String billStatus = jdbc.sql("SELECT status FROM bills WHERE order_id = :o").param("o", UUID.fromString(order[1]))
                .query(String.class).single();
        org.assertj.core.api.Assertions.assertThat(billStatus).isEqualTo("PAID");
        String method = jdbc.sql("SELECT method FROM payments WHERE provider_payment_id LIKE 'pay-evt-ok-%'")
                .query(String.class).single();
        org.assertj.core.api.Assertions.assertThat(method).isEqualTo("ONLINE");
    }

    @Test
    void redeliveredWebhooksAreAppliedOnlyOnce() throws Exception {
        String[] order = customerOrder();
        String session = startSession(order[0], order[1]);
        String body = webhook("evt-dup-" + UUID.randomUUID(), providerSessionId(session), "SUCCESS", "210.00");
        String sig = WebhookVerifier.signatureHeader(SECRET, body, System.currentTimeMillis());
        mvc.perform(post("/api/v1/payments/webhooks/zoho").contentType(MediaType.APPLICATION_JSON)
                .header(WebhookVerifier.HEADER, sig).content(body)).andExpect(jsonPath("$.result").value("applied"));
        mvc.perform(post("/api/v1/payments/webhooks/zoho").contentType(MediaType.APPLICATION_JSON)
                .header(WebhookVerifier.HEADER, sig).content(body)).andExpect(jsonPath("$.result").value("duplicate"));
        Integer count = jdbc.sql("SELECT COUNT(*) FROM payments WHERE bill_id = (SELECT id FROM bills WHERE order_id = :o)")
                .param("o", UUID.fromString(order[1])).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(count).isEqualTo(1);
    }

    @Test
    void anAmountThatDoesNotMatchTheSessionIsRefusedAndNothingIsRecorded() throws Exception {
        String[] order = customerOrder();
        String session = startSession(order[0], order[1]);
        String body = webhook("evt-short-" + UUID.randomUUID(), providerSessionId(session), "SUCCESS", "1.00");
        mvc.perform(post("/api/v1/payments/webhooks/zoho").contentType(MediaType.APPLICATION_JSON)
                .header(WebhookVerifier.HEADER, WebhookVerifier.signatureHeader(SECRET, body, System.currentTimeMillis())).content(body))
                .andExpect(status().isConflict());
        Integer count = jdbc.sql("SELECT COUNT(*) FROM payments WHERE bill_id = (SELECT id FROM bills WHERE order_id = :o)")
                .param("o", UUID.fromString(order[1])).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(count).isZero();
    }

    @Test
    void otherCustomersCannotStartAPaymentForAnOrderTheyDoNotOwn() throws Exception {
        String[] order = customerOrder();
        String[] stranger = customerOrder();
        mvc.perform(post("/api/v1/orders/" + order[1] + "/payment-session").header("Authorization", "Bearer " + stranger[0]))
                .andExpect(status().isNotFound());
    }
}
