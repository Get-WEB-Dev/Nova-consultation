/**
 * Nova Health Consultancy — Supabase (legacy shim)
 *
 * This file is kept for backwards compatibility.
 * New code should import from '@/lib/supabase/client' directly.
 *
 * Re-exports the browser client and storage helpers.
 */
export { supabase, createAdminClient, uploadChatAttachment, getChatAttachmentUrl, STORAGE_BUCKETS } from './supabase/client';
