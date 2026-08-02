-- Demo data mode preference: show labelled sample data only when real data is missing
ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS demo_data_mode BOOLEAN NOT NULL DEFAULT FALSE;
