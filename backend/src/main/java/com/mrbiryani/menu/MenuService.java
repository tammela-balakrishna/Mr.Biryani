package com.mrbiryani.menu;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.mrbiryani.common.ApiException;
import com.mrbiryani.menu.MenuRepository.Category;
import com.mrbiryani.menu.MenuRepository.Item;

@Service
public class MenuService {

    private static final BigDecimal MAX_PRICE = new BigDecimal("100000.00");

    private final MenuRepository repo;

    public MenuService(MenuRepository repo) {
        this.repo = repo;
    }

    public record MenuView(List<CategoryView> categories) {}

    public record CategoryView(UUID id, String name, List<Item> items) {}

    /** Public menu: active categories with their items. Unavailable items are included, flagged. */
    public MenuView publicMenu() {
        List<Item> items = repo.allItems();
        return new MenuView(repo.activeCategories().stream()
                .map(c -> new CategoryView(c.id(), c.name(),
                        items.stream().filter(i -> i.categoryId().equals(c.id())).toList()))
                .toList());
    }

    @Transactional
    public UUID createCategory(String name, int sortOrder) {
        try {
            return repo.insertCategory(name.trim(), sortOrder);
        } catch (DuplicateKeyException e) {
            throw ApiException.conflict("A category with this name already exists");
        }
    }

    @Transactional
    public UUID createItem(UUID categoryId, String name, String description, BigDecimal price, BigDecimal taxRate,
            boolean available) {
        if (!repo.categoryExists(categoryId)) throw ApiException.notFound("Category not found");
        return repo.insertItem(categoryId, name.trim(), description, money(price), rate(taxRate), available);
    }

    @Transactional
    public void updatePrice(UUID itemId, BigDecimal price) {
        if (repo.updatePrice(itemId, money(price)) == 0) throw ApiException.notFound("Menu item not found");
    }

    @Transactional
    public void updateDetails(UUID itemId, String name, String description) {
        if (repo.updateDetails(itemId, name.trim(), description == null ? null : description.trim()) == 0) {
            throw ApiException.notFound("Menu item not found");
        }
    }

    @Transactional
    public void updateAvailability(UUID itemId, boolean available) {
        if (repo.updateAvailability(itemId, available) == 0) throw ApiException.notFound("Menu item not found");
    }

    static BigDecimal money(BigDecimal value) {
        if (value == null || value.signum() < 0 || value.compareTo(MAX_PRICE) > 0) {
            throw ApiException.badRequest("Price must be between 0 and " + MAX_PRICE.toPlainString());
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal rate(BigDecimal value) {
        if (value == null) return new BigDecimal("5.00");
        if (value.signum() < 0 || value.compareTo(new BigDecimal("28")) > 0) {
            throw ApiException.badRequest("Tax rate must be between 0 and 28");
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
