package com.mrbiryani.billing;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.BranchAccess;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1/branches/{branchId}")
public class BillingController {

    public record PaymentRequest(@NotBlank String method, @NotNull @DecimalMin("0.01") BigDecimal amount) {}

    public record RefundRequest(@NotNull @DecimalMin("0.01") BigDecimal amount, @NotBlank @Size(max = 200) String reason) {}

    public record RefundDecision(@NotNull Boolean approve) {}

    private final BillingService billing;
    private final BranchAccess branchAccess;

    public BillingController(BillingService billing, BranchAccess branchAccess) {
        this.billing = billing;
        this.branchAccess = branchAccess;
    }

    @PostMapping("/orders/{orderId}/bill")
    @PreAuthorize("hasAuthority('PERM_billing.generate')")
    ResponseEntity<Map<String, Object>> createBill(@PathVariable UUID branchId, @PathVariable UUID orderId) {
        branchAccess.require(branchId);
        var bill = billing.createBill(branchId, orderId, branchAccess.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", bill));
    }

    @GetMapping("/bills/{billId}")
    @PreAuthorize("hasAuthority('PERM_billing.read')")
    Map<String, Object> bill(@PathVariable UUID branchId, @PathVariable UUID billId) {
        branchAccess.require(branchId);
        return Map.of("data", billing.bill(branchId, billId));
    }

    /** Cash, card or UPI tender. Several calls against one bill make a split payment. */
    @PostMapping("/bills/{billId}/payments")
    @PreAuthorize("hasAuthority('PERM_payments.collect')")
    ResponseEntity<Map<String, Object>> pay(@PathVariable UUID branchId, @PathVariable UUID billId,
            @Valid @RequestBody PaymentRequest body,
            @RequestHeader("Idempotency-Key") @NotBlank @Size(min = 8, max = 64) String idempotencyKey) {
        branchAccess.require(branchId);
        var payment = billing.recordPayment(branchId, billId, body.method().trim().toUpperCase(), body.amount(),
                idempotencyKey, branchAccess.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", payment));
    }

    @PostMapping("/payments/{paymentId}/refunds")
    @PreAuthorize("hasAuthority('PERM_payments.refund')")
    ResponseEntity<Map<String, Object>> requestRefund(@PathVariable UUID branchId, @PathVariable UUID paymentId,
            @Valid @RequestBody RefundRequest body) {
        branchAccess.require(branchId);
        var refund = billing.requestRefund(branchId, paymentId, body.amount(), body.reason(), branchAccess.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", refund));
    }

    @PostMapping("/refunds/{refundId}/decision")
    @PreAuthorize("hasAuthority('PERM_payments.refund.approve')")
    Map<String, Object> decideRefund(@PathVariable UUID branchId, @PathVariable UUID refundId,
            @Valid @RequestBody RefundDecision body) {
        branchAccess.require(branchId);
        return Map.of("data", billing.decideRefund(branchId, refundId, body.approve(), branchAccess.currentUserId()));
    }

    @GetMapping("/bills")
    @PreAuthorize("hasAuthority('PERM_billing.read')")
    Map<String, Object> bills(@PathVariable UUID branchId, @RequestParam(required = false) String status) {
        branchAccess.require(branchId);
        String s = status == null ? null : status.trim().toUpperCase();
        if (s != null && !java.util.List.of("OPEN", "PAID").contains(s)) {
            throw com.mrbiryani.common.ApiException.badRequest("Status must be OPEN or PAID");
        }
        return Map.of("data", billing.listBills(branchId, s));
    }

    @GetMapping("/bills/{billId}/receipt")
    @PreAuthorize("hasAuthority('PERM_billing.read')")
    Map<String, Object> receipt(@PathVariable UUID branchId, @PathVariable UUID billId) {
        branchAccess.require(branchId);
        return Map.of("data", billing.receipt(branchId, billId));
    }

    @GetMapping("/refunds")
    @PreAuthorize("hasAuthority('PERM_payments.refund.approve')")
    Map<String, Object> refunds(@PathVariable UUID branchId, @RequestParam(defaultValue = "REQUESTED") String status) {
        branchAccess.require(branchId);
        String s = status.trim().toUpperCase();
        if (!java.util.List.of("REQUESTED", "APPROVED", "REJECTED").contains(s)) {
            throw com.mrbiryani.common.ApiException.badRequest("Unknown refund status");
        }
        return Map.of("data", billing.refundsWithStatus(branchId, s));
    }

    @GetMapping("/reports/sales")
    @PreAuthorize("hasAuthority('PERM_reports.sales.read')")
    Map<String, Object> sales(@PathVariable UUID branchId, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        branchAccess.require(branchId);
        if (to.isBefore(from) || from.plusDays(366).isBefore(to)) {
            throw com.mrbiryani.common.ApiException.badRequest("Choose a range of up to one year");
        }
        return Map.of("data", billing.sales(branchId, from, to));
    }
}
