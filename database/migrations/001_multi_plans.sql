-- Multi-plan support: optional plan title on recommendation_run
ALTER TABLE recommendation_run
    ADD COLUMN IF NOT EXISTS title VARCHAR(160);
