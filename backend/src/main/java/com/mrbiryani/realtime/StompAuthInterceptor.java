package com.mrbiryani.realtime;

import java.security.Principal;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import com.mrbiryani.authorization.AuthorizationRepository;
import com.mrbiryani.identity.AuthRepository;
import com.mrbiryani.identity.TokenService;

/**
 * Authenticates STOMP CONNECT with the same bearer token as REST, and authorizes each SUBSCRIBE
 * against the database: branch assignment plus the permission for that topic. Subscriptions are
 * checked when made. A permission revoked later stops new subscriptions, but existing ones stay open
 * until the client reconnects (known limitation, listed in the README).
 */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    static final Pattern BRANCH_TOPIC = Pattern.compile("^/topic/branches/([0-9a-fA-F-]{36})/(kitchen|orders)$");

    private final TokenService tokens;
    private final AuthRepository authRepo;
    private final AuthorizationRepository authz;

    public StompAuthInterceptor(TokenService tokens, AuthRepository authRepo, AuthorizationRepository authz) {
        this.tokens = tokens;
        this.authRepo = authRepo;
        this.authz = authz;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null || acc.getCommand() == null) return message;
        if (StompCommand.CONNECT.equals(acc.getCommand())) {
            connect(acc);
        } else if (StompCommand.SUBSCRIBE.equals(acc.getCommand())) {
            subscribe(acc);
        }
        return message;
    }

    private void connect(StompHeaderAccessor acc) {
        String header = acc.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) throw reject("Authentication required");
        Jwt jwt = tokens.verify(header.substring(7).trim()).orElseThrow(() -> reject("Invalid or expired token"));

        UUID userId = UUID.fromString(jwt.getSubject());
        Integer version = jwt.getClaim("auth_version") instanceof Number n ? n.intValue() : null;
        UUID family = UUID.fromString(jwt.getClaimAsString("sid"));
        var user = authRepo.findUserById(userId).orElseThrow(() -> reject("Session is no longer valid"));
        if (!"ACTIVE".equals(user.status()) || version == null || user.authVersion() != version
                || !authRepo.isFamilyActive(family)) {
            throw reject("Session is no longer valid");
        }
        List<SimpleGrantedAuthority> authorities = authRepo.activePermissionKeys(userId).stream()
                .map(k -> new SimpleGrantedAuthority("PERM_" + k)).toList();
        acc.setUser(new UsernamePasswordAuthenticationToken(userId.toString(), null, authorities));
    }

    private void subscribe(StompHeaderAccessor acc) {
        Principal principal = acc.getUser();
        if (principal == null) throw reject("Authentication required");
        String destination = acc.getDestination();
        Matcher m = destination == null ? null : BRANCH_TOPIC.matcher(destination);
        if (m == null || !m.matches()) throw reject("Unknown topic");

        UUID userId = UUID.fromString(principal.getName());
        UUID branchId = UUID.fromString(m.group(1));
        String required = "kitchen".equals(m.group(2)) ? "kitchen.orders.read" : "orders.read";
        if (!authRepo.activePermissionKeys(userId).contains(required)) throw reject("Not allowed");
        if (!authz.hasBranchAccess(userId, branchId)) throw reject("Not allowed");
    }

    private static MessageDeliveryException reject(String message) {
        return new MessageDeliveryException(message);
    }
}
