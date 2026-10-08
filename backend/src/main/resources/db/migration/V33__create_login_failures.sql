-- Phase 40: brute-force protection for sign-in. Failed password attempts of an existing account are counted here (not in
-- memory only), so a restart does not hand an attacker a fresh allowance. A row exists only while an account has recent
-- failures; a successful sign-in or a password reset deletes it. Kept out of `users` so failed attempts by strangers do
-- not rewrite the account's own audit columns (updated_at / updated_by).
CREATE TABLE login_failures (
    user_id BIGINT NOT NULL PRIMARY KEY REFERENCES users(id),
    failure_count INT NOT NULL,
    window_started_at DATETIMEOFFSET(6) NOT NULL,
    CONSTRAINT ck_login_failures_count CHECK (failure_count > 0)
);
