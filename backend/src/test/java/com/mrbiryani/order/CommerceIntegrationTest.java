package com.mrbiryani.order;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
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
class CommerceIntegrationTest {

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
        jdbc.sql("INSERT INTO branches (id, code, name) VALUES (:id, 'NORTH', 'North Branch') ON CONFLICT (code) DO NOTHING")
                .param("id", UUID.randomUUID()).update();
        northBranch = jdbc.sql("SELECT id FROM branches WHERE code = 'NORTH'").query(UUID.class).single();
    }

    private String login(String email, String password) throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private String adminToken() throws Exception {
        return login("admin@example.com", "ChangeMe-Admin-123");
    }

    private String staffWithRole(String roleCode, UUID branchId) throws Exception {
        UUID userId = UUID.randomUUID();
        String email = roleCode.toLowerCase() + "-" + userId + "@example.com";
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :email, 'Test Staff', :hash)")
                .param("id", userId).param("email", email).param("hash", encoder.encode("staff-password-1")).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id) "
                + "SELECT :rid, :uid, r.id, :branch FROM roles r WHERE r.code = :code")
                .param("rid", UUID.randomUUID()).param("uid", userId).param("branch", branchId)
                .param("code", roleCode).update();
        return login(email, "staff-password-1");
    }

    /** Registers a customer and returns {token, id}. */
    private record Customer(String token, UUID id) {}

    private Customer newCustomer() throws Exception {
        String email = "cust-" + UUID.randomUUID() + "@example.com";
        MvcResult r = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Asha Rao\",\"email\":\"" + email + "\",\"password\":\"customer-pass-1\"}"))
                .andExpect(status().isCreated()).andReturn();
        String token = JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
        String id = JsonPath.read(r.getResponse().getContentAsString(), "$.data.user.id");
        return new Customer(token, UUID.fromString(id));
    }

    /** Creates a category and an item via the admin API; returns the item id. */
    private String menuItem(String price, String tax, boolean available) throws Exception {
        String admin = adminToken();
        String catName = "Cat-" + UUID.randomUUID();
        MvcResult cat = mvc.perform(post("/api/v1/menu/categories").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin).content("{\"name\":\"" + catName + "\",\"sortOrder\":1}"))
                .andExpect(status().isCreated()).andReturn();
        String catId = JsonPath.read(cat.getResponse().getContentAsString(), "$.data.id");
        MvcResult item = mvc.perform(post("/api/v1/menu/items").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"categoryId\":\"" + catId + "\",\"name\":\"Biryani-" + UUID.randomUUID()
                        + "\",\"price\":" + price + ",\"taxRate\":" + tax + ",\"available\":" + available + "}"))
                .andExpect(status().isCreated()).andReturn();
        return JsonPath.read(item.getResponse().getContentAsString(), "$.data.id");
    }

    private String orderBody(UUID branch, String itemId, int qty) {
        return "{\"branchId\":\"" + branch + "\",\"items\":[{\"menuItemId\":\"" + itemId + "\",\"quantity\":" + qty + "}]}";
    }

    @Test
    void adminPublishesMenuAndAnyoneCanBrowseIt() throws Exception {
        String itemId = menuItem("180.00", "5", true);
        String name = jdbc.sql("SELECT name FROM menu_items WHERE id = :id").param("id", UUID.fromString(itemId))
                .query(String.class).single();
        mvc.perform(get("/api/v1/menu")).andExpect(status().isOk())
                .andExpect(jsonPath("$.categories[*].items[*].name").value(org.hamcrest.Matchers.hasItem(name)));
    }

    @Test
    void managerCanToggleAvailabilityButNotCreateOrReprice() throws Exception {
        String itemId = menuItem("100.00", "5", true);
        String manager = staffWithRole("MANAGER", mainBranch);
        mvc.perform(patch("/api/v1/menu/items/" + itemId + "/availability").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager).content("{\"available\":false}"))
                .andExpect(status().isNoContent());
        mvc.perform(patch("/api/v1/menu/items/" + itemId + "/price").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager).content("{\"price\":1.00}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/menu/items").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager)
                .content("{\"categoryId\":\"" + UUID.randomUUID() + "\",\"name\":\"Sneaky\",\"price\":1.00}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void orderTotalsAreComputedOnTheServerAndClientPricesAreIgnored() throws Exception {
        String itemId = menuItem("200.00", "5", true);
        Customer c = newCustomer();
        // The client tries to set its own price; the field is not part of the contract and is ignored.
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "key-price-0001")
                .content("{\"branchId\":\"" + mainBranch + "\",\"items\":[{\"menuItemId\":\"" + itemId
                        + "\",\"quantity\":2,\"unitPrice\":1}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subtotal").value(400.00))
                .andExpect(jsonPath("$.data.taxTotal").value(20.00))
                .andExpect(jsonPath("$.data.total").value(420.00))
                .andExpect(jsonPath("$.data.status").value("PLACED"))
                .andExpect(jsonPath("$.data.items[0].unitPrice").value(200.00));
    }

    @Test
    void placementIsIdempotentPerKeyAndRejectsReuseWithDifferentContent() throws Exception {
        String itemId = menuItem("50.00", "5", true);
        Customer c = newCustomer();
        MvcResult first = mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "retry-key-0001")
                .content(orderBody(mainBranch, itemId, 1)))
                .andExpect(status().isCreated()).andReturn();
        String orderId = JsonPath.read(first.getResponse().getContentAsString(), "$.data.id");

        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "retry-key-0001")
                .content(orderBody(mainBranch, itemId, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(orderId));

        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "retry-key-0001")
                .content(orderBody(mainBranch, itemId, 3)))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token())
                .content(orderBody(mainBranch, itemId, 1)))
                .andExpect(status().isBadRequest()); // missing Idempotency-Key
    }

    @Test
    void unavailableItemsAndBadQuantitiesAreRejected() throws Exception {
        String soldOut = menuItem("90.00", "5", false);
        Customer c = newCustomer();
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "soldout-key-01")
                .content(orderBody(mainBranch, soldOut, 1)))
                .andExpect(status().isBadRequest());
        String ok = menuItem("90.00", "5", true);
        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "zeroqty-key-01")
                .content(orderBody(mainBranch, ok, 0)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void customersSeeOnlyTheirOwnOrdersAndCanCancelOnlyWhilePlaced() throws Exception {
        String itemId = menuItem("60.00", "5", true);
        Customer owner = newCustomer();
        Customer stranger = newCustomer();
        MvcResult placed = mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + owner.token()).header("Idempotency-Key", "own-order-0001")
                .content(orderBody(mainBranch, itemId, 2)))
                .andExpect(status().isCreated()).andReturn();
        String orderId = JsonPath.read(placed.getResponse().getContentAsString(), "$.data.id");

        mvc.perform(get("/api/v1/orders/" + orderId).header("Authorization", "Bearer " + stranger.token()))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/orders/" + orderId).header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + stranger.token()))
                .andExpect(status().isNotFound());

        mvc.perform(post("/api/v1/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
        mvc.perform(post("/api/v1/orders/" + orderId + "/cancel").header("Authorization", "Bearer " + owner.token()))
                .andExpect(status().isConflict());
    }

    @Test
    void staffMoveOrdersThroughValidTransitionsOnlyInTheirBranch() throws Exception {
        String itemId = menuItem("75.00", "5", true);
        Customer c = newCustomer();
        MvcResult placed = mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token()).header("Idempotency-Key", "staff-flow-0001")
                .content(orderBody(mainBranch, itemId, 1)))
                .andExpect(status().isCreated()).andReturn();
        String orderId = JsonPath.read(placed.getResponse().getContentAsString(), "$.data.id");
        String manager = staffWithRole("MANAGER", mainBranch);
        String otherBranchManager = staffWithRole("MANAGER", northBranch);

        mvc.perform(patch("/api/v1/orders/" + orderId + "/status").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + otherBranchManager).content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/orders/" + orderId + "/status").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager).content("{\"status\":\"SERVED\"}"))
                .andExpect(status().isConflict()); // skipping states is not allowed

        for (String next : new String[] {"ACCEPTED", "PREPARING", "READY", "SERVED", "COMPLETED"}) {
            mvc.perform(patch("/api/v1/orders/" + orderId + "/status").contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + manager).content("{\"status\":\"" + next + "\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value(next));
        }
        mvc.perform(get("/api/v1/branches/" + mainBranch + "/orders?status=COMPLETED")
                .header("Authorization", "Bearer " + manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(orderId));
        mvc.perform(get("/api/v1/branches/" + northBranch + "/orders")
                .header("Authorization", "Bearer " + manager))
                .andExpect(status().isNotFound());
    }

    @Test
    void customerReservationsFollowTheirLifecycle() throws Exception {
        Customer c = newCustomer();
        String when = Instant.now().plus(2, ChronoUnit.DAYS).toString();
        MvcResult created = mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations")
                .contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + c.token())
                .content("{\"partySize\":4,\"startsAt\":\"" + when + "\",\"notes\":\"window seat\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("REQUESTED"))
                .andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");

        mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token())
                .content("{\"partySize\":4,\"startsAt\":\"" + Instant.now().minusSeconds(3600) + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + c.token())
                .content("{\"partySize\":25,\"startsAt\":\"" + when + "\"}"))
                .andExpect(status().isBadRequest());

        // Customers cannot confirm their own reservation.
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations/" + id + "/confirm")
                .header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isForbidden());

        String manager = staffWithRole("MANAGER", mainBranch);
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations/" + id + "/confirm")
                .header("Authorization", "Bearer " + manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations/" + id + "/check-in")
                .header("Authorization", "Bearer " + manager))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CHECKED_IN"));

        // Checked-in reservations cannot be cancelled.
        mvc.perform(post("/api/v1/reservations/" + id + "/cancel").header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/reservations/mine").header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id));
    }

    @Test
    void customerCanCancelAnOpenReservationAndStaffBookingsUseTheBranchRules() throws Exception {
        Customer c = newCustomer();
        String when = Instant.now().plus(3, ChronoUnit.DAYS).toString();
        MvcResult created = mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations")
                .contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + c.token())
                .content("{\"partySize\":2,\"startsAt\":\"" + when + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String id = JsonPath.read(created.getResponse().getContentAsString(), "$.data.id");
        mvc.perform(post("/api/v1/reservations/" + id + "/cancel").header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        String manager = staffWithRole("MANAGER", mainBranch);
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/reservations").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager)
                .content("{\"partySize\":6,\"startsAt\":\"" + when + "\",\"guestName\":\"Mr. Iyer\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        mvc.perform(get("/api/v1/branches/" + mainBranch + "/reservations?date=" + when.substring(0, 10))
                .header("Authorization", "Bearer " + manager))
                .andExpect(status().isOk());
    }
}
