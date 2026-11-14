package com.mrbiryani.payments;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Zoho Payments webhook verification, as documented at
 * https://www.zoho.com/in/payments/developerdocs/webhooks/verification/index.md :
 *   header  X-Zoho-Webhook-Signature: t=<timestamp millis>,v=<hex signature>
 *   signed  HMAC-SHA256(signingKey, "<t>.<payload>")  encoded as lowercase hex
 * Deliveries whose timestamp is more than five minutes from our clock are rejected (replay protection).
 * Still to confirm in the sandbox: whether the payload is the raw body bytes (this code uses the raw body)
 * and the exact event payload field names used by OnlinePaymentService.
 */
public final class WebhookVerifier {

    public static final String HEADER = "X-Zoho-Webhook-Signature";
    static final Duration MAX_SKEW = Duration.ofMinutes(5);

    private WebhookVerifier() {}

    /** Builds a header value for a payload, as the provider would. Used by tests and sandbox tooling. */
    public static String signatureHeader(String secret, String rawBody, long timestampMillis) {
        return "t=" + timestampMillis + ",v=" + hmacHex(secret, timestampMillis + "." + rawBody);
    }

    public static boolean verify(String secret, String rawBody, String header, Instant now) {
        if (secret == null || secret.isBlank() || header == null || rawBody == null) return false;
        String timestamp = null;
        String signature = null;
        for (String part : header.split(",")) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length != 2) return false;
            if (kv[0].equals("t")) timestamp = kv[1];
            if (kv[0].equals("v")) signature = kv[1];
        }
        if (timestamp == null || signature == null || !timestamp.matches("\\d{10,16}")) return false;
        long at = Long.parseLong(timestamp);
        if (Math.abs(now.toEpochMilli() - at) > MAX_SKEW.toMillis()) return false;

        byte[] expected = hmacHex(secret, timestamp + "." + rawBody).getBytes(StandardCharsets.US_ASCII);
        byte[] actual = signature.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, actual);
    }

    private static String hmacHex(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
