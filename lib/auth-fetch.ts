/**
 * Client-side: attach the signed-in user's Supabase access token to every
 * same-origin /api/* request, so API routes can verify who is calling.
 *
 * Installed once (see components/AuthFetchInstaller.tsx) by wrapping
 * window.fetch, so existing `fetch('/api/...')` calls need no changes.
 * /api/auth/* (login, signup) is left untouched.
 */

import { supabase } from '@/lib/supabase/client';

declare global {
  interface Window {
    __novaAuthFetchInstalled?: boolean;
  }
}

export function installAuthFetch(): void {
  if (typeof window === 'undefined' || window.__novaAuthFetchInstalled) return;
  window.__novaAuthFetchInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const rawUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, window.location.origin);
      const isOwnApi =
        url.origin === window.location.origin &&
        url.pathname.startsWith('/api/') &&
        !url.pathname.startsWith('/api/auth/');

      if (isOwnApi) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(
            init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // never block a request because token lookup failed
    }
    return originalFetch(input, init);
  };
}

installAuthFetch();
