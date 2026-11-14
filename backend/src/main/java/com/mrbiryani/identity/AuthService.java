package com.mrbiryani.identity;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.identity.AuthRepository.SessionRow;
import com.mrbiryani.identity.AuthRepository.UserRow;
import com.mrbiryani.common.ApiException;

@Service
public class AuthService {

    static final int MAX_FAILED_LOGINS = 5;
    static final java.time.Duration LOCKOUT = java.time.Duration.ofMinutes(15);

    private final AuthRepository repo;
    private final TokenService tokens;
    private final PasswordEncoder encoder;
    private final String dummyHash;

    public AuthService(AuthRepository repo, TokenService tokens, PasswordEncoder encoder) {
        this.repo = repo;
        this.tokens = tokens;
        this.encoder = encoder;
        this.dummyHash = encoder.encode("timing-equalizer-not-a-real-password");
    }

    public record Meta(String requestId, String ip, String userAgent) {}

    public record Session(UserView user, String accessToken, long expiresIn, String refreshToken, Instant refreshExpiresAt) {}

    public record UserView(UUID id, String fullName, String email, String status) {}

    public record Me(UserView user, List<String> roles, List<String> permissions) {}

    @Transactional
    public Session register(String fullName, String email, String phone, String rawPassword, Meta meta) {
        if (repo.findUserByEmail(email).isPresent()) {
            throw ApiException.conflict("An account with these details already exists");
        }
        UUID id;
        try {
            id = repo.insertCustomer(email, phone, fullName, encoder.encode(rawPassword));
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw ApiException.conflict("An account with these details already exists");
        }
        repo.audit(id, "auth.register", "user", id.toString(), meta.requestId());
        return issue(id, fullName, email, "ACTIVE", 1, meta, null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Session login(String email, String password, Meta meta) {
        Optional<UserRow> found = repo.findUserByEmail(email);
        if (found.isEmpty()) {
            encoder.matches(password, dummyHash); // equalize timing
            throw ApiException.unauthorized("Invalid email or password");
        }
        UserRow u = found.get();
        if (u.lockedUntil() != null && u.lockedUntil().isAfter(Instant.now())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        if (!encoder.matches(password, u.passwordHash())) {
            int failed = u.failedLoginCount() + 1;
            boolean lock = failed >= MAX_FAILED_LOGINS;
            repo.recordLoginFailure(u.id(), lock ? 0 : failed, lock ? Instant.now().plus(LOCKOUT) : null);
            if (lock) repo.audit(u.id(), "auth.locked", "user", u.id().toString(), meta.requestId());
            throw ApiException.unauthorized("Invalid email or password");
        }
        if (!"ACTIVE".equals(u.status())) throw ApiException.unauthorized("Account is not active");

        repo.recordLoginSuccess(u.id());
        repo.audit(u.id(), "auth.login", "user", u.id().toString(), meta.requestId());
        return issue(u.id(), u.fullName(), u.email(), u.status(), u.authVersion(), meta, null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String refreshToken, Meta meta) {
        if (refreshToken == null || refreshToken.isBlank()) throw ApiException.unauthorized("Refresh token missing");
        SessionRow s = repo.findSessionByHash(TokenService.hash(refreshToken))
                .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));

        if (s.revokedAt() != null) {
            if ("ROTATED".equals(s.revokeReason())) {
                // A rotated token was replayed: treat as theft and end the whole login chain.
                repo.revokeFamily(s.familyId(), "REUSE_DETECTED");
                repo.audit(s.userId(), "auth.refresh_reuse_detected", "session_family", s.familyId().toString(), meta.requestId());
            }
            throw ApiException.unauthorized("Invalid refresh token");
        }
        if (!s.expiresAt().isAfter(Instant.now())) throw ApiException.unauthorized("Refresh token expired");

        UserRow u = repo.findUserById(s.userId()).orElseThrow(() -> ApiException.unauthorized("Account is not active"));
        if (!"ACTIVE".equals(u.status())) {
            repo.revokeFamily(s.familyId(), "ADMIN_REVOKED");
            throw ApiException.unauthorized("Account is not active");
        }
        String next = tokens.newRefreshToken();
        Instant exp = tokens.refreshExpiry();
        boolean rotated = repo.rotate(s.id(), u.id(), s.familyId(), TokenService.hash(next), exp, meta.userAgent(), meta.ip());
        if (!rotated) throw ApiException.unauthorized("Invalid refresh token");
        return new Session(view(u), tokens.issueAccessToken(u.id(), s.familyId(), u.authVersion()),
                tokens.accessTtlSeconds(), next, exp);
    }

    @Transactional
    public void logout(String refreshToken, Meta meta) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        repo.findSessionByHash(TokenService.hash(refreshToken)).ifPresent(s -> {
            repo.revokeFamily(s.familyId(), "LOGOUT");
            repo.audit(s.userId(), "auth.logout", "session_family", s.familyId().toString(), meta.requestId());
        });
    }

    public Me currentUser(UUID userId) {
        UserRow u = repo.findUserById(userId).orElseThrow(() -> ApiException.unauthorized("Session is no longer valid"));
        return new Me(view(u), repo.activeRoleCodes(userId), repo.activePermissionKeys(userId));
    }

    /** Issues a new session family for a freshly authenticated user. */
    private Session issue(UUID userId, String fullName, String email, String status, int authVersion, Meta meta, UUID family) {
        UUID familyId = family == null ? UUID.randomUUID() : family;
        String refresh = tokens.newRefreshToken();
        Instant exp = tokens.refreshExpiry();
        repo.insertSession(userId, familyId, TokenService.hash(refresh), exp, meta.userAgent(), meta.ip());
        return new Session(new UserView(userId, fullName, email, status),
                tokens.issueAccessToken(userId, familyId, authVersion), tokens.accessTtlSeconds(), refresh, exp);
    }

    private static UserView view(UserRow u) {
        return new UserView(u.id(), u.fullName(), u.email(), u.status());
    }
}
