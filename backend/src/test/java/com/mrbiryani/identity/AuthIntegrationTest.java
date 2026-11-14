package com.mrbiryani.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import com.jayway.jsonpath.JsonPath;

@SpringBootTest(properties = {
        "JWT_SECRET=test-secret-test-secret-test-secret-123456",
        "COOKIE_SECURE=false",
        "app.seed.admin-email=admin@example.com",
        "app.seed.admin-password=ChangeMe-Admin-123",
        "app.auth-rate-limit-per-window=1000",
})
@AutoConfigureMockMvc
@Testcontainers
class AuthIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired JdbcClient jdbc;

    private static final String REG = """
            {"fullName":"Ravi Kumar","email":"Ravi@Example.com","password":"correct-horse-1"%s}""";

    private MvcResult register(String extra) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(REG.formatted(extra))).andReturn();
    }

    /** MockMvc does not parse cookies set via header(), so read the Set-Cookie header directly. */
    private static String refreshCookie(MvcResult r) {
        String header = r.getResponse().getHeader("Set-Cookie");
        assertThat(header).as("Set-Cookie header").startsWith("mb_refresh=");
        String value = header.substring("mb_refresh=".length(), header.indexOf(';'));
        assertThat(value).as("refresh token value").isNotBlank();
        return value;
    }

    @org.junit.jupiter.api.BeforeEach
    void resetUsers() {
        // Shared container across tests: keep only the bootstrap admin. audit_logs is append-only
        // by design and has no FK, so it is intentionally left alone.
        jdbc.sql("DELETE FROM refresh_sessions WHERE user_id IN (SELECT id FROM users WHERE email IS DISTINCT FROM 'admin@example.com')").update();
        jdbc.sql("DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email IS DISTINCT FROM 'admin@example.com')").update();
        jdbc.sql("DELETE FROM users WHERE email IS DISTINCT FROM 'admin@example.com'").update();
    }

    private static String accessToken(MvcResult r) throws Exception {
        return JsonPath.read(r.getResponse().getContentAsString(), "$.data.accessToken");
    }

    @Test
    void registrationAlwaysCreatesCustomerAndIgnoresRoleField() throws Exception {
        MvcResult r = register(",\"role\":\"ADMIN\"");
        assertThat(r.getResponse().getStatus()).isEqualTo(201);
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + accessToken(r)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.roles[0]").value("CUSTOMER"))
                .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.hasItem("orders.read_own")))
                .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("users.manage"))));
    }

    @Test
    void refreshCookieIsHttpOnlyAndStrictlyScoped() throws Exception {
        MvcResult r = register("");
        String setCookie = r.getResponse().getHeader("Set-Cookie");
        assertThat(setCookie).contains("HttpOnly", "SameSite=Strict", "Path=/api/v1/auth");
        assertThat(r.getResponse().getContentAsString()).doesNotContain("refreshToken");
    }

    @Test
    void duplicateRegistrationIsConflict() throws Exception {
        register("");
        assertThat(register("").getResponse().getStatus()).isEqualTo(409);
    }

    @Test
    void invalidInputIsRejectedWithValidationError() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"X\",\"email\":\"nope\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void untrustedOriginIsForbidden() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .header("Origin", "https://evil.example").content(REG.formatted("")))
                .andExpect(status().isForbidden());
    }

    @Test
    void loginSucceedsWithCaseInsensitiveEmailAndSameErrorForUnknownUser() throws Exception {
        register("");
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"RAVI@example.com\",\"password\":\"correct-horse-1\"}"))
                .andExpect(status().isOk());

        String wrongPw = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ravi@example.com\",\"password\":\"nope-nope-nope\"}"))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String unknown = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ghost@example.com\",\"password\":\"nope-nope-nope\"}"))
                .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        // Bodies differ only by requestId; the client-visible code and message must be identical.
        assertThat(JsonPath.<String>read(wrongPw, "$.error.message"))
                .isEqualTo(JsonPath.<String>read(unknown, "$.error.message"));
        assertThat(JsonPath.<String>read(wrongPw, "$.error.code"))
                .isEqualTo(JsonPath.<String>read(unknown, "$.error.code"));
    }

    @Test
    void refreshRotatesAndReuseRevokesWholeFamily() throws Exception {
        MvcResult reg = register("");
        String first = refreshCookie(reg);

        MvcResult rotated = mvc.perform(post("/api/v1/auth/refresh").cookie(new jakarta.servlet.http.Cookie("mb_refresh", first)))
                .andExpect(status().isOk()).andReturn();
        String second = refreshCookie(rotated);
        assertThat(second).isNotEqualTo(first);

        // Replaying the rotated token must fail and kill the newer token and the access token too.
        mvc.perform(post("/api/v1/auth/refresh").cookie(new jakarta.servlet.http.Cookie("mb_refresh", first)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(new jakarta.servlet.http.Cookie("mb_refresh", second)))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + accessToken(rotated)))
                .andExpect(status().isUnauthorized());

        Long audits = jdbc.sql("SELECT count(*) FROM audit_logs WHERE action = 'auth.refresh_reuse_detected'")
                .query(Long.class).single();
        assertThat(audits).isGreaterThanOrEqualTo(1);
    }

    @Test
    void logoutStopsAccessImmediately() throws Exception {
        MvcResult reg = register("");
        String access = accessToken(reg);
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + access))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/auth/logout").cookie(new jakarta.servlet.http.Cookie("mb_refresh", refreshCookie(reg))))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + access))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsForgedAndUnsignedTokens() throws Exception {
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer garbage"))
                .andExpect(status().isUnauthorized());
        String noneAlg = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"alg\":\"none\"}".getBytes()) + "."
                + java.util.Base64.getUrlEncoder().withoutPadding().encodeToString("{\"sub\":\"x\"}".getBytes()) + ".";
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + noneAlg))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void bootstrapAdminIsSeededWithGlobalScopeAndAllStaffPermissions() throws Exception {
        MvcResult r = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@example.com\",\"password\":\"ChangeMe-Admin-123\"}"))
                .andExpect(status().isOk()).andReturn();
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + accessToken(r)))
                .andExpect(jsonPath("$.data.roles[0]").value("ADMIN"))
                .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.hasItem("roles.manage")));
    }

    @Test
    void databaseRefusesToDeleteSystemRolesAndEditAuditLog() {
        assertThat(catchThrowable(() -> jdbc.sql("DELETE FROM roles WHERE code = 'ADMIN'").update()))
                .hasMessageContaining("cannot be deleted");
        assertThat(catchThrowable(() -> jdbc.sql("UPDATE audit_logs SET action = 'x'").update()))
                .hasMessageContaining("append-only");
    }

    private static Throwable catchThrowable(Runnable r) {
        try {
            r.run();
            return null;
        } catch (Throwable t) {
            return t;
        }
    }
}
