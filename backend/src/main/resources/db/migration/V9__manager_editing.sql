-- Stock items are archived rather than deleted, so their movement history stays intact.
ALTER TABLE inventory_items ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
