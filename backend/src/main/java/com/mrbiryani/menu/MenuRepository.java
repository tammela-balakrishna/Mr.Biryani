package com.mrbiryani.menu;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class MenuRepository {

    public record Category(UUID id, String name, int sortOrder) {}

    public record Item(UUID id, UUID categoryId, String name, String description,
            BigDecimal price, BigDecimal taxRate, boolean available) {}

    private static final String ITEM_COLS =
            "id, category_id, name, description, price, tax_rate, is_available";

    private static Item mapItem(ResultSet rs, int i) throws SQLException {
        return new Item(rs.getObject("id", UUID.class), rs.getObject("category_id", UUID.class),
                rs.getString("name"), rs.getString("description"), rs.getBigDecimal("price"),
                rs.getBigDecimal("tax_rate"), rs.getBoolean("is_available"));
    }

    private final JdbcClient jdbc;

    public MenuRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<Category> activeCategories() {
        return jdbc.sql("SELECT id, name, sort_order FROM menu_categories WHERE active ORDER BY sort_order, name")
                .query((rs, i) -> new Category(rs.getObject("id", UUID.class), rs.getString("name"), rs.getInt("sort_order")))
                .list();
    }

    public List<Item> allItems() {
        return jdbc.sql("SELECT " + ITEM_COLS + " FROM menu_items ORDER BY name").query(MenuRepository::mapItem).list();
    }

    public boolean categoryExists(UUID id) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM menu_categories WHERE id = :id)")
                .param("id", id).query(Boolean.class).single();
    }

    public UUID insertCategory(String name, int sortOrder) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO menu_categories (id, name, sort_order) VALUES (:id, :name, :sort)")
                .param("id", id).param("name", name).param("sort", sortOrder).update();
        return id;
    }

    public UUID insertItem(UUID categoryId, String name, String description, BigDecimal price,
            BigDecimal taxRate, boolean available) {
        UUID id = UUID.randomUUID();
        jdbc.sql("INSERT INTO menu_items (id, category_id, name, description, price, tax_rate, is_available) "
                + "VALUES (:id, :cat, :name, :desc, :price, :tax, :avail)")
                .param("id", id).param("cat", categoryId).param("name", name).param("desc", description)
                .param("price", price).param("tax", taxRate).param("avail", available).update();
        return id;
    }

    public int updatePrice(UUID itemId, BigDecimal price) {
        return jdbc.sql("UPDATE menu_items SET price = :price, updated_at = now() WHERE id = :id")
                .param("price", price).param("id", itemId).update();
    }

    public int updateAvailability(UUID itemId, boolean available) {
        return jdbc.sql("UPDATE menu_items SET is_available = :avail, updated_at = now() WHERE id = :id")
                .param("avail", available).param("id", itemId).update();
    }

    public Optional<Item> findItem(UUID id) {
        return jdbc.sql("SELECT " + ITEM_COLS + " FROM menu_items WHERE id = :id")
                .param("id", id).query(MenuRepository::mapItem).optional();
    }

    public List<Item> findItems(Collection<UUID> ids) {
        return jdbc.sql("SELECT " + ITEM_COLS + " FROM menu_items WHERE id IN (:ids)")
                .param("ids", ids).query(MenuRepository::mapItem).list();
    }
}
