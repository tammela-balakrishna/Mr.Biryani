package com.mrbiryani.order;

import java.time.Instant;
import java.util.UUID;

public record OrderStatusChanged(UUID branchId, UUID orderId, String status, Instant at) {}