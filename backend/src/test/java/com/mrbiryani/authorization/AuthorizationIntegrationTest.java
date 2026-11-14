package com.mrbiryani.authorization;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class AuthorizationIntegrationTest {

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

    /** Creates an active staff user with one role at one branch and returns a valid access token. */
    private String staffWithRole(String roleCode, UUID branchId) throws Exception {
        UUID userId = UUID.randomUUID();
        String email = roleCode.toLowerCase() + "-" + userId + "@example.com";
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :email, 'Test Staff', :hash)")
                .param("id", userId).param("email", email).param("hash", encoder.encode("staff-password-1")).update();
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id, branch_id) "
                + "SELECT :rid, :uid, r.id, :branch FROM roles r WHERE r.code = :code")
                .param("rid", UUID.randomUUID()).param("uid", userId).param("branch", branchId)
                .param("code", roleCode).update();
        MvcResult login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"staff-password-1\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@example.com\",\"password\":\"ChangeMe-Admin-123\"}"))
                .andExpect(status().isOk()).andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");
    }

    @Test
    void anonymousRequestsGetUnauthorized() throws Exception {
        mvc.perform(get("/api/v1/roles")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/branches/" + mainBranch + "/staff")).andExpect(status().isUnauthorized());
    }

    @Test
    void onlyAdminCanReadRoleTemplates() throws Exception {
        mvc.perform(get("/api/v1/roles").header("Authorization", "Bearer " + staffWithRole("CUSTOMER", null)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/roles").header("Authorization", "Bearer " + staffWithRole("MANAGER", mainBranch)))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/roles").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$[?(@.code=='MANAGER')].permissions[0]").exists());
    }

    @Test
    void managerSeesStaffOnlyInAssignedBranch() throws Exception {
        String manager = staffWithRole("MANAGER", mainBranch);
        mvc.perform(get("/api/v1/branches/" + mainBranch + "/staff").header("Authorization", "Bearer " + manager))
                .andExpect(status().isOk());
        // Same permission, different branch: must be indistinguishable from a missing branch.
        mvc.perform(get("/api/v1/branches/" + northBranch + "/staff").header("Authorization", "Bearer " + manager))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
        mvc.perform(get("/api/v1/branches/" + UUID.randomUUID() + "/staff").header("Authorization", "Bearer " + manager))
                .andExpect(status().isNotFound());
    }

    @Test
    void roleWithoutStaffReadIsDeniedEvenInItsBranch() throws Exception {
        // Captain has no staff-account access (docs/rbac.md section 4).
        String captain = staffWithRole("CAPTAIN", mainBranch);
        mvc.perform(get("/api/v1/branches/" + mainBranch + "/staff").header("Authorization", "Bearer " + captain))
                .andExpect(status().isForbidden());
    }

    @Test
    void permissionRevokedInDatabaseTakesEffectOnNextRequest() throws Exception {
        String manager = staffWithRole("MANAGER", mainBranch);
        mvc.perform(get("/api/v1/branches/" + mainBranch + "/staff").header("Authorization", "Bearer " + manager))
                .andExpect(status().isOk());

        // Deactivate the assignment directly; the still-valid access token must stop working.
        jdbc.sql("UPDATE user_roles SET is_active = FALSE WHERE branch_id = :b AND user_id IN "
                + "(SELECT ur.user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.code = 'MANAGER' "
                + "AND ur.branch_id = :b AND ur.is_active)").param("b", mainBranch).update();
        mvc.perform(get("/api/v1/branches/" + mainBranch + "/staff").header("Authorization", "Bearer " + manager))
                .andExpect(status().isForbidden());
    }
}
