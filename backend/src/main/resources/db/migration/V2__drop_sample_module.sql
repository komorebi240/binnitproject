-- The reference "sample" module (see CLAUDE.md history) has been replaced by the real
-- identity/organization module. Drop its table now that nothing depends on it — never
-- keep a shipped-but-unused table "just in case" (CLAUDE.md section 18).
DROP TABLE samples;
