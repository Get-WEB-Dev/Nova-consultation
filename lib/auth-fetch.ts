/**
 * Client-side wrapper around window.fetch for our own /api/* routes:
 *  1. attaches the signed-in user's access token (so the server knows who is calling)
 *  2. if the server says the session is dead (401), signs out and goes to the right login page
 *  3. if a WRITE (POST/PUT/PATCH/DELETE) fails, shows an error toast — so no page can
 *     silently lose a save any more
 *
 * Installed once (components/AuthFetchInstaller.tsx). Existing `fetch('/api/...')`
 * calls need no changes. /api/auth/login and /api/auth/signup are left untouched.
 */

import { supabase } from '@/lib/supabase/client';

declare global {
  interface Window {
    __novaAuthFetchInstalled?: boolean;
    __novaSessionEnding?: boolean;
  }
}

export const API_ERROR_EVENT = 'nova:api-error';
const LOGIN_PAGES = ['/login', '/doctor-login', '/admin-login'];

// Failed writes here are NOT toasted: the page already shows its own message,
// or the request is background noise.
const SILENT_WRITES = ['/api/admin/', '/api/auth/change-password', '/api/notifications'];
const isSilent = (path: string) => SILENT_WRITES.some((p) => path.startsWith(p)) || path.endsWith('/view');

function emitError(message: string) {
  window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: { message } }));
}

async function emitFromResponse(res: Response) {
  let message = '';
  try {
    const j = await res.json();
    message = j?.error || '';
  } catch { /* body wasn't JSON */ }
  if (!message) {
    message = res.status === 403 ? "You don't have permission to do that."
      : res.status >= 500 ? 'Something went wrong on our side. Please try again.'
        : 'That request could not be completed.';
  }
  emitError(message);
}

async function endExpiredSession() {
  if (window.__novaSessionEnding) return;
  const path = window.location.pathname;
  if (LOGIN_PAGES.includes(path)) return;
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
    // 1) Is this one of our own API calls?
    let path = '';
    let isOwnApi = false;
    let method = 'GET';
    try {
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(rawUrl, window.location.origin);
      path = url.pathname;
      isOwnApi =
        url.origin === window.location.origin &&
        path.startsWith('/api/') &&
        path !== '/api/auth/login' &&
        path !== '/api/auth/signup';
      method = (init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
    } catch { /* unparseable URL → treat as external */ }

    if (!isOwnApi) return originalFetch(input, init);

    // 2) Attach the token (a failure here must never block or repeat the request)
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch { /* continue without a token */ }

    let finalInit = init;
    if (token) {
      const headers = new Headers(
        init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined),
      );
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      finalInit = { ...init, headers };
    }

    // 3) Send it exactly once
    const isWrite = method !== 'GET' && method !== 'HEAD';
    let res: Response;
    try {
      res = await originalFetch(input, finalInit);
    } catch (err) {
      if (isWrite && !isSilent(path)) emitError('Network problem — check your connection and try again.');
      throw err;
    }

    if (res.status === 401 && token) {
      void endExpiredSession(); // we sent a token and still weren't recognised
    } else if (isWrite && !res.ok && !isSilent(path)) {
      void emitFromResponse(res.clone());
    }
    return res;
  };
}

installAuthFetch();