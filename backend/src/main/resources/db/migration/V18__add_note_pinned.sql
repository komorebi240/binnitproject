-- Phase 7 plan: a pinned note renders as a floating widget on every /dashboard page.
ALTER TABLE notes ADD is_pinned BIT NOT NULL DEFAULT 0;
