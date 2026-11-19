package com.mrbiryani.authorization;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Version-controlled RBAC baseline (docs/rbac.md sections 3-4). Admin may later
 * customize role_permissions rows; these are the seed defaults. Scope (own,
 * assigned, branch) is enforced by policies, never by these keys alone.
 */
public final class Permissions {

    private Permissions() {}

    public static final Set<String> CUSTOMER_MODULE = Set.of(
            "customer.profile.read_own", "customer.profile.update_own", "orders.create_own", "orders.read_own",
            "orders.track_own", "reservations.manage_own", "bills.read_own", "payments.pay_own", "recommendations.read");

    public static final Set<String> ADMIN_ONLY = Set.of(
            "users.manage", "roles.manage", "roles.permissions.update", "permissions.manage",
            "settings.manage", "integrations.manage", "security.manage", "chat.knowledge.read", "chat.knowledge.manage", "chat.knowledge.publish");

    /** Every permission key in the catalogue. */
    public static final List<String> ALL = List.of(
            "profile.read_own", "profile.update_own", "menu.read", "menu.create", "menu.update",
            "menu.price.update", "menu.availability.update",
            "orders.create", "orders.read", "orders.update", "orders.send_to_kitchen", "orders.cancel",
            "orders.cancel.approve",
            "tables.read", "tables.allocate", "tables.assign", "tables.transfer", "tables.release",
            "reservations.create", "reservations.read", "reservations.update", "reservations.confirm",
            "reservations.cancel", "reservations.check_in",
            "floor.read", "floor.supervise", "floor.assign_waiter",
            "kitchen.orders.read", "kitchen.orders.coordinate", "service.status.read", "service.status.update",
            "billing.generate", "billing.read", "billing.split", "billing.reprint",
            "payments.collect", "payments.read", "payments.refund", "payments.refund.approve", "payments.reconcile",
            "discounts.apply", "discounts.approve",
            "staff.read", "staff.create", "staff.update", "staff.disable", "staff.assign_responsibility",
            "inventory.read", "inventory.update", "inventory.adjust", "inventory.purchase.manage",
            "expenses.read", "expenses.create", "expenses.approve",
            "feedback.read", "feedback.moderate",
            "reports.sales.read", "reports.revenue.read", "reports.inventory.read",
            "reports.staff_performance.read", "reports.export",
            "users.manage", "roles.manage", "roles.permissions.update", "permissions.manage",
            "settings.manage", "integrations.manage", "security.manage", "chat.knowledge.read", "chat.knowledge.manage", "chat.knowledge.publish",
            "customer.profile.read_own", "customer.profile.update_own", "orders.create_own", "orders.read_own",
            "orders.track_own", "reservations.manage_own", "bills.read_own", "payments.pay_own", "recommendations.read");

    public static final Map<Role, Set<String>> DEFAULTS;

    static {
        Map<Role, Set<String>> m = new EnumMap<>(Role.class);
        Set<String> staffBase = Set.of("profile.read_own", "profile.update_own", "menu.read");

        m.put(Role.CUSTOMER, union(Set.of("menu.read"), CUSTOMER_MODULE));
        m.put(Role.WAITER, union(staffBase, Set.of(
                "orders.create", "orders.read", "orders.update", "orders.send_to_kitchen",
                "tables.read", "reservations.read", "kitchen.orders.read", "service.status.read", "service.status.update")));
        m.put(Role.RECEPTIONIST, union(staffBase, Set.of(
                "orders.read", "reservations.create", "reservations.read", "reservations.update",
                "reservations.confirm", "reservations.cancel", "reservations.check_in",
                "tables.read", "tables.allocate", "tables.transfer", "tables.release",
                "floor.read", "service.status.read")));
        m.put(Role.CAPTAIN, union(staffBase, Set.of(
                "orders.create", "orders.read", "orders.update", "orders.send_to_kitchen", "orders.cancel",
                "reservations.create", "reservations.read", "reservations.update", "reservations.confirm",
                "reservations.check_in", "tables.read", "tables.allocate", "tables.assign", "tables.transfer",
                "tables.release", "floor.read", "floor.supervise", "floor.assign_waiter",
                "kitchen.orders.read", "kitchen.orders.coordinate", "service.status.read", "service.status.update",
                "inventory.read")));
        m.put(Role.CASHIER, union(staffBase, Set.of(
                "orders.read", "tables.read", "reservations.read", "service.status.read",
                "billing.generate", "billing.read", "billing.split", "billing.reprint",
                "payments.collect", "payments.read", "payments.refund", "discounts.apply")));
        // Manager: operational scope. No administration keys, no customer self-service keys,
        // and no menu/price authorship (Admin owns pricing and menu structure).
        Set<String> manager = new java.util.HashSet<>(ALL);
        manager.removeAll(ADMIN_ONLY);
        manager.removeAll(CUSTOMER_MODULE);
        m.put(Role.MANAGER, Set.copyOf(manager));
        m.put(Role.ADMIN, Set.copyOf(withoutCustomerKeys()));

        DEFAULTS = java.util.Collections.unmodifiableMap(m);
    }

    private static List<String> withoutCustomerKeys() {
        List<String> out = new ArrayList<>(ALL);
        out.removeAll(CUSTOMER_MODULE);
        return out;
    }

    @SafeVarargs
    private static Set<String> union(Set<String> first, Set<String>... rest) {
        Set<String> out = new java.util.HashSet<>(first);
        for (Set<String> s : rest) out.addAll(s);
        return Set.copyOf(out);
    }
}
