package com.mrbiryani.realtime;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.security.Principal;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.crypto.password.PasswordEncoder;
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
        "app.seed.admin-email=admin@example.com",
        "app.seed.admin-password=ChangeMe-Admin-123",
})
@AutoConfigureMockMvc
@Testcontainers
class RealtimeIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired StompAuthInterceptor interceptor;

    @MockitoBean SimpMessagingTemplate messaging;

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

    /** Runs a STOMP CONNECT through the interceptor and returns the principal it attached (or throws). */
    private Principal connect(String authorizationHeader) {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorizationHeader != null) acc.setNativeHeader("Authorization", authorizationHeader);
        acc.setLeaveMutable(true);
        Message<byte[]> msg = MessageBuilder.createMessage(new byte[0], acc.getMessageHeaders());
        Message<?> out = interceptor.preSend(msg, null);
        return StompHeaderAccessor.wrap(out).getUser();
    }

    private void subscribe(Principal user, String destination) {
        StompHeaderAccessor acc = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        acc.setDestination(destination);
        acc.setUser(user);
        acc.setLeaveMutable(true);
        interceptor.preSend(MessageBuilder.createMessage(new byte[0], acc.getMessageHeaders()), null);
    }

    @Test
    void connectRequiresAValidBearerToken() {
        assertThatThrownBy(() -> connect(null)).isInstanceOf(MessageDeliveryException.class);
        assertThatThrownBy(() -> connect("Bearer not-a-jwt")).isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void connectAttachesTheAuthenticatedUser() throws Exception {
        String token = login("admin@example.com", "ChangeMe-Admin-123");
        Principal p = connect("Bearer " + token);
        org.assertj.core.api.Assertions.assertThat(p).isNotNull();
        subscribe(p, "/topic/branches/" + mainBranch + "/kitchen"); // admin: allowed, must not throw
    }

    @Test
    void kitchenTopicNeedsKitchenPermissionAndBranchAssignment() throws Exception {
        Principal waiter = connect("Bearer " + staffWithRole("WAITER", mainBranch));
        Principal cashier = connect("Bearer " + staffWithRole("CASHIER", mainBranch));
        Principal managerNorth = connect("Bearer " + staffWithRole("MANAGER", northBranch));
        Principal managerMain = connect("Bearer " + staffWithRole("MANAGER", mainBranch));
        String kitchen = "/topic/branches/" + mainBranch + "/kitchen";

        subscribe(waiter, kitchen); // waiters have kitchen.orders.read in their branch
        subscribe(managerMain, kitchen);
        assertThatThrownBy(() -> subscribe(cashier, kitchen)).isInstanceOf(MessageDeliveryException.class);
        assertThatThrownBy(() -> subscribe(managerNorth, kitchen)).isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void unknownTopicsAreRejected() throws Exception {
        Principal admin = connect("Bearer " + login("admin@example.com", "ChangeMe-Admin-123"));
        assertThatThrownBy(() -> subscribe(admin, "/topic/everything")).isInstanceOf(MessageDeliveryException.class);
        assertThatThrownBy(() -> subscribe(admin, "/user/queue/private")).isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void placingAnOrderNotifiesTheKitchenAfterTheCommit() throws Exception {
        String admin = login("admin@example.com", "ChangeMe-Admin-123");
        MvcResult cat = mvc.perform(post("/api/v1/menu/categories").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin).content("{\"name\":\"Rt-" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andReturn();
        String catId = JsonPath.read(cat.getResponse().getContentAsString(), "$.data.id");
        MvcResult item = mvc.perform(post("/api/v1/menu/items").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"categoryId\":\"" + catId + "\",\"name\":\"Live\",\"price\":30}"))
                .andExpect(status().isCreated()).andReturn();
        String itemId = JsonPath.read(item.getResponse().getContentAsString(), "$.data.id");

        String email = "rt-" + UUID.randomUUID() + "@example.com";
        String customer = JsonPath.read(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Rt Customer\",\"email\":\"" + email + "\",\"password\":\"customer-pass-1\"}"))
                .andReturn().getResponse().getContentAsString(), "$.data.accessToken");

        mvc.perform(post("/api/v1/orders").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + customer).header("Idempotency-Key", "rt-order-0001")
                .content("{\"branchId\":\"" + mainBranch + "\",\"items\":[{\"menuItemId\":\"" + itemId + "\",\"quantity\":1}]}"))
                .andExpect(status().isCreated());

        verify(messaging, timeout(2000)).convertAndSend(eq("/topic/branches/" + mainBranch + "/kitchen"), any(Object.class));
        verify(messaging, timeout(2000)).convertAndSend(eq("/topic/branches/" + mainBranch + "/orders"), any(Object.class));
    }
}
