-- Phase 27: per-department colour and icon, chosen from a fixed preset list (validated by the application).
ALTER TABLE departments ADD color VARCHAR(20) NULL;
ALTER TABLE departments ADD icon VARCHAR(30) NULL;
