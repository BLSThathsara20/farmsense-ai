-- Simple Mode preference on farmer accounts (off by default)
ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS simple_mode BOOLEAN NOT NULL DEFAULT FALSE;
