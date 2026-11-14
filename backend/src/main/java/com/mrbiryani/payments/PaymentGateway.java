package com.mrbiryani.payments;

import java.math.BigDecimal;
import java.time.Instant;

/** Provider-neutral gateway. Zoho Payments is the first implementation; others plug in behind this interface. */
public interface PaymentGateway {

    /** False when credentials are not configured. The application then refuses online payments. */
    boolean enabled();

    SessionResult createSession(SessionRequest request);

    record SessionRequest(String reference, BigDecimal amount, String currency, String description) {}

    record SessionResult(String providerSessionId, String checkoutAccessKey, Instant expiresAt) {}
}
