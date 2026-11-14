package com.mrbiryani.identity;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {"JWT_SECRET=test-secret-test-secret-test-secret-123456", "app.auth-rate-limit-per-window=1000"})
@AutoConfigureMockMvc
@Testcontainers
class NativeAuthIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;

    @Test
    void nativeClientsGetTheRefreshTokenInTheBodyAndRotateItThere() throws Exception {
        String email = "native-" + UUID.randomUUID() + "@example.com";
        MvcResult reg = mvc.perform(post("/api/v1/auth/register").header("X-Client-Type", "native")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"App User\",\"email\":\"" + email + "\",\"password\":\"mobile-pass-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andReturn();
        String refresh = JsonPath.read(reg.getResponse().getContentAsString(), "$.data.refreshToken");

        MvcResult rotated = mvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "native")
                .contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn();
        String next = JsonPath.read(rotated.getResponse().getContentAsString(), "$.data.refreshToken");
        org.assertj.core.api.Assertions.assertThat(next).isNotEqualTo(refresh);

        // The old body token is now a replay: rejected and the family is revoked.
        mvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "native")
                .contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "native")
                .contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"" + next + "\"}"))
                .andExpect(status().isUnauthorized());
    }
}
