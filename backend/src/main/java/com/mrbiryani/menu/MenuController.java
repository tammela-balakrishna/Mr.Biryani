package com.mrbiryani.menu;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mrbiryani.menu.MenuService.MenuView;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/v1/menu")
public class MenuController {

    public record CategoryRequest(@NotBlank @Size(max = 80) String name, Integer sortOrder) {}

    public record ItemRequest(
            @NotNull UUID categoryId,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 1000) String description,
            @NotNull @DecimalMin("0.00") @DecimalMax("100000.00") BigDecimal price,
            @DecimalMin("0") @DecimalMax("28") BigDecimal taxRate,
            Boolean available) {}

    public record PriceRequest(@NotNull @DecimalMin("0.00") @DecimalMax("100000.00") BigDecimal price) {}

    public record AvailabilityRequest(@NotNull Boolean available) {}

    private final MenuService menu;

    public MenuController(MenuService menu) {
        this.menu = menu;
    }

    /** Public: customers and guests browse the menu. */
    @GetMapping
    MenuView publicMenu() {
        return menu.publicMenu();
    }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('PERM_menu.create')")
    ResponseEntity<Map<String, Object>> createCategory(@Valid @RequestBody CategoryRequest body) {
        UUID id = menu.createCategory(body.name(), body.sortOrder() == null ? 0 : body.sortOrder());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id)));
    }

    @PostMapping("/items")
    @PreAuthorize("hasAuthority('PERM_menu.create')")
    ResponseEntity<Map<String, Object>> createItem(@Valid @RequestBody ItemRequest body) {
        UUID id = menu.createItem(body.categoryId(), body.name(), body.description(), body.price(), body.taxRate(),
                body.available() == null || body.available());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("data", Map.of("id", id)));
    }

    public record DetailsRequest(@NotBlank @Size(max = 120) String name, @Size(max = 500) String description) {}

    /** Edits a dish's name and description. Price has its own permission. */
    @PatchMapping("/items/{id}")
    @PreAuthorize("hasAuthority('PERM_menu.update')")
    ResponseEntity<Void> updateDetails(@PathVariable UUID id, @Valid @RequestBody DetailsRequest body) {
        menu.updateDetails(id, body.name(), body.description());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/{id}/price")
    @PreAuthorize("hasAuthority('PERM_menu.price.update')")
    ResponseEntity<Void> updatePrice(@PathVariable UUID id, @Valid @RequestBody PriceRequest body) {
        menu.updatePrice(id, body.price());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/items/{id}/availability")
    @PreAuthorize("hasAuthority('PERM_menu.availability.update')")
    ResponseEntity<Void> updateAvailability(@PathVariable UUID id, @Valid @RequestBody AvailabilityRequest body) {
        menu.updateAvailability(id, body.available());
        return ResponseEntity.noContent().build();
    }
}
