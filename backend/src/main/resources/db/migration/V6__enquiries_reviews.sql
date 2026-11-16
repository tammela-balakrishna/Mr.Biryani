-- Public website forms. Stored so nothing is lost; reviews stay hidden until approved.

CREATE TABLE enquiries (
    id          UUID PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(254) NOT NULL,
    message     VARCHAR(2000) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
    id          UUID PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    rating      SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    category    VARCHAR(40)  NOT NULL,
    comment     VARCHAR(1000) NOT NULL,
    status      VARCHAR(12)  NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
