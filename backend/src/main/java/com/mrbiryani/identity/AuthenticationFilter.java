package com.mrbiryani.identity;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authenticates Bearer access tokens. The JWT identifies the principal only; account status,
 * auth version and session liveness are re-checked in the database on every request, so
 * logout, suspension and permission changes take effect immediately. Permission keys are loaded
 * from the database, never from the token.
 */
@Component
public class AuthenticationFilter extends OncePerRequestFilter {

    private final TokenService tokens;
    private final AuthRepository repo;

    public AuthenticationFilter(TokenService tokens, AuthRepository repo) {
        this.tokens = tokens;
        this.repo = repo;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            tokens.verify(header.substring(7).trim()).ifPresent(jwt -> authenticate(jwt));
        }
        chain.doFilter(req, res);
    }

    private void authenticate(Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        UUID family;
        try {
            family = UUID.fromString(jwt.getClaimAsString("sid"));
        } catch (RuntimeException e) {
            return;
        }
        Object claim = jwt.getClaim("auth_version");
        var user = repo.findUserById(userId).orElse(null);
        if (user == null || !"ACTIVE".equals(user.status()) || !(claim instanceof Number n)
                || user.authVersion() != n.intValue()) {
            return;
        }
        if (!repo.isFamilyActive(family)) return;

        List<SimpleGrantedAuthority> authorities = repo.activePermissionKeys(userId).stream()
                .map(k -> new SimpleGrantedAuthority("PERM_" + k))
                .toList();
        var auth = new UsernamePasswordAuthenticationToken(userId.toString(), null, authorities);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
