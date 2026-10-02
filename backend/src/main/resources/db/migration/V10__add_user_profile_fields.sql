-- HR-basic profile fields that were missing from users (Phase 4 plan, Part C: nothing in the
-- system currently records a phone number, an employee code, or a start date for anyone).

ALTER TABLE users ADD phone NVARCHAR(30) NULL;
ALTER TABLE users ADD employee_code NVARCHAR(50) NULL;
ALTER TABLE users ADD start_date DATE NULL;
GO

-- employee_code is optional (existing rows have none) but must not collide once set. In its
-- own batch: SQL Server compiles the whole batch up front, so a CREATE INDEX referencing a
-- column added earlier in the SAME batch fails with "Invalid column name".
CREATE UNIQUE INDEX ux_users_employee_code ON users (employee_code) WHERE employee_code IS NOT NULL;
