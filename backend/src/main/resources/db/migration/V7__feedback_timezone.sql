-- Branch timezone (day boundaries for reservations and reports) and feedback moderation permissions.

ALTER TABLE branches ADD COLUMN timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Kolkata';

INSERT INTO permissions (id, key, module, description) VALUES
    (gen_random_uuid(), 'feedback.read', 'feedback', 'feedback read'),
    (gen_random_uuid(), 'feedback.moderate', 'feedback', 'feedback moderate')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('ADMIN', 'MANAGER') AND p.key LIKE 'feedback.%'
ON CONFLICT DO NOTHING;
