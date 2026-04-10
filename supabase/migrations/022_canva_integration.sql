-- Canva OAuth tokens on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS canva_token_expires_at TIMESTAMPTZ;

-- Canva design tracking on slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canva_design_id TEXT;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS canva_design_url TEXT;
