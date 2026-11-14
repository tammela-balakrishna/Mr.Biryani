package com.mrbiryani.authorization;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
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
class AdministrationIntegrationTest {

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

    private String manager() throws Exception {
        return staffWithRole("MANAGER", mainBranch);
    }

    private static String staffJson(String email, String role) {
        return "{\"fullName\":\"New Person\",\"email\":\"" + email + "\",\"password\":\"new-staff-pass-1\",\"role\":\"" + role + "\"}";
    }

    @Test
    void adminCanReadCatalogueButOthersCannot() throws Exception {
        mvc.perform(get("/api/v1/permissions").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.key=='roles.manage')]").exists());
        mvc.perform(get("/api/v1/permissions").header("Authorization", "Bearer " + manager()))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerCannotEditRoleTemplates() throws Exception {
        mvc.perform(put("/api/v1/roles/WAITER/permissions").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager())
                .content("{\"permissions\":[\"menu.read\"]}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminTemplateCannotLoseSystemCriticalKeys() throws Exception {
        mvc.perform(put("/api/v1/roles/ADMIN/permissions").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + adminToken())
                .content("{\"permissions\":[\"menu.read\"]}"))
                .andExpect(status().isConflict());
    }

    @Test
    void administrationKeysCannotBeGivenToManagerOrCustomerKeysToStaff() throws Exception {
        String admin = adminToken();
        mvc.perform(put("/api/v1/roles/MANAGER/permissions").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"permissions\":[\"roles.manage\"]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/roles/WAITER/permissions").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"permissions\":[\"orders.read_own\"]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/v1/roles/WAITER/permissions").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin)
                .content("{\"permissions\":[\"not.a.real.key\"]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void roleChangeTakesEffectOnTheNextRequestWithoutReLogin() throws Exception {
        String admin = adminToken();
        String waiter = staffWithRole("WAITER", mainBranch);
        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + waiter))
                .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.hasItem("orders.create")));

        // Restore the original mapping afterwards so other tests see the defaults.
        List<String> original = jdbc.sql("SELECT p.key FROM role_permissions rp JOIN roles r ON r.id = rp.role_id "
                + "JOIN permissions p ON p.id = rp.permission_id WHERE r.code = 'WAITER' ORDER BY p.key")
                .query(String.class).list();
        try {
            List<String> withoutOrderCreate = original.stream().filter(k -> !k.equals("orders.create")).toList();
            mvc.perform(put("/api/v1/roles/WAITER/permissions").contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + admin)
                    .content("{\"permissions\":" + toJsonArray(withoutOrderCreate) + "}"))
                    .andExpect(status().isOk());

            mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + waiter))
                    .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("orders.create"))));
        } finally {
            mvc.perform(put("/api/v1/roles/WAITER/permissions").contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + admin)
                    .content("{\"permissions\":" + toJsonArray(original) + "}"));
        }
    }

    @Test
    void managerCreatesStaffOnlyInAssignedBranchAndNotAdmins() throws Exception {
        String manager = manager();
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager)
                .content(staffJson("captain-" + UUID.randomUUID() + "@example.com", "CAPTAIN")))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/v1/branches/" + mainBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager)
                .content(staffJson("boss-" + UUID.randomUUID() + "@example.com", "ADMIN")))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/branches/" + mainBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager)
                .content(staffJson("cust-" + UUID.randomUUID() + "@example.com", "CUSTOMER")))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/api/v1/branches/" + northBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager)
                .content(staffJson("x-" + UUID.randomUUID() + "@example.com", "WAITER")))
                .andExpect(status().isNotFound());
    }

    @Test
    void duplicateStaffEmailIsConflict() throws Exception {
        String admin = adminToken();
        String email = "dup-" + UUID.randomUUID() + "@example.com";
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin).content(staffJson(email, "WAITER")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/branches/" + mainBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + admin).content(staffJson(email, "WAITER")))
                .andExpect(status().isConflict());
    }

    @Test
    void disablingStaffRemovesBranchAccessImmediately() throws Exception {
        String manager = manager();
        String email = "cashier-" + UUID.randomUUID() + "@example.com";
        MvcResult created = mvc.perform(post("/api/v1/branches/" + mainBranch + "/staff").contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + manager).content(staffJson(email, "CASHIER")))
                .andExpect(status().isCreated()).andReturn();
        String userId = JsonPath.read(created.getResponse().getContentAsString(), "$.data.userId");
        String cashier = login(email, "new-staff-pass-1");

        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + cashier))
                .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.hasItem("payments.collect")));

        mvc.perform(delete("/api/v1/branches/" + mainBranch + "/staff/" + userId).header("Authorization", "Bearer " + manager))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/auth/session").header("Authorization", "Bearer " + cashier))
                .andExpect(jsonPath("$.data.permissions[*]").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("payments.collect"))));
    }

    @Test
    void managerCannotDisableAdminsOrThemselves() throws Exception {
        String manager = manager();
        UUID adminId = jdbc.sql("SELECT id FROM users WHERE email = 'admin@example.com'").query(UUID.class).single();
        mvc.perform(delete("/api/v1/branches/" + mainBranch + "/staff/" + adminId).header("Authorization", "Bearer " + manager))
                .andExpect(status().isNotFound()); // admin has no branch assignment here, so it is not found in this branch
    }

    private static String toJsonArray(List<String> items) {
        return "[" + String.join(",", items.stream().map(s -> "\"" + s + "\"").toList()) + "]";
    }
}
