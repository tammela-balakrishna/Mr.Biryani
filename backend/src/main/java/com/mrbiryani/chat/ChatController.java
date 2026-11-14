package com.mrbiryani.chat;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Public and customer-facing assistant endpoints. Anonymous callers may use public knowledge; a
 * valid bearer token adds the caller's own order and reservation status. Client-supplied identity
 * fields are never read.
 */
@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    public record MessageRequest(@NotBlank @Size(max = 1000) String message) {}

    public record FeedbackRequest(@NotBlank String rating) {}

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }

    @PostMapping("/sessions")
    ResponseEntity<Map<String, Object>> createSession() {
        UUID viewer = viewer();
        UUID id = chat.createSession(viewer);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("data", Map.of("sessionId", id, "authenticated", viewer != null)));
    }

    @PostMapping("/sessions/{sessionId}/messages")
    Map<String, Object> ask(@PathVariable UUID sessionId, @Valid @RequestBody MessageRequest body) {
        ChatService.Reply reply = chat.ask(sessionId, viewer(), body.message());
        return Map.of("data", Map.of(
                "messageId", reply.messageId(),
                "answer", reply.answer(),
                "kind", reply.kind(),
                "citations", reply.citations()));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    Map<String, Object> history(@PathVariable UUID sessionId) {
        List<ChatStore.MessageRow> rows = chat.history(sessionId, viewer());
        return Map.of("data", rows);
    }

    @PostMapping("/sessions/{sessionId}/messages/{messageId}/feedback")
    ResponseEntity<Void> feedback(@PathVariable UUID sessionId, @PathVariable UUID messageId,
            @Valid @RequestBody FeedbackRequest body) {
        chat.feedback(sessionId, messageId, viewer(), body.rating());
        return ResponseEntity.noContent().build();
    }

    /** The authenticated user, or null for anonymous callers. Never taken from the request body. */
    static UUID viewer() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof UsernamePasswordAuthenticationToken && auth.getName() != null) {
            try {
                return UUID.fromString(auth.getName());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }
}
