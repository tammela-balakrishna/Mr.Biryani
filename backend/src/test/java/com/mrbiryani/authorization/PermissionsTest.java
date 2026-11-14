package com.mrbiryani.authorization;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.Test;

class PermissionsTest {

    @Test
    void exactlySevenRolesWithDefaults() {
        assertThat(Role.values()).hasSize(7);
        assertThat(Permissions.DEFAULTS.keySet()).containsExactlyInAnyOrder(Role.values());
    }

    @Test
    void keysAreWellFormedAndUnique() {
        assertThat(Permissions.ALL).doesNotHaveDuplicates();
        for (String k : Permissions.ALL) assertThat(k).matches("^[a-z_]+(\\.[a-z_]+)+$");
        for (Set<String> s : Permissions.DEFAULTS.values()) assertThat(Permissions.ALL).containsAll(s);
    }

    @Test
    void administrationIsAdminOnly() {
        for (Role r : Role.values()) {
            if (r == Role.ADMIN) continue;
            assertThat(Permissions.DEFAULTS.get(r)).doesNotContainAnyElementsOf(Permissions.ADMIN_ONLY);
        }
    }

    @Test
    void separationOfDutiesInDefaults() {
        var d = Permissions.DEFAULTS;
        assertThat(d.get(Role.WAITER)).doesNotContain("payments.collect", "payments.refund");
        assertThat(d.get(Role.RECEPTIONIST)).doesNotContain("payments.collect", "menu.price.update");
        assertThat(d.get(Role.CASHIER)).contains("payments.refund").doesNotContain("payments.refund.approve");
        assertThat(d.get(Role.MANAGER)).contains("payments.refund.approve").doesNotContain("roles.permissions.update");
        assertThat(d.get(Role.CUSTOMER)).allMatch(k -> k.equals("menu.read") || k.endsWith("_own")
                || k.equals("recommendations.read"));
    }
}
