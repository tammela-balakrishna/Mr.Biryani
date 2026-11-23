package com.mrbiryani.identity;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.stereotype.Service;

import com.mrbiryani.config.AppProperties;

/** HS256 access tokens and opaque, hashed refresh tokens. */
@Service
public class TokenService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final AppProperties props;
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    public TokenService(AppProperties props) {
        this.props = props;
        var jwtProps = props != null && props.jwt() != null
                ? props.jwt()
                : new AppProperties.Jwt("my-super-secret-jwt-key-for-mr-biriyani-app-2026", "mr-biryani-api", "mr-biryani-clients", java.time.Duration.ofMinutes(15));
        var key = new SecretKeySpec(jwtProps.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new com.nimbusds.jose.jwk.source.ImmutableSecret<>(key));
        NimbusJwtDecoder d = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(jwtProps.issuer()),
                new JwtIssuerValidator(jwtProps.issuer()),
                audience(jwtProps.audience())));
        this.decoder = d;
    }

    private static org.springframework.security.oauth2.core.OAuth2TokenValidator<Jwt> audience(String aud) {
        return token -> token.getAudience().contains(aud)
                ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success()
                : org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                        new org.springframework.security.oauth2.core.OAuth2Error("invalid_token", "audience", null));
    }

    public String issueAccessToken(UUID userId, UUID sessionFamilyId, int authVersion) {
        Instant now = Instant.now();
        var jwtProps = props != null && props.jwt() != null
                ? props.jwt()
                : new AppProperties.Jwt("my-super-secret-jwt-key-for-mr-biriyani-app-2026", "mr-biryani-api", "mr-biryani-clients", java.time.Duration.ofMinutes(15));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(jwtProps.issuer())
                .audience(java.util.List.of(jwtProps.audience()))
                .subject(userId.toString())
                .issuedAt(now)
                .expiresAt(now.plus(jwtProps.accessTokenTtl()))
                .id(UUID.randomUUID().toString())
                .claim("sid", sessionFamilyId.toString())
                .claim("auth_version", authVersion)
                .build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    /** Returns verified claims or empty on any failure. Never throws for bad input. */
    public java.util.Optional<Jwt> verify(String token) {
        try {
            return java.util.Optional.of(decoder.decode(token));
        } catch (JwtException | IllegalArgumentException e) {
            return java.util.Optional.empty();
        }
    }

    public String newRefreshToken() {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String hash(String token) {
        try {
            var md = java.security.MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public Instant refreshExpiry() {
        return Instant.now().plus(props.refreshTokenTtl().toMillis(), ChronoUnit.MILLIS);
    }

    public long accessTtlSeconds() {
        return props.jwt().accessTokenTtl().toSeconds();
    }
}
