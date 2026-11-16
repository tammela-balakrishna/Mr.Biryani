package com.mrbiryani.authorization;

import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.mrbiryani.common.ApiException;

/** Confirms a branch exists and accepts business, without requiring a staff assignment (used by customers). */
@Component
public class BranchLookup {

    private final JdbcClient jdbc;

    public BranchLookup(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public java.time.ZoneId zoneOf(UUID branchId) {
        return java.time.ZoneId.of(jdbc.sql("SELECT timezone FROM branches WHERE id = :id").param("id", branchId).query(String.class).single());
    }

    public UUID requireActive(UUID branchId) {
        boolean active = jdbc.sql("SELECT EXISTS (SELECT 1 FROM branches WHERE id = :id AND status = 'ACTIVE')")
                .param("id", branchId).query(Boolean.class).single();
        if (!active) throw ApiException.notFound("Branch not found");
        return branchId;
    }
}
