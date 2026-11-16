package com.mrbiryani.common;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Public website forms (contact enquiries and reviews). Anonymous, validated, stored. A review is stored as
 * PENDING and is not shown anywhere until it is approved.
 */
@RestController
@RequestMapping("/api/v1")
public class PublicFormsController {

    public record EnquiryRequest(@NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 2000) String message) {}

    public record ReviewRequest(@NotBlank @Size(max = 120) String name,
            @NotNull @Min(1) @Max(5) Integer rating,
            @NotBlank @Size(max = 40) String category,
            @NotBlank @Size(max = 1000) String comment) {}

    private final JdbcClient jdbc;

    public PublicFormsController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/enquiries")
    ResponseEntity<Map<String, Object>> enquiry(@Valid @RequestBody EnquiryRequest body) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO enquiries (id, name, email, message) VALUES (:id, :n, :e, :m)")
                .param("id", id).param("n", body.name().trim()).param("e", body.email().trim().toLowerCase())
                .param("m", body.message().trim()).update();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id, "received", true)));
    }

    @PostMapping("/reviews")
    ResponseEntity<Map<String, Object>> review(@Valid @RequestBody ReviewRequest body) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO reviews (id, name, rating, category, comment) VALUES (:id, :n, :r, :c, :m)")
                .param("id", id).param("n", body.name().trim()).param("r", body.rating())
                .param("c", body.category().trim()).param("m", body.comment().trim()).update();
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id, "status", "PENDING")));
    }
}
