package com.mrbiryani.common;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

/**
 * Reviews and enquiries from the public forms. Only approved reviews are public. Staff with feedback.read
 * can read the queues; staff with feedback.moderate approve or reject reviews.
 */
@RestController
@RequestMapping("/api/v1")
public class FeedbackController {

    public record ModerationRequest(@NotNull Boolean approve) {}

    private final JdbcClient jdbc;

    public FeedbackController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Public: approved reviews only. */
    @GetMapping("/reviews")
    List<Map<String, Object>> approvedReviews() {
        return jdbc.sql("SELECT id, name, rating, category, comment, created_at FROM reviews "
                + "WHERE status = 'APPROVED' ORDER BY created_at DESC LIMIT 100").query().listOfRows();
    }

    @GetMapping("/feedback/reviews")
    @PreAuthorize("hasAuthority('PERM_feedback.read')")
    Map<String, Object> reviews(@RequestParam(defaultValue = "PENDING") String status) {
        String s = status.trim().toUpperCase();
        if (!List.of("PENDING", "APPROVED", "REJECTED").contains(s)) throw ApiException.badRequest("Unknown review status");
        return Map.of("data", jdbc.sql("SELECT id, name, rating, category, comment, status, created_at FROM reviews "
                + "WHERE status = :s ORDER BY created_at DESC LIMIT 200").param("s", s).query().listOfRows());
    }

    @PostMapping("/feedback/reviews/{id}/decision")
    @PreAuthorize("hasAuthority('PERM_feedback.moderate')")
    Map<String, Object> decide(@PathVariable UUID id, @Valid @RequestBody ModerationRequest body) {
        String next = body.approve() ? "APPROVED" : "REJECTED";
        int rows = jdbc.sql("UPDATE reviews SET status = :s WHERE id = :id AND status = 'PENDING'")
                .param("s", next).param("id", id).update();
        if (rows == 0) throw ApiException.conflict("This review is not waiting for a decision");
        return Map.of("data", Map.of("id", id, "status", next));
    }

    @GetMapping("/feedback/enquiries")
    @PreAuthorize("hasAuthority('PERM_feedback.read')")
    Map<String, Object> enquiries() {
        return Map.of("data", jdbc.sql("SELECT id, name, email, message, created_at FROM enquiries "
                + "ORDER BY created_at DESC LIMIT 200").query().listOfRows());
    }
}
