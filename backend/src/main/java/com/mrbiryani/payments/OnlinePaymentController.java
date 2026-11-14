package com.mrbiryani.payments;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.BranchAccess;

@RestController
@RequestMapping("/api/v1")
public class OnlinePaymentController {

    private final OnlinePaymentService payments;
    private final BranchAccess branchAccess;

    public OnlinePaymentController(OnlinePaymentService payments, BranchAccess branchAccess) {
        this.payments = payments;
        this.branchAccess = branchAccess;
    }

    /** A customer starts paying their own order. The response contains the provider's hosted-checkout access key. */
    @PostMapping("/orders/{orderId}/payment-session")
    @PreAuthorize("hasAuthority('PERM_orders.create_own')")
    ResponseEntity<Map<String, Object>> start(@PathVariable UUID orderId) {
        var session = payments.startSession(orderId, branchAccess.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of(
                "sessionId", session.sessionId(),
                "checkoutAccessKey", session.checkoutAccessKey(),
                "amount", session.amount(),
                "expiresAt", session.expiresAt())));
    }

    /**
     * Provider webhook. Public endpoint, authenticated only by the signature over the raw body. The raw
     * body is read as a string so the signature is checked against exactly what was sent.
     */
    @PostMapping("/payments/webhooks/zoho")
    ResponseEntity<Map<String, Object>> zohoWebhook(@RequestBody String rawBody,
            @RequestHeader(value = WebhookVerifier.HEADER, required = false) String signature) {
        String outcome = payments.handleWebhook(rawBody, signature);
        return ResponseEntity.ok(Map.of("result", outcome));
    }
}
