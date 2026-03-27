-- Migration: Add profile_picture column to doctor_profiles
-- Safe to run multiple times (IF NOT EXISTS)
-- Run this in Supabase SQL Editor

ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Also ensure users.avatar_url exists (it should already)
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
