-- Migration: optional default fee amount per batch
-- This is used as a prefill in Fee Management, but each student's amount can be overridden.

alter table public.batches
  add column if not exists default_fee_amount integer;

