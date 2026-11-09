/**
 * Client-side: attach the signed-in user's Supabase access token to every
 * same-origin /api/* request, so API routes can verify who is calling.
 * Also: if the server says the session is no longer valid (401), sign the
 * user out and send them to the right login page instead of leaving every
 * page silently empty.
 *
 * Installed once (see components/AuthFetchInstaller.tsx) by wrapping
 * window.fetch, so existing `fetch('/api/...')` calls need no changes.
 * /api/auth/login and /api/auth/signup are left untouched.
 */

import { supabase } from '@/lib/supabase/client';

declare global {
  interface Window {
    __novaAuthFetchInstalled?: boolean;
    __novaSessionEnding?: boolean;
  }
}

const LOGIN_PAGES = ['/login', '/doctor-login', '/admin-login'];

async function endExpiredSession() {
  if (window.__novaSessionEnding) return;
  const path = window.location.pathname;
  if (LOGIN_PAGES.includes(path)) return; // already on a login page
  window.__novaSessionEnding = true;
  try { await supabase.auth.signOut(); } catch { /* ignore */ }
  const target = path.startsWith('/admin') ? '/admin-login'
    : path.startsWith('/doctor') ? '/doctor-login'
      : '/login';
  window.location.href = `${target}?expired=1`;
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
        url.pathname !== '/api/auth/login' &&
        url.pathname !== '/api/auth/signup';

      if (isOwnApi) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(
            init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          const res = await originalFetch(input, { ...init, headers });
          // We sent a token and the server still said "not signed in" → session is dead
          if (res.status === 401) void endExpiredSession();
          return res;
        }
      }
    } catch {
      // never block a request because token lookup failed
    }
    return originalFetch(input, init);
  };
}

installAuthFetch();