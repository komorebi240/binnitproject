-- Phase 37: notifications are shown in the reader's language, so a row keeps the values the text is built from
-- (who did it, which task...) next to the Vietnamese title/body. Older rows have no params and show their stored text.
-- params is a JSON object of string values.
ALTER TABLE notifications ADD params NVARCHAR(2000) NULL;
