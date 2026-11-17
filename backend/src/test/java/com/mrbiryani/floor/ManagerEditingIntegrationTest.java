package com.mrbiryani.floor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class ManagerEditingIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;

    private record Account(UUID id, String token) {}

    private UUID branchId() {
        return jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
    }

    private Account staff(String role) throws Exception {
        UUID userId = UUID.randomUUID();
        String email = role.toLowerCase() + "-" + userId + "@example.com";
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :e, :n, :h)")
                .param("id", userId).param("e", email).param("n", role + " " + userId.toString().substring(0, 6))
                .param("h", encoder.encode("staff-password-1")).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id) SELECT :rid, :u, r.id, :b FROM roles r WHERE r.code = :c")
                .param("rid", UUID.randomUUID()).param("u", userId).param("b", branchId()).param("c", role).update();
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"staff-password-1\"}")).andReturn();
        return new Account(userId, JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken"));
    }

    private String body(MvcResult r) throws Exception {
        return r.getResponse().getContentAsString();
    }

    @Test
    void managerEditsArchivesAndRemovesRecordsAndChangesRoles() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        Account manager = staff("MANAGER");
        Account cashier = staff("CASHIER");
        Account waiter = staff("WAITER");
        String base = "/api/v1/branches/" + branchId();

        // Stock: create, edit, archive.
        String item = "Item-" + suffix;
        mvc.perform(post(base + "/inventory").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"name\":\"" + item + "\",\"unit\":\"kg\",\"reorderLevel\":1}")).andExpect(status().isOk());
        String itemId = JsonPath.read(body(mvc.perform(get(base + "/inventory").header("Authorization", "Bearer " + manager.token())).andReturn()),
                "$.data[?(@.name=='" + item + "')].id").toString().replaceAll("[\\[\\]\"]", "");
        mvc.perform(patch(base + "/inventory/" + itemId).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"name\":\"" + item + "-edited\",\"unit\":\"kg\",\"reorderLevel\":2}")).andExpect(status().isOk());
        mvc.perform(delete(base + "/inventory/" + itemId).header("Authorization", "Bearer " + cashier.token())).andExpect(status().isForbidden());
        mvc.perform(delete(base + "/inventory/" + itemId).header("Authorization", "Bearer " + manager.token())).andExpect(status().isNoContent());
        assertThat(body(mvc.perform(get(base + "/inventory").header("Authorization", "Bearer " + manager.token())).andReturn())).doesNotContain(item + "-edited");

        // Expense: only the recorder can edit it, and only while pending.
        mvc.perform(post(base + "/expenses").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"category\":\"Misc\",\"amount\":100,\"description\":\"First draft\"}")).andExpect(status().isCreated());
        String expenseId = JsonPath.read(body(mvc.perform(get(base + "/expenses").header("Authorization", "Bearer " + manager.token())).andReturn()),
                "$.data[?(@.description=='First draft')].id").toString().replaceAll("[\\[\\]\"]", "");
        mvc.perform(patch(base + "/expenses/" + expenseId).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"category\":\"Misc\",\"amount\":150,\"description\":\"Final\"}")).andExpect(status().isOk());
        mvc.perform(delete(base + "/expenses/" + expenseId).header("Authorization", "Bearer " + waiter.token())).andExpect(status().isForbidden());
        mvc.perform(delete(base + "/expenses/" + expenseId).header("Authorization", "Bearer " + manager.token())).andExpect(status().isNoContent());

        // Tables: edit label, then remove while available.
        String label = "E" + suffix;
        mvc.perform(post(base + "/tables").contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"label\":\"" + label + "\",\"capacity\":2}")).andExpect(status().isCreated());
        String tableId = JsonPath.read(body(mvc.perform(get(base + "/tables").header("Authorization", "Bearer " + manager.token())).andReturn()),
                "$.data[?(@.label=='" + label + "')].id").toString().replaceAll("[\\[\\]\"]", "");
        mvc.perform(patch(base + "/tables/" + tableId).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"label\":\"" + label + "-2\",\"capacity\":4}")).andExpect(status().isOk());
        mvc.perform(delete(base + "/tables/" + tableId).header("Authorization", "Bearer " + manager.token())).andExpect(status().isNoContent());

        // Staff: a waiter becomes a captain; a manager cannot touch the role of another manager.
        mvc.perform(patch(base + "/staff/" + waiter.id()).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"role\":\"CAPTAIN\"}")).andExpect(status().isNoContent());
        assertThat(body(mvc.perform(get(base + "/staff").header("Authorization", "Bearer " + manager.token())).andReturn()))
                .contains("\"role\":\"CAPTAIN\"");
        mvc.perform(patch(base + "/staff/" + waiter.id()).contentType(MediaType.APPLICATION_JSON).header("Authorization", "Bearer " + manager.token())
                .content("{\"role\":\"ADMIN\"}")).andExpect(status().isForbidden());
    }
}
