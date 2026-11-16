package com.mrbiryani.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
class FeedbackIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;
    @Autowired PasswordEncoder encoder;

    private String staff(String role) throws Exception {
        UUID userId = UUID.randomUUID();
        String email = role.toLowerCase() + "-" + userId + "@example.com";
        UUID branch = jdbc.sql("SELECT id FROM branches WHERE code = 'MAIN'").query(UUID.class).single();
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :e, 'Staff', :h)")
                .param("id", userId).param("e", email).param("h", encoder.encode("staff-password-1")).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id) SELECT :rid, :u, r.id, :b FROM roles r WHERE r.code = :c")
                .param("rid", UUID.randomUUID()).param("u", userId).param("b", branch).param("c", role).update();
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"staff-password-1\"}")).andReturn();
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    @Test
    void reviewsStayHiddenUntilStaffApproveThem() throws Exception {
        String comment = "Review-" + UUID.randomUUID();
        mvc.perform(post("/api/v1/reviews").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Asha\",\"rating\":5,\"category\":\"Food Quality\",\"comment\":\"" + comment + "\"}"))
                .andExpect(status().isCreated());

        MvcResult before = mvc.perform(get("/api/v1/reviews")).andReturn();
        assertThat(before.getResponse().getContentAsString()).doesNotContain(comment);

        String manager = staff("MANAGER");
        MvcResult queue = mvc.perform(get("/api/v1/feedback/reviews?status=PENDING").header("Authorization", "Bearer " + manager)).andReturn();
        String body = queue.getResponse().getContentAsString();
        assertThat(body).contains(comment);
        java.util.List<String> ids = JsonPath.read(body, "$.data[?(@.comment=='" + comment + "')].id");
        String id = ids.get(0);

        mvc.perform(get("/api/v1/feedback/reviews").header("Authorization", "Bearer " + staff("CASHIER")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/feedback/reviews/" + id + "/decision").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + staff("CASHIER")).content("{\"approve\":true}"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/feedback/reviews/" + id + "/decision").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager).content("{\"approve\":true}"))
                .andExpect(status().isOk());
        assertThat(mvc.perform(get("/api/v1/reviews")).andReturn().getResponse().getContentAsString()).contains(comment);

        mvc.perform(post("/api/v1/feedback/reviews/" + id + "/decision").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager).content("{\"approve\":false}"))
                .andExpect(status().isConflict());
    }

    @Test
    void enquiriesAreReadableByStaffWhoHoldFeedbackRead() throws Exception {
        String message = "Enquiry-" + UUID.randomUUID();
        mvc.perform(post("/api/v1/enquiries").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Ravi\",\"email\":\"ravi@example.com\",\"message\":\"" + message + "\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/feedback/enquiries").header("Authorization", "Bearer " + staff("MANAGER")))
                .andExpect(status().isOk());
        String body = mvc.perform(get("/api/v1/feedback/enquiries").header("Authorization", "Bearer " + staff("MANAGER")))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).contains(message);
    }
}
