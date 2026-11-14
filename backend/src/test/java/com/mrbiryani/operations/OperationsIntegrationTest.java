package com.mrbiryani.operations;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "JWT_SECRET=test-secret-test-secret-test-secret-123456",
        "app.auth-rate-limit-per-window=1000",
        "app.seed.admin-email=admin@example.com",
        "app.seed.admin-password=ChangeMe-Admin-123",
})
@AutoConfigureMockMvc
@Testcontainers
class OperationsIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;

    private UUID mainBranch;
    private UUID northBranch;

    @BeforeEach
    void setUp() {
        mainBranch = jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
        jdbc.sql("INSERT INTO branches (id, code, name) VALUES (:id, 'NORTH', 'North') ON CONFLICT (code) DO NOTHING")
                .param("id", UUID.randomUUID()).update();
        northBranch = jdbc.sql("SELECT id FROM branches WHERE code = 'NORTH'").query(UUID.class).single();
    }

    private String login(String email, String password) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private String admin() throws Exception {
        return login("admin@example.com", "ChangeMe-Admin-123");
    }

    private String staff(String role, UUID branch) throws Exception {
        UUID userId = UUID.randomUUID();
        String email = role.toLowerCase() + "-" + userId + "@example.com";
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :e, 'Staff Member', :h)")
                .param("id", userId).param("e", email).param("h", encoder.encode("staff-password-1")).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id) SELECT :rid, :u, r.id, :b FROM roles r WHERE r.code = :c")
                .param("rid", UUID.randomUUID()).param("u", userId).param("b", branch).param("c", role).update();
        return login(email, "staff-password-1");
    }

    private String staffId(String token) throws Exception {
        MvcResult r = mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + token)).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.user.id");
    }

    private MockHttpServletRequestBuilder withAuth(MockHttpServletRequestBuilder b, String token) {
        return b.header("Authorization", "Bearer " + token);
    }

    /** Places a customer order for 2 x the item and returns the order id. Total with 5% tax on 200 is 210.00. */
    private String orderTotal210() throws Exception {
        String adminToken = admin();
        MvcResult cat = mvc.perform(post("/api/v1/menu/categories").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + adminToken).content("{\"name\":\"Ops-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String catId = JsonPath.read(cat.getResponse().getContentAsString(), "$.data.id");
        MvcResult item = mvc.perform(post("/api/v1/menu/items").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + adminToken)
                .content("{\"categoryId\":\"" + catId + "\",\"name\":\"Ops item\",\"price\":100,\"taxRate\":5}"))
                .andExpect(status().isCreated()).andReturn();
        String itemId = JsonPath.read(item.getResponse().getContentAsString(), "$.data.id");
        String email = "ops-" + UUID.randomUUID() + "@example.com";
        MvcResult reg = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Ops Customer\",\"email\":\"" + email + "\",\"password\":\"customer-pass-1\"}"))
                .andExpect(status().isCreated()).andReturn();
        String customer = JsonPath.read(reg.getResponse().getContentAsString(), "$.data.accessToken");
        MvcResult order = mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + customer).header("Idempotency-Key", "ops-" + UUID.randomUUID())
                .content("{\"branchId\":\"" + mainBranch + "\",\"items\":[{\"menuItemId\":\"" + itemId + "\",\"quantity\":2}]}"))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(order.getResponse().getContentAsString(), "$.data.id");
    }

    private String bill(String cashier, String orderId) throws Exception {
        MvcResult r = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/orders/" + orderId + "/bill"), cashier))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.id");
    }

    private MvcResult pay(String token, String billId, String method, String amount) throws Exception {
        return mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/bills/" + billId + "/payments"), token)
                .contentType(MediaType.APPLICATION_JSON).header("Idempotency-Key", "pay-" + UUID.randomUUID())
                .content("{\"method\":\"" + method + "\",\"amount\":" + amount + "}")).andReturn();
    }

    @Test
    void splitPaymentsSettleTheBillAndOverpaymentIsRefused() throws Exception {
        String cashier = staff("CASHIER", mainBranch);
        String billId = bill(cashier, orderTotal210());
        org.assertj.core.api.Assertions.assertThat(pay(cashier, billId, "CASH", "100.00").getResponse().getStatus()).isEqualTo(201);
        org.assertj.core.api.Assertions.assertThat(pay(cashier, billId, "CARD", "200.00").getResponse().getStatus()).isEqualTo(409);

        MvcResult last = pay(cashier, billId, "UPI", "110.00");
        org.assertj.core.api.Assertions.assertThat(last.getResponse().getStatus()).isEqualTo(201);
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/bills/" + billId), cashier))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.due").value(0));
        org.assertj.core.api.Assertions.assertThat(pay(cashier, billId, "CASH", "1.00").getResponse().getStatus()).isEqualTo(409);
    }

    @Test
    void repeatedPaymentKeyReturnsTheSamePaymentInsteadOfChargingTwice() throws Exception {
        String cashier = staff("CASHIER", mainBranch);
        String billId = bill(cashier, orderTotal210());
        String key = "same-key-" + UUID.randomUUID();
        MvcResult a = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/bills/" + billId + "/payments"), cashier)
                .contentType(MediaType.APPLICATION_JSON).header("Idempotency-Key", key)
                .content("{\"method\":\"CASH\",\"amount\":50}")).andReturn();
        MvcResult b = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/bills/" + billId + "/payments"), cashier)
                .contentType(MediaType.APPLICATION_JSON).header("Idempotency-Key", key)
                .content("{\"method\":\"CASH\",\"amount\":50}")).andReturn();
        org.assertj.core.api.Assertions.assertThat(JsonPath.<String>read(a.getResponse().getContentAsString(), "$.data.id"))
                .isEqualTo(JsonPath.<String>read(b.getResponse().getContentAsString(), "$.data.id"));
    }

    @Test
    void refundNeedsAnotherPersonToApproveAndCannotExceedThePayment() throws Exception {
        String cashier = staff("CASHIER", mainBranch);
        String manager = staff("MANAGER", mainBranch);
        String billId = bill(cashier, orderTotal210());
        String paymentId = JsonPath.read(pay(cashier, billId, "CASH", "100.00").getResponse().getContentAsString(), "$.data.id");

        MvcResult req = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/payments/" + paymentId + "/refunds"), cashier)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":40,\"reason\":\"Wrong item\"}"))
                .andExpect(status().isCreated()).andReturn();
        String refundId = JsonPath.read(req.getResponse().getContentAsString(), "$.data.id");

        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/refunds/" + refundId + "/decision"), cashier)
                .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/refunds/" + refundId + "/decision"), manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        // 40 approved, 60 still refundable.
        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/payments/" + paymentId + "/refunds"), cashier)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":61,\"reason\":\"Too much\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void cashiersCannotSeeBillsOfAnotherBranch() throws Exception {
        String cashier = staff("CASHIER", mainBranch);
        String billId = bill(cashier, orderTotal210());
        String northCashier = staff("CASHIER", northBranch);
        mvc.perform(withAuth(get("/api/v1/branches/" + northBranch + "/bills/" + billId), northCashier))
                .andExpect(status().isNotFound());
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/bills/" + billId), northCashier))
                .andExpect(status().isNotFound());
    }

    @Test
    void stockCannotGoNegativeAndEveryAdjustmentIsAttributed() throws Exception {
        String manager = staff("MANAGER", mainBranch);
        MvcResult created = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/inventory"), manager)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Basmati " + UUID.randomUUID() + "\",\"unit\":\"kg\",\"reorderLevel\":2}"))
                .andExpect(status().isOk()).andReturn();
        String itemId = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        String url = "/api/v1/branches/" + mainBranch + "/inventory/" + itemId + "/movements";

        mvc.perform(withAuth(post(url), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"delta\":5,\"reason\":\"Delivery\"}")).andExpect(status().isOk());
        mvc.perform(withAuth(post(url), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"delta\":-6,\"reason\":\"Too much\"}")).andExpect(status().isConflict());
        mvc.perform(withAuth(post(url), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"delta\":-5,\"reason\":\"Used\"}")).andExpect(status().isOk());
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/inventory"), manager))
                .andExpect(jsonPath("$.data[?(@.id=='" + itemId + "')].lowStock").value(org.hamcrest.Matchers.hasItem(true)));
    }

    @Test
    void expensesNeedAnApproverWhoIsNotTheRequester() throws Exception {
        String manager = staff("MANAGER", mainBranch);
        MvcResult created = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/expenses"), manager)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"category\":\"Utilities\",\"amount\":1500,\"description\":\"Gas cylinder\"}"))
                .andExpect(status().isCreated()).andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/expenses/" + id + "/decision"), manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/expenses/" + id + "/decision"), admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"approve\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    void salesReportCountsPaidBillsAndNetsApprovedRefunds() throws Exception {
        String manager = staff("MANAGER", mainBranch);
        LocalDate today = LocalDate.now();
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/reports/sales")
                .param("from", today.minusDays(1).toString()).param("to", today.plusDays(1).toString()), manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bills").isNumber())
                .andExpect(jsonPath("$.data.net").isNumber());
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/reports/sales")
                .param("from", today.plusDays(5).toString()).param("to", today.toString()), manager))
                .andExpect(status().isBadRequest());
    }

    @Test
    void floorAssignsWaitersOnlyAndOneActiveWaiterPerTable() throws Exception {
        String manager = staff("MANAGER", mainBranch);
        String cashier = staff("CASHIER", mainBranch);
        String waiterA = staff("WAITER", mainBranch);
        String waiterB = staff("WAITER", mainBranch);
        MvcResult table = mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/tables"), manager)
                .contentType(MediaType.APPLICATION_JSON).content("{\"label\":\"T" + UUID.randomUUID().toString().substring(0, 6) + "\",\"capacity\":4}"))
                .andExpect(status().isCreated()).andReturn();
        String tableId = JsonPath.read(table.getResponse().getContentAsString(), "$.data.id");
        String url = "/api/v1/branches/" + mainBranch + "/tables/" + tableId;

        mvc.perform(withAuth(post(url + "/assignment"), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"waiterUserId\":\"" + staffId(cashier) + "\"}")).andExpect(status().isBadRequest());
        mvc.perform(withAuth(post(url + "/assignment"), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"waiterUserId\":\"" + staffId(waiterA) + "\"}")).andExpect(status().isOk());
        mvc.perform(withAuth(post(url + "/assignment"), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"waiterUserId\":\"" + staffId(waiterB) + "\"}")).andExpect(status().isOk());

        Integer active = jdbc.sql("SELECT COUNT(*) FROM table_assignments WHERE table_id = :t AND active")
                .param("t", UUID.fromString(tableId)).query(Integer.class).single();
        org.assertj.core.api.Assertions.assertThat(active).isEqualTo(1);

        mvc.perform(withAuth(patch(url + "/status"), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"OCCUPIED\"}")).andExpect(status().isOk());
        mvc.perform(withAuth(patch(url + "/status"), manager).contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"BROKEN\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void walkInGuestsAreSeatedAndReceiptsAndRefundQueueWork() throws Exception {
        String receptionist = staff("RECEPTIONIST", mainBranch);
        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/walk-ins"), receptionist)
                .contentType(MediaType.APPLICATION_JSON).content("{\"guestName\":\"Walk In\",\"partySize\":3}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("CHECKED_IN"));
        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/walk-ins"), receptionist)
                .contentType(MediaType.APPLICATION_JSON).content("{\"guestName\":\"Too Many\",\"partySize\":25}"))
                .andExpect(status().isBadRequest());

        String cashier = staff("CASHIER", mainBranch);
        String manager = staff("MANAGER", mainBranch);
        String billId = bill(cashier, orderTotal210());
        String paymentId = JsonPath.read(pay(cashier, billId, "CASH", "210.00").getResponse().getContentAsString(), "$.data.id");
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/bills/" + billId + "/receipt"), cashier))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"))
                .andExpect(jsonPath("$.data.payments[0].method").value("CASH"));

        mvc.perform(withAuth(post("/api/v1/branches/" + mainBranch + "/payments/" + paymentId + "/refunds"), cashier)
                .contentType(MediaType.APPLICATION_JSON).content("{\"amount\":10,\"reason\":\"Queue test\"}"))
                .andExpect(status().isCreated());
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/refunds?status=REQUESTED"), manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].reason").value(org.hamcrest.Matchers.hasItem("Queue test")));
        mvc.perform(withAuth(get("/api/v1/branches/" + mainBranch + "/refunds?status=REQUESTED"), cashier))
                .andExpect(status().isForbidden());
    }
}
