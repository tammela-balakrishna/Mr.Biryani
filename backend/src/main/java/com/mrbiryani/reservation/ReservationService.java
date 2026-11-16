package com.mrbiryani.reservation;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.authorization.BranchLookup;
import com.mrbiryani.common.ApiException;

/**
 * Reservation lifecycle: REQUESTED -> CONFIRMED -> CHECKED_IN, with CANCELLED from REQUESTED or
 * CONFIRMED. Customers create REQUESTED reservations for themselves. Staff create CONFIRMED ones
 * directly for walk-in phone bookings. Table allocation comes later.
 */
@Service
public class ReservationService {

    static final int MAX_PARTY = 20;
    static final Duration MAX_AHEAD = Duration.ofDays(120);

    public enum Status { REQUESTED, CONFIRMED, CHECKED_IN, CANCELLED }

    public record Reservation(UUID id, UUID branchId, UUID customerId, String guestName, int partySize,
            Instant startsAt, Status status, String notes) {}

    private final JdbcClient jdbc;
    private final BranchLookup branches;

    public ReservationService(JdbcClient jdbc, BranchLookup branches) {
        this.jdbc = jdbc;
        this.branches = branches;
    }

    private static final String COLS = "id, branch_id, customer_id, guest_name, party_size, starts_at, status, notes";

    @Transactional
    public Reservation create(UUID branchId, UUID customerId, String guestName, int partySize, Instant startsAt,
            String notes, boolean staffBooking) {
        branches.requireActive(branchId);
        if (partySize < 1 || partySize > MAX_PARTY) throw ApiException.badRequest("Party size must be 1-" + MAX_PARTY);
        Instant now = Instant.now();
        if (startsAt == null || !startsAt.isAfter(now)) throw ApiException.badRequest("Reservation time must be in the future");
        if (startsAt.isAfter(now.plus(MAX_AHEAD))) throw ApiException.badRequest("Reservations open at most 120 days ahead");

        UUID id = UUID.randomUUID();
        Status status = staffBooking ? Status.CONFIRMED : Status.REQUESTED;
        jdbc.sql("INSERT INTO reservations (id, branch_id, customer_id, guest_name, party_size, starts_at, status, notes) "
                + "VALUES (:id, :branch, :customer, :name, :size, :at, :status, :notes)")
                .param("id", id).param("branch", branchId).param("customer", customerId).param("name", guestName.trim())
                .param("size", partySize).param("at", java.sql.Timestamp.from(startsAt))
                .param("status", status.name()).param("notes", notes).update();
        return get(id);
    }

    /** Walk-in guest seated on arrival: created already CHECKED_IN, with no reservation time. */
    @Transactional
    public Reservation walkIn(UUID branchId, String guestName, int partySize, String notes) {
        branches.requireActive(branchId);
        if (partySize < 1 || partySize > MAX_PARTY) throw ApiException.badRequest("Party size must be 1-" + MAX_PARTY);
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO reservations (id, branch_id, guest_name, party_size, starts_at, status, notes) "
                + "VALUES (:id, :branch, :name, :size, now(), :status, :notes)")
                .param("id", id).param("branch", branchId).param("name", guestName.trim())
                .param("size", partySize).param("status", Status.CHECKED_IN.name()).param("notes", notes).update();
        return get(id);
    }

    /** Reservations on one calendar day in the branch's own timezone. */
    public List<Reservation> forBranchDay(UUID branchId, LocalDate date) {
        ZoneId zone = branches.zoneOf(branchId);
        Instant from = date.atStartOfDay(zone).toInstant();
        return forBranch(branchId, from, date.plusDays(1).atStartOfDay(zone).toInstant());
    }

    public Reservation get(UUID id) {
        return find(id).orElseThrow(() -> ApiException.notFound("Reservation not found"));
    }

    public Optional<Reservation> find(UUID id) {
        return jdbc.sql("SELECT " + COLS + " FROM reservations WHERE id = :id").param("id", id).query(this::map).optional();
    }

    public List<Reservation> forCustomer(UUID customerId) {
        return jdbc.sql("SELECT " + COLS + " FROM reservations WHERE customer_id = :c ORDER BY starts_at DESC LIMIT 100")
                .param("c", customerId).query(this::map).list();
    }

    public List<Reservation> forBranch(UUID branchId, Instant from, Instant to) {
        return jdbc.sql("SELECT " + COLS + " FROM reservations WHERE branch_id = :b AND starts_at >= :from AND starts_at < :to "
                + "ORDER BY starts_at LIMIT 500")
                .param("b", branchId).param("from", java.sql.Timestamp.from(from)).param("to", java.sql.Timestamp.from(to))
                .query(this::map).list();
    }

    /** Transition guarded by the current status; returns the updated reservation. */
    @Transactional
    public Reservation transition(UUID id, Status from, Status to) {
        Reservation current = get(id);
        if (current.status() != from) {
            throw ApiException.conflict("Reservation is " + current.status() + ", expected " + from);
        }
        int rows = jdbc.sql("UPDATE reservations SET status = :to, version = version + 1, updated_at = now() "
                + "WHERE id = :id AND status = :from")
                .param("to", to.name()).param("id", id).param("from", from.name()).update();
        if (rows != 1) throw ApiException.conflict("Reservation was changed by someone else; reload and try again");
        return get(id);
    }

    private Reservation map(java.sql.ResultSet rs, int i) throws java.sql.SQLException {
        return new Reservation(rs.getObject("id", UUID.class), rs.getObject("branch_id", UUID.class),
                rs.getObject("customer_id", UUID.class), rs.getString("guest_name"), rs.getInt("party_size"),
                rs.getTimestamp("starts_at").toInstant(), Status.valueOf(rs.getString("status")), rs.getString("notes"));
    }
}
