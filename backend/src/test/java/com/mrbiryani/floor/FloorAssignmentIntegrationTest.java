package com.mrbiryani.floor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

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

@SpringBootTest(properties = {"JWT_SECRET=test-secret-test-secret-test-secret-123456", "app.auth-rate-limit-per-window=1000"})
@AutoConfigureMockMvc
@Testcontainers
class FloorAssignmentIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;

    private record Account(UUID id, String token) {}

    private Account staff(String role) throws Exception {
        UUID userId = UUID.randomUUID();
        UUID branch = jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
        String email = role.toLowerCase() + "-" + userId + "@example.com";
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :e, :n, :h)")
                .param("id", userId).param("e", email).param("n", role + " " + userId.toString().substring(0, 6))
                .param("h", encoder.encode("staff-password-1")).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id) SELECT :rid, :u, r.id, :b FROM roles r WHERE r.code = :c")
                .param("rid", UUID.randomUUID()).param("u", userId).param("b", branch).param("c", role).update();
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"staff-password-1\"}")).andReturn();
        return new Account(userId, JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken"));
    }

    @Test
    void captainAssignsWaitersWithoutStaffAccess() throws Exception {
        UUID branch = jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
        String label = "T" + UUID.randomUUID().toString().substring(0, 7);
        Account manager = staff("MANAGER");
        Account captain = staff("CAPTAIN");
        Account cashier = staff("CASHIER");
        Account waiter = staff("WAITER");

        mvc.perform(post("/api/v1/branches/" + branch + "/tables").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager.token()).content("{\"label\":\"" + label + "\",\"capacity\":4}"))
                .andExpect(status().isCreated());

        // Captain can see the waiter list; cashier cannot.
        String list = mvc.perform(get("/api/v1/branches/" + branch + "/tables/waiters")
                .header("Authorization", "Bearer " + captain.token())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(list).contains(waiter.id().toString());
        mvc.perform(get("/api/v1/branches/" + branch + "/tables/waiters")
                .header("Authorization", "Bearer " + cashier.token())).andExpect(status().isForbidden());

        String tableId = JsonPath.read(mvc.perform(get("/api/v1/branches/" + branch + "/tables")
                .header("Authorization", "Bearer " + manager.token())).andReturn().getResponse().getContentAsString(),
                "$.data[?(@.label=='" + label + "')].id").toString().replaceAll("[\\[\\]\"]", "");

        mvc.perform(post("/api/v1/branches/" + branch + "/tables/" + tableId + "/assignment").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + captain.token()).content("{\"waiterUserId\":\"" + waiter.id() + "\"}"))
                .andExpect(status().isOk());

        String after = mvc.perform(get("/api/v1/branches/" + branch + "/tables")
                .header("Authorization", "Bearer " + captain.token())).andReturn().getResponse().getContentAsString();
        List<String> owners = JsonPath.read(after, "$.data[?(@.label=='" + label + "')].waiter_user_id");
        assertThat(owners).containsExactly(waiter.id().toString());
    }
}
