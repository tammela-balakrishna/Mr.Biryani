package com.mrbiryani.identity;

import java.time.Duration;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.common.ApiException;
import com.mrbiryani.config.AppProperties;
import com.mrbiryani.identity.AuthService.Meta;
import com.mrbiryani.identity.AuthService.Session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Browser clients (website) receive the refresh token only as an HTTP-only, SameSite=Strict cookie.
 * Native clients (mobile app) send {@code X-Client-Type: native}; they receive the refresh token in the
 * JSON body and send it back in the body, to be stored in platform secure storage. The access token
 * is always returned in the body and is never stored by the server.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    static final String REFRESH_COOKIE = "mb_refresh";
    static final String COOKIE_PATH = "/api/v1/auth";
    static final String NATIVE_HEADER = "X-Client-Type";

    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 120) String fullName,
            @NotBlank @Email @Size(max = 254) String email,
            @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "Phone must be E.164, e.g. +919876543210") String phone,
            @NotBlank @Size(min = 10, max = 128, message = "Password must be 10-128 characters") String password) {}

    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 128) String password) {}

    public record RefreshBody(@Size(max = 200) String refreshToken) {}

    private final AuthService auth;
    private final AppProperties props;
    private final Set<String> allowedOrigins;
    private final RateLimiter limiter;

    public AuthController(AuthService auth, AppProperties props) {
        this.auth = auth;
        this.props = props;
        java.util.Set<String> origins = new java.util.HashSet<>();
        if (props.corsOrigins() != null) origins.addAll(props.corsOrigins());
        origins.add("http://localhost:5173");
        origins.add("http://localhost:5174");
        origins.add("http://localhost:5175");
        origins.add("http://127.0.0.1:5173");
        origins.add("http://127.0.0.1:5174");
        origins.add("http://127.0.0.1:5175");
        this.allowedOrigins = java.util.Collections.unmodifiableSet(origins);
        this.limiter = new RateLimiter(props.authRateLimitPerWindow(), Duration.ofMinutes(15));
    }

    @PostMapping("/register")
    ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest body, HttpServletRequest req) {
        checkOrigin(req);
        limit(req);
        // The body record has no role field, so a client-supplied role cannot reach the service.
        Session s = auth.register(body.fullName().trim(), body.email().trim().toLowerCase(), body.phone(),
                body.password(), meta(req));
        return respond(HttpStatus.CREATED, s, isNative(req));
    }

    @PostMapping("/login")
    ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest body, HttpServletRequest req) {
        checkOrigin(req);
        limit(req);
        return respond(HttpStatus.OK, auth.login(body.email().trim().toLowerCase(), body.password(), meta(req)), isNative(req));
    }

    @PostMapping("/refresh")
    ResponseEntity<Map<String, Object>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestBody(required = false) RefreshBody body,
            HttpServletRequest req) {
        checkOrigin(req);
        limit(req);
        String token = isNative(req) ? (body == null ? null : body.refreshToken()) : cookieToken;
        try {
            return respond(HttpStatus.OK, auth.refresh(token, meta(req)), isNative(req));
        } catch (ApiException e) {
            return ResponseEntity.status(e.status()).header(HttpHeaders.SET_COOKIE, clearCookie().toString())
                    .body(Map.of("error", Map.of("code", e.code(), "message", e.getMessage())));
        }
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String cookieToken,
            @RequestBody(required = false) RefreshBody body, HttpServletRequest req) {
        checkOrigin(req);
        String token = isNative(req) ? (body == null ? null : body.refreshToken()) : cookieToken;
        auth.logout(token, meta(req));
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, clearCookie().toString()).build();
    }

    @GetMapping("/session")
    ResponseEntity<Map<String, Object>> session(Authentication authentication) {
        if (authentication == null) throw ApiException.unauthorized("Authentication required");
        AuthService.Me me = auth.currentUser(java.util.UUID.fromString(authentication.getName()));
        return ResponseEntity.ok(Map.of("data", Map.of(
                "user", me.user(), "roles", me.roles(), "permissions", me.permissions())));
    }

    private ResponseEntity<Map<String, Object>> respond(HttpStatus status, Session s, boolean nativeClient) {
        Map<String, Object> payload = new java.util.LinkedHashMap<>();
        payload.put("user", s.user());
        payload.put("accessToken", s.accessToken());
        payload.put("tokenType", "Bearer");
        payload.put("expiresIn", s.expiresIn());
        if (nativeClient) {
            payload.put("refreshToken", s.refreshToken());
            payload.put("refreshExpiresAt", s.refreshExpiresAt());
            return ResponseEntity.status(status).body(Map.of("data", payload));
        }
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, s.refreshToken())
                .httpOnly(true).secure(props.cookieSecure()).sameSite("Strict").path(COOKIE_PATH)
                .maxAge(Duration.between(java.time.Instant.now(), s.refreshExpiresAt())).build();
        return ResponseEntity.status(status).header(HttpHeaders.SET_COOKIE, cookie.toString()).body(Map.of("data", payload));
    }

    private ResponseCookie clearCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "").httpOnly(true).secure(props.cookieSecure())
                .sameSite("Strict").path(COOKIE_PATH).maxAge(0).build();
    }

    static boolean isNative(HttpServletRequest req) {
        return "native".equalsIgnoreCase(req.getHeader(NATIVE_HEADER));
    }

    /** Reject cross-site browser requests carrying a foreign Origin (cookie endpoints). */
    private void checkOrigin(HttpServletRequest req) {
        String origin = req.getHeader(HttpHeaders.ORIGIN);
        if (origin == null) return;
        if (allowedOrigins.contains(origin)) return;
        if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")
                || origin.equals("http://localhost") || origin.equals("http://127.0.0.1")) {
            return;
        }
        throw ApiException.forbidden("Origin not allowed");
    }

    private void limit(HttpServletRequest req) {
        if (!limiter.tryAcquire(req.getRemoteAddr())) {
            throw ApiException.tooManyRequests("Too many attempts, try again later");
        }
    }

    private static Meta meta(HttpServletRequest req) {
        return new Meta((String) req.getAttribute(com.mrbiryani.common.RequestIdFilter.ATTRIBUTE),
                req.getRemoteAddr(), req.getHeader(HttpHeaders.USER_AGENT));
    }
}
