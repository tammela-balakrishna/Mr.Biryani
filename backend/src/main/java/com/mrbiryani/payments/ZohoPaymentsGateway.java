package com.mrbiryani.payments;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.mrbiryani.common.ApiException;

import tools.jackson.databind.ObjectMapper;

/**
 * Zoho Payments, Payment Session API (documented endpoint: POST /api/v1/paymentsessions?account_id=...,
 * scope ZohoPay.payments.CREATE). Configuration comes only from the environment:
 *   ZOHO_PAYMENTS_BASE_URL      default: sandbox host, https://paymentssandbox.zoho.in
 *   ZOHO_PAYMENTS_ACCOUNT_ID    account id from the Zoho Payments dashboard
 *   ZOHO_PAYMENTS_ACCESS_TOKEN  OAuth access token with the sandbox scope
 *   ZOHO_PAYMENTS_SUCCESS_URL / ZOHO_PAYMENTS_FAILURE_URL  HTTPS return pages (required by hosted checkout)
 * No credentials are stored in source control.
 */
@Component
public class ZohoPaymentsGateway implements PaymentGateway {

    private final String baseUrl;
    private final String accountId;
    private final String accessToken;
    private final String successUrl;
    private final String failureUrl;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public ZohoPaymentsGateway(
            @Value("${app.payments.zoho.base-url:https://paymentssandbox.zoho.in}") String baseUrl,
            @Value("${app.payments.zoho.account-id:}") String accountId,
            @Value("${app.payments.zoho.access-token:}") String accessToken,
            @Value("${app.payments.zoho.success-url:}") String successUrl,
            @Value("${app.payments.zoho.failure-url:}") String failureUrl,
            ObjectMapper json) {
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.accountId = accountId;
        this.accessToken = accessToken;
        this.successUrl = successUrl;
        this.failureUrl = failureUrl;
        this.json = json;
    }

    @Override
    public boolean enabled() {
        return !accountId.isBlank() && !accessToken.isBlank()
                && successUrl.startsWith("https://") && failureUrl.startsWith("https://");
    }

    @Override
    public SessionResult createSession(SessionRequest request) {
        if (!enabled()) throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "UNAVAILABLE", "Online payment is not configured");
        String reference = request.reference().length() > 50 ? request.reference().substring(0, 50) : request.reference();
        Map<String, Object> body = Map.of(
                "amount", request.amount().setScale(2).toPlainString(),
                "currency", request.currency(),
                "description", request.description(),
                "expires_in", 900,
                "reference_number", reference,
                "configurations", Map.of(
                        "allowed_payment_methods", List.of("card", "upi", "net_banking"),
                        "hosted_checkout_parameters", Map.of(
                                "description", request.description(),
                                "success_url", successUrl,
                                "failure_url", failureUrl)));
        HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(baseUrl + "/api/v1/paymentsessions?account_id=" + accountId))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Zoho-oauthtoken " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                .build();
        try {
            HttpResponse<String> response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "PROVIDER_ERROR",
                        "Payment provider returned HTTP " + response.statusCode());
            }
            Map<?, ?> parsed = json.readValue(response.body(), Map.class);
            Map<?, ?> session = (Map<?, ?>) parsed.get("payments_session");
            if (session == null) throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "PROVIDER_ERROR", "Payment provider response had no session");
            long expiryMillis = ((Number) session.get("expiry_time")).longValue();
            return new SessionResult(String.valueOf(session.get("payments_session_id")),
                    String.valueOf(session.get("access_key")), Instant.ofEpochMilli(expiryMillis));
        } catch (java.io.IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "PROVIDER_ERROR",
                    "Payment provider could not be reached");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY, "PROVIDER_ERROR", "Payment request interrupted");
        }
    }

    static BigDecimal zero() {
        return BigDecimal.ZERO;
    }
}
