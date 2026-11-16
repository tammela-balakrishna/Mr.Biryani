package com.mrbiryani.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(properties = {"JWT_SECRET=test-secret-test-secret-test-secret-123456"})
@AutoConfigureMockMvc
@Testcontainers
class PublicFormsIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;

    @Test
    void enquiriesAreStoredAndValidated() throws Exception {
        mvc.perform(post("/api/v1/enquiries").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Asha\",\"email\":\"Asha@Example.com\",\"message\":\"Do you cater?\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.received").value(true));
        String stored = jdbc.sql("SELECT email FROM enquiries WHERE message = 'Do you cater?'").query(String.class).single();
        org.assertj.core.api.Assertions.assertThat(stored).isEqualTo("asha@example.com");
        mvc.perform(post("/api/v1/enquiries").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"email\":\"not-an-email\",\"message\":\"hi\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reviewsAreStoredPendingAndRatingIsBounded() throws Exception {
        mvc.perform(post("/api/v1/reviews").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Ravi\",\"rating\":5,\"category\":\"Food Quality\",\"comment\":\"Great biryani\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("PENDING"));
        mvc.perform(post("/api/v1/reviews").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Ravi\",\"rating\":6,\"category\":\"Food Quality\",\"comment\":\"x\"}"))
                .andExpect(status().isBadRequest());
    }
}
