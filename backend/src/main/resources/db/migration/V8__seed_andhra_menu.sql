-- Menu seed from the Mr. BIRIYANI Andhra Style menu card (prices in INR, tax at the default 5%).
-- Idempotent: categories are matched by name and items by category + name, so re-running never duplicates.
-- Ids are deterministic (md5-based), so the same rows get the same ids in every environment.

INSERT INTO menu_categories (id, name, sort_order)
VALUES
    (md5('menu-cat:non-veg-starters')::uuid,        'Non-Veg Starters', 1),
    (md5('menu-cat:biryani-serve-for-one')::uuid,   'Biryani (Serve for One)', 2),
    (md5('menu-cat:family-pack-biryani')::uuid,     'Family Pack Biryani (Serve for 3 to 4 Persons)', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (id, category_id, name, price)
SELECT md5('menu-item:' || c.name || ':' || v.name)::uuid, c.id, v.name, v.price
FROM (VALUES
    -- Non-Veg Starters
    ('Non-Veg Starters', 'Andhra Chicken Fry', 180),
    ('Non-Veg Starters', 'Guntur Chicken Fry', 180),
    ('Non-Veg Starters', 'Nellore Chicken Fry', 180),
    ('Non-Veg Starters', 'Kakinada Chicken Fry', 180),
    ('Non-Veg Starters', 'Andhra Chilly Chicken', 180),
    ('Non-Veg Starters', 'Chicken Ghee Roast', 180),
    ('Non-Veg Starters', 'Kshatriya Chicken Wings', 180),
    ('Non-Veg Starters', 'Andhra Special Chicken Fry', 200),
    ('Non-Veg Starters', 'Andhra Mutton Fry', 240),
    ('Non-Veg Starters', 'Mutton Ghee Roast', 240),
    ('Non-Veg Starters', 'Mutton Pepper Dry', 240),
    ('Non-Veg Starters', 'Andhra Fish Fry', 220),
    ('Non-Veg Starters', 'Apollo Fish Fry', 220),
    ('Non-Veg Starters', 'Andhra Prawns Fry', 240),
    ('Non-Veg Starters', 'Prawns Ghee Roast', 240),
    -- Biryani (Serve for One)
    ('Biryani (Serve for One)', 'Hyderabadi Dum Biryani', 170),
    ('Biryani (Serve for One)', 'Mr.Biryani Special', 200),
    ('Biryani (Serve for One)', 'Fry-Piece Chicken Biryani', 180),
    ('Biryani (Serve for One)', 'Guntur Chicken Biryani', 180),
    ('Biryani (Serve for One)', 'Nellore Chicken Biryani', 180),
    ('Biryani (Serve for One)', 'Andhra Style Chicken Biryani', 180),
    ('Biryani (Serve for One)', 'Rainbow Chicken Biryani', 210),
    ('Biryani (Serve for One)', 'Mughlai Chicken Biryani', 200),
    ('Biryani (Serve for One)', 'Wings Chicken Biryani', 180),
    ('Biryani (Serve for One)', 'Lollipop Chicken Biryani', 180),
    ('Biryani (Serve for One)', 'Mutton Biryani', 240),
    ('Biryani (Serve for One)', 'Fish Biryani', 220),
    ('Biryani (Serve for One)', 'Prawns Biryani', 240),
    ('Biryani (Serve for One)', 'Egg Biryani', 130),
    ('Biryani (Serve for One)', 'Panner Biryani', 160),
    ('Biryani (Serve for One)', 'Mushroom Biryani', 140),
    ('Biryani (Serve for One)', 'Biryani Rice', 110),
    -- Family Pack Biryani (Serve for 3 to 4 Persons)
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Hyderabadi Dum Biryani', 460),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Mr.Biryani Special', 550),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Fry-Piece Chicken Biryani', 490),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Guntur Chicken Biryani', 490),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Nellore Chicken Biryani', 490),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Andhra Style Chicken Biryani', 490),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Rainbow Chicken Biryani', 570),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Mughlai Chicken Biryani', 550),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Wings Chicken Biryani', 490),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Lollipop Chicken Biryani', 490),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Mutton Biryani', 670),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Fish Biryani', 610),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Prawns Biryani', 670),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Egg Biryani', 340),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Panner Biryani', 430),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Mushroom Biryani', 370),
    ('Family Pack Biryani (Serve for 3 to 4 Persons)', 'Biryani Rice', 280)
) AS v (cat, name, price)
JOIN menu_categories c ON c.name = v.cat
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items mi WHERE mi.category_id = c.id AND mi.name = v.name
);
