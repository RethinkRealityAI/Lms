-- Migration: Add legacy_user_id support to user_group_members
-- Allows grouping both active platform users and unlinked legacy users

-- 1. Make user_id nullable
ALTER TABLE public.user_group_members ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add legacy_user_id column
ALTER TABLE public.user_group_members
  ADD COLUMN IF NOT EXISTS legacy_user_id uuid REFERENCES public.legacy_users(id) ON DELETE CASCADE;

-- 3. Add check constraint: exactly one of user_id/legacy_user_id must be set
ALTER TABLE public.user_group_members
  ADD CONSTRAINT chk_user_or_legacy CHECK (
    (user_id IS NOT NULL AND legacy_user_id IS NULL)
    OR (user_id IS NULL AND legacy_user_id IS NOT NULL)
  );

-- 4. Add unique constraint for legacy members (user_id already has one)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_group_members_group_legacy
  ON public.user_group_members(group_id, legacy_user_id)
  WHERE legacy_user_id IS NOT NULL;

-- 5. Index for legacy_user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_group_members_legacy_user_id
  ON public.user_group_members(legacy_user_id)
  WHERE legacy_user_id IS NOT NULL;
