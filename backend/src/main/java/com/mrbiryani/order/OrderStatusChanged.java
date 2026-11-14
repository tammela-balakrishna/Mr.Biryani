package com.mrbiryani.order;

import java.time.Instant;
import java.util.UUID;

/** Published inside the order transaction; listeners are notified only after it commits. */
public record OrderStatusChanged(UUID branchId, UUID orderId, String status, Instant at) {}
