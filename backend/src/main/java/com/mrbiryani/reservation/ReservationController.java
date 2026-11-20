package com.mrbiryani.reservation;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.authorization.AuthorizationRepository;
import com.mrbiryani.authorization.BranchAccess;
import com.mrbiryani.common.ApiException;
import com.mrbiryani.reservation.ReservationService.Reservation;
import com.mrbiryani.reservation.ReservationService.Status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1")
public class ReservationController {

    public record ReservationRequest(
            @NotNull @Min(1) @Max(20) Integer partySize,
            @NotNull Instant startsAt,
            @Size(max = 120) String guestName,
            @Size(max = 500) String notes,
            UUID tableId) {}

    private final ReservationService reservations;
    private final BranchAccess branchAccess;
    private final AuthorizationRepository authRepo;

    public ReservationController(ReservationService reservations, BranchAccess branchAccess, AuthorizationRepository authRepo) {
        this.reservations = reservations;
        this.branchAccess = branchAccess;
        this.authRepo = authRepo;
    }

    /** Customer request for themselves, or staff booking for a guest (reservations.create). */
    @PostMapping("/branches/{branchId}/reservations")
    @PreAuthorize("hasAuthority('PERM_reservations.manage_own') or hasAuthority('PERM_reservations.create')")
    ResponseEntity<Map<String, Object>> create(@PathVariable UUID branchId, @Valid @RequestBody ReservationRequest body) {
        UUID me = branchAccess.currentUserId();
        boolean staff = branchAccess.hasPermission("reservations.create");
        if (staff) {
            branchAccess.require(branchId);
            if (body.guestName() == null || body.guestName().isBlank()) {
                throw ApiException.badRequest("guestName is required for staff bookings");
            }
            Reservation r = reservations.create(branchId, null, body.guestName(), body.partySize(), body.startsAt(),
                    body.notes(), true, body.tableId());
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", r));
        }
        // Customers book only as themselves, at any active branch.
        String name = authNameOrGuest(body.guestName());
        Reservation r = reservations.create(branchId, me, name, body.partySize(), body.startsAt(), body.notes(), false, body.tableId());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", r));
    }

    /** Receptionist walk-in: the guest is seated immediately. Needs reservations.check_in in this branch. */
    @PostMapping("/branches/{branchId}/walk-ins")
    @PreAuthorize("hasAuthority('PERM_reservations.check_in')")
    ResponseEntity<Map<String, Object>> walkIn(@PathVariable UUID branchId, @Valid @RequestBody WalkInRequest body) {
        branchAccess.require(branchId);
        Reservation r = reservations.walkIn(branchId, body.guestName(), body.partySize(), body.notes());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", r));
    }

    public record WalkInRequest(@NotBlank @Size(max = 120) String guestName, @NotNull @Min(1) @Max(20) Integer partySize,
            @Size(max = 500) String notes) {}

    @GetMapping("/reservations/mine")
    @PreAuthorize("hasAuthority('PERM_reservations.manage_own')")
    List<Reservation> mine() {
        return reservations.forCustomer(branchAccess.currentUserId());
    }

    /** Staff view of one branch for a date (UTC day), needs reservations.read in that branch. */
    @GetMapping("/branches/{branchId}/reservations")
    @PreAuthorize("hasAuthority('PERM_reservations.read')")
    List<Reservation> forBranch(@PathVariable UUID branchId, @RequestParam LocalDate date) {
        branchAccess.require(branchId);
        return reservations.forBranchDay(branchId, date);
    }

    @PostMapping("/reservations/{id}/cancel")
    @PreAuthorize("hasAuthority('PERM_reservations.manage_own') or hasAuthority('PERM_reservations.cancel')")
    Map<String, Object> cancel(@PathVariable UUID id) {
        Reservation r = reservations.get(id);
        UUID me = branchAccess.currentUserId();
        if (r.customerId() == null || !r.customerId().equals(me)) {
            requireStaff(r.branchId(), "reservations.cancel");
        }
        // Owner or staff: only open reservations can be cancelled.
        return Map.of("data", transitionFrom(id, Status.CANCELLED, Status.REQUESTED, Status.CONFIRMED));
    }

    @PostMapping("/branches/{branchId}/reservations/{id}/confirm")
    @PreAuthorize("hasAuthority('PERM_reservations.confirm')")
    Map<String, Object> confirm(@PathVariable UUID branchId, @PathVariable UUID id) {
        branchAccess.require(branchId);
        requireSameBranch(id, branchId);
        return Map.of("data", reservations.transition(id, Status.REQUESTED, Status.CONFIRMED));
    }

    @PostMapping("/branches/{branchId}/reservations/{id}/check-in")
    @PreAuthorize("hasAuthority('PERM_reservations.check_in')")
    Map<String, Object> checkIn(@PathVariable UUID branchId, @PathVariable UUID id) {
        branchAccess.require(branchId);
        requireSameBranch(id, branchId);
        return Map.of("data", reservations.transition(id, Status.CONFIRMED, Status.CHECKED_IN));
    }

    private Reservation transitionFrom(UUID id, Status to, Status... allowedFrom) {
        Reservation current = reservations.get(id);
        for (Status s : allowedFrom) {
            if (current.status() == s) return reservations.transition(id, s, to);
        }
        throw ApiException.conflict("Reservation is " + current.status() + " and cannot move to " + to);
    }

    private void requireStaff(UUID branchId, String permissionKey) {
        UUID me = branchAccess.currentUserId();
        if (!branchAccess.hasPermission(permissionKey) || !authRepo.hasBranchAccess(me, branchId)) {
            throw ApiException.notFound("Reservation not found");
        }
    }

    private void requireSameBranch(UUID reservationId, UUID branchId) {
        if (!reservations.get(reservationId).branchId().equals(branchId)) {
            throw ApiException.notFound("Reservation not found");
        }
    }

    private String authNameOrGuest(String provided) {
        return (provided == null || provided.isBlank()) ? "Customer" : provided;
    }
}
