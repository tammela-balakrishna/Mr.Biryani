package com.mrbiryani.authorization;

/** The seven official roles. Codes are stable identifiers and must match the DB check constraint. */
public enum Role {
    CUSTOMER("Customer",
            "Own profile, online menu, own orders, reservations, tracking, history, bills and recommendations"),
    WAITER("Waiter",
            "Assigned tables, permitted order creation/modification, kitchen dispatch and serving updates"),
    RECEPTIONIST("Receptionist",
            "Reservations, availability, guest check-in, table allocation and walk-in registration"),
    CAPTAIN("Captain",
            "Floor supervision, waiter assignment, order monitoring and service/reservation coordination"),
    CASHIER("Cashier",
            "Bill generation, payment collection, split payments, receipts and authorized refunds/cancellations"),
    MANAGER("Manager",
            "Operational staff, assignments, sales/revenue analytics, expenses, inventory and staff performance"),
    ADMIN("Admin",
            "System administration, user/role/permission management, settings, menu/pricing, tax, integrations and security");

    private final String displayName;
    private final String description;

    Role(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String displayName() {
        return displayName;
    }

    public String description() {
        return description;
    }
}
