package com.mrbiryani.order;

import java.util.EnumSet;
import java.util.Set;

public enum OrderStatus {
    PLACED, ACCEPTED, PREPARING, READY, SERVED, COMPLETED, CANCELLED;

    private static final java.util.Map<OrderStatus, Set<OrderStatus>> NEXT = java.util.Map.of(
            PLACED, EnumSet.of(ACCEPTED, CANCELLED),
            ACCEPTED, EnumSet.of(PREPARING, CANCELLED),
            PREPARING, EnumSet.of(READY),
            READY, EnumSet.of(SERVED),
            SERVED, EnumSet.of(COMPLETED),
            COMPLETED, EnumSet.noneOf(OrderStatus.class),
            CANCELLED, EnumSet.noneOf(OrderStatus.class));

    public boolean canMoveTo(OrderStatus to) {
        return NEXT.get(this).contains(to);
    }
}
