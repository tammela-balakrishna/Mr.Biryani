package com.mrbiryani.authorization;

import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only list of branches that accept business. Used by the website to choose where to order. */
@RestController
@RequestMapping("/api/v1/branches")
public class BranchController {

    public record BranchView(UUID id, String code, String name) {}

    private final JdbcClient jdbc;

    public BranchController(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    List<BranchView> activeBranches() {
        return jdbc.sql("SELECT id, code, name FROM branches WHERE status = 'ACTIVE' ORDER BY code")
                .query((rs, i) -> new BranchView(rs.getObject("id", UUID.class), rs.getString("code"), rs.getString("name")))
                .list();
    }
}
