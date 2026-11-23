package com.mrbiryani.config;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(
        Jwt jwt,
        Duration refreshTokenTtl,
        List<String> corsOrigins,
        boolean cookieSecure,
        int authRateLimitPerWindow,
        Seed seed) {

    public AppProperties {
        if (jwt == null) {
            jwt = new Jwt("my-super-secret-jwt-key-for-mr-biriyani-app-2026", "mr-biryani-api", "mr-biryani-clients", Duration.ofMinutes(15));
        }
        if (refreshTokenTtl == null) {
            refreshTokenTtl = Duration.ofDays(14);
        }
        if (corsOrigins == null) {
            corsOrigins = List.of("*");
        }
    }

    public record Jwt(String secret, String issuer, String audience, Duration accessTokenTtl) {
        public Jwt {
            if (secret == null || secret.isBlank()) {
                secret = "my-super-secret-jwt-key-for-mr-biriyani-app-2026";
            }
            if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
                throw new IllegalStateException("app.jwt.secret (JWT_SECRET) must be at least 32 bytes");
            }
            if (issuer == null || issuer.isBlank()) {
                issuer = "mr-biryani-api";
            }
            if (audience == null || audience.isBlank()) {
                audience = "mr-biryani-clients";
            }
            if (accessTokenTtl == null) {
                accessTokenTtl = Duration.ofMinutes(15);
            }
        }
    }

    public record Seed(String adminEmail, String adminPassword, String branchCode, String branchName) {}
}
