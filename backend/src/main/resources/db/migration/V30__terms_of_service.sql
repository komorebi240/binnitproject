-- Phase 38: terms of service. A version is published by adding a row here (and its texts under resources/terms/v<N>/);
-- everyone must accept the newest one before using the product. The acceptance is kept as evidence: who, which version, when.
CREATE TABLE terms_versions (
    version INT NOT NULL PRIMARY KEY,
    published_at DATETIMEOFFSET(6) NOT NULL
);

CREATE TABLE terms_acceptances (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    version INT NOT NULL REFERENCES terms_versions(version),
    accepted_at DATETIMEOFFSET(6) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT uq_terms_acceptances_user_version UNIQUE (user_id, version)
);

INSERT INTO terms_versions (version, published_at) VALUES (1, '2026-10-08T00:00:00+07:00');
