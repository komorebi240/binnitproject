-- Phase 28: the company overview page shows a short introduction and a banner image.
-- banner_path holds only the stored file name (like logo_path), never a filesystem path.
ALTER TABLE companies ADD description NVARCHAR(1000) NULL;
ALTER TABLE companies ADD banner_path NVARCHAR(300) NULL;
