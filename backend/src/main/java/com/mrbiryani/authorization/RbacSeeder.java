package com.mrbiryani.authorization;

import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.config.AppProperties;

/**
 * Idempotent startup seed: roles, permission catalogue, baseline role mappings (only for roles
 * with none, so Admin customizations survive), the launch branch and an initial Admin if no
 * active Admin exists.
 */
@Component
public class RbacSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RbacSeeder.class);
    private final JdbcClient jdbc;
    private final AppProperties props;
    private final PasswordEncoder encoder;

    public RbacSeeder(JdbcClient jdbc, AppProperties props, PasswordEncoder encoder) {
        this.jdbc = jdbc;
        this.props = props;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRoles();
        seedPermissions();
        seedDefaultMappings();
        seedBranch();
        seedAdmin();
    }

    private void seedRoles() {
        for (Role r : Role.values()) {
            jdbc.sql("INSERT INTO roles (id, code, name, description, is_system_role) "
                    + "VALUES (:id, :code, :name, :desc, TRUE) ON CONFLICT (code) DO UPDATE "
                    + "SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now()")
                    .param("id", UUID.randomUUID()).param("code", r.name())
                    .param("name", r.displayName()).param("desc", r.description()).update();
        }
    }

    private void seedPermissions() {
        for (String key : Permissions.ALL) {
            String module = key.substring(0, key.indexOf('.'));
            jdbc.sql("INSERT INTO permissions (id, key, module, description) VALUES (:id, :key, :mod, :desc) "
                    + "ON CONFLICT (key) DO NOTHING")
                    .param("id", UUID.randomUUID()).param("key", key).param("mod", module)
                    .param("desc", key.replace('.', ' ').replace('_', ' ')).update();
        }
    }

    private void seedDefaultMappings() {
        for (Map.Entry<Role, java.util.Set<String>> e : Permissions.DEFAULTS.entrySet()) {
            long existing = jdbc.sql("SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id "
                    + "WHERE r.code = :c").param("c", e.getKey().name()).query(Long.class).single();
            if (existing > 0) continue;
            for (String key : e.getValue()) {
                jdbc.sql("INSERT INTO role_permissions (role_id, permission_id) "
                        + "SELECT r.id, p.id FROM roles r, permissions p WHERE r.code = :c AND p.key = :k "
                        + "ON CONFLICT DO NOTHING")
                        .param("c", e.getKey().name()).param("k", key).update();
            }
            log.info("Seeded {} baseline permissions for {}", e.getValue().size(), e.getKey());
        }
    }

    private void seedBranch() {
        jdbc.sql("INSERT INTO branches (id, code, name) VALUES (:id, :code, :name) ON CONFLICT (code) DO NOTHING")
                .param("id", UUID.randomUUID()).param("code", props.seed().branchCode())
                .param("name", props.seed().branchName()).update();
    }

    private void seedAdmin() {
        long activeAdmins = jdbc.sql("SELECT count(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "JOIN users u ON u.id = ur.user_id WHERE r.code = 'ADMIN' AND ur.is_active AND u.status = 'ACTIVE'")
                .query(Long.class).single();
        if (activeAdmins > 0) return;

        String email = props.seed().adminEmail();
        String password = props.seed().adminPassword();
        if (email == null || email.isBlank() || password == null || password.length() < 10) {
            log.warn("No active Admin exists. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (>=10 chars).");
            return;
        }
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO users (id, email, full_name, password_hash) VALUES (:id, :email, 'System Administrator', :hash) "
                + "ON CONFLICT (email) DO NOTHING")
                .param("id", id).param("email", email.trim().toLowerCase()).param("hash", encoder.encode(password)).update();
        UUID userId = jdbc.sql("SELECT id FROM users WHERE email = :email").param("email", email.trim().toLowerCase())
                .query(UUID.class).single();
        // branch_id NULL = GLOBAL scope.
        jdbc.sql("INSERT INTO user_roles (id, user_id, role_id) SELECT :rid, :uid, r.id FROM roles r WHERE r.code = 'ADMIN' "
                + "ON CONFLICT DO NOTHING")
                .param("rid", UUID.randomUUID()).param("uid", userId).update();
        log.warn("Created initial Admin {}. Change this password immediately.", email);
    }
}
