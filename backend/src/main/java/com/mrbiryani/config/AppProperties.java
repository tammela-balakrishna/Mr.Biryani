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

    public record Jwt(String secret, String issuer, String audience, Duration accessTokenTtl) {
        public Jwt {
            if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
                throw new IllegalStateException("app.jwt.secret (JWT_SECRET) must be at least 32 bytes");
            }
            if (accessTokenTtl.compareTo(Duration.ofMinutes(1)) < 0 || accessTokenTtl.compareTo(Duration.ofHours(1)) > 0) {
                throw new IllegalStateException("app.jwt.access-token-ttl must be between 1m and 1h");
            }
        }
    }

    public record Seed(String adminEmail, String adminPassword, String branchCode, String branchName) {}
}
